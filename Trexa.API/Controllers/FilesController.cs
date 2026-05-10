using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Amazon.S3;
using Amazon.S3.Model;
using Trexa.Api.Constants;
using Trexa.Api.Settings;

namespace Trexa.Api.Controllers;

[ApiController]
[Route(ApiRoutes.Prefix)]
[Authorize]
public sealed class FilesController : ControllerBase
{
    private static readonly HashSet<string> AllowedContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    };

    private readonly IAmazonS3 _s3Client;
    private readonly S3StorageSettings _settings;

    public FilesController(IAmazonS3 s3Client, IOptions<S3StorageSettings> settings)
    {
        _s3Client = s3Client;
        _settings = settings.Value;
    }

    [HttpPost("upload-cv")]
    [RequestSizeLimit(5 * 1024 * 1024)]
    public async Task<IActionResult> UploadCv([FromForm] IFormFile? cv, CancellationToken cancellationToken)
    {
        if (cv is null || cv.Length == 0)
        {
            return BadRequest(new { error = "No file uploaded" });
        }

        if (!AllowedContentTypes.Contains(cv.ContentType))
        {
            return BadRequest(new { error = "Invalid file type" });
        }

        if (string.IsNullOrWhiteSpace(_settings.BucketName))
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new { error = "S3 bucket is not configured" });
        }

        var safeName = $"{Guid.NewGuid():N}_{Path.GetFileName(cv.FileName)}";
        var key = BuildObjectKey(safeName);

        await using (var stream = cv.OpenReadStream())
        {
            var request = new PutObjectRequest
            {
                BucketName = _settings.BucketName,
                Key = key,
                InputStream = stream,
                ContentType = cv.ContentType,
                AutoCloseStream = false,
                Metadata =
                {
                    ["original-file-name"] = Path.GetFileName(cv.FileName)
                }
            };

            await _s3Client.PutObjectAsync(request, cancellationToken);
        }

        var cvUrl = Url.ActionLink(
            action: nameof(GetUploadedFile),
            controller: "Files",
            values: new { key },
            protocol: Request.Scheme,
            host: Request.Host.ToString());

        return Ok(new { cvUrl });
    }

    [HttpGet("files/{**key}")]
    [AllowAnonymous]
    public IActionResult GetUploadedFile(string key)
    {
        if (string.IsNullOrWhiteSpace(_settings.BucketName))
        {
            return NotFound();
        }

        if (string.IsNullOrWhiteSpace(key) || !IsAllowedKey(key))
        {
            return NotFound();
        }

        var expiresInMinutes = _settings.PresignedUrlMinutes <= 0 ? 15 : _settings.PresignedUrlMinutes;
        var request = new GetPreSignedUrlRequest
        {
            BucketName = _settings.BucketName,
            Key = key,
            Verb = HttpVerb.GET,
            Expires = DateTime.UtcNow.AddMinutes(expiresInMinutes)
        };

        var url = _s3Client.GetPreSignedURL(request);
        return Redirect(url);
    }

    private string BuildObjectKey(string fileName)
    {
        var prefix = (_settings.KeyPrefix ?? string.Empty).Trim('/');
        return string.IsNullOrWhiteSpace(prefix)
            ? $"cvs/{fileName}"
            : $"{prefix}/cvs/{fileName}";
    }

    private bool IsAllowedKey(string key)
    {
        var normalizedKey = key.TrimStart('/');
        var prefix = (_settings.KeyPrefix ?? string.Empty).Trim('/');
        var expectedPrefix = string.IsNullOrWhiteSpace(prefix) ? "cvs/" : $"{prefix}/cvs/";
        return normalizedKey.StartsWith(expectedPrefix, StringComparison.Ordinal) &&
               !normalizedKey.Contains("..", StringComparison.Ordinal);
    }
}
