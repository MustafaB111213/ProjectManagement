import { useState, useCallback, useEffect, type RefObject } from 'react';
import { type Item, type Column } from '../types';
import { type ProcessedItemData } from '../components/gantt/GanttArrows';
import { useAppDispatch } from '../store/hooks';
import { updateItemValue } from '../store/features/itemSlice';
import { checkDependencyViolations, type UpdatedTaskData } from '../utils/ganttDependencies';
import { parseISO, differenceInDays, addDays, format, max as maxDate, min as minDate } from 'date-fns';

type ResizeSide = 'start' | 'end';

interface GanttDragResizeProps {
    paneRef: RefObject<HTMLDivElement | null>;
    items: Item[]; // Orijinal item verisi
    columns: Column[]; // Bağımlılık kontrolü için
    primaryTimelineId: number | null;
    viewMinDate: Date;
    dayWidthPx: number;
    onItemClick: (itemId: number) => void;
    onDragStart: () => void; // Hover'ı sıfırlamak için
    onDragEnd: () => void;
}

export const useGanttDragResize = ({
    paneRef,
    items,
    columns,
    primaryTimelineId,
    viewMinDate,
    dayWidthPx,
    onItemClick,
    onDragStart, // Renamed from onHoverStart
    onDragEnd,   // Renamed from onHoverEnd
}: GanttDragResizeProps) => {

    const dispatch = useAppDispatch();

    const [isDragging, setIsDragging] = useState(false);
    const [draggedItemData, setDraggedItemData] = useState<ProcessedItemData | null>(null);
    const [dragStartX, setDragStartX] = useState(0);
    const [initialDragOffsetDays, setInitialDragOffsetDays] = useState(0);

    const [isResizing, setIsResizing] = useState(false);
    const [resizedItemData, setResizedItemData] = useState<ProcessedItemData | null>(null);
    const [resizeSide, setResizeSide] = useState<ResizeSide | null>(null);
    const [resizeStartX, setResizeStartX] = useState(0);
    const [originalStartDate, setOriginalStartDate] = useState<Date | null>(null);
    const [originalEndDate, setOriginalEndDate] = useState<Date | null>(null);

    const dragThreshold = 5; // Tıklama eşiği (5px)

    // --- MOUSE DOWN HANDLER'LARI ---

    const handleMouseDownOnBar = useCallback((event: React.MouseEvent<HTMLDivElement>, itemData: ProcessedItemData) => {
        if (isResizing || (event.target as HTMLElement).dataset.resizeHandle || event.button !== 0 || !itemData.barData) return;

        const paneRect = paneRef.current?.getBoundingClientRect();
        if (!paneRect) return;

        let offsetDays = 0;
        if (primaryTimelineId && itemData.item) {
            const originalItem = items.find(i => i.id === itemData.item.id);
            if (!originalItem) return;
            const value = originalItem.itemValues.find(v => v.columnId === primaryTimelineId)?.value;
            if (value) {
                const [startStr] = value.split('/');
                try {
                    const startDate = parseISO(startStr);
                    if (!isNaN(startDate.getTime())) {
                        offsetDays = differenceInDays(startDate, viewMinDate);
                    }
                } catch { }
            }
        }

        onDragStart(); // Hover'ı sıfırla
        setIsDragging(true);
        setDraggedItemData(itemData);
        setDragStartX(event.clientX);
        setInitialDragOffsetDays(offsetDays);
    }, [viewMinDate, primaryTimelineId, isResizing, items, paneRef, onDragStart]);

    const handleMouseDownOnResizeHandle = useCallback((
        event: React.MouseEvent<HTMLDivElement>,
        itemData: ProcessedItemData,
        side: ResizeSide
    ) => {
        if (event.button !== 0 || !itemData.barData || !primaryTimelineId) return;
        event.preventDefault();
        event.stopPropagation();

        const paneRect = paneRef.current?.getBoundingClientRect();
        if (!paneRect) return;
        const startXCoord = event.clientX - paneRect.left;

        const originalItem = items.find(i => i.id === itemData.item.id);
        if (!originalItem) return;
        const currentValue = originalItem.itemValues.find(v => v.columnId === primaryTimelineId)?.value;
        if (!currentValue) return;

        try {
            const [startStr, endStr] = currentValue.split('/');
            const start = parseISO(startStr);
            const end = parseISO(endStr);
            if (isNaN(start.getTime()) || isNaN(end.getTime())) throw new Error("Geçersiz tarih");
            setOriginalStartDate(start);
            setOriginalEndDate(end);
        } catch (e) { console.error("Resize başlarken tarih parse hatası:", e); return; }

        onDragStart(); // Hover'ı sıfırla
        setIsResizing(true);
        setResizedItemData(itemData);
        setResizeSide(side);
        setResizeStartX(startXCoord);
    }, [primaryTimelineId, items, paneRef, onDragStart]);

    // --- MOUSE MOVE/UP/LEAVE HANDLER'LARI ---

    const handleMouseMove = useCallback((event: MouseEvent) => {
        // Anlık görsel güncelleme için (sürüklerken çubuğu hareket ettirme)
        // Bu, performansa etki edebilir, şimdilik boş bırakıldı.
        // Sadece mouseUp'ta güncelleme yapacağız.
    }, []);

    const handleMouseUp = useCallback((event: MouseEvent) => {
        const paneRect = paneRef.current?.getBoundingClientRect();
        if ((!isDragging && !isResizing) || !paneRect) {
            onDragEnd();
            return;
        }

        const finalWindowX = event.clientX;
        let needsUpdate = false;
        let finalValue = "";
        let finalItemId = -1;
        let finalColumnId = -1;
        let newStartDate: Date | null = null;
        let newEndDate: Date | null = null;

        if (isDragging && draggedItemData && draggedItemData.barData && primaryTimelineId) {
            const windowDeltaX = finalWindowX - dragStartX;
            if (Math.abs(windowDeltaX) < dragThreshold) {
                onItemClick(draggedItemData.item.id);
            } else {
                const originalItem = items.find(i => i.id === draggedItemData.item.id);
                if (originalItem) {
                    const deltaDays = Math.round(windowDeltaX / dayWidthPx);
                    if (deltaDays !== 0) {
                        const newStartOffsetDays = initialDragOffsetDays + deltaDays;
                        const currentValue = originalItem.itemValues.find(v => v.columnId === primaryTimelineId)?.value;
                        if (currentValue) {
                            try {
                                const [startStr, endStr] = currentValue.split('/');
                                const duration = differenceInDays(parseISO(endStr), parseISO(startStr));
                                newStartDate = maxDate([addDays(viewMinDate, newStartOffsetDays), viewMinDate]);
                                newEndDate = addDays(newStartDate, Math.max(0, duration));
                                finalValue = `${format(newStartDate, 'yyyy-MM-dd')}/${format(newEndDate, 'yyyy-MM-dd')}`;
                                needsUpdate = finalValue !== currentValue;
                            } catch (e) { console.error("[DragEnd] Hata:", e); }
                        }
                    }
                    finalItemId = draggedItemData.item.id;
                    finalColumnId = primaryTimelineId;
                }
            }
        } 
        else if (isResizing && resizedItemData && resizeSide && originalStartDate && originalEndDate && primaryTimelineId) {
            const paneFinalX = finalWindowX - paneRect.left;
            const deltaX = paneFinalX - resizeStartX;
            const deltaDays = Math.round(deltaX / dayWidthPx);

            if (deltaDays !== 0) {
                newStartDate = originalStartDate;
                newEndDate = originalEndDate;
                if (resizeSide === 'start') newStartDate = minDate([addDays(originalStartDate, deltaDays), originalEndDate]);
                else newEndDate = maxDate([addDays(originalEndDate, deltaDays), originalStartDate]);
                finalValue = `${format(newStartDate, 'yyyy-MM-dd')}/${format(newEndDate, 'yyyy-MM-dd')}`;
                const originalItem = items.find(i => i.id === resizedItemData.item.id);
                const currentValue = originalItem?.itemValues.find(v => v.columnId === primaryTimelineId)?.value;
                needsUpdate = finalValue !== currentValue;
            }
            finalItemId = resizedItemData.item.id;
            finalColumnId = primaryTimelineId;
        }

        if (needsUpdate && newStartDate && newEndDate) {
            const updatedTask: UpdatedTaskData = { itemId: finalItemId, newStartDate, newEndDate };
            const violation = checkDependencyViolations(updatedTask, items, columns);
            if (violation) {
                needsUpdate = false;
                alert(`BAĞIMLILIK İHLALİ:\n\n${violation.message}`);
            }
        }

        if (needsUpdate) {
            dispatch(updateItemValue({ itemId: finalItemId, columnId: finalColumnId, value: finalValue }));
        }

        // Temizleme
        setIsDragging(false); setDraggedItemData(null);
        setIsResizing(false); setResizedItemData(null); setResizeSide(null);
        setOriginalStartDate(null); setOriginalEndDate(null);
        onDragEnd();

    }, [
        isDragging, draggedItemData, dragStartX, initialDragOffsetDays,
        isResizing, resizedItemData, resizeSide, resizeStartX, originalStartDate, originalEndDate,
        viewMinDate, primaryTimelineId, dispatch, items, dayWidthPx, onItemClick, columns, paneRef, onDragEnd
    ]);

    const handlePaneMouseLeave = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
        if (isDragging || isResizing) {
            handleMouseUp(event.nativeEvent);
        }
    }, [isDragging, isResizing, handleMouseUp]);

    // --- useEffect (Global Dinleyiciler) ---
    useEffect(() => {
        const isActionActive = isDragging || isResizing;
        if (isActionActive) {
            let cursor = isResizing ? 'ew-resize' : 'grabbing';
            document.body.style.cursor = cursor;
            document.body.style.userSelect = 'none';

            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            window.addEventListener('mouseleave', handleMouseUp);
        }
        return () => {
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('mouseleave', handleMouseUp);
        };
    }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

    return {
        isDragging,
        draggedItemData,
        isResizing,
        resizedItemData,
        handleMouseDownOnBar,
        handleMouseDownOnResizeHandle,
        handlePaneMouseLeave,
    };
};