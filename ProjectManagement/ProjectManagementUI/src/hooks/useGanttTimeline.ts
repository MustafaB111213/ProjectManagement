// src/hooks/useGanttTimeline.ts (GÜNCELLENMİŞ)

import { useState, useMemo, useRef, useEffect, useCallback, type RefObject,  } from 'react';
import { format, addMonths, subMonths, differenceInDays, subYears, addYears, isValid, addDays, parseISO } from 'date-fns';
import { debounce } from 'lodash';
import type { ViewModeOption } from '../components/gantt/GanttToolbar';
import { DEFAULT_ZOOM_INDEX, MAX_ZOOM_INDEX, ZOOM_STEPS } from '../components/common/constants';

type ProjectDateRange = { minDate: Date | null, maxDate: Date | null };

interface GanttTimelineProps {
    projectDateRange: ProjectDateRange;
    zoomIndex: number;
    onZoomIndexChange: (index: number) => void;
    rightPanelScrollRef: RefObject<HTMLDivElement | null>; 
}

/**
 * Gantt şemasının tüm zoom, kaydırma ve tarih aralığı mantığını yönetir.
 */
export const useGanttTimeline = ({
    projectDateRange,
    zoomIndex,
    onZoomIndexChange,
    rightPanelScrollRef
}: GanttTimelineProps) => {
    
    // --- STATE'LER ---
    const [viewMinDate, setViewMinDate] = useState<Date>(() => subYears(new Date(), 1));
    const [viewMaxDate, setViewMaxDate] = useState<Date>(() => addYears(new Date(), 2));
    const [focusDate, setFocusDate] = useState<Date | null>(null);
    const [isLoadingMorePast, setIsLoadingMorePast] = useState(false);
    const [isLoadingMoreFuture, setIsLoadingMoreFuture] = useState(false);
    const initialScrollDone = useRef(false);

    // --- HESAPLANAN DEĞERLER ---
    const currentDayWidth = ZOOM_STEPS[zoomIndex].dayWidth;
    const currentLevelLabel = ZOOM_STEPS[zoomIndex].level as ViewModeOption;

    // --- TEMBEL YÜKLEME (LAZY LOAD) ---
    const loadMoreDatesThreshold = 500;
    const loadMoreMonthsAmount = 6;
    const debouncedLoadMore = useCallback(debounce((
        scrollLeft: number,
        scrollWidth: number,
        offsetWidth: number
    ) => {
        if (!isLoadingMorePast && scrollLeft < loadMoreDatesThreshold) {
            setIsLoadingMorePast(true);
            setViewMinDate(prev => {
                const newMin = subMonths(prev, loadMoreMonthsAmount);
                setTimeout(() => setIsLoadingMorePast(false), 500);
                return newMin;
            });
        }
        if (!isLoadingMoreFuture && scrollWidth > offsetWidth &&
            (scrollWidth - scrollLeft - offsetWidth) < loadMoreDatesThreshold) {
            setIsLoadingMoreFuture(true);
            setViewMaxDate(prev => {
                const newMax = addMonths(prev, loadMoreMonthsAmount);
                setTimeout(() => setIsLoadingMoreFuture(false), 500);
                return newMax;
            });
        }
    }, 300), [loadMoreMonthsAmount, isLoadingMorePast, isLoadingMoreFuture]);

    // --- TEMEL FONKSİYONLAR ---
    const scrollToDate = useCallback((date: Date, behavior: 'smooth' | 'auto' = 'smooth') => {
        if (!rightPanelScrollRef.current || !isValid(viewMinDate)) return;
        try {
            const offsetDays = differenceInDays(date, viewMinDate);
            const containerWidth = rightPanelScrollRef.current.offsetWidth;
            let scrollLeft = (offsetDays * currentDayWidth) - (containerWidth / 2) + (currentDayWidth / 2);
            scrollLeft = Math.max(0, Math.min(scrollLeft, rightPanelScrollRef.current.scrollWidth - containerWidth));
            rightPanelScrollRef.current.scrollTo({ left: scrollLeft, behavior });
        } catch (error) {
            console.error("scrollToDate hatası:", error);
        }
    }, [viewMinDate, currentDayWidth, rightPanelScrollRef]);

    const updateZoomIndexAndScroll = useCallback((newIndexCallback: (prevIndex: number) => number) => {
        if (!rightPanelScrollRef.current || !isValid(viewMinDate)) return;

        const scrollDiv = rightPanelScrollRef.current;
        const oldScrollLeft = scrollDiv.scrollLeft;
        const oldOffsetWidth = scrollDiv.offsetWidth;
        const oldDayWidth = currentDayWidth;
        const centerPx = oldScrollLeft + oldOffsetWidth / 2;
        const centerDayOffset = Math.round(centerPx / oldDayWidth);

        const newIndex = newIndexCallback(zoomIndex);
        if (newIndex < 0 || newIndex > MAX_ZOOM_INDEX || newIndex === zoomIndex) return;

        const newDayWidth = ZOOM_STEPS[newIndex].dayWidth;
        onZoomIndexChange(newIndex); // Parent state'i güncelle

        requestAnimationFrame(() => {
            if (rightPanelScrollRef.current) {
                const currentOffsetWidth = scrollDiv.offsetWidth;
                const newScrollLeft = (centerDayOffset * newDayWidth) - (currentOffsetWidth / 2);
                const clampedScrollLeft = Math.max(0, newScrollLeft);
                scrollDiv.scrollLeft = clampedScrollLeft;
            }
        });
    }, [zoomIndex, currentDayWidth, viewMinDate, onZoomIndexChange, rightPanelScrollRef]);

    // --- EFFECT'LER ---
    useEffect(() => {
        if (focusDate) {
            scrollToDate(focusDate, 'auto');
            setFocusDate(null);
        }
    }, [focusDate, scrollToDate]);

    useEffect(() => {
        if (initialScrollDone.current || !isValid(viewMinDate) || !rightPanelScrollRef.current) {
            return;
        }
        const timer = setTimeout(() => {
            scrollToDate(new Date(), 'auto');
            initialScrollDone.current = true;
        }, 150);
        return () => clearTimeout(timer);
    }, [viewMinDate, scrollToDate, rightPanelScrollRef]);

    // --- TOOLBAR HANDLER'LARI ---
    const handleViewModeChange = useCallback((newMode: ViewModeOption) => {
        let targetIndex: number;
        if (newMode === 'week') targetIndex = 6;
        else if (newMode === 'month') targetIndex = 2;
        else targetIndex = DEFAULT_ZOOM_INDEX;
        updateZoomIndexAndScroll(() => targetIndex);
    }, [updateZoomIndexAndScroll]);

    const handleZoomIn = useCallback(() => updateZoomIndexAndScroll(prev => Math.min(prev + 1, MAX_ZOOM_INDEX)), [updateZoomIndexAndScroll]);
    const handleZoomOut = useCallback(() => updateZoomIndexAndScroll(prev => Math.max(prev - 1, 0)), [updateZoomIndexAndScroll]);

    const handleAutoFit = useCallback(() => {
        const { minDate } = projectDateRange;
        if (!minDate || !rightPanelScrollRef.current) return;
        
        const newZoomIndex = 6; // Hafta görünümünün ortası
        const newMinDate = subYears(minDate, 1);
        const newMaxDate = addYears(minDate, 1);

        onZoomIndexChange(newZoomIndex); 
        setViewMinDate(newMinDate);
        setViewMaxDate(newMaxDate);
        setFocusDate(minDate); // Kaydırmayı tetikle
    }, [projectDateRange, onZoomIndexChange]);

    // GÜNCELLEME: Hook artık tüm state'leri ve handler'ları döndürüyor
    return {
        viewMinDate,
        viewMaxDate,
        setViewMinDate, // <-- Modal için eklendi
        setViewMaxDate, // <-- Modal için eklendi
        currentDayWidth,
        currentLevelLabel,
        debouncedLoadMore,
        // Handler'lar
        scrollToDate,
        handleViewModeChange,
        handleZoomIn,
        handleZoomOut,
        handleAutoFit
    };
};