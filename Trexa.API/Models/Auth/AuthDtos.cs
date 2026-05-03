namespace Trexa.Api.Models.Auth;

public sealed record SignUpRequest(string Email, string Password, string Name);
public sealed record SignInRequest(string Email, string Password);
public sealed record ResendVerificationRequest(string Email);
public sealed record UpdateProfileRequest(
    string Name,
    string? LinkedInProfile,
    string? Bio,
    string? Phone,
    List<string>? TechStacks);

public sealed record UserProfile(
    string Id,
    string Email,
    string Name,
    string Role,
    DateTime CreatedAt,
    string? LinkedInProfile,
    string? Bio,
    string? Phone,
    List<string>? TechStacks,
    string? Company,
    bool EmailVerified);

public sealed record AuthResponse(string AccessToken, UserProfile User);
