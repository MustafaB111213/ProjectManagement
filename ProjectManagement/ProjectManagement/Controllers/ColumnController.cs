using Microsoft.AspNetCore.Mvc;
using ProjectManagement.Application.DTOs.Column;
using ProjectManagement.Application.Interfaces;
using System.Collections.Generic; // IEnumerable için
using System.Threading.Tasks; // Task için
using Microsoft.AspNetCore.Http; // StatusCodes için

namespace ProjectManagement.Api.Controllers
{
    [Route("api/boards/{boardId}/columns")]
    [ApiController]
    public class ColumnController : ControllerBase
    {
        private readonly IColumnService _columnService;

        public ColumnController(IColumnService columnService)
        {
            _columnService = columnService;
        }

        // GET /api/boards/{boardId}/columns
        [HttpGet]
        [ProducesResponseType(typeof(IEnumerable<ColumnDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<IEnumerable<ColumnDto>>> GetAllColumnsForBoardAsync(int boardId)
        {
            var columns = await _columnService.GetAllColumnsForBoardAsync(boardId);
            if (columns == null)
            {
                return NotFound($"Board with id {boardId} not found.");
            }
            return Ok(columns); // Sıralı gelmeli
        }

        // GET /api/boards/{boardId}/columns/{columnId}
        [HttpGet("{columnId}", Name = "GetColumnById")]
        [ProducesResponseType(typeof(ColumnDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<ColumnDto>> GetColumnByIdAsync(int boardId, int columnId)
        {
            var column = await _columnService.GetColumnByIdAsync(boardId, columnId);
            if (column == null)
            {
                return NotFound($"Column with id {columnId} not found on board {boardId}.");
            }
            return Ok(column);
        }

        // POST /api/boards/{boardId}/columns
        [HttpPost]
        [ProducesResponseType(typeof(ColumnDto), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<ColumnDto>> CreateColumnAsync(int boardId, [FromBody] CreateColumnDto createColumnDto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var createdColumn = await _columnService.CreateColumnAsync(boardId, createColumnDto);
            if (createdColumn == null)
            {
                return NotFound($"Board with id {boardId} not found.");
            }
            return CreatedAtRoute("GetColumnById", new { boardId = boardId, columnId = createdColumn.Id }, createdColumn);
        }

        // DELETE /api/boards/{boardId}/columns/{columnId}
        [HttpDelete("{columnId}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> DeleteColumnAsync(int boardId, int columnId)
        {
            var deleted = await _columnService.DeleteColumnAsync(boardId, columnId);
            if (!deleted)
            {
                return NotFound($"Column with id {columnId} not found on board {boardId}.");
            }
            return NoContent();
        }

        // PUT /api/boards/{boardId}/columns/{columnId}
        [HttpPut("{columnId}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> UpdateColumnAsync(int boardId, int columnId, [FromBody] UpdateColumnDto updateColumnDto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var wasUpdated = await _columnService.UpdateColumnAsync(boardId, columnId, updateColumnDto);
            if (!wasUpdated)
            {
                return NotFound($"Column with id {columnId} not found on board {boardId}.");
            }
            return NoContent();
        }

        // --- YENİ ENDPOINT: SÜTUN SIRALAMA ---
        // PUT /api/boards/{boardId}/columns/reorder
        [HttpPut("reorder")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> ReorderColumns(int boardId, [FromBody] ReorderColumnsDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            if (dto?.OrderedColumnIds == null)
            {
                return BadRequest("Sıralı sütun ID listesi boş olamaz.");
            }

            var result = await _columnService.ReorderColumnsAsync(boardId, dto);

            if (!result)
            {
                return BadRequest("Sütun sırası güncellenemedi. Pano veya sütun ID'lerini kontrol edin.");
            }

            return NoContent(); // Başarılı
        }
    }
}