using System.Net;
using System.Net.Mail;
using Amazon.SimpleEmailV2;
using Amazon.SimpleEmailV2.Model;
using Microsoft.Extensions.Options;
using Trexa.Api.Services.Interfaces;
using Trexa.Api.Settings;

namespace Trexa.Api.Services;

public sealed class EmailService : IEmailService
{
    private readonly EmailSettings _settings;
    private readonly IAmazonSimpleEmailServiceV2 _sesClient;
    private readonly ILogger<EmailService> _logger;

    public EmailService(
        IOptions<EmailSettings> settings,
        IAmazonSimpleEmailServiceV2 sesClient,
        ILogger<EmailService> logger)
    {
        _settings = settings.Value;
        _sesClient = sesClient;
        _logger = logger;
    }

    public async Task<bool> SendAsync(IEnumerable<string> recipients, string subject, string body, CancellationToken cancellationToken = default)
    {
        var uniqueRecipients = recipients
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Select(x => x.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        if (!_settings.Enabled || uniqueRecipients.Count == 0)
        {
            return true;
        }

        if (string.IsNullOrWhiteSpace(_settings.FromEmail))
        {
            _logger.LogWarning("Email sending is enabled but FromEmail is not configured.");
            return false;
        }

        try
        {
            var provider = (_settings.Provider ?? "SES").Trim().ToUpperInvariant();
            return provider == "SMTP"
                ? await SendViaSmtpAsync(uniqueRecipients, subject, body, cancellationToken)
                : await SendViaSesAsync(uniqueRecipients, subject, body, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email notification.");
            return false;
        }
    }

    private async Task<bool> SendViaSesAsync(List<string> recipients, string subject, string body, CancellationToken cancellationToken)
    {
        var request = new SendEmailRequest
        {
            FromEmailAddress = string.IsNullOrWhiteSpace(_settings.FromName)
                ? _settings.FromEmail
                : $"{_settings.FromName} <{_settings.FromEmail}>",
            Destination = new Destination
            {
                ToAddresses = recipients
            },
            Content = new EmailContent
            {
                Simple = new Message
                {
                    Subject = new Content { Data = subject, Charset = "UTF-8" },
                    Body = new Body
                    {
                        Text = new Content { Data = body, Charset = "UTF-8" }
                    }
                }
            }
        };

        await _sesClient.SendEmailAsync(request, cancellationToken);
        return true;
    }

    private async Task<bool> SendViaSmtpAsync(List<string> recipients, string subject, string body, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(_settings.Host))
        {
            _logger.LogWarning("SMTP provider selected but Host is not configured.");
            return false;
        }

        using var client = new SmtpClient(_settings.Host, _settings.Port)
        {
            EnableSsl = _settings.UseSsl,
            Credentials = string.IsNullOrWhiteSpace(_settings.UserName)
                ? CredentialCache.DefaultNetworkCredentials
                : new NetworkCredential(_settings.UserName, _settings.Password)
        };

        using var message = new MailMessage
        {
            From = new MailAddress(_settings.FromEmail, _settings.FromName),
            Subject = subject,
            Body = body,
            IsBodyHtml = false
        };

        foreach (var recipient in recipients)
        {
            message.To.Add(recipient);
        }

        await client.SendMailAsync(message, cancellationToken);
        return true;
    }
}
