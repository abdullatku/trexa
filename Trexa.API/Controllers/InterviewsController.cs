using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Trexa.Api.Constants;
using Trexa.Api.Extensions;
using Trexa.Api.Models.Documents;
using Trexa.Api.Models.Identity;
using Trexa.Api.Repositories.Interfaces;
using Trexa.Api.Settings;
using Trexa.Api.Services.Interfaces;

namespace Trexa.Api.Controllers;

[ApiController]
[Route(ApiRoutes.Prefix)]
[Authorize]
public sealed class InterviewsController : ControllerBase
{
    private readonly IDynamoDocumentStore _store;
    private readonly ISubscriptionRepository _subscriptionRepository;
    private readonly IUserRepository _userRepository;
    private readonly IEmailService _emailService;
    private readonly DynamoDbSettings _settings;

    public InterviewsController(
        IDynamoDocumentStore store,
        IUserRepository userRepository,
        ISubscriptionRepository subscriptionRepository,
        IEmailService emailService,
        IOptions<DynamoDbSettings> settings)
    {
        _store = store;
        _subscriptionRepository = subscriptionRepository;
        _userRepository = userRepository;
        _emailService = emailService;
        _settings = settings.Value;
    }

    [HttpGet("interviewers")]
    public async Task<IActionResult> GetInterviewers(CancellationToken cancellationToken)
    {
        var users = await _userRepository.GetByRoleAsync("interviewer", cancellationToken);
        var interviewers = users.Select(MapUser).ToList();
        return Ok(new { interviewers });
    }

    [HttpGet("interview-students")]
    public async Task<IActionResult> GetInterviewStudents(CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        var role = User.GetRole();

        if (string.IsNullOrWhiteSpace(userId) || string.IsNullOrWhiteSpace(role))
        {
            return Unauthorized();
        }

        if (role is not ("interviewer" or "admin"))
        {
            return Forbid();
        }

        var interviews = await _store.ScanAsync<Interview>(_settings.InterviewsTable, cancellationToken);
        var visibleInterviews = role == "admin"
            ? interviews
            : interviews.Where(x => x.InterviewerId == userId);

        var studentIds = visibleInterviews
            .Select(x => x.StudentId)
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var users = await _userRepository.GetAllAsync(cancellationToken);
        var students = users
            .Where(u => studentIds.Contains(u.Id.ToString()))
            .Select(u => new
            {
                id = u.Id.ToString(),
                name = string.IsNullOrWhiteSpace(u.Name) ? (u.Email ?? "Student") : u.Name,
                email = u.Email
            })
            .ToList();

        return Ok(new { students });
    }

    [HttpPost("interviews")]
    public async Task<IActionResult> CreateInterview([FromBody] CreateInterviewRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized();
        }

        if (string.IsNullOrWhiteSpace(request.DesignationId))
        {
            return BadRequest(new { error = "Designation is required" });
        }

        if (User.GetRole() == "student")
        {
            var consumed = await _subscriptionRepository.ConsumeInterviewCreditAsync(userId, cancellationToken);
            if (!consumed)
            {
                return BadRequest(new { error = "No interviews remaining in your active subscription" });
            }
        }

        var interview = new Interview
        {
            StudentId = userId,
            DesignationId = request.DesignationId,
            InterviewerId = string.IsNullOrWhiteSpace(request.InterviewerId) ? null : request.InterviewerId,
            ScheduledDate = string.IsNullOrWhiteSpace(request.ScheduledDate) ? "pending" : request.ScheduledDate,
            Status = string.IsNullOrWhiteSpace(request.ScheduledDate) || request.ScheduledDate == "pending" ? "pending" : "scheduled",
            Notes = request.Notes,
            Skill = request.Skill,
            Level = request.Level,
            InterviewLevel = request.InterviewLevel,
            CvUrl = request.CvUrl,
            Timezone = request.Timezone,
            CompanyLevel = request.CompanyLevel,
            PreferredCompany = request.PreferredCompany,
            CreatedAt = DateTime.UtcNow
        };

        await _store.UpsertAsync(_settings.InterviewsTable, interview, cancellationToken);
        await NotifyInterviewChangeAsync(interview, "Interview Requested", "A new interview request has been created.", notifyStudent: true, notifyInterviewer: false, notifyAdmins: true, cancellationToken);
        return Ok(new { message = "Interview request submitted successfully", interview });
    }

    [HttpGet("interviews")]
    public async Task<IActionResult> GetInterviews(CancellationToken cancellationToken)
    {
        var role = User.GetRole();
        var userId = User.GetUserId();

        if (string.IsNullOrWhiteSpace(userId) || string.IsNullOrWhiteSpace(role))
        {
            return Unauthorized();
        }

        var interviews = await _store.ScanAsync<Interview>(_settings.InterviewsTable, cancellationToken);
        var filtered = role switch
        {
            "student" => interviews.Where(x => x.StudentId == userId),
            "interviewer" => interviews.Where(x => x.InterviewerId == userId),
            "admin" => interviews,
            _ => interviews
        };

        return Ok(new { interviews = filtered.OrderByDescending(x => x.CreatedAt).ToList() });
    }

    [HttpPut("admin/interviews/{id}/assign")]
    public async Task<IActionResult> AssignInterviewer(string id, [FromBody] AssignInterviewRequest request, CancellationToken cancellationToken)
    {
        if (User.GetRole() != "admin")
        {
            return Forbid();
        }

        if (string.IsNullOrWhiteSpace(request.InterviewerId) || string.IsNullOrWhiteSpace(request.ScheduledDate))
        {
            return BadRequest(new { error = "interviewerId and scheduledDate are required" });
        }

        var interview = await _store.GetByIdAsync<Interview>(_settings.InterviewsTable, id, cancellationToken);
        if (interview is null)
        {
            return NotFound(new { error = "Interview not found" });
        }

        interview.InterviewerId = request.InterviewerId;
        interview.ScheduledDate = request.ScheduledDate;
        interview.Status = "scheduled";
        interview.AcceptedByInterviewer = false;

        await _store.UpsertAsync(_settings.InterviewsTable, interview, cancellationToken);
        await NotifyInterviewChangeAsync(interview, "Interview Assigned", "An interviewer has been assigned and interview scheduled.", notifyStudent: true, notifyInterviewer: true, notifyAdmins: true, cancellationToken);
        return Ok(new { message = "Interviewer assigned successfully" });
    }

    [HttpPost("interviews/{id}/accept")]
    public async Task<IActionResult> AcceptInterview(string id, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (User.GetRole() != "interviewer" || string.IsNullOrWhiteSpace(userId))
        {
            return Forbid();
        }

        var interview = await _store.GetByIdAsync<Interview>(_settings.InterviewsTable, id, cancellationToken);
        if (interview is null || interview.InterviewerId != userId)
        {
            return NotFound(new { error = "Interview not found" });
        }

        interview.Status = "accepted";
        interview.AcceptedByInterviewer = true;
        await _store.UpsertAsync(_settings.InterviewsTable, interview, cancellationToken);
        await NotifyInterviewChangeAsync(interview, "Interview Accepted", "The assigned interviewer has accepted the interview.", notifyStudent: true, notifyInterviewer: false, notifyAdmins: true, cancellationToken);

        return Ok(new { message = "Interview accepted successfully" });
    }

    [HttpPost("interviews/{id}/decline")]
    public async Task<IActionResult> DeclineInterview(string id, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (User.GetRole() != "interviewer" || string.IsNullOrWhiteSpace(userId))
        {
            return Forbid();
        }

        var interview = await _store.GetByIdAsync<Interview>(_settings.InterviewsTable, id, cancellationToken);
        if (interview is null || interview.InterviewerId != userId)
        {
            return NotFound(new { error = "Interview not found" });
        }

        interview.Status = "declined";
        interview.AcceptedByInterviewer = false;
        await _store.UpsertAsync(_settings.InterviewsTable, interview, cancellationToken);
        await NotifyInterviewChangeAsync(interview, "Interview Declined", "The assigned interviewer has declined the interview.", notifyStudent: true, notifyInterviewer: false, notifyAdmins: true, cancellationToken);

        return Ok(new { message = "Interview declined" });
    }

    [HttpPost("interviews/{id}/cancel")]
    public async Task<IActionResult> CancelInterview(string id, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        var role = User.GetRole();
        if (string.IsNullOrWhiteSpace(userId) || string.IsNullOrWhiteSpace(role))
        {
            return Unauthorized();
        }

        var interview = await _store.GetByIdAsync<Interview>(_settings.InterviewsTable, id, cancellationToken);
        if (interview is null)
        {
            return NotFound(new { error = "Interview not found" });
        }

        if (role == "admin")
        {
            interview.Status = "cancelled";
            await _store.UpsertAsync(_settings.InterviewsTable, interview, cancellationToken);
            await NotifyInterviewChangeAsync(interview, "Interview Cancelled", "The interview was cancelled by admin.", notifyStudent: true, notifyInterviewer: true, notifyAdmins: true, cancellationToken);
            return Ok(new { message = "Interview cancelled successfully" });
        }

        if (role == "student")
        {
            if (interview.StudentId != userId)
            {
                return NotFound(new { error = "Interview not found" });
            }

            interview.Status = "cancelled";
            await _store.UpsertAsync(_settings.InterviewsTable, interview, cancellationToken);
            await NotifyInterviewChangeAsync(interview, "Interview Cancelled", "The interview was cancelled by student.", notifyStudent: false, notifyInterviewer: true, notifyAdmins: true, cancellationToken);
            return Ok(new { message = "Interview cancelled successfully" });
        }

        if (role == "interviewer")
        {
            if (interview.InterviewerId != userId)
            {
                return NotFound(new { error = "Interview not found" });
            }

            interview.Status = "cancel_requested";
            await _store.UpsertAsync(_settings.InterviewsTable, interview, cancellationToken);
            await NotifyInterviewChangeAsync(interview, "Cancel Request Submitted", "The interviewer requested to cancel this interview.", notifyStudent: true, notifyInterviewer: false, notifyAdmins: true, cancellationToken);
            return Ok(new { message = "Cancel request submitted successfully" });
        }

        return Forbid();
    }

    [HttpPost("admin/interviews/{id}/cancel")]
    public async Task<IActionResult> CancelInterviewByAdmin(string id, CancellationToken cancellationToken)
    {
        if (User.GetRole() != "admin")
        {
            return Forbid();
        }

        var interview = await _store.GetByIdAsync<Interview>(_settings.InterviewsTable, id, cancellationToken);
        if (interview is null)
        {
            return NotFound(new { error = "Interview not found" });
        }

        interview.Status = "cancelled";
        await _store.UpsertAsync(_settings.InterviewsTable, interview, cancellationToken);
        await NotifyInterviewChangeAsync(interview, "Interview Cancelled", "The interview was cancelled by admin.", notifyStudent: true, notifyInterviewer: true, notifyAdmins: false, cancellationToken);

        return Ok(new { message = "Interview cancelled successfully" });
    }

    [HttpPost("admin/interviews/{id}/reschedule")]
    public async Task<IActionResult> RescheduleInterviewByAdmin(string id, [FromBody] AdminRescheduleRequest request, CancellationToken cancellationToken)
    {
        if (User.GetRole() != "admin")
        {
            return Forbid();
        }

        if (string.IsNullOrWhiteSpace(request.ScheduledDate))
        {
            return BadRequest(new { error = "scheduledDate is required" });
        }

        var interview = await _store.GetByIdAsync<Interview>(_settings.InterviewsTable, id, cancellationToken);
        if (interview is null)
        {
            return NotFound(new { error = "Interview not found" });
        }

        interview.ScheduledDate = request.ScheduledDate;
        interview.Status = "scheduled";
        interview.RescheduleReason = string.IsNullOrWhiteSpace(request.Reason) ? interview.RescheduleReason : request.Reason;

        await _store.UpsertAsync(_settings.InterviewsTable, interview, cancellationToken);
        await NotifyInterviewChangeAsync(interview, "Interview Rescheduled", "The interview schedule was updated by admin.", notifyStudent: true, notifyInterviewer: true, notifyAdmins: false, cancellationToken);
        return Ok(new { message = "Interview rescheduled successfully" });
    }

    [HttpPost("interviews/{id}/reschedule")]
    public async Task<IActionResult> RequestReschedule(string id, [FromBody] RescheduleRequest request, CancellationToken cancellationToken)
    {
        Response.Headers.Append("X-Trexa-Reschedule-Version", "v2-owner-check");
        var userId = User.GetUserId();
        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized();
        }

        if (string.IsNullOrWhiteSpace(request.Reason))
        {
            return BadRequest(new { error = "Reason is required" });
        }

        var interview = await _store.GetByIdAsync<Interview>(_settings.InterviewsTable, id, cancellationToken);
        if (interview is null)
        {
            return NotFound(new { error = "Interview not found" });
        }

        var isStudentOwner = interview.StudentId == userId;
        var isAssignedInterviewer = interview.InterviewerId == userId;

        if (!isStudentOwner && !isAssignedInterviewer)
        {
            return NotFound(new { error = "Interview not found" });
        }

        if (isStudentOwner)
        {
            if (interview.RescheduleCount >= 2)
            {
                return BadRequest(new { error = "Maximum reschedule limit reached" });
            }

            interview.RescheduleCount += 1;
        }

        interview.RescheduleReason = request.Reason;
        interview.Status = "reschedule_requested";

        await _store.UpsertAsync(_settings.InterviewsTable, interview, cancellationToken);
        await NotifyInterviewChangeAsync(interview, "Reschedule Request Submitted", "A reschedule request has been submitted for this interview.", notifyStudent: true, notifyInterviewer: true, notifyAdmins: true, cancellationToken);

        return Ok(new
        {
            message = "Reschedule request submitted",
            remainingReschedules = Math.Max(0, 2 - interview.RescheduleCount)
        });
    }

    [HttpPost("interviews/{id}/feedback")]
    public async Task<IActionResult> SubmitInterviewerFeedback(string id, [FromBody] Dictionary<string, object> feedback, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (User.GetRole() != "interviewer" || string.IsNullOrWhiteSpace(userId))
        {
            return Forbid();
        }

        var interview = await _store.GetByIdAsync<Interview>(_settings.InterviewsTable, id, cancellationToken);
        if (interview is null || interview.InterviewerId != userId)
        {
            return NotFound(new { error = "Interview not found" });
        }

        interview.Feedback = feedback;
        interview.Status = "completed";
        await _store.UpsertAsync(_settings.InterviewsTable, interview, cancellationToken);
        await NotifyInterviewChangeAsync(interview, "Interviewer Feedback Submitted", "Interviewer feedback has been submitted.", notifyStudent: true, notifyInterviewer: false, notifyAdmins: true, cancellationToken);

        return Ok(new { message = "Feedback submitted successfully" });
    }

    [HttpPost("interviews/{id}/student-feedback")]
    public async Task<IActionResult> SubmitStudentFeedback(string id, [FromBody] Dictionary<string, object> feedback, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (User.GetRole() != "student" || string.IsNullOrWhiteSpace(userId))
        {
            return Forbid();
        }

        var interview = await _store.GetByIdAsync<Interview>(_settings.InterviewsTable, id, cancellationToken);
        if (interview is null || interview.StudentId != userId)
        {
            return NotFound(new { error = "Interview not found" });
        }

        interview.StudentFeedback = feedback;
        await _store.UpsertAsync(_settings.InterviewsTable, interview, cancellationToken);
        await NotifyInterviewChangeAsync(interview, "Student Feedback Submitted", "Student feedback has been submitted.", notifyStudent: false, notifyInterviewer: true, notifyAdmins: true, cancellationToken);

        return Ok(new { message = "Student feedback submitted successfully" });
    }

    [HttpPost("interviews/{id}/zoom")]
    public async Task<IActionResult> CreateZoomMeeting(string id, CancellationToken cancellationToken)
    {
        var role = User.GetRole();
        if (role is not ("interviewer" or "admin"))
        {
            return Forbid();
        }

        var interview = await _store.GetByIdAsync<Interview>(_settings.InterviewsTable, id, cancellationToken);
        if (interview is null)
        {
            return NotFound(new { error = "Interview not found" });
        }

        var meetingId = Random.Shared.Next(100000000, 999999999).ToString();
        var password = Guid.NewGuid().ToString("N")[..8];

        interview.ZoomMeetingId = meetingId;
        interview.ZoomPassword = password;
        interview.ZoomJoinUrl = $"https://zoom.us/j/{meetingId}?pwd={password}";
        interview.ZoomStartUrl = $"https://zoom.us/s/{meetingId}?zak={Guid.NewGuid():N}";

        await _store.UpsertAsync(_settings.InterviewsTable, interview, cancellationToken);

        return Ok(new
        {
            message = "Zoom meeting created successfully",
            zoomJoinUrl = interview.ZoomJoinUrl,
            zoomMeetingId = interview.ZoomMeetingId,
            zoomPassword = interview.ZoomPassword
        });
    }


    private async Task NotifyInterviewChangeAsync(
        Interview interview,
        string subject,
        string actionText,
        bool notifyStudent,
        bool notifyInterviewer,
        bool notifyAdmins,
        CancellationToken cancellationToken)
    {
        var recipients = await GetNotificationRecipientsAsync(interview, notifyStudent, notifyInterviewer, notifyAdmins, cancellationToken);
        if (recipients.Count == 0)
        {
            return;
        }

        var body = $"{actionText}\n\nInterview ID: {interview.Id}\nStatus: {interview.Status}\nScheduled Date: {interview.ScheduledDate}";
        await _emailService.SendAsync(recipients, $"[Trexa] {subject}", body, cancellationToken);
    }

    private async Task<List<EmailRecipient>> GetNotificationRecipientsAsync(
        Interview interview,
        bool notifyStudent,
        bool notifyInterviewer,
        bool notifyAdmins,
        CancellationToken cancellationToken)
    {
        var recipients = new HashSet<EmailRecipient>();

        if (notifyStudent && Guid.TryParse(interview.StudentId, out var studentId))
        {
            var student = await _userRepository.GetByIdAsync(studentId, cancellationToken);
            if (!string.IsNullOrWhiteSpace(student?.Email))
            {
                recipients.Add(new EmailRecipient { Email = student.Email, Name = student.Name });
            }
        }

        if (notifyInterviewer && !string.IsNullOrWhiteSpace(interview.InterviewerId) && Guid.TryParse(interview.InterviewerId, out var interviewerId))
        {
            var interviewer = await _userRepository.GetByIdAsync(interviewerId, cancellationToken);
            if (!string.IsNullOrWhiteSpace(interviewer?.Email))
            {
                recipients.Add(new EmailRecipient { Email = interviewer.Email, Name = interviewer.Name });
            }
        }

        if (notifyAdmins)
        {
            var admins = await _userRepository.GetByRoleAsync("admin", cancellationToken);
            foreach (var admin in admins)
            {
                if (!string.IsNullOrWhiteSpace(admin.Email))
                {
                    recipients.Add(new EmailRecipient { Email = admin.Email, Name = admin.Name });
                }
            }
        }

        return recipients.ToList();
    }

    private static object MapUser(ApplicationUser user) => new
    {
        id = user.Id.ToString(),
        email = user.Email,
        name = user.Name,
        role = "interviewer",
        linkedInProfile = user.LinkedInProfile,
        bio = user.Bio,
        techStacks = user.TechStacks,
        company = user.Company,
        createdAt = user.CreatedAt
    };

    public sealed record CreateInterviewRequest(
        string DesignationId,
        string ScheduledDate,
        string? Notes,
        string? Skill,
        string? Level,
        string? InterviewLevel,
        string? CvUrl,
        string? CompanyLevel,
        string? PreferredCompany,
        string? Timezone,
        string? InterviewerId);

    public sealed record AssignInterviewRequest(string InterviewerId, string ScheduledDate);
    public sealed record AdminRescheduleRequest(string ScheduledDate, string? Reason);
    public sealed record RescheduleRequest(string Reason);
}
