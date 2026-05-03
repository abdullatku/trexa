using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Trexa.Api.Constants;

namespace Trexa.Api.Controllers;

[ApiController]
[Route(ApiRoutes.Prefix)]
[Authorize]
public sealed class FilesController : ControllerBase
{
    [HttpPost("upload-cv")]
    [RequestSizeLimit(5 * 1024 * 1024)]
    public async Task<IActionResult> UploadCv([FromForm] IFormFile? cv, CancellationToken cancellationToken)
    {
        if (cv is null || cv.Length == 0)
        {
            return BadRequest(new { error = "No file uploaded" });
        }

        var allowed = new[]
        {
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        };

        if (!allowed.Contains(cv.ContentType, StringComparer.OrdinalIgnoreCase))
        {
            return BadRequest(new { error = "Invalid file type" });
        }

        var uploads = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads");
        Directory.CreateDirectory(uploads);

        var safeName = $"{Guid.NewGuid():N}_{Path.GetFileName(cv.FileName)}";
        var fullPath = Path.Combine(uploads, safeName);

        await using (var stream = System.IO.File.Create(fullPath))
        {
            await cv.CopyToAsync(stream, cancellationToken);
        }

        var cvUrl = $"/uploads/{safeName}";
        return Ok(new { cvUrl });
    }
}
