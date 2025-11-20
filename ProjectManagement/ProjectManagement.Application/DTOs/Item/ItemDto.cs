using ProjectManagement.Application.DTOs.ItemValue;

namespace ProjectManagement.Application.DTOs.Item
{
    public class ItemDto : ItemForManipulationDto
    {
        public int Id { get; set; }
        public int GroupId { get; set; }

        //Bu item'a ait tüm değerleri içerir.
        public ICollection<ItemValueDto> ItemValues { get; set; }
    }
}
