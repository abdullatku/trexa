using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Trexa.Api.Constants;
using Trexa.Api.Extensions;
using Trexa.Api.Models.Documents;
using Trexa.Api.Repositories.Interfaces;
using Trexa.Api.Services.Interfaces;
using Trexa.Api.Settings;

namespace Trexa.Api.Controllers;

[ApiController]
[Route(ApiRoutes.Prefix + "/integrations/calcom")]
public sealed class CalComIntegrationController : ControllerBase
{
    private readonly IUserRepository _users;
    private readonly IDynamoDocumentStore _store;
    private readonly ICalComOAuthService _oauth;
    private readonly CalComSettings _calSettings;
    private readonly DynamoDbSettings _dynamoSettings;

    public CalComIntegrationController(
        IUserRepository users,
        IDynamoDocumentStore store,
        ICalComOAuthService oauth,
        IOptions<CalComSettings> calSettings,
        IOptions<DynamoDbSettings> dynamoSettings)
    {
        _users = users;
        _store = store;
        _oauth = oauth;
        _calSettings = calSettings.Value;
        _dynamoSettings = dynamoSettings.Value;
    }

    [HttpGet("status")]
    [Authorize]
    public async Task<IActionResult> Status(CancellationToken cancellationToken)
    {
        var user = await CurrentInterviewerAsync(cancellationToken);
        if (user is null) return Forbid();
        return Ok(new
        {
            connected = !string.IsNullOrWhiteSpace(user.CalComAccessToken),
            connectedAt = user.CalComConnectedAt,
            eventTypeId = user.CalComEventTypeId,
            webhookConfigured = !string.IsNullOrWhiteSpace(user.CalComWebhookId)
        });
    }

    [HttpGet("connect")]
    [Authorize]
    public async Task<IActionResult> Connect(CancellationToken cancellationToken)
    {
        var user = await CurrentInterviewerAsync(cancellationToken);
        if (user is null) return Forbid();
        try { return Ok(new { authorizationUrl = _oauth.BuildAuthorizationUrl(user) }); }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
    }

    [HttpGet("callback")]
    [AllowAnonymous]
    public async Task<IActionResult> Callback([FromQuery] string? code, [FromQuery] string? state, [FromQuery] string? error, CancellationToken cancellationToken)
    {
        var frontend = _calSettings.FrontendSettingsUrl;
        if (!string.IsNullOrWhiteSpace(error))
            return Redirect($"{frontend}?calcom=error&message={Uri.EscapeDataString(error)}");
        if (string.IsNullOrWhiteSpace(code) || string.IsNullOrWhiteSpace(state))
            return Redirect($"{frontend}?calcom=error&message=missing_authorization_response");
        try
        {
            await _oauth.CompleteAuthorizationAsync(code, state, cancellationToken);
            return Redirect($"{frontend}?calcom=connected");
        }
        catch (InvalidOperationException ex)
        {
            return Redirect($"{frontend}?calcom=error&message={Uri.EscapeDataString(ex.Message)}");
        }
    }

    [HttpPut("settings")]
    [Authorize]
    public async Task<IActionResult> UpdateSettings([FromBody] CalComIntegrationSettings request, CancellationToken cancellationToken)
    {
        var user = await CurrentInterviewerAsync(cancellationToken);
        if (user is null) return Forbid();
        if (request.EventTypeId <= 0) return BadRequest(new { error = "A valid Cal.com event type ID is required." });
        user.CalComEventTypeId = request.EventTypeId;
        user.UpdatedAt = DateTime.UtcNow;
        await _users.UpdateAsync(user, cancellationToken);
        return Ok(new { message = "Cal.com event type saved.", eventTypeId = user.CalComEventTypeId });
    }

    [HttpDelete]
    [Authorize]
    public async Task<IActionResult> Disconnect(CancellationToken cancellationToken)
    {
        var user = await CurrentInterviewerAsync(cancellationToken);
        if (user is null) return Forbid();
        await _oauth.DisconnectAsync(user, cancellationToken);
        return Ok(new { message = "Cal.com account disconnected." });
    }

    [HttpPost("webhook/{userId:guid}")]
    [AllowAnonymous]
    public async Task<IActionResult> Webhook(Guid userId, CancellationToken cancellationToken)
    {
        var user = await _users.GetByIdAsync(userId, cancellationToken);
        if (user is null || string.IsNullOrWhiteSpace(user.CalComWebhookSecret)) return Unauthorized();

        using var reader = new StreamReader(Request.Body, Encoding.UTF8);
        var body = await reader.ReadToEndAsync(cancellationToken);
        if (!Request.Headers.TryGetValue("X-Cal-Signature-256", out var signature) ||
            !VerifySignature(body, signature.ToString(), _oauth.Unprotect(user.CalComWebhookSecret)))
            return Unauthorized();

        using var document = JsonDocument.Parse(body);
        var root = document.RootElement;
        var trigger = GetString(root, "triggerEvent") ?? string.Empty;
        var payload = root.TryGetProperty("payload", out var wrapped) ? wrapped : root;
        var interviewId = FindMetadataValue(payload, "interviewId");
        var bookingUid = GetString(payload, "uid") ?? GetString(payload, "bookingUid");
        if (string.IsNullOrWhiteSpace(interviewId)) return Ok();

        var interview = await _store.GetByIdAsync<Interview>(_dynamoSettings.InterviewsTable, interviewId, cancellationToken);
        if (interview is null || interview.InterviewerId != userId.ToString()) return Ok();

        if (!string.IsNullOrWhiteSpace(bookingUid)) interview.VideoMeetingId = bookingUid;
        switch (trigger)
        {
            case "BOOKING_CANCELLED": interview.Status = "cancelled"; break;
            case "BOOKING_RESCHEDULED":
                interview.ScheduledDate = GetString(payload, "startTime") ?? GetString(payload, "start") ?? interview.ScheduledDate;
                interview.Status = "scheduled";
                break;
            case "MEETING_STARTED":
                interview.MeetingStartedAt ??= DateTime.UtcNow;
                interview.Status = "in_progress";
                break;
            case "MEETING_ENDED": interview.Status = "completed"; break;
            case "RECORDING_READY": interview.RecordingStatus = "available"; break;
        }
        await _store.UpsertAsync(_dynamoSettings.InterviewsTable, interview, cancellationToken);
        return Ok();
    }

    private async Task<Trexa.Api.Models.Identity.ApplicationUser?> CurrentInterviewerAsync(CancellationToken cancellationToken)
    {
        if (User.GetRole() != "interviewer" || !Guid.TryParse(User.GetUserId(), out var id)) return null;
        return await _users.GetByIdAsync(id, cancellationToken);
    }

    private static bool VerifySignature(string body, string signature, string secret)
    {
        var expected = HMACSHA256.HashData(Encoding.UTF8.GetBytes(secret), Encoding.UTF8.GetBytes(body));
        try { return CryptographicOperations.FixedTimeEquals(expected, Convert.FromHexString(signature)); }
        catch (FormatException) { return false; }
    }

    private static string? GetString(JsonElement element, string name) =>
        element.ValueKind == JsonValueKind.Object && element.TryGetProperty(name, out var value) && value.ValueKind == JsonValueKind.String
            ? value.GetString() : null;

    private static string? FindMetadataValue(JsonElement element, string name)
    {
        if (element.ValueKind == JsonValueKind.Object)
        {
            if (element.TryGetProperty("metadata", out var metadata) && metadata.ValueKind == JsonValueKind.Object &&
                metadata.TryGetProperty(name, out var value)) return value.ToString();
            foreach (var property in element.EnumerateObject())
            {
                var found = FindMetadataValue(property.Value, name);
                if (found is not null) return found;
            }
        }
        else if (element.ValueKind == JsonValueKind.Array)
            foreach (var item in element.EnumerateArray())
            {
                var found = FindMetadataValue(item, name);
                if (found is not null) return found;
            }
        return null;
    }
}

public sealed record CalComIntegrationSettings(int EventTypeId);
