namespace Trexa.Api.Repositories.Interfaces;

public interface IDynamoDocumentStore
{
    Task<List<T>> ScanAsync<T>(string tableName, CancellationToken cancellationToken = default) where T : class, new();
    Task<T?> GetByIdAsync<T>(string tableName, string id, CancellationToken cancellationToken = default) where T : class, new();
    Task UpsertAsync<T>(string tableName, T document, CancellationToken cancellationToken = default) where T : class, new();
    Task<bool> DeleteByIdAsync(string tableName, string id, CancellationToken cancellationToken = default);
}
