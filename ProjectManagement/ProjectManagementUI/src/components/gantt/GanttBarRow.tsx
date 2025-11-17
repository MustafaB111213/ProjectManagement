// src/components/gantt/GanttBarRow.tsx (PERFORMANS GÜNCELLENDİ)

import React from 'react';
import { format } from 'date-fns';
import { type ProcessedItemData, type BarTimelineData } from './GanttArrows';
import {
    GANTT_ROW_HEIGHT_PX,
    GANTT_BAR_HEIGHT_PX,
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
    // YENİ: Handlera 'timelineColumnId' ekle
    onBarMouseDown: (event: React.MouseEvent, itemData: ProcessedItemData, timelineColumnId: number) => void;
    onResizeHandleMouseDown: (
        event: React.MouseEvent,
        itemData: ProcessedItemData,
        side: ResizeSide,
        timelineColumnId: number // <-- YENİ
    ) => void;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
}
// GÜNCELLENDİ: Bileşeni '_' (alt çizgi) ile yeniden adlandırın
const _GanttBarRow: React.FC<GanttBarRowProps> = ({
    itemData,
    originalItemData,
    isActive,
    onBarMouseDown,
    onResizeHandleMouseDown,
    onMouseEnter,
    onMouseLeave,
}) => {
    // Değişkenleri al
    const { barData, visualOnlyBars } = itemData;
    const { barData: originalBarData, visualOnlyBars: originalVisualBars } = originalItemData;

    // Birincil barın (veya tüm satırın) 'top' konumu
    const baseTop = itemData.rowIndex * GANTT_ROW_HEIGHT_PX;

    const renderDateBadges = (bar: BarTimelineData, top: number) => {
        if (!bar.startDate || !bar.endDate) return null;

        const formattedStart = format(bar.startDate, 'yyyy-MM-dd');
        const formattedEnd = format(bar.endDate, 'yyyy-MM-dd');
        const badgeOffset = 14;

        const visibilityClasses = isActive
            ? 'opacity-100'
            : 'opacity-0 group-hover:opacity-100';

        return (
            <>
                <div
                    className={`absolute -translate-x-1/2 px-2 py-0.5 rounded bg-gray-900 text-white text-[10px] leading-none pointer-events-none ${visibilityClasses}`}
                    style={{ top: `${top - badgeOffset}px`, left: `${bar.startX}px` }}
                >
                    {formattedStart}
                </div>
                <div
                    className={`absolute translate-x-1/2 px-2 py-0.5 rounded bg-gray-900 text-white text-[10px] leading-none pointer-events-none ${visibilityClasses}`}
                    style={{ top: `${top - badgeOffset}px`, left: `${bar.endX}px` }}
                >
                    {formattedEnd}
                </div>
            </>
        );
    };


    // 'if (!itemData.barData)' kontrolünü kaldırıyoruz.
    // 'GanttRightPanel'deki boş satır (div) artık GEREKSİZ,
    // çünkü 'totalHeight' artık tüm alanı kaplıyor.
    // 'processedData' map'i zaten sadece 'itemData' içeriyor.

    // Orijinal kodundaki 'if (!itemData.barData) { return <div ...> }' bloğunu SİL.

    return (
        <React.Fragment>

            {/* 1. BİRİNCİL BAR (Eğer varsa) */}
            {barData && (
                <div
                    key={itemData.item.id} // Ana key
                    onMouseEnter={onMouseEnter}
                    onMouseLeave={onMouseLeave}
                    onMouseDown={(e) => onBarMouseDown(e, itemData, barData.timelineColumnId)}
                    className={`rounded text-white text-xs px-2 flex items-center overflow-hidden absolute cursor-grab group ${barData.colorClass} ${isActive ? 'opacity-75 ring-2 ring-blue-500 shadow-lg' : 'hover:opacity-90 transition-opacity duration-150 '}`}
                    style={{
                        ...barData.style, // left, width, height
                        position: 'absolute', // Style'a ekle
                        top: `${baseTop + GANTT_BAR_TOP_OFFSET_PX}px`, // BİRİNCİL satırın 'top'u
                        zIndex: isActive ? 12 : 11,
                        transition: isActive ? 'none' : 'all 150ms ease',
                    }}
                    title={`${itemData.item.name} (${barData.timelineColumnTitle})`}
                >

                    {/* Resize Tutamaçları (Aynı) */}
                    {/* YENİ: Kopyalara da Resize Handle Ekle */}
                    <div
                        data-resize-handle="start"
                        // YENİ: Kendi columnId'sini gönderir
                        onMouseDown={(e) => onResizeHandleMouseDown(e, itemData, 'start', barData.timelineColumnId)}
                        className="absolute left-0 top-0 bottom-0 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-black bg-opacity-10 rounded-l"
                        style={{ width: `${RESIZE_HANDLE_WIDTH_PX}px`, zIndex: 13 }}
                    ></div>
                    <div
                        data-resize-handle="end"
                        // YENİ: Kendi columnId'sini gönderir
                        onMouseDown={(e) => onResizeHandleMouseDown(e, itemData, 'end', barData.timelineColumnId)}
                        className="absolute right-0 top-0 bottom-0 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-black bg-opacity-10 rounded-r"
                        style={{ width: `${RESIZE_HANDLE_WIDTH_PX}px`, zIndex: 13 }}
                    ></div>
                    {renderDateBadges(barData, baseTop + GANTT_BAR_TOP_OFFSET_PX)}

                </div>
            )}

            {/* 1.1 ORİJİNAL POZİSYON SİLÜETİ */}
            {isActive && originalBarData && barData && (originalBarData.startX !== barData.startX || originalBarData.endX !== barData.endX) && (
                <div
                    className="rounded border-2 border-dashed border-blue-500 bg-white bg-opacity-30 absolute pointer-events-none"
                    style={{
                        ...originalBarData.style,
                        position: 'absolute',
                        top: `${baseTop + GANTT_BAR_TOP_OFFSET_PX}px`,
                        zIndex: 9,
                        opacity: 0.6,
                    }}
                />
            )}

            {/* 1.1 ORİJİNAL POZİSYON SİLÜETİ */}
            {isActive && originalBarData && barData && (originalBarData.startX !== barData.startX || originalBarData.endX !== barData.endX) && (
                <div
                    className="rounded border-2 border-dashed border-blue-500 bg-white bg-opacity-30 absolute pointer-events-none"
                    style={{
                        ...originalBarData.style,
                        position: 'absolute',
                        top: `${baseTop + GANTT_BAR_TOP_OFFSET_PX}px`,
                        zIndex: 9,
                        opacity: 0.6,
                    }}
                />
            )}

            {/* 2. GÖRSEL KOPYA BARLAR (Kopya "Proje" satırları) */}
            {visualOnlyBars.map((bar, index) => {

                // Barları BİRİNCİL satırın ALTINDAKİ satırlara yerleştir
                const copyRowIndex = index + 1; // 1, 2, 3...
                const visualBarTop = (itemData.rowIndex + copyRowIndex) * GANTT_ROW_HEIGHT_PX + GANTT_BAR_TOP_OFFSET_PX;

                return (
                    <div
                        key={`${itemData.item.id}-visual-${index}`}
                        onMouseEnter={onMouseEnter} // Hover'ı bağla
                        onMouseLeave={onMouseLeave}

                        // --- YENİ EKLEMELER ---
                        // Ana bardaki (onBarMouseDown) event'inin aynısını buraya ekle.
                        // useGanttDragResize hook'u hem tıklamayı (detay açma)
                        // hem de sürüklemeyi bu fonksiyonla yönetiyor.
                        onMouseDown={(e) => onBarMouseDown(e, itemData, bar.timelineColumnId)}
                        // --- YENİ EKLEMELER SONU ---

                        // NOT: Bu kopyalarda 'onMouseDown' ve 'onResizeHandleMouseDown' YOK.
                        className={`rounded text-white text-xs px-2 flex items-center overflow-hidden absolute cursor-grab group ${bar.colorClass} ${isActive ? 'opacity-75 ring-2 ring-blue-500 shadow-lg' : 'hover:opacity-90 transition-opacity duration-150 '}`}
                        style={{
                            ...bar.style,
                            position: 'absolute',
                            top: `${visualBarTop}px`,
                            zIndex: isActive ? 12 : 11, // Aktifse öne çıkar
                            transition: isActive ? 'none' : 'all 150ms ease',
                        }}
                        title={`${itemData.item.name} (${bar.timelineColumnTitle})`}
                    >
                        {/* YENİ: Kopyalara da Resize Handle Ekle */}
                        <div
                            data-resize-handle="start"
                            // YENİ: Kendi columnId'sini gönderir
                            onMouseDown={(e) => onResizeHandleMouseDown(e, itemData, 'start', bar.timelineColumnId)}
                            className="absolute left-0 top-0 bottom-0 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-black bg-opacity-10 rounded-l"
                            style={{ width: `${RESIZE_HANDLE_WIDTH_PX}px`, zIndex: 13 }}
                        ></div>
                        <div
                            data-resize-handle="end"
                            // YENİ: Kendi columnId'sini gönderir
                            onMouseDown={(e) => onResizeHandleMouseDown(e, itemData, 'end', bar.timelineColumnId)}
                            className="absolute right-0 top-0 bottom-0 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-black bg-opacity-10 rounded-r"
                            style={{ width: `${RESIZE_HANDLE_WIDTH_PX}px`, zIndex: 13 }}
                        ></div>
                        {renderDateBadges(bar, visualBarTop)}
                    </div>
                );
            })}

            {/* 2.1 GÖRSEL KOPYALAR İÇİN ORİJİNAL SİLÜETLER */}
            {isActive && originalVisualBars.map((bar, index) => {
                const copyRowIndex = index + 1;
                const visualBarTop = (itemData.rowIndex + copyRowIndex) * GANTT_ROW_HEIGHT_PX + GANTT_BAR_TOP_OFFSET_PX;
                const previewBar = visualOnlyBars[index];
                if (!previewBar) return null;
                if (bar.startX === previewBar.startX && bar.endX === previewBar.endX) return null;

                return (
                    <div
                        key={`${itemData.item.id}-visual-silhouette-${index}`}
                        className="rounded border-2 border-dashed border-blue-500 bg-white bg-opacity-30 absolute pointer-events-none"
                        style={{
                            ...bar.style,
                            position: 'absolute',
                            top: `${visualBarTop}px`,
                            zIndex: 9,
                            opacity: 0.6,
                        }}
                    />
                );
            })}


            {/* 3. ETİKET (LABEL) (Sadece birincil barda) */}
            {/* 'GanttRightPanel' render bloğundan buraya taşıdım */}
            {itemData.barData && itemData.externalLabel && (
                <div
                    className="absolute flex items-center px-3 text-xs text-gray-700 :text-gray-300 pointer-events-none truncate"
                    style={{
                        // Etiketi BİRİNCİL barın 'top'una hizala
                        top: `${baseTop + GANTT_BAR_TOP_OFFSET_PX}px`,
                        left: `${itemData.barData.endX + 6}px`,
                        height: `${GANTT_BAR_HEIGHT_PX}px`,
                        lineHeight: `${GANTT_BAR_HEIGHT_PX}px`,
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