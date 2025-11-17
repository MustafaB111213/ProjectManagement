// src/components/gantt/GanttBaselineModal.tsx (YENİDEN DÜZENLENDİ)

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useAppSelector } from '../../store/hooks';
import Modal from '../common/Modal';
import GanttToolbar from './GanttToolbar';
import GanttLeftPanel from './GanttLeftPanel';
import GanttRightPanel from './GanttRightPanel';
import GanttSettingsPanel from './GanttSettingsPanel';
import { selectAllColumns } from '../../store/features/columnSlice';
import { type Group, type Item } from '../../types';
import { isValid, parseISO } from 'date-fns'; // Sadece gerekli olanlar
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { MAX_ZOOM_INDEX } from '../common/constants';
import { usePanelSync } from '../../hooks/usePanelSync';
// GÜNCELLEME: Modal artık kendi timeline hook'unu kullanacak
import { useGanttTimeline } from '../../hooks/useGanttTimeline';

// --- PROPS ARAYÜZÜ ---
interface GanttBaselineModalProps {
    isOpen: boolean;
    onClose: () => void;
    boardId: number;
    initialOpenSection: string | null;

    // Ayar Propları (Parent'tan gelir)
    activeTimelineIds: number[];
    onTimelineColumnChange: (columnIds: number[]) => void;
    groupByColumnId: number | null;
    onGroupByColumnChange: (columnId: number | null) => void;
    colorByColumnId: number | null;
    onColorByColumnChange: (columnId: number | null) => void;
    labelById: number | null;
    onLabelByChange: (labelId: number | null) => void;

    // Veri Propları (Parent'tan gelir)
    groups: Group[];
    items: Item[];

    // GÜNCELLEME: Sadece 'initial' zoom index'i alır
    initialZoomIndex: number;
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
    initialZoomIndex // Sadece başlangıç değerini al
}) => {
    // --- LOKAL STATE'LER (Modal'ın kendi UI'ı için) ---
    const [isSettingsOpen, setIsSettingsOpen] = useState(true);

    // GÜNCELLEME: Modal artık KENDİ Gantt state'lerini yönetiyor
    const [zoomIndex, setZoomIndex] = useState(initialZoomIndex);
    const [collapsedGroupIds, setCollapsedGroupIds] = useState<Set<number>>(new Set());
    const [hoveredItemId, setHoveredItemId] = useState<number | null>(null);
    const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);

    // --- Redux ve Ref'ler ---
    const allColumns = useAppSelector(selectAllColumns);
    const columnStatus = useAppSelector(state => state.columns.status);

    // Modal'ın KENDİ ref'leri
    const modalRightPanelScrollRef = useRef<HTMLDivElement>(null);
    const modalLeftPanelInnerRef = useRef<HTMLDivElement>(null);

    // --- VERİ İŞLEME (Lokal) ---
    const projectDateRange = useMemo(() => {
        const primaryTimelineId = activeTimelineIds.length > 0 ? activeTimelineIds[0] : null;
        if (!primaryTimelineId || items.length === 0) return { minDate: null, maxDate: null };
        let minDate: Date | null = null, maxDate: Date | null = null;
        for (const item of items) {
            const val = item.itemValues.find(v => v.columnId === primaryTimelineId)?.value;
            if (val) {
                const [startStr, endStr] = val.split('/');
                if (startStr && endStr) {
                    try {
                        const sd = parseISO(startStr), ed = parseISO(endStr);
                        if (isValid(sd) && isValid(ed)) {
                            if (!minDate || sd < minDate) minDate = sd;
                            if (!maxDate || ed > maxDate) maxDate = ed;
                        }
                    } catch (e) { }
                }
            }
        }
        return { minDate, maxDate };
    }, [items, activeTimelineIds]);

    // --- Modal KENDİ Timeline Hook'unu kullanıyor ---
    const {
        viewMinDate, viewMaxDate,
        currentDayWidth, currentLevelLabel,
        scrollToDate,
        handleViewModeChange,
        handleZoomIn,
        handleZoomOut,
        handleAutoFit
    } = useGanttTimeline({
        projectDateRange,
        zoomIndex,
        onZoomIndexChange: setZoomIndex, // Lokal state'i güncelle
        rightPanelScrollRef: modalRightPanelScrollRef // Modal'ın ref'ini kullan
    });

    // --- Modal KENDİ Panel Senkronizasyonunu kullanıyor ---
    const modalDebouncedLoadMore = useCallback(() => { }, []);
    const {
        handleScroll: modalHandleScroll,
        handleLeftPanelWheel: modalHandleLeftPanelWheel
    } = usePanelSync(
        modalDebouncedLoadMore,
        modalLeftPanelInnerRef,
        modalRightPanelScrollRef
    );

    // GÜNCELLEME: "Bugüne git" effect'i buraya geri eklendi
    useEffect(() => {
        if (isOpen) {
            // Modal açıldığında "Bugün"e kaydır
            const timer = setTimeout(() => {
                // Hook'tan gelen LOKAL scrollToDate'i kullan
                scrollToDate(new Date(), 'auto');
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [isOpen, scrollToDate]); // 'scrollToDate' artık lokal ve güvenli

    // --- LOKAL HANDLER'LAR ---
    const handleToggleGroup = useCallback((groupId: number) => {
        setCollapsedGroupIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(groupId)) newSet.delete(groupId);
            else newSet.add(groupId);
            return newSet;
        });
    }, []); // Lokal state'e bağlı

    const handleToggleLeftPanel = useCallback(() => {
        setIsLeftPanelOpen(prev => !prev);
    }, []); // Lokal state'e bağlı

    const handleItemMouseEnter = useCallback((itemId: number) => setHoveredItemId(itemId), []);
    const handleItemMouseLeave = useCallback(() => setHoveredItemId(null), []);

    // --- Yüklenme ve Hata Durumları ---
    if (columnStatus !== 'succeeded') {
        return <Modal isOpen={isOpen} onClose={onClose} title="Yükleniyor..."><div className="p-4">Gantt verisi yükleniyor...</div></Modal>;
    }
    if (activeTimelineIds.length === 0) {
        return <Modal isOpen={isOpen} onClose={onClose} title="Hata"><div className="p-4">Timeline sütunu bulunamadı.</div></Modal>;
    }

    // --- RENDER ---
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title=""
            size="9xl"
            disableContentScroll={true}
        >
            {/* DÜZELTME 1: h-[100vh] yerine h-[calc(100vh-6rem)] kullanıldı.
                Bu, Modal'ın kendi padding'i ve ekran kenar boşlukları için alt kısımdan 
                pay bırakır ve scrollbar'ın görünür alana çıkmasını sağlar. */}
            <div className="flex flex-col h-[calc(100vh-6rem)] w-full bg-white">

                {/* Toolbar (Lokal handler'ları kullanır) */}
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
                        onAutoFit={handleAutoFit}
                    />
                </div>

                {/* Ana İçerik Alanı */}
                <div className="flex-1 flex w-full relative overflow-hidden">

                    {/* SOL/GANTT ÖNİZLEME ALANI */}
                    <div className={`flex-1 h-full flex w-full relative transition-all duration-300 ${isSettingsOpen ? 'max-w-[calc(100%-400px)]' : 'max-w-full'}`}>

                        {/* Sol Panel Wrapper - DÜZELTİLDİ */}
                        {/* width style olarak verildi çünkü dinamik */}
                        <div className={`flex-shrink-0 transition-all duration-300 ease-in-out overflow-hidden ${isLeftPanelOpen ? 'w-[420px]' : 'w-0'} relative`}>
                    <div
                        className="w-[426px] h-full overflow-y-hidden overflow-x-hidden border-r"
                        onWheel={(e) => modalHandleLeftPanelWheel(e.deltaY)}
                    >
                                <GanttLeftPanel
                                    innerRef={modalLeftPanelInnerRef}
                                    groups={groups}
                                    items={items}
                                    collapsedGroupIds={collapsedGroupIds}
                                    onToggleGroup={handleToggleGroup}
                                    hoveredItemId={hoveredItemId}
                                    columns={allColumns}
                                    activeTimelineIds={activeTimelineIds}
                                />
                            </div>
                        </div>

                        {/* Panel Ayırıcı */}
                        <div className="flex-shrink-0 w-px bg-gray-200 relative z-20">
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

                        {/* Sağ Panel (GanttRightPanel) */}
                        {/* DÜZELTME 2: overflow-x-auto EKLENDİ ve pb-12 korundu */}
                        <div
                            ref={modalRightPanelScrollRef}
                            // overflow-x-auto: Yatay kaydırmayı zorlar.
                            // min-h-0: Flex taşmasını önler.
                            // pb-12: En alttaki öğenin scrollbar'ın altında kalmamasını sağlar.
                            className="flex-1 w-full overflow-x-auto overflow-y-auto min-h-0 pb-12"
                            onScroll={modalHandleScroll}
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
                                scrollContainerRef={modalRightPanelScrollRef}
                                onItemClick={() => { }}
                                onMouseEnterBar={handleItemMouseEnter}
                                onMouseLeaveBar={handleItemMouseLeave}
                            />
                        </div>
                    </div>

                    {/* SAĞ: AYARLAR PANELİ (Aynı, prop'ları kullanır) */}
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