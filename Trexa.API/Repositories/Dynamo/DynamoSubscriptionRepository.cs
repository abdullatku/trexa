using Amazon.DynamoDBv2.DataModel;
using Amazon.DynamoDBv2.DocumentModel;
using Microsoft.Extensions.Options;
using Trexa.Api.Models.Documents;
using Trexa.Api.Models.Dynamo;
using Trexa.Api.Repositories.Interfaces;
using Trexa.Api.Settings;

namespace Trexa.Api.Repositories.Dynamo;

public sealed class DynamoSubscriptionRepository : ISubscriptionRepository
{
    private readonly IDynamoDBContext _context;
    private readonly DynamoDbSettings _settings;

    public DynamoSubscriptionRepository(IDynamoDBContext context, IOptions<DynamoDbSettings> settings)
    {
        _context = context;
        _settings = settings.Value;
    }

    public async Task<Subscription?> GetActiveByUserIdAsync(string userId, CancellationToken cancellationToken = default)
    {
        var search = _context.ScanAsync<DynamoSubscription>(
            [
                new ScanCondition(nameof(DynamoSubscription.UserId), ScanOperator.Equal, userId),
                new ScanCondition(nameof(DynamoSubscription.Status), ScanOperator.Equal, "active")
            ],
            Config());

        var list = await search.GetRemainingAsync(cancellationToken);
        return list.OrderByDescending(x => x.CreatedAt).FirstOrDefault()?.ToDomain();
    }

    public async Task ExpireActiveByUserIdAsync(string userId, CancellationToken cancellationToken = default)
    {
        var search = _context.ScanAsync<DynamoSubscription>(
            [
                new ScanCondition(nameof(DynamoSubscription.UserId), ScanOperator.Equal, userId),
                new ScanCondition(nameof(DynamoSubscription.Status), ScanOperator.Equal, "active")
            ],
            Config());

        var list = await search.GetRemainingAsync(cancellationToken);
        foreach (var item in list)
        {
            item.Status = "expired";
            await _context.SaveAsync(item, Config(), cancellationToken);
        }
    }

    public async Task<Subscription> CreateAsync(Subscription subscription, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(subscription.Id))
        {
            subscription.Id = Guid.NewGuid().ToString("N");
        }

        await _context.SaveAsync(subscription.ToDynamo(), Config(), cancellationToken);
        return subscription;
    }

    public async Task<bool> ConsumeInterviewCreditAsync(string userId, CancellationToken cancellationToken = default)
    {
        var active = await GetActiveByUserIdAsync(userId, cancellationToken);
        if (active is null || active.InterviewsRemaining <= 0)
        {
            return false;
        }

        active.InterviewsRemaining -= 1;
        await _context.SaveAsync(active.ToDynamo(), Config(), cancellationToken);
        return true;
    }

    private DynamoDBOperationConfig Config() => new() { OverrideTableName = _settings.SubscriptionsTable };
}
