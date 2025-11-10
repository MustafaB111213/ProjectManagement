namespace ProjectManagement.Application.DTOs.Group
{
    public class ReorderGroupsDto
    {
        public int GroupId { get; set; }
        public int NewIndex { get; set; } // 0'dan başlar

        // --- YARDIMCI DTO (Controller içinde veya ayrı dosyada tanımlanabilir) ---
        // Frontend'den gelen {"orderedGroupIds": [1, 2, 3]} JSON'unu almak için kullanılır.

        // Property adı frontend'deki JSON key ile EŞLEŞMELİ ("orderedGroupIds")

        [System.ComponentModel.DataAnnotations.Required] // Boş olamaz
        public List<int> OrderedGroupIds { get; set; }
    }
}
