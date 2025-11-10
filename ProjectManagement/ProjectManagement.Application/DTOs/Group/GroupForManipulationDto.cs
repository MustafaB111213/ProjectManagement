using System.ComponentModel.DataAnnotations;

namespace ProjectManagement.Application.DTOs.Group
{
    public abstract class GroupForManipulationDto
    {
        [Required(ErrorMessage = "Grup başlığı zorunludur.")]
        [StringLength(100)]
        public string Title { get; set; }

        //[Required(ErrorMessage = "Renk kodu zorunludur.")]
        //[StringLength(7, ErrorMessage = "Renk kodu #RRGGBB formatında olmalıdır.")]
        public string Color { get; set; } = "#808080"; // Varsayılan renk

        
    }
}
