// src/hooks/useGanttDragResize.ts

import { useState, useCallback, useEffect, type RefObject } from 'react';
import { type Item, type Column, DependencyAction, type ColumnSettings, ColumnType } from '../types';
import { type ProcessedItemData } from '../components/gantt/GanttArrows';
import { useAppDispatch } from '../store/hooks';
import { updateItemValue, updateMultipleItemValues } from '../store/features/itemSlice';
import { calculateCascadingChanges, checkDependencyViolations, type UpdatedTaskData, type Violation } from '../utils/ganttDependencies';
import { parseISO, differenceInCalendarDays, addDays, format, max as maxDate, min as minDate } from 'date-fns';

type ResizeSide = 'start' | 'end';

interface DragResizeState {
    item: Item;
    timelineColumnId: number;
    primaryTimelineColumnId: number | null;
    originalStartDate: Date;
    originalEndDate: Date;
    originalMouseX: number;
    currentDeltaDays: number;
    side: ResizeSide | null;
    isClickEvent: boolean;
}

interface GanttDragResizeProps {
    paneRef: RefObject<HTMLDivElement | null>;
    items: Item[];
    columns: Column[];
    viewMinDate: Date;
    dayWidthPx: number;
    onItemClick: (itemId: number) => void;
    onDragStart: () => void;
    onDragEnd: () => void;
}

export const useGanttDragResize = ({
    items,
    columns,
    dayWidthPx,
    onItemClick,
    onDragStart,
    onDragEnd,
}: GanttDragResizeProps) => {

    const dispatch = useAppDispatch();
    const [dragState, setDragState] = useState<DragResizeState | null>(null);

    const isDragging = dragState !== null && dragState.side === null;
    const isResizing = dragState !== null && dragState.side !== null;

    const dragThreshold = 5;

    // YARDIMCI: Bir item'ın tamamlanıp tamamlanmadığını kontrol et
    const isItemCompleted = (item: Item): boolean => {
        const statusColumn = columns.find(c => c.type === ColumnType.Status);
        if (!statusColumn) return false;

        const val = item.itemValues.find(v => v.columnId === statusColumn.id)?.value;
        // Buraya kendi "Tamamlandı" statü metinlerini ekleyebilirsin
        const completedStatuses = ['Tamamlandı', 'Done', 'Bitti', 'Completed'];
        
        return completedStatuses.includes(val || '');
    };

    const getDatesFromItem = (item: Item, timelineColumnId: number): { startDate: Date, endDate: Date } | null => {
        const value = item.itemValues.find(v => v.columnId === timelineColumnId)?.value;
        if (!value) return null;
        try {
            const [startStr, endStr] = value.split('/');
            const startDate = parseISO(startStr);
            const endDate = parseISO(endStr);
            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return null;
            return { startDate, endDate };
        } catch {
            return null;
        }
    };

    // --- BAR SÜRÜKLEME BAŞLANGICI ---
    const handleMouseDownOnBar = useCallback((
        event: React.MouseEvent,
        itemData: ProcessedItemData,
        timelineColumnId: number
    ) => {
        if (event.button !== 0 || (event.target as HTMLElement).dataset.resizeHandle) return;
        event.stopPropagation();

        const item = items.find(i => i.id === itemData.item.id);
        if (!item) return;

        // 🔴 KİLİT KONTROLÜ: Eğer tamamlandıysa işlemi durdur
        if (isItemCompleted(item)) {
            alert("Bu öge tamamlanmıştır, hareket ettirilemez.");
            return;
        }

        const dates = getDatesFromItem(item, timelineColumnId);
        if (!dates) return;

        onDragStart();
        setDragState({
            item: item,
            timelineColumnId: timelineColumnId,
            primaryTimelineColumnId: itemData.primaryTimelineColumnId,
            originalStartDate: dates.startDate,
            originalEndDate: dates.endDate,
            originalMouseX: event.clientX,
            currentDeltaDays: 0,
            side: null,
            isClickEvent: true,
        });

    }, [items, onDragStart, columns]); // columns dependency eklendi

    // --- BAR YENİDEN BOYUTLANDIRMA BAŞLANGICI ---
    const handleMouseDownOnResizeHandle = useCallback((
        event: React.MouseEvent,
        itemData: ProcessedItemData,
        side: ResizeSide,
        timelineColumnId: number
    ) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();

        const item = items.find(i => i.id === itemData.item.id);
        if (!item) return;

        // 🔴 KİLİT KONTROLÜ: Tamamlandıysa resize yapma
        if (isItemCompleted(item)) {
            alert("Bu öge tamamlanmıştır, süresi değiştirilemez.");
            return;
        }

        const dates = getDatesFromItem(item, timelineColumnId);
        if (!dates) return;

        onDragStart();
        setDragState({
            item: item,
            timelineColumnId: timelineColumnId,
            primaryTimelineColumnId: itemData.primaryTimelineColumnId,
            originalStartDate: dates.startDate,
            originalEndDate: dates.endDate,
            originalMouseX: event.clientX,
            currentDeltaDays: 0,
            side: side,
            isClickEvent: false,
        });
    }, [items, onDragStart, columns]); // columns dependency eklendi

    const handlePaneMouseMove = useCallback((event: MouseEvent) => {
        if (!dragState) return;
        
        const deltaX = event.clientX - dragState.originalMouseX;
        const deltaDays = Math.round(deltaX / dayWidthPx);

        setDragState(prev => {
            if (!prev) return null;

            const isClickEvent = prev.isClickEvent && Math.abs(deltaX) <= dragThreshold
                ? prev.isClickEvent
                : false;

            const shouldUpdate =
                isClickEvent !== prev.isClickEvent ||
                deltaDays !== prev.currentDeltaDays;

            if (!shouldUpdate) return prev;

            return {
                ...prev,
                isClickEvent,
                currentDeltaDays: deltaDays,
            };
        });
    }, [dragState, dayWidthPx, dragThreshold]);

    const handlePaneMouseUp = useCallback((event: MouseEvent) => {
        if (!dragState) return;

        let needsUpdate = false;
        let newStartDate: Date | null = null;
        let newEndDate: Date | null = null;

        if (dragState.isClickEvent) {
            onItemClick(dragState.item.id);
        }
        else {
            const deltaDays = dragState.currentDeltaDays;

            if (deltaDays === 0) {
                needsUpdate = false;
            }
            else if (dragState.side === null) {
                const duration = differenceInCalendarDays(dragState.originalEndDate, dragState.originalStartDate);
                newStartDate = addDays(dragState.originalStartDate, deltaDays);
                newEndDate = addDays(newStartDate, Math.max(0, duration));
                needsUpdate = true;
            }
            else if (dragState.side === 'start') {
                newStartDate = minDate([addDays(dragState.originalStartDate, deltaDays), dragState.originalEndDate]);
                newEndDate = dragState.originalEndDate;
                needsUpdate = true;
            }
            else if (dragState.side === 'end') {
                newStartDate = dragState.originalStartDate;
                newEndDate = maxDate([addDays(dragState.originalEndDate, deltaDays), dragState.originalStartDate]);
                needsUpdate = true;
            }
        }

        if (needsUpdate && newStartDate && newEndDate) {

            const dependencyColumn = columns.find(c => c.type === ColumnType.Dependency);
            let currentMode = DependencyAction.Ignore;

            if (dependencyColumn && dependencyColumn.settings) {
                try {
                    const settings: ColumnSettings = JSON.parse(dependencyColumn.settings);
                    if (settings.dependencyAction) {
                        currentMode = settings.dependencyAction;
                    }
                } catch (e) { }
            }

            let violation: Violation | null = null;
            let cascadingUpdates: UpdatedTaskData[] = [];

            if (dragState.timelineColumnId === dragState.primaryTimelineColumnId) {
                
                const updatedTask: UpdatedTaskData = { itemId: dragState.item.id, newStartDate, newEndDate };

                if (currentMode === DependencyAction.Restrict) {
                    violation = checkDependencyViolations(updatedTask, items, columns);
                }
                else if (currentMode === DependencyAction.AutoMove) {
                    cascadingUpdates.push(updatedTask);
                    const automaticChanges = calculateCascadingChanges(
                        dragState.item.id, 
                        newStartDate, 
                        newEndDate, 
                        items, 
                        columns
                    );
                    cascadingUpdates = [...cascadingUpdates, ...automaticChanges];
                }
            }

            if (violation) {
                alert(`BAĞIMLILIK İHLALİ (Kısıtlayıcı Mod):\n\n${violation.message}`);
                needsUpdate = false;
            }
            else {
                const formatDateVal = (s: Date, e: Date) => `${format(s, 'yyyy-MM-dd')}/${format(e, 'yyyy-MM-dd')}`;

                if (currentMode === DependencyAction.AutoMove && cascadingUpdates.length > 0) {
                    const bulkPayload = cascadingUpdates.map(u => ({
                        itemId: u.itemId,
                        columnId: dragState.timelineColumnId,
                        value: formatDateVal(u.newStartDate, u.newEndDate)
                    }));
                    dispatch(updateMultipleItemValues({ updates: bulkPayload }));
                } 
                else {
                    const finalValue = formatDateVal(newStartDate, newEndDate);
                    dispatch(updateItemValue({
                        itemId: dragState.item.id,
                        columnId: dragState.timelineColumnId,
                        value: finalValue
                    }));
                }
            }
        }

        setDragState(null);
        onDragEnd();

    }, [dragState, dayWidthPx, dispatch, items, columns, onItemClick, onDragEnd]);

    const handlePaneMouseLeave = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
        if (dragState) {
            handlePaneMouseUp(event.nativeEvent);
        }
    }, [dragState, handlePaneMouseUp]);

    useEffect(() => {
        if (dragState) {
            let cursor = 'grabbing';
            if (dragState.side === 'start' || dragState.side === 'end') {
                cursor = 'ew-resize';
            }

            document.body.style.cursor = cursor;
            document.body.style.userSelect = 'none';

            window.addEventListener('mousemove', handlePaneMouseMove);
            window.addEventListener('mouseup', handlePaneMouseUp);
        }
        return () => {
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            window.removeEventListener('mousemove', handlePaneMouseMove);
            window.removeEventListener('mouseup', handlePaneMouseUp);
        };
    }, [dragState, handlePaneMouseMove, handlePaneMouseUp]);

    return {
        isDragging,
        isResizing,
        draggedItemData: isDragging ? dragState : null,
        resizedItemData: isResizing ? dragState : null,
        handleMouseDownOnBar,
        handleMouseDownOnResizeHandle,
        handlePaneMouseLeave,
    };
};