using System.ComponentModel.DataAnnotations;

namespace ProjectManagement.Application.DTOs.User
{
    public class CreateUserDto : UserForManipulationDto
    {
        [Required(ErrorMessage = "Parola zorunludur.")]
        [StringLength(100, MinimumLength = 6, ErrorMessage = "Parola en az 6 karakter olmalıdır")]
        public string Password { get; set; }
    }
}
