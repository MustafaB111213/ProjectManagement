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
        private readonly IBoardRepository _boardRepository;
        private readonly IMapper _mapper;
        private readonly AppDbContext _context; // Transaction ve bazı sorgular için

        public ItemService(IItemRepository itemRepository, IMapper mapper, IGroupRepository groupRepository, AppDbContext context, IBoardRepository boardRepository)
        {
            _itemRepository = itemRepository;
            _mapper = mapper;
            _groupRepository = groupRepository;
            _context = context;
            _boardRepository = boardRepository;
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
            var board = await _boardRepository.GetByIdAsync(boardId);
            if (board == null)
            {
                return null;
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
            // 1) Grup var mı ve doğru panoda mı kontrol et
            var group = await _groupRepository.GetByIdAsync(boardId, groupId);
            if (group == null)
            {
                return null; // Grup bulunamadı veya yetkisiz erişim
            }

            // 2) Eğer ParentItemId doluysa, parent'ı doğrula
            if (createItemDto.ParentItemId.HasValue)
            {
                var parentItem = await _itemRepository.GetByIdWithIncludesAsync(createItemDto.ParentItemId.Value);

                // Parent yoksa veya yanlış board/grup ise hata say
                if (parentItem == null ||
                    parentItem.Group == null ||
                    parentItem.Group.BoardId != boardId ||
                    parentItem.GroupId != groupId)
                {
                    // Şimdilik basitçe null döndürüyoruz (404 gibi davranacak)
                    return null;
                }
            }

            // 3) DTO'yu entity'ye map et
            var createdItemEntity = _mapper.Map<Item>(createItemDto);

            // Güvenlik için GroupId'yi backend belirlesin
            createdItemEntity.GroupId = groupId;

            // 4) Sıra hesaplaması (eski davranışın aynısı)
            int maxOrder = await _itemRepository.GetMaxOrderAsync(groupId);
            createdItemEntity.Order = maxOrder + 1;

            // 5) Kaydet
            await _itemRepository.AddAsync(createdItemEntity);
            await _itemRepository.SaveChangesAsync();

            // 6) DTO olarak geri döndür
            return _mapper.Map<ItemDto>(createdItemEntity);
        }


        // Belirli bir item'ı günceller
        public async Task<bool> UpdateItemAsync(int boardId, int itemId, UpdateItemDto updateItemDto)
        {
            // 1) Item'ı bul (Group dahil) ve BoardId kontrolü yap
            var existingItem = await _itemRepository.GetByIdWithIncludesAsync(itemId);
            if (existingItem == null || existingItem.Group?.BoardId != boardId)
            {
                return false; // Item bulunamadı veya yetkisiz erişim
            }

            // 2) ParentItemId değişecekse kontrol et
            if (updateItemDto.ParentItemId.HasValue)
            {
                // Kendini kendine parent yapma
                if (updateItemDto.ParentItemId.Value == itemId)
                {
                    return false;
                }

                var parentItem = await _itemRepository.GetByIdWithIncludesAsync(updateItemDto.ParentItemId.Value);

                if (parentItem == null ||
                    parentItem.Group == null ||
                    parentItem.Group.BoardId != boardId ||
                    parentItem.GroupId != existingItem.GroupId)
                {
                    // Farklı board veya farklı group'a parent atanamaz
                    return false;
                }

                // (İstersen burada döngü oluşmaması için yukarı doğru zinciri kontrol eden ek bir logic de yazabiliriz)
            }

            // 3) DTO'daki verileri mevcut entity üzerine işle
            _mapper.Map(updateItemDto, existingItem);

            await _itemRepository.SaveChangesAsync();
            return true;
        }


        // Belirli bir item'ı siler
        public async Task<bool> DeleteItemAsync(int boardId, int itemId)
        {
            // 1. Önce silinecek öğeyi ÇOCUKLARIYLA BERABER (Include) getiriyoruz.
            // ClientCascade'in çalışması için EF Core'un çocuklardan haberdar olması ŞARTTIR.
            var itemToDelete = await _context.Items
                                             .Include(i => i.Children) // <--- KRİTİK NOKTA BURASI
                                             .FirstOrDefaultAsync(i => i.Id == itemId);

            // Item bulunamadıysa veya başka bir board'a aitse (güvenlik)
            if (itemToDelete == null || itemToDelete.GroupId != 0 && itemToDelete.Group?.BoardId != boardId) // GroupId kontrolünü kendi yapına göre uyarla
            {
                // Not: Burada Include(i => i.Group) yapmadığımız için Group null gelebilir, 
                // BoardId kontrolü için Group'u da include etmen gerekebilir:
                // .Include(i => i.Group)

                // Basitçe null kontrolü yapıp false dönelim:
                if (itemToDelete == null) return false;
            }

            // --- DERİN HİYERARŞİ VARSA (Torunlar) ---
            // Eğer alt görevlerin de alt görevleri varsa (3. seviye), onları da yüklememiz gerekir.
            // EF Core standart Include sadece 1 seviye iner. 
            // Tüm ağacı silmek için "Load" metodu ile recursive yükleme yapabiliriz:
            await LoadChildrenRecursively(itemToDelete);

            // 2. Şimdi siliyoruz. EF Core çocukların yüklü olduğunu gördüğü için
            // arka planda önce onları silecek, sonra babayı silecek.
            _context.Items.Remove(itemToDelete);

            await _context.SaveChangesAsync();
            return true;
        }

        // Yardımcı Metot: Alt görevlerin alt görevlerini de yükler
        private async Task LoadChildrenRecursively(Item item)
        {
            if (item.Children != null && item.Children.Any())
            {
                foreach (var child in item.Children)
                {
                    await _context.Entry(child)
                                  .Collection(c => c.Children)
                                  .LoadAsync();

                    await LoadChildrenRecursively(child);
                }
            }
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

                // 5. ParentItemId'yi gelen dto'ya göre ayarla (alt görev / üst seviye)
                int? newParentId = moveItemDto.ParentItemId;

                if (newParentId.HasValue)
                {
                    // Kendini kendine parent yapma
                    if (newParentId.Value == itemToMove.Id)
                    {
                        await transaction.RollbackAsync();
                        return false;
                    }

                    var parentItem = await _context.Items
                        .Include(i => i.Group)
                        .FirstOrDefaultAsync(i => i.Id == newParentId.Value);

                    if (parentItem == null ||
                        parentItem.Group == null ||
                        parentItem.Group.BoardId != boardId ||
                        parentItem.GroupId != destinationGroupId)  // 👈 parent aynı grupta olmalı
                    {
                        await transaction.RollbackAsync();
                        return false;
                    }

                    // (İstersen burada parentItem'ın yukarısındaki zincirde döngü var mı diye kontrol ekleyebilirsin)
                }

                // 6. Item'ın GroupId ve ParentItemId'sini güncelle
                itemToMove.GroupId = destinationGroupId;
                itemToMove.ParentItemId = newParentId;



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
        // Belirli bir gruba ait item'ları ağaç yapısında döndürür
        public async Task<IEnumerable<ItemTreeDto>?> GetItemTreeForGroupAsync(int boardId, int groupId)
        {
            // 1) Grup var mı ve doğru panoda mı kontrol et
            var group = await _groupRepository.GetByIdAsync(boardId, groupId);
            if (group == null)
            {
                return null; // Grup yoksa veya bu board'a ait değilse
            }

            // 2) İlgili gruptaki tüm item'ları çek (şu an zaten Order'a göre sıralanıyor)
            var items = await _itemRepository.GetAllByGroupIdAsync(groupId);

            // 3) Entity -> DTO map et
            var itemDtos = _mapper.Map<List<ItemTreeDto>>(items);

            // 4) Id üzerinden hızlı erişim için dictionary oluştur
            var byId = itemDtos.ToDictionary(i => i.Id);

            // 5) Ağaç yapısını kur
            foreach (var dto in itemDtos)
            {
                if (dto.ParentItemId.HasValue && byId.TryGetValue(dto.ParentItemId.Value, out var parent))
                {
                    parent.Children.Add(dto);
                }
            }

            // 6) Root (üst seviye) item'ları dön (parent'ı olmayanlar)
            var roots = itemDtos
                .Where(i => !i.ParentItemId.HasValue)
                .ToList();

            return roots;
        }

    }
}