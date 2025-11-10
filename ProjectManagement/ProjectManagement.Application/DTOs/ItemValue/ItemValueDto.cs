using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectManagement.Application.DTOs.ItemValue
{
    public class ItemValueDto
    {
        public int Id { get; set; }
        public string Value { get; set; }
        public int ItemId { get; set; }
        public int ColumnId { get; set; }
    }
}
