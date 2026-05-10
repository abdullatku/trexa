namespace Trexa.Api.Settings;

public sealed class OAuthSettings
{
    public string FrontendCallbackUrl { get; set; } = "http://localhost:3000/auth/callback";
    public OAuthProviderSettings Google { get; set; } = new();
}

public sealed class OAuthProviderSettings
{
    public string ClientId { get; set; } = string.Empty;
    public string ClientSecret { get; set; } = string.Empty;
}
