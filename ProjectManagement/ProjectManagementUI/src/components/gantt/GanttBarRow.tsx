import React from 'react';
import { format } from 'date-fns';
import { type ProcessedItemData, type BarTimelineData } from './GanttArrows';
import {
    GANTT_ROW_HEIGHT_PX,
    GANTT_BAR_TOP_OFFSET_PX
} from '../common/constants';

// Sabitler
const RESIZE_HANDLE_WIDTH_PX = 8;

// Tip Tanımları
type ResizeSide = 'start' | 'end';

interface GanttBarRowProps {
    itemData: ProcessedItemData;
    originalItemData: ProcessedItemData;
    isActive: boolean;
    // YENİ PROP: Sadece sürükleme/boyutlandırma durumunu kontrol eder
    isDragging: boolean; 
    onBarMouseDown: (event: React.MouseEvent, itemData: ProcessedItemData, timelineColumnId: number) => void;
    onResizeHandleMouseDown: (
        event: React.MouseEvent,
        itemData: ProcessedItemData,
        side: ResizeSide,
        timelineColumnId: number
    ) => void;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
}

const _GanttBarRow: React.FC<GanttBarRowProps> = ({
    itemData,
    originalItemData,
    isActive,     // Bu hem hover hem drag için true olabilir (görsel highlight için)
    isDragging,   // Bu SADECE drag/resize anında true olur (etiketler için)
    onBarMouseDown,
    onResizeHandleMouseDown,
    onMouseEnter,
    onMouseLeave,
}) => {
    const { barData, visualOnlyBars } = itemData;
    const { barData: originalBarData, visualOnlyBars: originalVisualBars } = originalItemData;

    const baseTop = itemData.rowIndex * GANTT_ROW_HEIGHT_PX;

    // Badge'leri render eden yardımcı fonksiyon
    const renderDateBadges = (bar: BarTimelineData, top: number) => {
        // DÜZELTME: Sadece 'isDragging' true ise render et (hover'da görünmez)
        if (!isDragging) return null;

        if (!bar.startDate || !bar.endDate) return null;

        const formattedStart = format(bar.startDate, 'dd.MM.yyyy');
        
        // DÜZELTME: 1 gün çıkarma işlemi İPTAL EDİLDİ. Doğrudan tarihi göster.
        const formattedEnd = format(bar.endDate, 'dd.MM.yyyy');
        
        const badgeOffset = 22; 
        const baseBadgeStyle = "absolute -translate-x-1/2 px-2 py-0.5 rounded bg-gray-100 text-black text-[10px] font-semibold shadow-sm pointer-events-none z-[20]";

        return (
            <React.Fragment>
                {/* Başlangıç Tarihi */}
                <div
                    className={baseBadgeStyle}
                    style={{
                        top: `${top - badgeOffset}px`,
                        left: `${bar.startX}px`,
                        whiteSpace: 'nowrap'
                    }}
                >
                    {formattedStart}
                    <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-gray-100"></div>
                </div>

                {/* Bitiş Tarihi */}
                <div
                    className={baseBadgeStyle}
                    style={{
                        top: `${top - badgeOffset}px`,
                        left: `${bar.endX}px`, // Tam bitiş noktası
                        whiteSpace: 'nowrap'
                    }}
                >
                    {formattedEnd}
                    <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-gray-100"></div>
                </div>
            </React.Fragment>
        );
    };

    return (
        <React.Fragment>
            {/* 1. BİRİNCİL BAR */}
            {barData && (
                <React.Fragment>
                    <div
                        key={itemData.item.id}
                        onMouseEnter={onMouseEnter}
                        onMouseLeave={onMouseLeave}
                        onMouseDown={(e) => onBarMouseDown(e, itemData, barData.timelineColumnId)}
                        className={`rounded text-white text-xs px-2 flex items-center overflow-hidden absolute cursor-grab group ${barData.colorClass} ${isActive ? 'opacity-90 ring-2 ring-blue-500 shadow-lg' : 'hover:opacity-90 transition-opacity duration-150'}`}
                        style={{
                            ...barData.style,
                            position: 'absolute',
                            top: `${baseTop + GANTT_BAR_TOP_OFFSET_PX}px`,
                            zIndex: isActive ? 12 : 11,
                            transition: isActive ? 'none' : 'all 150ms ease',
                        }}
                        title={`${itemData.item.name} (${barData.timelineColumnTitle})`}
                    >
                        <div
                            data-resize-handle="start"
                            onMouseDown={(e) => onResizeHandleMouseDown(e, itemData, 'start', barData.timelineColumnId)}
                            className="absolute left-0 top-0 bottom-0 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-black bg-opacity-20 hover:bg-opacity-30 transition-opacity rounded-l"
                            style={{ width: `${RESIZE_HANDLE_WIDTH_PX}px`, zIndex: 13 }}
                        ></div>
                        <div
                            data-resize-handle="end"
                            onMouseDown={(e) => onResizeHandleMouseDown(e, itemData, 'end', barData.timelineColumnId)}
                            className="absolute right-0 top-0 bottom-0 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-black bg-opacity-20 hover:bg-opacity-30 transition-opacity rounded-r"
                            style={{ width: `${RESIZE_HANDLE_WIDTH_PX}px`, zIndex: 13 }}
                        ></div>
                    </div>

                    {/* Etiketler (Sadece isDragging true ise render olur) */}
                    {renderDateBadges(barData, baseTop + GANTT_BAR_TOP_OFFSET_PX)}
                </React.Fragment>
            )}

            {/* 1.1 SİLÜET */}
            {isDragging && originalBarData && barData && (originalBarData.startX !== barData.startX || originalBarData.endX !== barData.endX) && (
                <div
                    className="rounded border-2 border-dashed border-blue-400 bg-blue-50 absolute pointer-events-none"
                    style={{
                        ...originalBarData.style,
                        position: 'absolute',
                        top: `${baseTop + GANTT_BAR_TOP_OFFSET_PX}px`,
                        zIndex: 9,
                        opacity: 0.5,
                    }}
                />
            )}

            {/* 2. KOPYA BARLAR */}
            {visualOnlyBars.map((bar, index) => {
                const copyRowIndex = index + 1;
                const visualBarTop = (itemData.rowIndex + copyRowIndex) * GANTT_ROW_HEIGHT_PX + GANTT_BAR_TOP_OFFSET_PX;

                return (
                    <React.Fragment key={`${itemData.item.id}-visual-${index}`}>
                        <div
                            onMouseEnter={onMouseEnter}
                            onMouseLeave={onMouseLeave}
                            onMouseDown={(e) => onBarMouseDown(e, itemData, bar.timelineColumnId)}
                            className={`rounded text-white text-xs px-2 flex items-center overflow-hidden absolute cursor-grab group ${bar.colorClass} ${isActive ? 'opacity-90 ring-2 ring-blue-500 shadow-lg' : 'hover:opacity-90 transition-opacity duration-150'}`}
                            style={{
                                ...bar.style,
                                position: 'absolute',
                                top: `${visualBarTop}px`,
                                zIndex: isActive ? 12 : 11,
                                transition: isActive ? 'none' : 'all 150ms ease',
                            }}
                            title={`${itemData.item.name} (${bar.timelineColumnTitle})`}
                        >
                             <div
                                data-resize-handle="start"
                                onMouseDown={(e) => onResizeHandleMouseDown(e, itemData, 'start', bar.timelineColumnId)}
                                className="absolute left-0 top-0 bottom-0 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-black bg-opacity-20 hover:bg-opacity-30 rounded-l"
                                style={{ width: `${RESIZE_HANDLE_WIDTH_PX}px`, zIndex: 13 }}
                            ></div>
                            <div
                                data-resize-handle="end"
                                onMouseDown={(e) => onResizeHandleMouseDown(e, itemData, 'end', bar.timelineColumnId)}
                                className="absolute right-0 top-0 bottom-0 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-black bg-opacity-20 hover:bg-opacity-30 rounded-r"
                                style={{ width: `${RESIZE_HANDLE_WIDTH_PX}px`, zIndex: 13 }}
                            ></div>
                        </div>
                        {renderDateBadges(bar, visualBarTop)}
                    </React.Fragment>
                );
            })}

            {/* 2.1 KOPYA SİLÜETLER */}
            {isDragging && originalVisualBars.map((bar, index) => {
                const copyRowIndex = index + 1;
                const visualBarTop = (itemData.rowIndex + copyRowIndex) * GANTT_ROW_HEIGHT_PX + GANTT_BAR_TOP_OFFSET_PX;
                const previewBar = visualOnlyBars[index];
                if (!previewBar) return null;
                if (bar.startX === previewBar.startX && bar.endX === previewBar.endX) return null;

                return (
                    <div
                        key={`${itemData.item.id}-visual-silhouette-${index}`}
                        className="rounded border-2 border-dashed border-blue-400 bg-blue-50 absolute pointer-events-none"
                        style={{
                            ...bar.style,
                            position: 'absolute',
                            top: `${visualBarTop}px`,
                            zIndex: 9,
                            opacity: 0.5,
                        }}
                    />
                );
            })}

            {/* 3. DIŞ ETİKET */}
            {itemData.barData && itemData.externalLabel && (
                <div
                    className="absolute flex items-center px-3 text-xs text-gray-700 pointer-events-none truncate"
                    style={{
                        top: `${baseTop + GANTT_BAR_TOP_OFFSET_PX}px`,
                        left: `${itemData.barData.endX + 6}px`,
                        height: `${itemData.barData.style.height}`,
                        zIndex: 10,
                        whiteSpace: 'nowrap'
                    }}
                >
                    {itemData.externalLabel}
                </div>
            )}
        </React.Fragment>
    );
};

export default React.memo(_GanttBarRow);