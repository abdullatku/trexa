using System.Collections.Concurrent;
using System.Reflection;
using System.Text.Json;
using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.Model;
using Amazon.Runtime;
using Trexa.Api.Repositories.Interfaces;

namespace Trexa.Api.Repositories.Dynamo;

public sealed class DynamoDocumentStore : IDynamoDocumentStore
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private readonly IAmazonDynamoDB _client;
    private readonly ConcurrentDictionary<string, string> _hashKeyByTable = new(StringComparer.Ordinal);

    public DynamoDocumentStore(IAmazonDynamoDB client)
    {
        _client = client;
    }

    public async Task<List<T>> ScanAsync<T>(string tableName, CancellationToken cancellationToken = default) where T : class, new()
    {
        var items = new List<T>();
        Dictionary<string, AttributeValue>? lastEvaluatedKey = null;

        do
        {
            var response = await _client.ScanAsync(new ScanRequest
            {
                TableName = tableName,
                ExclusiveStartKey = lastEvaluatedKey
            }, cancellationToken);

            foreach (var item in response.Items)
            {
                var deserialized = DeserializeItem<T>(item);
                if (deserialized is not null)
                {
                    items.Add(deserialized);
                }
            }

            lastEvaluatedKey = response.LastEvaluatedKey;
        }
        while (lastEvaluatedKey is { Count: > 0 });

        return items;
    }

    public async Task<T?> GetByIdAsync<T>(string tableName, string id, CancellationToken cancellationToken = default) where T : class, new()
    {
        var hashKey = await GetHashKeyNameAsync(tableName, cancellationToken);
        var response = await _client.GetItemAsync(new GetItemRequest
        {
            TableName = tableName,
            Key = new Dictionary<string, AttributeValue>
            {
                [hashKey] = new(id)
            }
        }, cancellationToken);

        return response.Item is null || response.Item.Count == 0 ? null : DeserializeItem<T>(response.Item);
    }

    public async Task UpsertAsync<T>(string tableName, T document, CancellationToken cancellationToken = default) where T : class, new()
    {
        var hashKey = await GetHashKeyNameAsync(tableName, cancellationToken);
        var id = EnsureId(document);
        var payload = JsonSerializer.Serialize(document, JsonOptions);

        await _client.PutItemAsync(new PutItemRequest
        {
            TableName = tableName,
            Item = new Dictionary<string, AttributeValue>
            {
                [hashKey] = new(id),
                ["payload"] = new(payload),
                ["updatedAt"] = new(DateTime.UtcNow.ToString("O"))
            }
        }, cancellationToken);
    }

    public async Task<bool> DeleteByIdAsync(string tableName, string id, CancellationToken cancellationToken = default)
    {
        var hashKey = await GetHashKeyNameAsync(tableName, cancellationToken);
        var response = await _client.DeleteItemAsync(new DeleteItemRequest
        {
            TableName = tableName,
            Key = new Dictionary<string, AttributeValue>
            {
                [hashKey] = new(id)
            },
            ReturnValues = ReturnValue.ALL_OLD
        }, cancellationToken);

        return response.Attributes.Count > 0;
    }

    private async Task<string> GetHashKeyNameAsync(string tableName, CancellationToken cancellationToken)
    {
        if (_hashKeyByTable.TryGetValue(tableName, out var cached))
        {
            return cached;
        }

        try
        {
            var describe = await _client.DescribeTableAsync(new DescribeTableRequest
            {
                TableName = tableName
            }, cancellationToken);

            var hashKey = describe.Table.KeySchema.First(x => x.KeyType == KeyType.HASH).AttributeName;
            _hashKeyByTable[tableName] = hashKey;
            return hashKey;
        }
        catch (AmazonDynamoDBException ex) when (ex.StatusCode == System.Net.HttpStatusCode.BadRequest || ex.ErrorCode == "ResourceNotFoundException")
        {
            _hashKeyByTable[tableName] = "id";
            return "id";
        }
    }

    private static string EnsureId<T>(T document) where T : class
    {
        var idProperty = typeof(T).GetProperty("Id", BindingFlags.Public | BindingFlags.Instance);
        if (idProperty is null || idProperty.PropertyType != typeof(string))
        {
            throw new InvalidOperationException($"{typeof(T).Name} must define a string Id property.");
        }

        var idValue = idProperty.GetValue(document) as string;
        if (!string.IsNullOrWhiteSpace(idValue))
        {
            return idValue;
        }

        var generated = Guid.NewGuid().ToString("N");
        idProperty.SetValue(document, generated);
        return generated;
    }

    private static T? DeserializeItem<T>(Dictionary<string, AttributeValue> item) where T : class, new()
    {
        if (item.TryGetValue("payload", out var payload) && !string.IsNullOrWhiteSpace(payload.S))
        {
            return JsonSerializer.Deserialize<T>(payload.S, JsonOptions);
        }

        var mapped = item.ToDictionary(
            kvp => kvp.Key,
            kvp => AttributeValueToObject(kvp.Value));

        var json = JsonSerializer.Serialize(mapped, JsonOptions);
        return JsonSerializer.Deserialize<T>(json, JsonOptions);
    }

    private static object? AttributeValueToObject(AttributeValue value)
    {
        if (value.S is not null) return value.S;
        if (value.N is not null)
        {
            if (long.TryParse(value.N, out var l)) return l;
            if (decimal.TryParse(value.N, out var d)) return d;
            return value.N;
        }
        if (value.BOOL.HasValue) return value.BOOL.Value;
        if (value.NULL == true) return null;
        if (value.SS is { Count: > 0 }) return value.SS;
        if (value.NS is { Count: > 0 }) return value.NS;
        if (value.L is { Count: > 0 }) return value.L.Select(AttributeValueToObject).ToList();
        if (value.M is { Count: > 0 }) return value.M.ToDictionary(x => x.Key, x => AttributeValueToObject(x.Value));
        return null;
    }
}
