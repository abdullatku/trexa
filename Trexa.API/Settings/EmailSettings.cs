namespace Trexa.Api.Settings;

public sealed class EmailSettings
{
    public bool Enabled { get; set; }
    public string Provider { get; set; } = "SES";

    // SMTP fallback settings
    public string Host { get; set; } = string.Empty;
    public int Port { get; set; } = 587;
    public bool UseSsl { get; set; } = true;
    public string UserName { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;

    // SES settings
    public string SesRegion { get; set; } = "ap-south-1";
    public string SesAccessKey { get; set; } = string.Empty;
    public string SesSecretKey { get; set; } = string.Empty;
    public string SesSessionToken { get; set; } = string.Empty;

    public string FromEmail { get; set; } = string.Empty;
    public string FromName { get; set; } = "Trexa";
    public string VerificationBaseUrl { get; set; } = "http://localhost:5264";
}
