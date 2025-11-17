import React, { useMemo, useState, useCallback, useRef, useEffect, type RefObject } from 'react';
import { type Group, type Item, type Column, ColumnType, type DependencyLink, type User } from '../../types';
import TimelineHeader from './TimelineHeader';
import { parseISO, format, differenceInCalendarDays, addDays } from 'date-fns';
import { useAppSelector } from '../../store/hooks';

import {
  GANTT_ROW_HEIGHT_PX,
  GANTT_BAR_HEIGHT_PX,
  GANTT_BAR_TOP_OFFSET_PX
} from '../common/constants';
import { selectAllUsers } from '../../store/features/userSlice';
import { useGanttDragResize } from '../../hooks/useGanttDragResize';

import GanttArrows, { type ProcessedItemData, type BarTimelineData } from './GanttArrows';
import GanttBarRow from './GanttBarRow';

const transformUserForView = (user: User) => {
  const initials = `${user.firstName[0] || ''}${user.lastName[0] || ''}`.toUpperCase();
  return {
    id: user.id,
    name: `${user.firstName} ${user.lastName}`,
    avatarUrl: undefined,
    initials: initials || user.username[0].toUpperCase(),
  };
};

interface GanttRightPanelProps {
  groups: Group[];
  items: Item[];
  columns: Column[];
  viewMinDate: Date;
  viewMaxDate: Date;
  collapsedGroupIds: Set<number>;
  dayWidthPx: number;
  activeTimelineIds: number[];
  colorByColumnId: number | null;
  labelById: number | null;
  onItemClick: (itemId: number) => void;
  onMouseEnterBar: (itemId: number) => void;
  onMouseLeaveBar: () => void;
  scrollContainerRef?: RefObject<HTMLDivElement | null>;
}

const STATUS_COLORS: { [key: string]: string } = {
  'Yapılıyor': 'bg-orange-500',
  'Tamamlandı': 'bg-green-500',
  'Takıldı': 'bg-red-500',
  'Beklemede': 'bg-blue-500',
  'Belirsiz': 'bg-gray-400',
  'Default': 'bg-sky-300',
};

const VIRTUALIZATION_BUFFER_ROWS = 5;

const GanttRightPanel: React.FC<GanttRightPanelProps> = ({
  groups,
  items,
  columns,
  viewMinDate,
  viewMaxDate,
  collapsedGroupIds,
  dayWidthPx,
  activeTimelineIds,
  colorByColumnId,
  labelById,
  onItemClick,
  onMouseEnterBar,
  onMouseLeaveBar,
  scrollContainerRef
}) => {

  const paneRef = useRef<HTMLDivElement>(null);
  const [hoveredItemId, setHoveredItemId] = useState<number | null>(null);
  const [visibleRange, setVisibleRange] = useState({ startRow: 0, endRow: Number.MAX_SAFE_INTEGER });

  const allUsers = useAppSelector(selectAllUsers);

  const { dependencyColumnId } = useMemo(() => {
    return {
      dependencyColumnId: columns.find(c => c.type === ColumnType.Dependency)?.id || null,
    };
  }, [columns]);

  const {
    isDragging,
    draggedItemData, 
    isResizing,
    resizedItemData, 
    handlePaneMouseLeave,
    handleMouseDownOnBar,
    handleMouseDownOnResizeHandle,
  } = useGanttDragResize({
    paneRef,
    items,
    columns,
    viewMinDate,
    dayWidthPx,
    onItemClick,
    onDragStart: () => setHoveredItemId(null),
    onDragEnd: () => {
      onMouseLeaveBar();
    },
  });

  const handleBarMouseEnter = useCallback((itemId: number) => {
    if (!isDragging && !isResizing) {
      setHoveredItemId(itemId);
      onMouseEnterBar(itemId);
    }
  }, [isDragging, isResizing, onMouseEnterBar]);

  const handleBarMouseLeave = useCallback(() => {
    if (!isDragging && !isResizing) {
      setHoveredItemId(null);
      onMouseLeaveBar();
    }
  }, [isDragging, isResizing, onMouseLeaveBar]);

  // --- Processed Data Calculation ---
  const processedData = useMemo(() => {
    const dataMap = new Map<number, ProcessedItemData>();
    let rowIndex = -1;
    const groupMap = new Map(groups.map(g => [g.id, g]));

    groups.forEach(group => {
      if (collapsedGroupIds.has(group.id)) return;

      rowIndex++; 
      const groupItems = items.filter(item => item.groupId === group.id);
      groupItems.sort((a, b) => a.order - b.order);

      groupItems.forEach(item => {
        const itemBaseRowIndex = rowIndex + 1;
        let externalLabel = ""; 

        if (labelById === -2) { 
          externalLabel = item.name;
        } else if (labelById === -1) {
          const itemGroup = groupMap.get(item.groupId);
          externalLabel = itemGroup ? itemGroup.title : "";
        }
        else if (labelById !== null && labelById > 0) {
          const labelColumn = columns.find(c => c.id === labelById);
          const labelValue = item.itemValues.find(v => v.columnId === labelById)?.value || "";

          if (labelColumn && labelValue) {
            switch (labelColumn.type) {
              case ColumnType.Person:
                try {
                  const userIds = JSON.parse(labelValue) as number[];
                  if (Array.isArray(userIds) && userIds.length > 0) {
                    const idSet = new Set(userIds);
                    const names = allUsers
                      .filter(user => idSet.has(user.id))
                      .map(user => transformUserForView(user).name);
                    externalLabel = names.join(', ');
                  }
                } catch (e) { externalLabel = "Hatalı Kişi"; }
                break;
              case ColumnType.Date:
                try { externalLabel = format(parseISO(labelValue), 'MMM d'); }
                catch { externalLabel = ""; }
                break;
              case ColumnType.Timeline:
                externalLabel = labelValue.replace('/', ' - ');
                break;
              default:
                externalLabel = labelValue;
                break;
            }
          }
        }

        let colorClass = STATUS_COLORS.Default;
        if (colorByColumnId !== null) {
          const colorValue = item.itemValues.find(v => v.columnId === colorByColumnId)?.value;
          if (colorValue && STATUS_COLORS[colorValue]) {
            colorClass = STATUS_COLORS[colorValue];
          }
        }

        let currentBarData: ProcessedItemData['barData'] = null;
        const currentVisualBars: ProcessedItemData['visualOnlyBars'] = [];
        let currentDependencies: DependencyLink[] = [];
        let validBarCount = 0;

        activeTimelineIds.forEach((timelineId) => {
          const timelineValue = item.itemValues.find(v => v.columnId === timelineId)?.value;

          if (timelineValue) {
            const [startStr, endStr] = timelineValue.split('/');
            if (startStr && endStr) {
              try {
                const startDate = parseISO(startStr);
                const endDate = parseISO(endStr);
                if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || endDate < startDate) {
                  return;
                }
                validBarCount++;
                const leftDays = differenceInCalendarDays(startDate, viewMinDate);
                const durationDays = Math.max(1, differenceInCalendarDays(endDate, startDate) + 1);
                if (isNaN(leftDays)) return; 
                const startX = leftDays * dayWidthPx;
                const width = durationDays * dayWidthPx;

                const column = columns.find(c => c.id === timelineId);
                const columnTitle = column ? column.title : 'Zaman Çizelgesi';

                const bar: BarTimelineData = {
                  style: {
                    height: `${GANTT_BAR_HEIGHT_PX}px`,
                    left: `${startX}px`,
                    width: `${width}px`,
                  },
                  colorClass: colorClass,
                  startX: startX,
                  endX: startX + width,
                  startDate,
                  endDate,
                  timelineColumnId: timelineId,
                  timelineColumnTitle: columnTitle
                };

                if (!currentBarData) {
                  currentBarData = bar; 
                } else {
                  currentVisualBars.push(bar);
                }
              } catch (e) { /* Hata */ }
            }
          }
        });

        if (dependencyColumnId) {
          const depValue = item.itemValues.find(v => v.columnId === dependencyColumnId)?.value;
          if (depValue) {
            try {
              const parsedDeps = JSON.parse(depValue) as DependencyLink[];
              if (Array.isArray(parsedDeps)) {
                currentDependencies = parsedDeps.filter(
                  link => typeof link.id === 'number' && typeof link.type === 'string'
                );
              }
            } catch (e) { /* Hata */ }
          }
        }

        const itemRowCount = Math.max(1, validBarCount);

        dataMap.set(item.id, {
          item: { id: item.id, name: item.name, groupId: item.groupId },
          rowIndex: itemBaseRowIndex,
          rowSpan: itemRowCount,
          barData: currentBarData,
          visualOnlyBars: currentVisualBars,
          dependencies: currentDependencies,
          primaryTimelineColumnId: currentBarData ? currentBarData.timelineColumnId : null,
          externalLabel: externalLabel
        });

        rowIndex = itemBaseRowIndex + (itemRowCount - 1);
      });
    });
    return dataMap;
  }, [
    groups, items, activeTimelineIds, viewMinDate, collapsedGroupIds, 
    dayWidthPx, labelById, colorByColumnId, dependencyColumnId, allUsers, columns
  ]);

   const groupedProcessedItems = useMemo(() => {
    const grouped = new Map<number, ProcessedItemData[]>();
    processedData.forEach(itemData => {
      const groupItems = grouped.get(itemData.item.groupId) ?? [];
      groupItems.push(itemData);
      grouped.set(itemData.item.groupId, groupItems);
    });
    grouped.forEach(itemsInGroup => {
      itemsInGroup.sort((a, b) => a.rowIndex - b.rowIndex);
    });
    return grouped;
  }, [processedData]);

  const groupHeaderRowIndices = useMemo(() => {
    const indices = new Map<number, number>();
    let currentRow = -1;

    groups.forEach(group => {
      if (!collapsedGroupIds.has(group.id)) {
        currentRow++; 
        indices.set(group.id, currentRow);

        const groupItems = groupedProcessedItems.get(group.id) ?? [];

        const totalRowsInGroup = groupItems.reduce((total, itemData) => {
          const barCount = (itemData.barData ? 1 : 0) + itemData.visualOnlyBars.length;
          return total + Math.max(1, barCount);
        }, 0);

        currentRow += totalRowsInGroup;
      }
    });
    return indices;
  }, [collapsedGroupIds, groupedProcessedItems, groups]);

  const maxRowIndex = useMemo(() => {
    const visibleGroups = groups.filter(g => !collapsedGroupIds.has(g.id));
    const visibleItems = items.filter(item => !collapsedGroupIds.has(item.groupId));

    let totalItemRows = 0;
    visibleItems.forEach(item => {
      let validBarCount = 0;
      activeTimelineIds.forEach(id => {
        const timelineValue = item.itemValues.find(v => v.columnId === id)?.value;
        if (timelineValue) {
          const [startStr, endStr] = timelineValue.split('/');
          if (startStr && endStr) {
            validBarCount++;
          }
        }
      });
      totalItemRows += Math.max(1, validBarCount);
    });

    const totalRows = visibleGroups.length + totalItemRows;
    return Math.max(0, totalRows - 1); 

  }, [groups, items, collapsedGroupIds, activeTimelineIds]);
  
  const totalHeight = (maxRowIndex + 1) * GANTT_ROW_HEIGHT_PX;
  const totalDays = differenceInCalendarDays(viewMaxDate, viewMinDate) + 1;
  const totalWidth = Math.max(100, totalDays * dayWidthPx);

  const getScrollContainer = useCallback(() => {
    if (scrollContainerRef?.current) return scrollContainerRef.current;
    return paneRef.current?.parentElement as HTMLDivElement | null;
  }, [scrollContainerRef]);

  const updateVisibleRange = useCallback(() => {
    const container = getScrollContainer();
    if (!container) return;

    const { scrollTop, clientHeight } = container;
    const startRow = Math.max(0, Math.floor(scrollTop / GANTT_ROW_HEIGHT_PX) - VIRTUALIZATION_BUFFER_ROWS);
    const endRow = Math.min(
      maxRowIndex,
      Math.ceil((scrollTop + clientHeight) / GANTT_ROW_HEIGHT_PX) + VIRTUALIZATION_BUFFER_ROWS
    );

    setVisibleRange(prev => (prev.startRow === startRow && prev.endRow === endRow)
      ? prev
      : { startRow, endRow });
  }, [getScrollContainer, maxRowIndex]);

  useEffect(() => {
    updateVisibleRange();
  }, [updateVisibleRange, totalHeight]);

  useEffect(() => {
    const container = getScrollContainer();
    if (!container) return;

    const onScroll = () => updateVisibleRange();
    container.addEventListener('scroll', onScroll, { passive: true });
    return () => container.removeEventListener('scroll', onScroll);
  }, [getScrollContainer, updateVisibleRange]);

  const applyPreviewToBar = useCallback((bar: BarTimelineData, itemId: number): BarTimelineData => {
    let deltaDays = 0;
    let resizeSide: 'start' | 'end' | null = null;

    if (draggedItemData && draggedItemData.item.id === itemId && draggedItemData.timelineColumnId === bar.timelineColumnId) {
      deltaDays = draggedItemData.currentDeltaDays;
      resizeSide = draggedItemData.side;
    }
    if (resizedItemData && resizedItemData.item.id === itemId && resizedItemData.timelineColumnId === bar.timelineColumnId) {
      deltaDays = resizedItemData.currentDeltaDays;
      resizeSide = resizedItemData.side;
    }

    if (!deltaDays && resizeSide === null) return bar;

    const deltaPx = deltaDays * dayWidthPx;
    let startX = bar.startX;
    let endX = bar.endX;

    if (resizeSide === null) {
      startX += deltaPx;
      endX += deltaPx;
    } else if (resizeSide === 'start') {
      startX = Math.min(endX - dayWidthPx, startX + deltaPx);
    } else if (resizeSide === 'end') {
      endX = Math.max(startX + dayWidthPx, endX + deltaPx);
    }

    const startDaysDelta = Math.round((startX - bar.startX) / dayWidthPx);
    const normalizedStartX = bar.startX + startDaysDelta * dayWidthPx;
    const pixelWidth = Math.max(dayWidthPx, endX - normalizedStartX);
    const durationDays = Math.max(1, Math.round(pixelWidth / dayWidthPx));
    const normalizedWidth = durationDays * dayWidthPx;
    const normalizedEndX = normalizedStartX + normalizedWidth;
    const startDate = addDays(bar.startDate, startDaysDelta);
    const endDate = addDays(startDate, durationDays - 1);

    return {
      ...bar,
      startX: normalizedStartX,
      endX: normalizedEndX,
      startDate,
      endDate,
      style: {
        ...bar.style,
        left: `${normalizedStartX}px`,
        width: `${normalizedWidth}px`,
      },
    };
  }, [dayWidthPx, draggedItemData, resizedItemData]);

  const buildPreviewItemData = useCallback((itemData: ProcessedItemData): ProcessedItemData => {
    const updatedBar = itemData.barData ? applyPreviewToBar(itemData.barData, itemData.item.id) : null;
    const updatedVisualBars = itemData.visualOnlyBars.map(bar => applyPreviewToBar(bar, itemData.item.id));

    if (updatedBar === itemData.barData && updatedVisualBars.every((bar, idx) => bar === itemData.visualOnlyBars[idx])) {
      return itemData;
    }

    return {
      ...itemData,
      barData: updatedBar,
      visualOnlyBars: updatedVisualBars,
    };
  }, [applyPreviewToBar]);

  const previewProcessedData = useMemo(() => {
    const map = new Map<number, ProcessedItemData>();
    processedData.forEach((itemData, id) => {
      map.set(id, buildPreviewItemData(itemData));
    });
    return map;
  }, [buildPreviewItemData, processedData]);
  
  return (
    <div ref={paneRef} className="w-full relative bg-primary-background "
      style={{ minWidth: `${totalWidth}px` }}
      onMouseLeave={handlePaneMouseLeave}
    >
      <TimelineHeader
        viewMinDate={viewMinDate}
        viewMaxDate={viewMaxDate}
        dayWidthPx={dayWidthPx}
        rowHeightPx={GANTT_ROW_HEIGHT_PX}
      />

      <div
        className="relative"
        style={{
          height: `${totalHeight}px`,
          width: `${totalWidth}px`,
        }}
      >
        {groups.filter(group => !collapsedGroupIds.has(group.id)).map(group => {
          const groupRowIndex = groupHeaderRowIndices.get(group.id);
          if (groupRowIndex === undefined) return null;
          const isGroupRowVisible =
            groupRowIndex >= visibleRange.startRow && groupRowIndex <= visibleRange.endRow;

          return (
            <React.Fragment key={group.id}>
              {isGroupRowVisible && (
                <div
                  className="absolute left-0 right-0 border-t border-gray-100 pointer-events-none"
                  style={{
                    top: `${groupRowIndex * GANTT_ROW_HEIGHT_PX}px`,
                    height: `${GANTT_ROW_HEIGHT_PX}px`,
                  }}
                ></div>
              )}
              {Array.from(processedData.values())
                .filter(itemData => itemData.item.groupId === group.id)
                .sort((a, b) => a.rowIndex - b.rowIndex)
                .filter(itemData => {
                  const itemRowEnd = itemData.rowIndex + itemData.rowSpan - 1;
                  return itemRowEnd >= visibleRange.startRow && itemData.rowIndex <= visibleRange.endRow;
                })
                .map(itemData => {
                  const previewItemData = previewProcessedData.get(itemData.item.id) || itemData;
                  
                  // DÜZELTME BURADA:
                  // Bu item şu anda sürükleniyor mu veya resize ediliyor mu?
                  const isItemDraggingOrResizing = 
                    (isDragging && draggedItemData?.item.id === itemData.item.id) ||
                    (isResizing && resizedItemData?.item.id === itemData.item.id);

                  // isHovered durumu
                  const isHovered = hoveredItemId === itemData.item.id;

                  return (
                    <React.Fragment key={itemData.item.id}>
                      <GanttBarRow
                        itemData={previewItemData}
                        originalItemData={itemData}
                        
                        // isActive: Görsel vurgulama (highlight) için. Hem hover hem drag durumunda true.
                        isActive={isItemDraggingOrResizing || isHovered}
                        
                        // isDragging: Tarih etiketlerinin görünmesi için. SADECE drag/resize durumunda true.
                        isDragging={!!isItemDraggingOrResizing} 

                        onBarMouseDown={handleMouseDownOnBar}
                        onResizeHandleMouseDown={handleMouseDownOnResizeHandle}
                        onMouseEnter={() => handleBarMouseEnter(itemData.item.id)}
                        onMouseLeave={handleBarMouseLeave}
                      />

                      {previewItemData.barData && previewItemData.externalLabel && (
                        <div
                          className="absolute flex items-center px-3 text-xs text-gray-700 :text-gray-300 pointer-events-none truncate"
                          style={{
                            top: `${(previewItemData.rowIndex * GANTT_ROW_HEIGHT_PX) + GANTT_BAR_TOP_OFFSET_PX}px`,
                            left: `${previewItemData.barData.endX + 6}px`,
                            height: `${GANTT_BAR_HEIGHT_PX}px`,
                            lineHeight: `${GANTT_BAR_HEIGHT_PX}px`,
                            zIndex: 10,
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {previewItemData.externalLabel}
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
            </React.Fragment>
          );
        })}

        <GanttArrows
          processedData={previewProcessedData}
          totalWidth={totalWidth}
          totalHeight={totalHeight}
          hoveredItemId={hoveredItemId}
        />

      </div>
    </div>
  );
};

export default GanttRightPanel;