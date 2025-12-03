namespace ProjectManagement.Application.DTOs.Item
{
    public class CreateItemDto : ItemForManipulationDto
    {
        public int GroupId { get; set; }

        // Alt görev desteği
        public int? ParentItemId { get; set; }
    }
}
