namespace Trexa.Api.Settings;

public sealed class CalComSettings
{
    public string ApiBaseUrl { get; set; } = "https://api.cal.com";
    public string AppBaseUrl { get; set; } = "https://app.cal.com";
    public string ApiVersion { get; set; } = "2026-02-25";
    public string OAuthClientId { get; set; } = string.Empty;
    public string OAuthClientSecret { get; set; } = string.Empty;
    public string OAuthRedirectUrl { get; set; } = string.Empty;
    public string FrontendSettingsUrl { get; set; } = "http://localhost:3000/interviewer/profile";
    public string WebhookUrl { get; set; } = string.Empty;
    public string OAuthScopes { get; set; } = "BOOKING_READ BOOKING_WRITE WEBHOOK_READ WEBHOOK_WRITE";
    public string Timezone { get; set; } = "Asia/Kolkata";
    public int DefaultDurationMinutes { get; set; } = 60;
    public bool UseDefaultDurationMinutes { get; set; }
    public bool AddInterviewerAsGuest { get; set; }
    public bool AllowConflicts { get; set; } = true;
    public bool AllowBookingOutOfBounds { get; set; } = true;
}
