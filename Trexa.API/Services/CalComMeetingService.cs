using System.Globalization;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Amazon.S3;
using Amazon.S3.Model;
using Microsoft.Extensions.Options;
using Trexa.Api.Models.Documents;
using Trexa.Api.Models.Identity;
using Trexa.Api.Repositories.Interfaces;
using Trexa.Api.Services.Interfaces;
using Trexa.Api.Settings;

namespace Trexa.Api.Services;

public sealed class CalComMeetingService : IVideoConferenceService
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IUserRepository _userRepository;
    private readonly IAmazonS3 _s3Client;
    private readonly CalComSettings _settings;
    private readonly S3StorageSettings _s3Settings;

    public CalComMeetingService(
        IHttpClientFactory httpClientFactory,
        IUserRepository userRepository,
        IAmazonS3 s3Client,
        IOptions<CalComSettings> settings,
        IOptions<S3StorageSettings> s3Settings)
    {
        _httpClientFactory = httpClientFactory;
        _userRepository = userRepository;
        _s3Client = s3Client;
        _settings = settings.Value;
        _s3Settings = s3Settings.Value;
    }

    public async Task<VideoMeetingResult> CreateMeetingAsync(Interview interview, CancellationToken cancellationToken = default)
    {
        ValidateSettings();

        var start = ParseScheduledDate(interview.ScheduledDate);
        var student = await GetUserAsync(interview.StudentId, cancellationToken);
        var interviewer = await GetUserAsync(interview.InterviewerId, cancellationToken);

        var requestBody = BuildBookingRequest(interview, start, student, interviewer);
        var requestJson = JsonSerializer.Serialize(requestBody, JsonOptions);
        using var request = new HttpRequestMessage(HttpMethod.Post, $"{_settings.ApiBaseUrl.TrimEnd('/')}/v2/bookings")
        {
            Content = new StringContent(requestJson, Encoding.UTF8, "application/json")
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _settings.ApiKey.Trim());
        request.Headers.Add("cal-api-version", _settings.ApiVersion.Trim());

        var client = _httpClientFactory.CreateClient();
        using var response = await client.SendAsync(request, cancellationToken);
        var body = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException($"Cal.com booking creation failed with status {(int)response.StatusCode}: {body}. Request: {BuildSafeRequestSummary(requestBody)}");
        }

        var booking = JsonSerializer.Deserialize<CalComBookingResponse>(body, JsonOptions);
        var bookingData = booking?.Data;
        if (!string.Equals(booking?.Status, "success", StringComparison.OrdinalIgnoreCase) || bookingData is null)
        {
            throw new InvalidOperationException($"Cal.com returned an invalid booking response: {body}");
        }

        var joinUrl = FirstNonEmpty(bookingData.MeetingUrl, bookingData.Location);
        if (string.IsNullOrWhiteSpace(joinUrl))
        {
            throw new InvalidOperationException("Cal.com booking did not include a meeting URL. Make sure the Cal.com event type uses Cal Video or another conferencing location.");
        }

        var meetingId = FirstNonEmpty(bookingData.Uid, bookingData.Id?.ToString(CultureInfo.InvariantCulture)) ?? interview.Id;
        return new VideoMeetingResult(meetingId, joinUrl, joinUrl, null);
    }

    public async Task<VideoRecordingSyncResult> SyncRecordingAsync(Interview interview, CancellationToken cancellationToken = default)
    {
        ValidateSettings();

        if (!string.IsNullOrWhiteSpace(interview.RecordingStorageKey))
        {
            return new VideoRecordingSyncResult(true, "already_saved", interview.RecordingStorageKey, interview.RecordingProviderId);
        }

        var bookingUid = FirstNonEmpty(interview.VideoMeetingId, interview.ZoomMeetingId);
        if (string.IsNullOrWhiteSpace(bookingUid))
        {
            return new VideoRecordingSyncResult(false, "missing_booking_uid");
        }

        using var request = new HttpRequestMessage(
            HttpMethod.Get,
            $"{_settings.ApiBaseUrl.TrimEnd('/')}/v2/bookings/{Uri.EscapeDataString(bookingUid)}/recordings");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _settings.ApiKey.Trim());
        request.Headers.Add("cal-api-version", _settings.ApiVersion.Trim());

        var client = _httpClientFactory.CreateClient();
        using var response = await client.SendAsync(request, cancellationToken);
        var body = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException($"Cal.com recording lookup failed with status {(int)response.StatusCode}: {body}");
        }

        var recordings = JsonSerializer.Deserialize<CalComRecordingsResponse>(body, JsonOptions);
        var latestCompleted = recordings?.Data?
            .Where(recording => string.Equals(recording.Status, "completed", StringComparison.OrdinalIgnoreCase))
            .Where(recording => !string.IsNullOrWhiteSpace(recording.DownloadLink))
            .OrderByDescending(recording => recording.StartTs ?? 0)
            .FirstOrDefault();

        if (latestCompleted is null)
        {
            var status = recordings?.Data?.FirstOrDefault()?.Status;
            return new VideoRecordingSyncResult(false, string.IsNullOrWhiteSpace(status) ? "not_available" : status);
        }

        if (string.IsNullOrWhiteSpace(_s3Settings.BucketName))
        {
            throw new InvalidOperationException("S3 bucket is required before saving interview recordings.");
        }

        var providerRecordingId = FirstNonEmpty(latestCompleted.Id, latestCompleted.RoomName, Guid.NewGuid().ToString("N"))!;
        var key = BuildRecordingObjectKey(interview.Id, providerRecordingId);
        await UploadRecordingToS3Async(latestCompleted.DownloadLink!, key, providerRecordingId, cancellationToken);

        return new VideoRecordingSyncResult(true, "saved", key, providerRecordingId);
    }

    private Dictionary<string, object?> BuildBookingRequest(Interview interview, DateTimeOffset start, ApplicationUser? student, ApplicationUser? interviewer)
    {
        var attendeeName = FirstNonEmpty(student?.Name, student?.Email, "Trexa Student")!;
        var attendeeEmail = student?.Email;
        if (string.IsNullOrWhiteSpace(attendeeEmail))
        {
            throw new InvalidOperationException("The interview student must have an email address before creating a Cal.com booking.");
        }

        var payload = new Dictionary<string, object?>
        {
            ["start"] = start.UtcDateTime.ToString("O", CultureInfo.InvariantCulture),
            ["attendee"] = new
            {
                name = attendeeName,
                email = attendeeEmail,
                timeZone = FirstNonEmpty(interview.Timezone, _settings.Timezone)
            },
            ["allowConflicts"] = _settings.AllowConflicts,
            ["allowBookingOutOfBounds"] = _settings.AllowBookingOutOfBounds,
            ["metadata"] = new Dictionary<string, string>
            {
                ["interviewId"] = interview.Id,
                ["studentId"] = interview.StudentId,
                ["interviewerId"] = interview.InterviewerId ?? string.Empty,
                ["provider"] = "cal.com"
            }
        };

        if (_settings.UseDefaultDurationMinutes)
        {
            payload["lengthInMinutes"] = _settings.DefaultDurationMinutes;
        }

        if (_settings.EventTypeId.HasValue)
        {
            payload["eventTypeId"] = _settings.EventTypeId.Value;
        }
        else
        {
            payload["eventTypeSlug"] = _settings.EventTypeSlug.Trim();
            if (!string.IsNullOrWhiteSpace(_settings.Username))
            {
                payload["username"] = _settings.Username.Trim();
            }
            if (!string.IsNullOrWhiteSpace(_settings.TeamSlug))
            {
                payload["teamSlug"] = _settings.TeamSlug.Trim();
            }
            if (!string.IsNullOrWhiteSpace(_settings.OrganizationSlug))
            {
                payload["organizationSlug"] = _settings.OrganizationSlug.Trim();
            }
        }

        if (_settings.AddInterviewerAsGuest &&
            !string.IsNullOrWhiteSpace(interviewer?.Email) &&
            !string.Equals(interviewer.Email, attendeeEmail, StringComparison.OrdinalIgnoreCase))
        {
            payload["guests"] = new[] { interviewer.Email };
        }

        return payload;
    }

    private async Task<ApplicationUser?> GetUserAsync(string? userId, CancellationToken cancellationToken)
    {
        return Guid.TryParse(userId, out var id)
            ? await _userRepository.GetByIdAsync(id, cancellationToken)
            : null;
    }

    private static DateTimeOffset ParseScheduledDate(string scheduledDate)
    {
        if (string.IsNullOrWhiteSpace(scheduledDate) ||
            scheduledDate.Equals("pending", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Schedule the interview before creating a Cal.com booking.");
        }

        if (DateTimeOffset.TryParse(scheduledDate, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var parsed))
        {
            var start = parsed.ToUniversalTime();
            if (start <= DateTimeOffset.UtcNow)
            {
                throw new InvalidOperationException($"Interview scheduled date must be in the future before creating a Cal.com booking. Current scheduled UTC time is {start:O}.");
            }

            return start;
        }

        throw new InvalidOperationException("Interview scheduled date must be a valid date-time before creating a Cal.com booking.");
    }

    private void ValidateSettings()
    {
        if (string.IsNullOrWhiteSpace(_settings.ApiKey))
        {
            throw new InvalidOperationException("Cal.com API key is required. Configure CalCom:ApiKey.");
        }

        if (string.IsNullOrWhiteSpace(_settings.ApiVersion))
        {
            throw new InvalidOperationException("Cal.com API version is required. Configure CalCom:ApiVersion.");
        }

        if (!_settings.EventTypeId.HasValue)
        {
            var hasUserEventType = !string.IsNullOrWhiteSpace(_settings.EventTypeSlug) &&
                                   !string.IsNullOrWhiteSpace(_settings.Username);
            var hasTeamEventType = !string.IsNullOrWhiteSpace(_settings.EventTypeSlug) &&
                                   !string.IsNullOrWhiteSpace(_settings.TeamSlug);

            if (!hasUserEventType && !hasTeamEventType)
            {
                throw new InvalidOperationException("Configure CalCom:EventTypeId, or CalCom:EventTypeSlug with CalCom:Username or CalCom:TeamSlug.");
            }
        }
    }

    private static string? FirstNonEmpty(params string?[] values)
    {
        return values.FirstOrDefault(value => !string.IsNullOrWhiteSpace(value))?.Trim();
    }

    private static string BuildSafeRequestSummary(IReadOnlyDictionary<string, object?> payload)
    {
        var summary = new Dictionary<string, object?>();
        foreach (var (key, value) in payload)
        {
            summary[key] = key switch
            {
                "attendee" => "redacted",
                "guests" => "redacted",
                "metadata" => "redacted",
                _ => value
            };
        }

        return JsonSerializer.Serialize(summary, JsonOptions);
    }

    private async Task UploadRecordingToS3Async(string downloadUrl, string key, string providerRecordingId, CancellationToken cancellationToken)
    {
        var client = _httpClientFactory.CreateClient();
        using var downloadRequest = new HttpRequestMessage(HttpMethod.Get, downloadUrl);
        using var downloadResponse = await client.SendAsync(downloadRequest, HttpCompletionOption.ResponseHeadersRead, cancellationToken);

        if (!downloadResponse.IsSuccessStatusCode)
        {
            var body = await downloadResponse.Content.ReadAsStringAsync(cancellationToken);
            throw new InvalidOperationException($"Cal.com recording download failed with status {(int)downloadResponse.StatusCode}: {body}");
        }

        await using var stream = await downloadResponse.Content.ReadAsStreamAsync(cancellationToken);
        var putRequest = new PutObjectRequest
        {
            BucketName = _s3Settings.BucketName,
            Key = key,
            InputStream = stream,
            ContentType = downloadResponse.Content.Headers.ContentType?.MediaType ?? "video/mp4",
            AutoCloseStream = false,
            Metadata =
            {
                ["provider"] = "cal.com",
                ["provider-recording-id"] = providerRecordingId
            }
        };

        await _s3Client.PutObjectAsync(putRequest, cancellationToken);
    }

    private string BuildRecordingObjectKey(string interviewId, string providerRecordingId)
    {
        var safeInterviewId = SanitizeKeyPart(interviewId);
        var safeRecordingId = SanitizeKeyPart(providerRecordingId);
        var prefix = (_s3Settings.KeyPrefix ?? string.Empty).Trim('/');
        var relativeKey = $"recordings/interviews/{safeInterviewId}/{safeRecordingId}.mp4";
        return string.IsNullOrWhiteSpace(prefix) ? relativeKey : $"{prefix}/{relativeKey}";
    }

    private static string SanitizeKeyPart(string value)
    {
        var cleaned = new string(value.Select(ch => char.IsLetterOrDigit(ch) || ch is '-' or '_' ? ch : '-').ToArray());
        return string.IsNullOrWhiteSpace(cleaned) ? Guid.NewGuid().ToString("N") : cleaned;
    }

    private sealed record CalComBookingResponse(
        [property: JsonPropertyName("status")] string? Status,
        [property: JsonPropertyName("data")] CalComBookingData? Data);

    private sealed record CalComBookingData(
        [property: JsonPropertyName("id")] int? Id,
        [property: JsonPropertyName("uid")] string? Uid,
        [property: JsonPropertyName("meetingUrl")] string? MeetingUrl,
        [property: JsonPropertyName("location")] string? Location);

    private sealed record CalComRecordingsResponse(
        [property: JsonPropertyName("status")] string? Status,
        [property: JsonPropertyName("data")] List<CalComRecordingData>? Data);

    private sealed record CalComRecordingData(
        [property: JsonPropertyName("id")] string? Id,
        [property: JsonPropertyName("roomName")] string? RoomName,
        [property: JsonPropertyName("startTs")] long? StartTs,
        [property: JsonPropertyName("status")] string? Status,
        [property: JsonPropertyName("downloadLink")] string? DownloadLink,
        [property: JsonPropertyName("error")] string? Error);
}
