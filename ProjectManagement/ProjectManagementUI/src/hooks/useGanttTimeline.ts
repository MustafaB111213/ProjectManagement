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
    
    // PERFORMANS NOTU: 10 Yıllık aralık (Geçmiş 5 - Gelecek 5)
    // Bu sayede zoom yaparken tarih aralığı genişletme tetiklenmez,
    // render hazırdır ve zıplama/kayma olmaz.
    const [viewMinDate, setViewMinDate] = useState<Date>(() => subYears(new Date(), 15));
    const [viewMaxDate, setViewMaxDate] = useState<Date>(() => addYears(new Date(), 15));
    
    const [focusDate, setFocusDate] = useState<Date | null>(null);
    const [isLoadingMorePast, setIsLoadingMorePast] = useState(false);
    const [isLoadingMoreFuture, setIsLoadingMoreFuture] = useState(false);
    const initialScrollDone = useRef(false);

    // AutoFit işlemi sırasında diğer scroll hesaplamalarını kilitlemek için bayrak
    const isAutoFitting = useRef(false);
    // AutoFit hedefi
    const pendingAutoFitScroll = useRef<{ date: Date, align: 'left' } | null>(null);

    const currentDayWidth = ZOOM_STEPS[zoomIndex].dayWidth;
    const currentLevel = ZOOM_STEPS[zoomIndex].level;

    // --- TEMBEL YÜKLEME (LAZY LOAD) ---
    // Eşik değerini artırdık (2000px). Kullanıcı kenara gelmeden çok önce yükleme başlar.
    const loadMoreDatesThreshold = 2000;
    
    const getLoadAmount = () => {
        if (currentLevel === 'year' || currentLevel === 'quarter') return { years: 5 };
        if (currentLevel === 'month') return { months: 24 }; // Ay görünümünde daha fazla yükle
        return { months: 12 };
    };

    const debouncedLoadMore = useCallback(debounce((
        scrollLeft: number,
        scrollWidth: number,
        offsetWidth: number
    ) => {
        if (isAutoFitting.current) return;

        const loadAmount = getLoadAmount();

        // Sola (Geçmişe) yaklaşma kontrolü
        if (!isLoadingMorePast && scrollLeft < loadMoreDatesThreshold) {
            setIsLoadingMorePast(true);
            setViewMinDate(prev => {
                const newMin = loadAmount.years 
                    ? subYears(prev, loadAmount.years) 
                    : subMonths(prev, loadAmount.months!);
                
                // State güncellemesi sonrası bayrağı indir
                setTimeout(() => setIsLoadingMorePast(false), 300);
                return newMin;
            });
        }
        
        // Sağa (Geleceğe) yaklaşma kontrolü
        if (!isLoadingMoreFuture && scrollWidth > offsetWidth &&
            (scrollWidth - scrollLeft - offsetWidth) < loadMoreDatesThreshold) {
            setIsLoadingMoreFuture(true);
            setViewMaxDate(prev => {
                const newMax = loadAmount.years 
                    ? addYears(prev, loadAmount.years) 
                    : addMonths(prev, loadAmount.months!);
                
                setTimeout(() => setIsLoadingMoreFuture(false), 300);
                return newMax;
            });
        }
    }, 200), [isLoadingMorePast, isLoadingMoreFuture, currentLevel]);

    // --- SCROLL FONKSİYONU ---
    const scrollToDate = useCallback((date: Date, align: 'center' | 'left' = 'center', behavior: 'smooth' | 'auto' = 'smooth') => {
        if (!rightPanelScrollRef.current || !isValid(viewMinDate)) return;

        // viewMinDate sabit kaldığı sürece (10 yıllık buffer sayesinde),
        // bu hesaplama her zaman tutarlı sonuç verir ve kayma olmaz.
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
    // Burası kaymayı engelleyen kritik nokta.
    const updateZoomIndexAndScroll = useCallback((newIndexCallback: (prevIndex: number) => number) => {
        if (isAutoFitting.current || !rightPanelScrollRef.current || !isValid(viewMinDate)) return;

        const scrollDiv = rightPanelScrollRef.current;
        const oldScrollLeft = scrollDiv.scrollLeft;
        const oldOffsetWidth = scrollDiv.offsetWidth;
        const oldDayWidth = currentDayWidth;

        // 1. Zoom yapmadan önce ekranın TAM ORTASINDAKİ tarihi (noktayı) buluyoruz.
        const centerPx = oldScrollLeft + (oldOffsetWidth / 2);
        const centerDayOffsetFloat = centerPx / oldDayWidth;

        const newIndex = newIndexCallback(zoomIndex);
        if (newIndex < 0 || newIndex > MAX_ZOOM_INDEX || newIndex === zoomIndex) return;

        const newDayWidth = ZOOM_STEPS[newIndex].dayWidth;
        
        // State'i güncelliyoruz
        onZoomIndexChange(newIndex);

        // 2. Render sonrası (yeni genişliklerle) aynı tarihi tekrar ortaya getiriyoruz.
        requestAnimationFrame(() => {
            if (rightPanelScrollRef.current) {
                const currentOffsetWidth = rightPanelScrollRef.current.offsetWidth;
                // Yeni scroll pozisyonunu hesapla: (EskiGünSayısı * YeniPiksel) - YarımEkran
                const newScrollLeft = (centerDayOffsetFloat * newDayWidth) - (currentOffsetWidth / 2);
                
                rightPanelScrollRef.current.scrollTo({
                    left: Math.max(0, newScrollLeft),
                    behavior: 'auto' // Zoom sırasında animasyon kullanmıyoruz (baş dönmesi/kayma hissi olmasın)
                });
            }
        });
    }, [zoomIndex, currentDayWidth, viewMinDate, onZoomIndexChange, rightPanelScrollRef]);

    // --- AUTO FIT SONRASI SCROLL ---
    useLayoutEffect(() => {
        if (pendingAutoFitScroll.current && rightPanelScrollRef.current) {
            const { date, align } = pendingAutoFitScroll.current;
            scrollToDate(date, align, 'auto');
            pendingAutoFitScroll.current = null;
            setTimeout(() => {
                isAutoFitting.current = false;
            }, 100);
        }
    }, [currentDayWidth, scrollToDate, rightPanelScrollRef]);

    // --- İLK YÜKLEME ---
    useEffect(() => {
        if (initialScrollDone.current || !isValid(viewMinDate) || !rightPanelScrollRef.current) {
            return;
        }
        // İlk açılışta Bugüne git
        const timer = setTimeout(() => {
            scrollToDate(new Date(), 'center', 'auto');
            initialScrollDone.current = true;
        }, 100); // DOM'un tam oturması için minik gecikme
        return () => clearTimeout(timer);
    }, [viewMinDate, scrollToDate, rightPanelScrollRef]);

    useEffect(() => {
        if (focusDate) {
            const timer = setTimeout(() => {
                scrollToDate(focusDate, 'center', 'smooth');
                setFocusDate(null);
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [focusDate, scrollToDate]);

    // --- HANDLERS ---
    const handleViewModeChange = useCallback((newMode: ViewModeOption) => {
        let targetIndex: number;
        switch (newMode) {
            case 'year': targetIndex = 1; break;
            case 'quarter': targetIndex = 3; break;
            case 'month': targetIndex = 5; break;
            case 'week': targetIndex = 8; break;
            case 'day': targetIndex = 12; break;
            default: targetIndex = 10;
        }
        updateZoomIndexAndScroll(() => targetIndex);
    }, [updateZoomIndexAndScroll]);

    const handleZoomIn = useCallback(() => updateZoomIndexAndScroll(prev => Math.min(prev + 1, MAX_ZOOM_INDEX)), [updateZoomIndexAndScroll]);
    const handleZoomOut = useCallback(() => updateZoomIndexAndScroll(prev => Math.max(prev - 1, 0)), [updateZoomIndexAndScroll]);

    const handleAutoFit = useCallback(() => {
        const { minDate, maxDate } = projectDateRange;
        if (!minDate || !maxDate || !rightPanelScrollRef.current) return;

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

        pendingAutoFitScroll.current = { date: minDate, align: 'left' };

        if (bestZoomIndex !== zoomIndex) {
            onZoomIndexChange(bestZoomIndex);
        } else {
            scrollToDate(minDate, 'left', 'auto');
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
        currentLevel,
        debouncedLoadMore,
        scrollToDate,
        handleViewModeChange,
        handleZoomIn,
        handleZoomOut,
        handleAutoFit
    };
};