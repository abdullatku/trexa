using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.Model;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;
using Trexa.Api.Models.Identity;
using Trexa.Api.Repositories.Interfaces;
using Trexa.Api.Settings;

namespace Trexa.Api.Repositories.Dynamo;

public sealed class DynamoUserRepository : IUserRepository
{
    private readonly IAmazonDynamoDB _client;
    private readonly DynamoDbSettings _settings;
    private readonly PasswordHasher<ApplicationUser> _passwordHasher = new();

    public DynamoUserRepository(IAmazonDynamoDB client, IOptions<DynamoDbSettings> settings)
    {
        _client = client;
        _settings = settings.Value;
    }

    public async Task<ApplicationUser?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var keyName = await GetHashKeyNameAsync(cancellationToken);
        var response = await _client.GetItemAsync(new GetItemRequest
        {
            TableName = _settings.UsersTable,
            Key = new Dictionary<string, AttributeValue>
            {
                [keyName] = new(id.ToString())
            }
        }, cancellationToken);

        return response.Item.Count == 0 ? null : ToDomain(response.Item, keyName);
    }

    public async Task<ApplicationUser?> FindByEmailAsync(string email, CancellationToken cancellationToken = default)
    {
        var normalized = NormalizeEmail(email);
        var keyName = await GetHashKeyNameAsync(cancellationToken);
        var users = await ScanAsync(
            filterExpression: "#emailNormalized = :email",
            expressionNames: new Dictionary<string, string> { ["#emailNormalized"] = "EmailNormalized" },
            expressionValues: new Dictionary<string, AttributeValue> { [":email"] = new(normalized) },
            cancellationToken: cancellationToken);

        return users.Select(item => ToDomain(item, keyName)).FirstOrDefault();
    }

    public async Task<ApplicationUser?> FindByEmailVerificationTokenAsync(string token, CancellationToken cancellationToken = default)
    {
        var keyName = await GetHashKeyNameAsync(cancellationToken);
        var users = await ScanAsync(
            filterExpression: "#verificationToken = :token",
            expressionNames: new Dictionary<string, string> { ["#verificationToken"] = "EmailVerificationToken" },
            expressionValues: new Dictionary<string, AttributeValue> { [":token"] = new(token) },
            cancellationToken: cancellationToken);

        return users.Select(item => ToDomain(item, keyName)).FirstOrDefault();
    }

    public async Task<ApplicationUser?> FindByPasswordResetTokenAsync(string token, CancellationToken cancellationToken = default)
    {
        var keyName = await GetHashKeyNameAsync(cancellationToken);
        var users = await ScanAsync(
            filterExpression: "#resetToken = :token",
            expressionNames: new Dictionary<string, string> { ["#resetToken"] = "PasswordResetToken" },
            expressionValues: new Dictionary<string, AttributeValue> { [":token"] = new(token) },
            cancellationToken: cancellationToken);

        return users.Select(item => ToDomain(item, keyName)).FirstOrDefault();
    }

    public async Task<IReadOnlyList<ApplicationUser>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var keyName = await GetHashKeyNameAsync(cancellationToken);
        var users = await ScanAsync(cancellationToken: cancellationToken);
        return users.Select(item => ToDomain(item, keyName)).ToList();
    }

    public async Task<IReadOnlyList<ApplicationUser>> GetByRoleAsync(string role, CancellationToken cancellationToken = default)
    {
        var normalizedRole = role.Trim().ToLowerInvariant();
        var keyName = await GetHashKeyNameAsync(cancellationToken);
        var users = await ScanAsync(
            filterExpression: "#role = :role",
            expressionNames: new Dictionary<string, string> { ["#role"] = "Role" },
            expressionValues: new Dictionary<string, AttributeValue> { [":role"] = new(normalizedRole) },
            cancellationToken: cancellationToken);

        return users.Select(item => ToDomain(item, keyName)).ToList();
    }

    public async Task CreateAsync(ApplicationUser user, string password, CancellationToken cancellationToken = default)
    {
        var normalizedEmail = NormalizeEmail(user.Email);
        user.Email = normalizedEmail;
        user.UserName = normalizedEmail;
        user.PasswordHash = _passwordHasher.HashPassword(user, password);
        user.Role = string.IsNullOrWhiteSpace(user.Role) ? "student" : user.Role.Trim().ToLowerInvariant();

        await PutUserAsync(user, cancellationToken);
    }

    public async Task UpdateAsync(ApplicationUser user, CancellationToken cancellationToken = default)
    {
        await PutUserAsync(user, cancellationToken);
    }

    public Task<bool> VerifyPasswordAsync(ApplicationUser user, string password)
    {
        if (string.IsNullOrWhiteSpace(user.PasswordHash))
        {
            return Task.FromResult(false);
        }

        var result = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, password);
        return Task.FromResult(result is PasswordVerificationResult.Success or PasswordVerificationResult.SuccessRehashNeeded);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var keyName = await GetHashKeyNameAsync(cancellationToken);
        
        try
        {
            await _client.DeleteItemAsync(new DeleteItemRequest
            {
                TableName = _settings.UsersTable,
                Key = new Dictionary<string, AttributeValue>
                {
                    [keyName] = new(id.ToString())
                }
            }, cancellationToken);
            
            return true;
        }
        catch (Exception)
        {
            return false;
        }
    }

    private static string NormalizeEmail(string? email) => email?.Trim().ToLowerInvariant() ?? string.Empty;

    private async Task<string> GetHashKeyNameAsync(CancellationToken cancellationToken)
    {
        var describe = await _client.DescribeTableAsync(
            new DescribeTableRequest { TableName = _settings.UsersTable },
            cancellationToken);

        return describe.Table.KeySchema.First(x => x.KeyType == KeyType.HASH).AttributeName;
    }

    private async Task PutUserAsync(ApplicationUser user, CancellationToken cancellationToken)
    {
        var keyName = await GetHashKeyNameAsync(cancellationToken);
        var item = ToItem(user, keyName);

        await _client.PutItemAsync(new PutItemRequest
        {
            TableName = _settings.UsersTable,
            Item = item
        }, cancellationToken);
    }

    private async Task<List<Dictionary<string, AttributeValue>>> ScanAsync(
        string? filterExpression = null,
        Dictionary<string, string>? expressionNames = null,
        Dictionary<string, AttributeValue>? expressionValues = null,
        CancellationToken cancellationToken = default)
    {
        var items = new List<Dictionary<string, AttributeValue>>();
        Dictionary<string, AttributeValue>? lastEvaluatedKey = null;

        do
        {
            var response = await _client.ScanAsync(new ScanRequest
            {
                TableName = _settings.UsersTable,
                FilterExpression = filterExpression,
                ExpressionAttributeNames = expressionNames,
                ExpressionAttributeValues = expressionValues,
                ExclusiveStartKey = lastEvaluatedKey
            }, cancellationToken);

            items.AddRange(response.Items);
            lastEvaluatedKey = response.LastEvaluatedKey;
        }
        while (lastEvaluatedKey is not null && lastEvaluatedKey.Count > 0);

        return items;
    }

    private static Dictionary<string, AttributeValue> ToItem(ApplicationUser user, string hashKeyName)
    {
        var item = new Dictionary<string, AttributeValue>
        {
            [hashKeyName] = new(user.Id.ToString()),
            ["Email"] = new(user.Email?.Trim().ToLowerInvariant() ?? string.Empty),
            ["EmailNormalized"] = new(user.Email?.Trim().ToLowerInvariant() ?? string.Empty),
            ["UserName"] = new(user.UserName?.Trim().ToLowerInvariant() ?? string.Empty),
            ["PasswordHash"] = new(user.PasswordHash ?? string.Empty),
            ["Role"] = new(user.Role.Trim().ToLowerInvariant()),
            ["Name"] = new(user.Name),
            ["CreatedAt"] = new(user.CreatedAt.ToString("O")),
            ["EmailVerified"] = new AttributeValue { BOOL = user.EmailVerified }
        };

        if (user.UpdatedAt.HasValue)
        {
            item["UpdatedAt"] = new(user.UpdatedAt.Value.ToString("O"));
        }

        if (!string.IsNullOrWhiteSpace(user.LinkedInProfile))
        {
            item["LinkedInProfile"] = new(user.LinkedInProfile);
        }

        if (!string.IsNullOrWhiteSpace(user.Bio))
        {
            item["Bio"] = new(user.Bio);
        }

        if (!string.IsNullOrWhiteSpace(user.Phone))
        {
            item["Phone"] = new(user.Phone);
        }

        if (!string.IsNullOrWhiteSpace(user.Company))
        {
            item["Company"] = new(user.Company);
        }

        if (user.DefaultInterviewerFee > 0)
        {
            item["DefaultInterviewerFee"] = new AttributeValue { N = user.DefaultInterviewerFee.ToString(System.Globalization.CultureInfo.InvariantCulture) };
        }

        if (!string.IsNullOrWhiteSpace(user.EmailVerificationToken))
        {
            item["EmailVerificationToken"] = new(user.EmailVerificationToken);
        }

        if (user.EmailVerificationTokenExpiresAt.HasValue)
        {
            item["EmailVerificationTokenExpiresAt"] = new(user.EmailVerificationTokenExpiresAt.Value.ToString("O"));
        }

        if (!string.IsNullOrWhiteSpace(user.PasswordResetToken))
        {
            item["PasswordResetToken"] = new(user.PasswordResetToken);
        }

        if (user.PasswordResetTokenExpiresAt.HasValue)
        {
            item["PasswordResetTokenExpiresAt"] = new(user.PasswordResetTokenExpiresAt.Value.ToString("O"));
        }

        if (user.TechStacks is { Count: > 0 })
        {
            item["TechStacks"] = new AttributeValue { SS = user.TechStacks };
        }

        AddString(item, "CalComAccessToken", user.CalComAccessToken);
        AddString(item, "CalComRefreshToken", user.CalComRefreshToken);
        AddString(item, "CalComScopes", user.CalComScopes);
        AddString(item, "CalComWebhookId", user.CalComWebhookId);
        AddString(item, "CalComWebhookSecret", user.CalComWebhookSecret);
        if (user.CalComTokenExpiresAt.HasValue) item["CalComTokenExpiresAt"] = new(user.CalComTokenExpiresAt.Value.ToString("O"));
        if (user.CalComConnectedAt.HasValue) item["CalComConnectedAt"] = new(user.CalComConnectedAt.Value.ToString("O"));
        if (user.CalComEventTypeId.HasValue) item["CalComEventTypeId"] = new AttributeValue { N = user.CalComEventTypeId.Value.ToString() };

        return item;
    }

    private static void AddString(Dictionary<string, AttributeValue> item, string key, string? value)
    {
        if (!string.IsNullOrWhiteSpace(value)) item[key] = new(value);
    }

    private static ApplicationUser ToDomain(Dictionary<string, AttributeValue> item, string hashKeyName)
    {
        var userId = GetString(item, hashKeyName) ?? GetString(item, "Id") ?? GetString(item, "id") ?? Guid.NewGuid().ToString();
        _ = Guid.TryParse(userId, out var parsedId);

        return new ApplicationUser
        {
            Id = parsedId == Guid.Empty ? Guid.NewGuid() : parsedId,
            Email = GetString(item, "Email"),
            UserName = GetString(item, "UserName"),
            PasswordHash = GetString(item, "PasswordHash"),
            Role = GetString(item, "Role") ?? "student",
            Name = GetString(item, "Name") ?? string.Empty,
            CreatedAt = ParseDate(GetString(item, "CreatedAt")) ?? DateTime.UtcNow,
            UpdatedAt = ParseDate(GetString(item, "UpdatedAt")),
            LinkedInProfile = GetString(item, "LinkedInProfile"),
            Bio = GetString(item, "Bio"),
            Phone = GetString(item, "Phone"),
            TechStacks = GetStringSet(item, "TechStacks"),
            Company = GetString(item, "Company"),
            DefaultInterviewerFee = GetDecimal(item, "DefaultInterviewerFee"),
            EmailVerified = GetBool(item, "EmailVerified"),
            EmailVerificationToken = GetString(item, "EmailVerificationToken"),
            EmailVerificationTokenExpiresAt = ParseDate(GetString(item, "EmailVerificationTokenExpiresAt")),
            PasswordResetToken = GetString(item, "PasswordResetToken"),
            PasswordResetTokenExpiresAt = ParseDate(GetString(item, "PasswordResetTokenExpiresAt")),
            CalComAccessToken = GetString(item, "CalComAccessToken"),
            CalComRefreshToken = GetString(item, "CalComRefreshToken"),
            CalComTokenExpiresAt = ParseDate(GetString(item, "CalComTokenExpiresAt")),
            CalComScopes = GetString(item, "CalComScopes"),
            CalComEventTypeId = GetNullableInt(item, "CalComEventTypeId"),
            CalComWebhookId = GetString(item, "CalComWebhookId"),
            CalComWebhookSecret = GetString(item, "CalComWebhookSecret"),
            CalComConnectedAt = ParseDate(GetString(item, "CalComConnectedAt"))
        };
    }

    private static int? GetNullableInt(Dictionary<string, AttributeValue> item, string key)
    {
        if (!item.TryGetValue(key, out var value)) return null;
        return int.TryParse(value.N ?? value.S, out var parsed) ? parsed : null;
    }

    private static string? GetString(Dictionary<string, AttributeValue> item, string key)
    {
        return item.TryGetValue(key, out var value) ? value.S : null;
    }

    private static bool GetBool(Dictionary<string, AttributeValue> item, string key)
    {
        if (!item.TryGetValue(key, out var value))
        {
            return false;
        }

        return value.BOOL ?? false;
    }

    private static decimal GetDecimal(Dictionary<string, AttributeValue> item, string key)
    {
        if (!item.TryGetValue(key, out var value))
        {
            return 0;
        }

        if (!string.IsNullOrWhiteSpace(value.N) && decimal.TryParse(value.N, System.Globalization.NumberStyles.Number, System.Globalization.CultureInfo.InvariantCulture, out var parsedNumber))
        {
            return parsedNumber;
        }

        if (!string.IsNullOrWhiteSpace(value.S) && decimal.TryParse(value.S, System.Globalization.NumberStyles.Number, System.Globalization.CultureInfo.InvariantCulture, out var parsedString))
        {
            return parsedString;
        }

        return 0;
    }

    private static List<string> GetStringSet(Dictionary<string, AttributeValue> item, string key)
    {
        if (!item.TryGetValue(key, out var value))
        {
            return [];
        }

        if (value.SS is { Count: > 0 })
        {
            return value.SS;
        }

        return [];
    }

    private static DateTime? ParseDate(string? value)
    {
        return DateTime.TryParse(value, out var dt) ? dt : null;
    }
}
