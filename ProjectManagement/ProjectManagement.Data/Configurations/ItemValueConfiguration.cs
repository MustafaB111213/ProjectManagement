using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProjectManagement.Domain.Entities;

namespace ProjectManagement.Data.Configurations
{
    public class ItemValueConfiguration : IEntityTypeConfiguration<ItemValue>
    {
        public void Configure(EntityTypeBuilder<ItemValue> builder)
        {
            // ItemValue'nun bir Item'ı olmalı
            builder.HasOne(iv => iv.Item)
                   .WithMany(i => i.ItemValues)
                   .HasForeignKey(iv => iv.ItemId);

            // ItemValue'nun bir Column'u olmalı
            builder.HasOne(iv => iv.Column)
                   .WithMany() // Column tarafında bir ICollection<ItemValue> listesi tutmuyoruz, bu yüzden WithMany() boş kalabilir.
                   .HasForeignKey(iv => iv.ColumnId)
                   .OnDelete(DeleteBehavior.Restrict); // ÖNEMLİ: İçinde değer olan bir sütunun silinmesini engelle.
        }
    }
}
