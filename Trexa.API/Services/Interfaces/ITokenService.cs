using Trexa.Api.Models.Identity;

namespace Trexa.Api.Services.Interfaces;

public interface ITokenService
{
    Task<string> GenerateTokenAsync(ApplicationUser user, CancellationToken cancellationToken = default);
}
