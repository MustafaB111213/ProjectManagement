using System.ComponentModel.DataAnnotations;

namespace ProjectManagement.Application.DTOs.Board
{
        // abstract: Bu sınıftan tek başına nesne üretilemez, sadece miras alınabilir.
        public abstract class BoardForManipulationDto
        {
            [Required(ErrorMessage = "Pano adı zorunludur.")]
            [StringLength(100, ErrorMessage = "Pano adı 100 karakterden fazla olamaz.")]
            public string Name { get; set; }

            [StringLength(500, ErrorMessage = "Açıklama 500 karakterden fazla olamaz.")]
            public string? Description { get; set; }
        }

}
