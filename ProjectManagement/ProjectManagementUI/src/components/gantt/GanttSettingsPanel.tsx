// src/components/gantt/GanttSettingsPanel.tsx

import React, { useMemo } from 'react';
import { FiSettings, FiCheck, FiPlus, FiEye, FiEyeOff, FiTrash2 } from 'react-icons/fi';
import CollapsibleStep from './CollapsibleStep';
import { ColumnType, type Column } from '../../types';

interface GanttSettingsPanelProps {
    openSection: 'baseline' | string | null;
    allColumns: Column[];
    activeTimelineIds: number[];
    onTimelineColumnChange: (columnIds: number[]) => void;
    groupByColumnId: number | null;
    onGroupByColumnChange: (columnId: number | null) => void;
    colorByColumnId: number | null;
    onColorByColumnChange: (columnId: number | null) => void;
    labelById: number | null;
    onLabelByChange: (labelId: number | null) => void;

    activeBaselineId: number | null;
    onBaselineChange: (columnId: number | null) => void;
    onCreateBaseline: () => void;
    onDeleteBaseline: (columnId: number) => void;
}

const GanttSettingsPanel: React.FC<GanttSettingsPanelProps> = ({
    openSection,
    allColumns,
    activeTimelineIds,
    onTimelineColumnChange,
    groupByColumnId,
    onGroupByColumnChange,
    colorByColumnId,
    onColorByColumnChange,
    labelById,
    onLabelByChange,
    activeBaselineId,
    onBaselineChange,
    onCreateBaseline,
    onDeleteBaseline
}) => {

    // 1. Ana Zaman Çizelgesi Seçenekleri (Tüm Timeline kolonları)
    const timelineColumns = useMemo(() =>
        allColumns.filter(c => c.type === ColumnType.Timeline),
        [allColumns]);

    // 2. Baseline Seçenekleri (FİLTRELENDİ)
    const baselineOptions = useMemo(() =>
        allColumns.filter(c =>
            // Kural 1: Tipi Timeline olmalı
            c.type === ColumnType.Timeline &&
            // Kural 2: İsmi "Temel Çizgi:" ile başlamalı (Otomatik oluşturulanlar)
            // Not: Eğer kullanıcı adını değiştirirse listeden düşer, 
            // bu istenen bir davranışsa bu kontrol kalabilir.
            c.title.startsWith("Temel Çizgi:")
        ),
        [allColumns]);

    const categoricalColumns = useMemo(() =>
        allColumns.filter(c => c.type === ColumnType.Status),
        [allColumns]);

    const labelableColumns = useMemo(() =>
        allColumns.filter(c =>
            c.type === ColumnType.Status ||
            c.type === ColumnType.Person ||
            c.type === ColumnType.Date ||
            c.type === ColumnType.Timeline
        ),
        [allColumns]);

    // ... (Diğer handlerlar aynı)
    const handleToggleColumn = (columnId: number) => {
        const isCurrentlyActive = activeTimelineIds.includes(columnId);
        let newIds: number[];
        if (isCurrentlyActive) {
            newIds = activeTimelineIds.filter(id => id !== columnId);
        } else {
            newIds = [...activeTimelineIds, columnId];
        }
        if (newIds.length === 0) {
            alert("En az bir zaman çizelgesi seçilmelidir.");
            return;
        }
        onTimelineColumnChange(newIds);
    };

    const getOptionClassName = (isSelected: boolean) => {
        return `flex items-center justify-between w-full px-3 py-2.5 text-sm text-left
        ${isSelected ? 'text-indigo-600 font-medium bg-indigo-50' : 'text-gray-700'}
        hover:bg-gray-50 transition-colors duration-150`;
    };

    return (
        <div className="w-[400px] h-full bg-gray-50 border-l border-gray-200 flex flex-col flex-shrink-0">

            {/* Header */}
            <div className="flex flex-col h-full">
                <div className="flex items-center gap-x-2 p-4 border-b border-gray-200 bg-white">
                    <FiSettings className="w-5 h-5 text-gray-700" />
                    <h3 className="text-base font-semibold text-gray-900">Gantt Ayarları</h3>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-2 space-y-2">

                    {/* 1. Zaman Çizelgesi Kolonları */}
                    <CollapsibleStep title="Zaman Çizelgesi (Kaynak)" isInitiallyOpen={openSection === 'timeline'}>
                        <div className="space-y-2">
                            <p className="text-xs text-gray-500 mb-2">
                                Görev çubuklarını oluşturmak için kullanılacak tarih aralığı sütununu seçin.
                            </p>
                            <div className="rounded-md border border-gray-200 bg-white overflow-hidden">
                                {timelineColumns.map((col, index) => {
                                    const isSelected = activeTimelineIds.includes(col.id);
                                    const isPrimary = activeTimelineIds[0] === col.id;
                                    return (
                                        <button
                                            key={col.id}
                                            onClick={() => handleToggleColumn(col.id)}
                                            className={`${getOptionClassName(isSelected)} ${index > 0 ? 'border-t border-gray-100' : ''}`}
                                        >
                                            <div className="flex flex-col items-start">
                                                <span>{col.title}</span>
                                                {isPrimary && <span className="text-[10px] text-indigo-500 font-normal">Ana Zaman Çizelgesi</span>}
                                            </div>
                                            {isSelected && <FiCheck className="w-4 h-4 text-indigo-600" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </CollapsibleStep>

                    {/* 2. Temel Çizgiler (BASELINE) */}
                    <CollapsibleStep title="Temel Çizgiler (Baseline)" isInitiallyOpen={true}>
                        <div className="space-y-3 pt-1">
                            <p className="text-xs text-gray-500">Mevcut planı, geçmiş bir anlık görüntüyle karşılaştırın.</p>

                            <button type="button" onClick={onCreateBaseline} className="w-full flex items-center justify-center gap-x-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors">
                                <FiPlus className="w-4 h-4" /> Yeni Temel Çizgi Ekle
                            </button>

                            <div className="mt-2">
                                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">Kayıtlı Anlık Görüntüler</h4>
                                <div className="rounded-md border border-gray-200 bg-white overflow-hidden">
                                    <button onClick={() => onBaselineChange(null)} className={`${getOptionClassName(activeBaselineId === null)} border-b border-gray-100`}>
                                        <span className="text-gray-500 italic">Gösterme (Kapalı)</span>
                                        {activeBaselineId === null && <FiEyeOff className="w-4 h-4 text-gray-400" />}
                                    </button>

                                    {/* Baseline Listesi */}
                                    {baselineOptions.length > 0 ? (
                                        baselineOptions.map((col) => {
                                            const isActive = activeBaselineId === col.id;
                                            return (
                                                <div
                                                    key={col.id}
                                                    className={`flex items-center justify-between w-full px-3 py-2.5 text-sm text-left border-t border-gray-100 group hover:bg-gray-50 transition-colors duration-150 ${isActive ? 'bg-indigo-50' : ''}`}
                                                >
                                                    {/* Seçim Alanı (Sol Taraf) */}
                                                    <button
                                                        onClick={() => onBaselineChange(col.id)}
                                                        className="flex-1 flex items-center justify-between mr-2 focus:outline-none"
                                                    >
                                                        <span className={`${isActive ? 'text-indigo-600 font-medium' : 'text-gray-700'}`}>
                                                            {col.title}
                                                        </span>
                                                        {isActive && <FiEye className="w-4 h-4 text-indigo-600" />}
                                                    </button>

                                                    {/* Silme Butonu (Sağ Taraf - Sadece hover olunca veya mobilde görünür yapabiliriz, ama şimdilik hep görünsün) */}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation(); // Seçimi tetikleme
                                                            if (window.confirm(`"${col.title}" silinecek. Emin misiniz?`)) {
                                                                onDeleteBaseline(col.id);
                                                            }
                                                        }}
                                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                        title="Bu temel çizgiyi sil"
                                                    >
                                                        <FiTrash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="px-3 py-2.5 text-xs text-gray-400 text-center italic">Henüz kaydedilmiş temel çizgi yok.</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </CollapsibleStep>

                    {/* 3. Gruplama */}
                    <CollapsibleStep title="Grupla">
                        <div className="rounded-md border border-gray-200 bg-white overflow-hidden">
                            <button onClick={() => onGroupByColumnChange(null)} className={getOptionClassName(groupByColumnId === null)}>
                                <span>Gruplama Yok</span>
                                {groupByColumnId === null && <FiCheck className="w-4 h-4" />}
                            </button>
                            {categoricalColumns.map(col => (
                                <button key={col.id} onClick={() => onGroupByColumnChange(col.id)} className={`${getOptionClassName(groupByColumnId === col.id)} border-t border-gray-100`}>
                                    <span>{col.title}</span>
                                    {groupByColumnId === col.id && <FiCheck className="w-4 h-4" />}
                                </button>
                            ))}
                        </div>
                    </CollapsibleStep>

                    {/* 4. Renklendirme */}
                    <CollapsibleStep title="Renklendir">
                        <div className="rounded-md border border-gray-200 bg-white overflow-hidden">
                            <button onClick={() => onColorByColumnChange(null)} className={getOptionClassName(colorByColumnId === null)}>
                                <span>Varsayılan</span>
                                {colorByColumnId === null && <FiCheck className="w-4 h-4" />}
                            </button>
                            {categoricalColumns.map(col => (
                                <button key={col.id} onClick={() => onColorByColumnChange(col.id)} className={`${getOptionClassName(colorByColumnId === col.id)} border-t border-gray-100`}>
                                    <span>{col.title}</span>
                                    {colorByColumnId === col.id && <FiCheck className="w-4 h-4" />}
                                </button>
                            ))}
                        </div>
                    </CollapsibleStep>

                    {/* 5. Etiketleme */}
                    <CollapsibleStep title="Etiketle">
                        <div className="rounded-md border border-gray-200 bg-white overflow-hidden">
                            <button onClick={() => onLabelByChange(null)} className={getOptionClassName(labelById === null)}>
                                <span>Hiçbiri</span>
                                {labelById === null && <FiCheck className="w-4 h-4" />}
                            </button>
                            <button onClick={() => onLabelByChange(-2)} className={`${getOptionClassName(labelById === -2)} border-t border-gray-100`}>
                                <span>Proje Adı</span>
                                {labelById === -2 && <FiCheck className="w-4 h-4" />}
                            </button>
                            {labelableColumns.map(col => (
                                <button key={col.id} onClick={() => onLabelByChange(col.id)} className={`${getOptionClassName(labelById === col.id)} border-t border-gray-100`}>
                                    <span>{col.title}</span>
                                    {labelById === col.id && <FiCheck className="w-4 h-4" />}
                                </button>
                            ))}
                        </div>
                    </CollapsibleStep>

                </div >
            </div >
        </div >
    );
};

export default GanttSettingsPanel;