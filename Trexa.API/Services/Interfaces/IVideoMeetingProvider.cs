using Trexa.Api.Models.Documents;

namespace Trexa.Api.Services.Interfaces;

public interface IVideoMeetingProvider
{
    Task<VideoMeetingResult> CreateMeetingAsync(Interview interview, CancellationToken cancellationToken = default);
    Task<VideoRecordingSyncResult> SyncRecordingAsync(Interview interview, CancellationToken cancellationToken = default);
}

public sealed record VideoMeetingResult(
    string MeetingId,
    string JoinUrl,
    string StartUrl,
    string? Password);

public sealed record VideoRecordingSyncResult(
    bool Saved,
    string Status,
    string? StorageKey = null,
    string? ProviderRecordingId = null);
