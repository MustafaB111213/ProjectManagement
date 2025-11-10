// src/components/gantt/GanttLeftPane.tsx

import React from 'react';
import type { Group, Item } from '../../types';
import { FiChevronDown, FiChevronRight } from 'react-icons/fi';
import { GANTT_ROW_HEIGHT_PX } from '../common/constants'; // (Dosya yolunu kendinize göre düzeltin)


// --- YENİ: PERFORMANS İÇİN MEMOIZED SATIR ---
// Bu bileşen, prop'ları değişmediği sürece (örn: isHovered)
// yeniden render olmayı reddedecek.
const MemoizedItemRow: React.FC<{ item: Item; isHovered: boolean; onClick?: (itemId: number) => void }> = React.memo(({ item, isHovered, onClick }) => {
    return (
        <div 
            key={item.id} 
            onClick={() => onClick && onClick(item.id)}
            className={`
                flex items-center px-3 py-2 border-t border-application-border text-sm text-primary-text 
                ${isHovered ? 'bg-gray-200' : 'hover:bg-gray-50'} 
                ${onClick ? 'cursor-pointer' : ''}
            `} 
            style={{ height: `${GANTT_ROW_HEIGHT_PX}px` }} 
        >
            {item.name}
        </div>
    );
});
// --- MEMOIZED SATIR SONU ---

interface GanttLeftPanelProps {
  groups: Group[];
  items: Item[]; // allItemsFlat dizisi
  collapsedGroupIds: Set<number>; 
  onToggleGroup: (groupId: number) => void; // <-- YENİ PROP
  onItemClick?: (itemId: number) => void; // <-- YENİ PROP (Opsiyonel)
  hoveredItemId: number | null;
  // YENİ PROPLAR (PERFORMANS İÇİN)
    innerRef: React.Ref<HTMLDivElement>; // ScrollTop'u alacak iç div'in ref'i
    onWheel: (event: React.WheelEvent<HTMLDivElement>) => void; // Tekerlek olayını parent'a ilet
}

const GanttLeftPanel: React.FC<GanttLeftPanelProps> = ({
  groups,
  items,
  collapsedGroupIds,
  onToggleGroup,
  onItemClick,
  hoveredItemId,
  innerRef, // <-- YENİ
    onWheel,  // <-- YENİ
}) => {
  // Not: Veriyi `items` prop'undan almak yerine, 
  // 'itemsByGroup' selector'ını kullanmak daha doğru olabilir.
  // Şimdilik basit tutalım ve 'items' prop'unu gruplayalım.
  // GÜNCELLENDİ: Hizalama sorununu çözmek için sıralama eklendi
  const itemsByGroupId = React.useMemo(() => {
    const map = items.reduce((acc, item) => {
      (acc[item.groupId] = acc[item.groupId] || []).push(item);
      return acc;
    }, {} as { [key: number]: Item[] });

    // HİZALAMA DÜZELTMESİ:
    // Her bir grup içindeki görevleri 'order'a göre sırala
    for (const groupId in map) {
      map[groupId].sort((a, b) => a.order - b.order);
    }

    return map;
  }, [items]);
  // --- GÜNCELLEME SONU ---

  return (
    // Arka planı beyaz yapıyoruz
    <div className="w-full bg-primary-background h-full">

      {/* Sütun Başlıkları */}
      <div
        // Arka planı hafif gri, alt sınırı ve metin rengini ayarla
        className="flex items-center sticky top-0 bg-gray-50 z-20 border-b border-application-border text-secondary-text text-sm font-medium"
        style={{ height: `${GANTT_ROW_HEIGHT_PX}px` }}
      >
        {/* Daha fazla padding ekleyelim */}
        <span className="px-3 py-2">Görev Adı</span>
      </div>

      {/* Gruplar ve Görevler (GÜNCELLENDİ) */}
            <div
                ref={innerRef} // <-- YENİ: Parent'tan gelen ref'i buraya bağla
                className="relative"
                // style={{ transform: `translateY(-${scrollTop}px)` }} // <-- SİLİNDİ (Ref ile yönetiliyor)
            >
                {groups.map(group => {
                    const isCollapsed = collapsedGroupIds.has(group.id);
                    const groupItems = itemsByGroupId[group.id] || [];
                    return (
                        <div key={group.id} className="group-section">
                            {/* Grup Başlığı (Aynı) */}
                            <div
                                onClick={() => onToggleGroup(group.id)}
                                className="flex items-center px-3 py-2 text-sm font-semibold cursor-pointer hover:bg-gray-50"
                                style={{ color: group.color, height: `${GANTT_ROW_HEIGHT_PX}px` }}
                            >
                                <span className="mr-1 flex items-center justify-center">
                                    {isCollapsed ? <FiChevronRight /> : <FiChevronDown />}
                                </span>
                                <span className="truncate">{group.title}</span>
                                <span className="ml-2 text-gray-400 font-normal">({groupItems.length})</span>
                            </div>

                            {/* Görev Satırları (GÜNCELLENDİ: MemoizedItemRow kullanıldı) */}
                            {!isCollapsed && groupItems.map(item => {
                                const isHovered = item.id === hoveredItemId;
                                return (
                                    <MemoizedItemRow
                                        key={item.id}
                                        item={item}
                                        isHovered={isHovered}
                                        onClick={onItemClick}
                                    />
                                );
                            })}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// GÜNCELLENDİ: GanttLeftPanel'i de React.memo ile sarın.
// Bu, zoom veya yatay kaydırma sırasında sol panelin gereksiz render olmasını engeller.
export default React.memo(GanttLeftPanel);