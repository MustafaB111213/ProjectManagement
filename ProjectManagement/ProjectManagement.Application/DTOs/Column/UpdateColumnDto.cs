using System.ComponentModel.DataAnnotations;

namespace ProjectManagement.Application.DTOs.Column
{
    public class UpdateColumnDto
    {
        [Required(ErrorMessage = "Sütun başlığı zorunludur.")]
        [StringLength(100, MinimumLength = 1, ErrorMessage = "Başlık en az 1, en fazla 100 karakter olmalıdır.")]
        public string Title { get; set; }
        public string? Settings { get; set; }
    }
}
