namespace ProjectManagement.Domain.Entities
{
    public class Item : BaseEntity
    {
        // Amaç: Görevin adı. Örn: "Veritabanı şemasını oluştur".
        public string Name { get; set; }

        // --- İlişkiler ---

        // Amaç: Bu görevin hangi gruba ait olduğunu belirten Foreign Key.
        public int GroupId { get; set; }
        // Amaç: Yukarıdaki GroupId üzerinden ilgili Group nesnesine ulaşmayı sağlayan Navigation Property.
        public Group Group { get; set; }
        public int Order {  get; set; }
        // Amaç: Bu göreve ait dinamik verileri tutar. (Bu görevin durumu ne? Tarihi ne? vb.)
        // Bu, projenin en esnek ve en önemli kısmıdır.
        public ICollection<ItemValue> ItemValues { get; set; } = new List<ItemValue>();
    }
}
