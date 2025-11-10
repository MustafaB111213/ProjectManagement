using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectManagement.Domain.Entities
{
    public class ItemValue : BaseEntity
    {
        // Amaç: Tüm veri türlerini (tarih, sayı, metin) saklayabilecek en esnek tip
        // string'dir. Uygulama katmanında bu string'i Column'un tipine göre
        // doğru veri türüne çevireceğiz.
        public string Value { get; set; }

        // --- İlişkiler (Bu tablonun birleşme noktası) ---

        // Amaç: Bu değerin hangi göreve (satıra) ait olduğunu belirtir.
        public int ItemId { get; set; }
        public Item Item { get; set; }

        // Amaç: Bu değerin hangi sütuna ait olduğunu belirtir.
        public int ColumnId { get; set; }
        public Column Column { get; set; }
    }
}
