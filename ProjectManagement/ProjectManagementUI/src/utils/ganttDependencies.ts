// src/utils/ganttDependencies.ts (HATALARI GİDERİLMİŞ VERSİYON)

import { differenceInDays, parseISO, isValid } from 'date-fns';
// types.ts dosyanızın yoluna göre '..' sayısını ayarlamanız gerekebilir
import { type Item, type DependencyLink, type DependencyType, type Column, ColumnType } from '../types'; 

// --- Yardımcı Tipler (Aynı) ---
export interface UpdatedTaskData {
    itemId: number;
    newStartDate: Date;
    newEndDate: Date;
}

export interface Violation {
    type: 'FS' | 'SS' | 'FF' | 'SF';
    predecessorName: string; 
    successorName: string;   
    violationDays: number;   
    message: string;
}

// --- Ana Kontrol Fonksiyonu ---

export const checkDependencyViolations = (
    updatedTask: UpdatedTaskData,
    allItems: Item[],
    allColumns: Column[]
): Violation | null => {
    
    const timelineColumnId = allColumns.find(c => c.type === ColumnType.Timeline)?.id;
    const dependencyColumnId = allColumns.find(c => c.type === ColumnType.Dependency)?.id;
    
    if (!dependencyColumnId || !timelineColumnId) {
        return null; 
    }
    
    const itemMap = new Map(allItems.map(item => [item.id, item]));
    const movedItem = itemMap.get(updatedTask.itemId);
    if (!movedItem) return null;

    const newStart = updatedTask.newStartDate;
    const newEnd = updatedTask.newEndDate;

    // =================================================================
    // 1. ÖNCÜLLERİ KONTROL ET (Taşınan Görev = Ardıl/Successor)
    // =================================================================

    const movedItemDependencies = movedItem.itemValues.find(iv => iv.columnId === dependencyColumnId)?.value;
    if (movedItemDependencies) {
        let dependencies: DependencyLink[];
        try { dependencies = JSON.parse(movedItemDependencies); } catch { dependencies = []; }

        for (const link of dependencies) {
            const predecessor = itemMap.get(link.id);
            if (!predecessor) continue;
            
            const timelineValue = predecessor.itemValues.find(v => v.columnId === timelineColumnId)?.value;
            if (!timelineValue) continue;

            const [predStartStr, predEndStr] = timelineValue.split('/');
            const predStart = parseISO(predStartStr);
            const predEnd = parseISO(predEndStr);
            
            if (!isValid(predStart) || !isValid(predEnd)) continue;

            let violationDays = 0;
            let violationType: 'FS' | 'SS' | 'FF' | 'SF' = link.type;

            switch (link.type) {
                case 'FS': // Öncül Bitmeli (predEnd), Ardıl Başlamalı (newStart)
                    // Kural: predEnd < newStart
                    if (predEnd >= newStart) {
                        violationDays = differenceInDays(predEnd, newStart) + 1; 
                    }
                    break;
               case 'SS': // Öncül Başlamalı (predStart), Ardıl Başlamalı (newStart)
                    // Kural: predStart <= newStart
                    if (predStart > newStart) {
                        violationDays = differenceInDays(predStart, newStart); 
                    }
                    break;
                case 'FF': // Öncül Bitmeli (predEnd), Ardıl Bitmeli (newEnd)
                    // Kural: predEnd <= newEnd
                    if (predEnd > newEnd) {
                        violationDays = differenceInDays(predEnd, newEnd);
                    }
                    break;
                case 'SF': // Öncül Başlamalı (predStart), Ardıl Bitmeli (newEnd)
                    // Kural: predStart <= newEnd
                    if (predStart > newEnd) {
                        violationDays = differenceInDays(predStart, newEnd);
                    }
                    break;
            }

            if (violationDays > 0) {
                // İhlal mesajı: Ardıl (movedItem), Öncül kuralını ihlal ediyor.
                return {
                    type: violationType,
                    predecessorName: predecessor.name,
                    successorName: movedItem.name,
                    violationDays: violationDays,
                    message: `Bu hareket, görevinizin ("${movedItem.name}") bağımlı olduğu öncül görev "${predecessor.name}" (${violationType} kuralı) ile çakışıyor ve ${violationDays} gün ihlal yaratıyor.`
                };
            }
        }
    }


    // =================================================================
    // 2. ARDILLARI KONTROL ET (Taşınan Görev = Öncül/Predecessor)
    // =================================================================

    for (const successor of allItems) {
        if (successor.id === updatedTask.itemId) continue; 
        
        const links = successor.itemValues.find(v => v.columnId === dependencyColumnId)?.value;
        if (!links) continue;

        let dependencies: DependencyLink[];
        try { dependencies = JSON.parse(links); } catch { continue; }

        for (const link of dependencies) {
            // Sadece 'movedItem'ın ÖNCÜL olduğu bağımlılıkları kontrol et
            if (link.id !== updatedTask.itemId) continue; 

            // Ardılın (successor) tarihlerini al
            const timelineValue = successor.itemValues.find(v => v.columnId === timelineColumnId)?.value;
            if (!timelineValue) continue;
            
            const [succStartStr, succEndStr] = timelineValue.split('/');
            const succStart = parseISO(succStartStr);
            const succEnd = parseISO(succEndStr);

            if (!isValid(succStart) || !isValid(succEnd)) continue;

            let violationDays = 0;
            let violationType: 'FS' | 'SS' | 'FF' | 'SF' = link.type;

            switch (link.type) {
                case 'FS': // Öncül Bitmeli (newEnd), Ardıl Başlamalı (succStart)
                    // Kural: newEnd < succStart
                    if (newEnd >= succStart) {
                        violationDays = differenceInDays(newEnd, succStart) + 1;
                    }
                    break;
                case 'SS': // Öncül Başlamalı (newStart), Ardıl Başlamalı (succStart)
                    // Kural: newStart <= succStart
                   if (newStart > succStart) {
                        violationDays = differenceInDays(newStart, succStart);
                    }
                    break;
                case 'FF': // Öncül Bitmeli (newEnd), Ardıl Bitmeli (succEnd)
                    // Kural: newEnd <= succEnd
                    if (newEnd > succEnd) {
                        violationDays = differenceInDays(newEnd, succEnd);
                    } 
                    // --- HATA BURADAYDI: _ }} YERİNE SADECE } OLMALI ---
                    break;
                case 'SF': // Öncül Başlamalı (newStart), Ardıl Bitmeli (succEnd)
                   // Kural: newStart <= succEnd
                    if (newStart > succEnd) {
                        violationDays = differenceInDays(newStart, succEnd);
                    }
                    break;
            }

            if (violationDays > 0) {
                // İhlal mesajı: Öncül (movedItem), Ardılın kuralını bozuyor.
                return {
                    type: violationType,
                    predecessorName: movedItem.name,
                    successorName: successor.name,
                    violationDays: violationDays,
                    message: `Bu görev ("${movedItem.name}") taşınamaz. Bu hareket, ardıl görev "${successor.name}" için ${violationType} kuralını ${violationDays} gün ihlal etmeye zorlar.`
                };
            }
        }
    }


    return null; // İhlal yok
};