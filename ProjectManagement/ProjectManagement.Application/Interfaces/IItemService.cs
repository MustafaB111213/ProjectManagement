using ProjectManagement.Application.DTOs.Item;

namespace ProjectManagement.Application.Interfaces
{
    public interface IItemService 
    {
        // Belirli bir gruba ait tüm item'ları getirir (BoardId doğrulaması yapar)
        Task<IEnumerable<ItemDto>?> GetAllItemsForGroupAsync(int boardId, int groupId); // Null dönebilir

        // Belirli bir panoya ait tüm item'ları getirir (Opsiyonel - Yeni)
        Task<IEnumerable<ItemDto>?> GetAllItemsForBoardAsync(int boardId); // Null dönebilir

        // Belirli bir item'ı ID'si ile getirir (BoardId doğrulaması yapar)
        Task<ItemDto?> GetItemByIdAsync(int boardId, int itemId); // groupId kaldırıldı, Null dönebilir

        // Belirli bir grup için yeni bir item oluşturur (BoardId doğrulaması yapar)
        Task<ItemDto?> CreateItemAsync(int boardId, int groupId, CreateItemDto createItemDto); // Null dönebilir

        // Belirli bir item'ı günceller (BoardId doğrulaması yapar)
        Task<bool> UpdateItemAsync(int boardId, int itemId, UpdateItemDto updateItemDto); // groupId kaldırıldı

        // Belirli bir item'ı siler (BoardId doğrulaması yapar)
        Task<bool> DeleteItemAsync(int boardId, int itemId); // groupId kaldırıldı

        // Bir item'ı taşır (grup içi veya gruplar arası) (BoardId doğrulaması yapar)
        Task<bool> MoveItemAsync(int boardId, MoveItemDto moveItemDto);

        // Eski grup içi sıralama metodu (MoveItemAsync'i çağırabilir veya kaldırılabilir)
        // Task<bool> ReorderItemsAsync(int boardId, int groupId, ReorderItemsDto reorderItemsDto);
    }
}
