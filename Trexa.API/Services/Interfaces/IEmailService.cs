namespace Trexa.Api.Services.Interfaces;

public interface IEmailService
{
    Task<bool> SendAsync(IEnumerable<EmailRecipient> recipients, string subject, string body, CancellationToken cancellationToken = default);
}
