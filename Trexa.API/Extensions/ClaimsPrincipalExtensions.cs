using System.Security.Claims;

namespace Trexa.Api.Extensions;

public static class ClaimsPrincipalExtensions
{
    public static string? GetUserId(this ClaimsPrincipal principal) =>
        principal.FindFirstValue(ClaimTypes.NameIdentifier);

    public static string? GetRole(this ClaimsPrincipal principal)
    {
        var role = principal.FindFirstValue(ClaimTypes.Role);
        return string.IsNullOrWhiteSpace(role) ? null : role.Trim().ToLowerInvariant();
    }
}
