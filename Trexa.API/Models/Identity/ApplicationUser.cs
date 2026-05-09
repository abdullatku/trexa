namespace Trexa.Api.Models.Identity;

public sealed class ApplicationUser
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string? UserName { get; set; }
    public string? Email { get; set; }
    public string? PasswordHash { get; set; }
    public string Role { get; set; } = "student";
    public string Name { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public string? LinkedInProfile { get; set; }
    public string? Bio { get; set; }
    public string? Phone { get; set; }
    public List<string> TechStacks { get; set; } = [];
    public string? Company { get; set; }
    public bool EmailVerified { get; set; }
    public string? EmailVerificationToken { get; set; }
    public DateTime? EmailVerificationTokenExpiresAt { get; set; }
    public string? PasswordResetToken { get; set; }
    public DateTime? PasswordResetTokenExpiresAt { get; set; }
}
