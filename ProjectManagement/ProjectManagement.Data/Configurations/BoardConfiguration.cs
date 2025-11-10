using ProjectManagement.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProjectManagement.Domain.Entities;

namespace ProjectManagement.Data.Configurations
{
    public class BoardConfiguration : IEntityTypeConfiguration<Board>
    {
        public void Configure(EntityTypeBuilder<Board> builder)
        {
            // Name alanı zorunlu ve maksimum 100 karakter olabilir.
            builder.Property(b => b.Name)
                .IsRequired()
                .HasMaxLength(100);

            // Board ile Group arasındaki 1-to-Many ilişkisi
            builder.HasMany(b => b.Groups)      // Bir Board'un çok sayıda Group'u vardır.
                   .WithOne(g => g.Board)       // Her Group'un ise bir tane Board'u vardır.
                   .HasForeignKey(g => g.BoardId) // Group tablosundaki Foreign Key 'BoardId'dir.
                   .OnDelete(DeleteBehavior.Cascade); // Board silinirse, gruplar da silinsin.

            // Board ile Column arasındaki 1-to-Many ilişkisi
            builder.HasMany(b => b.Columns)
                   .WithOne(c => c.Board)
                   .HasForeignKey(c => c.BoardId)
                   .OnDelete(DeleteBehavior.Cascade);
        }
    }
}