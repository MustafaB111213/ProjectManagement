using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectManagement.Application.DTOs.BoardView
{
    public class CreateBoardViewDto
    {
        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [Required]
        // Enum değerlerinden biri olmalı (Table, Gantt) - Serviste kontrol edilecek
        public string Type { get; set; } = string.Empty;

        // BoardId genellikle route'dan alınır, buraya eklemeye gerek yok.
        // Order otomatik hesaplanabilir.
        public string? SettingsJson { get; set; }

    }


}
