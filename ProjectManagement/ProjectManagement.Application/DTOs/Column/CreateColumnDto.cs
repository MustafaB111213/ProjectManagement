using ProjectManagement.Domain.Enums;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectManagement.Application.DTOs.Column
{
    public class CreateColumnDto
    {
        [Required(ErrorMessage = "Sütun başlığı zorunludur.")]
        [StringLength(100, MinimumLength = 1, ErrorMessage = "Başlık en az 1, en fazla 100 karakter olmalıdır.")]
        public string Title { get; set; }

        [Required(ErrorMessage = "Sütun tipi zorunludur.")]
        [Range(0, 6, ErrorMessage = "Geçersiz sütun tipi.")] // ColumnType enum aralığına göre (0-6)
        public ColumnType Type { get; set; }
        public string? Settings { get; set; }
    }
}
