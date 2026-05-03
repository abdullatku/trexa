using Microsoft.AspNetCore.Mvc;
using Trexa.Api.Constants;

namespace Trexa.Api.Controllers;

[ApiController]
[Route(ApiRoutes.Prefix)]
public sealed class HealthController : ControllerBase
{
    [HttpGet("health")]
    public IActionResult GetHealth()
    {
        return Ok(new
        {
            status = "ok",
            timestamp = DateTime.UtcNow,
            environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Production",
            version = "1.0.0",
            service = "Trexa.Api"
        });
    }

    [HttpGet("ping")]
    public IActionResult Ping()
    {
        return Ok(new { message = "pong", timestamp = DateTime.UtcNow });
    }
}
