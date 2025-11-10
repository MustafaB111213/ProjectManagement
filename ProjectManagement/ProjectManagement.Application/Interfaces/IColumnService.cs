using ProjectManagement.Application.DTOs.Column;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace ProjectManagement.Application.Interfaces
{
    public interface IColumnService
    {
        Task<IEnumerable<ColumnDto>?> GetAllColumnsForBoardAsync(int boardId);
        Task<ColumnDto?> GetColumnByIdAsync(int boardId, int columnId);
        Task<ColumnDto?> CreateColumnAsync(int boardId, CreateColumnDto createColumnDto);
        Task<bool> UpdateColumnAsync(int boardId, int columnId, UpdateColumnDto updateColumnDto);
        Task<bool> DeleteColumnAsync(int boardId, int columnId);

        // YENİ METOT: Sütunları yeniden sıralamak için
        Task<bool> ReorderColumnsAsync(int boardId, ReorderColumnsDto dto);
    }
}