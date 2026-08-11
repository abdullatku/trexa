using Trexa.Api.Models.Identity;

namespace Trexa.Api.Services.Interfaces;

public interface ICalComOAuthService
{
    string BuildAuthorizationUrl(ApplicationUser user);
    Task<ApplicationUser> CompleteAuthorizationAsync(string code, string state, CancellationToken cancellationToken);
    Task<string> GetAccessTokenAsync(ApplicationUser user, CancellationToken cancellationToken);
    Task DisconnectAsync(ApplicationUser user, CancellationToken cancellationToken);
    string Protect(string value);
    string Unprotect(string value);
}
