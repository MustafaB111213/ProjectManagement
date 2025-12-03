using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProjectManagement.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectManagement.Data.Configurations
{
    public class ItemConfiguration : IEntityTypeConfiguration<Item>
    {
        public void Configure(EntityTypeBuilder<Item> builder)
        {
            builder.Property(i => i.Name)
                            .IsRequired()
                            .HasMaxLength(200);

            // Item ile ItemValue arasındaki 1-to-Many ilişkisi
            builder.HasMany(i => i.ItemValues)
                   .WithOne(iv => iv.Item)
                   .HasForeignKey(iv => iv.ItemId)
                   .OnDelete(DeleteBehavior.Cascade);

            // --- Alt görev hiyerarşisi ---
            builder.HasOne(i => i.ParentItem)
                   .WithMany(i => i.Children)
                   .HasForeignKey(i => i.ParentItemId)
                   .OnDelete(DeleteBehavior.ClientCascade);
        }
    }
}
