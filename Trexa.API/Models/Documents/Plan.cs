namespace Trexa.Api.Models.Documents;

public sealed class Plan
{    public string Id { get; set; } = Guid.NewGuid().ToString("N");

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
