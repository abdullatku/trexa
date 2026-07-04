namespace Trexa.Api.Settings;

public sealed class CalComSettings
{
    public string ApiBaseUrl { get; set; } = "https://api.cal.com";
    public string ApiVersion { get; set; } = "2026-02-25";
    public string ApiKey { get; set; } = string.Empty;
    public int? EventTypeId { get; set; }
    public string EventTypeSlug { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string TeamSlug { get; set; } = string.Empty;
    public string OrganizationSlug { get; set; } = string.Empty;
    public string Timezone { get; set; } = "Asia/Kolkata";
    public int DefaultDurationMinutes { get; set; } = 60;
    public bool UseDefaultDurationMinutes { get; set; }
    public bool AddInterviewerAsGuest { get; set; }
    public bool AllowConflicts { get; set; } = true;
    public bool AllowBookingOutOfBounds { get; set; } = true;
}
