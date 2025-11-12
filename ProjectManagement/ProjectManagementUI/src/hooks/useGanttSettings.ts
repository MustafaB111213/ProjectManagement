// src/hooks/useGanttSettings.ts (YENİ DOSYA)

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useAppDispatch } from '../store/hooks';
import { updateBoardViewSettings } from '../store/features/boardViewSlice';
import { ColumnType, type Column } from '../types';

interface GanttSettings {
    activeTimelineIds?: number[];
    groupByColumnId?: number | null;
    colorByColumnId?: number | null;
    labelById?: number | null;
}

/**
 * Gantt ayarlarını (settingsJson) yönetir, state'e dönüştürür ve
 * değişiklikleri Redux'a geri kaydeder.
 */
export const useGanttSettings = (
    settingsJson: string | null | undefined,
    boardId: number,
    viewId: number,
    allColumns: Column[],
    columnStatus: 'idle' | 'loading' | 'succeeded' | 'failed'
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

    // 2. Ayarları 'initial' değerlere dönüştür
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

    const initialGroupByColumnId = useMemo(() => {
        return settings.groupByColumnId !== undefined ? settings.groupByColumnId : null;
    }, [settings.groupByColumnId]);

    const initialColorByColumnId = useMemo(() => {
        if (settings.colorByColumnId !== undefined) return settings.colorByColumnId;
        const defaultStatusCol = allColumns.find(c => c.type === ColumnType.Status);
        return defaultStatusCol ? defaultStatusCol.id : null;
    }, [settings.colorByColumnId, allColumns]);

    const initialLabelById = useMemo(() => {
        return settings.labelById !== undefined ? settings.labelById : null;
    }, [settings.labelById]);

    // 3. State'leri tanımla
    const [activeTimelineIds, setActiveTimelineIds] = useState<number[]>(initialTimelineIds);
    const [groupByColumnId, setGroupByColumnId] = useState<number | null>(initialGroupByColumnId);
    const [colorByColumnId, setColorByColumnId] = useState<number | null>(initialColorByColumnId);
    const [labelById, setLabelById] = useState<number | null>(initialLabelById);

    // 4. State'leri JSON'dan gelen değişikliklerle senkronize et
    useEffect(() => {
        if (JSON.stringify(activeTimelineIds) !== JSON.stringify(initialTimelineIds)) {
            setActiveTimelineIds(initialTimelineIds);
        }
    }, [initialTimelineIds]); // 'activeTimelineIds' kaldırıldı

    useEffect(() => {
        const newId = settings.groupByColumnId !== undefined ? settings.groupByColumnId : null;
        if (groupByColumnId !== newId) setGroupByColumnId(newId);
    }, [settings.groupByColumnId]); // 'groupByColumnId' kaldırıldı

    useEffect(() => {
        const newId = settings.colorByColumnId !== undefined ? settings.colorByColumnId : initialColorByColumnId;
        if (colorByColumnId !== newId) setColorByColumnId(newId);
    }, [settings.colorByColumnId, initialColorByColumnId]); // 'colorByColumnId' kaldırıldı

    useEffect(() => {
        const newId = settings.labelById !== undefined ? settings.labelById : null;
        if (labelById !== newId) setLabelById(newId);
    }, [settings.labelById]); // 'labelById' kaldırıldı

    // 5. Ayarları Redux'a kaydeden Handler'lar
    const createSettingsUpdater = <K extends keyof GanttSettings>(key: K) => {
        return useCallback((newValue: GanttSettings[K]) => {
            const newSettings: GanttSettings = {
                ...settings,
                [key]: newValue
            };
            dispatch(updateBoardViewSettings({
                boardId: boardId,
                viewId: viewId,
                payload: { settingsJson: JSON.stringify(newSettings) }
            }));
        }, [dispatch, boardId, viewId, settings, key]);
    };

    const handleTimelineColumnChange = createSettingsUpdater('activeTimelineIds');
    const handleGroupByColumnChange = createSettingsUpdater('groupByColumnId');
    const handleColorByColumnChange = createSettingsUpdater('colorByColumnId');
    const handleLabelByChange = createSettingsUpdater('labelById');

    // 6. Hook'tan değerleri ve handler'ları döndür
    return {
        settingsState: {
            activeTimelineIds,
            groupByColumnId,
            colorByColumnId,
            labelById,
            setActiveTimelineIds, // Ayar panelinin anlık güncellemesi için
            setGroupByColumnId,
            setColorByColumnId,
            setLabelById
        },
        settingsHandlers: {
            handleTimelineColumnChange,
            handleGroupByColumnChange,
            handleColorByColumnChange,
            handleLabelByChange
        }
    };
};