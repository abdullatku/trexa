namespace Trexa.Api.Settings;

public sealed class DynamoDbSettings
{
    public bool AutoCreateTables { get; set; } = true;
    public bool SeedSampleData { get; set; } = true;
    public string Region { get; set; } = "ap-south-1";
    public string? ServiceUrl { get; set; }
    public string? AccessKey { get; set; }
    public string? SecretKey { get; set; }
    public string? SessionToken { get; set; }
    public string UsersTable { get; set; } = "trexa_users";
    public string InterviewsTable { get; set; } = "trexa_interviews";
    public string PaymentsTable { get; set; } = "trexa_payments";
    public string DesignationsTable { get; set; } = "trexa_designations";
    public string DesignationRequestsTable { get; set; } = "trexa_designation_requests";
    public string FeedbackFormsTable { get; set; } = "trexa_feedback_forms";
    public string AvailabilityTable { get; set; } = "trexa_availability";
    public string PlansTable { get; set; } = "trexa_plans";
    public string CompanyLevelsTable { get; set; } = "trexa_company_levels";
    public string SubscriptionsTable { get; set; } = "trexa_subscriptions";
    public string AppSettingsTable { get; set; } = "trexa_app_settings";
}
