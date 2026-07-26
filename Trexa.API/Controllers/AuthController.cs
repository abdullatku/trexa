using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Trexa.Api.Constants;
using Trexa.Api.Models.Auth;
using Trexa.Api.Services.Interfaces;

namespace Trexa.Api.Controllers;

[ApiController]
[Route(ApiRoutes.Prefix + "/auth")]
public sealed class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("signup")]
    [AllowAnonymous]
    public async Task<IActionResult> SignUp([FromBody] SignUpRequest request, CancellationToken cancellationToken)
    {
        var result = await _authService.SignUpAsync(request, cancellationToken);
        if (!result.Success)
        {
            return StatusCode(result.StatusCode, new { error = result.Error });
        }

        return Ok(new
        {
            message = "User created successfully. Please verify your email.",
            user = result.Data!.User,
            accessToken = result.Data.AccessToken
        });
    }

    [HttpPost("signin")]
    [AllowAnonymous]
    public async Task<IActionResult> SignIn([FromBody] SignInRequest request, CancellationToken cancellationToken)
    {
        var result = await _authService.SignInAsync(request, cancellationToken);
        if (!result.Success)
        {
            return StatusCode(result.StatusCode, new { error = result.Error });
        }

        return Ok(new
        {
            accessToken = result.Data!.AccessToken,
            user = result.Data.User
        });
    }

    [HttpGet("verify-email")]
    [AllowAnonymous]
    public async Task<IActionResult> VerifyEmail([FromQuery] string token, CancellationToken cancellationToken)
    {
        var result = await _authService.VerifyEmailAsync(token, cancellationToken);
        if (!result.Success)
        {
            return StatusCode(result.StatusCode, new { error = result.Error });
        }

        return Ok(new { message = result.Data });
    }

    [HttpPost("resend-verification-email")]
    [AllowAnonymous]
    public async Task<IActionResult> ResendVerificationEmail([FromBody] ResendVerificationRequest request, CancellationToken cancellationToken)
    {
        var result = await _authService.ResendVerificationEmailAsync(request.Email, cancellationToken);
        if (!result.Success)
        {
            return StatusCode(result.StatusCode, new { error = result.Error });
        }

        return Ok(new { message = result.Data });
    }

    [HttpPost("forgot-password")]
    [AllowAnonymous]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request, CancellationToken cancellationToken)
    {
        var result = await _authService.ForgotPasswordAsync(request, cancellationToken);
        if (!result.Success)
        {
            return StatusCode(result.StatusCode, new { error = result.Error });
        }

        return Ok(new { message = result.Data });
    }

    [HttpPost("reset-password")]
    [AllowAnonymous]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request, CancellationToken cancellationToken)
    {
        var result = await _authService.ResetPasswordAsync(request, cancellationToken);
        if (!result.Success)
        {
            return StatusCode(result.StatusCode, new { error = result.Error });
        }

        return Ok(new { message = result.Data });
    }

    [HttpGet("external/{provider}")]
    [AllowAnonymous]
    public IActionResult ExternalSignIn(string provider, [FromQuery] string? returnUrl = null, [FromQuery] string? frontendCallbackUrl = null)
    {
        var redirectUri = BuildExternalCallbackUrl(provider);
        var result = _authService.BuildExternalAuthorizationUrl(provider, redirectUri, returnUrl, frontendCallbackUrl);
        if (!result.Success)
        {
            return StatusCode(result.StatusCode, new { error = result.Error });
        }

        return Redirect(result.Data!);
    }

    [HttpGet("external/{provider}/callback")]
    [AllowAnonymous]
    public async Task<IActionResult> ExternalSignInCallback(
        string provider,
        [FromQuery] string? code,
        [FromQuery] string? state,
        [FromQuery] string? error,
        CancellationToken cancellationToken)
    {
        if (!string.IsNullOrWhiteSpace(error))
        {
            return Redirect(_authService.BuildFrontendOAuthErrorUrl(state, error));
        }

        if (string.IsNullOrWhiteSpace(code))
        {
            return Redirect(_authService.BuildFrontendOAuthErrorUrl(state, "Missing OAuth authorization code"));
        }

        var redirectUri = BuildExternalCallbackUrl(provider);
        var result = await _authService.ExternalSignInAsync(provider, code, redirectUri, cancellationToken);
        if (!result.Success)
        {
            return Redirect(_authService.BuildFrontendOAuthErrorUrl(state, result.Error ?? "External sign-in failed"));
        }

        return Redirect(_authService.BuildFrontendOAuthCallbackUrl(result.Data!, state));
    }

    [HttpGet("profile")]
    [Authorize]
    public async Task<IActionResult> Profile(CancellationToken cancellationToken)
    {
        var result = await _authService.GetProfileAsync(User, cancellationToken);
        if (!result.Success)
        {
            return StatusCode(result.StatusCode, new { error = result.Error });
        }

        return Ok(new
        {
            profile = result.Data
        });
    }

    [HttpPost("sync-profile")]
    [Authorize]
    public async Task<IActionResult> SyncProfile(CancellationToken cancellationToken)
    {
        var result = await _authService.GetProfileAsync(User, cancellationToken);
        if (!result.Success)
        {
            return StatusCode(result.StatusCode, new { error = result.Error });
        }

        return Ok(new
        {
            profile = result.Data
        });
    }

    [HttpPut("profile")]
    [Authorize]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request, CancellationToken cancellationToken)
    {
        var result = await _authService.UpdateProfileAsync(request, User, cancellationToken);
        if (!result.Success)
        {
            return StatusCode(result.StatusCode, new { error = result.Error });
        }

        return Ok(new
        {
            message = "Profile updated successfully",
            profile = result.Data
        });
    }

    private string BuildExternalCallbackUrl(string provider)
    {
        var forwardedProto = Request.Headers["X-Forwarded-Proto"].FirstOrDefault();
        var forwardedHost = Request.Headers["X-Forwarded-Host"].FirstOrDefault();

        return Url.ActionLink(
            action: nameof(ExternalSignInCallback),
            controller: "Auth",
            values: new { provider },
            protocol: string.IsNullOrWhiteSpace(forwardedProto) ? Request.Scheme : forwardedProto.Split(',')[0].Trim(),
            host: string.IsNullOrWhiteSpace(forwardedHost) ? Request.Host.ToString() : forwardedHost.Split(',')[0].Trim())!;
    }
}
