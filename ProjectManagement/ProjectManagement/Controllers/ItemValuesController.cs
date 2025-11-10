using Microsoft.AspNetCore.Mvc;
using ProjectManagement.Application.DTOs.ItemValue;
using ProjectManagement.Application.Interfaces;

namespace ProjectManagement.Api.Controllers
{
    [Route("api/items/{itemId}/values")]
    [ApiController]
    public class ItemValuesController : ControllerBase
    {
        private readonly IItemValueService _itemValueService;
        public ItemValuesController(IItemValueService itemValueService)
        {
            _itemValueService = itemValueService;
        }
        [HttpPut]
        public async Task<ActionResult<ItemValueDto>> UpsertItemValueAsync(int itemId, [FromBody] UpdateItemValueDto dto)
        {
            var result = await _itemValueService.UpsertItemValueAsync(itemId, dto);
            if (result == null)
            {
                return NotFound($"Item with id {itemId} or Column with id {dto.ColumnId} not found."); // Item veya Column bulunamadıysa 404 döner
            }
            return Ok(result); // 200 OK ile güncellenmiş/oluşturulmuş değeri döndür
        }
    }
}
