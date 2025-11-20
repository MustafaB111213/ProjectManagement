using ProjectManagement.Domain.Enums;

namespace ProjectManagement.Application.DTOs.Column
{
    public class ColumnDto
    {
        public int Id { get; set; }
        public string Title { get; set; }
        public ColumnType Type { get; set; }
        public int BoardId { get; set; }
        public int Order { get; set; }
        public string? Settings { get; set; }

    }
}
