using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProjectManagement.Data.Migrations
{
    /// <inheritdoc />
    public partial class FixPropertyCasing : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "id",
                table: "ItemValues",
                newName: "Id");

            migrationBuilder.RenameColumn(
                name: "id",
                table: "Items",
                newName: "Id");

            migrationBuilder.RenameColumn(
                name: "id",
                table: "Groups",
                newName: "Id");

            migrationBuilder.RenameColumn(
                name: "id",
                table: "Columns",
                newName: "Id");

            migrationBuilder.RenameColumn(
                name: "id",
                table: "Boards",
                newName: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "Id",
                table: "ItemValues",
                newName: "id");

            migrationBuilder.RenameColumn(
                name: "Id",
                table: "Items",
                newName: "id");

            migrationBuilder.RenameColumn(
                name: "Id",
                table: "Groups",
                newName: "id");

            migrationBuilder.RenameColumn(
                name: "Id",
                table: "Columns",
                newName: "id");

            migrationBuilder.RenameColumn(
                name: "Id",
                table: "Boards",
                newName: "id");
        }
    }
}
