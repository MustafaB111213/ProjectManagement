using System;
using System.Collections.Generic;
using System.Data.Common;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectManagement.Domain.Entities
{
    public class Board : BaseEntity
    {
        // Amaç: Panonun kullanıcı arayüzünde görünecek adı. Örn: "Mobil Uygulama v2.0".
        public string Name { get; set; }

        // Amaç: Panonun ne hakkında olduğuna dair detaylı bilgi. Zorunlu değil.
        public string? Description { get; set; }

        // --- İlişkiler ---

        // Amaç: Bu panonun içinde hangi görev gruplarının olduğunu tutar.
        // "Bir panonun birden çok grubu olabilir" ilişkisini kurar (1-to-Many).
        public ICollection<Group> Groups { get; set; } = new List<Group>();

        // Amaç: Bu panoya özel sütun tanımlarını tutar (Status, Date, Person vb.).
        // "Bir panonun birden çok sütunu olabilir" ilişkisini kurar (1-to-Many).
        public ICollection<Column> Columns { get; set; } = new List<Column>();

        // Amaç: Bu panoya ait farklı görünümleri (Table, Gantt, Kanban vb.) tutar.
        public ICollection<BoardView> Views { get; set; } = new List<BoardView>();
    }
}
