// src/components/gantt/GanttBarRow.tsx (PERFORMANS GÜNCELLENDİ)

import React from 'react';
import { type ProcessedItemData } from './GanttArrows';
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
    isActive: boolean;
    onBarMouseDown: (event: React.MouseEvent<HTMLDivElement>, itemData: ProcessedItemData) => void;
    onResizeHandleMouseDown: (
        event: React.MouseEvent<HTMLDivElement>,
        itemData: ProcessedItemData,
        side: ResizeSide
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
    // Bar verisi yoksa (tarihi yoksa), boş satır ayırıcısını render et
    if (!itemData.barData) {
        return (
            <div
                key={itemData.item.id}
                className="absolute left-0 right-0 border-t border-gray-100 pointer-events-none"
                style={{
                    top: `${itemData.rowIndex * GANTT_ROW_HEIGHT_PX}px`,
                    height: `${GANTT_ROW_HEIGHT_PX}px`,
                }}
            ></div>
        );
    }

    const { barData } = itemData;

    return (
        // BAR KONTEYNERİ (GÖREV ÇUBUĞU)
        <div
            key={itemData.item.id}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            onMouseDown={(e) => onBarMouseDown(e, itemData)}
            className={`rounded text-white text-xs px-2 flex items-center overflow-hidden absolute cursor-grab group ${barData.colorClass} ${isActive ? 'opacity-75 ring-2 ring-blue-500 shadow-lg' : 'hover:opacity-90 transition-opacity duration-150 '}`}
            style={{
                ...barData.style,
                top: `${(itemData.rowIndex * GANTT_ROW_HEIGHT_PX) + GANTT_BAR_TOP_OFFSET_PX}px`,
                zIndex: isActive ? 12 : 11, 
                transition: isActive ? 'none' : 'all 150ms ease',
            }}
            title={itemData.item.name}
        >
            
            {/* Resize Tutamaçları */}
            <div
                data-resize-handle="start"
                onMouseDown={(e) => onResizeHandleMouseDown(e, itemData, 'start')}
                className="absolute left-0 top-0 bottom-0 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-black bg-opacity-10 rounded-l"
                style={{ width: `${RESIZE_HANDLE_WIDTH_PX}px`, zIndex: 13 }}
            ></div>
            <div
                data-resize-handle="end"
                onMouseDown={(e) => onResizeHandleMouseDown(e, itemData, 'end')}
                className="absolute right-0 top-0 bottom-0 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-black bg-opacity-10 rounded-r"
                style={{ width: `${RESIZE_HANDLE_WIDTH_PX}px`, zIndex: 13 }}
            ></div>

        </div>
    );
};

// YENİ: Dışarıya 'memoized' versiyonu export et
// Bu, prop'ları değişmediği sürece bu bileşenin yeniden render olmasını engeller.
export default React.memo(_GanttBarRow);