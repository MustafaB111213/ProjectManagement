// src/components/gantt/GanttSettingsPanel.tsx ()

import React, { useMemo } from 'react';
import { FiSettings, FiFilter, FiUsers, FiCheck } from 'react-icons/fi';
import CollapsibleStep from './CollapsibleStep';
import { ColumnType, type Column } from '../../types';

interface GanttSettingsPanelProps {
    openSection: 'baseline' | string | null;
    // --- YENİ PROPLAR ---
    allColumns: Column[]; // Panodaki tüm sütunlar
    // activeTimelineId: number | null; // KALDIR
    activeTimelineIds: number[]; // YENİ: Dizi olarak al
    // onTimelineColumnChange: (columnId: number) => void; // KALDIR
    onTimelineColumnChange: (columnIds: number[]) => void; // YENİ: Dizi döndürür
    groupByColumnId: number | null;
    onGroupByColumnChange: (columnId: number | null) => void;
    // --- YENİ PROPLAR ---
    colorByColumnId: number | null;
    onColorByColumnChange: (columnId: number | null) => void;
    labelById: number | null;
    onLabelByChange: (labelId: number | null) => void;
}

const GanttSettingsPanel: React.FC<GanttSettingsPanelProps> = ({
    openSection,
    allColumns,
    activeTimelineIds,
    onTimelineColumnChange,
    groupByColumnId,
    onGroupByColumnChange,
    // --- YENİ ---
    colorByColumnId,
    onColorByColumnChange,
    labelById,
    onLabelByChange
}) => {
    // Sadece "Timeline" tipindeki sütunları filtreleyip alalım
    const timelineColumns = useMemo(() =>
        allColumns.filter(c => c.type === ColumnType.Timeline),
        [allColumns]);

    // --- RENK SORUNU DÜZELTMESİ ---
    // Renklendirme ve Gruplama SADECE 'Status' tipine göre çalışır
    const categoricalColumns = useMemo(() =>
        allColumns.filter(c =>
            c.type === ColumnType.Status
        ),
        [allColumns]);
    // --- DÜZELTME SONU ---

    // --- YENİ: Etiketlenebilir Sütunlar ---
    // Kullanıcının istediği tüm tipleri (Durum, Kişi, Tarih, Zaman Çizelgesi) filtrele
    const labelableColumns = useMemo(() =>
        allColumns.filter(c =>
            c.type === ColumnType.Status ||
            c.type === ColumnType.Person ||
            c.type === ColumnType.Date ||
            c.type === ColumnType.Timeline
        ),
        [allColumns]);
    // --- YENİ ALAN SONU ---

    // --- YENİ: Çoklu Seçim Handler'ı ---
    const handleToggleColumn = (columnId: number) => {
        const isCurrentlyActive = activeTimelineIds.includes(columnId);
        let newIds: number[];

        if (isCurrentlyActive) {
            // Seçimi kaldır
            newIds = activeTimelineIds.filter(id => id !== columnId);
        } else {
            // Seçime ekle (mevcut ID'ler + yeni ID)
            newIds = [...activeTimelineIds, columnId];
        }

        // En az bir seçim yapılmasını zorunlu kıl
        if (newIds.length === 0) {
            alert("Gantt görünümünün çalışması için en az bir zaman çizelgesi sütunu seçilmelidir.");
            return;
        }

        onTimelineColumnChange(newIds);
    };

    // --- YENİ: Gruplama Handler'ı ---
    const handleSelectGroup = (columnId: number | null) => {
        // Parent'taki (GanttView) state'i güncelle
        onGroupByColumnChange(columnId);
    };
    // --- YENİ: Renklendirme Handler'ı ---
    const handleSelectColorBy = (columnId: number | null) => {
        onColorByColumnChange(columnId);
    };

    // --- YENİ: Etiket Handler'ı ---
    const handleSelectLabelBy = (id: number | null) => {
        onLabelByChange(id);
    };

    // Sıkıcı buton stilini bir yardımcı fonksiyona alalım
    const getOptionClassName = (isSelected: boolean) => {
        return `flex items-center justify-between w-full px-3 py-2.5 text-sm text-left
        ${isSelected ? 'text-indigo-600 font-medium' : 'text-gray-700'}
        hover:bg-gray-50`;
    };
    return (
        // --- Sağ Panel Konteyneri ---
        // DÜZELTME: flex-shrink-0 eklendi, böylece panelin genişliği 400px'te sabit kalır
        <div className="w-[400px] h-full bg-gray-50 border-l border-gray-200 flex flex-col flex-shrink-0">

            <div className="flex flex-col h-full">
                {/* 1. Panel Başlığı */}
                <div className="flex items-center gap-x-2 p-4 border-b border-gray-200">
                    <FiSettings className="w-5 h-5 text-gray-700" />
                    <h3 className="text-base font-semibold text-gray-900">Widget Ayarları</h3>
                </div>

                {/* 2. Panel Araç Çubuğu (Filtreler vb.) */}
                <div className="flex items-center gap-x-2 p-2 border-b border-gray-200">
                    <input
                        type="search"
                        placeholder="Type to filter..."
                        className="flex-1 w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <button className="p-2 rounded-md text-gray-600 hover:bg-gray-100">
                        <FiUsers className="w-5 h-5" />
                    </button>
                    <button className="p-2 rounded-md text-gray-600 hover:bg-gray-100">
                        <FiFilter className="w-5 h-5" />
                    </button>
                </div>

                {/* 3. Ayar Adımları (Scrollable) */}
                <div className="flex-1 overflow-y-auto">

                    {/* Zaman Çizelgesi Kolonu (DOLDURULDU) */}
                    <CollapsibleStep title="Zaman çizelgesi kolonları" isInitiallyOpen={openSection === 'timeline'}>
                        <div className="space-y-2">
                            <p className="text-sm text-gray-600 mb-3">
                                Gantt çubuklarını çizmek için **birincil** zaman çizelgesi sütununu ve karşılaştırma (baseline) için **ikincil** sütunları seçin. (İlk seçilen çubukları çizer, diğerleri çizgi olarak kullanılabilir)
                            </p>
                            {timelineColumns.length > 0 ? (
                                <div className="rounded-md border border-gray-300 bg-white shadow-sm">
                                    {timelineColumns.map((col, index) => {
                                        const isSelected = activeTimelineIds.includes(col.id); // Kontrolü dizi üzerinden yap
                                        const isPrimary = activeTimelineIds.indexOf(col.id) === 0; // İlk seçilen birincil (çubuk çizimi)

                                        return (
                                            <button
                                                key={col.id}
                                                onClick={() => handleToggleColumn(col.id)} // Yeni handler'ı kullan
                                                className={`flex items-center justify-between w-full px-3 py-2.5 text-sm text-left
                                        ${index > 0 ? 'border-t border-gray-200' : ''}
                                        ${isSelected ? 'text-indigo-600 font-medium' : 'text-gray-700'}
                                        hover:bg-gray-50`}
                                            >
                                                <span>
                                                    {col.title}
                                                    {isPrimary && <span className="ml-2 px-1.5 py-0.5 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800">BİRİNCİL</span>}
                                                </span>
                                                {/* Seçili olana check ikonu koy */}
                                                {isSelected && (
                                                    <FiCheck className="w-5 h-5 text-indigo-600" />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500">Bu panoda hiç "Timeline" sütunu bulunamadı.</p>
                            )}
                            {/* Başka sütun tiplerini de (örn: Tarih) göstermek için buraya eklenebilir */}
                        </div>
                    </CollapsibleStep>

                    {/* Grupla () */}
                    <CollapsibleStep title="Grupla:" isInitiallyOpen={openSection === 'group-by'}>
                        <div className="space-y-2">
                            <p className="text-sm text-gray-600 mb-3">
                                Görevleri bir sütuna göre gruplayarak görselleştirin.
                            </p>
                            <div className="rounded-md border border-gray-300 bg-white shadow-sm">

                                {/* --- METİN  --- */}
                                <button
                                    onClick={() => handleSelectGroup(null)} // 'null' göndermesi doğru
                                    className={getOptionClassName(groupByColumnId === null)}
                                >
                                    {/* "Gruplama Yok" yerine "Pano Grupları" (veya "Gruplar") */}
                                    <span>Pano Grupları</span>
                                    {groupByColumnId === null && <FiCheck className="w-5 h-5 text-indigo-600" />}
                                </button>
                                {/* --- GÜNCELLEME SONU --- */}

                                {categoricalColumns.map((col, index) => (
                                    <button
                                        key={col.id}
                                        onClick={() => handleSelectGroup(col.id)}
                                        className={`${getOptionClassName(groupByColumnId === col.id)} border-t border-gray-200`}
                                    >
                                        <span>{col.title}</span>
                                        {groupByColumnId === col.id && <FiCheck className="w-5 h-5 text-indigo-600" />}
                                    </button>
                                ))}
                                {categoricalColumns.length === 0 && (
                                    <p className="p-3 text-sm text-gray-500 text-center border-t border-gray-200">
                                        Gruplanabilir sütun bulunamadı (örn: Durum).
                                    </p>
                                )}
                            </div>
                        </div>
                    </CollapsibleStep>

                    {/* --- YENİ: Şuna Göre Renklendir Bölümü --- */}
                    <CollapsibleStep title="Şuna göre renklendir:">
                        <div className="space-y-2">
                            <p className="text-sm text-gray-600 mb-3">
                                Gantt çubuklarının renklerini bir sütuna göre belirleyin.
                            </p>
                            <div className="rounded-md border border-gray-300 bg-white shadow-sm">

                                {/* "Gruplar" (Varsayılan Renk) Seçeneği */}
                                <button
                                    onClick={() => handleSelectColorBy(null)}
                                    className={getOptionClassName(colorByColumnId === null)}
                                >
                                    <span>Varsayılan (Renklendirme Yok)</span>
                                    {colorByColumnId === null && (
                                        <FiCheck className="w-5 h-5 text-indigo-600" />
                                    )}
                                </button>

                                {/* Diğer Renklendirilebilir Sütunlar */}
                                {categoricalColumns.map((col, index) => {
                                    const isSelected = colorByColumnId === col.id;
                                    return (
                                        < button
                                            key={col.id}
                                            onClick={() => handleSelectColorBy(col.id)}
                                            className={`${getOptionClassName(isSelected)} ${index >= 0 ? 'border-t border-gray-200' : ''}`}
                                        >
                                            <span>{col.title}</span>
                                            {isSelected && (
                                                <FiCheck className="w-5 h-5 text-indigo-600" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </CollapsibleStep>

                    {/* --- YENİ: Şuna Göre Etiketle --- */}
                    <CollapsibleStep title="Şuna göre etiketle:">
                        <div className="space-y-2">
                            <p className="text-sm text-gray-600 mb-3">
                                Gantt çubuklarının içinde gösterilecek etiketi seçin.
                            </p>
                            <div className="rounded-md border border-gray-300 bg-white shadow-sm">

                                {/* 0. Hiçbiri (labelById = null) */}
                                <button
                                    onClick={() => onLabelByChange(null)} // <-- Hiçbiri = null
                                    className={getOptionClassName(labelById === null)}
                                >
                                    <span>Hiçbiri</span>
                                    {labelById === null && <FiCheck className="w-5 h-5 text-indigo-600" />}
                                </button>
                                {/* 2. Proje Adı (labelById = -2) */}
                                <button
                                    onClick={() => onLabelByChange(-2)}
                                    className={`${getOptionClassName(labelById === -2)} border-t border-gray-200`}
                                >
                                    <span>Proje Adı</span>
                                    {labelById === -2 && <FiCheck className="w-5 h-5 text-indigo-600" />}
                                </button>
                                {/* 2. Grup Adı */}
                                <button
                                    onClick={() => handleSelectLabelBy(-1)}
                                    className={`${getOptionClassName(labelById === -1)} border-t border-gray-200`}
                                >
                                    <span>Grup Adı</span>
                                    {labelById === -1 && <FiCheck className="w-5 h-5 text-indigo-600" />}
                                </button>

                                {/* 3. Diğer Sütunlar */}
                                {labelableColumns.map((col) => {
                                    const isSelected = labelById === col.id;
                                    return (
                                        < button
                                            key={col.id}
                                            onClick={() => handleSelectLabelBy(col.id)}
                                            className={`${getOptionClassName(isSelected)} border-t border-gray-200`}
                                        >
                                            <span>{col.title} ({col.type === ColumnType.Person ? 'Kişi' : col.type === ColumnType.Status ? 'Durum' : 'Tarih/ZÇ'})</span>
                                            {isSelected && (
                                                <FiCheck className="w-5 h-5 text-indigo-600" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </CollapsibleStep>
                    {/* --- YENİ ALAN SONU --- */}

                    {/* Temel Çizgiler (Başlangıçta açık) */}
                    <CollapsibleStep title="Temel Çizgiler" >
                        <div className="space-y-4 pt-3">
                            <p className="text-sm text-gray-600">
                                Bu Gantt grafiğindeki geçerli tarihleri önceki bir anlık görüntüyle karşılaştırın.
                                <a href="#" className="text-indigo-600 hover:underline ml-1">Daha fazla bilgi edinin</a>
                            </p>

                            <button
                                type="button"
                                className="w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                            >
                                Yeni bir anlık görüntü ekle
                            </button>

                            <div className="flex rounded-md shadow-sm">
                                <button
                                    type="button"
                                    className="relative inline-flex items-center justify-center w-1/2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-l-md hover:bg-gray-50 focus:z-10 focus:outline-none"
                                >
                                    Temel çizgiyi göster
                                </button>
                                <button
                                    type="button"
                                    className="relative inline-flex items-center justify-center w-1/2 -ml-px px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-r-md hover:bg-gray-50 focus:z-10 focus:outline-none"
                                >
                                    Gizle
                                </button>
                            </div>
                        </div>
                    </CollapsibleStep>

                    <CollapsibleStep title="Görsel ayarlar">
                        <p className="text-sm text-gray-600">Görsel ayarlar buraya gelecek.</p>
                    </CollapsibleStep>
                </div>
            </div >
        </div >
    );
};

export default GanttSettingsPanel;