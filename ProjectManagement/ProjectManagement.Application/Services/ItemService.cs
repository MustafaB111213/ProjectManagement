using AutoMapper;
using Microsoft.EntityFrameworkCore;
using ProjectManagement.Application.DTOs.Item;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Data;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Services
{
    public class ItemService : IItemService
    {
        private readonly IItemRepository _itemRepository;
        private readonly IGroupRepository _groupRepository; // Grup varlığını kontrol etmek için
        private readonly IMapper _mapper;
        private readonly AppDbContext _context; // Transaction ve bazı sorgular için

        public ItemService(IItemRepository itemRepository, IMapper mapper, IGroupRepository groupRepository, AppDbContext context)
        {
            _itemRepository = itemRepository;
            _mapper = mapper;
            _groupRepository = groupRepository;
            _context = context;
        }

        // Belirli bir gruba ait tüm item'ları getirir
        public async Task<IEnumerable<ItemDto>?> GetAllItemsForGroupAsync(int boardId, int groupId)
        {
            // Grup var mı ve doğru panoda mı kontrol et
            var group = await _groupRepository.GetByIdAsync(boardId, groupId);
            if (group == null)
            {
                // Loglama eklenebilir
                return null; // Grup bulunamadı veya yetkisiz erişim
            }
            var items = await _itemRepository.GetAllByGroupIdAsync(groupId);
            return _mapper.Map<IEnumerable<ItemDto>>(items);
        }

        // Belirli bir panoya ait tüm item'ları getirir (Yeni Metot)
        public async Task<IEnumerable<ItemDto>?> GetAllItemsForBoardAsync(int boardId)
        {
            // Pano var mı kontrol et (BoardRepository üzerinden)
            var boardExists = await _context.Boards.AnyAsync(b => b.Id == boardId);
            if (!boardExists)
            {
                return null; // Pano bulunamadı
            }
            var items = await _itemRepository.GetAllByBoardIdAsync(boardId);
            return _mapper.Map<IEnumerable<ItemDto>>(items);
        }

        // Belirli bir item'ı ID'si ile getirir (BoardId doğrulaması yapar)
        public async Task<ItemDto?> GetItemByIdAsync(int boardId, int itemId)
        {
            var item = await _itemRepository.GetByIdWithIncludesAsync(itemId); // Group dahil getirilir

            // Item var mı VE item'ın grubu istenen boardId'ye mi ait kontrol et
            if (item == null || item.Group?.BoardId != boardId)
            {
                return null; // Item bulunamadı veya yetkisiz erişim
            }
            return _mapper.Map<ItemDto>(item);
        }

        // Belirli bir grup için yeni bir item oluşturur
        public async Task<ItemDto?> CreateItemAsync(int boardId, int groupId, CreateItemDto createItemDto)
        {
            // Grup var mı ve doğru panoda mı kontrol et
            var group = await _groupRepository.GetByIdAsync(boardId, groupId);
            if (group == null)
            {
                return null; // Grup bulunamadı veya yetkisiz erişim
            }

            var createdItemEntity = _mapper.Map<Item>(createItemDto);
            createdItemEntity.GroupId = groupId; // GroupId'yi ata

            // Yeni item için doğru Order değerini hesapla
            int maxOrder = await _itemRepository.GetMaxOrderAsync(groupId);
            createdItemEntity.Order = maxOrder + 1; // Yeni item'ı grubun sonuna ekle

            await _itemRepository.AddAsync(createdItemEntity);
            await _itemRepository.SaveChangesAsync(); // Değişiklikleri kaydet

            // Kaydedilen item'ı (ID'si ile birlikte) DTO'ya map edip döndür
            return _mapper.Map<ItemDto>(createdItemEntity);
        }

        // Belirli bir item'ı günceller
        public async Task<bool> UpdateItemAsync(int boardId, int itemId, UpdateItemDto updateItemDto)
        {
            // Item'ı bul (Group dahil) ve BoardId kontrolü yap
            var existingItem = await _itemRepository.GetByIdWithIncludesAsync(itemId);
            if (existingItem == null || existingItem.Group?.BoardId != boardId)
            {
                return false; // Item bulunamadı veya yetkisiz erişim
            }

            // DTO'daki verileri mevcut entity üzerine işle (Mapper bunu yapmalı)
            // Dikkat: Mapper konfigürasyonunda GroupId gibi alanların map edilmediğinden emin ol!
            _mapper.Map(updateItemDto, existingItem);

            // _itemRepository.Update(existingItem); // GenericRepository Update'i zaten Context'e ekler
            await _itemRepository.SaveChangesAsync(); // Değişiklikleri kaydet
            return true;
        }

        // Belirli bir item'ı siler
        public async Task<bool> DeleteItemAsync(int boardId, int itemId)
        {
            // Item'ı bul (Group dahil) ve BoardId kontrolü yap
            var itemToDelete = await _itemRepository.GetByIdWithIncludesAsync(itemId);
            if (itemToDelete == null || itemToDelete.Group?.BoardId != boardId)
            {
                return false; // Item bulunamadı veya yetkisiz erişim
            }

            _itemRepository.Delete(itemToDelete); // Silme işlemini işaretle
            await _itemRepository.SaveChangesAsync(); // Değişiklikleri kaydet

            return true;
        }

        // Bir item'ı taşır (grup içi veya gruplar arası)
        public async Task<bool> MoveItemAsync(int boardId, MoveItemDto moveItemDto)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // 1. Taşınacak Item'ı bul ve BoardId kontrolü yap
                var itemToMove = await _context.Items // Transaction içinde olduğumuz için doğrudan _context kullanabiliriz
                                        .Include(i => i.Group)
                                        .FirstOrDefaultAsync(i => i.Id == moveItemDto.ItemId);

                if (itemToMove == null || itemToMove.Group?.BoardId != boardId)
                {
                    await transaction.RollbackAsync();
                    return false; // Item bulunamadı veya yetkisiz erişim
                }

                int sourceGroupId = itemToMove.GroupId;
                int destinationGroupId = moveItemDto.DestinationGroupId;

                // 2. Hedef Grubun varlığını ve BoardId kontrolünü yap
                var destinationGroupExists = await _context.Groups
                                                    .AnyAsync(g => g.Id == destinationGroupId && g.BoardId == boardId);
                if (!destinationGroupExists)
                {
                    await transaction.RollbackAsync();
                    return false; // Hedef grup bulunamadı veya yetkisiz erişim
                }

                // --- SIRALAMAYI GÜNCELLE ---

                // 3. Kaynak Gruptaki Item'ları Çek ve Güncelle (Eğer gruplar farklıysa)
                if (sourceGroupId != destinationGroupId)
                {
                    // Taşınan item HARİÇ kaynak gruptaki item'ları al
                    var sourceGroupItems = await _context.Items
                                                .Where(i => i.GroupId == sourceGroupId && i.Id != moveItemDto.ItemId)
                                                .OrderBy(i => i.Order)
                                                .ToListAsync();
                    // Yeniden sırala (0'dan başlayarak)
                    for (int i = 0; i < sourceGroupItems.Count; i++)
                    {
                        sourceGroupItems[i].Order = i;
                    }
                    // Not: SaveChangesAsync en sonda çağrılacak
                }

                // 4. Hedef Gruptaki Item'ları Çek (Taşınan HARİÇ, eğer zaten oradaysa)
                var destinationGroupItems = await _context.Items
                                                    .Where(i => i.GroupId == destinationGroupId && i.Id != moveItemDto.ItemId)
                                                    .OrderBy(i => i.Order)
                                                    .ToListAsync();

                // 5. Item'ın GroupId'sini güncelle (EĞER farklıysa)
                if (sourceGroupId != destinationGroupId)
                {
                    itemToMove.GroupId = destinationGroupId;
                }

                // 6. Item'ı hedef listeye doğru index'e ekle
                int finalIndex = Math.Max(0, Math.Min(moveItemDto.DestinationIndex, destinationGroupItems.Count));
                destinationGroupItems.Insert(finalIndex, itemToMove);

                // 7. Hedef gruptaki BİRLEŞTİRİLMİŞ TÜM item'ları yeniden sırala (0'dan başlayarak)
                for (int i = 0; i < destinationGroupItems.Count; i++)
                {
                    destinationGroupItems[i].Order = i;
                }

                // 8. Tüm Değişiklikleri Kaydet (hem GroupId hem de Order güncellemeleri)
                await _context.SaveChangesAsync();

                // 9. Transaction'ı onayla
                await transaction.CommitAsync();

                return true; // İşlem başarılı
            }
            catch (Exception ex)
            {
                // Hata oluşursa transaction'ı geri al
                await transaction.RollbackAsync();
                Console.WriteLine($"Item taşıma hatası (BoardId: {boardId}, ItemId: {moveItemDto.ItemId}): {ex.Message}"); // Loglama
                // Hata detayını da logla (opsiyonel)
                // Console.WriteLine(ex.StackTrace);
                return false; // İşlem başarısız
            }
        }

        
    }
}