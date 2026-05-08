using System.Net;
using Amazon.SimpleEmailV2;
using Amazon.SimpleEmailV2.Model;
using Microsoft.Extensions.Options;
using MimeKit;
using MailKit.Net.Smtp;
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

    public async Task<bool> SendAsync(IEnumerable<EmailRecipient> recipients, string subject, string body, CancellationToken cancellationToken = default)
    {
       
        try
        {            
            await SendViaSmtpAsync(recipients.ToList(), subject, body, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email notification.");
            return false;
        }
        return true;
    }

    private async Task<bool> SendViaSmtpAsync(List<EmailRecipient> recipients, string subject, string body, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(_settings.Host))
        {
            _logger.LogWarning("SMTP provider selected but Host is not configured.");
            return false;
        }
        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(_settings.FromName, _settings.FromEmail));
        foreach (var recipient in recipients)
        {
            message.To.Add(new MailboxAddress(recipient.Name, recipient.Email));
        }
        message.Subject = subject;
        message.Body = new TextPart("html")
        {
            Text = body
        };
        var client = new SmtpClient();
        try
        {
            client.SslProtocols = System.Security.Authentication.SslProtocols.Tls12;
            client.Connect("smtp.zeptomail.in", 587, false);
            client.Authenticate(_settings.UserName, _settings.Password);
            client.Send(message);
            client.Disconnect(true);
        }

        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email via SMTP.");
            return false;
        }
        return true;
    }
}
