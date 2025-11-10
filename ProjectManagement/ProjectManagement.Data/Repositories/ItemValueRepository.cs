using Microsoft.EntityFrameworkCore;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Data.Repositories
{
    public class ItemValueRepository : GenericRepository<ItemValue>, IItemValueRepository
    {
        public ItemValueRepository(AppDbContext context) : base(context)
        {
        }

        public async Task<ItemValue> GetByItemIdAndColumnIdAsync(int itemId, int columnId)
        {
            // DİKKAT: Burada .AsNoTracking() KULLANMIYORUZ!
            // Çünkü bu metottan dönen entity'yi güncellemek isteyebiliriz.
            // EF'nin değişiklikleri takip edebilmesi için tracking'in açık olması gerekir.
            return await _context.ItemValues
                .FirstOrDefaultAsync(iv => iv.ItemId == itemId && iv.ColumnId == columnId);
        }
    }
}
