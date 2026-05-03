using Microsoft.AspNetCore.Mvc;
using Trexa.Api.Constants;
using Trexa.Api.Repositories.Interfaces;

namespace Trexa.Api.Controllers;

[ApiController]
[Route(ApiRoutes.Prefix + "/debug")]
public sealed class DebugController : ControllerBase
{
    private readonly IPlansRepository _plansRepository;

    public DebugController(IPlansRepository plansRepository)
    {
        _plansRepository = plansRepository;
    }

    [HttpGet("init-plans")]
    public async Task<IActionResult> InitializePlans(CancellationToken cancellationToken)
    {
        await _plansRepository.EnsureDefaultPlansAsync(cancellationToken);
        var plans = await _plansRepository.GetPlansAsync(cancellationToken);
        return Ok(new { message = "Plans initialization complete", plans, planCount = plans.Count });
    }
}
