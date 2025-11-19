using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProjectManagement.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddSettingsToColumn : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Settings",
                table: "Columns",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Settings",
                table: "Columns");
        }
    }
}
