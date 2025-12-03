namespace ProjectManagement.Domain.Entities
{
    public class Item : BaseEntity
    {
        public string Name { get; set; }

        // --- İlişkiler ---

        // Amaç: Bu görevin hangi gruba ait olduğunu belirten Foreign Key.
        public int GroupId { get; set; }
        // Amaç: Yukarıdaki GroupId üzerinden ilgili Group nesnesine ulaşmayı sağlayan Navigation Property.
        public Group Group { get; set; }
        // Bu, projenin en esnek ve en önemli kısmıdır.
        public int Order {  get; set; }
        // Amaç: Bu göreve ait dinamik verileri tutar. (Bu görevin durumu ne? Tarihi ne? vb.)
        public ICollection<ItemValue> ItemValues { get; set; } = new List<ItemValue>();

        // --- Alt Görev Sistemi ---
        public int? ParentItemId { get; set; }
        public Item? ParentItem { get; set; }
        public ICollection<Item> Children { get; set; } = new List<Item>();


    }
}
