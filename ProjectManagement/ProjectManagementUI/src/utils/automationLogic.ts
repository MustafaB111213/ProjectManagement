// src/utils/automationLogic.ts

import { type Item, type Column, ColumnType, type DependencyLink, type Group } from '../types';
import { format, parseISO, isValid, differenceInCalendarDays } from 'date-fns';
import { calculateCascadingChanges } from './ganttDependencies';

// Otomasyonun sonuç paketi
export interface AutomationResult {
    updates: { itemId: number; columnId: number; value: string }[]; // Hücre değişiklikleri
    moveAction?: { itemId: number; targetGroupId: number };         // Taşıma emri
    notification?: string;                                          // Bildirim mesajı
}

export const calculateStatusChangeEffects = (
    itemId: number,
    newStatus: string,
    items: Item[],
    columns: Column[],
    groups: Group[] // <-- YENİ: Grupları da parametre olarak alıyoruz
): AutomationResult => {

    console.log(`🤖 Otomasyon Tetiklendi: Item ${itemId} -> ${newStatus}`);

    const updates: { itemId: number; columnId: number; value: string }[] = [];
    let moveAction: { itemId: number; targetGroupId: number } | undefined;
    let notification: string | undefined;

    // 1. Gerekli Kolonları Bul
    const statusColumn = columns.find(c => c.type === ColumnType.Status);
    const dependencyColumn = columns.find(c => c.type === ColumnType.Dependency);
    // NOT: Buradaki tanımlamalar zaten var, sadece referans olsun diye koydum
    const timelineColumn = columns.find(c => c.type === ColumnType.Timeline);
    // "Gerçekleşen" veya "Actual" isminde bir tarih kolonu arıyoruz
    const actualDateColumn = columns.find(c =>
        c.type === ColumnType.Date &&
        (c.title.toLowerCase().includes('gerçekleşen') || c.title.toLowerCase().includes('actual'))
    );

    if (!statusColumn) return { updates: [] };

    // Kendi statüsünü güncelleme emrini listeye ekle
    updates.push({ itemId, columnId: statusColumn.id, value: newStatus });

    const isCompleted = newStatus === 'Tamamlandı' || newStatus === 'Done' || newStatus === 'Bitti';

    if (isCompleted) {
        // --- SENARYO 1: GERÇEKLEŞEN BİTİŞ TARİHİ ---
        if (actualDateColumn) {
            // HTML date input formatı: yyyy-MM-dd
            const todayStr = format(new Date(), 'yyyy-MM-dd');
            updates.push({
                itemId,
                columnId: actualDateColumn.id,
                value: todayStr
            });
            console.log(`📅 Tarih Basıldı: ${todayStr} -> ${actualDateColumn.title}`);
        }

        // --- SENARYO 2: BAĞIMLILIK ÇÖZME (UNBLOCKING) ---
        if (dependencyColumn) {
            items.forEach(otherItem => {
                if (otherItem.id === itemId) return;
                const depVal = otherItem.itemValues.find(v => v.columnId === dependencyColumn.id)?.value;

                if (depVal) {
                    try {
                        const links: DependencyLink[] = JSON.parse(depVal);
                        const isDependent = links.some(l => l.id === itemId);

                        if (isDependent) {
                            const currentStatusVal = otherItem.itemValues.find(v => v.columnId === statusColumn.id)?.value;
                            // Bloklanmış durumdaysa aç
                            const blockedStatuses = ['Beklemede', 'Takıldı', 'Planlandı', 'Belirsiz'];
                            if (blockedStatuses.includes(currentStatusVal || '')) {
                                updates.push({
                                    itemId: otherItem.id,
                                    columnId: statusColumn.id,
                                    value: 'Yapılıyor'
                                });
                                // Bağımlı görev sahibine bildirim
                                console.log(`🔓 Görev Kilidi Açıldı: ${otherItem.name}`);
                            }
                        }
                    } catch (e) { }
                }
            });
        }

        // --- SENARYO 5: TARİH KAYDIRMA (AUTO-SCHEDULE / EARLY FINISH) ---
        if (timelineColumn && dependencyColumn) {
            const currentItem = items.find(i => i.id === itemId);
            const timelineVal = currentItem?.itemValues.find(v => v.columnId === timelineColumn.id)?.value;

            if (timelineVal && currentItem) {
                const [startStr, endStr] = timelineVal.split('/');
                const plannedEnd = parseISO(endStr);
                const plannedStart = parseISO(startStr);
                const today = new Date();

                // Eğer bugün, planlanan bitişten ÖNCEYSE (Erken Bitiş)
                // Örn: Plan: 5 Aralık, Bugün: 1 Aralık -> Fark: -4 gün
                const daysDiff = differenceInCalendarDays(today, plannedEnd);

                if (isValid(plannedEnd) && daysDiff < 0) {
                    console.log(`⚡ Erken Bitiş Tespit Edildi: ${daysDiff} gün kazanıldı.`);

                    // Simülasyon: Sanki kullanıcı Gantt şemasında bu görevin bitişini
                    // bugüne (kısaltarak) çekmiş gibi hesaplama yapıyoruz.
                    const simulatedNewEnd = today;
                    const simulatedNewStart = plannedStart; // Başlangıç sabit kalsın

                    // Mevcut Gantt motorunu kullanarak ardılları hesapla
                    const cascadingUpdates = calculateCascadingChanges(
                        itemId,
                        simulatedNewStart,
                        simulatedNewEnd,
                        items,
                        columns
                    );

                    // Hesaplanan yeni tarihleri güncelleme paketine ekle
                    cascadingUpdates.forEach(u => {
                        // KENDİSİNİ GÜNCELLEME: Tamamlanan görevin "Planlanan" tarihi değişmesin (Raporlama için).
                        // SADECE ARDILLARI (Successors) güncelle.
                        if (u.itemId !== itemId) {
                            const valStr = `${format(u.newStartDate, 'yyyy-MM-dd')}/${format(u.newEndDate, 'yyyy-MM-dd')}`;

                            updates.push({
                                itemId: u.itemId,
                                columnId: timelineColumn.id,
                                value: valStr
                            });

                            console.log(`⏩ Otomatik Kaydırma: Item ${u.itemId} yeni tarih: ${valStr}`);
                        }
                    });

                    if (cascadingUpdates.length > 0) {
                        // Eğer bildirim mesajı yoksa ekle, varsa üzerine ek bilgi koy
                        const extraMsg = `ve ${cascadingUpdates.length - 1} ardıl görev öne çekildi.`;
                        notification = notification
                            ? `${notification} (${extraMsg})`
                            : `Görev tamamlandı ${extraMsg}`;
                    }
                }
            }
        }

        // // --- SENARYO 3: OTOMATİK TAŞIMA (MOVE TO COMPLETED) ---
        // // "Tamamlananlar" veya "Done" isminde bir grup var mı?
        // const completedGroup = groups.find(g => 
        //     g.title.toLowerCase().includes('tamamlananlar') || 
        //     g.title.toLowerCase() === 'done' ||
        //     g.title.toLowerCase() === 'completed'
        // );

        // // Eğer böyle bir grup varsa ve öğe zaten orada değilse
        // const currentItem = items.find(i => i.id === itemId);
        // if (completedGroup && currentItem && currentItem.groupId !== completedGroup.id) {
        //     moveAction = {
        //         itemId: itemId,
        //         targetGroupId: completedGroup.id
        //     };
        //     console.log(`🚚 Taşıma Emri Oluşturuldu: ${currentItem.name} -> ${completedGroup.title}`);
        // }


    }
    return { updates, moveAction, notification };
};