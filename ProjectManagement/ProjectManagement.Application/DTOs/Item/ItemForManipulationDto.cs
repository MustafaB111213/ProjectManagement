using System.ComponentModel.DataAnnotations;

namespace ProjectManagement.Application.DTOs.Item
{
    public abstract class ItemForManipulationDto
    {
        [Required(ErrorMessage = "Görev adı zorunludur.")]
        [StringLength(200)]
        public string Name { get; set; }
    }
}
