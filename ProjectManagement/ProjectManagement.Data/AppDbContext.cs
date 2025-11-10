using Microsoft.EntityFrameworkCore;
using ProjectManagement.Domain.Entities;
using System.Reflection;

namespace ProjectManagement.Data
{
    public class AppDbContext : DbContext
    {
        // Bu constructor, Program.cs'den connection string'i almamızı sağlar.
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        // Veritabanında tabloya dönüşecek olan DbSet'ler
        public DbSet<Board> Boards { get; set; }
        // Diğer DbSet'ler (Groups, Items vb.) buraya eklenecek.
        public DbSet<Group> Groups { get; set; }
        public DbSet<Item> Items { get; set; }
        public DbSet<Column> Columns { get; set; }
        public DbSet<ItemValue> ItemValues { get; set; }
        public DbSet<BoardView> BoardViews { get; set; }
        public DbSet<User> Users { get; set; }
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            // Entity konfigürasyonlarını otomatik olarak bulup uygular.
            modelBuilder.ApplyConfigurationsFromAssembly(Assembly.GetExecutingAssembly());

            
        }

    }
}
