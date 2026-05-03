namespace Trexa.Api.Models.Identity;

public sealed class ApplicationRole
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string NormalizedName { get; set; } = string.Empty;

    public ApplicationRole() { }

    public ApplicationRole(string roleName)
    {
        Name = roleName;
        NormalizedName = roleName.ToUpperInvariant();
    }
}
