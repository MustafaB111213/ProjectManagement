namespace ProjectManagement.Domain.Entities
{
    public class Group : BaseEntity
    {
        // Amaç: Grubun başlığı. Örn: "Backend Görevleri".
        public string Title { get; set; }

        // Amaç: Arayüzde grubu renklendirmek için kullanılacak hex renk kodu. Örn: "#5A5AFF".
        public string Color { get; set; }

        // --- İlişkiler ---

        // Amaç: Bu grubun hangi panoya ait olduğunu belirten Foreign Key (Yabancı Anahtar).
        public int BoardId { get; set; }
        // Amaç: Yukarıdaki BoardId üzerinden ilgili Board nesnesine ulaşmayı sağlayan Navigation Property.
        public Board Board { get; set; }
        public int Order { get; set; }
        // Amaç: Bu grubun içinde hangi görevlerin (Item) olduğunu tutar.
        // "Bir grubun birden çok item'ı olabilir" ilişkisini kurar (1-to-Many).
        public ICollection<Item> Items { get; set; } = new List<Item>();
    }
}
