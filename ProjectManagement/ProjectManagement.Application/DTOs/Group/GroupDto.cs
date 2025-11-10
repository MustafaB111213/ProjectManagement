namespace ProjectManagement.Application.DTOs.Group
{
    public class GroupDto : GroupForManipulationDto
    {
        public int Id { get; set; }
        
        public int BoardId { get; set; } // Hangi panoya ait olduğunu bilmek faydalı olabilir.
    }
}
