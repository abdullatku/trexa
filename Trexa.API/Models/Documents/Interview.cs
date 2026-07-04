namespace Trexa.Api.Models.Documents;

public sealed class Interview
{    public string Id { get; set; } = Guid.NewGuid().ToString("N");

    public string StudentId { get; set; } = string.Empty;
    public string DesignationId { get; set; } = string.Empty;
    public string? InterviewerId { get; set; }
    public string ScheduledDate { get; set; } = "pending";
    public string Status { get; set; } = "pending";
    public string? Notes { get; set; }
    public Dictionary<string, object>? Feedback { get; set; }
    public Dictionary<string, object>? StudentFeedback { get; set; }
    public string? Timezone { get; set; }
    public string? MeetingProvider { get; set; }
    public string? MeetingJoinUrl { get; set; }
    public string? MeetingStartUrl { get; set; }
    public string? VideoMeetingId { get; set; }
    public string? MeetingPassword { get; set; }
    public string? ZoomJoinUrl { get; set; }
    public string? ZoomStartUrl { get; set; }
    public string? ZoomMeetingId { get; set; }
    public string? ZoomPassword { get; set; }
    public DateTime? MeetingStartedAt { get; set; }
    public string? RecordingUrl { get; set; }
    public string? RecordingStorageKey { get; set; }
    public string? RecordingProviderId { get; set; }
    public string? RecordingStatus { get; set; }
    public DateTime? RecordingSyncedAt { get; set; }
    public bool AcceptedByInterviewer { get; set; }
    public string? Skill { get; set; }
    public string? Level { get; set; }
    public string? InterviewLevel { get; set; }
    public string? CvUrl { get; set; }
    public int RescheduleCount { get; set; }
    public string? RescheduleReason { get; set; }
    public string? CompanyLevel { get; set; }
    public string? PreferredCompany { get; set; }
    public decimal? InterviewerFee { get; set; }
    public bool InterviewerPaymentReleased { get; set; }
    public DateTime? InterviewerPaymentReleasedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
