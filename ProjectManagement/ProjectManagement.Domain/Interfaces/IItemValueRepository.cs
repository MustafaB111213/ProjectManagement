using ProjectManagement.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectManagement.Domain.Interfaces
{
    public interface IItemValueRepository : IGenericRepository<ItemValue>
    {
        // Belirtilen item ve column'a ait ItemValue'yu bulur. "Upsert" için kritiktir.
        Task<ItemValue> GetByItemIdAndColumnIdAsync(int itemId, int columnId);
    }
}
