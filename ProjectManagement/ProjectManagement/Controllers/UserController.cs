using Microsoft.AspNetCore.Mvc;
using ProjectManagement.Application.DTOs.User;
using ProjectManagement.Application.Interfaces;
using System.Threading.Tasks;

namespace ProjectManagement.Api.Controllers
{
    [ApiController]
    [Route("api/users")]
    public class UserController : ControllerBase
    {
        private readonly IUserService _userService;

        public UserController(IUserService userService)
        {
            _userService = userService;
        }

        // GET /api/users
        [HttpGet]
        [ProducesResponseType(typeof(IEnumerable<UserDto>), StatusCodes.Status200OK)]
        public async Task<ActionResult<IEnumerable<UserDto>>> GetAllUsersAsync()
        {
            var users = await _userService.GetAllUsersAsync();
            return Ok(users);
        }

        [HttpGet("{userId}", Name = "GetUserById")]
        [ProducesResponseType(typeof(UserDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<UserDto>> GetUserByIdAsync(int userId)
        {
            var user = await _userService.GetUserByIdAsync(userId);
            if (user == null)
            {
                return NotFound($"User with id {userId} not found.");
            }
            return Ok(user);
        }

        [HttpPost]
        [ProducesResponseType(typeof(UserDto), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<ActionResult<UserDto>> CreateUserAsync([FromBody] CreateUserDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                var created = await _userService.CreateUserAsync(dto);
                // Oluşturulan kaynağın URL'sini döndür
                return CreatedAtRoute("GetUserById", new { userId = created.Id }, created);
            }
            catch (Exception ex)
            {
                // (Benzersizlik ihlali gibi)
                return BadRequest(ex.Message);
            }
        }

        [HttpPut("{userId}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> UpdateUserAsync(int userId, [FromBody] UpdateUserDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }
            try
            {
                var wasUpdated = await _userService.UpdateUserAsync(userId, dto);
                if (!wasUpdated)
                {
                    return NotFound($"User with id {userId} not found.");
                }
                return NoContent(); // Başarılı güncelleme
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpDelete("{userId}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> DeleteUserAsync(int userId)
        {
            var wasDeleted = await _userService.DeleteUserAsync(userId);
            if (!wasDeleted)
            {
                return NotFound($"User with id {userId} not found.");
            }
            return NoContent();
        }
    }
}
