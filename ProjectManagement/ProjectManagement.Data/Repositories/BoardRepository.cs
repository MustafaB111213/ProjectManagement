using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Interfaces;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectManagement.Data.Repositories
{
    public class BoardRepository: GenericRepository<Board>, IBoardRepository
    {
        public BoardRepository(AppDbContext context) : base(context)
        {

        }

    }
}
