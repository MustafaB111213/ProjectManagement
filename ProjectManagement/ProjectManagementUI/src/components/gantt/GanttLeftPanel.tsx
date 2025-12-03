// src/components/gantt/GanttLeftPanel.tsx

import React, { useMemo } from 'react';
import TimelineCell from '../item/TimelineCell';
import { ColumnType, type Column, type Group, type Item } from '../../types';
import { FiChevronDown, FiChevronRight } from 'react-icons/fi';
import { GANTT_ROW_HEIGHT_PX } from '../common/constants';
// ItemWithDepth tipini import et veya burada cast et
import { type ItemWithDepth } from '../../utils/hierarchyUtils';

interface GanttLeftPanelProps {
    groups: Group[];
    items: Item[]; // Aslında ItemWithDepth[] geliyor
    columns: Column[];
    activeTimelineIds: number[];
    collapsedGroupIds: Set<number>;
    onToggleGroup: (groupId: number) => void;
    onItemClick?: (itemId: number) => void;
    hoveredItemId: number | null;
    innerRef: React.Ref<HTMLDivElement>;
}

// Sütun genişlikleri
const TASK_NAME_WIDTH = 300;
const TIMELINE_WIDTH = 125;
const INDENT_STEP_PX = 24; // Her derinlik için girinti miktarı

const GanttLeftPanel: React.FC<GanttLeftPanelProps> = ({
    groups,
    items,
    columns,
    activeTimelineIds = [],
    collapsedGroupIds,
    onToggleGroup,
    onItemClick,
    hoveredItemId,
    innerRef,
}) => {

    // Itemleri groupId'a göre grupla (SIRALAMAYI BOZMADAN)
    const itemsByGroupId = useMemo(() => {
        const map: Record<number, ItemWithDepth[]> = {};
        items.forEach(item => {
            if (!map[item.groupId]) map[item.groupId] = [];
            // Gelen veri zaten sıralı olduğu için push yeterli
            map[item.groupId].push(item as ItemWithDepth);
        });
        // BURADAKİ SORT İŞLEMİNİ KALDIRDIK. 
        // Object.values(map).forEach(g => g.sort((a, b) => a.order - b.order)); <-- SİLİNDİ
        return map;
    }, [items]);

    // Timeline kolonlarını hızlı erişim için map’e al
    const timelineColumnsById = useMemo(() => {
        const map = new Map<number, Column>();
        activeTimelineIds.forEach(id => {
            const col = columns.find(c => c.id === id && c.type === ColumnType.Timeline);
            if (col) map.set(id, col);
        });
        return map;
    }, [columns, activeTimelineIds]);

    // Subtask Bağlantı Çizgisi (L-Shape) Rendersi
    const renderHierarchyLine = (depth: number) => {
        if (depth <= 0) return null;
        return (
            <div 
                className="absolute top-0 bottom-0 border-l-2 border-gray-300"
                style={{ 
                    left: `${(depth * INDENT_STEP_PX) - 12}px`, // Konumlandırma ayarı
                    height: '100%' 
                }}
            >
                {/* L'nin alt çizgisi */}
                <div className="absolute top-1/2 w-3 border-b-2 border-gray-300" style={{ left: 0 }}></div>
            </div>
        );
    };

    return (
        <div className="w-full bg-primary-background h-full overflow-y-hidden">

            {/* Sütun başlıkları */}
            <div
                className="flex items-center sticky top-0 bg-gray-50 z-20 border-b border-application-border text-secondary-text text-sm font-medium"
                style={{ height: `${GANTT_ROW_HEIGHT_PX}px` }}
            >
                <span
                    className={`px-3 py-2 sticky left-0 bg-gray-50 border-r border-application-border`}
                    style={{ width: TASK_NAME_WIDTH }}
                >
                    Görev Adı
                </span>

                <span
                    className={`px-6 py-2 border-r border-application-border`}
                    style={{ width: TIMELINE_WIDTH }}
                >
                    Tarih Aralığı
                </span>
            </div>

            {/* Gruplar + Görevler */}
            <div ref={innerRef} className="relative">
                {groups.map(group => {
                    const isCollapsed = collapsedGroupIds.has(group.id);
                    const groupItems = itemsByGroupId[group.id] || [];

                    return (
                        <div key={group.id}>

                            {/* Grup başlığı */}
                            <div
                                onClick={() => onToggleGroup(group.id)}
                                className="flex items-center px-3 py-2 text-sm font-semibold cursor-pointer hover:bg-gray-50 border-b border-gray-100"
                                style={{ color: group.color, height: `${GANTT_ROW_HEIGHT_PX}px` }}
                            >
                                <span className="mr-1 flex items-center">{isCollapsed ? <FiChevronRight /> : <FiChevronDown />}</span>
                                <span className="truncate">{group.title}</span>
                                <span className="ml-2 text-gray-400">({groupItems.length})</span>
                            </div>

                            {!isCollapsed &&
                                groupItems.map(item => {
                                    const isHovered = item.id === hoveredItemId;
                                    const depth = item.depth || 0;

                                    // Item’a ait dolu timeline kolonlarını topluyoruz
                                    const validTimelineColumns = activeTimelineIds
                                        .map(id => timelineColumnsById.get(id))
                                        .filter((col): col is Column => !!col && !!item.itemValues.find(v => v.columnId === col.id)?.value);

                                    const rowCount = Math.max(1, validTimelineColumns.length);

                                    return (
                                        <React.Fragment key={item.id}>
                                            {Array.from({ length: rowCount }).map((_, index) => {
                                                const columnForRow = validTimelineColumns[index];
                                                const bgClass = isHovered ? "bg-gray-200" : "bg-white hover:bg-gray-50";

                                                return (
                                                    <div
                                                        key={`${item.id}-${index}`}
                                                        onClick={() => onItemClick?.(item.id)}
                                                        className={`flex items-center border-b border-gray-100 text-sm cursor-pointer ${isHovered ? "bg-gray-200" : "hover:bg-gray-50"}`}
                                                        style={{ height: `${GANTT_ROW_HEIGHT_PX}px` }}
                                                    >

                                                        {/* Görev adı hücresi (Hiyerarşik) */}
                                                        <div
                                                            className={`flex items-center sticky left-0 px-3 py-2 border-r border-gray-100 ${bgClass} relative`}
                                                            style={{ 
                                                                width: TASK_NAME_WIDTH, 
                                                                minWidth: TASK_NAME_WIDTH, 
                                                                maxWidth: TASK_NAME_WIDTH,
                                                                // İÇERİK İÇİN PADDING (Hiyerarşi)
                                                                paddingLeft: `${(depth * INDENT_STEP_PX) + 12}px` 
                                                            }}
                                                        >
                                                            {/* Görsel Hiyerarşi Çizgileri (Opsiyonel - Table View benzeri) */}
                                                            {/* {renderHierarchyLine(depth)} */}
                                                            
                                                            {/* Alt görev ise bir ikon veya bullet koyabiliriz */}
                                                            {depth > 0 && (
                                                                <div className="absolute w-2 h-2 bg-gray-300 rounded-full" 
                                                                     style={{ left: `${(depth * INDENT_STEP_PX) - 4}px` }} 
                                                                />
                                                            )}

                                                            <span
                                                                className={`block truncate max-w-full font-medium ${depth > 0 ? 'text-gray-700' : 'text-gray-900'}`}
                                                                title={item.name}
                                                            >
                                                                {item.name}
                                                            </span>
                                                        </div>

                                                        {/* Timeline hücresi */}
                                                        <div
                                                            className="border-r border-gray-100 h-full flex items-center justify-center px-2"
                                                            style={{ width: TIMELINE_WIDTH, minWidth: TIMELINE_WIDTH, maxWidth: TIMELINE_WIDTH }}
                                                        >
                                                            {columnForRow ? (
                                                                <TimelineCell item={item} column={columnForRow} />
                                                            ) : (
                                                                <div className="w-full h-full" />
                                                            )}
                                                        </div>

                                                        {/* Boş bölge (Geri kalan genişlik) */}
                                                        <div className="flex-1 h-full" />
                                                    </div>
                                                );
                                            })}
                                        </React.Fragment>
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