using ProjectManagement.Application.DTOs.ItemValue;

namespace ProjectManagement.Application.DTOs.Item
{
    public class ItemTreeDto : ItemForManipulationDto
    {
        public int Id { get; set; }
        public int GroupId { get; set; }
        public int Order { get; set; }
        public int? ParentItemId { get; set; }

        public List<ItemValueDto> ItemValues { get; set; } = new();
        public List<ItemTreeDto> Children { get; set; } = new();
    }
}
