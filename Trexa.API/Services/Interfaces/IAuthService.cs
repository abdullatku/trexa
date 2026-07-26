using System.Security.Claims;
using Trexa.Api.Models.Auth;

namespace Trexa.Api.Services.Interfaces;

public interface IAuthService
{
    Task<AuthServiceResult<AuthResponse>> SignUpAsync(SignUpRequest request, CancellationToken cancellationToken = default);
    Task<AuthServiceResult<AuthResponse>> SignInAsync(SignInRequest request, CancellationToken cancellationToken = default);
    Task<AuthServiceResult<UserProfile>> GetProfileAsync(ClaimsPrincipal principal, CancellationToken cancellationToken = default);
    Task<AuthServiceResult<UserProfile>> UpdateProfileAsync(UpdateProfileRequest request, ClaimsPrincipal principal, CancellationToken cancellationToken = default);
    Task<AuthServiceResult<string>> VerifyEmailAsync(string token, CancellationToken cancellationToken = default);
    Task<AuthServiceResult<string>> ResendVerificationEmailAsync(string email, CancellationToken cancellationToken = default);
    Task<AuthServiceResult<string>> ForgotPasswordAsync(ForgotPasswordRequest request, CancellationToken cancellationToken = default);
    Task<AuthServiceResult<string>> ResetPasswordAsync(ResetPasswordRequest request, CancellationToken cancellationToken = default);
    AuthServiceResult<string> BuildExternalAuthorizationUrl(string provider, string redirectUri, string? returnUrl, string? frontendCallbackUrl);
    Task<AuthServiceResult<AuthResponse>> ExternalSignInAsync(string provider, string code, string redirectUri, CancellationToken cancellationToken = default);
    string BuildFrontendOAuthCallbackUrl(AuthResponse response, string? state, string? error = null);
    string BuildFrontendOAuthErrorUrl(string? state, string error);
}
