namespace Trexa.Api.Settings;

public sealed class JwtSettings
{
    public string Issuer { get; set; } = "Trexa.Api";
    public string Audience { get; set; } = "Trexa.Web";
    public string Key { get; set; } = "change-this-super-long-dev-key-at-least-32-chars";
    public int ExpiryDays { get; set; } = 7;
}
