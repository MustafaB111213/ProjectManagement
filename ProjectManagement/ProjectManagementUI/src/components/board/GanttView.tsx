// src/components/board/GanttView.tsx

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { ColumnType, type Group, type Item } from '../../types';
import { selectAllGroups } from '../../store/features/groupSlice';
import { selectAllItemsFlat } from '../../store/features/itemSlice';
import { selectAllColumns } from '../../store/features/columnSlice';
import { selectSelectedBoard } from '../../store/features/boardSlice';
import GanttToolbar, { type ViewModeOption } from '../gantt/GanttToolbar';
import GanttLeftPanel from '../gantt/GanttLeftPanel';
import GanttRightPanel from '../gantt/GanttRightPanel';
import { addDays, isValid, parseISO } from 'date-fns';
import { MAX_ZOOM_INDEX, GANTT_ROW_HEIGHT_PX } from '../common/constants';
import GanttBaselineModal from '../gantt/GanttBaselineModal';
import ItemDetailModal from '../item/ItemDetailModal';
import { useGanttSettings } from '../../hooks/useGanttSettings';
import { useGanttTimeline } from '../../hooks/useGanttTimeline';
import { usePanelSync } from '../../hooks/usePanelSync';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { sortItemsHierarchically, type ItemWithDepth } from '../../utils/hierarchyUtils';
import { useGanttScroll } from '../../hooks/useGanttScroll';

const STATUS_OPTIONS_CONFIG = [
    { id: 0, text: 'Yapılıyor', color: '#C2410C' },
    { id: 1, text: 'Tamamlandı', color: '#047857' },
    { id: 2, text: 'Takıldı', color: '#B91C1C' },
    { id: 3, text: 'Beklemede', color: '#1D4ED8' },
    { id: 3, text: 'Planlandı', color: '#b9d81dff' },
    { id: 4, text: 'Belirsiz', color: '#374151' },
];
const STATUS_CONFIG_MAP = new Map(STATUS_OPTIONS_CONFIG.map(opt => [opt.text, opt]));
const DEFAULT_STATUS_CONFIG = STATUS_CONFIG_MAP.get('Belirsiz')!;

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
    const dispatch = useAppDispatch();
    const allGroups = useAppSelector(selectAllGroups);
    const allItems = useAppSelector(selectAllItemsFlat);
    const allColumns = useAppSelector(selectAllColumns);
    const columnStatus = useAppSelector(state => state.columns.status);
    const selectedBoard = useAppSelector(selectSelectedBoard);

    // --- 2. AYAR YÖNETİMİ ---
    // 'allItems' parametresi eklendi (Baseline verilerini kopyalamak için gerekli)
    const { settingsState, settingsHandlers } = useGanttSettings(
        settingsJson, boardId, viewId, allColumns, columnStatus, allItems
    );

    const {
        activeTimelineIds, groupByColumnId, colorByColumnId, labelById, activeBaselineId,
        setActiveTimelineIds, setGroupByColumnId, setColorByColumnId, setLabelById, showCriticalPath,
        setShowCriticalPath
    } = settingsState;

    const { handleTimelineColumnChange,
        handleGroupByColumnChange,
        handleColorByColumnChange,
        handleLabelByChange,
        handleBaselineChange,
        handleCreateBaseline,
        handleDeleteBaseline,
        handleToggleCriticalPath
    } = settingsHandlers;

    const rightPanelScrollRef = useRef<HTMLDivElement>(null);
    const leftPanelInnerRef = useRef<HTMLDivElement>(null);
    const totalHeightRef = useRef(0);

    const { scrollEvents } = useGanttScroll(rightPanelScrollRef);
    
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
                    } catch (e) { }
                }
            }
        }
        return { minDate, maxDate };
    }, [allItems, activeTimelineIds]);

    const {
        viewMinDate, viewMaxDate, currentDayWidth, currentLevel,
        debouncedLoadMore,
        scrollToDate,
        handleViewModeChange,
        handleZoomIn,
        handleZoomOut,
        handleAutoFit
    } = useGanttTimeline({
        projectDateRange,
        zoomIndex,
        onZoomIndexChange,
        rightPanelScrollRef
    });

    const {
        handleScroll,
        handleLeftPanelWheel
    } = usePanelSync(debouncedLoadMore, leftPanelInnerRef, rightPanelScrollRef);

    const [collapsedGroupIds, setCollapsedGroupIds] = useState<Set<number>>(new Set());
    const [isWidgetModalOpen, setIsWidgetModalOpen] = useState(false);
    const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
    const [hoveredItemId, setHoveredItemId] = useState<number | null>(null);
    const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);

    // Modal için hesaplanan başlangıç tarihi state'i
    const [modalInitialDate, setModalInitialDate] = useState<Date>(new Date());
    const handleOpenWidgetModal = () => {
        // Modal açılmadan önce şu anki ekranın tam ortasındaki tarihi hesapla
        if (rightPanelScrollRef.current) {
            const scrollLeft = rightPanelScrollRef.current.scrollLeft;
            const offsetWidth = rightPanelScrollRef.current.offsetWidth;
            const centerPx = scrollLeft + (offsetWidth / 2);
            const daysFromMin = centerPx / currentDayWidth;

            const centerDate = addDays(viewMinDate, daysFromMin);
            setModalInitialDate(centerDate);
        }
        setIsWidgetModalOpen(true);
    };

    const displayData = useMemo(() => {
        let processedGroups = allGroups;
        let processedItems = allItems;

        // 1. Gruplama Filtresi (Varsa)
        if (groupByColumnId) {
            const groupingColumn = allColumns.find(c => c.id === groupByColumnId);
            if (groupingColumn && groupingColumn.type === ColumnType.Status) {
                processedGroups = STATUS_OPTIONS_CONFIG.map((config, index) => ({
                    id: config.id,
                    title: config.text,
                    color: config.color,
                    boardId: boardId,
                    order: index
                }));
                processedItems = allItems.map(item => {
                    const itemValue = item.itemValues.find(v => v.columnId === groupByColumnId)?.value;
                    const config = STATUS_CONFIG_MAP.get(itemValue || '') || DEFAULT_STATUS_CONFIG;
                    return { ...item, groupId: config.id };
                });
            }
        }

        // 2. HİYERARŞİK SIRALAMA (YENİ ADIM)
        // Her grup içindeki itemları kendi içinde ağaç yapısına göre sırala
        // ve düz bir liste haline getir (depth bilgisi ekleyerek).

        // Önce itemları grup ID'sine göre ayır
        const itemsByGroup: Record<number, Item[]> = {};
        processedItems.forEach(item => {
            if (!itemsByGroup[item.groupId]) itemsByGroup[item.groupId] = [];
            itemsByGroup[item.groupId].push(item);
        });

        const sortedHierarchicalItems: ItemWithDepth[] = [];

        // Grupların sırasına göre gez
        processedGroups.forEach(group => {
            const groupItems = itemsByGroup[group.id] || [];
            if (groupItems.length > 0) {
                // Bu grup içindeki itemları hiyerarşik sırala
                const sortedGroupItems = sortItemsHierarchically(groupItems);
                sortedHierarchicalItems.push(...sortedGroupItems);
            }
        });

        return { groups: processedGroups, items: sortedHierarchicalItems };
    }, [groupByColumnId, allGroups, allItems, allColumns, boardId]);

    const selectedItem = useMemo(() => selectedItemId ? allItems.find(i => i.id === selectedItemId) || null : null, [selectedItemId, allItems]);
    const selectedGroup = useMemo(() => selectedItem ? displayData.groups.find(g => g.id === selectedItem.groupId) || null : null, [selectedItem, displayData.groups]);

    const maxRowIndex = useMemo(() => {
        const visibleGroups = displayData.groups.filter(g => !collapsedGroupIds.has(g.id));
        let count = 0;
        visibleGroups.forEach(g => { count++; count += displayData.items.filter(i => i.groupId === g.id).length; });
        return count > 0 ? count - 1 : 0;
    }, [displayData.groups, displayData.items, collapsedGroupIds]);

    useEffect(() => {
        totalHeightRef.current = (maxRowIndex + 1) * GANTT_ROW_HEIGHT_PX;
    }, [maxRowIndex]);

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
    const isLoading = columnStatus !== 'succeeded' || allGroups.length === 0;
    if (isLoading) {
        return <div className="p-4 text-center">Gantt Şeması Yükleniyor...</div>;
    }
    if (activeTimelineIds.length === 0) {
        return <div className="p-4 text-center text-red-600">Hata: Bu panoda 'Timeline' tipinde bir sütun bulunamadı. Lütfen ekleyin.</div>;
    }

    return (
        <div className="flex flex-col h-full w-full border border-gray-500 rounded-lg shadow-sm overflow-hidden bg-white relative">
            <GanttToolbar
                scrollToDate={scrollToDate}
                currentLevel={currentLevel as ViewModeOption}
                onViewModeChange={handleViewModeChange}
                onZoomIn={handleZoomIn}
                onZoomOut={handleZoomOut}
                zoomIndex={zoomIndex}
                maxZoomIndex={MAX_ZOOM_INDEX}
                onSettingsClick={handleOpenWidgetModal}
                onAutoFit={handleAutoFit}
                isSettingsOpen={isWidgetModalOpen}
            />

            <div className="flex-1 flex w-full relative overflow-hidden">
                <div className={`flex-shrink-0 transition-all duration-300 ease-in-out overflow-hidden ${isLeftPanelOpen ? 'w-[420px]' : 'w-0'} relative`}>
                    <div
                        className="w-[426px] h-full overflow-y-hidden overflow-x-hidden border-r"
                        onWheel={(e) => handleLeftPanelWheel(e.deltaY)}
                    >
                        <GanttLeftPanel
                            innerRef={leftPanelInnerRef}
                            groups={displayData.groups}
                            items={displayData.items}
                            collapsedGroupIds={collapsedGroupIds}
                            onToggleGroup={handleToggleGroup}
                            onItemClick={handleItemClick}
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
                        title={isLeftPanelOpen ? "Paneli daralt" : "Paneli genişlet"}
                    >
                        {isLeftPanelOpen ? <FiChevronLeft size={18} /> : <FiChevronRight size={18} />}
                    </button>
                </div>

                <div
                    ref={rightPanelScrollRef}
                    className="flex-1 w-full overflow-auto cursor-grab"
                    onScroll={handleScroll}
                    onMouseDown={scrollEvents.onMouseDown}
                    style={scrollEvents.style}
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
                        scrollContainerRef={rightPanelScrollRef}
                        onItemClick={handleItemClick}
                        onMouseEnterBar={setHoveredItemId}
                        onMouseLeaveBar={() => setHoveredItemId(null)}
                        activeBaselineId={activeBaselineId}
                        showCriticalPath={showCriticalPath}
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

                    // Ayarlar ve Handler'lar
                    activeTimelineIds={activeTimelineIds}
                    onTimelineColumnChange={(ids) => {
                        setActiveTimelineIds(ids);
                        handleTimelineColumnChange(ids);
                    }}
                    groupByColumnId={groupByColumnId}
                    onGroupByColumnChange={(id) => {
                        setGroupByColumnId(id);
                        handleGroupByColumnChange(id);
                    }}
                    colorByColumnId={colorByColumnId}
                    onColorByColumnChange={(id) => {
                        setColorByColumnId(id);
                        handleColorByColumnChange(id);
                    }}
                    labelById={labelById}
                    onLabelByChange={(id) => {
                        setLabelById(id);
                        handleLabelByChange(id);
                    }}

                    // Baseline Ayarları
                    activeBaselineId={activeBaselineId}
                    onBaselineChange={handleBaselineChange}
                    onCreateBaseline={handleCreateBaseline}
                    onDeleteBaseline={handleDeleteBaseline}

                    // --- SENKRONİZASYON AYARLARI (DEĞİŞEN KISIM) ---

                    // 1. Zoom Senkronizasyonu: Artık initial değil, canlı prop
                    zoomIndex={zoomIndex}
                    onZoomIndexChange={onZoomIndexChange}

                    // 2. Grup Aç/Kapa Senkronizasyonu
                    collapsedGroupIds={collapsedGroupIds}
                    onToggleGroup={handleToggleGroup}

                    // 3. Scroll Pozisyonu (Tarih)
                    initialDate={modalInitialDate}
                    showCriticalPath={showCriticalPath}
                    onToggleCriticalPath={handleToggleCriticalPath}
                />
            )}

            {selectedItem && (
                <ItemDetailModal
                    isOpen={selectedItemId !== null}
                    onClose={handleCloseModal}
                    item={selectedItem}
                    group={selectedGroup}
                    columns={allColumns}
                    boardName={selectedBoard?.name || 'Pano'}
                    allItems={allItems}
                />
            )}
        </div>
    );
};

export default GanttView;