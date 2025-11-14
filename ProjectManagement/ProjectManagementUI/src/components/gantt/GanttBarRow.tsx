// src/components/gantt/GanttBarRow.tsx (PERFORMANS GÜNCELLENDİ)

import React from 'react';
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
    isActive,
    onBarMouseDown,
    onResizeHandleMouseDown,
    onMouseEnter,
    onMouseLeave,
}) => {
    // Değişkenleri al
    const { barData, visualOnlyBars } = itemData;

    // Birincil barın (veya tüm satırın) 'top' konumu
    const baseTop = itemData.rowIndex * GANTT_ROW_HEIGHT_PX;

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

                </div>
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
                    </div>
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