using Trexa.Api.Models.Identity;

namespace Trexa.Api.Repositories.Interfaces;

public interface IUserRepository
{
    Task<ApplicationUser?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<ApplicationUser?> FindByEmailAsync(string email, CancellationToken cancellationToken = default);
    Task<ApplicationUser?> FindByEmailVerificationTokenAsync(string token, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ApplicationUser>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ApplicationUser>> GetByRoleAsync(string role, CancellationToken cancellationToken = default);
    Task CreateAsync(ApplicationUser user, string password, CancellationToken cancellationToken = default);
    Task UpdateAsync(ApplicationUser user, CancellationToken cancellationToken = default);
    Task<bool> VerifyPasswordAsync(ApplicationUser user, string password);
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
