using ProjectManagement.Domain.Enums;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectManagement.Application.DTOs.Column
{
    public class ColumnDto
    {
        public int Id { get; set; }
        public string Title { get; set; }
        public ColumnType Type { get; set; }
        public int BoardId { get; set; }
        public int Order { get; set; }

    }
}
