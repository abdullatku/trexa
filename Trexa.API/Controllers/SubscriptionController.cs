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

        var activeSubscription = await _subscriptionRepository.GetActiveByUserIdAsync(userId, cancellationToken);
        var activePlan = activeSubscription is null
            ? null
            : await _plansRepository.GetPlanByIdAsync(activeSubscription.PlanId, cancellationToken);

        if (IsDowngrade(activeSubscription, activePlan, plan))
        {
            return BadRequest(new
            {
                error = $"You are already on a better plan valid until {activeSubscription!.EndDate:yyyy-MM-dd}."
            });
        }

        await ActivateSubscription(userId, plan, cancellationToken);
        return Ok(new { message = "Free plan activated successfully" });
    }

    [HttpPost("subscription/activate-with-credit")]
    public async Task<IActionResult> ActivateWithCredit([FromBody] SubscriptionRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (string.IsNullOrWhiteSpace(userId)) return Unauthorized();

        var plan = await _plansRepository.GetPlanByIdAsync(request.PlanId, cancellationToken);
        if (plan is null) return NotFound(new { error = "Plan not found" });

        var activeSubscription = await _subscriptionRepository.GetActiveByUserIdAsync(userId, cancellationToken);
        var activePlan = activeSubscription is null
            ? null
            : await _plansRepository.GetPlanByIdAsync(activeSubscription.PlanId, cancellationToken);

        if (IsDowngrade(activeSubscription, activePlan, plan))
        {
            return BadRequest(new
            {
                error = $"You are already on a better plan valid until {activeSubscription!.EndDate:yyyy-MM-dd}."
            });
        }

        var payableAmountPaise = CalculatePayableAmountPaise(activeSubscription, activePlan, plan);
        if (payableAmountPaise > 0)
        {
            return BadRequest(new { error = "Payment is required for this upgrade" });
        }

        var subscription = await ActivateSubscription(userId, plan, cancellationToken, Math.Max(0, activeSubscription?.InterviewsRemaining ?? 0));
        return Ok(new { message = "Subscription upgraded using remaining interview credit", subscription });
    }

    internal async Task<Subscription> ActivateSubscription(string userId, Plan plan, CancellationToken cancellationToken, int carryForwardInterviews = 0)
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
            InterviewsRemaining = plan.Interviews + Math.Max(0, carryForwardInterviews),
            StartDate = DateTime.UtcNow,
            EndDate = DateTime.UtcNow.AddDays(durationDays),
            CreatedAt = DateTime.UtcNow
        };

        return await _subscriptionRepository.CreateAsync(subscription, cancellationToken);
    }

    private static bool IsDowngrade(Subscription? activeSubscription, Plan? activePlan, Plan targetPlan)
    {
        if (activeSubscription is null || activePlan is null || activeSubscription.EndDate <= DateTime.UtcNow)
        {
            return false;
        }

        return targetPlan.Interviews < activePlan.Interviews || targetPlan.Price < activePlan.Price;
    }

    private static decimal CalculatePayableAmountPaise(Subscription? activeSubscription, Plan? activePlan, Plan targetPlan)
    {
        var targetAmount = targetPlan.Price * 100;
        if (activeSubscription is null || activePlan is null || activeSubscription.EndDate <= DateTime.UtcNow)
        {
            return targetAmount;
        }

        var currentPerInterview = activePlan.Interviews <= 0 ? 0 : activePlan.Price / activePlan.Interviews;
        var unusedCredit = Math.Max(0, activeSubscription.InterviewsRemaining) * currentPerInterview;
        var payableMajor = Math.Max(0, targetPlan.Price - unusedCredit);
        return Math.Round(payableMajor * 100, 0);
    }

    public sealed record SubscriptionRequest(string PlanId);
}
