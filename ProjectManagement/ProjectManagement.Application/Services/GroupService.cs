using AutoMapper;
using Microsoft.EntityFrameworkCore;
using ProjectManagement.Application.DTOs.Group;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Data;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Services
{
    public class GroupService : IGroupService
    {

        private readonly IGroupRepository _groupRepository;
        private readonly IBoardRepository _boardRepository;
        private readonly IMapper _mapper;
        private readonly AppDbContext _context;

        public GroupService(IMapper mapper, IGroupRepository groupRepository, IBoardRepository boardRepository, AppDbContext context)
        {
            _mapper = mapper;
            _groupRepository = groupRepository;
            _boardRepository = boardRepository;
            _context = context;
        }

        public async Task<IEnumerable<GroupDto>> GetAllGroupsForBoardAsync(int boardId)
        {
            // Önce panonun var olup olmadığını kontrol et
            var board = await _boardRepository.GetByIdAsync(boardId);
            if (board == null)
            {
                // Normalde burada özel bir hata fırlatılır (NotFoundException)
                return null;
            }

            var groups = await _groupRepository.GetAllByBoardIdAsync(boardId);

            return _mapper.Map<IEnumerable<GroupDto>>(groups);
        }

        public async Task<GroupDto> CreateGroupAsync(int boardId, CreateGroupDto createGroupDto)
        {
            var board = await _boardRepository.GetByIdAsync(boardId);

            if (board == null)
            {
                return null; // Pano bulunamadı
            }

            var groupEntity = _mapper.Map<Group>(createGroupDto);
            groupEntity.BoardId = boardId; // BoardId'yi URL'den gelen parametre ile set ediyoruz.

            int maxOrder = await _groupRepository.GetMaxOrderAsync(boardId);
            groupEntity.Order = maxOrder + 1;

            await _groupRepository.AddAsync(groupEntity);
            await _groupRepository.SaveChangesAsync();

            return _mapper.Map<GroupDto>(groupEntity);
        }

        public async Task<GroupDto> GetGroupByIdAsync(int boardId, int groupId)
        {
            var group = await _groupRepository.GetByIdAsync(boardId, groupId);
            return _mapper.Map<GroupDto>(group);
        }

        public async Task<bool> UpdateGroupAsync(int boardId, int groupId, UpdateGroupDto updateGroupDto)
        {
            var groupEntity = await _groupRepository.GetByIdAsync(boardId, groupId);

            if (groupEntity == null)
            {
                return false; // Güncellenecek grup bulunamadı.
            }

            // DTO'daki verileri mevcut entity üzerine işle
            _mapper.Map(updateGroupDto, groupEntity);
            //_groupRepository.Update(groupEntity);
            await _groupRepository.SaveChangesAsync();
            return true;

        }
        public async Task<bool> DeleteGroupAsync(int boardId, int groupId)
        {
            var group = await _groupRepository.GetByIdAsync(boardId, groupId);
            if (group == null)
            {
                return false; // Silinecek grup bulunamadı.
            }
            _groupRepository.Delete(group);
            await _groupRepository.SaveChangesAsync();

            return true;
        }
        public async Task<bool> ReorderGroupsAsync(int boardId, List<int> orderedGroupIds)
        {
            // Pano var mı kontrol et (önemli!)
            var boardExists = await _context.Boards.AnyAsync(b => b.Id == boardId);
            if (!boardExists)
            {
                // Pano bulunamazsa false veya hata döndür
                // Loglama da ekleyebilirsin
                return false;
            }

            // Güncellenecek grupları veritabanından çek (performans için sadece ID ve Order alınabilir)
            var groupsToUpdate = await _context.Groups
                .Where(g => g.BoardId == boardId && orderedGroupIds.Contains(g.Id)) // Sadece listedeki ID'leri al
                .ToListAsync();

            // Gelen ID listesindeki her grup veritabanında bulundu mu kontrol et (opsiyonel ama güvenli)
            if (groupsToUpdate.Count != orderedGroupIds.Count)
            {
                Console.WriteLine($"Hata: Reorder için gönderilen ID sayısı ({orderedGroupIds.Count}) ile veritabanında bulunan grup sayısı ({groupsToUpdate.Count}) eşleşmiyor.");
                // Eksik veya fazla ID var, işlemi durdurabilirsin
                return false; // Veya daha detaylı hata yönetimi
            }


            // Her grubun yeni Order değerini ayarla
            for (int i = 0; i < orderedGroupIds.Count; i++)
            {
                int groupId = orderedGroupIds[i];
                var group = groupsToUpdate.FirstOrDefault(g => g.Id == groupId);
                if (group != null)
                {
                    group.Order = i; // Dizideki index'i yeni Order değeri yap (0'dan başlar)
                }
                // else durumu normalde olmamalı (yukarıdaki count kontrolü nedeniyle)
            }

            // Değişiklikleri kaydet
            try
            {
                await _context.SaveChangesAsync();
                return true; // Başarılı
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Grup sırası kaydedilirken hata: {ex.Message}");
                return false; // Kaydetme başarısız
            }
        }
    }
}
