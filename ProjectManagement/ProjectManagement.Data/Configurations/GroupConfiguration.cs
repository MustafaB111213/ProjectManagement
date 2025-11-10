using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProjectManagement.Domain.Entities;

namespace ProjectManagement.Data.Configurations
{
    public class GroupConfiguration : IEntityTypeConfiguration<Group>
    {
        public void Configure( EntityTypeBuilder<Group> builder) 
        {
            builder.Property(g => g.Title)
                .IsRequired()
                .HasMaxLength(100);

            builder.Property(g => g.Color)
                .IsRequired()
                .HasMaxLength(7); // #RRGGBB formatı için

            // Group ile Item arasındaki 1-to-Many ilişkisi
            builder.HasMany(g => g.Items)
                   .WithOne(i => i.Group)
                   .HasForeignKey(i => i.GroupId)
                   .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
