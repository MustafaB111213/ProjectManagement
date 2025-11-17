// src/hooks/useGanttDragResize.ts
// (Dosyanın tamamını bununla değiştir)

import { useState, useCallback, useEffect, type RefObject } from 'react';
import { type Item, type Column } from '../types';
// YENİ: ProcessedItemData'yı import et (içindeki yeni alanı okumak için)
import { type ProcessedItemData } from '../components/gantt/GanttArrows';
import { useAppDispatch } from '../store/hooks';
import { updateItemValue } from '../store/features/itemSlice';
import { checkDependencyViolations, type UpdatedTaskData, type Violation } from '../utils/ganttDependencies';
import { parseISO, differenceInCalendarDays, addDays, format, max as maxDate, min as minDate } from 'date-fns';

type ResizeSide = 'start' | 'end';

interface DragResizeState {
    item: Item;
    timelineColumnId: number; // HANGİ kolonun sürüklendiğini tutar

    // --- YENİ ALAN ---
    // Bağımlılığın bağlı olduğu ana kolonun ID'si
    primaryTimelineColumnId: number | null;
    // --- YENİ ALAN SONU ---

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
    paneRef,
    items,
    columns,
    viewMinDate,
    dayWidthPx,
    onItemClick,
    onDragStart,
    onDragEnd,
}: GanttDragResizeProps) => {

    const dispatch = useAppDispatch();
    const [dragState, setDragState] = useState<DragResizeState | null>(null);

    const activeItemId = dragState?.item.id ?? null;
    const isDragging = dragState !== null && dragState.side === null;
    const isResizing = dragState !== null && dragState.side !== null;

    const dragThreshold = 5;

    const getDatesFromItem = (item: Item, timelineColumnId: number): { startDate: Date, endDate: Date } | null => {
        // ... (Bu fonksiyon aynı) ...
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

    // --- MOUSE DOWN HANDLER'LARI ---

    // GÜNCELLENDİ: 'itemData'dan 'primaryTimelineColumnId'yi alır
    const handleMouseDownOnBar = useCallback((
        event: React.MouseEvent,
        itemData: ProcessedItemData, // <-- Tipi ProcessedItemData
        timelineColumnId: number
    ) => {
        if (event.button !== 0 || (event.target as HTMLElement).dataset.resizeHandle) return;
        event.stopPropagation();

        const item = items.find(i => i.id === itemData.item.id);
        if (!item) return;

        const dates = getDatesFromItem(item, timelineColumnId);
        if (!dates) return;

        onDragStart();
        setDragState({
            item: item,
            timelineColumnId: timelineColumnId,
            // --- YENİ SATIR ---
            // itemData'dan (GanttRightPanel'de eklediğimiz) ana barın ID'sini al
            primaryTimelineColumnId: itemData.primaryTimelineColumnId,
            // --- YENİ SATIR SONU ---
            originalStartDate: dates.startDate,
            originalEndDate: dates.endDate,
            originalMouseX: event.clientX,
            currentDeltaDays: 0,
            side: null,
            isClickEvent: true,
        });

    }, [items, onDragStart]);

    // GÜNCELLENDİ: 'itemData'dan 'primaryTimelineColumnId'yi alır
    const handleMouseDownOnResizeHandle = useCallback((
        event: React.MouseEvent,
        itemData: ProcessedItemData, // <-- Tipi ProcessedItemData
        side: ResizeSide,
        timelineColumnId: number
    ) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();

        const item = items.find(i => i.id === itemData.item.id);
        if (!item) return;

        const dates = getDatesFromItem(item, timelineColumnId);
        if (!dates) return;

        onDragStart();
        setDragState({
            item: item,
            timelineColumnId: timelineColumnId,
            // --- YENİ SATIR ---
            primaryTimelineColumnId: itemData.primaryTimelineColumnId,
            // --- YENİ SATIR SONU ---
            originalStartDate: dates.startDate,
            originalEndDate: dates.endDate,
            originalMouseX: event.clientX,
            currentDeltaDays: 0,
            side: side,
            isClickEvent: false,
        });
    }, [items, onDragStart]);


    // --- MOUSE MOVE/UP/LEAVE HANDLER'LARI ---

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


    // DÜZELTME: Fonksiyon adı 'handlePaneMouseUp' olarak değiştirildi
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
            else if (dragState.side === null) { // Sürükleme
                const duration = differenceInCalendarDays(dragState.originalEndDate, dragState.originalStartDate);
                newStartDate = addDays(dragState.originalStartDate, deltaDays);
                newEndDate = addDays(newStartDate, Math.max(0, duration));
                needsUpdate = true;
            }
            else if (dragState.side === 'start') { // Boyutlandırma (Başlangıç)
                newStartDate = minDate([addDays(dragState.originalStartDate, deltaDays), dragState.originalEndDate]);
                newEndDate = dragState.originalEndDate;
                needsUpdate = true;
            }
            else if (dragState.side === 'end') { // Boyutlandırma (Bitiş)
                newStartDate = dragState.originalStartDate;
                newEndDate = maxDate([addDays(dragState.originalEndDate, deltaDays), dragState.originalStartDate]);
                needsUpdate = true;
            }
        }

        if (needsUpdate && newStartDate && newEndDate) {

            let violation: Violation | null = null;

            // --- İSTEĞİNİN ÇÖZÜMÜ BURADA ---
            // Sadece sürüklenen/boyutlanan bar, bağımlılıkların bağlı olduğu
            // ANA bar ise kural ihlali kontrolü yap.
            if (dragState.timelineColumnId === dragState.primaryTimelineColumnId) {
                const updatedTask: UpdatedTaskData = { itemId: dragState.item.id, newStartDate, newEndDate };
                violation = checkDependencyViolations(updatedTask, items, columns);
            }
            // (Eğer 'timelineColumnId' eşit değilse, 'violation' 'null' kalır
            // ve kopya barın ihlal kontrolü atlanmış olur.)
            // --- ÇÖZÜM SONU ---

            if (violation) {
                alert(`BAĞIMLILIK İHLALİ:\n\n${violation.message}`);
                needsUpdate = false;
            }
            else {
                // Kural ihlali yoksa VEYA bu bir kopya bar ise, güncelle
                const finalValue = `${format(newStartDate, 'yyyy-MM-dd')}/${format(newEndDate, 'yyyy-MM-dd')}`;
                dispatch(updateItemValue({
                    itemId: dragState.item.id,
                    columnId: dragState.timelineColumnId, // Hangi bar sürüklendiyse onu günceller
                    value: finalValue
                }));
            }
        }

        setDragState(null);
        onDragEnd();

    }, [dragState, dayWidthPx, dispatch, items, columns, onItemClick, onDragEnd]);
    // DÜZELTME: handlePaneMouseUp'ı çağırır
    const handlePaneMouseLeave = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
        if (dragState) {
            handlePaneMouseUp(event.nativeEvent);
        }
    }, [dragState, handlePaneMouseUp]);

    // --- useEffect (Global Dinleyiciler) ---
    // DÜZELTME: Bağımlılıkları 'handlePane...' olarak günceller
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

        // DÜZELTME: Artık 'return' bloğu, tanımlanan fonksiyonlarla eşleşiyor
        handlePaneMouseLeave,

    };
};