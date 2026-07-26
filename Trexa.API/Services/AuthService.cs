using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Web;
using Microsoft.Extensions.Options;
using Trexa.Api.Constants;
using Trexa.Api.Models.Auth;
using Trexa.Api.Models.Identity;
using Trexa.Api.Repositories.Interfaces;
using Trexa.Api.Services.Interfaces;
using Trexa.Api.Settings;

namespace Trexa.Api.Services;

public sealed class AuthService : IAuthService
{
    private const string DefaultRole = "student";

    private readonly IUserRepository _userRepository;
    private readonly ITokenService _tokenService;
    private readonly IEmailService _emailService;
    private readonly EmailSettings _emailSettings;
    private readonly OAuthSettings _oauthSettings;
    private readonly IHttpClientFactory _httpClientFactory;

    public AuthService(
        IUserRepository userRepository,
        ITokenService tokenService,
        IEmailService emailService,
        IOptions<EmailSettings> emailSettings,
        IOptions<OAuthSettings> oauthSettings,
        IHttpClientFactory httpClientFactory)
    {
        _userRepository = userRepository;
        _tokenService = tokenService;
        _emailService = emailService;
        _emailSettings = emailSettings.Value;
        _oauthSettings = oauthSettings.Value;
        _httpClientFactory = httpClientFactory;
    }

    public async Task<AuthServiceResult<AuthResponse>> SignUpAsync(SignUpRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password) || string.IsNullOrWhiteSpace(request.Name))
        {
            return AuthServiceResult<AuthResponse>.Fail(StatusCodes.Status400BadRequest, "Missing required fields");
        }

        var email = request.Email.Trim().ToLowerInvariant();
        var existing = await _userRepository.FindByEmailAsync(email, cancellationToken);
        if (existing is not null)
        {
            return AuthServiceResult<AuthResponse>.Fail(StatusCodes.Status400BadRequest, "User already exists");
        }

        var verificationToken = GenerateVerificationToken();
        var verificationExpiresAt = DateTime.UtcNow.AddHours(24);

        var user = new ApplicationUser
        {
            UserName = email,
            Email = email,
            Name = request.Name.Trim(),
            Role = DefaultRole,
            CreatedAt = DateTime.UtcNow,
            EmailVerified = false,
            EmailVerificationToken = verificationToken,
            EmailVerificationTokenExpiresAt = verificationExpiresAt
        };

        await _userRepository.CreateAsync(user, request.Password, cancellationToken);
        await SendVerificationEmailAsync(user, verificationToken, cancellationToken);

        var response = new AuthResponse(string.Empty, BuildUserProfile(user));
        return AuthServiceResult<AuthResponse>.Ok(response);
    }

    public async Task<AuthServiceResult<AuthResponse>> SignInAsync(SignInRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
        {
            return AuthServiceResult<AuthResponse>.Fail(StatusCodes.Status400BadRequest, "Email and password are required");
        }

        var email = request.Email.Trim().ToLowerInvariant();
        var user = await _userRepository.FindByEmailAsync(email, cancellationToken);

        if (user is null || !await _userRepository.VerifyPasswordAsync(user, request.Password))
        {
            return AuthServiceResult<AuthResponse>.Fail(StatusCodes.Status401Unauthorized, "Invalid credentials");
        }

        if (!user.EmailVerified)
        {
            return AuthServiceResult<AuthResponse>.Fail(StatusCodes.Status403Forbidden, "Email not verified. Please verify your email before signing in.");
        }

        var accessToken = await _tokenService.GenerateTokenAsync(user, cancellationToken);
        var response = new AuthResponse(accessToken, BuildUserProfile(user));

        return AuthServiceResult<AuthResponse>.Ok(response);
    }

    public async Task<AuthServiceResult<string>> VerifyEmailAsync(string token, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(token))
        {
            return AuthServiceResult<string>.Fail(StatusCodes.Status400BadRequest, "Verification token is required");
        }

        var user = await _userRepository.FindByEmailVerificationTokenAsync(token.Trim(), cancellationToken);
        if (user is null)
        {
            return AuthServiceResult<string>.Fail(StatusCodes.Status400BadRequest, "Invalid verification token");
        }

        if (user.EmailVerified)
        {
            return AuthServiceResult<string>.Ok("Email already verified");
        }

        if (!user.EmailVerificationTokenExpiresAt.HasValue || user.EmailVerificationTokenExpiresAt.Value < DateTime.UtcNow)
        {
            return AuthServiceResult<string>.Fail(StatusCodes.Status400BadRequest, "Verification token has expired");
        }

        user.EmailVerified = true;
        user.EmailVerificationToken = null;
        user.EmailVerificationTokenExpiresAt = null;
        user.UpdatedAt = DateTime.UtcNow;

        await _userRepository.UpdateAsync(user, cancellationToken);
        return AuthServiceResult<string>.Ok("Email verified successfully");
    }

    public async Task<AuthServiceResult<string>> ResendVerificationEmailAsync(string email, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(email))
        {
            return AuthServiceResult<string>.Fail(StatusCodes.Status400BadRequest, "Email is required");
        }

        var normalized = email.Trim().ToLowerInvariant();
        var user = await _userRepository.FindByEmailAsync(normalized, cancellationToken);
        if (user is null)
        {
            return AuthServiceResult<string>.Fail(StatusCodes.Status404NotFound, "User not found");
        }

        if (user.EmailVerified)
        {
            return AuthServiceResult<string>.Fail(StatusCodes.Status400BadRequest, "Email is already verified");
        }

        user.EmailVerificationToken = GenerateVerificationToken();
        user.EmailVerificationTokenExpiresAt = DateTime.UtcNow.AddHours(24);
        user.UpdatedAt = DateTime.UtcNow;

        await _userRepository.UpdateAsync(user, cancellationToken);
        await SendVerificationEmailAsync(user, user.EmailVerificationToken, cancellationToken);

        return AuthServiceResult<string>.Ok("Verification email sent");
    }

    public async Task<AuthServiceResult<UserProfile>> GetProfileAsync(ClaimsPrincipal principal, CancellationToken cancellationToken = default)
    {
        var user = await GetCurrentUserAsync(principal, cancellationToken);
        if (user is null)
        {
            return AuthServiceResult<UserProfile>.Fail(StatusCodes.Status404NotFound, "Profile not found");
        }

        return AuthServiceResult<UserProfile>.Ok(BuildUserProfile(user));
    }

    public async Task<AuthServiceResult<UserProfile>> UpdateProfileAsync(UpdateProfileRequest request, ClaimsPrincipal principal, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return AuthServiceResult<UserProfile>.Fail(StatusCodes.Status400BadRequest, "Name is required");
        }

        var user = await GetCurrentUserAsync(principal, cancellationToken);
        if (user is null)
        {
            return AuthServiceResult<UserProfile>.Fail(StatusCodes.Status404NotFound, "Profile not found");
        }

        user.Name = request.Name.Trim();
        user.LinkedInProfile = request.LinkedInProfile?.Trim();
        user.Bio = request.Bio?.Trim();
        user.Phone = request.Phone?.Trim();
        user.TechStacks = request.TechStacks?.Distinct(StringComparer.OrdinalIgnoreCase).ToList() ?? [];
        user.UpdatedAt = DateTime.UtcNow;

        await _userRepository.UpdateAsync(user, cancellationToken);

        return AuthServiceResult<UserProfile>.Ok(BuildUserProfile(user));
    }

    public async Task<AuthServiceResult<string>> ForgotPasswordAsync(ForgotPasswordRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Email))
        {
            return AuthServiceResult<string>.Fail(StatusCodes.Status400BadRequest, "Email is required");
        }

        var email = request.Email.Trim().ToLowerInvariant();
        var user = await _userRepository.FindByEmailAsync(email, cancellationToken);
        if (user is null)
        {
            // Don't reveal if email exists or not for security
            return AuthServiceResult<string>.Ok("If the email exists, a password reset link has been sent");
        }

        var resetToken = GenerateVerificationToken();
        var resetExpiresAt = DateTime.UtcNow.AddHours(1); // 1 hour expiry

        user.PasswordResetToken = resetToken;
        user.PasswordResetTokenExpiresAt = resetExpiresAt;
        user.UpdatedAt = DateTime.UtcNow;

        await _userRepository.UpdateAsync(user, cancellationToken);
        await SendPasswordResetEmailAsync(user, resetToken, cancellationToken);

        return AuthServiceResult<string>.Ok("If the email exists, a password reset link has been sent");
    }

    public async Task<AuthServiceResult<string>> ResetPasswordAsync(ResetPasswordRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Token) || string.IsNullOrWhiteSpace(request.NewPassword))
        {
            return AuthServiceResult<string>.Fail(StatusCodes.Status400BadRequest, "Token and new password are required");
        }

        var user = await _userRepository.FindByPasswordResetTokenAsync(request.Token.Trim(), cancellationToken);
        if (user is null)
        {
            return AuthServiceResult<string>.Fail(StatusCodes.Status400BadRequest, "Invalid or expired token");
        }

        if (user.PasswordResetTokenExpiresAt.HasValue && user.PasswordResetTokenExpiresAt.Value < DateTime.UtcNow)
        {
            return AuthServiceResult<string>.Fail(StatusCodes.Status400BadRequest, "Token has expired");
        }

        // Hash the new password
        var passwordHasher = new Microsoft.AspNetCore.Identity.PasswordHasher<ApplicationUser>();
        user.PasswordHash = passwordHasher.HashPassword(user, request.NewPassword);

        // Clear the reset token
        user.PasswordResetToken = null;
        user.PasswordResetTokenExpiresAt = null;
        user.UpdatedAt = DateTime.UtcNow;

        await _userRepository.UpdateAsync(user, cancellationToken);

        return AuthServiceResult<string>.Ok("Password reset successfully");
    }

    public AuthServiceResult<string> BuildExternalAuthorizationUrl(string provider, string redirectUri, string? returnUrl, string? frontendCallbackUrl)
    {
        var normalizedProvider = NormalizeProvider(provider);
        var providerSettings = GetProviderSettings(normalizedProvider);
        if (providerSettings is null)
        {
            return AuthServiceResult<string>.Fail(StatusCodes.Status404NotFound, "Unsupported OAuth provider");
        }

        if (string.IsNullOrWhiteSpace(providerSettings.ClientId) || string.IsNullOrWhiteSpace(providerSettings.ClientSecret))
        {
            return AuthServiceResult<string>.Fail(StatusCodes.Status500InternalServerError, $"{normalizedProvider} OAuth is not configured");
        }

        var state = EncodeState(
            string.IsNullOrWhiteSpace(returnUrl) ? "/" : returnUrl.Trim(),
            NormalizeFrontendCallbackUrl(frontendCallbackUrl));

        var query = HttpUtility.ParseQueryString(string.Empty);
        query["client_id"] = providerSettings.ClientId;
        query["redirect_uri"] = redirectUri;
        query["response_type"] = "code";
        query["state"] = state;

        var authorizationEndpoint = normalizedProvider switch
        {
            "google" => "https://accounts.google.com/o/oauth2/v2/auth",
            _ => string.Empty
        };

        query["scope"] = "openid email profile";
        query["access_type"] = "online";
        query["prompt"] = "select_account";

        return AuthServiceResult<string>.Ok($"{authorizationEndpoint}?{query}");
    }

    public async Task<AuthServiceResult<AuthResponse>> ExternalSignInAsync(string provider, string code, string redirectUri, CancellationToken cancellationToken = default)
    {
        var normalizedProvider = NormalizeProvider(provider);
        var providerSettings = GetProviderSettings(normalizedProvider);
        if (providerSettings is null)
        {
            return AuthServiceResult<AuthResponse>.Fail(StatusCodes.Status404NotFound, "Unsupported OAuth provider");
        }

        if (string.IsNullOrWhiteSpace(providerSettings.ClientId) || string.IsNullOrWhiteSpace(providerSettings.ClientSecret))
        {
            return AuthServiceResult<AuthResponse>.Fail(StatusCodes.Status500InternalServerError, $"{normalizedProvider} OAuth is not configured");
        }

        if (string.IsNullOrWhiteSpace(code))
        {
            return AuthServiceResult<AuthResponse>.Fail(StatusCodes.Status400BadRequest, "OAuth code is required");
        }

        var externalProfile = normalizedProvider switch
        {
            "google" => await GetGoogleProfileAsync(code, redirectUri, providerSettings, cancellationToken),
            _ => null
        };

        if (externalProfile is null || string.IsNullOrWhiteSpace(externalProfile.Email))
        {
            return AuthServiceResult<AuthResponse>.Fail(StatusCodes.Status400BadRequest, "OAuth provider did not return a usable email address");
        }

        var email = externalProfile.Email.Trim().ToLowerInvariant();
        var user = await _userRepository.FindByEmailAsync(email, cancellationToken);
        if (user is null)
        {
            user = new ApplicationUser
            {
                UserName = email,
                Email = email,
                Name = string.IsNullOrWhiteSpace(externalProfile.Name) ? email : externalProfile.Name.Trim(),
                Role = DefaultRole,
                CreatedAt = DateTime.UtcNow,
                EmailVerified = true
            };

            await _userRepository.CreateAsync(user, GenerateExternalPassword(), cancellationToken);
        }
        else
        {
            var changed = false;
            if (!user.EmailVerified)
            {
                user.EmailVerified = true;
                user.EmailVerificationToken = null;
                user.EmailVerificationTokenExpiresAt = null;
                changed = true;
            }

            if (string.IsNullOrWhiteSpace(user.Name) && !string.IsNullOrWhiteSpace(externalProfile.Name))
            {
                user.Name = externalProfile.Name.Trim();
                changed = true;
            }

            if (changed)
            {
                user.UpdatedAt = DateTime.UtcNow;
                await _userRepository.UpdateAsync(user, cancellationToken);
            }
        }

        var accessToken = await _tokenService.GenerateTokenAsync(user, cancellationToken);
        return AuthServiceResult<AuthResponse>.Ok(new AuthResponse(accessToken, BuildUserProfile(user)));
    }

    private async Task<ApplicationUser?> GetCurrentUserAsync(ClaimsPrincipal principal, CancellationToken cancellationToken)
    {
        var userId = principal.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userId, out var parsedId))
        {
            return null;
        }

        return await _userRepository.GetByIdAsync(parsedId, cancellationToken);
    }

    private async Task SendVerificationEmailAsync(ApplicationUser user, string? token, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(user.Email) || string.IsNullOrWhiteSpace(token))
        {
            return;
        }

        var link = BuildVerificationLink(token);
        var subject = "Verify your Trexa email";
        var body = $"Hello {user.Name},\n\nPlease verify your email by clicking the link below:\n{link}\n\nThis link expires in 24 hours.";
        var recipient = new EmailRecipient { Email = user.Email, Name = user.Name };

        await _emailService.SendAsync([recipient], subject, body, cancellationToken);
    }

    private async Task SendPasswordResetEmailAsync(ApplicationUser user, string token, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(user.Email) || string.IsNullOrWhiteSpace(token))
        {
            return;
        }

        var link = BuildPasswordResetLink(token);
        var subject = "Reset your Trexa password";
        var body = $"Hello {user.Name},\n\nYou requested a password reset. Click the link below to reset your password:\n{link}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, please ignore this email.";
        var recipient = new EmailRecipient { Email = user.Email, Name = user.Name };

        await _emailService.SendAsync([recipient], subject, body, cancellationToken);
    }

    private string BuildVerificationLink(string token)
    {
        var baseUrl = string.IsNullOrWhiteSpace(_emailSettings.VerificationBaseUrl)
            ? "http://localhost:5264"
            : _emailSettings.VerificationBaseUrl.TrimEnd('/');

        return $"{baseUrl}/verify-email?token={Uri.EscapeDataString(token)}";
    }

    private string BuildPasswordResetLink(string token)
    {
        var baseUrl = string.IsNullOrWhiteSpace(_emailSettings.VerificationBaseUrl)
            ? "http://localhost:5264"
            : _emailSettings.VerificationBaseUrl.TrimEnd('/');

        return $"{baseUrl}/reset-password?token={Uri.EscapeDataString(token)}";
    }

    private static string GenerateVerificationToken() => Guid.NewGuid().ToString("N");

    public string BuildFrontendOAuthCallbackUrl(AuthResponse response, string? state, string? error = null)
    {
        var oauthState = DecodeState(state);
        var baseUrl = oauthState.FrontendCallbackUrl ?? GetConfiguredFrontendCallbackUrl();
        var returnUrl = oauthState.ReturnUrl ?? "/";
        var fragment = new Dictionary<string, string?>
        {
            ["accessToken"] = response.AccessToken,
            ["role"] = response.User.Role,
            ["returnUrl"] = returnUrl
        };

        if (!string.IsNullOrWhiteSpace(error))
        {
            fragment["error"] = error;
        }

        return $"{baseUrl}#{BuildFragment(fragment)}";
    }

    public string BuildFrontendOAuthErrorUrl(string? state, string error)
    {
        var oauthState = DecodeState(state);
        var baseUrl = oauthState.FrontendCallbackUrl ?? GetConfiguredFrontendCallbackUrl();

        return $"{baseUrl}#{BuildFragment(new Dictionary<string, string?>
        {
            ["error"] = error,
            ["returnUrl"] = oauthState.ReturnUrl ?? "/"
        })}";
    }

    private async Task<ExternalOAuthProfile?> GetGoogleProfileAsync(string code, string redirectUri, OAuthProviderSettings settings, CancellationToken cancellationToken)
    {
        var client = _httpClientFactory.CreateClient();
        using var tokenResponse = await client.PostAsync("https://oauth2.googleapis.com/token", new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["client_id"] = settings.ClientId,
            ["client_secret"] = settings.ClientSecret,
            ["code"] = code,
            ["grant_type"] = "authorization_code",
            ["redirect_uri"] = redirectUri
        }), cancellationToken);

        var token = await tokenResponse.Content.ReadFromJsonAsync<OAuthTokenResponse>(cancellationToken: cancellationToken);
        if (!tokenResponse.IsSuccessStatusCode || string.IsNullOrWhiteSpace(token?.AccessToken))
        {
            return null;
        }

        using var request = new HttpRequestMessage(HttpMethod.Get, "https://www.googleapis.com/oauth2/v2/userinfo");
        request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token.AccessToken);
        using var profileResponse = await client.SendAsync(request, cancellationToken);
        return profileResponse.IsSuccessStatusCode
            ? await profileResponse.Content.ReadFromJsonAsync<ExternalOAuthProfile>(cancellationToken: cancellationToken)
            : null;
    }

    private OAuthProviderSettings? GetProviderSettings(string provider) => provider switch
    {
        "google" => _oauthSettings.Google,
        _ => null
    };

    private static string NormalizeProvider(string provider) => provider.Trim().ToLowerInvariant();

    private static string GenerateExternalPassword()
    {
        var bytes = RandomNumberGenerator.GetBytes(32);
        return Convert.ToBase64String(bytes);
    }

    private static string EncodeState(string returnUrl, string? frontendCallbackUrl)
    {
        var bytes = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(new OAuthState(returnUrl, frontendCallbackUrl)));
        return Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');
    }

    private static OAuthState DecodeState(string? state)
    {
        if (string.IsNullOrWhiteSpace(state))
        {
            return new OAuthState("/", null);
        }

        try
        {
            var padded = state.Replace('-', '+').Replace('_', '/');
            padded = padded.PadRight(padded.Length + (4 - padded.Length % 4) % 4, '=');
            var decoded = Encoding.UTF8.GetString(Convert.FromBase64String(padded));
            if (decoded.TrimStart().StartsWith('{'))
            {
                return JsonSerializer.Deserialize<OAuthState>(decoded) ?? new OAuthState("/", null);
            }

            return new OAuthState(decoded, null);
        }
        catch
        {
            return new OAuthState("/", null);
        }
    }

    private string GetConfiguredFrontendCallbackUrl()
    {
        return string.IsNullOrWhiteSpace(_oauthSettings.FrontendCallbackUrl)
            ? "http://localhost:3000/auth/callback"
            : _oauthSettings.FrontendCallbackUrl.Trim();
    }

    private string? NormalizeFrontendCallbackUrl(string? frontendCallbackUrl)
    {
        if (string.IsNullOrWhiteSpace(frontendCallbackUrl) ||
            !Uri.TryCreate(frontendCallbackUrl.Trim(), UriKind.Absolute, out var callbackUri) ||
            callbackUri.Scheme is not ("http" or "https") ||
            !callbackUri.AbsolutePath.Equals("/auth/callback", StringComparison.OrdinalIgnoreCase) ||
            !IsAllowedFrontendHost(callbackUri.Host))
        {
            return null;
        }

        return callbackUri.GetLeftPart(UriPartial.Path);
    }

    private bool IsAllowedFrontendHost(string host)
    {
        if (host.Equals("localhost", StringComparison.OrdinalIgnoreCase) ||
            host.Equals("127.0.0.1", StringComparison.OrdinalIgnoreCase) ||
            host.Equals("::1", StringComparison.OrdinalIgnoreCase) ||
            host.Equals("xoft.in", StringComparison.OrdinalIgnoreCase) ||
            host.EndsWith(".xoft.in", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        return Uri.TryCreate(GetConfiguredFrontendCallbackUrl(), UriKind.Absolute, out var configured) &&
               host.Equals(configured.Host, StringComparison.OrdinalIgnoreCase);
    }

    private static string BuildFragment(Dictionary<string, string?> values)
    {
        return string.Join("&", values
            .Where(kvp => !string.IsNullOrWhiteSpace(kvp.Value))
            .Select(kvp => $"{Uri.EscapeDataString(kvp.Key)}={Uri.EscapeDataString(kvp.Value!)}"));
    }

    private sealed record OAuthTokenResponse([property: JsonPropertyName("access_token")] string? AccessToken);

    private sealed record OAuthState(string? ReturnUrl, string? FrontendCallbackUrl);

    private sealed record ExternalOAuthProfile(
        [property: JsonPropertyName("id")] string? Id,
        [property: JsonPropertyName("email")] string? Email,
        [property: JsonPropertyName("name")] string? Name);

    private static UserProfile BuildUserProfile(ApplicationUser user)
    {
        var primaryRole = string.IsNullOrWhiteSpace(user.Role) ? DefaultRole : user.Role;

        return new UserProfile(
            user.Id.ToString(),
            user.Email ?? string.Empty,
            user.Name,
            primaryRole,
            user.CreatedAt,
            user.LinkedInProfile,
            user.Bio,
            user.Phone,
            user.TechStacks,
            user.Company,
            user.EmailVerified);
    }
}
