using ProjectManagement.Domain.Enums;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ProjectManagement.Domain.Entities
{
    public class BoardView : BaseEntity
    {

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } // Görünümün adı (örn: "Ana Tablo")

        [Required]
        public BoardViewType Type { get; set; } // Görünümün tipi (Table, Gantt vb.)

        public int Order { get; set; } // Sekmelerin sırasını belirlemek için

        // Foreign Key ile Board'a bağlanacak
        [Required]
        public int BoardId { get; set; }

        [ForeignKey("BoardId")]
        public virtual Board Board { get; set; } // Navigation property (Board entity'nizin olduğunu varsayıyorum)

        // Opsiyonel: Görünüme özel ayarları JSON olarak saklamak için
        public string? SettingsJson { get; set; }

    }
}
