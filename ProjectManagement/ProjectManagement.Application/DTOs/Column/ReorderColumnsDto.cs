using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectManagement.Application.DTOs.Column
{
    public class ReorderColumnsDto
    {
        [Required(ErrorMessage = "Sıralı sütun ID listesi gereklidir.")]
        // Property adı (OrderedColumnIds), frontend'in gönderdiği JSON key'i ile
        // eşleşmelidir (büyük/küçük harf duyarlılığı olmadan, ama aynı olması en iyisidir).
        public List<int> OrderedColumnIds { get; set; }
    }
}
