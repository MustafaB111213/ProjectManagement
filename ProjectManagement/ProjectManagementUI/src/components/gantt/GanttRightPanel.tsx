// src/components/gantt/GanttRightPanel.tsx
import React, { useMemo, useState, useCallback, useRef } from 'react';
// types.ts'den gerekli tüm tipleri import et
import { type Group, type Item, type Column, ColumnType, type DependencyLink, type User } from '../../types';
import TimelineHeader from './TimelineHeader';
// date-fns'ten gerekli fonksiyonları import et
import { parseISO, format, differenceInCalendarDays, addDays } from 'date-fns';
// Redux hook ve action'ı import et
import { useAppSelector } from '../../store/hooks';

// Yeni bileşenleri ve tipleri import et

import {
  GANTT_ROW_HEIGHT_PX,
  GANTT_BAR_HEIGHT_PX,
  GANTT_BAR_TOP_OFFSET_PX
} from '../common/constants';
import { selectAllUsers } from '../../store/features/userSlice';
// Hook'un 'useGanttDragResize.ts' dosyasından (bir önceki cevaptaki)
// en güncel halini import ettiğini varsayıyoruz.
import { useGanttDragResize } from '../../hooks/useGanttDragResize';

import GanttArrows, { type ProcessedItemData, type BarTimelineData } from './GanttArrows';
import GanttBarRow from './GanttBarRow';

// (PersonCell.tsx'teki ile aynı)
const transformUserForView = (user: User) => {
  const initials = `${user.firstName[0] || ''}${user.lastName[0] || ''}`.toUpperCase();
  return {
    id: user.id,
    name: `${user.firstName} ${user.lastName}`,
    avatarUrl: undefined,
    initials: initials || user.username[0].toUpperCase(),
  };
};

// Props arayüzü
interface GanttRightPanelProps {
  groups: Group[];
  items: Item[];
  columns: Column[];
  viewMinDate: Date; // Görünümün başlangıç tarihi
  viewMaxDate: Date; // Görünümün bitiş tarihi
  collapsedGroupIds: Set<number>; // Kapalı grupların ID'leri
  dayWidthPx: number;
  activeTimelineIds: number[];
  colorByColumnId: number | null;
  labelById: number | null;
  onItemClick: (itemId: number) => void;
  onMouseEnterBar: (itemId: number) => void;
  onMouseLeaveBar: () => void;
}
// Durum renkleri
const STATUS_COLORS: { [key: string]: string } = {
  'Yapılıyor': 'bg-orange-500',
  'Tamamlandı': 'bg-green-500',
  'Takıldı': 'bg-red-500',
  'Beklemede': 'bg-blue-500',
  'Belirsiz': 'bg-gray-400',
  'Default': 'bg-sky-300',
};

// Ana Component
const GanttRightPanel: React.FC<GanttRightPanelProps> = ({
  groups,
  items,
  columns,
  viewMinDate,
  viewMaxDate,
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

  const allUsers = useAppSelector(selectAllUsers);

  const { dependencyColumnId } = useMemo(() => {
    return {
      dependencyColumnId: columns.find(c => c.type === ColumnType.Dependency)?.id || null,
    };
  }, [columns]);

  // 'primaryTimelineId' DEĞİŞKENİ SİLİNDİ.
  // Hook artık buna bağlı değil.

  // --- HOOK KULLANIMI (GÜNCELLENDİ) ---
  const {
    isDragging,
    draggedItemData, // Bu artık 'DragResizeState | null' tipinde
    isResizing,
    resizedItemData, // Bu artık 'DragResizeState | null' tipinde
    handlePaneMouseLeave,
    handleMouseDownOnBar,
    handleMouseDownOnResizeHandle,
  } = useGanttDragResize({
    paneRef,
    items,
    columns,
    viewMinDate,
    dayWidthPx,
    onItemClick,
    onDragStart: () => setHoveredItemId(null),
    onDragEnd: () => {
      // Kaydetme işlemi ve state temizliği hook'un içinde (handleMouseUp) yapılıyor.
      // Burası sadece ek işlemler (örn. hover'ı sıfırlama) için.
      onMouseLeaveBar(); // Sürükleme bittiğinde hover'ı temizle
    },
  });
  // --- HOOK KULLANIMI SONU ---

  const handleBarMouseEnter = useCallback((itemId: number) => {
    if (!isDragging && !isResizing) {
      setHoveredItemId(itemId);
      onMouseEnterBar(itemId);
    }
  }, [isDragging, isResizing, onMouseEnterBar]);

  const handleBarMouseLeave = useCallback(() => {
    if (!isDragging && !isResizing) {
      setHoveredItemId(null);
      onMouseLeaveBar();
    }
  }, [isDragging, isResizing, onMouseLeaveBar]);

  // --- processedData (Hizalama Düzeltmesi Dahil) ---
  // Bu 'useMemo' bloğu, dinamik satır yüksekliğini (itemRowCount)
  // ve hizalamayı (itemBaseRowIndex = rowIndex + 1) doğru hesaplar.
  const processedData = useMemo(() => {
    const dataMap = new Map<number, ProcessedItemData>();
    let rowIndex = -1;
    const groupMap = new Map(groups.map(g => [g.id, g]));

    groups.forEach(group => {
      if (collapsedGroupIds.has(group.id)) return;

      rowIndex++; // Grup başlığı satırı (örn: 0)
      const groupItems = items.filter(item => item.groupId === group.id);
      groupItems.sort((a, b) => a.order - b.order);

      groupItems.forEach(item => {
        // Hizalama Düzeltmesi: Item, grup başlığından SONRAKİ satırda başlar
        const itemBaseRowIndex = rowIndex + 1;

        let externalLabel = ""; // Çubuğun YANI

        if (labelById === -2) { // Proje Adı
          externalLabel = item.name;
        } else if (labelById === -1) { // Grup Adı
          const itemGroup = groupMap.get(item.groupId); // groupMap'i kullan
          externalLabel = itemGroup ? itemGroup.title : "";
        }
        else if (labelById !== null && labelById > 0) {
          const labelColumn = columns.find(c => c.id === labelById);
          const labelValue = item.itemValues.find(v => v.columnId === labelById)?.value || "";

          if (labelColumn && labelValue) {
            switch (labelColumn.type) {
              case ColumnType.Person:
                try {
                  const userIds = JSON.parse(labelValue) as number[];
                  if (Array.isArray(userIds) && userIds.length > 0) {
                    const idSet = new Set(userIds);
                    const names = allUsers
                      .filter(user => idSet.has(user.id))
                      .map(user => transformUserForView(user).name);
                    externalLabel = names.join(', ');
                  }
                } catch (e) { externalLabel = "Hatalı Kişi"; }
                break;
              case ColumnType.Date:
                try { externalLabel = format(parseISO(labelValue), 'MMM d'); }
                catch { externalLabel = ""; }
                break;
              case ColumnType.Timeline:
                externalLabel = labelValue.replace('/', ' - ');
                break;
              default:
                externalLabel = labelValue;
                break;
            }
          }
        }
        // --- Etiket Hesaplama Sonu ---


        // --- RENK SEÇİMİ (Orijinal kodundaki gibi) ---
        let colorClass = STATUS_COLORS.Default;
        if (colorByColumnId !== null) {
          const colorValue = item.itemValues.find(v => v.columnId === colorByColumnId)?.value;
          if (colorValue && STATUS_COLORS[colorValue]) {
            colorClass = STATUS_COLORS[colorValue];
          }
        }
        // --- RENK SEÇİMİ SONU ---


        // --- Barları Hesapla ---
        let currentBarData: ProcessedItemData['barData'] = null;
        const currentVisualBars: ProcessedItemData['visualOnlyBars'] = [];
        let currentDependencies: DependencyLink[] = [];
        let validBarCount = 0;

        activeTimelineIds.forEach((timelineId) => {
          const timelineValue = item.itemValues.find(v => v.columnId === timelineId)?.value;

          if (timelineValue) {
            const [startStr, endStr] = timelineValue.split('/');
            if (startStr && endStr) {
              try {
                const startDate = parseISO(startStr);
                const endDate = parseISO(endStr);
                if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || endDate < startDate) {
                  return;
                }
                validBarCount++;
                const leftDays = differenceInCalendarDays(startDate, viewMinDate);
                const durationDays = Math.max(1, differenceInCalendarDays(endDate, startDate) + 1);
                if (isNaN(leftDays)) return; // Geçersizse atla
                const startX = leftDays * dayWidthPx;
                const width = durationDays * dayWidthPx;

                // YENİ: Kolon başlığını bul
                const column = columns.find(c => c.id === timelineId);
                const columnTitle = column ? column.title : 'Zaman Çizelgesi';

                const bar: BarTimelineData = {
                  style: {
                    height: `${GANTT_BAR_HEIGHT_PX}px`,
                    left: `${startX}px`,
                    width: `${width}px`,
                  },
                  colorClass: colorClass,
                  startX: startX,
                  endX: startX + width,
                  startDate,
                  endDate,
                  timelineColumnId: timelineId,
                  timelineColumnTitle: columnTitle

                };

                if (!currentBarData) {
                  currentBarData = bar; // Bu birincil bar oldu
                } else {
                  currentVisualBars.push(bar);
                }
              } catch (e) { /* Hata */ }
            }
          }
        });
        // --- Bar Hesaplama Sonu ---


        // --- 2. Düzeltme: Bağımlılık Parse Bloğu ---
        // (Orijinal kodundaki bu blok eksikti)
        if (dependencyColumnId) {
          const depValue = item.itemValues.find(v => v.columnId === dependencyColumnId)?.value;
          if (depValue) {
            try {
              const parsedDeps = JSON.parse(depValue) as DependencyLink[];
              if (Array.isArray(parsedDeps)) {
                currentDependencies = parsedDeps.filter(
                  link => typeof link.id === 'number' && typeof link.type === 'string'
                );
              }
            } catch (e) { /* Hata */ }
          }
        }
        // --- BAĞIMLILIK BLOĞU SONU ---

        // YENİ: Dinamik satır yüksekliği
        const itemRowCount = Math.max(1, validBarCount);

        dataMap.set(item.id, {
          item: { id: item.id, name: item.name, groupId: item.groupId },
          rowIndex: itemBaseRowIndex,
          barData: currentBarData,
          visualOnlyBars: currentVisualBars,
          dependencies: currentDependencies,

          // --- YENİ SATIR ---
          // 'barData'ya atanan ilk barın ID'sini "ana" ID olarak kaydet.
          primaryTimelineColumnId: currentBarData ? currentBarData.timelineColumnId : null,
          // --- YENİ SATIR SONU ---

          externalLabel: externalLabel
        });


        // YENİ: Bir sonraki item'ın başlayacağı yeri güncelle
        // Bu item (N) satır kapladı
        rowIndex = itemBaseRowIndex + (itemRowCount - 1);
      });
    });
    return dataMap;
  }, [
    // --- 3. Düzeltme: Bağımlılık Dizisi ---
    groups,
    items,
    activeTimelineIds, // 'primaryTimelineId' yerine bu geldi
    viewMinDate,
    collapsedGroupIds,
    dayWidthPx,
    labelById,
    colorByColumnId,
    dependencyColumnId,
    allUsers,
    columns
  ]);
  // --- 'useMemo' sonu ---

  const groupHeaderRowIndices = useMemo(() => {
    const indices = new Map<number, number>();
    let currentRow = -1;

    groups.forEach(group => {
      if (!collapsedGroupIds.has(group.id)) {
        currentRow++; // Grup satırı
        indices.set(group.id, currentRow);

        const groupItems = items.filter(item => item.groupId === group.id);
        groupItems.sort((a, b) => a.order - b.order); // Sıralama önemli

        let totalRowsInGroup = 0;
        groupItems.forEach(item => {
          // --- Sol paneldeki 'getItemRowCount' mantığının AYNISI ---
          let validBarCount = 0;
          activeTimelineIds.forEach(id => {
            const timelineValue = item.itemValues.find(v => v.columnId === id)?.value;
            if (timelineValue) {
              const [startStr, endStr] = timelineValue.split('/');
              if (startStr && endStr) {
                validBarCount++;
              }
            }
          });
          totalRowsInGroup += Math.max(1, validBarCount);
          // --- Hesaplama sonu ---
        });

        currentRow += totalRowsInGroup;
      }
    });
    return indices;
  }, [groups, items, collapsedGroupIds, activeTimelineIds]); // 'columns' buraya teknik olarak gerekmez

  const maxRowIndex = useMemo(() => {
    const visibleGroups = groups.filter(g => !collapsedGroupIds.has(g.id));
    const visibleItems = items.filter(item => !collapsedGroupIds.has(item.groupId));

    let totalItemRows = 0;
    visibleItems.forEach(item => {
      // --- Sol paneldeki 'getItemRowCount' mantığının AYNISI ---
      let validBarCount = 0;
      activeTimelineIds.forEach(id => {
        const timelineValue = item.itemValues.find(v => v.columnId === id)?.value;
        if (timelineValue) {
          const [startStr, endStr] = timelineValue.split('/');
          if (startStr && endStr) {
            validBarCount++;
          }
        }
      });
      totalItemRows += Math.max(1, validBarCount);
      // --- Hesaplama sonu ---
    });

    const totalRows = visibleGroups.length + totalItemRows;
    return Math.max(0, totalRows - 1); // 0-based index

  }, [groups, items, collapsedGroupIds, activeTimelineIds]);
  // totalHeight artık doğru hesaplanacak
  const totalHeight = (maxRowIndex + 1) * GANTT_ROW_HEIGHT_PX;
  const totalDays = differenceInCalendarDays(viewMaxDate, viewMinDate) + 1;
  const totalWidth = Math.max(100, totalDays * dayWidthPx);

  const applyPreviewToBar = useCallback((bar: BarTimelineData, itemId: number): BarTimelineData => {
    let deltaDays = 0;
    let resizeSide: 'start' | 'end' | null = null;

    if (draggedItemData && draggedItemData.item.id === itemId && draggedItemData.timelineColumnId === bar.timelineColumnId) {
      deltaDays = draggedItemData.currentDeltaDays;
      resizeSide = draggedItemData.side;
    }
    if (resizedItemData && resizedItemData.item.id === itemId && resizedItemData.timelineColumnId === bar.timelineColumnId) {
      deltaDays = resizedItemData.currentDeltaDays;
      resizeSide = resizedItemData.side;
    }

    if (!deltaDays && resizeSide === null) return bar;

    const deltaPx = deltaDays * dayWidthPx;
    let startX = bar.startX;
    let endX = bar.endX;

    if (resizeSide === null) {
      startX += deltaPx;
      endX += deltaPx;
    } else if (resizeSide === 'start') {
      startX = Math.min(endX - dayWidthPx, startX + deltaPx);
    } else if (resizeSide === 'end') {
      endX = Math.max(startX + dayWidthPx, endX + deltaPx);
    }

    const startDaysDelta = Math.round((startX - bar.startX) / dayWidthPx);
    const normalizedStartX = bar.startX + startDaysDelta * dayWidthPx;
    const pixelWidth = Math.max(dayWidthPx, endX - normalizedStartX);
    const durationDays = Math.max(1, Math.round(pixelWidth / dayWidthPx));
    const normalizedWidth = durationDays * dayWidthPx;
    const normalizedEndX = normalizedStartX + normalizedWidth;
    const startDate = addDays(bar.startDate, startDaysDelta);
    const endDate = addDays(startDate, durationDays - 1);

    return {
      ...bar,
      startX: normalizedStartX,
      endX: normalizedEndX,
      startDate,
      endDate,
      style: {
        ...bar.style,
        left: `${normalizedStartX}px`,
        width: `${normalizedWidth}px`,
      },
    };
  }, [dayWidthPx, draggedItemData, resizedItemData]);

  const buildPreviewItemData = useCallback((itemData: ProcessedItemData): ProcessedItemData => {
    const updatedBar = itemData.barData ? applyPreviewToBar(itemData.barData, itemData.item.id) : null;
    const updatedVisualBars = itemData.visualOnlyBars.map(bar => applyPreviewToBar(bar, itemData.item.id));

    if (updatedBar === itemData.barData && updatedVisualBars.every((bar, idx) => bar === itemData.visualOnlyBars[idx])) {
      return itemData;
    }

    return {
      ...itemData,
      barData: updatedBar,
      visualOnlyBars: updatedVisualBars,
    };
  }, [applyPreviewToBar]);

  const previewProcessedData = useMemo(() => {
    const map = new Map<number, ProcessedItemData>();
    processedData.forEach((itemData, id) => {
      map.set(id, buildPreviewItemData(itemData));
    });
    return map;
  }, [buildPreviewItemData, processedData]);
  
  return (
    <div ref={paneRef} className="w-full relative bg-primary-background "
      style={{ minWidth: `${totalWidth}px` }}
      // --- YENİ HANDLER'LAR EKLENDİ ---
      onMouseLeave={handlePaneMouseLeave}

    // --- YENİ HANDLER'LAR SONU ---
    >

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
                .sort((a, b) => a.rowIndex - b.rowIndex)
                .map(itemData => {
                  const previewItemData = previewProcessedData.get(itemData.item.id) || itemData;

                  return (
                    <React.Fragment key={itemData.item.id}>
                      {/* 1. Görev Çubuğu (Bar) */}
                      <GanttBarRow
                      itemData={previewItemData}
                      originalItemData={itemData}
                      isActive={
                        // 'isActive' kontrolü GÜNCELLENDİ (Yeni hook'un state'ine göre)
                        (isDragging && draggedItemData?.item.id === itemData.item.id) ||
                        (isResizing && resizedItemData?.item.id === itemData.item.id) ||
                        (hoveredItemId === itemData.item.id)
                      }
                      // Bu handler'lar (handleMouseDownOnBar, vb.)
                      // artık 'GanttBarRow' bileşeninin beklediği
                      // (timelineColumnId parametresi alan) 
                      // fonksiyonlarla %100 uyumlu.
                      onBarMouseDown={handleMouseDownOnBar}
                      onResizeHandleMouseDown={handleMouseDownOnResizeHandle}
                      onMouseEnter={() => handleBarMouseEnter(itemData.item.id)}
                      onMouseLeave={handleBarMouseLeave}
                    />

                    {/* 2. Dış Etiket (Bar'ın Yanında) */}
                    {previewItemData.barData && previewItemData.externalLabel && (
                      <div
                        className="absolute flex items-center px-3 text-xs text-gray-700 :text-gray-300 pointer-events-none truncate"
                        style={{
                          // Etiketi her zaman BİRİNCİL barın yanına koyar
                          top: `${(previewItemData.rowIndex * GANTT_ROW_HEIGHT_PX) + GANTT_BAR_TOP_OFFSET_PX}px`,
                          left: `${previewItemData.barData.endX + 6}px`,
                          height: `${GANTT_BAR_HEIGHT_PX}px`,
                          lineHeight: `${GANTT_BAR_HEIGHT_PX}px`,
                          zIndex: 10,
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {previewItemData.externalLabel}
                      </div>
                    )}
                  </React.Fragment>
                );
                })}
            </React.Fragment>
          );
        })}

        {/* OKLAR (Değişiklik Yok) */}
        <GanttArrows
          processedData={previewProcessedData}
          totalWidth={totalWidth}
          totalHeight={totalHeight}
          hoveredItemId={hoveredItemId}
        />

      </div> {/* Ana İçerik sonu */}
    </div> // Pane ref div sonu
  );
};

export default GanttRightPanel;