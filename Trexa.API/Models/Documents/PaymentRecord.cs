namespace Trexa.Api.Models.Documents;

public sealed class PaymentRecord
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");

    public string UserId { get; set; } = string.Empty;
    public string PlanId { get; set; } = string.Empty;
    public string OrderId { get; set; } = string.Empty;
    public string? PaymentId { get; set; }
    public string? Signature { get; set; }
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "INR";
    public string Status { get; set; } = "created";
    public string? GatewayStatus { get; set; }
    public string? FailureReason { get; set; }
    public DateTime? VerifiedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
