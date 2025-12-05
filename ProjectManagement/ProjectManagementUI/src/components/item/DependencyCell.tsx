// src/components/item/DependencyCell.tsx

import React, { useState, useRef, useMemo } from 'react';
import type { Item, Column, DependencyLink, DependencyType, Group } from '../../types';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { updateItemValue, selectAllItemsFlat } from '../../store/features/itemSlice';
import { selectAllGroups } from '../../store/features/groupSlice';
import Popover from '../common/Popover';
import {
  FiPlus,
  FiSearch,
  FiX,
  FiCheck,
  FiChevronDown,
} from 'react-icons/fi';

// --- TİPLER ---

interface DependencyCellProps {
  item: Item;
  column: Column;
  align?: 'center' | 'left';
}

// --- MİNİMALİST ALT BİLEŞENLER ---

// 1. MinimalChip (Küçük düzeltmelerle)
const MinimalChip: React.FC<{
  label: string;
  type?: string;
  color?: string;
  isCounter?: boolean;
  onRemove?: () => void;
  onClick?: () => void;
  className?: string; // Ekstra stil sınıfı desteği
}> = ({ label, type, color, isCounter, onRemove, onClick, className = '' }) => {

  const style = useMemo(() => {
    if (isCounter || !color) return {};
    return {
      backgroundColor: `${color}1A`,
      borderColor: `${color}4D`,
      color: color
    };
  }, [color, isCounter]);

  return (
    <div
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      // max-w-full ekledik ki flex içinde taşmasın
      className={`
        flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] transition-all cursor-pointer select-none border
        ${isCounter
          ? 'bg-gray-100 text-gray-500 border-transparent hover:bg-gray-200'
          : 'hover:opacity-80'
        }
        ${!color && !isCounter ? 'bg-gray-50 text-gray-700 border-transparent hover:border-gray-200' : ''}
        ${className}
      `}
      style={style}
      title={label}
    >
      {type && (
        <span className="text-[9px] font-extrabold uppercase tracking-wider opacity-70 shrink-0">
          {type}
        </span>
      )}
      <span className="truncate font-medium leading-tight">
        {label}
      </span>

      {onRemove && (
        <span
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="ml-1 p-0.5 rounded-full hover:bg-black/10 transition-colors shrink-0"
        >
          <FiX size={10} />
        </span>
      )}
    </div>
  );
};


// 3. DependencyPopoverContent (Değişmedi - Önceki versiyon ile aynı)
const DependencyPopoverContent: React.FC<{
  currentItemId: number;
  initialDependencyLinks: DependencyLink[];
  onSave: (newLinks: DependencyLink[]) => void;
  onClose: () => void;
}> = ({ currentItemId, initialDependencyLinks, onSave, onClose }) => {

  const [selectedLinks, setSelectedLinks] = useState<Map<number, DependencyType>>(
    new Map(initialDependencyLinks.map(link => [link.id, link.type]))
  );
  const [searchQuery, setSearchQuery] = useState('');

  const allItems = useAppSelector(selectAllItemsFlat);
  const allGroups = useAppSelector(selectAllGroups);

  const selectedItemsData = useMemo(() => {
    const items: { item: Item, type: DependencyType, color?: string }[] = [];
    selectedLinks.forEach((type, id) => {
      const foundItem = allItems.find(i => i.id === id);
      if (foundItem) {
        const group = allGroups.find(g => g.id === foundItem.groupId);
        items.push({ item: foundItem, type, color: group?.color });
      }
    });
    return items;
  }, [selectedLinks, allItems, allGroups]);

  const groupedTasks = useMemo(() => {
    const filtered = allItems.filter(i =>
      i.id !== currentItemId &&
      i.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const map = new Map<number, Item[]>();
    allGroups.forEach(g => map.set(g.id, []));
    filtered.forEach(item => {
      const list = map.get(item.groupId);
      if (list) list.push(item);
    });
    const result: { group: Group, items: Item[] }[] = [];
    allGroups.forEach(group => {
      const itemsInGroup = map.get(group.id);
      if (itemsInGroup && itemsInGroup.length > 0) {
        result.push({ group, items: itemsInGroup });
      }
    });
    return result;
  }, [allItems, allGroups, currentItemId, searchQuery]);

  const handleToggle = (id: number) => {
    setSelectedLinks(prev => {
      const newMap = new Map(prev);
      if (newMap.has(id)) newMap.delete(id);
      else newMap.set(id, 'FS');
      return newMap;
    });
  };

  const handleRemove = (id: number) => {
    setSelectedLinks(prev => {
      const newMap = new Map(prev);
      newMap.delete(id);
      return newMap;
    });
  };

  const handleTypeChange = (id: number, type: DependencyType) => {
    setSelectedLinks(prev => {
      const newMap = new Map(prev);
      newMap.set(id, type);
      return newMap;
    });
  };

  const handleSave = () => {
    const linksToSave = Array.from(selectedLinks.entries()).map(([id, type]) => ({ id, type }));
    onSave(linksToSave);
  };

  const dependencyTypes: DependencyType[] = ['FS', 'SS', 'FF', 'SF'];

  return (
    <div className="w-80 flex flex-col bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden font-sans text-sm h-[420px]">
      <div className="px-3 py-3 border-b border-gray-50 space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Bağımlılıklar</span>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-500 transition-colors">
            <FiX size={16} />
          </button>
        </div>
        {selectedItemsData.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1 pb-2">
            {selectedItemsData.map(({ item, type, color }) => (
              <MinimalChip
                key={item.id}
                label={item.name}
                type={type}
                color={color}
                onRemove={() => handleRemove(item.id)}
              />
            ))}
          </div>
        )}
        <input
          type="text"
          placeholder="Listede ara..."
          className="w-full bg-gray-50 border border-gray-100 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-gray-300 text-gray-700"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          autoFocus={selectedItemsData.length === 0}
        />
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {groupedTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-300 gap-1">
            <FiSearch size={20} />
            <span className="text-xs">Bulunamadı</span>
          </div>
        ) : (
          groupedTasks.map(({ group, items }) => (
            <div key={group.id} className="mb-3">
              <div className="px-2 mb-1 flex items-center gap-2 sticky top-0 bg-white z-10 py-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest" style={{ color: group.color }}>
                  {group.title}
                </span>
                <div className="flex-1 h-px bg-gray-50"></div>
              </div>
              <div>
                {items.map(task => {
                  const isSelected = selectedLinks.has(task.id);
                  const currentType = selectedLinks.get(task.id) || 'FS';
                  return (
                    <div
                      key={task.id}
                      onClick={() => handleToggle(task.id)}
                      className={`flex items-center justify-between px-2 py-1.5 rounded cursor-pointer transition-all ${isSelected ? 'bg-gray-50 opacity-50' : 'hover:bg-gray-50'}`}
                    >
                      <div className="flex items-center gap-3 overflow-hidden flex-1">
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all flex-shrink-0 ${isSelected ? 'bg-gray-800 border-gray-800 text-white' : 'bg-transparent border-gray-300 hover:border-gray-400'}`}>
                          {isSelected && <FiCheck size={10} />}
                        </div>
                        <span className={`truncate text-sm ${isSelected ? 'text-gray-900 font-medium line-through decoration-gray-300' : 'text-gray-600'}`}>{task.name}</span>
                      </div>
                      {isSelected && (
                        <div onClick={(e) => e.stopPropagation()} className="ml-2 flex items-center">
                          <div className="relative group/select">
                            <select
                              value={currentType}
                              onChange={(e) => handleTypeChange(task.id, e.target.value as DependencyType)}
                              className="appearance-none bg-transparent text-xs font-bold text-gray-500 hover:text-black cursor-pointer pr-3 focus:outline-none text-right"
                            >
                              {dependencyTypes.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                            <FiChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={10} />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
      <div className="p-2 border-t border-gray-100 flex justify-end items-center bg-white">
        <button onClick={handleSave} className="px-6 py-1.5 bg-black hover:bg-gray-800 text-white text-xs font-medium rounded transition-colors">Kaydet ({selectedLinks.size})</button>
      </div>
    </div>
  );
};

// --- ANA BİLEŞEN ---

const DependencyCell: React.FC<DependencyCellProps> = ({ item, column }) => {
  const dispatch = useAppDispatch();
  const allItems = useAppSelector(selectAllItemsFlat);
  const allGroups = useAppSelector(selectAllGroups);

  const [isPopoverOpen, setPopoverOpen] = useState(false);
  const cellRef = useRef<HTMLDivElement>(null);

  const currentValue = item.itemValues.find(v => v.columnId === column.id)?.value || '';
  const allItemIds = useMemo(() => new Set(allItems.map(i => i.id)), [allItems]);

  const dependencyLinks = useMemo((): DependencyLink[] => {
    try {
      if (!currentValue) return [];
      const parsed = JSON.parse(currentValue);
      if (Array.isArray(parsed)) {
        return (parsed as DependencyLink[]).filter(link =>
          typeof link.id === 'number' && typeof link.type === 'string' && allItemIds.has(link.id)
        );
      }
      return [];
    } catch { return []; }
  }, [currentValue, allItemIds]);

  const enrichedDependencies = useMemo(() => {
    return dependencyLinks.map(link => {
      const linkedItem = allItems.find(i => i.id === link.id);
      const linkedGroup = linkedItem ? allGroups.find(g => g.id === linkedItem.groupId) : null;
      return {
        ...link,
        name: linkedItem?.name || 'Bilinmeyen',
        color: linkedGroup?.color
      };
    }).filter(d => d.name !== 'Bilinmeyen');
  }, [dependencyLinks, allItems, allGroups]);

  const handleSave = (newLinks: DependencyLink[]) => {
    dispatch(updateItemValue({
      itemId: item.id,
      columnId: column.id,
      value: JSON.stringify(newLinks),
    }));
    setPopoverOpen(false);
  };

  const count = enrichedDependencies.length;

  return (
    <div
      className="w-full h-full px-2 group/cell relative"
      onDoubleClick={() => setPopoverOpen(true)}
    >
      {/* DÜZELTME 1: Ana kapsayıcı. 
         justify-center kullanarak boş durumu ortalıyoruz.
         Dolu durumda ise içerik zaten w-full olduğu için sola yaslı gibi davranacak.
      */}
      <div
        ref={cellRef}
        className={`w-full h-full flex items-center ${count === 0 ? 'justify-center' : 'justify-start'}`}
      >

        {/* A. Boş Durum: Tam ortada görünen + butonu */}
        {count === 0 && (
          <div
            onClick={() => setPopoverOpen(true)}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 group-hover/cell:text-gray-800 transition-all cursor-pointer"
          >
            <FiPlus size={14} />
          </div>
        )}

        {/* B. Dolu Durum: Esnek yapı (Flexbox) */}
        {count > 0 && (
          <div className="flex items-center gap-1 w-full overflow-hidden">

            {/* 1. Etiket: min-w-0 ve shrink sayesinde metin sığmazsa ... olur */}
            {enrichedDependencies[0] && (
              <div className="min-w-0 shrink">
                <MinimalChip
                  label={enrichedDependencies[0].name}
                  type={enrichedDependencies[0].type}
                  color={enrichedDependencies[0].color}
                  onClick={() => setPopoverOpen(true)}
                  className="w-full" // İçeriğin taşmasını engellemek için
                />
              </div>
            )}

            {/* 2. Sayaç: shrink-0 sayesinde ASLA kaybolmaz */}
            {count > 1 && (
              <div className="shrink-0">
                <MinimalChip
                  label={`+${count - 1}`}
                  isCounter
                  onClick={() => setPopoverOpen(true)}
                />
              </div>
            )}

            {/* Hover Ekle Butonu: shrink-0 */}
            <button
              onClick={(e) => { e.stopPropagation(); setPopoverOpen(true); }}
              className="hidden group-hover/cell:flex text-gray-300 hover:text-gray-600 ml-auto shrink-0 transition-colors"
            >
              <FiPlus size={14} />
            </button>
          </div>
        )}
      </div>

      <Popover
        isOpen={isPopoverOpen}
        onClose={() => setPopoverOpen(false)}
        targetRef={cellRef}
        position="bottom-start"
        widthClass="w-auto"
        paddingClass="p-0"
      >
        <DependencyPopoverContent
          currentItemId={item.id}
          initialDependencyLinks={dependencyLinks}
          onSave={handleSave}
          onClose={() => setPopoverOpen(false)}
        />
      </Popover>
    </div>
  );
};

export default DependencyCell;