import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useAppSelector } from '../../store/hooks';
import Modal from '../common/Modal';
import GanttToolbar, { type ViewModeOption } from '../gantt/GanttToolbar';
import GanttLeftPanel from './GanttLeftPanel';
import GanttRightPanel from './GanttRightPanel';
import GanttSettingsPanel from './GanttSettingsPanel';
import { selectAllColumns } from '../../store/features/columnSlice';
import { type Group, type Item } from '../../types';
import { isValid, parseISO } from 'date-fns';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { MAX_ZOOM_INDEX } from '../common/constants';
import { usePanelSync } from '../../hooks/usePanelSync';
import { useGanttTimeline } from '../../hooks/useGanttTimeline';
import { useGanttScroll } from '../../hooks/useGanttScroll';

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

    activeBaselineId: number | null;
    onBaselineChange: (columnId: number | null) => void;
    onCreateBaseline: () => void;

    groups: Group[];
    items: Item[];

    zoomIndex: number;
    onZoomIndexChange: (index: number) => void;

    collapsedGroupIds: Set<number>;
    onToggleGroup: (groupId: number) => void;

    initialDate?: Date;

    onDeleteBaseline?: (columnId: number) => void;
    showCriticalPath: boolean;
    onToggleCriticalPath: (show: boolean) => void;
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
    activeBaselineId,
    onBaselineChange,
    onCreateBaseline,
    zoomIndex,
    onZoomIndexChange,
    collapsedGroupIds,
    onToggleGroup,
    initialDate,
    onDeleteBaseline,
    showCriticalPath,
    onToggleCriticalPath,
}) => {
    const [isSettingsOpen, setIsSettingsOpen] = useState(true);
    const [hoveredItemId, setHoveredItemId] = useState<number | null>(null);
    const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);

    const allColumns = useAppSelector(selectAllColumns);
    const columnStatus = useAppSelector(state => state.columns.status);

    const modalRightPanelScrollRef = useRef<HTMLDivElement>(null);
    const modalLeftPanelInnerRef = useRef<HTMLDivElement>(null);

    const { scrollEvents } = useGanttScroll(modalRightPanelScrollRef);
    
    // Modal ilk açıldığında scroll yapılıp yapılmadığını takip et
    const hasInitialScrolled = useRef(false);

    // Modal kapandığında bu ref'i sıfırla
    useEffect(() => {
        if (!isOpen) {
            hasInitialScrolled.current = false;
        }
    }, [isOpen]);

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

    const {
        viewMinDate, viewMaxDate,
        currentDayWidth, currentLevel,
        scrollToDate,
        handleViewModeChange,
        handleZoomIn,
        handleZoomOut,
        handleAutoFit
    } = useGanttTimeline({
        projectDateRange,
        zoomIndex,
        onZoomIndexChange,
        rightPanelScrollRef: modalRightPanelScrollRef
    });

    const modalDebouncedLoadMore = useCallback(() => { }, []);
    const {
        handleScroll: modalHandleScroll,
        handleLeftPanelWheel: modalHandleLeftPanelWheel
    } = usePanelSync(
        modalDebouncedLoadMore,
        modalLeftPanelInnerRef,
        modalRightPanelScrollRef
    );

    // --- MODAL AÇILIŞI (Senkronizasyon) ---
    useEffect(() => {
        if (isOpen && !hasInitialScrolled.current) {
            const targetDate = initialDate || new Date();

            // Modal animasyonu bitip DOM oturunca tek bir sefer scroll yap
            const timer = setTimeout(() => {
                // 'auto' kullanıyoruz ki modal açılır açılmaz kullanıcı animasyon görmesin
                scrollToDate(targetDate, 'center', 'auto');
                hasInitialScrolled.current = true;
            }, 100);

            return () => clearTimeout(timer);
        }
    }, [isOpen, scrollToDate, initialDate]);

    const handleToggleLeftPanel = useCallback(() => {
        setIsLeftPanelOpen(prev => !prev);
    }, []);

    const handleItemMouseEnter = useCallback((itemId: number) => setHoveredItemId(itemId), []);
    const handleItemMouseLeave = useCallback(() => setHoveredItemId(null), []);

    if (columnStatus !== 'succeeded') {
        return <Modal isOpen={isOpen} onClose={onClose} title="Yükleniyor..."><div className="p-4">Gantt verisi yükleniyor...</div></Modal>;
    }
    if (activeTimelineIds.length === 0) {
        return <Modal isOpen={isOpen} onClose={onClose} title="Hata"><div className="p-4">Timeline sütunu bulunamadı.</div></Modal>;
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title=""
            size="9xl"
            disableContentScroll={true}
        >
            <div className="flex flex-col h-[calc(100vh-6rem)] w-full bg-white">
                <div className="flex-shrink-0 pt-6 pb-0 px-4">
                    <GanttToolbar
                        scrollToDate={scrollToDate}
                        currentLevel={currentLevel as ViewModeOption}
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

                <div className="flex-1 flex w-full relative overflow-hidden">
                    <div className={`flex-1 h-full flex w-full relative transition-all duration-300 ${isSettingsOpen ? 'max-w-[calc(100%-400px)]' : 'max-w-full'}`}>
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
                                    onToggleGroup={onToggleGroup}
                                    hoveredItemId={hoveredItemId}
                                    columns={allColumns}
                                    activeTimelineIds={activeTimelineIds}

                                />
                            </div>
                        </div>

                        <div className="flex-shrink-0 w-px bg-gray-200 relative z-20">
                            <button
                                onClick={handleToggleLeftPanel}
                                className="absolute top-1/2 -left-3 w-7 h-7 bg-white border border-gray-300 rounded-full shadow-md flex items-center justify-center text-gray-500 hover:text-gray-900 focus:outline-none"
                                style={{ transform: 'translateY(-50%)' }}
                            >
                                {isLeftPanelOpen ? <FiChevronLeft size={18} /> : <FiChevronRight size={18} />}
                            </button>
                        </div>

                        <div
                            ref={modalRightPanelScrollRef}
                            className="flex-1 w-full overflow-x-auto overflow-y-auto min-h-0 pb-12 cursor-grab"
                            onScroll={modalHandleScroll}
                            onMouseDown={scrollEvents.onMouseDown}
                            style={scrollEvents.style}
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
                                activeBaselineId={activeBaselineId}
                                scrollContainerRef={modalRightPanelScrollRef}
                                onItemClick={() => { }}
                                onMouseEnterBar={handleItemMouseEnter}
                                onMouseLeaveBar={handleItemMouseLeave}
                                showCriticalPath={showCriticalPath}
                            />
                        </div>
                    </div>

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
                                activeBaselineId={activeBaselineId}
                                onBaselineChange={onBaselineChange}
                                onCreateBaseline={onCreateBaseline}
                                onDeleteBaseline={onDeleteBaseline || (() => { })}
                                showCriticalPath={showCriticalPath}
                                onToggleCriticalPath={onToggleCriticalPath}
                            />
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default GanttBaselineModal;