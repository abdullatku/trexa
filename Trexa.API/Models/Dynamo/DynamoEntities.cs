using Amazon.DynamoDBv2.DataModel;

namespace Trexa.Api.Models.Dynamo;

[DynamoDBTable("placeholder")]
public sealed class DynamoPlan
{
    [DynamoDBHashKey("id")]
    public string Id { get; set; } = Guid.NewGuid().ToString("N");

    public string Name { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public int Interviews { get; set; }
    public List<string> Features { get; set; } = [];
    public string Duration { get; set; } = "monthly";
    public bool IsDefault { get; set; }
    public List<string> CompanyLevels { get; set; } = [];
    public string PaymentType { get; set; } = "subscription";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

[DynamoDBTable("placeholder")]
public sealed class DynamoCompanyLevel
{
    [DynamoDBHashKey("id")]
    public string Id { get; set; } = Guid.NewGuid().ToString("N");

    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

[DynamoDBTable("placeholder")]
public sealed class DynamoSubscription
{
    [DynamoDBHashKey("id")]
    public string Id { get; set; } = Guid.NewGuid().ToString("N");

    public string UserId { get; set; } = string.Empty;
    public string PlanId { get; set; } = string.Empty;
    public string Status { get; set; } = "active";
    public int InterviewsRemaining { get; set; }
    public DateTime StartDate { get; set; } = DateTime.UtcNow;
    public DateTime EndDate { get; set; } = DateTime.UtcNow.AddMonths(1);
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

[DynamoDBTable("placeholder")]
public sealed class DynamoUser
{
    [DynamoDBHashKey("id")]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    public string Email { get; set; } = string.Empty;
    public string EmailNormalized { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string Role { get; set; } = "student";
    public string Name { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public string? LinkedInProfile { get; set; }
    public string? Bio { get; set; }
    public string? Phone { get; set; }
    public List<string> TechStacks { get; set; } = [];
    public string? Company { get; set; }
}
