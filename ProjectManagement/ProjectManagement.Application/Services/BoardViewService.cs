using AutoMapper;
using ProjectManagement.Application.DTOs.BoardView;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Enums;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Services
{
    public class BoardViewService : IBoardViewService
    {
        private readonly IBoardViewRepository _boardViewRepository;
        private readonly IMapper _mapper; // AutoMapper inject edilecek (opsiyonel)

        public BoardViewService(IBoardViewRepository boardViewRepository, IMapper mapper)
        {
            _boardViewRepository = boardViewRepository;
            _mapper = mapper;
        }


        public async Task<BoardViewDto> CreateViewAsync(int boardId, CreateBoardViewDto createDto)
        {
            // DTO'dan gelen Type string'ini Enum'a çevir ve kontrol et
            if (!Enum.TryParse<BoardViewType>(createDto.Type, true, out var viewType))
            {
                throw new ArgumentException($"Geçersiz görünüm tipi: {createDto.Type}");
            }

            // Yeni eklenecek görünüm için Order değerini hesapla (mevcutların sonuna ekle)
            var existingViews = await _boardViewRepository.GetViewsByBoardIdAsync(boardId);
            int nextOrder = existingViews.Any() ? existingViews.Max(v => v.Order) + 1 : 0;

            string defaultSettingsJson = "{}";

            var newView = new BoardView
            {
                Name = createDto.Name,
                Type = viewType,
                BoardId = boardId,
                Order = nextOrder,
                SettingsJson = defaultSettingsJson // Boş JSON'u ata
            };

            await _boardViewRepository.AddAsync(newView);
            await _boardViewRepository.SaveChangesAsync(); // Değişiklikleri kaydet

            return _mapper.Map<BoardViewDto>(newView); // Oluşturulan entity'yi DTO'ya çevirip dön

        }

        public async Task DeleteViewAsync(int viewId)
        {
            var viewToDelete = await _boardViewRepository.GetByIdAsync(viewId);
            if (viewToDelete == null)
            {
                throw new KeyNotFoundException($"View with id {viewId} not found.");
            }
            _boardViewRepository.Delete(viewToDelete);
            await _boardViewRepository.SaveChangesAsync();
        }

        public async Task<IEnumerable<BoardViewDto>> GetViewsForBoardAsync(int boardId)
        {
            var views = await _boardViewRepository.GetViewsByBoardIdAsync(boardId);
            return _mapper.Map<IEnumerable<BoardViewDto>>(views);
        }

        public async Task ReorderViewsAsync(int boardId, List<int> orderedViewIds)
        {
            var views = await _boardViewRepository.GetViewsByBoardIdAsync(boardId);
            var viewDict = views.ToDictionary(v => v.Id);

            if (views.Count != orderedViewIds.Count || orderedViewIds.Any(id => !viewDict.ContainsKey(id)))
            {
                throw new ArgumentException("Sağlanan görünüm ID'leri panodaki mevcut görünümlerle eşleşmiyor.");
            }

            for (int i = 0; i < orderedViewIds.Count; i++)
            {
                var viewId = orderedViewIds[i];
                if (viewDict.TryGetValue(viewId, out var view))
                {
                    if (view.Order != i) // Sadece sıra değiştiyse güncelle
                    {
                        view.Order = i;
                        _boardViewRepository.Update(view); // Değişiklik olarak işaretle
                    }
                }
            }
            await _boardViewRepository.SaveChangesAsync(); // Tüm değişiklikleri tek seferde kaydet
        }

        public async Task<BoardViewDto> UpdateViewAsync(int viewId, UpdateBoardViewDto updateDto)
        {
            var viewToUpdate = await _boardViewRepository.GetByIdAsync(viewId);
            if (viewToUpdate == null)
            {
                throw new KeyNotFoundException($"View with id {viewId} not found.");
            }

            viewToUpdate.Name = updateDto.Name;
            viewToUpdate.SettingsJson = updateDto.SettingsJson; // <-- BU SATIR MUHTEMELEN EKSİKTİ

            _boardViewRepository.Update(viewToUpdate);
            await _boardViewRepository.SaveChangesAsync();

            return _mapper.Map<BoardViewDto>(viewToUpdate);
        }

    }
}
