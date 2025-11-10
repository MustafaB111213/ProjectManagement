using System.ComponentModel.DataAnnotations;

namespace ProjectManagement.Application.DTOs.Item
{
    public class MoveItemDto
    {
        [Required]
        public int ItemId { get; set; } // Taşınan item'ın ID'si

        [Required]
        public int DestinationGroupId { get; set; } // Hedef grubun ID'si

        [Required]
        [Range(0, int.MaxValue)] // Index negatif olamaz
        public int DestinationIndex { get; set; } // Hedef gruptaki yeni sırası (0'dan başlar)
    }
}