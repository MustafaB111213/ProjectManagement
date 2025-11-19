import { useState, useRef, useEffect, useLayoutEffect, useCallback, type RefObject } from 'react';
import { addMonths, subMonths, differenceInDays, subYears, addYears, isValid, startOfDay, differenceInMilliseconds } from 'date-fns';
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

    // AutoFit işlemi sırasında diğer scroll hesaplamalarını kilitlemek için bayrak
    const isAutoFitting = useRef(false);
    // AutoFit hedefi
    const pendingAutoFitScroll = useRef<{ date: Date, align: 'left' } | null>(null);

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
        // AutoFit sırasında lazy load tetiklenmesini engelle
        if (isAutoFitting.current) return;

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

    // --- SCROLL FONKSİYONU ---
    const scrollToDate = useCallback((date: Date, align: 'center' | 'left' = 'center', behavior: 'smooth' | 'auto' = 'smooth') => {
        if (!rightPanelScrollRef.current || !isValid(viewMinDate)) return;

        const msDiff = differenceInMilliseconds(startOfDay(date), startOfDay(viewMinDate));
        const dayDiff = msDiff / (1000 * 60 * 60 * 24);
        
        const containerWidth = rightPanelScrollRef.current.offsetWidth;
        const dateLeftPosition = dayDiff * currentDayWidth;

        let targetScrollLeft = 0;

        if (align === 'left') {
            targetScrollLeft = dateLeftPosition - 20;
        } else {
            targetScrollLeft = dateLeftPosition - (containerWidth / 2) + (currentDayWidth / 2);
        }

        targetScrollLeft = Math.max(0, targetScrollLeft);
        
        rightPanelScrollRef.current.scrollTo({ left: targetScrollLeft, behavior });
    }, [viewMinDate, currentDayWidth, rightPanelScrollRef]);

    // --- MANUAL ZOOM GÜNCELLEME ---
    const updateZoomIndexAndScroll = useCallback((newIndexCallback: (prevIndex: number) => number) => {
        // Eğer AutoFit çalışıyorsa, manuel hesaplamaları atla
        if (isAutoFitting.current || !rightPanelScrollRef.current || !isValid(viewMinDate)) return;

        const scrollDiv = rightPanelScrollRef.current;
        const oldScrollLeft = scrollDiv.scrollLeft;
        const oldOffsetWidth = scrollDiv.offsetWidth;
        const oldDayWidth = currentDayWidth;

        const centerPx = oldScrollLeft + (oldOffsetWidth / 2);
        const centerDayOffsetFloat = centerPx / oldDayWidth;

        const newIndex = newIndexCallback(zoomIndex);
        if (newIndex < 0 || newIndex > MAX_ZOOM_INDEX || newIndex === zoomIndex) return;

        const newDayWidth = ZOOM_STEPS[newIndex].dayWidth;
        onZoomIndexChange(newIndex);

        // Render sonrası scroll düzeltmesi
        requestAnimationFrame(() => {
            if (rightPanelScrollRef.current) {
                const currentOffsetWidth = rightPanelScrollRef.current.offsetWidth;
                const newScrollLeft = (centerDayOffsetFloat * newDayWidth) - (currentOffsetWidth / 2);
                rightPanelScrollRef.current.scrollTo({
                    left: Math.max(0, newScrollLeft),
                    behavior: 'auto' // Zoom sırasında smooth scroll baş dönmesi yapar
                });
            }
        });
    }, [zoomIndex, currentDayWidth, viewMinDate, onZoomIndexChange, rightPanelScrollRef]);

    // --- AUTO FIT SONRASI SCROLL (useLayoutEffect kullanıyoruz) ---
    // useLayoutEffect, tarayıcı boyamadan (paint) önce çalışır, böylece titremeyi önler.
    useLayoutEffect(() => {
        if (pendingAutoFitScroll.current && rightPanelScrollRef.current) {
            const { date, align } = pendingAutoFitScroll.current;
            
            // Scroll işlemini ANINDA yap (auto), animasyon kullanma (git-gel yapmaması için)
            scrollToDate(date, align, 'auto');
            
            // İşlem bitti, bayrakları indir
            pendingAutoFitScroll.current = null;
            
            // Biraz bekle sonra kilidi aç (lazy load hemen tetiklenmesin)
            setTimeout(() => {
                isAutoFitting.current = false;
            }, 100);
        }
    }, [currentDayWidth, scrollToDate, rightPanelScrollRef]); 

    // --- EFFECT'LER ---
    useEffect(() => {
        if (focusDate) {
            const timer = setTimeout(() => {
                scrollToDate(focusDate, 'center', 'smooth');
                setFocusDate(null);
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [focusDate, scrollToDate]);

    useEffect(() => {
        if (initialScrollDone.current || !isValid(viewMinDate) || !rightPanelScrollRef.current) {
            return;
        }
        // İlk açılış scroll'u
        const timer = setTimeout(() => {
            scrollToDate(new Date(), 'center', 'auto');
            initialScrollDone.current = true;
        }, 100);
        return () => clearTimeout(timer);
    }, [viewMinDate, scrollToDate, rightPanelScrollRef]);

    // --- HANDLERS ---
    const handleViewModeChange = useCallback((newMode: ViewModeOption) => {
        let targetIndex: number;
        if (newMode === 'week') targetIndex = 6;
        else if (newMode === 'month') targetIndex = 2;
        else targetIndex = DEFAULT_ZOOM_INDEX;
        updateZoomIndexAndScroll(() => targetIndex);
    }, [updateZoomIndexAndScroll]);

    const handleZoomIn = useCallback(() => updateZoomIndexAndScroll(prev => Math.min(prev + 1, MAX_ZOOM_INDEX)), [updateZoomIndexAndScroll]);
    const handleZoomOut = useCallback(() => updateZoomIndexAndScroll(prev => Math.max(prev - 1, 0)), [updateZoomIndexAndScroll]);

    // --- AUTO FIT (DÜZELTİLDİ) ---
    const handleAutoFit = useCallback(() => {
        const { minDate, maxDate } = projectDateRange;
        if (!minDate || !maxDate || !rightPanelScrollRef.current) return;

        // KİLİDİ AÇ: Diğer scroll efektlerini engelle
        isAutoFitting.current = true;

        const containerWidth = rightPanelScrollRef.current.offsetWidth;
        const totalProjectDays = differenceInDays(maxDate, minDate) + 2;

        let bestZoomIndex = 0;
        for (let i = MAX_ZOOM_INDEX; i >= 0; i--) {
            const potentialContentWidth = totalProjectDays * ZOOM_STEPS[i].dayWidth;
            if (potentialContentWidth <= containerWidth) {
                bestZoomIndex = i;
                break;
            }
        }

        // Hedefi kaydet
        pendingAutoFitScroll.current = { date: minDate, align: 'left' };

        if (bestZoomIndex !== zoomIndex) {
            // Zoom değişecek -> State güncelle -> Re-render -> useLayoutEffect tetiklenir -> Scroll yapılır
            onZoomIndexChange(bestZoomIndex);
        } else {
            // Zoom değişmeyecek -> State değişmez -> useLayoutEffect TETİKLENMEZ.
            // Bu yüzden burada manuel scroll yapmalıyız.
            scrollToDate(minDate, 'left', 'auto'); // 'auto' kullanıyoruz, smooth değil
            pendingAutoFitScroll.current = null;
            setTimeout(() => { isAutoFitting.current = false; }, 100);
        }

    }, [projectDateRange, onZoomIndexChange, rightPanelScrollRef, scrollToDate, zoomIndex]);

    return {
        viewMinDate,
        viewMaxDate,
        setViewMinDate,
        setViewMaxDate,
        currentDayWidth,
        currentLevelLabel,
        debouncedLoadMore,
        scrollToDate,
        handleViewModeChange,
        handleZoomIn,
        handleZoomOut,
        handleAutoFit
    };
};