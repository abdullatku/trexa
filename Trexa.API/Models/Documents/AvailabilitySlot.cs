namespace Trexa.Api.Models.Documents;

public sealed class AvailabilitySlot
{    public string Id { get; set; } = Guid.NewGuid().ToString("N");

    public string InterviewerId { get; set; } = string.Empty;
    public int DayOfWeek { get; set; }
    public string StartTime { get; set; } = "09:00";
    public string EndTime { get; set; } = "17:00";
    public string Timezone { get; set; } = "Asia/Kolkata";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
