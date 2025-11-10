using ProjectManagement.Domain.Entities;

namespace ProjectManagement.Domain.Interfaces
{
    public interface IBoardViewRepository : IGenericRepository<BoardView> 
    {
        Task<IReadOnlyList<BoardView>> GetViewsByBoardIdAsync(int boardId);
    }
}
