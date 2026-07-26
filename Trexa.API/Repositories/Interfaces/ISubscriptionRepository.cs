using Trexa.Api.Models.Documents;

namespace Trexa.Api.Repositories.Interfaces;

public interface ISubscriptionRepository
{
    Task<Subscription?> GetActiveByUserIdAsync(string userId, CancellationToken cancellationToken = default);
    Task ExpireActiveByUserIdAsync(string userId, CancellationToken cancellationToken = default);
    Task<Subscription> CreateAsync(Subscription subscription, CancellationToken cancellationToken = default);
    Task<bool> ConsumeInterviewCreditAsync(string userId, CancellationToken cancellationToken = default);
    Task<bool> RestoreInterviewCreditAsync(string userId, CancellationToken cancellationToken = default);
}
