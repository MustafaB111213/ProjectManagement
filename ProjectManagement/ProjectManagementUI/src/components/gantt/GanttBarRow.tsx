// src/components/gantt/GanttBarRow.tsx

import React from 'react';
import { format } from 'date-fns';
import { type ProcessedItemData, type BarTimelineData } from './GanttArrows';
import {
    GANTT_ROW_HEIGHT_PX,
    GANTT_BAR_TOP_OFFSET_PX,
    GANTT_BAR_HEIGHT_PX
} from '../common/constants';

// Sabitler
const RESIZE_HANDLE_WIDTH_PX = 8;
const BASELINE_HEIGHT_PX = 8; 
const BASELINE_CENTER_OFFSET = (GANTT_BAR_HEIGHT_PX - BASELINE_HEIGHT_PX) / 20;
const MIN_BASELINE_WIDTH_PX = 16;

interface GanttBarRowProps {
    itemData: ProcessedItemData;
    originalItemData: ProcessedItemData;
    isActive: boolean;
    isDragging: boolean;
    onBarMouseDown: (event: React.MouseEvent, itemData: ProcessedItemData, timelineColumnId: number) => void;
    onResizeHandleMouseDown: (
        event: React.MouseEvent,
        itemData: ProcessedItemData,
        side: 'start' | 'end',
        timelineColumnId: number
    ) => void;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
    isCritical?: boolean;
}

const _GanttBarRow: React.FC<GanttBarRowProps> = ({
    itemData,
    originalItemData,
    isActive,
    isDragging,
    onBarMouseDown,
    onResizeHandleMouseDown,
    onMouseEnter,
    onMouseLeave,
    isCritical = false
}) => {
    const { barData, visualOnlyBars, baselineBarData } = itemData;
    const { barData: originalBarData } = originalItemData;

    const baseTop = itemData.rowIndex * GANTT_ROW_HEIGHT_PX;
    
    // 🔴 GÖRSEL KİLİT KONTROLÜ
    // Bar rengi "bg-green-500" ise (Tamamlandı rengi), kilitli görseli göster.
    // Not: Bu basit bir kontrol, daha sağlam olması için itemData içine 'status' geçilebilir.
    // Ancak `GanttRightPanel.tsx` dosyasında `STATUS_COLORS['Tamamlandı']` kullandığımız için
    // class ismi tutarlı olacaktır.
    const isCompleted = barData?.colorClass.includes('bg-green-500');

    // Tamamlandıysa 'cursor-not-allowed', değilse 'cursor-grab'
    const cursorClass = isCompleted ? 'cursor-not-allowed' : 'cursor-grab';

    const criticalClass = isCritical 
        ? 'ring-2 ring-red-500 ring-offset-1 shadow-[0_0_10px_rgba(239,68,68,0.6)] z-[15]' 
        : '';

    const renderDateBadges = (bar: BarTimelineData, top: number) => {
        if (!isDragging) return null;
        if (!bar.startDate || !bar.endDate) return null;

        const formattedStart = format(bar.startDate, 'dd.MM.yyyy');
        const formattedEnd = format(bar.endDate, 'dd.MM.yyyy');
        const badgeOffset = 22;
        const baseBadgeStyle = "absolute -translate-x-1/2 px-2 py-0.5 rounded bg-gray-800 text-white text-[10px] font-semibold shadow-sm pointer-events-none z-[30]";

        return (
            <React.Fragment>
                <div className={baseBadgeStyle} style={{ top: `${top - badgeOffset}px`, left: `${bar.startX}px`, whiteSpace: 'nowrap' }}>
                    {formattedStart}
                    <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-gray-800"></div>
                </div>
                <div className={baseBadgeStyle} style={{ top: `${top - badgeOffset}px`, left: `${bar.endX}px`, whiteSpace: 'nowrap' }}>
                    {formattedEnd}
                    <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-gray-800"></div>
                </div>
            </React.Fragment>
        );
    };

    return (
        <React.Fragment>

            {/* 1. BİRİNCİL BAR (Normal Görev) */}
            {barData && (
                <React.Fragment>
                    <div
                        key={itemData.item.id}
                        onMouseEnter={onMouseEnter}
                        onMouseLeave={onMouseLeave}
                        onMouseDown={(e) => onBarMouseDown(e, itemData, barData.timelineColumnId)}
                        // 🔴 ClassName Güncellendi: `cursorClass` eklendi
                        className={`rounded text-white text-xs px-2 flex items-center ${criticalClass} overflow-hidden absolute ${cursorClass} group ${barData.colorClass} ${isActive ? 'opacity-90 ring-2 ring-blue-500 shadow-lg' : 'hover:opacity-90 transition-opacity duration-150'}`}
                        style={{
                            ...barData.style,
                            position: 'absolute',
                            top: `${baseTop + GANTT_BAR_TOP_OFFSET_PX}px`,
                            zIndex: isActive ? 12 : 11,
                            transition: isActive ? 'none' : 'all 150ms ease',
                        }}
                        title={`${itemData.item.name} (${barData.timelineColumnTitle}) ${isCompleted ? '[KİLİTLİ - TAMAMLANDI]' : ''}`}
                    >
                        {/* Resize handle'ları sadece tamamlanmamışsa göster */}
                        {!isCompleted && (
                            <>
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
                            </>
                        )}
                    </div>
                    {renderDateBadges(barData, baseTop + GANTT_BAR_TOP_OFFSET_PX)}
                </React.Fragment>
            )}

            {/* 0. TEMEL ÇİZGİ (BASELINE) */}
            {baselineBarData && (
                <div
                    className="absolute rounded-full pointer-events-none border border-gray-600 shadow-sm"
                    style={{
                        left: `${baselineBarData.startX}px`,
                        width: `${Math.max(MIN_BASELINE_WIDTH_PX, baselineBarData.endX - baselineBarData.startX)}px`,
                        top: `${baseTop + GANTT_BAR_TOP_OFFSET_PX + BASELINE_CENTER_OFFSET}px`,
                        height: `${BASELINE_HEIGHT_PX}px`,
                        zIndex: 12,
                        backgroundColor: '#4e3694ff',
                        opacity: 0.85,
                        minWidth: `${MIN_BASELINE_WIDTH_PX}px`
                    }}
                    title={`Temel Çizgi: ${format(baselineBarData.startDate, 'dd MMM')} - ${format(baselineBarData.endDate, 'dd MMM')}`}
                />
            )}

            {/* 1.1 SİLÜET (Sürükleme Hayaleti) */}
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
                // Kopya barlar için de aynı kontrol (Genellikle kopyalar ana bara bağlıdır)
                const isCopyCompleted = bar.colorClass.includes('bg-green-500');
                const copyCursor = isCopyCompleted ? 'cursor-not-allowed' : 'cursor-grab';

                return (
                    <React.Fragment key={`${itemData.item.id}-visual-${index}`}>
                        <div
                            onMouseEnter={onMouseEnter}
                            onMouseLeave={onMouseLeave}
                            onMouseDown={(e) => onBarMouseDown(e, itemData, bar.timelineColumnId)}
                            className={`rounded text-white text-xs px-2 flex items-center overflow-hidden absolute ${copyCursor} group ${bar.colorClass} ${isActive ? 'opacity-90 ring-2 ring-blue-500 shadow-lg' : 'hover:opacity-90 transition-opacity duration-150'}`}
                            style={{
                                ...bar.style,
                                position: 'absolute',
                                top: `${visualBarTop}px`,
                                zIndex: isActive ? 12 : 11,
                                transition: isActive ? 'none' : 'all 150ms ease',
                            }}
                        >
                            {!isCopyCompleted && (
                                <>
                                    <div data-resize-handle="start" onMouseDown={(e) => onResizeHandleMouseDown(e, itemData, 'start', bar.timelineColumnId)} className="absolute left-0 top-0 bottom-0 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-black bg-opacity-20 hover:bg-opacity-30 rounded-l" style={{ width: `${RESIZE_HANDLE_WIDTH_PX}px`, zIndex: 13 }}></div>
                                    <div data-resize-handle="end" onMouseDown={(e) => onResizeHandleMouseDown(e, itemData, 'end', bar.timelineColumnId)} className="absolute right-0 top-0 bottom-0 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-black bg-opacity-20 hover:bg-opacity-30 rounded-r" style={{ width: `${RESIZE_HANDLE_WIDTH_PX}px`, zIndex: 13 }}></div>
                                </>
                            )}
                        </div>
                        {renderDateBadges(bar, visualBarTop)}
                    </React.Fragment>
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