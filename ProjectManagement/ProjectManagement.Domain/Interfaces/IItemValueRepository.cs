using ProjectManagement.Domain.Entities;

namespace ProjectManagement.Domain.Interfaces
{
    public interface IItemValueRepository : IGenericRepository<ItemValue>
    {
        // Belirtilen item ve column'a ait ItemValue'yu bulur. "Upsert" için kritiktir.
        Task<ItemValue> GetByItemIdAndColumnIdAsync(int itemId, int columnId);
    }
}
