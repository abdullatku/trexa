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
public sealed class FeedbackFormsController : ControllerBase
{
    private readonly IDynamoDocumentStore _store;
    private readonly DynamoDbSettings _settings;

    public FeedbackFormsController(IDynamoDocumentStore store, IOptions<DynamoDbSettings> settings)
    {
        _store = store;
        _settings = settings.Value;
    }

    [HttpGet("feedback-forms")]
    public async Task<IActionResult> GetForms(CancellationToken cancellationToken)
    {
        var forms = await _store.ScanAsync<FeedbackForm>(_settings.FeedbackFormsTable, cancellationToken);
        forms = forms.OrderByDescending(x => x.CreatedAt).ToList();

        if (forms.Count == 0)
        {
            var defaultForm = new FeedbackForm
            {
                Name = "Default Interview Feedback",
                Fields =
                [
                    new FeedbackField { Name = "rating", Label = "Overall Rating", Type = "number", Required = true },
                    new FeedbackField { Name = "comments", Label = "Comments", Type = "textarea", Required = true },
                    new FeedbackField { Name = "strengths", Label = "Strengths", Type = "textarea", Required = false },
                    new FeedbackField { Name = "improvements", Label = "Areas to Improve", Type = "textarea", Required = false }
                ],
                CreatedAt = DateTime.UtcNow
            };

            await _store.UpsertAsync(_settings.FeedbackFormsTable, defaultForm, cancellationToken);
            forms.Add(defaultForm);
        }

        return Ok(new { forms });
    }

    [HttpPost("admin/feedback-forms")]
    public async Task<IActionResult> CreateForm([FromBody] FeedbackForm requestBody, CancellationToken cancellationToken)
    {
        if (User.GetRole() != "admin")
        {
            return Forbid();
        }

        if (string.IsNullOrWhiteSpace(requestBody.Name) || requestBody.Fields.Count == 0)
        {
            return BadRequest(new { error = "Form name and fields are required" });
        }

        var form = new FeedbackForm
        {
            Name = requestBody.Name.Trim(),
            Fields = requestBody.Fields,
            CreatedAt = DateTime.UtcNow
        };

        await _store.UpsertAsync(_settings.FeedbackFormsTable, form, cancellationToken);
        return Ok(new { message = "Feedback form created successfully", form });
    }
}
