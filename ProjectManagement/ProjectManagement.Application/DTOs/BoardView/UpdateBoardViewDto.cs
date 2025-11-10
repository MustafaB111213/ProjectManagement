using System.ComponentModel.DataAnnotations;

namespace ProjectManagement.Application.DTOs.BoardView
{
    public class UpdateBoardViewDto
    {
        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;
        public int? Order { get; set; } // Sıralama için
        public string? SettingsJson { get; set; }
    }
}
