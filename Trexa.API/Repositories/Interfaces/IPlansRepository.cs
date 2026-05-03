using Trexa.Api.Models.Documents;

namespace Trexa.Api.Repositories.Interfaces;

public interface IPlansRepository
{
    Task EnsureDefaultPlansAsync(CancellationToken cancellationToken = default);
    Task<List<Plan>> GetPlansAsync(CancellationToken cancellationToken = default);
    Task<Plan?> GetPlanByIdAsync(string id, CancellationToken cancellationToken = default);
    Task<Plan> CreatePlanAsync(Plan plan, CancellationToken cancellationToken = default);
    Task<bool> UpdatePlanAsync(string id, Plan plan, CancellationToken cancellationToken = default);
    Task<bool> DeletePlanAsync(string id, CancellationToken cancellationToken = default);

    Task<List<CompanyLevel>> GetCompanyLevelsAsync(CancellationToken cancellationToken = default);
    Task<CompanyLevel> CreateCompanyLevelAsync(CompanyLevel level, CancellationToken cancellationToken = default);
    Task<bool> UpdateCompanyLevelAsync(string id, CompanyLevel level, CancellationToken cancellationToken = default);
    Task<bool> DeleteCompanyLevelAsync(string id, CancellationToken cancellationToken = default);
    Task RemoveCompanyLevelFromPlansAsync(string companyLevelId, CancellationToken cancellationToken = default);

    Task ClearDefaultPlanFlagAsync(CancellationToken cancellationToken = default);
}
