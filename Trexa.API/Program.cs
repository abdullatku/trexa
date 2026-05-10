using System;
using System.Text;
using Amazon;
using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.DataModel;
using Amazon.Runtime;
using Amazon.SimpleEmailV2;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.IdentityModel.Tokens;
using Trexa.Api.Extensions;
using Trexa.Api.Repositories.Dynamo;
using Trexa.Api.Repositories.Interfaces;
using Trexa.Api.Services;
using Trexa.Api.Services.Interfaces;
using Trexa.Api.Settings;

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<JwtSettings>(builder.Configuration.GetSection("Jwt"));
builder.Services.Configure<DynamoDbSettings>(builder.Configuration.GetSection("DynamoDb"));
builder.Services.Configure<RazorpaySettings>(builder.Configuration.GetSection("Razorpay"));
builder.Services.Configure<EmailSettings>(builder.Configuration.GetSection("Email"));
builder.Services.Configure<OAuthSettings>(builder.Configuration.GetSection("OAuth"));

var jwtSettings = builder.Configuration.GetSection("Jwt").Get<JwtSettings>() ?? new JwtSettings();
var dynamoSettings = builder.Configuration.GetSection("DynamoDb").Get<DynamoDbSettings>() ?? new DynamoDbSettings();
var emailSettings = builder.Configuration.GetSection("Email").Get<EmailSettings>() ?? new EmailSettings();

builder.Services.AddSingleton<IAmazonDynamoDB>(_ =>
{
    if (!string.IsNullOrWhiteSpace(dynamoSettings.ServiceUrl) &&
        dynamoSettings.ServiceUrl.StartsWith("arn:", StringComparison.OrdinalIgnoreCase))
    {
        throw new InvalidOperationException(
            $"`DynamoDb:ServiceUrl` must be an endpoint URL, not an ARN. Current value: `{dynamoSettings.ServiceUrl}`.");
    }

    var region = RegionEndpoint.GetBySystemName(dynamoSettings.Region);
    var hasExplicitKeys = !string.IsNullOrWhiteSpace(dynamoSettings.AccessKey) &&
                          !string.IsNullOrWhiteSpace(dynamoSettings.SecretKey);

    AWSCredentials? credentials = null;
    if (hasExplicitKeys)
    {
        credentials = string.IsNullOrWhiteSpace(dynamoSettings.SessionToken)
            ? new BasicAWSCredentials(dynamoSettings.AccessKey!, dynamoSettings.SecretKey!)
            : new SessionAWSCredentials(dynamoSettings.AccessKey!, dynamoSettings.SecretKey!, dynamoSettings.SessionToken!);
    }

    if (!string.IsNullOrWhiteSpace(dynamoSettings.ServiceUrl))
    {
        var config = new AmazonDynamoDBConfig
        {
            RegionEndpoint = region,
            ServiceURL = dynamoSettings.ServiceUrl
        };

        // Local DynamoDB endpoints still require credentials in SDK; any placeholder values work.
        var localCredentials = credentials ??
            (IsLocalServiceUrl(dynamoSettings.ServiceUrl) ? new BasicAWSCredentials("local", "local") : null);

        return localCredentials is null
            ? new AmazonDynamoDBClient(config)
            : new AmazonDynamoDBClient(localCredentials, config);
    }

    return credentials is null
        ? new AmazonDynamoDBClient(region)
        : new AmazonDynamoDBClient(credentials, region);
});

builder.Services.AddSingleton<IDynamoDBContext, DynamoDBContext>();
builder.Services.AddSingleton<IAmazonSimpleEmailServiceV2>(_ =>
{
    var regionName = string.IsNullOrWhiteSpace(emailSettings.SesRegion) ? dynamoSettings.Region : emailSettings.SesRegion;
    var region = RegionEndpoint.GetBySystemName(regionName);

    var hasExplicitKeys = !string.IsNullOrWhiteSpace(emailSettings.SesAccessKey) &&
                          !string.IsNullOrWhiteSpace(emailSettings.SesSecretKey);

    if (!hasExplicitKeys)
    {
        return new AmazonSimpleEmailServiceV2Client(region);
    }

    AWSCredentials credentials = string.IsNullOrWhiteSpace(emailSettings.SesSessionToken)
        ? new BasicAWSCredentials(emailSettings.SesAccessKey, emailSettings.SesSecretKey)
        : new SessionAWSCredentials(emailSettings.SesAccessKey, emailSettings.SesSecretKey, emailSettings.SesSessionToken);

    return new AmazonSimpleEmailServiceV2Client(credentials, region);
});

builder.Services.AddScoped<IDynamoDocumentStore, DynamoDocumentStore>();
builder.Services.AddScoped<IUserRepository, DynamoUserRepository>();
builder.Services.AddScoped<IPlansRepository, DynamoPlansRepository>();
builder.Services.AddScoped<ISubscriptionRepository, DynamoSubscriptionRepository>();
builder.Services.AddHttpClient();

builder.Services.AddCors(options =>
{
    options.AddPolicy("default", policy =>
    {
        policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod();
    });
});

builder.Services
    .AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateIssuerSigningKey = true,
            ValidateLifetime = true,
            ValidIssuer = jwtSettings.Issuer,
            ValidAudience = jwtSettings.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings.Key)),
            ClockSkew = TimeSpan.FromMinutes(1)
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddControllers();
if(!builder.Environment.IsDevelopment())
{
    builder.WebHost.ConfigureKestrel(options =>
    {
        var port = Environment.GetEnvironmentVariable("PORT") ?? "5000";
        options.ListenAnyIP(int.Parse(port));
    });

}
// Configure Kestrel for production deployment

builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IEmailService, EmailService>();

var app = builder.Build();

if (dynamoSettings.AutoCreateTables)
{
    using var scope = app.Services.CreateScope();
    var dynamoClient = scope.ServiceProvider.GetRequiredService<IAmazonDynamoDB>();
    await DynamoTableInitializer.EnsureTablesExistAsync(dynamoClient, dynamoSettings);
}

app.UseCors("default");

// Configure forwarded headers for load balancer
app.UseForwardedHeaders(new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto
});

app.UseAuthentication();
app.UseAuthorization();
app.UseStaticFiles();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.MapGet("/", () => Results.Ok(new
{
    status = "ok",
    service = "Trexa.Api",
    version = "1.0.0",
    timestamp = DateTime.UtcNow
}));

app.MapControllers();

app.Run();

static bool IsLocalServiceUrl(string serviceUrl)
{
    if (!Uri.TryCreate(serviceUrl, UriKind.Absolute, out var uri))
    {
        return false;
    }

    return uri.Host.Equals("localhost", StringComparison.OrdinalIgnoreCase) ||
           uri.Host.Equals("127.0.0.1", StringComparison.OrdinalIgnoreCase);
}
