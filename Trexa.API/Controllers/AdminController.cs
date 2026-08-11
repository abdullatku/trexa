using System.Security.Cryptography;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Trexa.Api.Constants;
using Trexa.Api.Models.Documents;
using Trexa.Api.Models.Identity;
using Trexa.Api.Repositories.Interfaces;
using Trexa.Api.Settings;

namespace Trexa.Api.Controllers;

[ApiController]
[Route(ApiRoutes.Prefix + "/admin")]
[Authorize]
public sealed class AdminController : ControllerBase
{
    private readonly IUserRepository _userRepository;
    private readonly IDynamoDocumentStore _store;
    private readonly CalComSettings _calComSettings;
    private readonly DynamoDbSettings _settings;

    public AdminController(
        IDynamoDocumentStore store,
        IUserRepository userRepository,
        IOptions<CalComSettings> calComSettings,
        IOptions<DynamoDbSettings> settings)
    {
        _userRepository = userRepository;
        _store = store;
        _calComSettings = calComSettings.Value;
        _settings = settings.Value;
    }

    [HttpGet("users")]
    public async Task<IActionResult> GetUsers(CancellationToken cancellationToken)
    {
        var users = await _userRepository.GetAllAsync(cancellationToken);
        var response = new List<object>(users.Count);

        foreach (var user in users)
        {
            response.Add(new
            {
                id = user.Id.ToString(),
                email = user.Email,
                name = user.Name,
                role = user.Role,
                createdAt = user.CreatedAt,
                techStacks = user.TechStacks,
                linkedInProfile = user.LinkedInProfile,
                bio = user.Bio,
                company = user.Company,
                defaultInterviewerFee = user.DefaultInterviewerFee
            });
        }

        return Ok(new { users = response });
    }

    [HttpPost("create-user")]
    public async Task<IActionResult> CreateUser([FromBody] CreateUserRequest request, CancellationToken cancellationToken)
    {
        if (!User.IsInRole("admin"))
        {
            return Forbid();
        }

        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Role))
        {
            return BadRequest(new { error = "Missing required fields" });
        }

        var email = request.Email.Trim().ToLowerInvariant();
        var existing = await _userRepository.FindByEmailAsync(email, cancellationToken);
        if (existing is not null)
        {
            return BadRequest(new { error = "User already exists" });
        }

        var role = request.Role.Trim().ToLowerInvariant();
        if (role is not ("admin" or "student" or "interviewer"))
        {
            return BadRequest(new { error = "Invalid role" });
        }

        var generatedPassword = GenerateStrongPassword();

        var user = new ApplicationUser
        {
            UserName = email,
            Email = email,
            Name = request.Name.Trim(),
            Role = role,
            CreatedAt = DateTime.UtcNow,
            Company = request.Company?.Trim()
        };

        if (role != "admin")
        {
            user.LinkedInProfile = request.LinkedInProfile?.Trim();
            user.Bio = request.Bio?.Trim();
            user.TechStacks = request.TechStacks ?? [];
            user.DefaultInterviewerFee = role == "interviewer" ? Math.Max(0, request.DefaultInterviewerFee ?? 0) : 0;
        }
        else
        {
            user.LinkedInProfile = null;
            user.Bio = null;
            user.TechStacks = [];
            user.DefaultInterviewerFee = 0;
        }

        await _userRepository.CreateAsync(user, generatedPassword, cancellationToken);

        return Ok(new
        {
            message = "User created successfully",
            generatedPassword,
            user = new
            {
                id = user.Id.ToString(),
                email = user.Email,
                name = user.Name,
                role,
                createdAt = user.CreatedAt,
                techStacks = user.TechStacks,
                linkedInProfile = user.LinkedInProfile,
                bio = user.Bio,
                company = user.Company,
                defaultInterviewerFee = user.DefaultInterviewerFee
            }
        });
    }

    [HttpDelete("users/{id}")]
    public async Task<IActionResult> DeleteUser(string id, CancellationToken cancellationToken)
    {
        if (!User.IsInRole("admin"))
        {
            return Forbid();
        }

        if (!Guid.TryParse(id, out var userId))
        {
            return BadRequest(new { error = "Invalid user ID format" });
        }

        var user = await _userRepository.GetByIdAsync(userId, cancellationToken);
        if (user is null)
        {
            return NotFound(new { error = "User not found" });
        }

        var deleted = await _userRepository.DeleteAsync(userId, cancellationToken);
        if (!deleted)
        {
            return StatusCode(500, new { error = "Failed to delete user" });
        }

        return Ok(new { message = "User deleted successfully", userId = id });
    }

    [HttpPut("users/{id}/default-interviewer-fee")]
    public async Task<IActionResult> UpdateDefaultInterviewerFee(string id, [FromBody] UpdateDefaultInterviewerFeeRequest request, CancellationToken cancellationToken)
    {
        if (!User.IsInRole("admin"))
        {
            return Forbid();
        }

        if (!Guid.TryParse(id, out var userId))
        {
            return BadRequest(new { error = "Invalid user ID format" });
        }

        var user = await _userRepository.GetByIdAsync(userId, cancellationToken);
        if (user is null || user.Role != "interviewer")
        {
            return NotFound(new { error = "Interviewer not found" });
        }

        user.DefaultInterviewerFee = Math.Max(0, request.DefaultInterviewerFee);
        user.UpdatedAt = DateTime.UtcNow;
        await _userRepository.UpdateAsync(user, cancellationToken);

        return Ok(new
        {
            message = "Default interviewer fee updated successfully",
            user = new
            {
                id = user.Id.ToString(),
                defaultInterviewerFee = user.DefaultInterviewerFee
            }
        });
    }

    [HttpGet("cal-com")]
    public IActionResult GetCalComConfiguration()
    {
        if (!User.IsInRole("admin"))
        {
            return Forbid();
        }

        return Ok(new { configuration = MapCalComConfiguration(_calComSettings) });
    }

    [HttpGet("analytics")]
    public async Task<IActionResult> GetAnalytics(CancellationToken cancellationToken)
    {
        if (!User.IsInRole("admin"))
        {
            return Forbid();
        }

        var users = await _userRepository.GetAllAsync(cancellationToken);
        var interviews = await _store.ScanAsync<Interview>(_settings.InterviewsTable, cancellationToken);
        var subscriptions = await _store.ScanAsync<Subscription>(_settings.SubscriptionsTable, cancellationToken);
        var payments = await _store.ScanAsync<PaymentRecord>(_settings.PaymentsTable, cancellationToken);
        var designations = await _store.ScanAsync<Designation>(_settings.DesignationsTable, cancellationToken);

        var userRoles = users.ToDictionary(u => u.Id.ToString(), u => string.IsNullOrWhiteSpace(u.Role) ? "student" : u.Role);

        var designationLookup = designations.ToDictionary(d => d.Id, d => d.Name);
        var interviewsByDesignation = interviews
            .GroupBy(i => i.DesignationId)
            .ToDictionary(g => designationLookup.GetValueOrDefault(g.Key, g.Key), g => g.Count());

        var now = DateTime.UtcNow;
        var last6 = Enumerable.Range(0, 6)
            .Select(i => new DateTime(now.Year, now.Month, 1).AddMonths(-i))
            .Reverse()
            .ToList();

        var interviewsByMonth = new Dictionary<string, int>();
        foreach (var monthStart in last6)
        {
            var monthEnd = monthStart.AddMonths(1);
            var key = monthStart.ToString("MMM yyyy");
            interviewsByMonth[key] = interviews.Count(i => i.CreatedAt >= monthStart && i.CreatedAt < monthEnd);
        }

        var interviewerStats = users
            .Where(u => userRoles.GetValueOrDefault(u.Id.ToString()) == "interviewer")
            .Select(interviewer =>
            {
                var interviewerInterviews = interviews.Where(i => i.InterviewerId == interviewer.Id.ToString()).ToList();
                var completed = interviewerInterviews.Count(i => i.Status == "completed");

                var ratings = interviewerInterviews
                    .Where(i => i.StudentFeedback is not null && i.StudentFeedback.ContainsKey("rating"))
                    .Select(i => TryParseDouble(i.StudentFeedback!["rating"]))
                    .Where(x => x.HasValue)
                    .Select(x => x!.Value)
                    .ToList();

                var avgRating = ratings.Count == 0 ? 0 : Math.Round(ratings.Average(), 2);

                return new
                {
                    name = interviewer.Name,
                    completed,
                    avgRating
                };
            })
            .OrderByDescending(x => x.completed)
            .ThenByDescending(x => x.avgRating)
            .ToList();

        var totalRevenue = payments.Where(p => p.Status == "paid").Sum(p => p.Amount / 100m);

        var overview = new
        {
            totalUsers = users.Count,
            studentCount = userRoles.Count(x => x.Value == "student"),
            interviewerCount = userRoles.Count(x => x.Value == "interviewer"),
            totalInterviews = interviews.Count,
            scheduledInterviews = interviews.Count(i => i.Status is "scheduled" or "accepted"),
            completedInterviews = interviews.Count(i => i.Status == "completed"),
            activeSubscriptions = subscriptions.Count(s => s.Status == "active"),
            totalRevenue = Math.Round(totalRevenue, 2)
        };

        return Ok(new
        {
            overview,
            interviewsByDesignation,
            interviewsByMonth,
            interviewerStats
        });
    }

    private static string GenerateStrongPassword(int length = 14)
    {
        const string upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
        const string lower = "abcdefghijkmnopqrstuvwxyz";
        const string digits = "23456789";
        const string symbols = "!@#$%^&*()-_=+";

        var all = upper + lower + digits + symbols;

        var passwordChars = new List<char>
        {
            upper[RandomNumberGenerator.GetInt32(upper.Length)],
            lower[RandomNumberGenerator.GetInt32(lower.Length)],
            digits[RandomNumberGenerator.GetInt32(digits.Length)],
            symbols[RandomNumberGenerator.GetInt32(symbols.Length)]
        };

        for (var i = passwordChars.Count; i < length; i++)
        {
            passwordChars.Add(all[RandomNumberGenerator.GetInt32(all.Length)]);
        }

        for (var i = passwordChars.Count - 1; i > 0; i--)
        {
            var j = RandomNumberGenerator.GetInt32(i + 1);
            (passwordChars[i], passwordChars[j]) = (passwordChars[j], passwordChars[i]);
        }

        return new string(passwordChars.ToArray());
    }

    private static double? TryParseDouble(object? input)
    {
        if (input is null) return null;
        if (input is double d) return d;
        if (input is float f) return f;
        if (input is int i) return i;
        if (input is long l) return l;
        if (double.TryParse(input.ToString(), out var parsed)) return parsed;
        return null;
    }

    private static object MapCalComConfiguration(CalComSettings configuration)
    {
        return new
        {
            apiBaseUrl = configuration.ApiBaseUrl,
            appBaseUrl = configuration.AppBaseUrl,
            apiVersion = configuration.ApiVersion,
            oauthClientConfigured = !string.IsNullOrWhiteSpace(configuration.OAuthClientId) &&
                                    !string.IsNullOrWhiteSpace(configuration.OAuthClientSecret),
            oauthRedirectUrl = configuration.OAuthRedirectUrl,
            webhookUrl = configuration.WebhookUrl,
            oauthScopes = configuration.OAuthScopes,
            timezone = configuration.Timezone,
            defaultDurationMinutes = configuration.DefaultDurationMinutes,
            useDefaultDurationMinutes = configuration.UseDefaultDurationMinutes,
            addInterviewerAsGuest = configuration.AddInterviewerAsGuest,
            allowConflicts = configuration.AllowConflicts,
            allowBookingOutOfBounds = configuration.AllowBookingOutOfBounds
        };
    }

    public sealed record CreateUserRequest(
        string Email,
        string Name,
        string Role,
        string? LinkedInProfile,
        string? Bio,
        List<string>? TechStacks,
        string? Company,
        decimal? DefaultInterviewerFee);

    public sealed record UpdateDefaultInterviewerFeeRequest(decimal DefaultInterviewerFee);
}
