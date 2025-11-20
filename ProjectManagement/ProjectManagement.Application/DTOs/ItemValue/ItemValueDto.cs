namespace ProjectManagement.Application.DTOs.ItemValue
{
    public class ItemValueDto
    {
        public int Id { get; set; }
        public string Value { get; set; }
        public int ItemId { get; set; }
        public int ColumnId { get; set; }
    }
}
