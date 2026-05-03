namespace Trexa.Api.Services.Interfaces;

public interface IEmailService
{
    Task<bool> SendAsync(IEnumerable<string> recipients, string subject, string body, CancellationToken cancellationToken = default);
}
