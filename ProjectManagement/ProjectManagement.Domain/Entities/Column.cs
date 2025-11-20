using ProjectManagement.Domain.Enums;

namespace ProjectManagement.Domain.Entities
{
    public class Column : BaseEntity
    {
        // Amaç: Sütunun başlığı. Örn: "Sorumlu Kişi".
        public string Title { get; set; }

        // Amaç: Sütunun türünü belirtir. Bu, arayüzün bir tarih seçici mi,
        // bir metin kutusu mu yoksa bir etiket listesi mi göstereceğini belirler.
        public ColumnType Type { get; set; }
        public int Order { get; set; }
        // --- İlişkiler ---

        // Amaç: Bu sütun tanımının hangi panoya ait olduğunu belirten Foreign Key.
        public int BoardId { get; set; }
        public Board Board { get; set; }
        // Bu alan veritabanında JSON formatında ayarları tutacak (Serbest, Zincirleme vs.)
        public string? Settings { get; set; }
    }
}
