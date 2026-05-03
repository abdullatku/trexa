using Trexa.Api.Models.Documents;
using Trexa.Api.Models.Dynamo;

namespace Trexa.Api.Repositories.Dynamo;

internal static class DynamoMappers
{
    public static Plan ToDomain(this DynamoPlan item) => new()
    {
        Id = item.Id,
        Name = item.Name,
        Price = item.Price,
        Interviews = item.Interviews,
        Features = item.Features,
        Duration = item.Duration,
        IsDefault = item.IsDefault,
        CompanyLevels = item.CompanyLevels,
        PaymentType = item.PaymentType,
        CreatedAt = item.CreatedAt
    };

    public static DynamoPlan ToDynamo(this Plan item) => new()
    {
        Id = item.Id,
        Name = item.Name,
        Price = item.Price,
        Interviews = item.Interviews,
        Features = item.Features,
        Duration = item.Duration,
        IsDefault = item.IsDefault,
        CompanyLevels = item.CompanyLevels,
        PaymentType = item.PaymentType,
        CreatedAt = item.CreatedAt
    };

    public static CompanyLevel ToDomain(this DynamoCompanyLevel item) => new()
    {
        Id = item.Id,
        Name = item.Name,
        Description = item.Description,
        CreatedAt = item.CreatedAt
    };

    public static DynamoCompanyLevel ToDynamo(this CompanyLevel item) => new()
    {
        Id = item.Id,
        Name = item.Name,
        Description = item.Description,
        CreatedAt = item.CreatedAt
    };

    public static Subscription ToDomain(this DynamoSubscription item) => new()
    {
        Id = item.Id,
        UserId = item.UserId,
        PlanId = item.PlanId,
        Status = item.Status,
        InterviewsRemaining = item.InterviewsRemaining,
        StartDate = item.StartDate,
        EndDate = item.EndDate,
        CreatedAt = item.CreatedAt
    };

    public static DynamoSubscription ToDynamo(this Subscription item) => new()
    {
        Id = item.Id,
        UserId = item.UserId,
        PlanId = item.PlanId,
        Status = item.Status,
        InterviewsRemaining = item.InterviewsRemaining,
        StartDate = item.StartDate,
        EndDate = item.EndDate,
        CreatedAt = item.CreatedAt
    };
}
