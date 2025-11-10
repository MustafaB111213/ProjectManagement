using ProjectManagement.Domain.Entities;

namespace ProjectManagement.Domain.Interfaces
{
    public interface IGroupRepository : IGenericRepository<Group>
    {
        Task<IEnumerable<Group>> GetAllByBoardIdAsync(int boardId);
        // Belirtilen panoya ait, belirtilen ID'deki tek bir grubu getirir.
        Task<int> GetMaxOrderAsync(int boardId);
        Task<Group> GetByIdAsync(int boardId, int groupId);
    }
}
