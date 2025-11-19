using AutoMapper;
using Microsoft.EntityFrameworkCore;
using ProjectManagement.Application.DTOs.Column;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Data;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Interfaces;
using System.Collections.Generic; // List ve IEnumerable için
using System.Linq; // Where, OrderBy, Any, FirstOrDefault vb. için
using System.Threading.Tasks; // Task, ToListAsync vb. için
using System; // Exception için

namespace ProjectManagement.Application.Services
{
    public class ColumnService : IColumnService
    {
        private readonly IColumnRepository _columnRepository;
        private readonly IBoardRepository _boardRepository;
        private readonly IMapper _mapper;
        private readonly AppDbContext _context; // Transaction ve toplu güncellemeler için

        public ColumnService(IColumnRepository columnRepository, IBoardRepository boardRepository, IMapper mapper, AppDbContext context)
        {
            _columnRepository = columnRepository;
            _boardRepository = boardRepository;
            _mapper = mapper;
            _context = context;
        }

        public async Task<IEnumerable<ColumnDto>?> GetAllColumnsForBoardAsync(int boardId)
        {
            var board = await _boardRepository.GetByIdAsync(boardId);
            if (board == null)
            {
                return null; // Pano bulunamadı
            }

            var columns = await _columnRepository.GetAllByBoardIdAsync(boardId); // Artık sıralı geliyor
            return _mapper.Map<IEnumerable<ColumnDto>>(columns);
        }

        public async Task<ColumnDto?> GetColumnByIdAsync(int boardId, int columnId)
        {
            var column = await _columnRepository.GetByIdAsync(boardId, columnId);
            return _mapper.Map<ColumnDto>(column); // Bulunamazsa null döner
        }

        public async Task<ColumnDto?> CreateColumnAsync(int boardId, CreateColumnDto createColumnDto)
        {
            var board = await _boardRepository.GetByIdAsync(boardId);
            if (board == null)
            {
                return null; // Pano bulunamadı
            }
            var columnEntity = _mapper.Map<Column>(createColumnDto);
            columnEntity.BoardId = boardId;

            // DÜZELTME: Artık bu metot IColumnRepository'de var ve çalışacak
            int maxOrder = await _columnRepository.GetMaxOrderAsync(boardId);
            columnEntity.Order = maxOrder + 1; // En sona ekle

            await _columnRepository.AddAsync(columnEntity);
            await _columnRepository.SaveChangesAsync();
            return _mapper.Map<ColumnDto>(columnEntity);
        }

        public async Task<bool> DeleteColumnAsync(int boardId, int columnId)
        {
            // DÜZELTME: GetByIdAsync artık AsNoTracking kullanmıyor, bu yüzden EF entity'yi izleyecek.
            var columnEntity = await _columnRepository.GetByIdAsync(boardId, columnId);
            if (columnEntity == null)
            {
                return false;
            }

            // Bu sütuna bağlı ItemValue'ları bul (Transaction içinde yapmak daha güvenli)
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var valuesToDelete = await _context.ItemValues
                    .Where(iv => iv.ColumnId == columnId)
                    .ToListAsync();

                if (valuesToDelete.Any())
                {
                    _context.ItemValues.RemoveRange(valuesToDelete);
                }

                // _columnRepository.Delete(columnEntity); // Bu metot da kullanılabilir
                _context.Columns.Remove(columnEntity); // Doğrudan context üzerinden sil

                await _context.SaveChangesAsync(); // Tüm değişiklikleri kaydet
                await transaction.CommitAsync(); // Transaction'ı onayla
                return true;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync(); // Hata olursa geri al
                Console.WriteLine($"Sütun silinirken hata (ColumnId: {columnId}): {ex.Message}");
                return false;
            }
        }

        public async Task<bool> UpdateColumnAsync(int boardId, int columnId, UpdateColumnDto updateColumnDto)
        {
            // DÜZELTME: GetByIdAsync artık AsNoTracking kullanmıyor, EF entity'yi izliyor.
            var column = await _columnRepository.GetByIdAsync(boardId, columnId);
            if (column == null)
            {
                return false;
            }

            _mapper.Map(updateColumnDto, column);

            // Eğer frontend'den bir ayar geldiyse veritabanına yaz
            if (updateColumnDto.Settings != null)
            {
                column.Settings = updateColumnDto.Settings;
            }

            // _columnRepository.Update(column); // Zaten izlendiği için buna gerek yok
            await _columnRepository.SaveChangesAsync(); // Değişiklikleri kaydet
            return true;
        }

        // YENİ METOT: Sütunları yeniden sıralar
        public async Task<bool> ReorderColumnsAsync(int boardId, ReorderColumnsDto dto)
        {
            var boardExists = await _context.Boards.AnyAsync(b => b.Id == boardId);
            if (!boardExists) return false; // Pano bulunamadı

            // Panodaki TİCARET sütunlarını (takip edilebilir modda) çek
            // (BoardView'da sadece 'columns' map ediliyor, 'item name' vs. sabit)
            var columnsToUpdate = await _context.Columns
                .Where(c => c.BoardId == boardId && dto.OrderedColumnIds.Contains(c.Id))
                .ToListAsync();

            // ID sayıları eşleşiyor mu kontrolü
            if (columnsToUpdate.Count != dto.OrderedColumnIds.Count)
            {
                Console.WriteLine("Hata: Reorder için gönderilen sütun ID'leri veritabanı ile eşleşmiyor.");
                return false;
            }

            // Her sütunun yeni Order değerini ayarla
            for (int i = 0; i < dto.OrderedColumnIds.Count; i++)
            {
                int columnId = dto.OrderedColumnIds[i];
                var column = columnsToUpdate.FirstOrDefault(c => c.Id == columnId);
                if (column != null)
                {
                    column.Order = i; // Dizideki index'i yeni Order değeri yap
                }
            }

            try
            {
                await _context.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Sütun sırası kaydedilirken hata: {ex.Message}");
                return false;
            }
        }
    }
}