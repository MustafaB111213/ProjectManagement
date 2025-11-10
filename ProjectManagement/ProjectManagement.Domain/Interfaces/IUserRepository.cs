using ProjectManagement.Domain.Entities;

namespace ProjectManagement.Domain.Interfaces
{
    public interface IUserRepository : IGenericRepository<User>
    {
        Task<User> GetByUsernameAsync(string username);

        Task<User> GetByEmailAsync(string email);

        Task<bool> IsEmailUniqueAsync(string email, int? currentUserId = null);

        Task<bool> IsUsernameUniqueAsync(string username, int? currentUserId = null);
    }
}
