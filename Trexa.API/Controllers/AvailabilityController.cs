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
public sealed class AvailabilityController : ControllerBase
{
    private readonly IDynamoDocumentStore _store;
    private readonly DynamoDbSettings _settings;

    public AvailabilityController(IDynamoDocumentStore store, IOptions<DynamoDbSettings> settings)
    {
        _store = store;
        _settings = settings.Value;
    }

    [HttpGet("availability/{interviewerId}")]
    public async Task<IActionResult> GetAvailability(string interviewerId, CancellationToken cancellationToken)
    {
        var availability = await _store.ScanAsync<AvailabilitySlot>(_settings.AvailabilityTable, cancellationToken);
        var filtered = availability
            .Where(x => x.InterviewerId == interviewerId)
            .OrderBy(x => x.DayOfWeek)
            .ThenBy(x => x.StartTime)
            .ToList();

        return Ok(new { availability = filtered });
    }

    [HttpPost("availability")]
    public async Task<IActionResult> AddAvailability([FromBody] AvailabilitySlot requestBody, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized();
        }

        if (requestBody.DayOfWeek is < 0 or > 6 || string.IsNullOrWhiteSpace(requestBody.StartTime) || string.IsNullOrWhiteSpace(requestBody.EndTime))
        {
            return BadRequest(new { error = "Invalid availability payload" });
        }

        var slot = new AvailabilitySlot
        {
            InterviewerId = userId,
            DayOfWeek = requestBody.DayOfWeek,
            StartTime = requestBody.StartTime,
            EndTime = requestBody.EndTime,
            Timezone = string.IsNullOrWhiteSpace(requestBody.Timezone) ? "Asia/Kolkata" : requestBody.Timezone,
            CreatedAt = DateTime.UtcNow
        };

        await _store.UpsertAsync(_settings.AvailabilityTable, slot, cancellationToken);
        return Ok(new { message = "Availability added successfully", availability = slot });
    }

    [HttpDelete("availability/{id}")]
    public async Task<IActionResult> DeleteAvailability(string id, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized();
        }

        var role = User.GetRole();
        var existing = await _store.GetByIdAsync<AvailabilitySlot>(_settings.AvailabilityTable, id, cancellationToken);
        if (existing is null)
        {
            return NotFound(new { error = "Availability not found" });
        }

        if (role != "admin" && existing.InterviewerId != userId)
        {
            return NotFound(new { error = "Availability not found" });
        }

        await _store.DeleteByIdAsync(_settings.AvailabilityTable, id, cancellationToken);
        return Ok(new { message = "Availability deleted successfully" });
    }

    [HttpGet("available-slots")]
    public async Task<IActionResult> GetAvailableSlots([FromQuery] string interviewerId, [FromQuery] string date, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(interviewerId) || string.IsNullOrWhiteSpace(date))
        {
            return BadRequest(new { error = "interviewerId and date are required" });
        }

        var interviews = await _store.ScanAsync<Interview>(_settings.InterviewsTable, cancellationToken);
        var booked = interviews
            .Where(x =>
                x.InterviewerId == interviewerId &&
                x.ScheduledDate != "pending" &&
                (x.Status == "scheduled" || x.Status == "accepted" || x.Status == "reschedule_requested") &&
                x.ScheduledDate.StartsWith(date, StringComparison.Ordinal))
            .Select(x => x.ScheduledDate)
            .ToList();

        return Ok(new { bookedSlots = booked });
    }
}
