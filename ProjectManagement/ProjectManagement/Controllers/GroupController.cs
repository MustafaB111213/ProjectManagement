using Microsoft.AspNetCore.Mvc;
using ProjectManagement.Application.DTOs.Group;
using ProjectManagement.Application.Interfaces;

namespace ProjectManagement.Api.Controllers
{
    // Rota tanımı: /api/boards/{boardId}/groups
    [Route("api/boards/{boardId}/groups")]
    [ApiController]
    public class GroupController : ControllerBase
    {
        private readonly IGroupService _groupService;

        public GroupController(IGroupService groupService)
        {
            _groupService = groupService;
        }

        // GET /api/boards/{boardId}/groups
        [HttpGet]
        [ProducesResponseType(typeof(IEnumerable<GroupDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<IEnumerable<GroupDto>>> GetAllGroupsForBoardAsync(int boardId)
        {
            var groups = await _groupService.GetAllGroupsForBoardAsync(boardId);
            if (groups == null)
            {
                // Pano bulunamadıysa NotFound döndür
                return NotFound($"Board with id {boardId} not found.");
            }
            return Ok(groups); // Grupları döndür (Sıralı gelmeli)
        }

        // GET /api/boards/{boardId}/groups/{groupId}
        [HttpGet("{groupId}", Name = "GetGroupById")]
        [ProducesResponseType(typeof(GroupDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<GroupDto>> GetGroupByIdAsync(int boardId, int groupId)
        {
            var group = await _groupService.GetGroupByIdAsync(boardId, groupId);
            if (group == null)
            {
                return NotFound($"Group with id {groupId} not found on board {boardId}.");
            }
            return Ok(group);
        }

        // POST /api/boards/{boardId}/groups
        [HttpPost]
        [ProducesResponseType(typeof(GroupDto), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<GroupDto>> CreateGroupAsync(int boardId, [FromBody] CreateGroupDto dto)
        {
            // Model validasyonunu kontrol et (DTO'da [Required] vb. varsa)
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var created = await _groupService.CreateGroupAsync(boardId, dto);
            if (created == null)
            {
                // Servis, pano bulunamadığında null döndürür
                return NotFound($"Board with id {boardId} not found.");
            }
            // Başarılı oluşturma sonrası 201 Created ve oluşturulan kaynağın URL'sini döndür
            return CreatedAtRoute("GetGroupById", new { boardId = boardId, groupId = created.Id }, created);
        }

        // PUT /api/boards/{boardId}/groups/{groupId}
        [HttpPut("{groupId}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> UpdateGroupAsync(int boardId, int groupId, [FromBody] UpdateGroupDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }
            // ID eşleşmesini kontrol et (opsiyonel ama iyi pratik)
            // if (groupId != dto.Id) return BadRequest("ID mismatch");

            var wasUpdated = await _groupService.UpdateGroupAsync(boardId, groupId, dto);
            if (!wasUpdated)
            {
                return NotFound($"Group with id {groupId} not found on board {boardId}.");
            }
            return NoContent(); // Başarılı güncelleme
        }

        // DELETE /api/boards/{boardId}/groups/{groupId}
        [HttpDelete("{groupId}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> DeleteGroupAsync(int boardId, int groupId)
        {
            var wasDeleted = await _groupService.DeleteGroupAsync(boardId, groupId);
            if (!wasDeleted)
            {
                return NotFound($"Group with id {groupId} not found on board {boardId}.");
            }
            return NoContent(); // Başarılı silme
        }

        // PUT /api/boards/{boardId}/groups/reorder
        [HttpPut("reorder")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        // --- DOĞRU PARAMETRE TANIMI ---
        // Frontend { "orderedGroupIds": [1, 2, 3] } gönderdiği için,
        // bu nesneyi alacak bir DTO veya doğrudan List<int> kullanabiliriz.
        // Eğer List<int> kullanacaksak, property adı JSON ile eşleşmeli.
        // En temizi bir DTO kullanmak.
        public async Task<IActionResult> ReorderGroups(int boardId, [FromBody] ReorderGroupsDto dto)
        // --- DOĞRU PARAMETRE TANIMI SONU ---
        {
            // Model validasyonunu kontrol et
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            // DTO null mı veya içindeki liste boş mu kontrol et
            if (dto?.OrderedGroupIds == null || !dto.OrderedGroupIds.Any())
            {
                return BadRequest("Sıralı grup ID listesi alınamadı veya boş.");
            }

            // Servis metodunu çağır (Servis metodu List<int> almalı)
            var result = await _groupService.ReorderGroupsAsync(boardId, dto.OrderedGroupIds);

            if (!result)
            {
                // Servis false döndürdüyse genel bir hata veya NotFound döndür
                return BadRequest("Grup sırası güncellenemedi. Pano veya grup ID'lerini kontrol edin.");
                // return NotFound($"Board with id {boardId} not found or invalid group IDs.");
            }

            return NoContent(); // Başarılı olursa 204 No Content
        }

        
    }
}
