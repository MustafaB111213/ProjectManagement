// src/components/gantt/GanttArrows.tsx

import React, { useMemo, type JSX } from 'react';
import { type DependencyLink } from '../../types';
import {
    GANTT_ROW_HEIGHT_PX,
    GANTT_ARROW_VERTICAL_MID_OFFSET
} from '../common/constants';

// Bar Verisi Tipi
export interface BarTimelineData {
    style: React.CSSProperties;
    colorClass: string;
    startX: number;
    endX: number;
    startDate: Date;
    endDate: Date;
    timelineColumnId: number;
    timelineColumnTitle: string;
}

// Sabitler
const ARROW_CORNER_RADIUS = 5;
const ARROW_HORIZONTAL_BUFFER = 3;
const MARKER_WIDTH = 10;
const ARROW_VERTICAL_DETOUR_HEIGHT = 12;
const ARROW_DETOUR_STEP = 6;

// İşlenmiş Veri Tipi 
export interface ProcessedItemData {
    item: { id: number, name: string, groupId: number };
    rowIndex: number;
    rowSpan: number;
    barData: BarTimelineData | null; // Birincil (Aktif) Bar

    // YENİ: Temel Çizgi (Baseline) Barı
    // Eğer null ise o satır için baseline yok demektir.
    baselineBarData: BarTimelineData | null;

    visualOnlyBars: BarTimelineData[]; // Kopyalar (Split mode için)
    dependencies: DependencyLink[];
    primaryTimelineColumnId: number | null;
    externalLabel?: string;
}

export interface ArrowData {
    path: string;
    id: string;
}

interface GanttArrowsProps {
    processedData: Map<number, ProcessedItemData>;
    totalWidth: number;
    totalHeight: number;
    hoveredItemId: number | null;
    showCriticalPath?: boolean;
    criticalPathIds?: Set<number>;
}

// --- HESAPLAMA HOOK'U (Değişiklik Yok) ---
const useCalculateArrows = (processedData: Map<number, ProcessedItemData>): ArrowData[] => {
    return useMemo(() => {
        const arrowList: ArrowData[] = [];
        if (!processedData.size) return arrowList;

        const horizontalDetourOffsets = new Map<number, number>();

        processedData.forEach((succ, succId) => {
            if (!succ.barData || !succ.dependencies.length) return;

            const succBar = succ.barData;
            const succBaseY = succ.rowIndex * GANTT_ROW_HEIGHT_PX;

            succ.dependencies.forEach(link => {
                const pred = processedData.get(link.id);
                if (!pred || !pred.barData) return;

                const predBar = pred.barData;
                const predBaseY = pred.rowIndex * GANTT_ROW_HEIGHT_PX;

                let startX: number, endX: number;
                const hBuffer = ARROW_HORIZONTAL_BUFFER;
                const hExitOffset = 15;
                const radius = ARROW_CORNER_RADIUS;
                let path: string;

                const vDir = Math.sign(succ.rowIndex - pred.rowIndex);
                const sourceIsLeft = link.type === 'SS' || link.type === 'SF';
                const targetIsLeft = link.type === 'SS' || link.type === 'FS';
                const hDir = sourceIsLeft ? -1 : 1;
                const targetHDir = targetIsLeft ? -1 : 1;

                switch (link.type) {
                    case 'SS': startX = predBar.startX - hBuffer; endX = succBar.startX - hBuffer - MARKER_WIDTH; break;
                    case 'FF': startX = predBar.endX + hBuffer; endX = succBar.endX + hBuffer + MARKER_WIDTH; break;
                    case 'SF': startX = predBar.startX - hBuffer; endX = succBar.endX + hBuffer + MARKER_WIDTH; break;
                    case 'FS': default: startX = predBar.endX + hBuffer; endX = succBar.startX - hBuffer - MARKER_WIDTH; break;
                }

                const startY = predBaseY + GANTT_ARROW_VERTICAL_MID_OFFSET;
                const endY = succBaseY + GANTT_ARROW_VERTICAL_MID_OFFSET;

                // ... (Ok çizim mantığı aynı kalır) ...
                if (vDir === 0) {
                    const needsDetour = (hDir === 1 && startX >= endX) || (hDir === -1 && startX <= endX) || Math.abs(startX - endX) < (hExitOffset + radius);
                    if (needsDetour) {
                        const currentOffset = horizontalDetourOffsets.get(pred.rowIndex) || 0;
                        const newOffset = currentOffset + 1;
                        horizontalDetourOffsets.set(pred.rowIndex, newOffset);
                        const detourY = predBaseY - (newOffset * ARROW_DETOUR_STEP) - ARROW_VERTICAL_DETOUR_HEIGHT;
                        const hExitX = startX + hExitOffset * hDir;
                        const vDirDetour = Math.sign(detourY - startY);
                        path = `M ${startX} ${startY} H ${hExitX - radius * hDir} Q ${hExitX} ${startY} ${hExitX} ${startY + radius * vDirDetour} V ${detourY - radius * vDirDetour} Q ${hExitX} ${detourY} ${hExitX + radius * hDir} ${detourY} H ${endX - radius * targetHDir} Q ${endX} ${detourY} ${endX} ${detourY - radius * vDirDetour} V ${endY + radius * vDirDetour} Q ${endX} ${endY} ${endX + radius * targetHDir} ${endY} `;
                    } else {
                        path = `M ${startX} ${startY} H ${endX}`;
                    }
                }
                else {
                    const P1x_C_Path = startX + hExitOffset * hDir;
                    const isCPathValid = (P1x_C_Path - endX) * targetHDir > 0;
                    if (isCPathValid) {
                        path = `M ${startX} ${startY} H ${P1x_C_Path - radius * hDir} Q ${P1x_C_Path} ${startY} ${P1x_C_Path} ${startY + radius * vDir} V ${endY - radius * vDir} Q ${P1x_C_Path} ${endY} ${P1x_C_Path + radius * targetHDir} ${endY} H ${endX}`;
                    }
                    else {
                        const P1x = startX + hExitOffset * hDir;
                        const P2y = startY + (GANTT_ROW_HEIGHT_PX / 2) * vDir;
                        const P3x = (hExitOffset * targetHDir) + endX;
                        const hDir2 = Math.sign(P3x - P1x);
                        path = `M ${startX} ${startY} H ${P1x - radius * hDir} Q ${P1x} ${startY} ${P1x} ${startY + radius * vDir} V ${P2y - radius * vDir} Q ${P1x} ${P2y} ${P1x + radius * hDir2} ${P2y} H ${P3x - radius * hDir2} Q ${P3x} ${P2y} ${P3x} ${P2y + radius * vDir} V ${endY - radius * vDir} Q ${P3x} ${endY} ${P3x + radius * targetHDir} ${endY} H ${endX}`;
                    }
                }
                arrowList.push({ path: path, id: `arrow-${link.id}-${succId}-${link.type}` });
            });
        });
        return arrowList;
    }, [processedData, GANTT_ROW_HEIGHT_PX, GANTT_ARROW_VERTICAL_MID_OFFSET]);
};

// GanttArrows Bileşeni
const GanttArrows: React.FC<GanttArrowsProps> = ({
    processedData,
    totalWidth,
    totalHeight,
    hoveredItemId,
    showCriticalPath = false,
    criticalPathIds = new Set()
}) => {
    const arrows = useCalculateArrows(processedData);
    const defaultColor = '#A0AEC0';
    const highlightColor = '#071b2eff';
    const criticalColor = '#ef4444'; // Tailwind Red-500

    const arrowHighlightMap = useMemo(() => {
        const map = new Map<string, boolean>();
        if (hoveredItemId === null) return map;
        const isHighlighted = (predId: number, succId: number) => (predId === hoveredItemId || succId === hoveredItemId);

        processedData.forEach((succ, succId) => {
            succ.dependencies.forEach(link => {
                if (isHighlighted(link.id, succId)) {
                    map.set(`arrow-${link.id}-${succId}-${link.type}`, true);
                }
            });
        });
        return map;
    }, [hoveredItemId, processedData]);

    return (
        <svg
            width={totalWidth}
            height={totalHeight}
            className="absolute top-0 left-0 pointer-events-none"
            style={{ zIndex: 10 }}
        >
            <defs>
                <marker id="arrowhead-default" markerWidth={MARKER_WIDTH} markerHeight="6" refX="0" refY="3" orient="auto" markerUnits="strokeWidth">
                    <polygon points="0 0, 8 3, 0 6" fill={defaultColor} />
                </marker>
                <marker id="arrowhead-highlight" markerWidth={MARKER_WIDTH} markerHeight="6" refX="0" refY="3" orient="auto" markerUnits="strokeWidth">
                    <polygon points="0 0, 8 3, 0 6" fill={highlightColor} />
                </marker>
                <marker id="arrowhead-critical" markerWidth={MARKER_WIDTH} markerHeight="6" refX="0" refY="3" orient="auto" markerUnits="strokeWidth">
                    <polygon points="0 0, 8 3, 0 6" fill={criticalColor} />
                </marker>
            </defs>

            {(() => {
                const normalArrows: JSX.Element[] = [];
                const hoveredArrows: JSX.Element[] = [];

                arrows.forEach(arrow => {
                    const parts = arrow.id.split('-');
                    const predId = parseInt(parts[1]);
                    const succId = parseInt(parts[2]);

                    const isHovered = arrowHighlightMap.get(arrow.id);
                    const isCritical =
                        showCriticalPath &&
                        criticalPathIds.has(predId) &&
                        criticalPathIds.has(succId);

                    let stroke = defaultColor;
                    let marker = "url(#arrowhead-default)";
                    let strokeWidth = "1";

                    if (isCritical) {
                        stroke = criticalColor;
                        marker = "url(#arrowhead-critical)";
                        strokeWidth = "1.25";
                    }

                    if (isHovered) {
                        stroke = highlightColor;
                        marker = "url(#arrowhead-highlight)";
                        strokeWidth = "1"; // Biraz daha belirgin
                    }

                    const element = (
                        <path
                            key={arrow.id}
                            d={arrow.path}
                            fill="none"
                            stroke={stroke}
                            strokeWidth={strokeWidth}
                            markerEnd={marker}
                            className="transition-colors duration-300"
                        />
                    );

                    if (isHovered) hoveredArrows.push(element);
                    else normalArrows.push(element);
                });

                return (
                    <>
                        {normalArrows}
                        {hoveredArrows}
                    </>
                );
            })()}
        </svg>
    );

};
export default GanttArrows;