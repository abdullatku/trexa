using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.Extensions.Options;
using Trexa.Api.Models.Identity;
using Trexa.Api.Repositories.Interfaces;
using Trexa.Api.Services.Interfaces;
using Trexa.Api.Settings;

namespace Trexa.Api.Services;

public sealed class CalComOAuthService : ICalComOAuthService
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private readonly IHttpClientFactory _clients;
    private readonly IUserRepository _users;
    private readonly CalComSettings _settings;
    private readonly IDataProtector _protector;

    public CalComOAuthService(IHttpClientFactory clients, IUserRepository users, IOptions<CalComSettings> settings, IDataProtectionProvider protection)
    {
        _clients = clients;
        _users = users;
        _settings = settings.Value;
        _protector = protection.CreateProtector("Trexa.CalComOAuth.v1");
    }

    public string BuildAuthorizationUrl(ApplicationUser user)
    {
        ValidateOAuthSettings();
        var state = Protect(JsonSerializer.Serialize(new OAuthState(user.Id, DateTime.UtcNow.AddMinutes(10))));
        return $"{_settings.AppBaseUrl.TrimEnd('/')}/auth/oauth2/authorize" +
               $"?client_id={Uri.EscapeDataString(_settings.OAuthClientId)}" +
               $"&redirect_uri={Uri.EscapeDataString(_settings.OAuthRedirectUrl)}" +
               $"&state={Uri.EscapeDataString(state)}" +
               $"&scope={Uri.EscapeDataString(_settings.OAuthScopes)}";
    }

    public async Task<ApplicationUser> CompleteAuthorizationAsync(string code, string state, CancellationToken cancellationToken)
    {
        ValidateOAuthSettings();
        OAuthState oauthState;
        try
        {
            oauthState = JsonSerializer.Deserialize<OAuthState>(Unprotect(state), JsonOptions)
                ?? throw new InvalidOperationException();
        }
        catch
        {
            throw new InvalidOperationException("The Cal.com authorization state is invalid or expired.");
        }

        if (oauthState.ExpiresAt < DateTime.UtcNow)
            throw new InvalidOperationException("The Cal.com authorization request expired. Please connect again.");

        var user = await _users.GetByIdAsync(oauthState.UserId, cancellationToken)
            ?? throw new InvalidOperationException("Trexa user was not found.");
        if (user.Role != "interviewer")
            throw new InvalidOperationException("Only interviewers can connect a Cal.com account.");

        var token = await RequestTokenAsync(new
        {
            client_id = _settings.OAuthClientId,
            client_secret = _settings.OAuthClientSecret,
            grant_type = "authorization_code",
            code,
            redirect_uri = _settings.OAuthRedirectUrl
        }, cancellationToken);

        SaveToken(user, token);
        user.CalComConnectedAt = DateTime.UtcNow;
        await EnsureWebhookAsync(user, token.AccessToken!, cancellationToken);
        user.UpdatedAt = DateTime.UtcNow;
        await _users.UpdateAsync(user, cancellationToken);
        return user;
    }

    public async Task<string> GetAccessTokenAsync(ApplicationUser user, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(user.CalComAccessToken))
            throw new InvalidOperationException("The assigned interviewer must connect their Cal.com account first.");

        if (!user.CalComTokenExpiresAt.HasValue || user.CalComTokenExpiresAt > DateTime.UtcNow.AddMinutes(2))
            return Unprotect(user.CalComAccessToken);

        if (string.IsNullOrWhiteSpace(user.CalComRefreshToken))
            throw new InvalidOperationException("The interviewer must reconnect their Cal.com account.");

        var token = await RequestTokenAsync(new
        {
            client_id = _settings.OAuthClientId,
            client_secret = _settings.OAuthClientSecret,
            grant_type = "refresh_token",
            refresh_token = Unprotect(user.CalComRefreshToken)
        }, cancellationToken);
        SaveToken(user, token);
        user.UpdatedAt = DateTime.UtcNow;
        await _users.UpdateAsync(user, cancellationToken);
        return token.AccessToken!;
    }

    public async Task DisconnectAsync(ApplicationUser user, CancellationToken cancellationToken)
    {
        if (!string.IsNullOrWhiteSpace(user.CalComWebhookId) && !string.IsNullOrWhiteSpace(user.CalComAccessToken))
        {
            try
            {
                var accessToken = await GetAccessTokenAsync(user, cancellationToken);
                using var request = new HttpRequestMessage(
                    HttpMethod.Delete,
                    $"{_settings.ApiBaseUrl.TrimEnd('/')}/v2/webhooks/{Uri.EscapeDataString(user.CalComWebhookId)}");
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
                using var _ = await _clients.CreateClient().SendAsync(request, cancellationToken);
            }
            catch (InvalidOperationException)
            {
                // Local disconnection must remain possible when the remote grant has expired/revoked.
            }
        }

        user.CalComAccessToken = null;
        user.CalComRefreshToken = null;
        user.CalComTokenExpiresAt = null;
        user.CalComScopes = null;
        user.CalComWebhookId = null;
        user.CalComWebhookSecret = null;
        user.CalComConnectedAt = null;
        user.UpdatedAt = DateTime.UtcNow;
        await _users.UpdateAsync(user, cancellationToken);
    }

    public string Protect(string value) => _protector.Protect(value);
    public string Unprotect(string value) => _protector.Unprotect(value);

    private async Task EnsureWebhookAsync(ApplicationUser user, string accessToken, CancellationToken cancellationToken)
    {
        if (!string.IsNullOrWhiteSpace(user.CalComWebhookId) || string.IsNullOrWhiteSpace(_settings.WebhookUrl)) return;

        var secret = Convert.ToHexString(RandomNumberGenerator.GetBytes(32)).ToLowerInvariant();
        var url = $"{_settings.WebhookUrl.TrimEnd('/')}/{user.Id}";
        using var request = new HttpRequestMessage(HttpMethod.Post, $"{_settings.ApiBaseUrl.TrimEnd('/')}/v2/webhooks");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        request.Content = JsonContent.Create(new
        {
            active = true,
            subscriberUrl = url,
            triggers = new[] { "BOOKING_CREATED", "BOOKING_RESCHEDULED", "BOOKING_CANCELLED", "MEETING_STARTED", "MEETING_ENDED", "RECORDING_READY" },
            secret,
            version = "2021-10-20"
        });
        using var response = await _clients.CreateClient().SendAsync(request, cancellationToken);
        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        if (!response.IsSuccessStatusCode)
            throw new InvalidOperationException($"Cal.com connected, but webhook creation failed ({(int)response.StatusCode}): {body}");

        var result = JsonSerializer.Deserialize<WebhookResponse>(body, JsonOptions);
        user.CalComWebhookId = result?.Data?.Id?.ToString();
        user.CalComWebhookSecret = Protect(secret);
    }

    private async Task<TokenResponse> RequestTokenAsync(object payload, CancellationToken cancellationToken)
    {
        using var response = await _clients.CreateClient().PostAsJsonAsync(
            $"{_settings.ApiBaseUrl.TrimEnd('/')}/v2/auth/oauth2/token", payload, JsonOptions, cancellationToken);
        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        var token = JsonSerializer.Deserialize<TokenResponse>(body, JsonOptions);
        if (!response.IsSuccessStatusCode || string.IsNullOrWhiteSpace(token?.AccessToken))
            throw new InvalidOperationException($"Cal.com token exchange failed ({(int)response.StatusCode}): {body}");
        return token;
    }

    private void SaveToken(ApplicationUser user, TokenResponse token)
    {
        user.CalComAccessToken = Protect(token.AccessToken!);
        if (!string.IsNullOrWhiteSpace(token.RefreshToken)) user.CalComRefreshToken = Protect(token.RefreshToken);
        user.CalComTokenExpiresAt = DateTime.UtcNow.AddSeconds(Math.Max(60, token.ExpiresIn));
        user.CalComScopes = token.Scope;
    }

    private void ValidateOAuthSettings()
    {
        if (string.IsNullOrWhiteSpace(_settings.OAuthClientId) ||
            string.IsNullOrWhiteSpace(_settings.OAuthClientSecret) ||
            string.IsNullOrWhiteSpace(_settings.OAuthRedirectUrl))
            throw new InvalidOperationException("Cal.com OAuth is not configured. Set CalCom:OAuthClientId, OAuthClientSecret, and OAuthRedirectUrl.");
    }

    private sealed record OAuthState(Guid UserId, DateTime ExpiresAt);
    private sealed record TokenResponse(
        [property: JsonPropertyName("access_token")] string? AccessToken,
        [property: JsonPropertyName("refresh_token")] string? RefreshToken,
        [property: JsonPropertyName("expires_in")] int ExpiresIn,
        [property: JsonPropertyName("scope")] string? Scope);
    private sealed record WebhookResponse([property: JsonPropertyName("data")] WebhookData? Data);
    private sealed record WebhookData([property: JsonPropertyName("id")] int? Id);
}
