using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProjectManagement.Domain.Entities;

namespace ProjectManagement.Data.Configurations
{
    public class UserConfiguration: IEntityTypeConfiguration<User>
    {
        public void Configure(EntityTypeBuilder<User> builder)
        {
            // Alan kısıtlamaları
            builder.Property(u => u.Username)
                .IsRequired()
                .HasMaxLength(100);

            builder.Property(u => u.Email)
                .IsRequired()
                .HasMaxLength(255);

            builder.Property(u => u.PasswordHash)
                .IsRequired();

            builder.Property(u => u.FirstName)
                .HasMaxLength(100); // Opsiyonel

            builder.Property(u => u.LastName)
                .HasMaxLength(100); // Opsiyonel

            // Benzersiz (Unique) İndeksler
            // Aynı kullanıcı adı veya e-posta ile kayıt olunamasın
            builder.HasIndex(u => u.Username)
                .IsUnique();

            builder.HasIndex(u => u.Email)
                .IsUnique();
        }
    }
}
