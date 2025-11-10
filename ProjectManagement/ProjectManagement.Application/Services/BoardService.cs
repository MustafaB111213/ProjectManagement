using AutoMapper;
using Microsoft.EntityFrameworkCore;
using ProjectManagement.Application.DTOs.Board;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Data;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Interfaces;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectManagement.Application.Services
{
    public class BoardService : IBoardService
    {
        private readonly IBoardRepository _boardRepository;
        private readonly IMapper _mapper;
        

        public BoardService(IBoardRepository boardRepository, IMapper mapper)
        {
            _boardRepository = boardRepository;
            _mapper = mapper;
            
        }

        public async Task<BoardDto> CreateBoardAsync (CreateBoardDto dto)
        {
            // 1. DTO'yu Entity'ye çevir
            var boardEntity = _mapper.Map<Board>(dto);

            // 2. Repository aracılığıyla veritabanına ekle (henüz kaydedilmedi)
            await _boardRepository.AddAsync(boardEntity);
            // 3. Değişiklikleri veritabanına kaydet
            await _boardRepository.SaveChangesAsync();
            // 4. Oluşturulan yeni entity'yi DTO'ya çevirip geri döndür
            return _mapper.Map<BoardDto>(boardEntity);
        }
        public async Task<IEnumerable<BoardDto>> GetAllBoardsAsync()
        {
            var boards = await _boardRepository.GetAllAsync();
            return _mapper.Map<IEnumerable<BoardDto>>(boards);
        }
        public async Task<BoardDto?> GetBoardByIdAsync(int id)
        {
            var board = await _boardRepository.GetByIdAsync(id);
            if (board == null) return null;
            return _mapper.Map<BoardDto>(board);
        }

        // YENİ METOT
        public async Task UpdateBoardAsync(int id, UpdateBoardDto updateBoardDto)
        {
            // 1. Güncellenecek varlığı veritabanında bul.
            // GenericRepository'de FindAsync sadece Id ile arama yapar, o yüzden context'i kullanabiliriz.
            var boardEntity = await _boardRepository.GetByIdAsync(id);

            // 2. Varlık bulunamazsa hata yönetimi yap. (Controller'da ele alınacak)
            if (boardEntity is null)
            {
                // Normalde burada özel bir 'NotFoundException' fırlatılır.
                // Şimdilik null kontrolü ile yetinebiliriz.
                return;
            }

            // 3. AutoMapper ile DTO'daki verileri mevcut entity'nin üzerine yaz.
            _mapper.Map(updateBoardDto, boardEntity);

            // 4. Değişiklikleri veritabanına kaydet.
            _boardRepository.Update(boardEntity); // EF Core tracking sayesinde buna gerek kalmayabilir,
            // ancak açıkça belirtmek daha güvenlidir.
            await _boardRepository.SaveChangesAsync();
        }
        // YENİ METOT
        public async Task DeleteBoardAsync(int id)
        {
            var boardEntity = await _boardRepository.GetByIdAsync(id);
            if (boardEntity is not null)
            {
                _boardRepository.Delete(boardEntity);
                await _boardRepository.SaveChangesAsync();
            }
        }
    }
}
