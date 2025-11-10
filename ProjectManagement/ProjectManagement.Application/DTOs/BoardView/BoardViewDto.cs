namespace ProjectManagement.Application.DTOs.BoardView
{
    public class BoardViewDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty; // Enum'ı string'e çevirip göndereceğiz
        public int Order { get; set; }
        public string? SettingsJson { get; set; }

    }
}
