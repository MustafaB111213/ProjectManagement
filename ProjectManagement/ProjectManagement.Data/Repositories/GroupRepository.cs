using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace ProjectManagement.Data.Repositories
{
    public class GroupRepository : GenericRepository<Group>, IGroupRepository
    {
        // base(context) diyerek GenericRepository'nin constructor'ını çağırıyoruz.
        public GroupRepository(AppDbContext context) : base(context)
        {

        }

        public async Task<IEnumerable<Group>> GetAllByBoardIdAsync(int boardId)
        {
            // Entity Framework sorgusu artık Repository içinde, ait olduğu yerde.
            return await _context.Groups
                .Where(g => g.BoardId == boardId)
                .OrderBy(g => g.Order)
                .AsNoTracking() // Sadece okuma yapacağımız için performansı artırır
                .ToListAsync();
        }
        public async Task<int> GetMaxOrderAsync(int boardId)
        {
            // Önce o panoda herhangi bir grup var mı diye kontrol et
            bool anyGroups = await _context.Groups.AnyAsync(g => g.BoardId == boardId);

            if (!anyGroups)
            {
                // Hiç grup yoksa, ilk grubun sırası için -1 döndür
                // (CreateGroupAsync içinde +1 yapacağını varsayarsak)
                return -1;
            }

            // Eğer gruplar varsa, en yüksek Order değerini bul ve döndür
            // DefaultIfEmpty olmadan, sadece MaxAsync kullan
            return await _context.Groups
                                 .Where(g => g.BoardId == boardId)
                                 .MaxAsync(g => g.Order); // g => g.Order selector'ını ekle
        }
        public async Task<Group> GetByIdAsync(int boardId, int groupId)
        {
            // Hem grup ID'sinin hem de pano ID'sinin eşleştiği kaydı bul.
            return await _context.Groups
                // DÜZELTME: Bu metottan dönen entity'yi güncellemek isteyebileceğimiz için,
                // EF'nin değişiklikleri izleyebilmesi adına .AsNoTracking() buradan KALDIRILDI.
                //.AsNoTracking()
                .FirstOrDefaultAsync(g => g.Id == groupId && g.BoardId == boardId);
        }
    }
}
