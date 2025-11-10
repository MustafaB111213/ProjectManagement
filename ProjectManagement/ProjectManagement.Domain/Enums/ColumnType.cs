using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectManagement.Domain.Enums
{
    public enum ColumnType
    {
        Text,
        Status,
        Date,
        Person,
        Timeline, // Zaman Çizelgesi (Tarih aralığı)
        Document, // Belge (Dosya)
        Dependency
    }
}
