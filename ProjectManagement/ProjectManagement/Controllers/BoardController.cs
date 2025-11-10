using Microsoft.AspNetCore.Mvc;
using ProjectManagement.Application.DTOs.Board;
using ProjectManagement.Application.Interfaces;

namespace ProjectManagement.Api.Controllers
{
    [ApiController] // Bu sınıfın bir API Controller'ı olduğunu belirtir. Otomatik model validasyonu gibi kolaylıklar sağlar.
    [Route("api/[controller]")] // Bu controller'a erişim yolunu belirler. /api/boards olacak.  
    public class BoardController : ControllerBase
    {
        // Controller'ın kendisi iş yapmaz, sadece işi yapacak olan servise delege eder.
        private readonly IBoardService _boardService;

        // Constructor Injection: Program.cs'de kaydettiğimiz IBoardService'i talep ediyoruz.
        // ASP.NET Core, bizim için BoardService'in bir örneğini otomatik olarak buraya gönderecek.
        public BoardController(IBoardService boardService)
        {
            _boardService = boardService;
        }
        // GET: /api/boards
        // Tüm panoları listeler.
        [HttpGet("getall")]
        public async Task<ActionResult<IEnumerable<BoardDto>>> GetAllBoardsAsync()
        {
            var boards = await _boardService.GetAllBoardsAsync();
            return Ok( boards );// HTTP 200 OK status code ve boards listesini body'de döndürür.
        }

        // GET: /api/boards/5
        // Belirtilen id'ye sahip tek bir panoyu getirir.
        [HttpGet("{id}", Name = "GetBoardById")]
        public async Task<ActionResult<BoardDto>> GetBoardByIdAsync(int id)
        {
            var board = await _boardService.GetBoardByIdAsync(id);
            if (board == null)
            {
                return NotFound(); // Pano bulunamazsa HTTP 404 Not Found döndürür.
            }

            return Ok(board); // Bulunursa HTTP 200 OK ve panoyu döndürür.        }

        }
        [HttpPost]// POST: /api/boards
        // Yeni bir pano oluşturur.
        public async Task<ActionResult> CreateBoardAsync([FromBody] CreateBoardDto dto)
        {
            // [ApiController] attribute'u sayesinde createBoardDto null ise veya validasyon kurallarını
            // (örn: [Required]) geçemezse, bu metoda hiç girilmeden otomatik olarak HTTP 400 Bad Request döner.

            var createdBoard = await _boardService.CreateBoardAsync(dto);
            // HTTP 201 Created döndürür. Bu, "kaynak başarıyla oluşturuldu" demektir.
            // Yanıtın 'Location' header'ına yeni oluşturulan kaynağın adresi (örn: /api/boards/6) eklenir.
            return CreatedAtRoute("GetBoardById", new {id = createdBoard.Id}, createdBoard);

        }
        // PUT: /api/boards/5
        // Belirtilen id'deki panoyu günceller.
        [HttpPut( "{id}")]
        public async Task<ActionResult> UpdateBoardAsync(int id, [FromBody] UpdateBoardDto dto)
        {
            await _boardService.UpdateBoardAsync(id, dto);
            // Başarılı bir PUT isteği sonrası genellikle body'de bir şey döndürülmez.
            // HTTP 204 No Content, "İşlem başarılı, döndürecek bir içeriğim yok" demektir.
            return NoContent();                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     

        }
        // DELETE: /api/boards/5
        // Belirtilen id'deki panoyu siler.
        [HttpDelete("{id}")]
        public async Task<ActionResult> DeleteBoardAsync(int id)
        {
            await _boardService.DeleteBoardAsync(id);
            // Tıpkı PUT gibi, başarılı DELETE sonrası da HTTP 204 No Content döndürmek yaygın bir pratiktir.
            return NoContent();
        }
   }
}
