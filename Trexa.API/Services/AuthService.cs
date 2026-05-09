using System.Security.Claims;
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

    public AuthService(
        IUserRepository userRepository,
        ITokenService tokenService,
        IEmailService emailService,
        IOptions<EmailSettings> emailSettings)
    {
        _userRepository = userRepository;
        _tokenService = tokenService;
        _emailService = emailService;
        _emailSettings = emailSettings.Value;
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
