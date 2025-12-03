namespace ProjectManagement.Application.DTOs.Item
{
    public class UpdateItemDto : ItemForManipulationDto
    {
        public int? ParentItemId { get; set; }
    }
}
