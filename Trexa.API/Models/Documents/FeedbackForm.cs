namespace Trexa.Api.Models.Documents;

public sealed class FeedbackForm
{    public string Id { get; set; } = Guid.NewGuid().ToString("N");

    public string Name { get; set; } = string.Empty;
    public List<FeedbackField> Fields { get; set; } = [];
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public sealed class FeedbackField
{
    public string Name { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public string Type { get; set; } = "text";
    public bool Required { get; set; }
}
