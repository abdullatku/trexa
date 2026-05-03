namespace Trexa.Api.Models.Documents;

public sealed class Subscription
{    public string Id { get; set; } = Guid.NewGuid().ToString("N");

    public string UserId { get; set; } = string.Empty;
    public string PlanId { get; set; } = string.Empty;
    public string Status { get; set; } = "active";
    public int InterviewsRemaining { get; set; }
    public DateTime StartDate { get; set; } = DateTime.UtcNow;
    public DateTime EndDate { get; set; } = DateTime.UtcNow.AddMonths(1);
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
