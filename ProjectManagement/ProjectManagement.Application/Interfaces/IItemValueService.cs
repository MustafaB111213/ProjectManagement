using ProjectManagement.Application.DTOs.ItemValue;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectManagement.Application.Interfaces
{
    public interface IItemValueService
    {
        Task<ItemValueDto> UpsertItemValueAsync(int itemId, UpdateItemValueDto dto);
    }
}
