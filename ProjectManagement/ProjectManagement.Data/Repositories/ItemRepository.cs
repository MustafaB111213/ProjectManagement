using Microsoft.EntityFrameworkCore;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Data.Repositories
{
    public class ItemRepository : GenericRepository<Item>, IItemRepository
    {
        public ItemRepository(AppDbContext context) : base(context)
        {

        }

        // Belirli bir gruba ait tüm item'ları sıralı getirir (ItemValues dahil)
        public async Task<IEnumerable<Item>> GetAllByGroupIdAsync(int groupId)
        {
            return await _context.Items
                .Include(i => i.ItemValues) // İlişkili değerleri getir
                .Where(i => i.GroupId == groupId)
                .OrderBy(i => i.Order) // Sıralı getir
                .AsNoTracking() // Sadece okuma için
                .ToListAsync();
        }

        // Bir item'ı ID'si ile getirir (Group ve ItemValues dahil)
        // Güncelleme/Silme işlemleri için AsNoTracking KULLANILMAMALI!
        public async Task<Item?> GetByIdWithIncludesAsync(int itemId)
        {
            return await _context.Items
                .Include(i => i.Group) // BoardId kontrolü için Group gerekli
                .Include(i => i.ItemValues) // Değerleri de getirelim
                .FirstOrDefaultAsync(i => i.Id == itemId); // Sadece ID ile bul
        }


        // Belirli bir gruptaki en yüksek Order değerini getirir
        public async Task<int> GetMaxOrderAsync(int groupId)
        {
            // O grupta item var mı diye kontrol et
            bool anyItems = await _context.Items.AnyAsync(i => i.GroupId == groupId);

            if (!anyItems)
            {
                // Hiç item yoksa, ilk item'ın sırası için -1 döndür
                return -1;
            }           

            // Eğer item'lar varsa, en yüksek Order değerini bul ve döndür
            return await _context.Items
                                 .Where(i => i.GroupId == groupId)
                                 .MaxAsync(i => i.Order);
        }

        // Belirli bir board'a ait tüm item'ları getirir (opsiyonel)
        public async Task<IEnumerable<Item>> GetAllByBoardIdAsync(int boardId)
        {
            return await _context.Items
               .Include(i => i.ItemValues)
               .Where(i => i.Group != null && i.Group.BoardId == boardId) // Group ilişkisi üzerinden BoardId kontrolü
               .OrderBy(i => i.GroupId).ThenBy(i => i.Order) // Önce gruba sonra kendi sırasına göre sırala (isteğe bağlı)
               .AsNoTracking()
               .ToListAsync();
        }
    }
}
