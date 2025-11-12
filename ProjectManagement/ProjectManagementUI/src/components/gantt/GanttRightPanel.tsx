// src/components/gantt/GanttRightPanel.tsx

import React, { useMemo, useState, useCallback, useRef } from 'react';
// types.ts'den gerekli tüm tipleri import et
import { type Group, type Item, type Column, ColumnType, type DependencyLink, type User } from '../../types';
import TimelineHeader from './TimelineHeader';
// date-fns'ten gerekli fonksiyonları import et
import { parseISO, differenceInDays, format } from 'date-fns';
// Redux hook ve action'ı import et
import { useAppSelector } from '../../store/hooks';

// Yeni bileşenleri ve tipleri import et
import GanttArrows, { type ProcessedItemData } from './GanttArrows';
import GanttBarRow from './GanttBarRow'; // <-- YENİ BİLEŞEN IMPORTU

import {
  GANTT_ROW_HEIGHT_PX,
  GANTT_BAR_HEIGHT_PX,
  GANTT_BAR_TOP_OFFSET_PX
} from '../common/constants'; // (Dosya yolunu kendinize göre düzeltin)
import { selectAllUsers } from '../../store/features/userSlice';
import { useGanttDragResize } from '../../hooks/useGanttDragResize';


// --- YENİ YARDIMCI FONKSİYON ---
// (PersonCell.tsx'teki ile aynı)
// Backend 'User' tipini, bileşenin beklediği 'ViewUser' tipine dönüştür
const transformUserForView = (user: User) => {
  const initials = `${user.firstName[0] || ''}${user.lastName[0] || ''}`.toUpperCase();
  return {
    id: user.id,
    name: `${user.firstName} ${user.lastName}`,
    avatarUrl: undefined,
    initials: initials || user.username[0].toUpperCase(),
  };
};
// ---------------------------------

// Props arayüzü
interface GanttRightPanelProps {
  groups: Group[];
  items: Item[];
  columns: Column[];
  viewMinDate: Date; // Görünümün başlangıç tarihi
  viewMaxDate: Date; // Görünümün bitiş tarihi
  // scrollTop: number; // Dikey scroll senkronizasyonu için
  collapsedGroupIds: Set<number>; // Kapalı grupların ID'leri
  dayWidthPx: number;
  activeTimelineIds: number[]; // YENİ: Dizi olarak al
  colorByColumnId: number | null; // <-- YENİ PROP
  labelById: number | null;
  onItemClick: (itemId: number) => void;
  onMouseEnterBar: (itemId: number) => void;
  onMouseLeaveBar: () => void;
}

// RESIZE_HANDLE_WIDTH_PX kaldırıldı, artık GanttBarRow içinde kullanılıyor.

// --- GÜNCELLENDİ ---
// Durum renkleri (StatusCell.tsx ile senkronize edildi)
// Gantt çubukları için 'Pill' yerine solid (düz) Tailwind renkleri kullanıyoruz.
const STATUS_COLORS: { [key: string]: string } = {
  'Yapılıyor': 'bg-orange-500', // StatusCell'deki 'bg-orange-100' yerine
  'Tamamlandı': 'bg-green-500',  // StatusCell'deki 'bg-green-100' yerine
  'Takıldı': 'bg-red-500',     // StatusCell'deki 'bg-red-100' yerine
  'Beklemede': 'bg-blue-500',   // StatusCell'deki 'bg-blue-100' yerine
  'Belirsiz': 'bg-gray-400',    // StatusCell'deki 'bg-gray-100' yerine
  'Default': 'bg-gray-400',     // Her ihtimale karşı bir varsayılan
};
// --- GÜNCELLEME SONU ---


// Ana Component
const GanttRightPanel: React.FC<GanttRightPanelProps> = ({
  groups,
  items,
  columns,
  viewMinDate,
  viewMaxDate,
  // scrollTop,
  collapsedGroupIds,
  dayWidthPx,
  activeTimelineIds,
  colorByColumnId,
  labelById,
  onItemClick,
  onMouseEnterBar,
  onMouseLeaveBar
}) => {

  const paneRef = useRef<HTMLDivElement>(null);
  const [hoveredItemId, setHoveredItemId] = useState<number | null>(null);

  // --- YENİ: Redux'tan Kullanıcıları Al ---
  const allUsers = useAppSelector(selectAllUsers);
  // ------------------------------------

  // --- Sütun ID'lerini Hesaplama (GÜNCELLENDİ) ---
  const { dependencyColumnId } = useMemo(() => {
    return {
      dependencyColumnId: columns.find(c => c.type === ColumnType.Dependency)?.id || null,
      // 'statusColumnId' kaldırıldı, artık 'colorByColumnId' prop'unu kullanıyoruz.
    };
  }, [columns]);

  // Çubukları çizmek için BİRİNCİL ID'yi al
  const primaryTimelineId = activeTimelineIds.length > 0 ? activeTimelineIds[0] : null;

  // --- HOOK KULLANIMI (Tüm karmaşık mantık burada) ---
  const {
    isDragging,
    draggedItemData,
    isResizing,
    resizedItemData,
    handleMouseDownOnBar,
    handleMouseDownOnResizeHandle,
    handlePaneMouseLeave,
  } = useGanttDragResize({
    paneRef,
    items,
    columns,
    primaryTimelineId,
    viewMinDate,
    dayWidthPx,
    onItemClick,
    onDragStart: () => setHoveredItemId(null), // Sürükleme başladığında hover'ı sıfırla
    onDragEnd: () => { },
  });
  // --- HOOK KULLANIMI SONU ---

  // GanttBarRow'dan çağrılır
  const handleBarMouseEnter = useCallback((itemId: number) => {
    if (!isDragging && !isResizing) {
      setHoveredItemId(itemId); // Lokal state'i güncelle
      onMouseEnterBar(itemId); // Global handler'ı çağır (LeftPanel için)
    }
  }, [isDragging, isResizing, onMouseEnterBar]);

  // GanttBarRow'dan çağrılır
  const handleBarMouseLeave = useCallback(() => {
    if (!isDragging && !isResizing) {
      setHoveredItemId(null); // Lokal state'i sıfırla
      onMouseLeaveBar(); // Global handler'ı çağır (LeftPanel için)
    }
  }, [isDragging, isResizing, onMouseLeaveBar]);

  // --- Tüm Görev Verisini İşleme (DÜZELTME BURADA) ---
  const processedData = useMemo(() => {
    const dataMap = new Map<number, ProcessedItemData>();
    let rowIndex = -1;
    const groupMap = new Map(groups.map(g => [g.id, g]));

    groups.forEach(group => {
      if (collapsedGroupIds.has(group.id)) return;

      rowIndex++;
      const groupItems = items.filter(item => item.groupId === group.id);
      // --- DÜZELTME BURADA ---
      // Görevleri 'order'a göre sırala, böylece 'rowIndex' ataması
      // GanttLeftPanel'deki 'map' sırasıyla %100 eşleşir.
      groupItems.sort((a, b) => a.order - b.order);
      // --- DÜZELTME SONU ---
      groupItems.forEach(item => {
        rowIndex++;
        let currentBarData: ProcessedItemData['barData'] = null;
        let currentDependencies: DependencyLink[] = [];

        // --- Etiket (Label) Hesaplama ---
        const barLabel = ""; // Çubuk İÇİ metin artık boş
        let externalLabel = ""; // Çubuğun YANI

        if (labelById === -2) { // YENİ: Proje Adı = -2
          externalLabel = item.name;
        } else if (labelById === -1) { // Grup Adı = -1
          externalLabel = group.title;
        }
        // labelById === null ise, externalLabel "" olarak kalır (Hiçbiri)
        else if (labelById !== null && labelById > 0) {
          // Pozitif ID = Sütun ID'si
          // Sütunun tipini bul
          const labelColumn = columns.find(c => c.id === labelById);
          const labelValue = item.itemValues.find(v => v.columnId === labelById)?.value || "";

          if (labelColumn && labelValue) {

            // Tipe göre etiketi formatla
            switch (labelColumn.type) {

              case ColumnType.Person: // <-- BİZE LAZIM OLAN KISIM
                try {
                  const userIds = JSON.parse(labelValue) as number[];
                  if (Array.isArray(userIds) && userIds.length > 0) {
                    const idSet = new Set(userIds);
                    // Kullanıcıları Redux'tan bul, dönüştür ve isimlerini al
                    const names = allUsers
                      .filter(user => idSet.has(user.id))
                      .map(user => transformUserForView(user).name); // 'transformUserForView' kullan
                    externalLabel = names.join(', '); // "Mustafa, John Doe"
                  }
                } catch (e) {
                  externalLabel = "Hatalı Kişi Verisi";
                }
                break;

              case ColumnType.Date:
                try {
                  externalLabel = format(parseISO(labelValue), 'MMM d');
                } catch {
                  externalLabel = ""; // Geçersiz tarih
                }
                break;

              case ColumnType.Timeline:
                externalLabel = labelValue.replace('/', ' - ');
                break;

              case ColumnType.Status:
              case ColumnType.Text:
              default:
                externalLabel = labelValue;
                break;
            }
          }
        }
        // --- Etiket Hesaplama Sonu ---

        // Bar stilini ve koordinatları hesapla
        if (primaryTimelineId) {
          const timelineValue = item.itemValues.find(v => v.columnId === primaryTimelineId)?.value;
          if (timelineValue) {
            const [startStr, endStr] = timelineValue.split('/');
            if (startStr && endStr) {
              try {
                const startDate = parseISO(startStr);
                const endDate = parseISO(endStr);
                if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || endDate < startDate) {
                  currentBarData = null;
                } else {
                  const leftDays = differenceInDays(startDate, viewMinDate);
                  const durationDays = Math.max(1, differenceInDays(endDate, startDate) + 1);

                  if (!isNaN(leftDays)) {
                    const startX = leftDays * dayWidthPx;
                    const width = durationDays * dayWidthPx;

                    // --- RENK SEÇİMİ (GÜNCELLENDİ) ---
                    // Artık 'statusColumnId'ye bağlı değil, 'colorByColumnId' prop'una bağlı.
                    let colorClass = STATUS_COLORS.Default;

                    if (colorByColumnId) { // Eğer bir renklendirme sütunu seçilmişse
                      // O sütunun değerini bul (örn: "Yapılıyor")
                      const colorValue = item.itemValues.find(v => v.columnId === colorByColumnId)?.value;

                      if (colorValue && STATUS_COLORS[colorValue]) {
                        colorClass = STATUS_COLORS[colorValue]; // (örn: 'bg-orange-500')
                      }
                    }
                    // --- RENK SEÇİMİ SONU ---

                    currentBarData = {
                      style: {
                        position: 'absolute',
                        top: `${GANTT_BAR_TOP_OFFSET_PX}px`,
                        height: `${GANTT_BAR_HEIGHT_PX}px`,
                        left: `${startX}px`,
                        width: `${width}px`,
                      },
                      colorClass: colorClass,
                      startX: startX,
                      endX: startX + width
                    };
                  }
                }
              } catch (e) { /* console.error(e); */ }
            }
          }
        }

        // Bağımlılık JSON'unu parse et (Kısaltıldı)
        if (dependencyColumnId) {
          const depValue = item.itemValues.find(v => v.columnId === dependencyColumnId)?.value;
          if (depValue) {
            try {
              const parsedDeps = JSON.parse(depValue) as DependencyLink[];
              if (Array.isArray(parsedDeps)) {
                currentDependencies = parsedDeps.filter(
                  link => typeof link.id === 'number' && typeof link.type === 'string'
                );
              } else { /* Eski format desteği */ }
            } catch (e) { /* Eski format desteği */ }
          }
        }


        dataMap.set(item.id, {

          item: { id: item.id, name: barLabel, groupId: item.groupId },
          rowIndex: rowIndex,
          barData: currentBarData,
          dependencies: currentDependencies,

          externalLabel: externalLabel
        });

      });
    });
    return dataMap;
  }, [groups, items, primaryTimelineId, viewMinDate, collapsedGroupIds, dayWidthPx, labelById, colorByColumnId, dependencyColumnId,]);

  // --- RENDER KISMI ---

  const groupHeaderRowIndices = useMemo(() => {
    const indices = new Map<number, number>();
    let currentRow = -1;
    groups.forEach(group => {
      if (!collapsedGroupIds.has(group.id)) {
        currentRow++;
        indices.set(group.id, currentRow);
        currentRow += items.filter(item => item.groupId === group.id).length;
      }
    });
    return indices;
  }, [groups, items, collapsedGroupIds]);

  const maxRowIndex = useMemo(() => {
    if (processedData.size === 0) {
      const visibleGroups = groups.filter(g => !collapsedGroupIds.has(g.id));
      return Math.max(0, visibleGroups.length - 1);
    }
    return Math.max(0, ...Array.from(processedData.values()).map(d => d.rowIndex));
  }, [processedData, groups, collapsedGroupIds]);

  const totalHeight = (maxRowIndex + 1) * GANTT_ROW_HEIGHT_PX;
  const totalDays = differenceInDays(viewMaxDate, viewMinDate) + 1;
  const totalWidth = Math.max(100, totalDays * dayWidthPx);

  return (
    <div ref={paneRef} className="w-full relative bg-primary-background "
      style={{ minWidth: `${totalWidth}px` }}
      onMouseLeave={handlePaneMouseLeave}>

      <TimelineHeader
        viewMinDate={viewMinDate}
        viewMaxDate={viewMaxDate}
        dayWidthPx={dayWidthPx}
        rowHeightPx={GANTT_ROW_HEIGHT_PX}
      />

      {/* Ana İçerik Konteyneri (Kaydırma için) */}
      <div
        className="relative"
        style={{
          height: `${totalHeight}px`,
          width: `${totalWidth}px`,
          // transform: `translateY(-${scrollTop}px)`
        }}
      >
        {/* Gruplar ve Görev Çubukları */}
        {groups.filter(group => !collapsedGroupIds.has(group.id)).map(group => {
          const groupRowIndex = groupHeaderRowIndices.get(group.id);
          if (groupRowIndex === undefined) return null;

          return (
            <React.Fragment key={group.id}>
              {/* Grup Başlığı (Boş Satır - Görsel Ayırıcı) */}
              <div
                className="absolute left-0 right-0 border-t border-gray-100 pointer-events-none"
                style={{
                  top: `${groupRowIndex * GANTT_ROW_HEIGHT_PX}px`,
                  height: `${GANTT_ROW_HEIGHT_PX}px`,
                }}
              ></div>
              {/* Bu gruba ait GÖRÜNÜR görevler */}
              {Array.from(processedData.values())
                .filter(itemData => itemData.item.groupId === group.id)
                // HİZALAMA DÜZELTMESİ:
                .sort((a, b) => a.rowIndex - b.rowIndex) // 'rowIndex'e göre sırala
                .map(itemData => (
                  <React.Fragment key={itemData.item.id}>
                    {/* 1. Görev Çubuğu (Bar) */}
                    <GanttBarRow
                      itemData={itemData} // Bu, içinde 'barLabel' (Proje Adı) olanı çizer
                      isActive={
                        (isDragging && draggedItemData?.item.id === itemData.item.id) ||
                        (isResizing && resizedItemData?.item.id === itemData.item.id) ||
                        (hoveredItemId === itemData.item.id)
                      }
                      onBarMouseDown={handleMouseDownOnBar}
                      onResizeHandleMouseDown={handleMouseDownOnResizeHandle}
                      onMouseEnter={() => handleBarMouseEnter(itemData.item.id)}
                      onMouseLeave={handleBarMouseLeave}
                    />

                    {/* 2. Dış Etiket (Bar'ın Yanında) */}
                    {itemData.barData && itemData.externalLabel && (
                      <div
                        // Basit stil: Çubuğun sağında, dikey ortalı
                        className="absolute flex items-center px-3 text-xs text-gray-700 :text-gray-300 pointer-events-none truncate"
                        style={{
                          top: `${(itemData.rowIndex * GANTT_ROW_HEIGHT_PX) + GANTT_BAR_TOP_OFFSET_PX}px`,
                          left: `${itemData.barData.endX + 6}px`, // Çubuktan 6px sağda
                          height: `${GANTT_BAR_HEIGHT_PX}px`,
                          lineHeight: `${GANTT_BAR_HEIGHT_PX}px`,
                          zIndex: 10, // Okların altında, çubukların üstünde
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {itemData.externalLabel}
                      </div>
                    )}
                  </React.Fragment>
                ))}
            </React.Fragment>
          );
        })}

        {/* OKLAR İÇİN YENİ BİLEŞEN KULLANIMI */}
        <GanttArrows
          processedData={processedData}
          totalWidth={totalWidth}
          totalHeight={totalHeight}
          hoveredItemId={hoveredItemId}
        />

      </div> {/* Ana İçerik sonu */}
    </div> // Pane ref div sonu
  );
};

export default GanttRightPanel;