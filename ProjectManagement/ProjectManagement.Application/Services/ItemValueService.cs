using AutoMapper;
using ProjectManagement.Application.DTOs.ItemValue;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Interfaces;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectManagement.Application.Services
{
    public class ItemValueService : IItemValueService
    {
        private readonly IItemValueRepository _itemValueRepository;
        private readonly IItemRepository _itemRepository; // Item'ın varlığını kontrol etmek için
        private readonly IColumnRepository _columnRepository; // Column'un varlığını kontrol etmek için
        private readonly IMapper _mapper;

        public ItemValueService(IItemValueRepository itemValueRepository, IItemRepository itemRepository, IColumnRepository columnRepository, IMapper mapper)
        {
            _itemValueRepository = itemValueRepository;
            _itemRepository = itemRepository;
            _columnRepository = columnRepository;
            _mapper = mapper;
        }

        public async Task<ItemValueDto> UpsertItemValueAsync(int itemId, UpdateItemValueDto dto)
        {
            // GÜVENLİK KONTROLÜ 1: Güncellenmek istenen Item var mı?
            var item = await _itemRepository.GetByIdAsync(itemId); // Generic GetById
            if (item == null) return null;

            // GÜVENLİK KONTROLÜ 2: Değer girilmek istenen Column var mı?
            var column = await _columnRepository.GetByIdAsync(dto.ColumnId); // Generic GetById
            if (column == null) return null;

            // TODO: İleri seviye kontrol: Column, Item'ın bulunduğu Board'a ait mi?

            // "Upsert" mantığı burada başlıyor
            var existingValue = await _itemValueRepository.GetByItemIdAndColumnIdAsync(itemId, dto.ColumnId);

            if (existingValue != null)
            {
                // DURUM 1: Değer zaten var, GÜNCELLE
                existingValue.Value = dto.Value;
                _itemValueRepository.Update(existingValue);
            }
            else
            {
                // DURUM 2: Değer yok, YENİ OLUŞTUR
                var newValue = new ItemValue
                {
                    ItemId = itemId,
                    ColumnId = dto.ColumnId,
                    Value = dto.Value
                };
                await _itemValueRepository.AddAsync(newValue);
            }

            await _itemValueRepository.SaveChangesAsync();

            // Sonucu almak için tekrar veritabanından okuyalım
            var finalValue = await _itemValueRepository.GetByItemIdAndColumnIdAsync(itemId, dto.ColumnId);
            return _mapper.Map<ItemValueDto>(finalValue);
        }
    }
}
