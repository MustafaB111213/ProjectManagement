// src/utils/ganttDependencies.ts (HATALARI GİDERİLMİŞ VERSİYON)

import { differenceInDays, parseISO, isValid, addDays, differenceInCalendarDays, addBusinessDays, differenceInBusinessDays, format } from 'date-fns';
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

// Gerekli importlar (Date-fns vb. varsayılmıştır)

export const calculateCriticalPath = (
    items: Item[],
    allColumns: Column[]
): Set<number> => {

    // --- DEBUG FLAG (Canlıya alırken false yaparsın) ---
    const DEBUG = false;

    if (DEBUG) console.group('🚀 CPM Hesaplama Başladı');

    const criticalItemIds = new Set<number>();

    const timelineColumnId = allColumns.find(c => c.type === ColumnType.Timeline)?.id;
    const dependencyColumnId = allColumns.find(c => c.type === ColumnType.Dependency)?.id;

    if (!timelineColumnId || !dependencyColumnId) {
        if (DEBUG) console.warn('Kolonlar bulunamadı!');
        return criticalItemIds;
    }

    // ... Interface Node (Aynı kalıyor) ...
    interface Node {
        id: number;
        earlyStart: Date;
        earlyFinish: Date;
        lateStart: Date | null;
        lateFinish: Date | null;
        duration: number;
        predecessors: { id: number; type: string }[];
        successors: { id: number; type: string }[];
    }

    const nodes = new Map<number, Node>();
    let projectEnd = new Date(0);

    // 1) NODE OLUŞTURMA
    for (const item of items) {
        // ... (Senin kodundaki parse işlemleri aynı) ...
        const tVal = item.itemValues.find(v => v.columnId === timelineColumnId)?.value;
        if (!tVal) continue;

        let startStr, endStr;
        try {
            const parsed = JSON.parse(tVal);
            startStr = parsed.from;
            endStr = parsed.to;
        } catch {
            [startStr, endStr] = tVal.split('/');
        }

        const start = parseISO(startStr);
        const end = parseISO(endStr);
        if (!isValid(start) || !isValid(end)) continue;

        const duration = differenceInCalendarDays(end, start) + 1;

        nodes.set(item.id, {
            id: item.id,
            earlyStart: start,
            earlyFinish: end,
            lateStart: null,
            lateFinish: null,
            duration,
            predecessors: [],
            successors: []
        });

        if (end > projectEnd) projectEnd = end;
    }

    if (DEBUG) console.log(`📋 Toplam Node Sayısı: ${nodes.size}, İlk Project End: ${format(projectEnd, 'yyyy-MM-dd')}`);

    // 2) BAĞIMLILIKLAR
    for (const item of items) {
        // ... (Senin kodundaki link işlemleri aynı) ...
        const dVal = item.itemValues.find(v => v.columnId === dependencyColumnId)?.value;
        if (!dVal) continue;
        try {
            const links: DependencyLink[] = JSON.parse(dVal);
            for (const link of links) {
                const pred = nodes.get(link.id);
                const succ = nodes.get(item.id);
                if (pred && succ) {
                    pred.successors.push({ id: item.id, type: link.type });
                    succ.predecessors.push({ id: link.id, type: link.type });
                }
            }
        } catch { }
    }

    // 3) FORWARD PASS (ES & EF)
    if (DEBUG) console.groupCollapsed('➡️ Forward Pass Detayları');

    // Sort işlemi kritik: Tarihe göre sıralamak %100 garanti vermez (topological sort daha iyidir) 
    // ama CPM için genelde yeterlidir.
    const sortedForward = Array.from(nodes.values()).sort(
        (a, b) => a.earlyStart.getTime() - b.earlyStart.getTime()
    );

    for (const node of sortedForward) {
        if (node.predecessors.length > 0) {
            let maxEF = new Date(0);

            // Loglama için pred ID'lerini topla
            const predIds = node.predecessors.map(p => p.id);

            for (const predLink of node.predecessors) {
                const pred = nodes.get(predLink.id);
                if (!pred) continue;
                if (pred.earlyFinish > maxEF) {
                    maxEF = pred.earlyFinish;
                }
            }

            const oldES = node.earlyStart;
            node.earlyStart = addDays(maxEF, 1);
            node.earlyFinish = addDays(node.earlyStart, node.duration - 1);

            if (DEBUG && oldES.getTime() !== node.earlyStart.getTime()) {
                console.log(`Node ${node.id} ötelendi. Preds: [${predIds}]. Yeni ES: ${format(node.earlyStart, 'MM-dd')}`);
            }
        }
    }

    // Proje sonunu güncelle
    projectEnd = new Date(0);
    nodes.forEach(node => {
        if (node.earlyFinish > projectEnd) projectEnd = node.earlyFinish;
    });

    if (DEBUG) {
        console.log(`🏁 Forward Pass Sonrası Project End: ${format(projectEnd, 'yyyy-MM-dd')}`);
        console.groupEnd();
    }

    // 4) BACKWARD PASS (LS & LF)
    if (DEBUG) console.groupCollapsed('⬅️ Backward Pass Detayları');

    const sortedBackward = Array.from(nodes.values()).sort(
        (a, b) => b.earlyFinish.getTime() - a.earlyFinish.getTime()
    );

    for (const node of sortedBackward) {
        // Ardıl yoksa veya proje sonundaysa
        if (node.successors.length === 0) {
            node.lateFinish = projectEnd;
            node.lateStart = addDays(projectEnd, -(node.duration - 1));
            continue;
        }

        let minLS = new Date(8640000000000000);
        for (const succLink of node.successors) {
            const succ = nodes.get(succLink.id);
            if (!succ || succ.lateStart === null) continue;
            if (succ.lateStart < minLS) {
                minLS = succ.lateStart;
            }
        }

        // Eğer minLS değişmediyse (bütün ardıllar hesaplanamadıysa - nadir durum)
        if (minLS.getTime() === 8640000000000000) {
            node.lateFinish = projectEnd; // Fallback
        } else {
            node.lateFinish = addDays(minLS, -1);
        }

        node.lateStart = addDays(node.lateFinish, -(node.duration - 1));
    }
    if (DEBUG) console.groupEnd();

    // 5) FLOAT HESABI & TABLO GÖRÜNTÜLEME
    const debugTableData: any[] = [];

    nodes.forEach(node => {
        if (node.lateStart && node.earlyStart) {
            const float = differenceInDays(node.lateStart, node.earlyStart);

            if (float === 0) {
                criticalItemIds.add(node.id);
            }

            if (DEBUG) {
                debugTableData.push({
                    ID: node.id,
                    Duration: node.duration,
                    ES: format(node.earlyStart, 'yyyy-MM-dd'),
                    EF: format(node.earlyFinish, 'yyyy-MM-dd'),
                    LS: node.lateStart ? format(node.lateStart, 'yyyy-MM-dd') : 'N/A',
                    LF: node.lateFinish ? format(node.lateFinish, 'yyyy-MM-dd') : 'N/A',
                    FLOAT: float,
                    CRITICAL: float === 0 ? '🔥 YES' : 'NO',
                    Preds: node.predecessors.map(p => p.id).join(','),
                    Succs: node.successors.map(s => s.id).join(',')
                });
            }
        }
    });

    if (DEBUG) {
        console.table(debugTableData);
        console.groupEnd(); // CPM Bitiş
    }

    return criticalItemIds;
};
