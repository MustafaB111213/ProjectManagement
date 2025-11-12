// src/components/gantt/GanttArrows.tsx (GÜNCELLENDİ)

import React, { useMemo } from 'react';
import { type DependencyLink } from '../../types';
import { 
    GANTT_ROW_HEIGHT_PX, 
    GANTT_ARROW_VERTICAL_MID_OFFSET 
} from '../common/constants'; 

// Sabitler
const ARROW_CORNER_RADIUS = 5; // Köşe yarıçapı
const ARROW_HORIZONTAL_BUFFER = 3; // Okun çubuktan yatay uzaklığı
// MARKER_WIDTH, 'refX' için kullanılacak
const MARKER_WIDTH = 8; // Ok ucunun 'polygon' içindeki genişliği (0'dan 8'e)

// Ok çiziminde üst üste gelmeyi engellemek için dikey kayma sabitleri
const ARROW_VERTICAL_DETOUR_HEIGHT = 12; // Aynı satırda yukarı çıkılacak mesafe
const ARROW_DETOUR_STEP = 6; // Farklı satırlarda üst üste binmeyi engellemek için adım

// İşlenmiş veri tipi (Aynı)
export interface ProcessedItemData {
    item: { id: number, name: string, groupId: number };
    rowIndex: number;
    barData: {
        style: React.CSSProperties;
        colorClass: string;
        startX: number;
        endX: number;
    } | null;
    dependencies: DependencyLink[];
    externalLabel?: string; 
}

// Ok tipi (Aynı)
export interface ArrowData {
    path: string;
    id: string;
}

interface GanttArrowsProps {
    processedData: Map<number, ProcessedItemData>;
    totalWidth: number;
    totalHeight: number;
    hoveredItemId: number | null;
}

    // --- HESAPLAMA HOOK'U ---
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

                    const vDir = Math.sign(succ.rowIndex - pred.rowIndex); // 0, 1, -1
                    const sourceIsLeft = link.type === 'SS' || link.type === 'SF';
                    const targetIsLeft = link.type === 'SS' || link.type === 'FS';
                    const hDir = sourceIsLeft ? -1 : 1; // Yatay çıkış yönü
                    const targetHDir = targetIsLeft ? -1 : 1; // Yatay giriş yönü

                    // 1. Yatay (X) başlangıç ve bitiş noktaları 
                    // Ok ucunun (marker) çubuğun içine girmesi için MARKER_WIDTH'ı KULLANIYORUZ.
                    // Okun yönü artık "auto" olacağı için, endX'i marker'ın genişliği kadar geriye çekiyoruz.
                    switch (link.type) {
                        case 'SS': startX = predBar.startX - hBuffer; endX = succBar.startX - hBuffer - MARKER_WIDTH; break;
                        case 'FF': startX = predBar.endX + hBuffer; endX = succBar.endX + hBuffer + MARKER_WIDTH; break;
                        case 'SF': startX = predBar.startX - hBuffer; endX = succBar.endX + hBuffer + MARKER_WIDTH; break;
                        case 'FS': default: startX = predBar.endX + hBuffer; endX = succBar.startX - hBuffer - MARKER_WIDTH; break;
                    }

                    // 2. Dikey (Y) başlangıç ve bitiş noktaları (Aynı)
                    const startY = predBaseY + GANTT_ARROW_VERTICAL_MID_OFFSET;
                    const endY = succBaseY + GANTT_ARROW_VERTICAL_MID_OFFSET;

                    // --- Aynı Satır (vDir === 0) ---
                    if (vDir === 0) {
                        const needsDetour = (hDir === 1 && startX >= endX) || (hDir === -1 && startX <= endX) || Math.abs(startX - endX) < (hExitOffset + radius);

                        if (needsDetour) {
                            // Detour (Üstten Dolaşma)
                            const currentOffset = horizontalDetourOffsets.get(pred.rowIndex) || 0;
                            const newOffset = currentOffset + 1;
                            horizontalDetourOffsets.set(pred.rowIndex, newOffset);

                            const detourY = predBaseY - (newOffset * ARROW_DETOUR_STEP) - ARROW_VERTICAL_DETOUR_HEIGHT;
                            const hExitX = startX + hExitOffset * hDir; 
                            const vDirDetour = Math.sign(detourY - startY); 

                            path = `M ${startX} ${startY} ` +
                                `H ${hExitX - radius * hDir} ` +
                                `Q ${hExitX} ${startY} ${hExitX} ${startY + radius * vDirDetour} ` +
                                `V ${detourY - radius * vDirDetour} ` +
                                `Q ${hExitX} ${detourY} ${hExitX + radius * hDir} ${detourY} ` +
                                `H ${endX - radius * targetHDir} ` +
                                `Q ${endX} ${detourY} ${endX} ${detourY - radius * vDirDetour} ` +
                                `V ${endY + radius * vDirDetour} ` +
                                `Q ${endX} ${endY} ${endX + radius * targetHDir} ${endY} `;
                        } else {
                            path = `M ${startX} ${startY} H ${endX}`;
                        }
                    }
                    // --- Farklı Satırlar (vDir !== 0) ---
                    else {
                        
                        // 1. "C" Yolu (H-V-H) için dikey çizginin X konumu
                        const P1x_C_Path = startX + hExitOffset * hDir;
                        
                        // 2. "C" Yolu geçerli mi?
                        // Okun hedefe girdiği yön (targetHDir), 
                        // C yolunun dikey çizgisinin (P1x_C_Path) hedefe göre konumuna uygun mu?
                        // Örn: Hedefe soldan giriyorsa (targetHDir = -1), P1x_C_Path, endX'ten BÜYÜK olmalı.
                        // Örn: Hedefe sağdan giriyorsa (targetHDir = 1), P1x_C_Path, endX'ten KÜÇÜK olmalı.
                        const isCPathValid = (P1x_C_Path - endX) * targetHDir > 0;

                        if (isCPathValid) {
                            // --- YOL 1: "C" YOLU (H-V-H) ---
                            // (Görsel 'image_02b814.png'deki gibi)
                            path = `M ${startX} ${startY} ` + // Başla
                                `H ${P1x_C_Path - radius * hDir} ` + // 1. Yatay çizgi (köşeden önce dur)
                                `Q ${P1x_C_Path} ${startY} ${P1x_C_Path} ${startY + radius * vDir} ` + // 1. Kavis (H -> V)
                                `V ${endY - radius * vDir} ` + // 2. Dikey çizgi (köşeden önce dur)
                                `Q ${P1x_C_Path} ${endY} ${P1x_C_Path + radius * targetHDir} ${endY} ` + // 2. Kavis (V -> H)
                                `H ${endX}`; // 3. Son yatay çizgi (Hedefe)
                        } 
                        else {
                            // --- YOL 2: "S" YOLU (H-V-H-V-H) ---
                            // (Görsel 'Ekran görüntüsü 2025-11-03 172957.png'deki gibi)
                            const P1x = startX + hExitOffset * hDir;
                            const P2y = startY + (GANTT_ROW_HEIGHT_PX / 2) * vDir; // Çubukların tam arasına iner
                            const P3x = (hExitOffset * targetHDir) + endX ;
                            const hDir2 = Math.sign(P3x - P1x); // Orta segmentin yönü
                            
                            path = `M ${startX} ${startY} ` + // Başla
                                `H ${P1x - radius * hDir} ` +
                                `Q ${P1x} ${startY} ${P1x} ${startY + radius * vDir} ` + // Q1 (H -> V)
                                `V ${P2y - radius * vDir} ` +
                                `Q ${P1x} ${P2y} ${P1x + radius * hDir2} ${P2y} ` + // Q2 (V -> H)
                                `H ${P3x - radius * hDir2} ` +
                                `Q ${P3x} ${P2y} ${P3x} ${P2y + radius * vDir} ` + // Q3 (H -> V)
                                `V ${endY - radius * vDir} ` +
                                `Q ${P3x} ${endY} ${P3x + radius * targetHDir} ${endY} ` + // Q4 (V -> H)
                                `H ${endX}`;
                        }
                    }

                    arrowList.push({ path: path, id: `arrow-${link.id}-${succId}-${link.type}` });
                });
            });
            return arrowList;
        }, [processedData, GANTT_ROW_HEIGHT_PX, GANTT_ARROW_VERTICAL_MID_OFFSET]);
    };
    // --- HESAPLAMA HOOK'U SONU ---

// GanttArrows bileşeni
const GanttArrows: React.FC<GanttArrowsProps> = ({ processedData, totalWidth, totalHeight, hoveredItemId }) => {
    const arrows = useCalculateArrows(processedData);

    const defaultColor = '#A0AEC0'; 
    const highlightColor = '#4299E1'; 
    const highlightWidth = '2.5';

    // Okun vurgulanıp vurgulanmayacağını kontrol eden map'i oluştur
    const arrowHighlightMap = useMemo(() => {
        const map = new Map<string, boolean>();
        if (hoveredItemId === null) return map;

        const isHighlighted = (predId: number, succId: number) => {
            if (predId === hoveredItemId) return true;
            if (succId === hoveredItemId) return true;
            return false;
        };

        processedData.forEach((succ, succId) => {
            succ.dependencies.forEach(link => {
                const predId = link.id;
                const arrowId = `arrow-${predId}-${succId}-${link.type}`;
                if (isHighlighted(predId, succId)) {
                    map.set(arrowId, true);
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
            {/* Marker Tanımları */}
            <defs>
                <marker
                    id="arrowhead-default" 
                    markerWidth={MARKER_WIDTH} 
                    markerHeight="6"
                    // refX="0"
                    // Ok ucunun (polygon'daki '0 0' noktası), path'in bittiği yere
                    // (endX) oturmasını sağlar. Marker 0'dan 8'e kadar ileriye doğru çizilir.
                    refX="0" 
                    refY="3" 
                    orient="auto"
                    markerUnits="strokeWidth"
                >
                    <polygon points="0 0, 8 3, 0 6" fill={defaultColor} />
                </marker>
                <marker
                    id="arrowhead-highlight" 
                    markerWidth={MARKER_WIDTH} 
                    markerHeight="6"
                    // refX="0"
                    refX="0" 
                    refY="3" 
                    orient="auto"
                    markerUnits="strokeWidth"
                >
                    <polygon points="0 0, 8 3, 0 6" fill={highlightColor} />
                </marker>
            </defs>
            
            {/* Hesaplanan okları çiz */}
            {arrows.map(arrow => {
                const isHighlighted = arrowHighlightMap.get(arrow.id) || false;
                const strokeColor = isHighlighted ? highlightColor : defaultColor;
                const strokeWidth = isHighlighted ? highlightWidth : '1.5';
                const markerId = isHighlighted ? 'arrowhead-highlight' : 'arrowhead-default';

                return (
                    <path
                        key={arrow.id}
                        d={arrow.path}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth={strokeWidth}
                        markerEnd={`url(#${markerId})`} 
                    />
                );
            })}
        </svg>
    );
};

export default GanttArrows;