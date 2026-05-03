using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Trexa.Api.Constants;
using Trexa.Api.Extensions;
using Trexa.Api.Models.Documents;
using Trexa.Api.Repositories.Interfaces;

namespace Trexa.Api.Controllers;

[ApiController]
[Route(ApiRoutes.Prefix)]
[Authorize]
public sealed class PlansController : ControllerBase
{
    private readonly IPlansRepository _plansRepository;

    public PlansController(IPlansRepository plansRepository)
    {
        _plansRepository = plansRepository;
    }

    [HttpGet("plans")]
    [AllowAnonymous]
    public async Task<IActionResult> GetPlans(CancellationToken cancellationToken)
    {
        await _plansRepository.EnsureDefaultPlansAsync(cancellationToken);
        var plans = await _plansRepository.GetPlansAsync(cancellationToken);
        return Ok(new { plans });
    }

    [HttpPost("admin/plans")]
    public async Task<IActionResult> CreatePlan([FromBody] Plan requestBody, CancellationToken cancellationToken)
    {
        if (User.GetRole() != "admin") return Forbid();
        if (string.IsNullOrWhiteSpace(requestBody.Name)) return BadRequest(new { error = "Plan name is required" });

        if (requestBody.IsDefault) await _plansRepository.ClearDefaultPlanFlagAsync(cancellationToken);

        var plan = new Plan
        {
            Name = requestBody.Name.Trim(),
            Price = requestBody.Price,
            Interviews = requestBody.Interviews,
            Duration = requestBody.Duration,
            Features = requestBody.Features,
            IsDefault = requestBody.IsDefault,
            CompanyLevels = requestBody.CompanyLevels,
            PaymentType = string.IsNullOrWhiteSpace(requestBody.PaymentType) ? "subscription" : requestBody.PaymentType,
            CreatedAt = DateTime.UtcNow
        };

        await _plansRepository.CreatePlanAsync(plan, cancellationToken);
        return Ok(new { message = "Plan created successfully", plan });
    }

    [HttpPut("admin/plans/{id}")]
    public async Task<IActionResult> UpdatePlan(string id, [FromBody] Plan requestBody, CancellationToken cancellationToken)
    {
        if (User.GetRole() != "admin") return Forbid();

        if (requestBody.IsDefault) await _plansRepository.ClearDefaultPlanFlagAsync(cancellationToken);

        var updatedPlan = new Plan
        {
            Id = id,
            Name = requestBody.Name.Trim(),
            Price = requestBody.Price,
            Interviews = requestBody.Interviews,
            Duration = requestBody.Duration,
            Features = requestBody.Features,
            IsDefault = requestBody.IsDefault,
            CompanyLevels = requestBody.CompanyLevels,
            PaymentType = string.IsNullOrWhiteSpace(requestBody.PaymentType) ? "subscription" : requestBody.PaymentType,
            CreatedAt = requestBody.CreatedAt
        };

        var success = await _plansRepository.UpdatePlanAsync(id, updatedPlan, cancellationToken);
        if (!success) return NotFound(new { error = "Plan not found" });

        return Ok(new { message = "Plan updated successfully" });
    }

    [HttpDelete("admin/plans/{id}")]
    public async Task<IActionResult> DeletePlan(string id, CancellationToken cancellationToken)
    {
        if (User.GetRole() != "admin") return Forbid();

        var success = await _plansRepository.DeletePlanAsync(id, cancellationToken);
        if (!success) return NotFound(new { error = "Plan not found" });

        return Ok(new { message = "Plan deleted successfully" });
    }

    [HttpGet("admin/company-levels")]
    public async Task<IActionResult> GetCompanyLevels(CancellationToken cancellationToken)
    {
        if (User.GetRole() != "admin") return Forbid();

        var companyLevels = await _plansRepository.GetCompanyLevelsAsync(cancellationToken);
        return Ok(new { companyLevels });
    }

    [HttpPost("admin/company-levels")]
    public async Task<IActionResult> CreateCompanyLevel([FromBody] CompanyLevel requestBody, CancellationToken cancellationToken)
    {
        if (User.GetRole() != "admin") return Forbid();
        if (string.IsNullOrWhiteSpace(requestBody.Name)) return BadRequest(new { error = "Company level name is required" });

        var level = new CompanyLevel
        {
            Name = requestBody.Name.Trim(),
            Description = requestBody.Description?.Trim() ?? string.Empty,
            CreatedAt = DateTime.UtcNow
        };

        await _plansRepository.CreateCompanyLevelAsync(level, cancellationToken);
        return Ok(new { message = "Company level created successfully", companyLevel = level });
    }

    [HttpPut("admin/company-levels/{id}")]
    public async Task<IActionResult> UpdateCompanyLevel(string id, [FromBody] CompanyLevel requestBody, CancellationToken cancellationToken)
    {
        if (User.GetRole() != "admin") return Forbid();

        var updatedLevel = new CompanyLevel
        {
            Id = id,
            Name = requestBody.Name.Trim(),
            Description = requestBody.Description?.Trim() ?? string.Empty,
            CreatedAt = requestBody.CreatedAt
        };

        var success = await _plansRepository.UpdateCompanyLevelAsync(id, updatedLevel, cancellationToken);
        if (!success) return NotFound(new { error = "Company level not found" });

        return Ok(new { message = "Company level updated successfully" });
    }

    [HttpDelete("admin/company-levels/{id}")]
    public async Task<IActionResult> DeleteCompanyLevel(string id, CancellationToken cancellationToken)
    {
        if (User.GetRole() != "admin") return Forbid();

        var success = await _plansRepository.DeleteCompanyLevelAsync(id, cancellationToken);
        if (!success) return NotFound(new { error = "Company level not found" });

        await _plansRepository.RemoveCompanyLevelFromPlansAsync(id, cancellationToken);
        return Ok(new { message = "Company level deleted successfully" });
    }
}
