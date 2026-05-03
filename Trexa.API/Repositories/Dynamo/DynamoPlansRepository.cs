using Amazon.DynamoDBv2.DataModel;
using Amazon.DynamoDBv2.DocumentModel;
using Microsoft.Extensions.Options;
using Trexa.Api.Models.Documents;
using Trexa.Api.Models.Dynamo;
using Trexa.Api.Repositories.Interfaces;
using Trexa.Api.Settings;

namespace Trexa.Api.Repositories.Dynamo;

public sealed class DynamoPlansRepository : IPlansRepository
{
    private readonly IDynamoDBContext _context;
    private readonly DynamoDbSettings _settings;

    public DynamoPlansRepository(IDynamoDBContext context, IOptions<DynamoDbSettings> settings)
    {
        _context = context;
        _settings = settings.Value;
    }

    public async Task EnsureDefaultPlansAsync(CancellationToken cancellationToken = default)
    {
        var existing = await GetPlansAsync(cancellationToken);
        if (existing.Count > 0) return;

        var defaults = new List<Plan>
        {
            new() { Name = "Free", Price = 0, Interviews = 1, Duration = "monthly", IsDefault = true, Features = ["1 mock interview", "Basic feedback"], PaymentType = "subscription" },
            new() { Name = "Starter", Price = 999, Interviews = 3, Duration = "monthly", Features = ["3 interviews", "Detailed feedback", "Video recordings"], PaymentType = "subscription" },
            new() { Name = "Professional", Price = 2499, Interviews = 10, Duration = "quarterly", Features = ["10 interviews", "Priority scheduling", "Detailed feedback"], PaymentType = "subscription" }
        };

        foreach (var item in defaults)
        {
            await CreatePlanAsync(item, cancellationToken);
        }
    }

    public async Task<List<Plan>> GetPlansAsync(CancellationToken cancellationToken = default)
    {
        var search = _context.ScanAsync<DynamoPlan>(Array.Empty<ScanCondition>(), PlanConfig());
        var items = await search.GetRemainingAsync(cancellationToken);
        return items.Select(x => x.ToDomain()).OrderBy(x => x.Price).ToList();
    }

    public async Task<Plan?> GetPlanByIdAsync(string id, CancellationToken cancellationToken = default)
    {
        var item = await _context.LoadAsync<DynamoPlan>(id, PlanConfig(), cancellationToken);
        return item?.ToDomain();
    }

    public async Task<Plan> CreatePlanAsync(Plan plan, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(plan.Id))
        {
            plan.Id = Guid.NewGuid().ToString("N");
        }

        await _context.SaveAsync(plan.ToDynamo(), PlanConfig(), cancellationToken);
        return plan;
    }

    public async Task<bool> UpdatePlanAsync(string id, Plan plan, CancellationToken cancellationToken = default)
    {
        var existing = await _context.LoadAsync<DynamoPlan>(id, PlanConfig(), cancellationToken);
        if (existing is null) return false;

        existing.Name = plan.Name;
        existing.Price = plan.Price;
        existing.Interviews = plan.Interviews;
        existing.Duration = plan.Duration;
        existing.Features = plan.Features;
        existing.IsDefault = plan.IsDefault;
        existing.CompanyLevels = plan.CompanyLevels;
        existing.PaymentType = plan.PaymentType;

        await _context.SaveAsync(existing, PlanConfig(), cancellationToken);
        return true;
    }

    public async Task<bool> DeletePlanAsync(string id, CancellationToken cancellationToken = default)
    {
        var existing = await _context.LoadAsync<DynamoPlan>(id, PlanConfig(), cancellationToken);
        if (existing is null) return false;

        await _context.DeleteAsync(existing, PlanConfig(), cancellationToken);
        return true;
    }

    public async Task<List<CompanyLevel>> GetCompanyLevelsAsync(CancellationToken cancellationToken = default)
    {
        var search = _context.ScanAsync<DynamoCompanyLevel>(Array.Empty<ScanCondition>(), CompanyLevelConfig());
        var items = await search.GetRemainingAsync(cancellationToken);
        return items.Select(x => x.ToDomain()).OrderBy(x => x.Name).ToList();
    }

    public async Task<CompanyLevel> CreateCompanyLevelAsync(CompanyLevel level, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(level.Id))
        {
            level.Id = Guid.NewGuid().ToString("N");
        }

        await _context.SaveAsync(level.ToDynamo(), CompanyLevelConfig(), cancellationToken);
        return level;
    }

    public async Task<bool> UpdateCompanyLevelAsync(string id, CompanyLevel level, CancellationToken cancellationToken = default)
    {
        var existing = await _context.LoadAsync<DynamoCompanyLevel>(id, CompanyLevelConfig(), cancellationToken);
        if (existing is null) return false;

        existing.Name = level.Name;
        existing.Description = level.Description;
        await _context.SaveAsync(existing, CompanyLevelConfig(), cancellationToken);

        return true;
    }

    public async Task<bool> DeleteCompanyLevelAsync(string id, CancellationToken cancellationToken = default)
    {
        var existing = await _context.LoadAsync<DynamoCompanyLevel>(id, CompanyLevelConfig(), cancellationToken);
        if (existing is null) return false;

        await _context.DeleteAsync(existing, CompanyLevelConfig(), cancellationToken);
        return true;
    }

    public async Task RemoveCompanyLevelFromPlansAsync(string companyLevelId, CancellationToken cancellationToken = default)
    {
        var plans = await GetPlansAsync(cancellationToken);
        foreach (var plan in plans.Where(p => p.CompanyLevels.Contains(companyLevelId)))
        {
            plan.CompanyLevels = plan.CompanyLevels.Where(x => x != companyLevelId).ToList();
            await UpdatePlanAsync(plan.Id, plan, cancellationToken);
        }
    }

    public async Task ClearDefaultPlanFlagAsync(CancellationToken cancellationToken = default)
    {
        var plans = await GetPlansAsync(cancellationToken);
        foreach (var plan in plans.Where(x => x.IsDefault))
        {
            plan.IsDefault = false;
            await UpdatePlanAsync(plan.Id, plan, cancellationToken);
        }
    }

    private DynamoDBOperationConfig PlanConfig() => new() { OverrideTableName = _settings.PlansTable };
    private DynamoDBOperationConfig CompanyLevelConfig() => new() { OverrideTableName = _settings.CompanyLevelsTable };
}
