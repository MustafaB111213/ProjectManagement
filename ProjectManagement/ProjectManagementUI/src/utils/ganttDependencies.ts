// src/utils/ganttDependencies.ts (HATALARI GİDERİLMİŞ VERSİYON)

import { differenceInDays, parseISO, isValid, addDays, differenceInCalendarDays } from 'date-fns';
// types.ts dosyanızın yoluna göre '..' sayısını ayarlamanız gerekebilir
import { type Item, type DependencyLink, type Column, ColumnType } from '../types';

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

/**
 * Mod 3: Zincirleme Hareket (Auto Schedule - Göreceli Öteleme)
 * Öncül görev ne kadar oynarsa (Delta), ardıl görev de mevcut boşluğunu koruyarak
 * o kadar oynar.
 */
export const calculateCascadingChanges = (
    rootItemId: number,
    rootNewStart: Date,
    rootNewEnd: Date,
    allItems: Item[],
    allColumns: Column[]
): UpdatedTaskData[] => {

    const dependencyColumnId = allColumns.find(c => c.type === ColumnType.Dependency)?.id;
    const timelineColumnId = allColumns.find(c => c.type === ColumnType.Timeline)?.id;

    if (!dependencyColumnId || !timelineColumnId) return [];

    const updates: UpdatedTaskData[] = [];
    const processedItems = new Set<number>();

    // Kuyrukta hem yeni tarihleri hem de referans (eski) tarihleri tutuyoruz
    // Böylece ne kadar oynadığını (delta) hesaplayabiliriz.
    interface QueueItem {
        id: number;
        newStart: Date;
        newEnd: Date;
        oldStart: Date; // Delta hesabı için gerekli
        oldEnd: Date;   // Delta hesabı için gerekli
    }

    // Root item'ın eski tarihlerini bul
    const rootItem = allItems.find(i => i.id === rootItemId);
    if (!rootItem) return [];

    const rootVal = rootItem.itemValues.find(v => v.columnId === timelineColumnId)?.value;
    if (!rootVal) return [];
    const [rStartStr, rEndStr] = rootVal.split('/');
    const rootOldStart = parseISO(rStartStr);
    const rootOldEnd = parseISO(rEndStr);

    const queue: QueueItem[] = [];

    queue.push({
        id: rootItemId,
        newStart: rootNewStart,
        newEnd: rootNewEnd,
        oldStart: rootOldStart,
        oldEnd: rootOldEnd
    });

    processedItems.add(rootItemId);

    while (queue.length > 0) {
        const current = queue.shift()!;

        // Bu göreve bağlı ardılları bul
        const successors = allItems.filter(item => {
            if (item.id === current.id) return false;
            const depVal = item.itemValues.find(v => v.columnId === dependencyColumnId)?.value;
            if (!depVal) return false;
            try {
                const links: DependencyLink[] = JSON.parse(depVal);
                return links.some(link => link.id === current.id);
            } catch { return false; }
        });

        for (const successor of successors) {
            if (processedItems.has(successor.id)) continue;

            // Ardılın MEVCUT (Eski) tarihlerini al
            const timelineVal = successor.itemValues.find(v => v.columnId === timelineColumnId)?.value;
            if (!timelineVal) continue;

            const [succOldStartStr, succOldEndStr] = timelineVal.split('/');
            const succOldStart = parseISO(succOldStartStr);
            const succOldEnd = parseISO(succOldEndStr);

            const duration = differenceInCalendarDays(succOldEnd, succOldStart);

            // Bağımlılık tipini bul
            const depVal = successor.itemValues.find(v => v.columnId === dependencyColumnId)?.value;
            const links: DependencyLink[] = JSON.parse(depVal!);
            const linkToCurrent = links.find(l => l.id === current.id);

            if (!linkToCurrent) continue;

            let moveDelta = 0;

            // --- DELTA MANTIĞI ---
            // Öncülün HANGİ tarafı değiştiyse, o değişimi (farkı) ardıla yansıt.
            // Bu sayede aradaki boşluk (Gap) ne ise o korunur.

            switch (linkToCurrent.type) {
                case 'FS':
                    // Öncül Bitiş -> Ardıl Başlangıç
                    // Öncülün BİTİŞ tarihi ne kadar oynadı?
                    moveDelta = differenceInCalendarDays(current.newEnd, current.oldEnd);
                    break;

                case 'SS':
                    // Öncül Başlangıç -> Ardıl Başlangıç
                    // Öncülün BAŞLANGIÇ tarihi ne kadar oynadı?
                    moveDelta = differenceInCalendarDays(current.newStart, current.oldStart);
                    break;

                case 'FF':
                    // Öncül Bitiş -> Ardıl Bitiş
                    // Öncülün BİTİŞ tarihi ne kadar oynadı?
                    moveDelta = differenceInCalendarDays(current.newEnd, current.oldEnd);
                    break;

                case 'SF':
                    // Öncül Başlangıç -> Ardıl Bitiş
                    // Öncülün BAŞLANGIÇ tarihi ne kadar oynadı?
                    moveDelta = differenceInCalendarDays(current.newStart, current.oldStart);
                    break;
            }

            // Eğer bir hareket varsa (İleri veya Geri fark etmez)
            if (moveDelta !== 0) {
                const newSuccStart = addDays(succOldStart, moveDelta);
                const newSuccEnd = addDays(newSuccStart, Math.abs(duration)); // Süreyi koru

                updates.push({
                    itemId: successor.id,
                    newStartDate: newSuccStart,
                    newEndDate: newSuccEnd
                });

                // Zincirleme devam etsin diye kuyruğa ekle
                queue.push({
                    id: successor.id,
                    newStart: newSuccStart,
                    newEnd: newSuccEnd,
                    oldStart: succOldStart, // Bir sonraki adım için referans
                    oldEnd: succOldEnd     // Bir sonraki adım için referans
                });

                processedItems.add(successor.id);
            }
        }
    }

    return updates;
};

/**
 * MONDAY.COM UYUMLU KRİTİK YOL ALGORİTMASI (Genişletilmiş Tolerans)
 * * Bu algoritma Total Float (Bolluk) mantığını kullanır.
 * Ancak hafta sonları ve gün geçişlerinin zinciri koparmaması için 
 * tolerans aralığı genişletilmiştir (3 Gün).
 */
export const calculateCriticalPath = (
    items: Item[], 
    allColumns: Column[]
): Set<number> => {
    const criticalItemIds = new Set<number>();

    const timelineColumnId = allColumns.find(c => c.type === ColumnType.Timeline)?.id;
    const dependencyColumnId = allColumns.find(c => c.type === ColumnType.Dependency)?.id;

    if (!timelineColumnId || !dependencyColumnId) return criticalItemIds;

    // 1. Veri Yapısını Hazırla
    interface Node {
        id: number;
        start: Date;     // Date objesi olarak tutuyoruz
        end: Date;       // Date objesi
        durationDays: number; 
        successors: { id: number; type: string }[];
    }

    const nodes = new Map<number, Node>();
    // Projenin en son bitiş tarihini Date objesi olarak tutalım
    let projectEndDate: Date = new Date(0); 

    // Node'ları oluştur
    items.forEach(item => {
        const tValue = item.itemValues.find(v => v.columnId === timelineColumnId)?.value;
        if (!tValue) return;

        const [sStr, eStr] = tValue.split('/');
        if (!sStr || !eStr) return;

        const start = parseISO(sStr);
        const end = parseISO(eStr);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) return;

        // Projenin en son bitiş zamanını güncelle
        if (end > projectEndDate) {
            projectEndDate = end;
        }

        // Duration (Gün bazında +1 ekliyoruz çünkü Gantt'ta başlangıç ve bitiş dahildir)
        // Örn: 1'inde başlayıp 1'inde biten iş 1 gündür. (1 - 1 = 0 olmamalı)
        const duration = differenceInCalendarDays(end, start); 

        nodes.set(item.id, {
            id: item.id,
            start,
            end,
            durationDays: duration,
            successors: []
        });
    });

    // Dependency Bağlarını Kur
    items.forEach(item => { 
        const dValue = item.itemValues.find(v => v.columnId === dependencyColumnId)?.value;
        if (!dValue) return;
        try {
            const links: DependencyLink[] = JSON.parse(dValue);
            links.forEach(link => {
                const predecessorNode = nodes.get(link.id);
                if (predecessorNode) {
                    predecessorNode.successors.push({ id: item.id, type: link.type });
                }
            });
        } catch {}
    });

    // 2. Backward Pass (Geriye Doğru Hesaplama)
    const lateFinishMap = new Map<number, Date>();
    const processingSet = new Set<number>();

    const getLateFinish = (nodeId: number): Date => {
        if (lateFinishMap.has(nodeId)) return lateFinishMap.get(nodeId)!;
        if (processingSet.has(nodeId)) return projectEndDate;
        
        processingSet.add(nodeId);
        
        const node = nodes.get(nodeId);
        if (!node) {
            processingSet.delete(nodeId);
            return projectEndDate;
        }

        // Ardılı yoksa Late Finish = Proje Bitiş Tarihi
        if (node.successors.length === 0) {
            lateFinishMap.set(nodeId, projectEndDate);
            processingSet.delete(nodeId);
            return projectEndDate;
        }

        // Min Late Finish hesapla
        // Başlangıçta çok uzak bir tarih atıyoruz
        let minLateFinish = new Date(8640000000000000); // Max Date

        node.successors.forEach(succ => {
            const succNode = nodes.get(succ.id);
            if (!succNode) return;

            const succLF = getLateFinish(succ.id);
            // Successor Late Start = Successor Late Finish - Duration
            const succLS = addDays(succLF, -succNode.durationDays);

            let constraintLF = minLateFinish;

            switch (succ.type) {
                case 'FS': 
                    // Bizim LF <= Ardıl LS
                    constraintLF = succLS; 
                    break;
                case 'SS': 
                    // Bizim LF <= Ardıl LS + Duration
                    constraintLF = addDays(succLS, node.durationDays);
                    break;
                case 'FF': 
                    // Bizim LF <= Ardıl LF
                    constraintLF = succLF;
                    break;
                case 'SF': 
                    // Bizim LF <= Ardıl LF + Duration
                    constraintLF = addDays(succLF, node.durationDays);
                    break;
                default: 
                    constraintLF = succLS;
            }

            if (constraintLF < minLateFinish) {
                minLateFinish = constraintLF;
            }
        });

        // Eğer tarih değişmediyse (constraint yoksa) proje sonunu al
        if (minLateFinish.getTime() === 8640000000000000) {
             minLateFinish = projectEndDate;
        }

        lateFinishMap.set(nodeId, minLateFinish);
        processingSet.delete(nodeId);
        return minLateFinish;
    };

    // 3. Float Hesapla ve Tolerans Kontrolü
    
    // MONDAY.COM DAVRANIŞI İÇİN KRİTİK AYAR:
    // Toleransı 3 gün (veya 4 gün) olarak belirliyoruz.
    // Bu sayede Cuma biten -> Pazartesi başlayan görevler (arada 2 gün boşluk olsa da)
    // zinciri koparmaz ve kırmızı kalır.
    const FLOAT_TOLERANCE_DAYS = 3; 

    nodes.forEach(node => {
        const lateFinish = getLateFinish(node.id);
        
        // Float = Late Finish - Early Finish (Mevcut Bitiş)
        const floatDays = differenceInCalendarDays(lateFinish, node.end);
        
        // Eğer bolluk 3 günden azsa, bu görev kritiktir.
        // (Haftasonu boşluklarını yutmak için)
        if (floatDays <= FLOAT_TOLERANCE_DAYS) {
            criticalItemIds.add(node.id);
        }
    });

    return criticalItemIds;
};