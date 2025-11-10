using ProjectManagement.Application.DTOs.Board;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectManagement.Application.Interfaces
{
    public interface IBoardService
    {
        Task<IEnumerable<BoardDto>> GetAllBoardsAsync();
        Task<BoardDto?> GetBoardByIdAsync(int id); // Null dönebilme ihtimali için ? eklemek daha doğru.
        Task<BoardDto> CreateBoardAsync(CreateBoardDto createBoardDto);
        Task UpdateBoardAsync(int id, UpdateBoardDto updateBoardDto); // Geriye bir şey döndürmesine gerek yok.
        Task DeleteBoardAsync(int id);
    }
}
