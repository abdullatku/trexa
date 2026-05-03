using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Trexa.Api.Constants;
using Trexa.Api.Extensions;
using Trexa.Api.Models.Documents;
using Trexa.Api.Repositories.Interfaces;
using Trexa.Api.Settings;

namespace Trexa.Api.Controllers;

[ApiController]
[Route(ApiRoutes.Prefix)]
[Authorize]
public sealed class PaymentsController : ControllerBase
{
    private readonly IDynamoDocumentStore _store;
    private readonly IPlansRepository _plansRepository;
    private readonly ISubscriptionRepository _subscriptionRepository;
    private readonly DynamoDbSettings _dynamoSettings;
    private readonly RazorpaySettings _razorpaySettings;
    private readonly IHttpClientFactory _httpClientFactory;

    public PaymentsController(
        IDynamoDocumentStore store,
        IPlansRepository plansRepository,
        ISubscriptionRepository subscriptionRepository,
        IOptions<DynamoDbSettings> dynamoSettings,
        IOptions<RazorpaySettings> razorpaySettings,
        IHttpClientFactory httpClientFactory)
    {
        _store = store;
        _plansRepository = plansRepository;
        _subscriptionRepository = subscriptionRepository;
        _dynamoSettings = dynamoSettings.Value;
        _razorpaySettings = razorpaySettings.Value;
        _httpClientFactory = httpClientFactory;
    }

    [HttpGet("razorpay-config")]
    public IActionResult RazorpayConfig()
    {
        var keyId = string.IsNullOrWhiteSpace(_razorpaySettings.KeyId) ? "rzp_test_demo_key" : _razorpaySettings.KeyId;
        return Ok(new { keyId });
    }

    [HttpPost("payments/create-order")]
    public async Task<IActionResult> CreateOrder([FromBody] CreateOrderRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (string.IsNullOrWhiteSpace(userId)) return Unauthorized();

        var plan = await _plansRepository.GetPlanByIdAsync(request.PlanId, cancellationToken);
        if (plan is null) return NotFound(new { error = "Plan not found" });

        var amountPaise = request.Amount > 0 ? request.Amount : (plan.Price * 100);
        if (amountPaise <= 0)
        {
            return BadRequest(new { error = "Invalid amount" });
        }

        var receipt = $"trexa_{Guid.NewGuid():N}";
        var orderResponse = await CreateRazorpayOrderAsync((int)Math.Round(amountPaise), receipt, request.PlanId, userId, cancellationToken);
        if (!orderResponse.Success)
        {
            return StatusCode(StatusCodes.Status502BadGateway, new { error = orderResponse.Error });
        }

        var record = new PaymentRecord
        {
            UserId = userId,
            PlanId = plan.Id,
            OrderId = orderResponse.OrderId!,
            Amount = amountPaise,
            Currency = orderResponse.Currency ?? "INR",
            Status = "created",
            GatewayStatus = orderResponse.Status,
            CreatedAt = DateTime.UtcNow
        };

        await _store.UpsertAsync(_dynamoSettings.PaymentsTable, record, cancellationToken);

        return Ok(new
        {
            orderId = orderResponse.OrderId,
            amount = amountPaise,
            currency = record.Currency
        });
    }

    [HttpPost("payments/verify")]
    public async Task<IActionResult> Verify([FromBody] VerifyPaymentRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (string.IsNullOrWhiteSpace(userId)) return Unauthorized();

        if (string.IsNullOrWhiteSpace(request.RazorpayOrderId) ||
            string.IsNullOrWhiteSpace(request.RazorpayPaymentId) ||
            string.IsNullOrWhiteSpace(request.RazorpaySignature))
        {
            return BadRequest(new { error = "Missing Razorpay verification fields" });
        }

        var plan = await _plansRepository.GetPlanByIdAsync(request.PlanId, cancellationToken);
        if (plan is null) return NotFound(new { error = "Plan not found" });

        var payments = await _store.ScanAsync<PaymentRecord>(_dynamoSettings.PaymentsTable, cancellationToken);
        var payment = payments.FirstOrDefault(x => x.OrderId == request.RazorpayOrderId && x.UserId == userId);
        if (payment is null)
        {
            return NotFound(new { error = "Payment order not found" });
        }

        if (payment.Status == "paid")
        {
            var existing = await _subscriptionRepository.GetActiveByUserIdAsync(userId, cancellationToken);
            return Ok(new { message = "Payment already verified", subscription = existing });
        }

        if (!IsValidRazorpaySignature(request.RazorpayOrderId, request.RazorpayPaymentId, request.RazorpaySignature))
        {
            payment.Status = "failed";
            payment.FailureReason = "Signature verification failed";
            await _store.UpsertAsync(_dynamoSettings.PaymentsTable, payment, cancellationToken);
            return BadRequest(new { error = "Invalid payment signature" });
        }

        payment.PaymentId = request.RazorpayPaymentId;
        payment.Signature = request.RazorpaySignature;
        payment.Status = "paid";
        payment.VerifiedAt = DateTime.UtcNow;
        payment.GatewayStatus = "paid";
        await _store.UpsertAsync(_dynamoSettings.PaymentsTable, payment, cancellationToken);

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

        subscription = await _subscriptionRepository.CreateAsync(subscription, cancellationToken);

        return Ok(new { message = "Payment verified and subscription activated", subscription });
    }

    private async Task<CreateOrderGatewayResult> CreateRazorpayOrderAsync(
        int amountPaise,
        string receipt,
        string planId,
        string userId,
        CancellationToken cancellationToken)
    {
        if (!_razorpaySettings.EnableLiveApiCalls)
        {
            return new CreateOrderGatewayResult(true, $"order_{Guid.NewGuid():N}", "created", "INR", null);
        }

        if (string.IsNullOrWhiteSpace(_razorpaySettings.KeyId) || string.IsNullOrWhiteSpace(_razorpaySettings.KeySecret))
        {
            return new CreateOrderGatewayResult(false, null, null, null, "Razorpay keys are not configured");
        }

        var client = _httpClientFactory.CreateClient();
        client.BaseAddress = new Uri(_razorpaySettings.BaseUrl.TrimEnd('/'));
        var token = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{_razorpaySettings.KeyId}:{_razorpaySettings.KeySecret}"));
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", token);

        var payload = JsonSerializer.Serialize(new
        {
            amount = amountPaise,
            currency = "INR",
            receipt,
            notes = new { planId, userId }
        });

        using var content = new StringContent(payload, Encoding.UTF8, "application/json");
        using var response = await client.PostAsync("/v1/orders", content, cancellationToken);
        var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            return new CreateOrderGatewayResult(false, null, null, null, $"Razorpay order create failed: {(int)response.StatusCode} {responseBody}");
        }

        var order = JsonSerializer.Deserialize<RazorpayOrderResponse>(responseBody);
        if (order is null || string.IsNullOrWhiteSpace(order.Id))
        {
            return new CreateOrderGatewayResult(false, null, null, null, "Invalid Razorpay order response");
        }

        return new CreateOrderGatewayResult(true, order.Id, order.Status, order.Currency, null);
    }

    private bool IsValidRazorpaySignature(string orderId, string paymentId, string signature)
    {
        if (string.IsNullOrWhiteSpace(_razorpaySettings.KeySecret))
        {
            return false;
        }

        var payload = $"{orderId}|{paymentId}";
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(_razorpaySettings.KeySecret));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
        var expectedSignature = Convert.ToHexString(hash).ToLowerInvariant();

        var expectedBytes = Encoding.UTF8.GetBytes(expectedSignature);
        var actualBytes = Encoding.UTF8.GetBytes(signature.Trim().ToLowerInvariant());
        return CryptographicOperations.FixedTimeEquals(expectedBytes, actualBytes);
    }

    public sealed record CreateOrderRequest(string PlanId, decimal Amount);

    public sealed record VerifyPaymentRequest(
        [property: JsonPropertyName("razorpay_order_id")] string RazorpayOrderId,
        [property: JsonPropertyName("razorpay_payment_id")] string RazorpayPaymentId,
        [property: JsonPropertyName("razorpay_signature")] string RazorpaySignature,
        [property: JsonPropertyName("planId")] string PlanId);

    private sealed record RazorpayOrderResponse(
        [property: JsonPropertyName("id")] string Id,
        [property: JsonPropertyName("status")] string Status,
        [property: JsonPropertyName("currency")] string Currency);

    private sealed record CreateOrderGatewayResult(
        bool Success,
        string? OrderId,
        string? Status,
        string? Currency,
        string? Error);
}
