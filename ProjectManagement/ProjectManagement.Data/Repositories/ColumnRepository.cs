using Microsoft.EntityFrameworkCore;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Interfaces;
using System.Collections.Generic; // List ve IEnumerable için
using System.Linq; // OrderBy, Where, MaxAsync vb. için
using System.Threading.Tasks; // Task, ToListAsync vb. için

namespace ProjectManagement.Data.Repositories
{
    public class ColumnRepository : GenericRepository<Column>, IColumnRepository
    {
        public ColumnRepository(AppDbContext context) : base(context)
        {
        }

        public async Task<IEnumerable<Column>> GetAllByBoardIdAsync(int boardId)
        {
            return await _context.Columns
                .Where(c => c.BoardId == boardId)
                .OrderBy(c => c.Order) // YENİ: Order'a göre sırala
                .AsNoTracking()
                .ToListAsync();
        }

        public async Task<Column?> GetByIdAsync(int boardId, int columnId)
        {
            // GÜNCELLEME: AsNoTracking kaldırıldı.
            // Bu entity servis katmanında güncellenebilir veya silinebilir.
            return await _context.Columns
                .FirstOrDefaultAsync(c => c.Id == columnId && c.BoardId == boardId);
        }

        // YENİ METOT: Panodaki en yüksek 'Order' değerini alır
        public async Task<int> GetMaxOrderAsync(int boardId)
        {
            // O panoda herhangi bir sütun var mı diye kontrol et
            bool anyColumns = await _context.Columns.AnyAsync(c => c.BoardId == boardId);

            if (!anyColumns)
            {
                // Hiç sütun yoksa, ilk sütunun sırası için -1 döndür
                // (CreateColumnAsync içinde +1 yapacağını varsayarsak)
                return -1;
            }

            // Eğer sütunlar varsa, en yüksek Order değerini bul ve döndür
            return await _context.Columns
                                 .Where(c => c.BoardId == boardId)
                                 .MaxAsync(c => c.Order);
        }
    }
}