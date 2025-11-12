// src/components/gantt/GanttLeftPanel.tsx

import React, { useMemo } from 'react';
import type { Group, Item } from '../../types';
import { FiChevronDown, FiChevronRight } from 'react-icons/fi';
import { GANTT_ROW_HEIGHT_PX } from '../common/constants';

// --- YENİ: PERFORMANS İÇİN MEMOIZED SATIR ---
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


// --- GÜNCELLENMİŞ PROPS ---
interface GanttLeftPanelProps {
    groups: Group[];
    items: Item[];
    collapsedGroupIds: Set<number>; 
    onToggleGroup: (groupId: number) => void;
    onItemClick?: (itemId: number) => void;
    hoveredItemId: number | null;
    innerRef: React.Ref<HTMLDivElement>; 
    // onWheel: (event: React.WheelEvent<HTMLDivElement>) => void; // <-- BU SATIRI SİLİN
}

const GanttLeftPanel: React.FC<GanttLeftPanelProps> = ({
    groups,
    items,
    collapsedGroupIds,
    onToggleGroup,
    onItemClick,
    hoveredItemId,
    innerRef,
    // onWheel, // <-- Buradan da silindi
}) => {
    
    const itemsByGroupId = useMemo(() => {
        const map = items.reduce((acc, item) => {
            (acc[item.groupId] = acc[item.groupId] || []).push(item);
            return acc;
        }, {} as { [key: number]: Item[] });

        for (const groupId in map) {
            map[groupId].sort((a, b) => a.order - b.order);
        }
        return map;
    }, [items]);

    return (
        // 'onWheel' bu dış div'den kaldırıldı
        <div className="w-full bg-primary-background h-full overflow-y-hidden">

            {/* Sütun Başlıkları (Aynı) */}
            <div
                className="flex items-center sticky top-0 bg-gray-50 z-20 border-b border-application-border text-secondary-text text-sm font-medium"
                style={{ height: `${GANTT_ROW_HEIGHT_PX}px` }}
            >
                <span className="px-3 py-2">Görev Adı</span>
            </div>

            {/* Gruplar ve Görevler (Aynı) */}
            <div
                ref={innerRef} 
                className="relative"
            >
                {groups.map(group => {
                    const isCollapsed = collapsedGroupIds.has(group.id);
                    const groupItems = itemsByGroupId[group.id] || [];
                    return (
                        <div key={group.id} className="group-section">
                            {/* Grup Başlığı */}
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

                            {/* Görev Satırları (MemoizedItemRow kullanılıyor) */}
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

export default React.memo(GanttLeftPanel);