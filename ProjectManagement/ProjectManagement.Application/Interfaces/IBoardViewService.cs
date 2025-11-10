using ProjectManagement.Application.DTOs.BoardView;

namespace ProjectManagement.Application.Interfaces
{
    public interface IBoardViewService
    {
        Task<IEnumerable<BoardViewDto>> GetViewsForBoardAsync(int boardId);
        Task<BoardViewDto> CreateViewAsync(int boardId, CreateBoardViewDto createDto);
        Task<BoardViewDto> UpdateViewAsync(int viewId, UpdateBoardViewDto updateDto); // Güncelleme metodu
        Task DeleteViewAsync(int viewId); // Silme metodu
        Task ReorderViewsAsync(int boardId, List<int> orderedViewIds); // Sıralama metodu
    }
}
