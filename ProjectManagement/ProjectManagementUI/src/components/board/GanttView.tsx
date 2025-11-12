import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { ColumnType, type Group, type Item } from '../../types';

// Redux slice'larımızdan selector'ları import ediyoruz
import { selectAllGroups } from '../../store/features/groupSlice';
import { selectAllItemsFlat } from '../../store/features/itemSlice';
import { selectAllColumns } from '../../store/features/columnSlice';
import { selectSelectedBoard } from '../../store/features/boardSlice';

// Child component'leri import ediyoruz
import GanttToolbar from '../gantt/GanttToolbar';
import GanttLeftPanel from '../gantt/GanttLeftPanel';
import GanttRightPanel from '../gantt/GanttRightPanel';

// date-fns
import { isValid, parseISO } from 'date-fns';

// Constants
import {  MAX_ZOOM_INDEX, GANTT_ROW_HEIGHT_PX } from '../common/constants';

// Modallar
import GanttBaselineModal from '../gantt/GanttBaselineModal';
import ItemDetailModal from '../item/ItemDetailModal';

// Custom Hooks
import { useGanttSettings } from '../../hooks/useGanttSettings';
import { useGanttTimeline } from '../../hooks/useGanttTimeline';
import { usePanelSync } from '../../hooks/usePanelSync'; // 'hooks' klasöründen

// İkonlar
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

// --- LOKAL SABİTLER (Kullanıcı isteği üzerine) ---
const STATUS_OPTIONS_CONFIG = [
    { id: 0, text: 'Yapılıyor', color: '#C2410C' },
    { id: 1, text: 'Tamamlandı', color: '#047857' },
    { id: 2, text: 'Takıldı', color: '#B91C1C' },
    { id: 3, text: 'Beklemede', color: '#1D4ED8' },
    { id: 4, text: 'Belirsiz', color: '#374151' },
];
const STATUS_CONFIG_MAP = new Map(STATUS_OPTIONS_CONFIG.map(opt => [opt.text, opt]));
const DEFAULT_STATUS_CONFIG = STATUS_CONFIG_MAP.get('Belirsiz')!;
// --- SABİTLER SONU ---

// Props Arayüzleri
interface GanttViewProps {
    boardId: number;
    viewId: number;
    settingsJson: string | null | undefined;
    zoomIndex: number;
    onZoomIndexChange: (index: number) => void;
}

const GanttView: React.FC<GanttViewProps> = ({
    boardId,
    viewId,
    settingsJson,
    zoomIndex,
    onZoomIndexChange
}) => {
    // --- 1. VERİ SEÇİMİ (Redux) ---
    const dispatch = useAppDispatch();
    const allGroups = useAppSelector(selectAllGroups);
    const allItems = useAppSelector(selectAllItemsFlat);
    const allColumns = useAppSelector(selectAllColumns);
    const columnStatus = useAppSelector(state => state.columns.status);
    const selectedBoard = useAppSelector(selectSelectedBoard);

    // --- 2. AYAR YÖNETİMİ (Custom Hook) ---
    const { settingsState, settingsHandlers } = useGanttSettings(
        settingsJson,
        boardId,
        viewId,
        allColumns,
        columnStatus
    );
    const {
        activeTimelineIds, groupByColumnId, colorByColumnId, labelById,
        setActiveTimelineIds, setGroupByColumnId, setColorByColumnId, setLabelById
    } = settingsState;

    // --- 3. REF'LER (Hook'lardan önce tanımlanmalı) ---
    const rightPanelScrollRef = useRef<HTMLDivElement>(null);
    const leftPanelInnerRef = useRef<HTMLDivElement>(null);
    const totalHeightRef = useRef(0);

    // --- 4. VERİ İŞLEME (useMemo) ---
    // (Timeline hook'unun ihtiyaç duyduğu projectDateRange)
    const projectDateRange = useMemo(() => {
        const primaryTimelineId = activeTimelineIds.length > 0 ? activeTimelineIds[0] : null;
        if (!primaryTimelineId || allItems.length === 0) return { minDate: null, maxDate: null };
        let minDate: Date | null = null, maxDate: Date | null = null;
        for (const item of allItems) {
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
                    } catch (e) {}
                }
            }
        }
        return { minDate, maxDate };
    }, [allItems, activeTimelineIds]);
    
    // --- 5. ZAMAN ÇİZELGESİ YÖNETİMİ (Custom Hook) ---
    // (Artık ref'ler ve projectDateRange tanımlandıktan *sonra* çağrılıyor)
    const { 
        viewMinDate, viewMaxDate, setViewMinDate, setViewMaxDate,
        currentDayWidth, currentLevelLabel,
        debouncedLoadMore, timelineHandlers 
    } = useGanttTimeline({
        projectDateRange,
        zoomIndex, 
        onZoomIndexChange, 
        rightPanelScrollRef // Artık tanımlı
    });

    // --- 6. PANEL SENKRONİZASYONU (Custom Hook) ---
    // (Artık ref'ler ve debouncedLoadMore tanımlandıktan *sonra* çağrılıyor)
    const { 
        handleScroll, 
        handleLeftPanelWheel 
    } = usePanelSync(debouncedLoadMore);

    // --- 7. LOKAL UI STATE'LERİ ---
    const [collapsedGroupIds, setCollapsedGroupIds] = useState<Set<number>>(new Set());
    const [isWidgetModalOpen, setIsWidgetModalOpen] = useState(false);
    const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
    const [hoveredItemId, setHoveredItemId] = useState<number | null>(null);
    const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);

    // --- 8. VERİ DÖNÜŞTÜRME (useMemo) ---
    // (Panellerin ihtiyaç duyduğu displayData)
    const displayData = useMemo(() => {
        if (!groupByColumnId) {
            return { groups: allGroups, items: allItems };
        }
        const groupingColumn = allColumns.find(c => c.id === groupByColumnId);
        if (groupingColumn && groupingColumn.type === ColumnType.Status) {
            const displayGroups: Group[] = STATUS_OPTIONS_CONFIG.map((config, index) => ({
                id: config.id,
                title: config.text,
                color: config.color,
                boardId: boardId,
                order: index
            }));
            const displayItems: Item[] = allItems.map(item => {
                const itemValue = item.itemValues.find(v => v.columnId === groupByColumnId)?.value;
                const config = STATUS_CONFIG_MAP.get(itemValue || '') || DEFAULT_STATUS_CONFIG;
                return { ...item, groupId: config.id };
            });
            return { groups: displayGroups, items: displayItems };
        }
        return { groups: allGroups, items: allItems };
    }, [groupByColumnId, allGroups, allItems, allColumns, boardId]);

    // (Modal için seçili item/grup)
    const selectedItem = useMemo(() => selectedItemId ? allItems.find(i => i.id === selectedItemId) || null : null, [selectedItemId, allItems]);
    const selectedGroup = useMemo(() => selectedItem ? displayData.groups.find(g => g.id === selectedItem.groupId) || null : null, [selectedItem, displayData.groups]);

    // (Toplam yükseklik hesabı)
    const maxRowIndex = useMemo(() => {
        const visibleGroups = displayData.groups.filter(g => !collapsedGroupIds.has(g.id));
        let count = 0;
        visibleGroups.forEach(g => { count++; count += displayData.items.filter(i => i.groupId === g.id).length; });
        return count > 0 ? count - 1 : 0;
    }, [displayData.groups, displayData.items, collapsedGroupIds]);
    
    useEffect(() => {
        totalHeightRef.current = (maxRowIndex + 1) * GANTT_ROW_HEIGHT_PX;
    }, [maxRowIndex]);

    // --- 9. LOKAL HANDLER'LAR ---
    const handleToggleGroup = useCallback((groupId: number) => {
        setCollapsedGroupIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(groupId)) newSet.delete(groupId);
            else newSet.add(groupId);
            return newSet;
        });
    }, []);
    const handleItemClick = useCallback((itemId: number) => setSelectedItemId(itemId), []);
    const handleCloseModal = () => {
        setIsWidgetModalOpen(false);
        setSelectedItemId(null);
    };
    const handleToggleLeftPanel = useCallback(() => setIsLeftPanelOpen(prev => !prev), []);
    const handleOpenWidgetModal = () => setIsWidgetModalOpen(true);
    
    // --- 10. YÜKLENME/HATA DURUMLARI ---
    const isLoading = columnStatus !== 'succeeded' || allGroups.length === 0;
    if (isLoading) {
        return <div className="p-4 text-center">Gantt Şeması Yükleniyor...</div>;
    }
    if (activeTimelineIds.length === 0) {
        return <div className="p-4 text-center text-red-600">Hata: Bu panoda 'Timeline' tipinde bir sütun bulunamadı. Lütfen ekleyin.</div>;
    }

    // --- RENDER ---
    return (
        <div className="flex flex-col h-full w-full border border-gray-200 rounded-lg shadow-sm overflow-hidden bg-white relative">
            <GanttToolbar
                scrollToDate={timelineHandlers.scrollToDate}
                currentLevelLabel={currentLevelLabel}
                onViewModeChange={timelineHandlers.handleViewModeChange}
                onZoomIn={timelineHandlers.handleZoomIn}
                onZoomOut={timelineHandlers.handleZoomOut}
                zoomIndex={zoomIndex}
                maxZoomIndex={MAX_ZOOM_INDEX}
                onSettingsClick={handleOpenWidgetModal}
                onAutoFit={timelineHandlers.handleAutoFit}
                isSettingsOpen={isWidgetModalOpen}
            />

            <div className="flex-1 flex w-full relative overflow-hidden">
                <div className={`flex-shrink-0 transition-all duration-300 ease-in-out overflow-hidden ${isLeftPanelOpen ? 'w-[400px]' : 'w-0'} relative`}>
                    <div
                        className="w-[400px] h-full overflow-y-hidden overflow-x-hidden border-r"
                        onWheel={(e) => handleLeftPanelWheel(e.deltaY)}
                    >
                        <GanttLeftPanel
                            innerRef={leftPanelInnerRef}
                            // GÜNCELLEME: 'onWheel' prop'u artık GanttLeftPanelProps'ta '?' (opsiyonel) olmalı.
                            // onWheel={() => {}} // Ya da bu şekilde boş fonksiyon geçin.
                            groups={displayData.groups}
                            items={displayData.items}
                            collapsedGroupIds={collapsedGroupIds}
                            onToggleGroup={handleToggleGroup}
                            onItemClick={handleItemClick}
                            hoveredItemId={hoveredItemId}
                        />
                    </div>
                </div>

                <div className="flex-shrink-0 w-px bg-gray-200 relative z-20">
                    <button
                        onClick={handleToggleLeftPanel}
                        className="absolute top-1/2 -left-3 w-7 h-7 bg-white border border-gray-300 rounded-full shadow-md flex items-center justify-center text-gray-500 hover:text-gray-900 focus:outline-none"
                        style={{ transform: 'translateY(-50%)' }}
                        title={isLeftPanelOpen ? "Paneli daralt" : "Paneli genişlet"}
                    >
                        {isLeftPanelOpen ? <FiChevronLeft size={18} /> : <FiChevronRight size={18} />}
                    </button>
                </div>
                
                <div
                    ref={rightPanelScrollRef}
                    className="flex-1 w-full overflow-auto"
                    onScroll={handleScroll}
                >
                    <GanttRightPanel
                        groups={displayData.groups}
                        items={displayData.items}
                        columns={allColumns}
                        activeTimelineIds={activeTimelineIds}
                        colorByColumnId={colorByColumnId}
                        labelById={labelById}
                        viewMinDate={viewMinDate}
                        viewMaxDate={viewMaxDate}
                        collapsedGroupIds={collapsedGroupIds}
                        dayWidthPx={currentDayWidth}
                        onItemClick={handleItemClick}
                        onMouseEnterBar={setHoveredItemId}
                        onMouseLeaveBar={() => setHoveredItemId(null)}
                    />
                </div>
            </div>
            
            {boardId && (
                <GanttBaselineModal
                    isOpen={isWidgetModalOpen}
                    onClose={handleCloseModal}
                    boardId={boardId}
                    initialOpenSection={null}
                    groups={displayData.groups}
                    items={displayData.items}
                    activeTimelineIds={activeTimelineIds}
                    onTimelineColumnChange={(ids) => {
                        setActiveTimelineIds(ids);
                        settingsHandlers.handleTimelineColumnChange(ids);
                    }}
                    groupByColumnId={groupByColumnId}
                    onGroupByColumnChange={(id) => {
                        setGroupByColumnId(id);
                        settingsHandlers.handleGroupByColumnChange(id);
                    }}
                    colorByColumnId={colorByColumnId}
                    onColorByColumnChange={(id) => {
                        setColorByColumnId(id);
                        settingsHandlers.handleColorByColumnChange(id);
                    }}
                    labelById={labelById}
                    onLabelByChange={(id) => {
                        setLabelById(id);
                        settingsHandlers.handleLabelByChange(id);
                    }}
                    zoomIndex={zoomIndex}
                    setZoomIndex={onZoomIndexChange} 
                    viewMinDate={viewMinDate}
                    setViewMinDate={setViewMinDate}
                    viewMaxDate={viewMaxDate}
                    setViewMaxDate={setViewMaxDate}
                    collapsedGroupIds={collapsedGroupIds}
                    setCollapsedGroupIds={setCollapsedGroupIds}
                    hoveredItemId={hoveredItemId}
                    setHoveredItemId={setHoveredItemId}
                    isLeftPanelOpen={isLeftPanelOpen}
                    setIsLeftPanelOpen={setIsLeftPanelOpen}
                />
            )}

            {selectedItem && (
                <ItemDetailModal
                    isOpen={selectedItemId !== null}
                    onClose={handleCloseModal}
                    item={selectedItem}
                    group={selectedGroup}
                    columns={allColumns}
                    // GÜNCELLEME: Null kontrolü eklendi
                    boardName={selectedBoard?.name || 'Pano'}
                    allItems={allItems}
                />
            )}
        </div>
    );
};

export default GanttView;
