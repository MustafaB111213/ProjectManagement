using Microsoft.AspNetCore.Mvc;
using ProjectManagement.Application.DTOs.Item;
using ProjectManagement.Application.Interfaces;

namespace ProjectManagement.Api.Controllers
{
    // Rota tanımı: /api/boards/{boardId}/items
    [Route("api/boards/{boardId}/items")]
    [ApiController]
    public class ItemController : ControllerBase
    {
        private readonly IItemService _itemService;

        public ItemController(IItemService itemService)
        {
            _itemService = itemService;
        }

        // GET /api/boards/{boardId}/items?groupId={groupId}
        [HttpGet]
        [ProducesResponseType(typeof(IEnumerable<ItemDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<IEnumerable<ItemDto>>> GetAllItemsAsync(int boardId, [FromQuery] int? groupId)
        {
            if (groupId.HasValue) // Eğer groupId varsa, o gruba göre filtrele
            {
                var items = await _itemService.GetAllItemsForGroupAsync(boardId, groupId.Value);
                if (items == null)
                {
                    // Servis null döndürdüyse grup bulunamadı veya boardId eşleşmedi
                    return NotFound($"Grup (ID: {groupId.Value}) veya Pano (ID: {boardId}) bulunamadı.");
                }
                return Ok(items); // Sıralı item listesini döndür
            }
            else // groupId yoksa panodaki tüm item'ları döndür
            {
                var items = await _itemService.GetAllItemsForBoardAsync(boardId);
                if (items == null)
                {
                    return NotFound($"Pano (ID: {boardId}) bulunamadı.");
                }
                return Ok(items);
            }
        }

        // GET /api/boards/{boardId}/items/{itemId}
        [HttpGet("{itemId}", Name = "GetItemById")] // Rota adı Create için gerekli
        [ProducesResponseType(typeof(ItemDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<ItemDto>> GetItemByIdAsync(int boardId, int itemId)
        {
            var item = await _itemService.GetItemByIdAsync(boardId, itemId); // groupId kaldırıldı
            if (item == null)
            {
                return NotFound($"Item (ID: {itemId}) bulunamadı veya Pano (ID: {boardId}) ile ilişkili değil.");
            }
            return Ok(item);
        }

        // POST /api/boards/{boardId}/items?groupId={groupId}
        [HttpPost]
        [ProducesResponseType(typeof(ItemDto), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<ItemDto>> CreateItemAsync(int boardId, [FromQuery] int groupId, [FromBody] CreateItemDto createItemDto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var createdItem = await _itemService.CreateItemAsync(boardId, groupId, createItemDto);
            if (createdItem == null)
            {
                // Servis null döndürdüyse grup bulunamadı veya boardId eşleşmedi
                return NotFound($"Grup (ID: {groupId}) veya Pano (ID: {boardId}) bulunamadı.");
            }
            // Oluşturulan kaynağın konumunu ('Location' header) ve kendisini döndür
            return CreatedAtRoute("GetItemById", new { boardId = boardId, itemId = createdItem.Id }, createdItem);
        }

        // PUT /api/boards/{boardId}/items/{itemId}
        [HttpPut("{itemId}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> UpdateItemAsync(int boardId, int itemId, [FromBody] UpdateItemDto updateItemDto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var updated = await _itemService.UpdateItemAsync(boardId, itemId, updateItemDto); // groupId kaldırıldı
            if (!updated)
            {
                return NotFound($"Item (ID: {itemId}) bulunamadı veya Pano (ID: {boardId}) ile ilişkili değil.");
            }
            return NoContent(); // Başarılı güncelleme
        }

        // DELETE /api/boards/{boardId}/items/{itemId}
        [HttpDelete("{itemId}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> DeleteItemAsync(int boardId, int itemId)
        {
            var deleted = await _itemService.DeleteItemAsync(boardId, itemId); // groupId kaldırıldı
            if (!deleted)
            {
                return NotFound($"Item (ID: {itemId}) bulunamadı veya Pano (ID: {boardId}) ile ilişkili değil.");
            }
            return NoContent(); // Başarılı silme
        }

        // PUT /api/boards/{boardId}/items/move (YENİ ENDPOINT)
        [HttpPut("move")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> MoveItem(int boardId, [FromBody] MoveItemDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var result = await _itemService.MoveItemAsync(boardId, dto);

            if (!result)
            {
                // Servis false döndürdüyse detaylı hata mesajı döndür
                return NotFound($"Item (ID: {dto.ItemId}) veya Hedef Grup (ID: {dto.DestinationGroupId}) bulunamadı/yetkisiz veya taşıma başarısız oldu.");
            }

            return NoContent(); // Başarılı taşıma
        }

    }
}
