// src/hooks/useGanttSettings.ts

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useAppDispatch } from '../store/hooks';
import { updateBoardViewSettings } from '../store/features/boardViewSlice';
import { ColumnType, type Column, type Item } from '../types';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
// NOT: Bu importların projenizde var olduğunu varsayıyorum, yoksa oluşturulmalı
import { createColumn, deleteColumn } from '../store/features/columnSlice';
import { updateItemValue } from '../store/features/itemSlice';

interface GanttSettings {
    activeTimelineIds?: number[];
    groupByColumnId?: number | null;
    colorByColumnId?: number | null;
    labelById?: number | null;
    // YENİ: Aktif olarak görüntülenen temel çizgi kolonunun ID'si
    activeBaselineId?: number | null;
}

export const useGanttSettings = (
    settingsJson: string | null | undefined,
    boardId: number,
    viewId: number,
    allColumns: Column[],
    columnStatus: 'idle' | 'loading' | 'succeeded' | 'failed',
    items: Item[] // YENİ: Veri kopyalama işlemi için item'lara ihtiyacımız var
) => {
    const dispatch = useAppDispatch();

    // 1. JSON'u parse et
    const settings: GanttSettings = useMemo(() => {
        try {
            return JSON.parse(settingsJson || '{}');
        } catch (e) {
            console.error("Gantt ayarları parse edilemedi:", e);
            return {};
        }
    }, [settingsJson]);

    // 2. Initial Değerler
    const initialTimelineIds = useMemo(() => {
        if (settings.activeTimelineIds && Array.isArray(settings.activeTimelineIds)) {
            return settings.activeTimelineIds.filter(id => allColumns.some(c => c.id === id));
        }
        if (columnStatus === 'succeeded') {
            const firstTimeline = allColumns.find(c => c.type === ColumnType.Timeline);
            return firstTimeline ? [firstTimeline.id] : [];
        }
        return [];
    }, [allColumns, columnStatus, settings.activeTimelineIds]);

    const initialGroupByColumnId = settings.groupByColumnId ?? null;
    const initialColorByColumnId = useMemo(() => {
        // Eğer ayar varsa (null dahil) onu kullan
        if (settings.colorByColumnId !== undefined) return settings.colorByColumnId;

        // ESKİ KOD: Status kolonu bulup onu atıyordu.
        // const defaultStatusCol = allColumns.find(c => c.type === ColumnType.Status);
        // return defaultStatusCol ? defaultStatusCol.id : null;

        // YENİ KOD: Varsayılan olarak her zaman NULL (Renklendirme Yok) olsun.
        return null;
    }, [settings.colorByColumnId]); const initialLabelById = settings.labelById ?? null;

    // YENİ: Baseline Initial
    const initialActiveBaselineId = settings.activeBaselineId ?? null;

    // 3. State'ler
    const [activeTimelineIds, setActiveTimelineIds] = useState<number[]>(initialTimelineIds);
    const [groupByColumnId, setGroupByColumnId] = useState<number | null>(initialGroupByColumnId);
    const [colorByColumnId, setColorByColumnId] = useState<number | null>(initialColorByColumnId);
    const [labelById, setLabelById] = useState<number | null>(initialLabelById);
    // YENİ: Baseline State
    const [activeBaselineId, setActiveBaselineId] = useState<number | null>(initialActiveBaselineId);

    // 4. Senkronizasyon (Settings değişirse state'i güncelle)
    useEffect(() => {
        if (JSON.stringify(activeTimelineIds) !== JSON.stringify(initialTimelineIds)) setActiveTimelineIds(initialTimelineIds);
    }, [initialTimelineIds]);

    useEffect(() => {
        if (groupByColumnId !== initialGroupByColumnId) setGroupByColumnId(initialGroupByColumnId);
    }, [initialGroupByColumnId]);

    useEffect(() => {
        if (colorByColumnId !== initialColorByColumnId) setColorByColumnId(initialColorByColumnId);
    }, [initialColorByColumnId]);

    useEffect(() => {
        if (labelById !== initialLabelById) setLabelById(initialLabelById);
    }, [initialLabelById]);

    // YENİ: Baseline Senkronizasyon
    useEffect(() => {
        if (activeBaselineId !== initialActiveBaselineId) setActiveBaselineId(initialActiveBaselineId);
    }, [initialActiveBaselineId]);


    // 5. Kaydetme Handler'ı (Generic)
    const updateSettings = useCallback((newPartialSettings: Partial<GanttSettings>) => {
        const newSettings: GanttSettings = {
            activeTimelineIds,
            groupByColumnId,
            colorByColumnId,
            labelById,
            activeBaselineId,
            ...newPartialSettings
        };

        dispatch(updateBoardViewSettings({
            boardId,
            viewId,
            payload: { settingsJson: JSON.stringify(newSettings) }
        }));
    }, [dispatch, boardId, viewId, activeTimelineIds, groupByColumnId, colorByColumnId, labelById, activeBaselineId]);

    // Spesifik Handler'lar
    const handleTimelineColumnChange = (ids: number[]) => {
        setActiveTimelineIds(ids);
        updateSettings({ activeTimelineIds: ids });
    };
    const handleGroupByColumnChange = (id: number | null) => {
        setGroupByColumnId(id);
        updateSettings({ groupByColumnId: id });
    };
    const handleColorByColumnChange = (id: number | null) => {
        setColorByColumnId(id);
        updateSettings({ colorByColumnId: id });
    };
    const handleLabelByChange = (id: number | null) => {
        setLabelById(id);
        updateSettings({ labelById: id });
    };
    // YENİ: Baseline Değişimi
    const handleBaselineChange = (id: number | null) => {
        setActiveBaselineId(id);
        updateSettings({ activeBaselineId: id });
    };

    // YENİ: YENİ TEMEL ÇİZGİ OLUŞTURMA MANTIĞI
    const handleCreateBaseline = async () => {
        if (activeTimelineIds.length === 0) {
            alert("Lütfen önce bir kaynak zaman çizelgesi seçin.");
            return;
        }
        const sourceColumnId = activeTimelineIds[0];
        const sourceColumn = allColumns.find(c => c.id === sourceColumnId);
        if (!sourceColumn) return;

        const now = new Date();
        const dateStr = format(new Date(), 'd MMM yyyy', { locale: tr });
        let newTitle = `Temel Çizgi: ${dateStr}`;

        // 2. Adım: Çakışma Kontrolü
        // Eğer bu isimde bir kolon zaten varsa, isme saat ve dakika ekle
        const isDuplicate = allColumns.some(col => col.title === newTitle && col.type === ColumnType.Timeline);

        if (isDuplicate) {
            const timeStr = format(now, 'HH:mm');
            newTitle = `Temel Çizgi: ${dateStr} ${timeStr}`;
        }

        try {
            // 1. Yeni Kolon Oluştur (Timeline Tipinde)
            const createColAction = await dispatch(createColumn({
                boardId,
                columnData: {
                    title: newTitle,
                    type: ColumnType.Timeline
                }
            })).unwrap();

            const newColId = createColAction.id;

            // 2. Mevcut verileri kopyala
            // Not: Bu işlem idealde backend'de tek bir endpoint ile yapılmalıdır ("duplicateColumn").
            // Ancak frontend tarafında yapıyorsak döngü kurmalıyız.
            const updatePromises: Promise<any>[] = [];

            items.forEach(item => {
                const sourceValue = item.itemValues.find(v => v.columnId === sourceColumnId)?.value;
                if (sourceValue) {
                    updatePromises.push(dispatch(updateItemValue({
                        itemId: item.id,
                        columnId: newColId,
                        value: sourceValue
                    })).unwrap());
                }
            });

            await Promise.all(updatePromises);

            // 3. Yeni oluşturulan kolonu aktif baseline olarak ayarla
            handleBaselineChange(newColId);

            alert(`${newTitle} başarıyla oluşturuldu.`);

        } catch (error) {
            console.error("Temel çizgi oluşturulurken hata:", error);
            alert("Temel çizgi oluşturulamadı.");
        }
    };

    // --- SİLME HANDLER'I ---
    const handleDeleteBaseline = async (columnId: number) => {
        try {
            await dispatch(deleteColumn({ boardId, columnId })).unwrap();
            // Eğer silinen baseline şu an aktif olarak seçiliyse, seçimi kaldır
            if (activeBaselineId === columnId) {
                handleBaselineChange(null);
            }
        } catch (error) {
            console.error("Temel çizgi silinemedi:", error);
            alert("Temel çizgi silinirken bir hata oluştu.");
        }
    };

    return {
        settingsState: {
            activeTimelineIds,
            groupByColumnId,
            colorByColumnId,
            labelById,
            activeBaselineId, // Dışarı aktar
            setActiveTimelineIds,
            setGroupByColumnId,
            setColorByColumnId,
            setLabelById,
            setActiveBaselineId
        },
        settingsHandlers: {
            handleTimelineColumnChange,
            handleGroupByColumnChange,
            handleColorByColumnChange,
            handleLabelByChange,
            handleBaselineChange,
            handleCreateBaseline,
            handleDeleteBaseline
        }
    };
};