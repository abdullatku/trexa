using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.Model;
using Microsoft.AspNetCore.Identity;
using Trexa.Api.Models.Identity;
using Trexa.Api.Settings;

namespace Trexa.Api.Extensions;

public static class DynamoTableInitializer
{
    public static async Task EnsureTablesExistAsync(IAmazonDynamoDB client, DynamoDbSettings settings, CancellationToken cancellationToken = default)
    {
        var tableNames = new[]
        {
            settings.UsersTable,
            settings.InterviewsTable,
            settings.PaymentsTable,
            settings.DesignationsTable,
            settings.DesignationRequestsTable,
            settings.FeedbackFormsTable,
            settings.AvailabilityTable,
            settings.PlansTable,
            settings.CompanyLevelsTable,
            settings.SubscriptionsTable,
            settings.AppSettingsTable
        }
        .Where(name => !string.IsNullOrWhiteSpace(name))
        .Distinct(StringComparer.Ordinal)
        .ToArray();

        foreach (var tableName in tableNames)
        {
            if (await ExistsAsync(client, tableName, cancellationToken))
            {
                continue;
            }

            await client.CreateTableAsync(new CreateTableRequest
            {
                TableName = tableName,
                BillingMode = BillingMode.PAY_PER_REQUEST,
                AttributeDefinitions =
                [
                    new AttributeDefinition("id", ScalarAttributeType.S)
                ],
                KeySchema =
                [
                    new KeySchemaElement("id", KeyType.HASH)
                ]
            }, cancellationToken);
        }

        if (settings.SeedSampleData)
        {
            await SeedSampleDataAsync(client, settings, cancellationToken);
        }
    }

    private static async Task<bool> ExistsAsync(IAmazonDynamoDB client, string tableName, CancellationToken cancellationToken)
    {
        try
        {
            await client.DescribeTableAsync(new DescribeTableRequest { TableName = tableName }, cancellationToken);
            return true;
        }
        catch (ResourceNotFoundException)
        {
            return false;
        }
    }

    private static async Task SeedSampleDataAsync(IAmazonDynamoDB client, DynamoDbSettings settings, CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow.ToString("O");

        await SeedIfEmptyAsync(client, settings.PlansTable,
        [
            new Dictionary<string, AttributeValue>
            {
                ["Id"] = new("plan_free"),
                ["Name"] = new("Free"),
                ["Price"] = new() { N = "0" },
                ["Interviews"] = new() { N = "1" },
                ["Duration"] = new("monthly"),
                ["IsDefault"] = new() { BOOL = true },
                ["Features"] = new() { SS = ["1 mock interview", "Basic feedback"] },
                ["CompanyLevels"] = new() { SS = ["entry"] },
                ["PaymentType"] = new("subscription"),
                ["CreatedAt"] = new(now)
            },
            new Dictionary<string, AttributeValue>
            {
                ["Id"] = new("plan_starter"),
                ["Name"] = new("Starter"),
                ["Price"] = new() { N = "999" },
                ["Interviews"] = new() { N = "3" },
                ["Duration"] = new("monthly"),
                ["IsDefault"] = new() { BOOL = false },
                ["Features"] = new() { SS = ["3 interviews", "Detailed feedback", "Video recordings"] },
                ["CompanyLevels"] = new() { SS = ["entry", "mid"] },
                ["PaymentType"] = new("subscription"),
                ["CreatedAt"] = new(now)
            }
        ], cancellationToken);

        await SeedIfEmptyAsync(client, settings.CompanyLevelsTable,
        [
            new Dictionary<string, AttributeValue>
            {
                ["Id"] = new("entry"),
                ["Name"] = new("Entry"),
                ["Description"] = new("Fresher and junior level roles"),
                ["CreatedAt"] = new(now)
            },
            new Dictionary<string, AttributeValue>
            {
                ["Id"] = new("mid"),
                ["Name"] = new("Mid"),
                ["Description"] = new("2-5 years experience roles"),
                ["CreatedAt"] = new(now)
            }
        ], cancellationToken);

        await SeedIfEmptyAsync(client, settings.DesignationsTable,
        [
            new Dictionary<string, AttributeValue>
            {
                ["Id"] = new("desig_sde1"),
                ["Name"] = new("Software Engineer I"),
                ["Description"] = new("Entry-level backend/software engineer"),
                ["CreatedAt"] = new(now)
            },
            new Dictionary<string, AttributeValue>
            {
                ["Id"] = new("desig_frontend"),
                ["Name"] = new("Frontend Developer"),
                ["Description"] = new("Frontend/UI engineering role"),
                ["CreatedAt"] = new(now)
            }
        ], cancellationToken);

        await SeedIfEmptyAsync(client, settings.FeedbackFormsTable,
        [
            new Dictionary<string, AttributeValue>
            {
                ["Id"] = new("feedback_default"),
                ["Name"] = new("Default Interview Feedback"),
                ["CreatedAt"] = new(now)
            }
        ], cancellationToken);

        await SeedAdminIfMissingAsync(client, settings, cancellationToken);
        await SeedInterviewersIfMissingAsync(client, settings, cancellationToken);
    }

    private static async Task SeedIfEmptyAsync(
        IAmazonDynamoDB client,
        string tableName,
        List<Dictionary<string, AttributeValue>> items,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(tableName) || items.Count == 0)
        {
            return;
        }

        var existing = await client.ScanAsync(new ScanRequest
        {
            TableName = tableName,
            Limit = 1,
            Select = Select.COUNT
        }, cancellationToken);

        if (existing.Count > 0)
        {
            return;
        }

        foreach (var item in items)
        {
            var hashKeyName = await GetHashKeyNameAsync(client, tableName, cancellationToken);
            EnsureHashKey(item, hashKeyName);

            await client.PutItemAsync(new PutItemRequest
            {
                TableName = tableName,
                Item = item
            }, cancellationToken);
        }
    }

    private static async Task<string> GetHashKeyNameAsync(IAmazonDynamoDB client, string tableName, CancellationToken cancellationToken)
    {
        var describe = await client.DescribeTableAsync(new DescribeTableRequest { TableName = tableName }, cancellationToken);
        return describe.Table.KeySchema.First(k => k.KeyType == KeyType.HASH).AttributeName;
    }

    private static void EnsureHashKey(Dictionary<string, AttributeValue> item, string hashKeyName)
    {
        if (item.ContainsKey(hashKeyName))
        {
            return;
        }

        if (item.TryGetValue("Id", out var idValue))
        {
            item[hashKeyName] = idValue;
            return;
        }

        if (item.TryGetValue("id", out var lowerIdValue))
        {
            item[hashKeyName] = lowerIdValue;
            return;
        }

        throw new InvalidOperationException($"Seed item does not contain an id field for required hash key `{hashKeyName}`.");
    }

    private static async Task SeedInterviewersIfMissingAsync(IAmazonDynamoDB client, DynamoDbSettings settings, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(settings.UsersTable))
        {
            return;
        }

        var existingInterviewers = await client.ScanAsync(new ScanRequest
        {
            TableName = settings.UsersTable,
            Select = Select.COUNT,
            Limit = 1,
            FilterExpression = "#role = :role",
            ExpressionAttributeNames = new Dictionary<string, string>
            {
                ["#role"] = "Role"
            },
            ExpressionAttributeValues = new Dictionary<string, AttributeValue>
            {
                [":role"] = new("interviewer")
            }
        }, cancellationToken);

        if (existingInterviewers.Count > 0)
        {
            return;
        }

        var now = DateTime.UtcNow;
        var users = new[]
        {
            new ApplicationUser
            {
                Id = Guid.Parse("11111111-1111-1111-1111-111111111111"),
                Email = "interviewer.one@trexa.dev",
                UserName = "interviewer.one@trexa.dev",
                Name = "Interviewer One",
                Role = "interviewer",
                TechStacks = ["dotnet", "dynamodb", "system-design"],
                Company = "Trexa Labs",
                CreatedAt = now
            },
            new ApplicationUser
            {
                Id = Guid.Parse("22222222-2222-2222-2222-222222222222"),
                Email = "interviewer.two@trexa.dev",
                UserName = "interviewer.two@trexa.dev",
                Name = "Interviewer Two",
                Role = "interviewer",
                TechStacks = ["frontend", "react", "javascript"],
                Company = "Trexa Labs",
                CreatedAt = now
            },
            new ApplicationUser
            {
                Id = Guid.Parse("33333333-3333-3333-3333-333333333333"),
                Email = "interviewer.three@trexa.dev",
                UserName = "interviewer.three@trexa.dev",
                Name = "Interviewer Three",
                Role = "interviewer",
                TechStacks = ["java", "spring", "microservices"],
                Company = "Trexa Labs",
                CreatedAt = now
            }
        };

        var hashKeyName = await GetHashKeyNameAsync(client, settings.UsersTable, cancellationToken);
        var hasher = new PasswordHasher<ApplicationUser>();

        foreach (var user in users)
        {
            var passwordHash = hasher.HashPassword(user, "Interviewer@123");
            var item = new Dictionary<string, AttributeValue>
            {
                ["Id"] = new(user.Id.ToString()),
                ["Email"] = new(user.Email!),
                ["EmailNormalized"] = new(user.Email!),
                ["UserName"] = new(user.UserName!),
                ["PasswordHash"] = new(passwordHash),
                ["Role"] = new("interviewer"),
                ["Name"] = new(user.Name),
                ["CreatedAt"] = new(user.CreatedAt.ToString("O")),
                ["EmailVerified"] = new AttributeValue { BOOL = true },
                ["TechStacks"] = new AttributeValue { SS = user.TechStacks },
                ["Company"] = new(user.Company!)
            };

            EnsureHashKey(item, hashKeyName);

            await client.PutItemAsync(new PutItemRequest
            {
                TableName = settings.UsersTable,
                Item = item
            }, cancellationToken);
        }
    }

    private static async Task SeedAdminIfMissingAsync(IAmazonDynamoDB client, DynamoDbSettings settings, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(settings.UsersTable))
        {
            return;
        }

        var existingAdmins = await client.ScanAsync(new ScanRequest
        {
            TableName = settings.UsersTable,
            Select = Select.COUNT,
            Limit = 1,
            FilterExpression = "#role = :role",
            ExpressionAttributeNames = new Dictionary<string, string>
            {
                ["#role"] = "Role"
            },
            ExpressionAttributeValues = new Dictionary<string, AttributeValue>
            {
                [":role"] = new("admin")
            }
        }, cancellationToken);

        if (existingAdmins.Count > 0)
        {
            return;
        }

        var now = DateTime.UtcNow;
        var admin = new ApplicationUser
        {
            Id = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
            Email = "admin@trexa.dev",
            UserName = "admin@trexa.dev",
            Name = "Trexa Admin",
            Role = "admin",
            TechStacks = ["platform", "operations"],
            Company = "Trexa Labs",
            CreatedAt = now
        };

        var hashKeyName = await GetHashKeyNameAsync(client, settings.UsersTable, cancellationToken);
        var hasher = new PasswordHasher<ApplicationUser>();
        var passwordHash = hasher.HashPassword(admin, "Admin@123");

        var item = new Dictionary<string, AttributeValue>
        {
            ["Id"] = new(admin.Id.ToString()),
            ["Email"] = new(admin.Email!),
            ["EmailNormalized"] = new(admin.Email!),
            ["UserName"] = new(admin.UserName!),
            ["PasswordHash"] = new(passwordHash),
            ["Role"] = new("admin"),
            ["Name"] = new(admin.Name),
            ["CreatedAt"] = new(admin.CreatedAt.ToString("O")),
            ["EmailVerified"] = new AttributeValue { BOOL = true },
            ["TechStacks"] = new AttributeValue { SS = admin.TechStacks },
            ["Company"] = new(admin.Company!)
        };

        EnsureHashKey(item, hashKeyName);

        await client.PutItemAsync(new PutItemRequest
        {
            TableName = settings.UsersTable,
            Item = item
        }, cancellationToken);
    }
}
