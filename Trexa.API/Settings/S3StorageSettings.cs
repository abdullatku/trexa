namespace Trexa.Api.Settings;

public sealed class S3StorageSettings
{
    public string Region { get; set; } = "ap-south-1";
    public string BucketName { get; set; } = string.Empty;
    public string KeyPrefix { get; set; } = "uploads";
    public string AccessKey { get; set; } = string.Empty;
    public string SecretKey { get; set; } = string.Empty;
    public string SessionToken { get; set; } = string.Empty;
    public int PresignedUrlMinutes { get; set; } = 15;
}
