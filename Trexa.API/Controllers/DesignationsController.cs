using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Trexa.Api.Constants;
using Trexa.Api.Extensions;
using Trexa.Api.Models.Documents;
using Trexa.Api.Repositories.Interfaces;
using Trexa.Api.Settings;

namespace Trexa.Api.Controllers;

[ApiController]
[Route(ApiRoutes.Prefix)]
[Authorize]
public sealed class DesignationsController : ControllerBase
{
    private readonly IDynamoDocumentStore _store;
    private readonly DynamoDbSettings _settings;

    public DesignationsController(IDynamoDocumentStore store, IOptions<DynamoDbSettings> settings)
    {
        _store = store;
        _settings = settings.Value;
    }

    [HttpGet("designations")]
    public async Task<IActionResult> GetDesignations(CancellationToken cancellationToken)
    {
        var designations = await _store.ScanAsync<Designation>(_settings.DesignationsTable, cancellationToken);
        return Ok(new { designations = designations.OrderBy(x => x.Name).ToList() });
    }

    [HttpPost("designations/request")]
    public async Task<IActionResult> RequestDesignation([FromBody] Designation requestBody, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(requestBody.Name))
        {
            return BadRequest(new { error = "Designation name is required" });
        }

        var userId = User.GetUserId();
        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized();
        }

        var request = new DesignationRequest
        {
            UserId = userId,
            Name = requestBody.Name.Trim(),
            Description = requestBody.Description?.Trim() ?? string.Empty,
            CreatedAt = DateTime.UtcNow
        };

        await _store.UpsertAsync(_settings.DesignationRequestsTable, request, cancellationToken);
        return Ok(new { message = "Designation request submitted successfully" });
    }

    [HttpPost("admin/designations")]
    public async Task<IActionResult> CreateDesignation([FromBody] Designation requestBody, CancellationToken cancellationToken)
    {
        if (User.GetRole() != "admin")
        {
            return Forbid();
        }

        if (string.IsNullOrWhiteSpace(requestBody.Name))
        {
            return BadRequest(new { error = "Designation name is required" });
        }

        var all = await _store.ScanAsync<Designation>(_settings.DesignationsTable, cancellationToken);
        var exists = all.Any(x => string.Equals(x.Name, requestBody.Name.Trim(), StringComparison.OrdinalIgnoreCase));
        if (exists)
        {
            return BadRequest(new { error = "Designation already exists" });
        }

        var designation = new Designation
        {
            Name = requestBody.Name.Trim(),
            Description = requestBody.Description?.Trim() ?? string.Empty,
            CreatedAt = DateTime.UtcNow
        };

        await _store.UpsertAsync(_settings.DesignationsTable, designation, cancellationToken);
        return Ok(new { message = "Designation created successfully", designation });
    }
}
