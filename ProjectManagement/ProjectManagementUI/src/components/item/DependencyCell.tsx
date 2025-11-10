// src/components/item/DependencyCell.tsx (GÜNCELLENMİŞ VE HATASIZ)

import React, { useState, useRef, useMemo } from 'react';
// FiX import'u eklendi
import type { Item, Column, DependencyLink, DependencyType } from '../../types';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { updateItemValue } from '../../store/features/itemSlice';
import { selectAllItemsFlat } from '../../store/features/itemSlice';
import Popover from '../common/Popover';
import { FiPlus, FiGitBranch, FiX, FiCheck } from 'react-icons/fi'; // FiX importu eklendi

// Props arayüzü (Hata 2304 düzeltildi: Tanım yukarıda mevcut olduğu için artık bulunabilir)
interface DependencyCellProps {
  item: Item;
  column: Column;
}

// ... (DependencyChip, ProcessedDependency tipleri aynı)
const DependencyChip: React.FC<{ text: string, onClick?: () => void }> = ({ text, onClick }) => (
  <div
    onClick={onClick}
    className={`bg-gray-200 text-gray-800 text-xs font-medium px-2.5 py-1 rounded-full flex items-center ${onClick ? 'cursor-pointer hover:bg-gray-300' : ''}`}
  >
    {text}
  </div>
);

type ProcessedDependency = DependencyLink & { name: string };
// ==================================================================
// POPULAR CONTENT (Popover içeriği - Daha önceki adımlardan)
// = Bu component bağımlılıkları düzenler ve kaydeder.
// ==================================================================
// Popover İçeriği (GÜNCEL)
const DependencyPopoverContent: React.FC<{
  currentItemId: number;
  initialDependencyLinks: DependencyLink[];
  onSave: (newLinks: DependencyLink[]) => void;
}> = ({ currentItemId, initialDependencyLinks, onSave }) => {

  const [selectedLinks, setSelectedLinks] = useState<Map<number, DependencyType>>(
    new Map(initialDependencyLinks.map(link => [link.id, link.type]))
  );

  const allItems = useAppSelector(selectAllItemsFlat);
  const potentialDependencies = useMemo(() => {
    // Tüm görevleri al ve mevcut görevi listeden çıkar
    return allItems.filter(i => i.id !== currentItemId);
  }, [allItems, currentItemId]);

  // --- Handler'lar (Aynı) ---
  const handleSelectionChange = (id: number, type?: DependencyType) => {
    setSelectedLinks(prev => {
      const newMap = new Map(prev);
      if (type) { newMap.set(id, type); } else { newMap.delete(id); }
      return newMap;
    });
  };

  const handleSave = () => {
    const linksToSave: DependencyLink[] = Array.from(selectedLinks.entries()).map(([id, type]) => ({ id, type }));
    onSave(linksToSave);
  };

  const dependencyTypes: DependencyType[] = ['FS', 'SS', 'FF', 'SF'];

  return (
    // Popover'ın kendisi border ve shadow'u Popover.tsx'den alır.
    <div className="p-0"> {/* Padding'i iç div'lere veriyoruz */}

      {/* Görev Listesi */}
      <div className="max-h-60 overflow-y-auto p-2 space-y-1">
        {potentialDependencies.map(depItem => {
          const isSelected = selectedLinks.has(depItem.id);
          const currentType = selectedLinks.get(depItem.id) || 'FS';

          return (
            <div
              key={depItem.id}
              className={`flex flex-col p-1.5 rounded ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
            >
              {/* 1. Görev Adı + Checkbox + (Seçiliyse) Bağımlılık Türü */}
              <label className="flex items-center cursor-pointer justify-between">
                <div className="flex items-center flex-grow mr-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded mr-2 border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                    checked={isSelected}
                    onChange={() =>
                      handleSelectionChange(depItem.id, isSelected ? undefined : 'FS')
                    }
                  />
                  <span
                    className={`text-sm ${isSelected ? 'font-medium' : 'text-gray-800'
                      } truncate`}
                  >
                    {depItem.name}
                  </span>
                </div>

                {/* 2. Bağımlılık Tipi Seçimi — Sağda göster */}
                {isSelected && (
                  <select
                    value={currentType}
                    onChange={(e) =>
                      handleSelectionChange(depItem.id, e.target.value as DependencyType)
                    }
                    className="text-xs border border-gray-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  >
                    {dependencyTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                )}
              </label>
            </div>

          );
        })}
      </div>

      {/* Kaydet Butonu */}
      <div className="p-3 border-t border-gray-200">
        <button
          onClick={handleSave}
          className="w-full bg-blue-600 text-white text-sm font-semibold py-1.5 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Kaydet
        </button>
      </div>
    </div>
  );
};

const DependencyCell: React.FC<DependencyCellProps> = ({ item, column }) => {
  const dispatch = useAppDispatch();
  const allItems = useAppSelector(selectAllItemsFlat);

  const [isPopoverOpen, setPopoverOpen] = useState(false);
  const cellRef = useRef<HTMLDivElement>(null); // Butonlar için referans

  // Mevcut JSON değerini al
  const currentValue = item.itemValues.find(v => v.columnId === column.id)?.value || '';

  // YENİ: Hızlı arama için tüm geçerli Item ID'lerinin Set'ini oluştur
  const allItemIds = useMemo(() => new Set(allItems.map(i => i.id)), [allItems]);

  // JSON'u parse et ve DependencyLink dizisini al (GÜNCELLENDİ)
  const dependencyLinks = useMemo((): DependencyLink[] => {
    let links: DependencyLink[] = [];
    try {
      if (currentValue) {
        const parsed = JSON.parse(currentValue);
        if (Array.isArray(parsed)) {
          // HATA DÜZELTMESİ:
          // Sadece Redux state'inde (allItems) hala var olan 
          // görevlere olan bağımlılıkları filtrele.
          links = (parsed as DependencyLink[]).filter(link =>
            typeof link.id === 'number' &&
            typeof link.type === 'string' &&
            allItemIds.has(link.id) // <-- Sadece var olanları tut
          );
        }
      }
    } catch {
      links = [];
    }
    return links;
  }, [currentValue, item.id, allItemIds]); // 'allItemIds' bağımlılığı eklendi

  // ID'lere karşılık gelen Item nesnelerini bul (Gösterim için)
  const dependentItemsMap = useMemo(() => {
    const map = new Map<number, Item>();
    dependencyLinks.forEach(link => {
      const linkedItem = allItems.find(i => i.id === link.id);
      if (linkedItem) map.set(link.id, linkedItem);
    });
    return map;
  }, [dependencyLinks, allItems]);

  // handleSave: Gelen DependencyLink dizisini JSON'a çevirip kaydet
  const handleSave = (newLinks: DependencyLink[]) => {
    const valueToSave = JSON.stringify(newLinks);
    dispatch(updateItemValue({
      itemId: item.id,
      columnId: column.id,
      value: valueToSave,
    }));
    setPopoverOpen(false);
  };

  // Birincil çip verisi (İlk bağımlılık)
  const firstDep = dependencyLinks.length > 0 ? dependencyLinks[0] : null;
  const firstDepItem = firstDep ? dependentItemsMap.get(firstDep.id) : null;

  return (
    <div className="w-full h-full flex items-center justify-center p-2">

      <div className="flex items-center gap-1.5">
        {/* 1. İlk Çip (varsa) */}
        {firstDep && firstDepItem && (
          <div ref={cellRef}> {/* Popover'ı bu çipe bağlamak için ref burada */}
            <DependencyChip
              // Tüm düzenlemeyi Popover içinde yapacağımız için,
              // bu çipe tıklamak Popover'ı açar
              onClick={() => setPopoverOpen(true)}
              text={`${firstDep.type}: ${firstDepItem.name}`}
            />
          </div>
        )}

        {/* 2. '...daha fazla' Sayacı (varsa) */}
        {dependencyLinks.length > 1 && (
          <div
            // Sayacı, ilk çipin yanında gösteriyoruz
            ref={!firstDep ? cellRef : undefined} // İlk çip yoksa, ref'i buna bağla
          >
            <DependencyChip
              text={`+${dependencyLinks.length - 1}`}
              onClick={() => setPopoverOpen(true)}
            />
          </div>
        )}

        {/* 3. Ekle Butonu (Varsa) */}
        {dependencyLinks.length === 0 && (
          // Hiç bağımlılık yoksa, FiPlus simgeli placeholder göster
          <div
            ref={cellRef} // Ref'i placeholder'a bağla
            onClick={() => setPopoverOpen(true)}
            className="w-6 h-6 rounded bg-gray-200 text-gray-500 hover:bg-blue-500 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <FiPlus size={16} />
          </div>
        )}
      </div>

      <Popover
        isOpen={isPopoverOpen}
        onClose={() => setPopoverOpen(false)}
        targetRef={cellRef} // Bağlanan referans
      >
        <DependencyPopoverContent
          currentItemId={item.id}
          initialDependencyLinks={dependencyLinks}
          onSave={handleSave}
        />
      </Popover>
    </div>
  );
};

export default DependencyCell;