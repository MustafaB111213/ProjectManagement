using Microsoft.AspNetCore.Mvc;
using ProjectManagement.Application.DTOs.BoardView;
using ProjectManagement.Application.Interfaces;

namespace ProjectManagement.Api.Controllers
{
    [Route("api/boards/{boardId}/views")] // Panoya bağlı bir route
    [ApiController]
    public class BoardViewsController : ControllerBase
    {
        private readonly IBoardViewService _boardViewService;

        public BoardViewsController(IBoardViewService boardViewService)
        {
            _boardViewService = boardViewService;
        }
        [HttpGet]
        public async Task<ActionResult<IEnumerable<BoardViewDto>>> GetBoardViews(int boardId)
        {
            var views = await _boardViewService.GetViewsForBoardAsync(boardId);
            return Ok(views);
        }
        [HttpPost]
        public async Task<ActionResult<BoardViewDto>> CreateBoardView(int boardId, [FromBody] CreateBoardViewDto createDto)
        {
            try
            {
                var newView = await _boardViewService.CreateViewAsync(boardId, createDto);
                // Yeni oluşturulan kaynağın URI'sini döndürmek iyi bir pratiktir.
                // Şimdilik sadece DTO'yu döndürelim.
                return Ok(newView); // Veya CreatedAtAction
            }
            catch (ArgumentException ex) // Geçersiz tip gibi hatalar için
            {
                return BadRequest(ex.Message);
            }
            // Diğer olası hatalar için try-catch eklenebilir.
        }

        // PUT: api/boards/{boardId}/views/{viewId}  (Tek bir view güncellemek için)
        [HttpPut("{viewId}")]
        public async Task<IActionResult> UpdateBoardView(int boardId, int viewId, [FromBody] UpdateBoardViewDto updateDto)
        {
            try
            {
                // --- GÜNCELLEME ---
                // Artık 'await' bir 'BoardView' nesnesi döndürecek
                var updatedView = await _boardViewService.UpdateViewAsync(viewId, updateDto);

                // 'NoContent()' (204) yerine 'Ok(updatedView)' (200) döndürün.
                // Frontend'deki Redux thunk'ının buna ihtiyacı var.
                return Ok(updatedView);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ex.Message);
            }
            catch (Exception ex)
            {
                // Log ex
                return StatusCode(500, "Görünüm güncellenirken bir hata oluştu.");
            }
        }

        // DELETE: api/boards/{boardId}/views/{viewId}
        [HttpDelete("{viewId}")]
        public async Task<IActionResult> DeleteBoardView(int boardId, int viewId)
        {
            try
            {
                await _boardViewService.DeleteViewAsync(viewId);
                return NoContent(); // Başarılı silme
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ex.Message);
            }
            catch (Exception ex)
            {
                // Log ex
                return StatusCode(500, "Görünüm silinirken bir hata oluştu.");
            }
        }

        // PUT: api/boards/{boardId}/views/reorder (Sıralamayı güncellemek için)
        [HttpPut("reorder")]
        public async Task<IActionResult> ReorderBoardViews(int boardId, [FromBody] List<int> orderedViewIds)
        {
            if (orderedViewIds == null || !orderedViewIds.Any())
            {
                return BadRequest("Görünüm ID listesi boş olamaz.");
            }
            try
            {
                await _boardViewService.ReorderViewsAsync(boardId, orderedViewIds);
                return NoContent(); // Başarılı sıralama
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                // Log ex
                return StatusCode(500, "Görünümler sıralanırken bir hata oluştu.");
            }
        }
    }
}
