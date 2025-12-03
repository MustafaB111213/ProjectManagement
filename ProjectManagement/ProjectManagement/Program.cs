using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Application.Mappings;
using ProjectManagement.Application.Services;
using ProjectManagement.Data;
using ProjectManagement.Data.Repositories;
using ProjectManagement.Domain.Interfaces;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll",
        builder =>
        {
            builder.AllowAnyOrigin()
                   .AllowAnyMethod()
                   .AllowAnyHeader();
        });
});

// Add services to the container.

builder.Services.AddControllers(options =>
{
    // Bu kural, projedeki TÜM API endpoint'lerine varsayýlan olarak
    // "beni önbellekleme" talimatýný ekler.
    options.CacheProfiles.Add("NoCache",
        new CacheProfile()
        {
            NoStore = true,
            Location = ResponseCacheLocation.None
        });
    options.Filters.Add(new ResponseCacheAttribute() { CacheProfileName = "NoCache" });
});
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// 1. DbContext'i DI Container'a ekle
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection"))
);

// 2. Generic Repository'yi Scoped olarak ekle
// Birisi IGenericRepository istediðinde, ona GenericRepository'nin bir instance'ýný ver.
builder.Services.AddScoped(typeof(IGenericRepository<>), typeof(GenericRepository<>));

// GroupRepository için DI kaydýný ekliyoruz.
builder.Services.AddScoped<IBoardRepository, BoardRepository>();
builder.Services.AddScoped<IGroupRepository, GroupRepository>();
builder.Services.AddScoped<IItemRepository, ItemRepository>();
builder.Services.AddScoped<IColumnRepository, ColumnRepository>();
builder.Services.AddScoped<IItemValueRepository, ItemValueRepository>();
builder.Services.AddScoped<IBoardViewRepository, BoardViewRepository>();
builder.Services.AddScoped<IUserRepository, UserRepository>();

// Birisi IBoardService istediðinde ona BoardService'in bir örneðini ver.
builder.Services.AddScoped<IBoardService, BoardService>();
builder.Services.AddScoped<IGroupService, GroupService>();
builder.Services.AddScoped<IItemService, ItemService>();
builder.Services.AddScoped<IColumnService, ColumnService>();
builder.Services.AddScoped<IItemValueService, ItemValueService>();
builder.Services.AddScoped<IBoardViewService, BoardViewService>();
builder.Services.AddScoped<IUserService, UserService>();
// Application katmanýndaki tüm AutoMapper profillerini bul ve kaydet.
builder.Services.AddAutoMapper(typeof(MappingProfile));



var app = builder.Build();


// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseCors("AllowAll");

app.UseAuthorization();
app.MapControllers();

app.Run();
