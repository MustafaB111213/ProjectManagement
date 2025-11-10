using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectManagement.Application.DTOs.Column
{
    public class UpdateColumnDto
    {
        [Required(ErrorMessage = "Sütun başlığı zorunludur.")]
        [StringLength(100, MinimumLength = 1, ErrorMessage = "Başlık en az 1, en fazla 100 karakter olmalıdır.")]
        public string Title { get; set; }
    }
}
