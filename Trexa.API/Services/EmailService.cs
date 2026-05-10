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
        var recipientList = recipients
            .Where(recipient => !string.IsNullOrWhiteSpace(recipient.Email))
            .ToList();

        if (recipientList.Count == 0)
        {
            _logger.LogWarning("No valid email recipients were provided.");
            return false;
        }

        try
        {
            var htmlBody = BuildTrexaHtmlEmail(subject, body);
            await SendViaSmtpAsync(recipientList, subject, htmlBody, cancellationToken);
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

    private static string BuildTrexaHtmlEmail(string subject, string body)
    {
        var content = BuildHtmlContent(body);
        var encodedSubject = WebUtility.HtmlEncode(subject);

        return $$"""
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{{encodedSubject}}</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;color:#111827;font-family:Inter,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;color:transparent;opacity:0;">
    {{encodedSubject}}
  </div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;margin:0;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border:1px solid #e5e7eb;border-radius:18px;overflow:hidden;box-shadow:0 18px 42px rgba(15,23,42,0.08);">
          <tr>
            <td style="padding:28px 32px;background:linear-gradient(135deg,#eef2ff 0%,#ffffff 70%);border-bottom:1px solid #e5e7eb;">
              <div style="font-size:34px;line-height:1;font-weight:800;letter-spacing:-0.03em;color:#050816;">trexa</div>
              <div style="margin-top:10px;font-size:13px;line-height:20px;color:#4f46e5;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;">Mock Interview Platform</div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 18px 0;font-size:24px;line-height:32px;font-weight:700;color:#111827;">{{encodedSubject}}</h1>
              <div style="font-size:16px;line-height:26px;color:#374151;">
                {{content}}
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:22px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:13px;line-height:20px;color:#6b7280;">
                This message was sent by Trexa. If you were not expecting this email, you can safely ignore it.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
""";
    }

    private static string BuildHtmlContent(string body)
    {
        if (string.IsNullOrWhiteSpace(body))
        {
            return string.Empty;
        }

        var lines = body.Replace("\r\n", "\n").Split('\n');
        var html = new System.Text.StringBuilder();

        foreach (var line in lines)
        {
            var trimmed = line.Trim();
            if (string.IsNullOrWhiteSpace(trimmed))
            {
                html.Append("<div style=\"height:12px;line-height:12px;\">&nbsp;</div>");
                continue;
            }

            if (Uri.TryCreate(trimmed, UriKind.Absolute, out var uri) && uri.Scheme is "http" or "https")
            {
                var encodedUrl = WebUtility.HtmlEncode(trimmed);
                html.Append($$"""
<p style="margin:18px 0;">
  <a href="{{encodedUrl}}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-weight:700;border-radius:10px;padding:12px 18px;">Open in Trexa</a>
</p>
<p style="margin:8px 0 0 0;font-size:13px;line-height:20px;color:#6b7280;word-break:break-all;">{{encodedUrl}}</p>
""");
                continue;
            }

            html.Append("<p style=\"margin:0 0 10px 0;\">");
            html.Append(WebUtility.HtmlEncode(trimmed));
            html.Append("</p>");
        }

        return html.ToString();
    }
}
