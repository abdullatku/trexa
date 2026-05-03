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
public sealed class SubscriptionController : ControllerBase
{
    private readonly ISubscriptionRepository _subscriptionRepository;
    private readonly IPlansRepository _plansRepository;

    public SubscriptionController(ISubscriptionRepository subscriptionRepository, IPlansRepository plansRepository)
    {
        _subscriptionRepository = subscriptionRepository;
        _plansRepository = plansRepository;
    }

    [HttpGet("subscription")]
    public async Task<IActionResult> GetSubscription(CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (string.IsNullOrWhiteSpace(userId)) return Unauthorized();

        var subscription = await _subscriptionRepository.GetActiveByUserIdAsync(userId, cancellationToken);
        Plan? plan = null;
        if (subscription is not null)
        {
            plan = await _plansRepository.GetPlanByIdAsync(subscription.PlanId, cancellationToken);
        }

        return Ok(new { subscription, plan });
    }

    [HttpPost("subscribe-free-plan")]
    public async Task<IActionResult> SubscribeFreePlan([FromBody] SubscriptionRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (string.IsNullOrWhiteSpace(userId)) return Unauthorized();

        var plan = await _plansRepository.GetPlanByIdAsync(request.PlanId, cancellationToken);
        if (plan is null) return NotFound(new { error = "Plan not found" });
        if (plan.Price > 0) return BadRequest(new { error = "Plan is not free" });

        await ActivateSubscription(userId, plan, cancellationToken);
        return Ok(new { message = "Free plan activated successfully" });
    }

    internal async Task<Subscription> ActivateSubscription(string userId, Plan plan, CancellationToken cancellationToken)
    {
        await _subscriptionRepository.ExpireActiveByUserIdAsync(userId, cancellationToken);

        var durationDays = plan.Duration switch
        {
            "quarterly" => 90,
            "yearly" => 365,
            _ => 30
        };

        var subscription = new Subscription
        {
            UserId = userId,
            PlanId = plan.Id,
            Status = "active",
            InterviewsRemaining = plan.Interviews,
            StartDate = DateTime.UtcNow,
            EndDate = DateTime.UtcNow.AddDays(durationDays),
            CreatedAt = DateTime.UtcNow
        };

        return await _subscriptionRepository.CreateAsync(subscription, cancellationToken);
    }

    public sealed record SubscriptionRequest(string PlanId);
}
