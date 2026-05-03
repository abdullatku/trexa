namespace Trexa.Api.Settings;

public sealed class RazorpaySettings
{
    public string KeyId { get; set; } = string.Empty;
    public string KeySecret { get; set; } = string.Empty;
    public string BaseUrl { get; set; } = "https://api.razorpay.com";
    public bool EnableLiveApiCalls { get; set; } = true;
}
