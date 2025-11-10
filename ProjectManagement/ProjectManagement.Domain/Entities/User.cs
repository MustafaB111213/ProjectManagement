using System.ComponentModel.DataAnnotations;

namespace ProjectManagement.Domain.Entities
{
    public class User : BaseEntity
    {

        [Required]
        [StringLength(100)]
        public string Username { get; set; }

        [Required]
        [StringLength(255)]
        public string Email { get; set; }

        [Required]
        public string PasswordHash { get; set; } // Asla düz metin parola tutmayın

        [StringLength(100)]
        public string FirstName { get; set; }

        [StringLength(100)]
        public string LastName { get; set; }

        // Gelecekteki ilişkiler için:
        // public ICollection<Board> Boards { get; set; } = new List<Board>();
        // public ICollection<Item> AssignedItems { get; set; } = new List<Item>();

    }
}
