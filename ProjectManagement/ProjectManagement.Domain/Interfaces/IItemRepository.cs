using ProjectManagement.Domain.Entities;

namespace ProjectManagement.Domain.Interfaces
{
    public interface IItemRepository : IGenericRepository<Item>
    {
        // Belirli bir gruba ait TÜM item'ları (sıralı şekilde) getirir.
        Task<IEnumerable<Item>> GetAllByGroupIdAsync(int groupId);

        // Belirli bir item'ı SADECE ID'si ile getirir (ilişkili verilerle birlikte).
        Task<Item?> GetByIdWithIncludesAsync(int itemId); // Null dönebilir

        // Belirli bir gruptaki en yüksek Order değerini getirir.
        Task<int> GetMaxOrderAsync(int groupId);

        // Belirli bir board'a ait TÜM item'ları getirir (opsiyonel).
        Task<IEnumerable<Item>> GetAllByBoardIdAsync(int boardId);
    }
}
