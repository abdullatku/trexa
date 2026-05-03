namespace Trexa.Api.Models.Auth;

public sealed class AuthServiceResult<T>
{
    public bool Success { get; init; }
    public int StatusCode { get; init; }
    public T? Data { get; init; }
    public string? Error { get; init; }

    public static AuthServiceResult<T> Ok(T data) => new()
    {
        Success = true,
        StatusCode = StatusCodes.Status200OK,
        Data = data
    };

    public static AuthServiceResult<T> Fail(int statusCode, string error) => new()
    {
        Success = false,
        StatusCode = statusCode,
        Error = error
    };
}
