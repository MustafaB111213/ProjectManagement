using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectManagement.Application.DTOs.Item
{
    public abstract class ItemForManipulationDto
    {
        [Required(ErrorMessage = "Görev adı zorunludur.")]
        [StringLength(200)]
        public string Name { get; set; }
    }
}
