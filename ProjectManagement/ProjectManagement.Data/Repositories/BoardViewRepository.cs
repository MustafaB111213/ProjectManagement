using Microsoft.EntityFrameworkCore;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Data.Repositories
{
    public class BoardViewRepository : GenericRepository<BoardView>, IBoardViewRepository
    {
        private readonly AppDbContext _context;
        public BoardViewRepository(AppDbContext context) : base(context) 
        {
            _context = context;
        }
        public async Task<IReadOnlyList<BoardView>> GetViewsByBoardIdAsync(int boardId)
        {
            return await _context.BoardViews
                                             .Where(v => v.BoardId == boardId)
                                             .OrderBy(v => v.Order) // Sıraya göre getir
                                             .AsNoTracking()        // Performans için (sadece okuma)
                                             .ToListAsync();
        }

        
    }
}
