using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectManagement.Application.DTOs.ItemValue
{
    public class UpdateItemValueDto
    {
        [Required]
        public int ColumnId { get; set; }

        // Value, her türden veri (metin, tarih, sayı) olabileceği için string olarak alınır.
        // Gerekli dönüşümler servis katmanında yapılabilir.
        public string Value { get; set; }
    }
}
