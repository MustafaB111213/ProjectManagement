// src/components/gantt/GanttBaselineModal.tsx (PERFORMANS DÜZELTMESİ UYGULANDI)

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useAppSelector } from '../../store/hooks';
import Modal from '../common/Modal';
import GanttToolbar, { type ViewModeOption } from './GanttToolbar';
import GanttLeftPanel from './GanttLeftPanel';
import GanttRightPanel from './GanttRightPanel';
import GanttSettingsPanel from './GanttSettingsPanel';
import { selectAllColumns } from '../../store/features/columnSlice';
import { type Group, type Item } from '../../types';
import {
    subYears, addYears, differenceInDays, isValid,
    parseISO
} from 'date-fns';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
// 'constants.ts' dosyasından ZOOM_STEPS'i import ettiğinizden emin olun
import { ZOOM_STEPS, DEFAULT_ZOOM_INDEX, MAX_ZOOM_INDEX } from '../common/constants';


// --- GÜNCELLENMİŞ PROPS ARAYÜZÜ ---
// (Bu arayüz "state'i yukarı taşıma" refaktörünü içerir)
interface GanttBaselineModalProps {
    isOpen: boolean;
    onClose: () => void;
    boardId: number;
    initialOpenSection: string | null;
    activeTimelineIds: number[];
    onTimelineColumnChange: (columnIds: number[]) => void;
    groupByColumnId: number | null;
    onGroupByColumnChange: (columnId: number | null) => void;
    colorByColumnId: number | null;
    onColorByColumnChange: (columnId: number | null) => void;
    labelById: number | null;
    onLabelByChange: (labelId: number | null) => void;
    groups: Group[];
    items: Item[];
    zoomIndex: number;
    setZoomIndex: (newIndex: number) => void;
    viewMinDate: Date;
    setViewMinDate: (newDate: Date) => void;
    viewMaxDate: Date;
    setViewMaxDate: (newDate: Date) => void;
    collapsedGroupIds: Set<number>;
    setCollapsedGroupIds: (newSet: Set<number>) => void;
    hoveredItemId: number | null;
    setHoveredItemId: (id: number | null) => void;
    isLeftPanelOpen: boolean;
    setIsLeftPanelOpen: (isOpen: boolean) => void;
}

const GanttBaselineModal: React.FC<GanttBaselineModalProps> = ({
    isOpen,
    onClose,
    boardId,
    initialOpenSection,
    activeTimelineIds,
    onTimelineColumnChange,
    groupByColumnId,
    onGroupByColumnChange,
    colorByColumnId,
    onColorByColumnChange,
    groups,
    items,
    labelById,
    onLabelByChange,
    zoomIndex,
    setZoomIndex,
    viewMinDate,
    setViewMinDate,
    viewMaxDate,
    setViewMaxDate,
    collapsedGroupIds,
    setCollapsedGroupIds,
    hoveredItemId,
    setHoveredItemId,
    isLeftPanelOpen,
    setIsLeftPanelOpen
}) => {
    // --- LOKAL STATE'LER (Modal'ın kendi iç düzeni için) ---
    const [isSettingsOpen, setIsSettingsOpen] = useState(true);
    // const [scrollTop, setScrollTop] = useState(0); // <-- PERFORMANS İÇİN KALDIRILDI
    const [focusDate, setFocusDate] = useState<Date | null>(null);

    // --- Redux ve Ref'ler (GÜNCELLENDİ) ---
    const allColumns = useAppSelector(selectAllColumns);
    const columnStatus = useAppSelector(state => state.columns.status);
    const rightPanelScrollRef = useRef<HTMLDivElement>(null); // Sağ panel (ana scroll)
    const leftPanelInnerRef_MODAL = useRef<HTMLDivElement>(null); // YENİ: Modal'ın sol panel ref'i

    // --- Hesaplanan Değerler (Aynı) ---
    const currentDayWidth = ZOOM_STEPS[zoomIndex].dayWidth;
    const currentLevelLabel = ZOOM_STEPS[zoomIndex].level as ViewModeOption;

    // ... (timelineColumnId ve initialTimelineId useMemo'ları - aynı)
    const timelineColumnId = useMemo(() => { /* ... */ }, [allColumns, columnStatus]);
    const initialTimelineId = useMemo(() => { /* ... */ }, [allColumns, columnStatus]);


    // --- HANDLER'LAR (GÜNCELLENDİ: Performans için) ---

    // Grup aç/kapat (Aynı, prop'tan gelen setter'ı kullanır)
    const handleToggleGroup = useCallback((groupId: number) => {
        const newSet = new Set(collapsedGroupIds);
        if (newSet.has(groupId)) newSet.delete(groupId);
        else newSet.add(groupId);
        setCollapsedGroupIds(newSet);
    }, [collapsedGroupIds, setCollapsedGroupIds]);

    // Lokal 'scrollToDate' (Aynı, lokal ref'e bağlı)
    const scrollToDate = useCallback((date: Date, behavior: 'smooth' | 'auto' = 'smooth') => {
        if (!rightPanelScrollRef.current || !isValid(viewMinDate)) return;
        try {
            const offsetDays = differenceInDays(date, viewMinDate);
            const containerWidth = rightPanelScrollRef.current.offsetWidth;
            let scrollLeft = (offsetDays * currentDayWidth) - (containerWidth / 2) + (currentDayWidth / 2);
            scrollLeft = Math.max(0, Math.min(scrollLeft, rightPanelScrollRef.current.scrollWidth - containerWidth));
            rightPanelScrollRef.current.scrollTo({ left: scrollLeft, behavior });
        } catch (error) { console.error("scrollToDate hatası:", error); }
    }, [viewMinDate, currentDayWidth]);

    // ... (Lokal Auto-Fit Tetikleyici (focusDate) ve Modal Açılış (isOpen) useEffect'leri - aynı)
    useEffect(() => {
        if (focusDate) {
            scrollToDate(focusDate, 'auto');
            setFocusDate(null);
        }
    }, [focusDate, scrollToDate]);
    
    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => {
                scrollToDate(new Date(), 'auto'); 
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [isOpen, scrollToDate]);

    // Lokal 'projectDateRange' (Aynı)
    const projectDateRange = useMemo(() => {
        // ... (min/max tarih bulma mantığı - aynı)
        const primaryTimelineId = activeTimelineIds.length > 0 ? activeTimelineIds[0] : null;
        if (!primaryTimelineId || items.length === 0) return { minDate: null, maxDate: null };
        let minProjectDate: Date | null = null, maxProjectDate: Date | null = null;
        for (const item of items) {
            const tv = item.itemValues.find(v => v.columnId === primaryTimelineId)?.value;
            if (tv) {
                const [startStr, endStr] = tv.split('/');
                if (startStr && endStr) {
                    try {
                        const sd = parseISO(startStr), ed = parseISO(endStr);
                        if (isValid(sd) && isValid(ed)) {
                            if (!minProjectDate || sd < minProjectDate) minProjectDate = sd;
                            if (!maxProjectDate || ed > maxProjectDate) maxProjectDate = ed;
                        }
                    } catch (e) {}
                }
            }
        }
        return { minDate: minProjectDate, maxDate: maxProjectDate };
    }, [items, activeTimelineIds]);

    // Lokal 'handleAutoFit' (Aynı, prop setter'larını kullanır)
    const handleAutoFit = useCallback(() => {
        const { minDate } = projectDateRange;
        if (!minDate || !rightPanelScrollRef.current) return;
        const newZoomIndex = 6; // Hafta görünümünün ortası (Index 6 = 28px)
        const newMinDate = subYears(minDate, 1);
        const newMaxDate = addYears(minDate, 1);
        setZoomIndex(newZoomIndex);
        setViewMinDate(newMinDate);
        setViewMaxDate(newMaxDate);
        setFocusDate(minDate);
    }, [projectDateRange, setZoomIndex, setViewMinDate, setViewMaxDate]);

    // Zoom korumalı scroll (Aynı, prop setter'ını kullanır)
    const updateZoomIndex = useCallback((newIndexCallback: (prevIndex: number) => number) => {
        // ... (scroll koruma mantığı - aynı)
        if (!rightPanelScrollRef.current || !isValid(viewMinDate)) return;
        const scrollDiv = rightPanelScrollRef.current;
        const oldScrollLeft = scrollDiv.scrollLeft, oldOffsetWidth = scrollDiv.offsetWidth;
        const oldDayWidth = currentDayWidth;
        const centerPx = oldScrollLeft + oldOffsetWidth / 2;
        const centerDayOffset = Math.round(centerPx / oldDayWidth);
        const newIndex = newIndexCallback(zoomIndex);
        if (newIndex < 0 || newIndex > MAX_ZOOM_INDEX || newIndex === zoomIndex) return;
        const newDayWidth = ZOOM_STEPS[newIndex].dayWidth;
        setZoomIndex(newIndex); // Prop setter
        requestAnimationFrame(() => {
            if (rightPanelScrollRef.current) {
                const currentOffsetWidth = scrollDiv.offsetWidth;
                const newScrollLeft = (centerDayOffset * newDayWidth) - (currentOffsetWidth / 2);
                const clampedScrollLeft = Math.max(0, newScrollLeft);
                scrollDiv.scrollLeft = clampedScrollLeft;
            }
        });
    }, [zoomIndex, currentDayWidth, viewMinDate, setZoomIndex]);

    // ... (handleZoomIn, handleZoomOut, handleViewModeChange - aynı)
    const handleZoomIn = useCallback(() => updateZoomIndex(prev => prev + 1), [updateZoomIndex]);
    const handleZoomOut = useCallback(() => updateZoomIndex(prev => prev - 1), [updateZoomIndex]);
    const handleViewModeChange = useCallback((mode: ViewModeOption) => {
        let targetIndex;
        if (mode === 'week') targetIndex = 6;
        else if (mode === 'month') targetIndex = 2;
        else targetIndex = DEFAULT_ZOOM_INDEX;
        updateZoomIndex(() => targetIndex);
    }, [updateZoomIndex]);


    // Hover Handler'ları (Aynı, prop setter'larını kullanır)
    const handleItemMouseEnter = useCallback((itemId: number) => setHoveredItemId(itemId), [setHoveredItemId]);
    const handleItemMouseLeave = useCallback(() => setHoveredItemId(null), [setHoveredItemId]);
    
    // Sol Panel Aç/Kapat (Aynı, prop setter'ını kullanır)
    const handleToggleLeftPanel = useCallback(() => setIsLeftPanelOpen(!isLeftPanelOpen), [isLeftPanelOpen, setIsLeftPanelOpen]);

    // --- YENİ: PERFORMANS GÜNCELLEMESİ (handleScroll) ---
    // Bu, modal'in *kendi* scroll'unu yönetir.
    const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop } = event.currentTarget;
        // Sol panelin transform'unu doğrudan ayarla (Re-render YOK)
        if (leftPanelInnerRef_MODAL.current) {
            leftPanelInnerRef_MODAL.current.style.transform = `translateY(-${scrollTop}px)`;
        }
        // Modal içinde lazy-loading olmadığı için debouncedLoadMore'a gerek yok
    };

    // --- YENİ: PERFORMANS GÜNCELLEMESİ (handleLeftPanelWheel) ---
    const handleLeftPanelWheel = useCallback((deltaY: number) => {
        const rightPanel = rightPanelScrollRef.current;
        if (!rightPanel) return;
        const newScrollTop = rightPanel.scrollTop + deltaY;
        rightPanel.scrollTop = newScrollTop;
        if (leftPanelInnerRef_MODAL.current) {
            leftPanelInnerRef_MODAL.current.style.transform = `translateY(-${newScrollTop}px)`;
        }
    }, []); // Bağımlılık dizisi boş
    // --- FONKSİYON GÜNCELLEMELERİ SONU ---

    // ... (Yüklenme ve Hata kontrolleri - aynı)
    if (columnStatus !== 'succeeded' || timelineColumnId === null) { /* ... */ }
    if (activeTimelineIds.length === 0 && columnStatus === 'succeeded') { /* ... */ }
    
    // --- RENDER ---
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="" size="9xl">
            <div className="flex flex-col h-[100vh] w-full bg-white">

                {/* 1. Modal Başlığı (Kaldırıldı, GanttToolbar'a taşındı) */}
                
                {/* 2. Birleşik Araç Çubuğu (GÜNCELLENDİ: onAutoFit eklendi) */}
                <div className="flex-shrink-0 pt-6 pb-0 px-4">
                    <GanttToolbar
                        scrollToDate={scrollToDate}
                        currentLevelLabel={currentLevelLabel}
                        onViewModeChange={handleViewModeChange}
                        onZoomIn={handleZoomIn}
                        onZoomOut={handleZoomOut}
                        zoomIndex={zoomIndex} 
                        maxZoomIndex={MAX_ZOOM_INDEX}
                        onSettingsClick={() => setIsSettingsOpen(!isSettingsOpen)}
                        isSettingsOpen={isSettingsOpen}
                        onAutoFit={handleAutoFit} // Lokal 'handleAutoFit'i bağla
                    />
                </div>

                {/* 3. Ana İçerik Alanı (Split View) */}
                <div className="flex-1 flex w-full relative overflow-hidden">

                    {/* SOL/GANTT ÖNİZLEME ALANI */}
                    <div
                        className={`
                            flex-1 h-full flex w-full relative transition-all duration-300
                            ${isSettingsOpen ? 'max-w-[calc(100%-400px)]' : 'max-w-full'} 
                        `}
                    >
                        {/* Sol: Görev Adları Paneli (GÜNCELLENDİ) */}
                        <div
                            className={`
                                flex-shrink-0 
                                transition-all duration-300 ease-in-out
                                overflow-hidden 
                                ${isLeftPanelOpen ? 'w-[300px]' : 'w-0'} 
                                relative 
                            `}
                        >
                            <div
                                className="w-[300px] h-full overflow-y-hidden overflow-x-hidden border-r border-gray-200 dark:border-gray-700"
                                // YENİ: Mouse tekerlek olayını yakala
                                onWheel={(e) => handleLeftPanelWheel(e.deltaY)}
                            >
                                <GanttLeftPanel
                                    // YENİ PROPLAR
                                    innerRef={leftPanelInnerRef_MODAL} // Yeni ref'i ilet
                                    onWheel={() => {}} // Zaten kapsayıcı div'de ele alıyoruz, boş fonksiyon
                                    // ESKİ PROPLAR
                                    groups={groups}
                                    items={items}
                                    collapsedGroupIds={collapsedGroupIds} 
                                    onToggleGroup={handleToggleGroup}
                                    hoveredItemId={hoveredItemId} 
                                />
                            </div>
                        </div>

                        {/* Panel Ayırıcı (Aynı) */}
                        <div className="flex-shrink-0 w-px bg-gray-200 :bg-gray-700 relative z-20">
                            <button
                                onClick={handleToggleLeftPanel}
                                className="
                                absolute top-1/2 -left-3 w-7 h-7 
                                bg-white :bg-gray-800 
                                border border-gray-300 dark:border-gray-600 
                                rounded-full shadow-md 
                                flex items-center justify-center 
                                text-gray-500 hover:text-gray-900 :hover:text-white
                                focus:outline-none focus:ring-2 focus:ring-gray-500
                                "
                                style={{ transform: 'translateY(-50%)' }}
                                title={isLeftPanelOpen ? "Paneli daralt" : "Paneli genişlet"}
                            >
                                {isLeftPanelOpen ? <FiChevronLeft size={18} /> : <FiChevronRight size={18} />}
                            </button>
                        </div>

                        {/* Sağ: Gantt Çizim Alanı (GÜNCELLENDİ) */}
                        <div 
                            ref={rightPanelScrollRef} 
                            className="flex-1 w-full overflow-auto"
                            onScroll={handleScroll} // YENİ: Lokal scroll handler'ı bağla
                        >
                            <GanttRightPanel
                                groups={groups}
                                items={items}
                                columns={allColumns}
                                activeTimelineIds={activeTimelineIds}
                                viewMinDate={viewMinDate} 
                                viewMaxDate={viewMaxDate} 
                                collapsedGroupIds={collapsedGroupIds} 
                                dayWidthPx={currentDayWidth} 
                                colorByColumnId={colorByColumnId}
                                labelById={labelById}
                                onItemClick={() => { }}
                                onMouseEnterBar={handleItemMouseEnter}
                                onMouseLeaveBar={handleItemMouseLeave}
                            />
                        </div>
                    </div>

                    {/* SAĞ: AYARLAR PANELİ (Aynı) */}
                    {isSettingsOpen && (
                        <div className="w-[400px] flex-shrink-0">
                            <GanttSettingsPanel
                                openSection={initialOpenSection}
                                allColumns={allColumns}
                                activeTimelineIds={activeTimelineIds}
                                onTimelineColumnChange={onTimelineColumnChange}
                                groupByColumnId={groupByColumnId}
                                onGroupByColumnChange={onGroupByColumnChange}
                                colorByColumnId={colorByColumnId}
                                onColorByColumnChange={onColorByColumnChange}
                                labelById={labelById}
                                onLabelByChange={onLabelByChange}
                            />
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default GanttBaselineModal;