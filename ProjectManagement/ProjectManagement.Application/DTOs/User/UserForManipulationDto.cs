using System.ComponentModel.DataAnnotations;

namespace ProjectManagement.Application.DTOs.User
{
    public class UserForManipulationDto
    {
        [Required(ErrorMessage = "Kullanıcı adı zorunludur.")]
        [StringLength(100)]
        public string Username { get; set; }

        [Required(ErrorMessage = "E-posta adresi zorunludur.")]
        [EmailAddress(ErrorMessage = "Geçerli bir e-posta adresi giriniz.")]
        [StringLength(255)]
        public string Email { get; set; }

        [StringLength(100)]
        public string FirstName { get; set; }

        [StringLength(100)]
        public string LastName { get; set; }
    }
}
