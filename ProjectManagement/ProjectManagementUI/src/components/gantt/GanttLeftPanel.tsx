// src/components/gantt/GanttLeftPanel.tsx

import React, { useMemo } from 'react';
import TimelineCell from '../item/TimelineCell';
import { ColumnType, type Column, type Group, type Item } from '../../types';
import { FiChevronDown, FiChevronRight } from 'react-icons/fi';
import { GANTT_ROW_HEIGHT_PX } from '../common/constants';

interface GanttLeftPanelProps {
    groups: Group[];
    items: Item[];
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

    // Itemleri groupId'a göre grupla
    const itemsByGroupId = useMemo(() => {
        const map: Record<number, Item[]> = {};
        items.forEach(item => {
            if (!map[item.groupId]) map[item.groupId] = [];
            map[item.groupId].push(item);
        });
        Object.values(map).forEach(g => g.sort((a, b) => a.order - b.order));
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
                                className="flex items-center px-3 py-2 text-sm font-semibold cursor-pointer hover:bg-gray-50"
                                style={{ color: group.color, height: `${GANTT_ROW_HEIGHT_PX}px` }}
                            >
                                <span className="mr-1 flex items-center">{isCollapsed ? <FiChevronRight /> : <FiChevronDown />}</span>
                                <span className="truncate">{group.title}</span>
                                <span className="ml-2 text-gray-400">({groupItems.length})</span>
                            </div>

                            {!isCollapsed &&
                                groupItems.map(item => {
                                    const isHovered = item.id === hoveredItemId;

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
                                                        className={`flex items-center border-t border-gray-100 text-sm cursor-pointer ${isHovered ? "bg-gray-200" : "hover:bg-gray-50"}`}
                                                        style={{ height: `${GANTT_ROW_HEIGHT_PX}px` }}
                                                    >

                                                        {/* Görev adı hücresi */}
                                                        <div
                                                            className={`flex items-center sticky left-0 px-3 py-2 border-r border-gray-100 ${bgClass}`}
                                                            style={{ width: TASK_NAME_WIDTH, minWidth: TASK_NAME_WIDTH, maxWidth: TASK_NAME_WIDTH }}
                                                        >
                                                            <span
                                                                className={`block truncate max-w-full font-medium text-gray-900`}
                                                                title={item.name}
                                                            >
                                                                {item.name}
                                                            </span>
                                                        </div>

                                                        {/* Timeline hücresi */}
                                                        <div
                                                            className="border-r border-gray-100 h-full flex items-center"
                                                            style={{ width: TIMELINE_WIDTH, minWidth: TIMELINE_WIDTH, maxWidth: TIMELINE_WIDTH }}
                                                        >
                                                            {columnForRow ? (
                                                                <TimelineCell item={item} column={columnForRow} />
                                                            ) : (
                                                                <div className="w-full h-full" />
                                                            )}
                                                        </div>

                                                        {/* Boş bölge */}
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
