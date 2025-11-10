using ProjectManagement.Application.DTOs.Group;

namespace ProjectManagement.Application.Interfaces
{
    public interface IGroupService
    {
        // Belirli bir panoya ait tüm grupları getir
        Task<IEnumerable<GroupDto>> GetAllGroupsForBoardAsync(int boardId);
        // Belirli bir panoya yeni bir grup ekle
        Task<GroupDto> CreateGroupAsync(int boardId, CreateGroupDto createGroupDto);
        // Belirli bir panoya ait tek bir grubu getir
        Task<GroupDto> GetGroupByIdAsync(int boardId, int groupId);
        Task<bool> UpdateGroupAsync(int boardId, int groupId, UpdateGroupDto updateGroupDto);
        Task<bool> DeleteGroupAsync(int boardId, int groupId);
        Task<bool> ReorderGroupsAsync(int boardId, List<int> orderedGroupIds);

    }
}
