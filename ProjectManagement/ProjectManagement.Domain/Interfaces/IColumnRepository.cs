using ProjectManagement.Domain.Entities;

namespace ProjectManagement.Domain.Interfaces
{
    public interface IColumnRepository : IGenericRepository<Column>
    {
        // Panodaki tüm sütunları 'Order'a göre sıralanmış getirir
        Task<IEnumerable<Column>> GetAllByBoardIdAsync(int boardId);

        // Belirli bir sütunu ID ile getirir (BoardId doğrulaması ile)
        // GÜNCELLEME: Güncelleme/silme işlemleri için AsNoTracking OLMAMALI.
        Task<Column?> GetByIdAsync(int boardId, int columnId); // Null dönebilir

        // YENİ METOT: Panodaki en yüksek 'Order' değerini getirir.
        Task<int> GetMaxOrderAsync(int boardId);
    }
}