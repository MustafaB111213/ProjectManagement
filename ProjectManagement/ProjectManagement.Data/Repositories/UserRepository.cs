using Microsoft.EntityFrameworkCore;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Data.Repositories
{
    public class UserRepository : GenericRepository<User>, IUserRepository
    {
        public UserRepository(AppDbContext context) : base(context)
        {

        }

        public async Task<User> GetByEmailAsync(string email)
        {
            return await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Email == email);
        }

        public async Task<User> GetByUsernameAsync(string username)
        {
            return await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Username == username);
        }

        public async Task<bool> IsEmailUniqueAsync(string email, int? currentUserId = null)
        {
            return !await _context.Users
                .AsNoTracking()
                .AnyAsync(u => u.Email == email && u.Id != currentUserId);
        }

        public async Task<bool> IsUsernameUniqueAsync(string username, int? currentUserId = null)
        {
            return !await _context.Users
                .AsNoTracking()
                .AnyAsync(u => u.Username == username && u.Id != currentUserId);
        }
    }
}
