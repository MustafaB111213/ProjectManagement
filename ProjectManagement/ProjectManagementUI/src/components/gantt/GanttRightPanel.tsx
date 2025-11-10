// src/components/gantt/GanttRightPanel.tsx

import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
// types.ts'den gerekli tüm tipleri import et
import { type Group, type Item, type Column, ColumnType, type DependencyLink, type DependencyType, type User } from '../../types';
import TimelineHeader from './TimelineHeader';
// date-fns'ten gerekli fonksiyonları import et
import { parseISO, differenceInDays, addDays, format, max as maxDate, min as minDate } from 'date-fns';
// Redux hook ve action'ı import et
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { updateItemValue } from '../../store/features/itemSlice';

// Yeni bileşenleri ve tipleri import et
import GanttArrows, { type ProcessedItemData } from './GanttArrows';
import GanttBarRow from './GanttBarRow'; // <-- YENİ BİLEŞEN IMPORTU

import {
  GANTT_ROW_HEIGHT_PX,
  GANTT_BAR_HEIGHT_PX,
  GANTT_BAR_TOP_OFFSET_PX
} from '../common/constants'; // (Dosya yolunu kendinize göre düzeltin)
import { checkDependencyViolations, type UpdatedTaskData } from '../../utils/ganttDependencies';
import { selectAllUsers } from '../../store/features/userSlice';


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
// Yeniden boyutlandırma tarafı tipi
type ResizeSide = 'start' | 'end';

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

  const dispatch = useAppDispatch();
  const paneRef = useRef<HTMLDivElement>(null);

  // --- State'ler ---
  //Hover Edilen Görevin ID'si 
  const [hoveredItemId, setHoveredItemId] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedItemData, setDraggedItemData] = useState<ProcessedItemData | null>(null);
  const [dragStartX, setDragStartX] = useState(0);
  const [initialDragOffsetDays, setInitialDragOffsetDays] = useState(0);

  const [isResizing, setIsResizing] = useState(false);
  const [resizedItemData, setResizedItemData] = useState<ProcessedItemData | null>(null);
  const [resizeSide, setResizeSide] = useState<ResizeSide | null>(null);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [originalStartDate, setOriginalStartDate] = useState<Date | null>(null);
  const [originalEndDate, setOriginalEndDate] = useState<Date | null>(null);

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

  // Diğer aktif ID'ler (baseline'lar için)
  const secondaryTimelineIds = activeTimelineIds.slice(1);
  // --- Tüm Görev Verisini İşleme (useMemo) ---
  // Bu veri, hem barların konumunu hem de okların çizimi için gerekli bilgileri içerir.

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


  // --- Sürükleme Olay Yöneticileri (Değişmedi, ProcessedItemData kullanıyor) ---

  const handleMouseDownOnBar = useCallback((event: React.MouseEvent<HTMLDivElement>, itemData: ProcessedItemData) => {
    if (isResizing || (event.target as HTMLElement).dataset.resizeHandle || event.button !== 0 || !itemData.barData) return;
    // event.preventDefault(); // Tıklamanın 'mouseup'a ulaşması için bunu kaldırabiliriz
    const paneRect = paneRef.current?.getBoundingClientRect();
    if (!paneRect) return;

    const startXCoord = event.clientX - paneRect.left;
    let offsetDays = 0;
    if (primaryTimelineId && itemData.item) {
      const originalItem = items.find(i => i.id === itemData.item.id);
      if (!originalItem) return;
      const value = originalItem.itemValues.find(v => v.columnId === primaryTimelineId)?.value;
      if (value) {
        const [startStr] = value.split('/');
        if (startStr) {
          try {
            const startDate = parseISO(startStr);
            if (!isNaN(startDate.getTime())) {
              offsetDays = differenceInDays(startDate, viewMinDate);
            }
          } catch { }
        }
      }
    }
    // Sürükleme başladığında hover'ı sıfırla
    setHoveredItemId(null);
    setIsDragging(true);
    setDraggedItemData(itemData);
    // DÜZELTME: Panele göre değil, pencereye göre X'i sakla
    setDragStartX(event.clientX);
    setInitialDragOffsetDays(offsetDays);
  }, [viewMinDate, primaryTimelineId, isResizing, items]);

  const handleMouseDownOnResizeHandle = useCallback((
    event: React.MouseEvent<HTMLDivElement>,
    itemData: ProcessedItemData,
    side: ResizeSide
  ) => {
    if (event.button !== 0 || !itemData.barData || !primaryTimelineId) return;
    event.preventDefault();
    event.stopPropagation();
    const paneRect = paneRef.current?.getBoundingClientRect();
    if (!paneRect) return;
    const startXCoord = event.clientX - paneRect.left;

    const originalItem = items.find(i => i.id === itemData.item.id);
    if (!originalItem) return;

    const currentValue = originalItem.itemValues.find(v => v.columnId === primaryTimelineId)?.value;
    if (!currentValue) return;

    try {
      const [startStr, endStr] = currentValue.split('/');
      const start = parseISO(startStr);
      const end = parseISO(endStr);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) throw new Error("Geçersiz tarih");
      setOriginalStartDate(start);
      setOriginalEndDate(end);
    } catch (e) { console.error("Resize başlarken tarih parse hatası:", e); return; }
    setHoveredItemId(null);
    setIsResizing(true);
    setResizedItemData(itemData);
    setResizeSide(side);
    setResizeStartX(startXCoord);
  }, [primaryTimelineId, items]);

  // MouseMove, MouseUp ve useEffect hook'ları aynı kalır.
  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!isDragging && !isResizing) return;
    const paneRect = paneRef.current?.getBoundingClientRect();
    if (!paneRect) return;
    const currentX = event.clientX - paneRect.left;

    if (isDragging && draggedItemData) {
      const deltaX = currentX - dragStartX;
      const deltaDays = Math.round(deltaX / dayWidthPx);
      // ... (anlık güncelleme için)
    } else if (isResizing && resizedItemData /*...*/) {
      const deltaX = currentX - resizeStartX;
      const deltaDays = Math.round(deltaX / dayWidthPx);
      // ... (anlık güncelleme için)
    }
  }, [
    isDragging, draggedItemData, dragStartX,
    isResizing, resizedItemData, resizeSide, resizeStartX, originalStartDate, originalEndDate,
    dayWidthPx
  ]);

  // src/components/gantt/GanttRightPanel.tsx içinde yer alan handleMouseUp hook'u

  const handleMouseUp = useCallback((event: MouseEvent) => {
    const paneRect = paneRef.current?.getBoundingClientRect();

    // Sadece drag veya resize aktifken işlem yap
    if (!isDragging && !isResizing) {
      return;
    }

    if (!paneRect) {
      // Temizleme işlemi
      setIsDragging(false); setDraggedItemData(null);
      setIsResizing(false); setResizedItemData(null); setResizeSide(null);
      setOriginalStartDate(null); setOriginalEndDate(null);
      return;
    }

    const finalWindowX = event.clientX;
    let needsUpdate = false;
    let finalValue = "";
    let finalItemId = -1;
    let finalColumnId = -1;
    let newStartDate: Date | null = null;
    let newEndDate: Date | null = null;

    const dragThreshold = 5; // Tıklama eşiği (5px)


    // --- 1. Sürükleme Bitişi (Drag End) ---
    if (isDragging && draggedItemData && draggedItemData.barData && primaryTimelineId) {
      const windowDeltaX = finalWindowX - dragStartX;

      // Tıklama Kontrolü
      if (Math.abs(windowDeltaX) < dragThreshold) {
        onItemClick(draggedItemData.item.id);
      }
      // Sürükleme Mantığı
      else {
        const originalItem = items.find(i => i.id === draggedItemData.item.id);
        if (!originalItem) return;

        const deltaDays = Math.round(windowDeltaX / dayWidthPx);

        if (deltaDays !== 0) {
          const newStartOffsetDays = initialDragOffsetDays + deltaDays;
          const currentValue = originalItem.itemValues.find(v => v.columnId === primaryTimelineId)?.value;

          if (currentValue) {
            try {
              const [startStr, endStr] = currentValue.split('/');
              const originalEndDate = parseISO(endStr);
              const duration = differenceInDays(originalEndDate, parseISO(startStr));

              newStartDate = maxDate([addDays(viewMinDate, newStartOffsetDays), viewMinDate]);
              newEndDate = addDays(newStartDate, Math.max(0, duration));

              finalValue = `${format(newStartDate, 'yyyy-MM-dd')}/${format(newEndDate, 'yyyy-MM-dd')}`;
              needsUpdate = finalValue !== currentValue;

            } catch (e) { console.error("[DragEnd] Hata:", e); }
          }
        }

        finalItemId = draggedItemData.item.id;
        finalColumnId = primaryTimelineId;
      }
    }
    // --- 2. Yeniden Boyutlandırma Bitişi (Resize End) ---
    else if (isResizing && resizedItemData && resizeSide && originalStartDate && originalEndDate && primaryTimelineId) {
      const paneFinalX = finalWindowX - paneRect.left;
      const deltaX = paneFinalX - resizeStartX; // Panel'e göre fark
      const deltaDays = Math.round(deltaX / dayWidthPx);

      if (deltaDays !== 0) {
        newStartDate = originalStartDate;
        newEndDate = originalEndDate;

        if (resizeSide === 'start') {
          newStartDate = minDate([addDays(originalStartDate, deltaDays), originalEndDate as Date]);
        } else {
          newEndDate = maxDate([addDays(originalEndDate as Date, deltaDays), originalStartDate as Date]);
        }

        finalValue = `${format(newStartDate as Date, 'yyyy-MM-dd')}/${format(newEndDate as Date, 'yyyy-MM-dd')}`;

        const originalItem = items.find(i => i.id === resizedItemData.item.id);
        const currentValue = originalItem?.itemValues.find(v => v.columnId === primaryTimelineId)?.value;

        needsUpdate = finalValue !== currentValue;
      }
      finalItemId = resizedItemData.item.id;
      finalColumnId = primaryTimelineId;
    }


    // =========================================================
    // --- KRİTİK: BAĞIMLILIK İHLAL KONTROLÜ ---
    // =========================================================
    if (needsUpdate && newStartDate && newEndDate) {
      const updatedTask: UpdatedTaskData = {
        itemId: finalItemId,
        newStartDate: newStartDate,
        newEndDate: newEndDate
      };

      // checkDependencyViolations fonksiyonu bu dosyada bulunmadığı için
      // bu çağrı başarısız olacaktır. (import edildiği varsayılır.)
      const violation = checkDependencyViolations(updatedTask, items, columns);

      if (violation) {
        // İhlal bulundu! Kaydetme işlemini iptal et.
        needsUpdate = false;
        alert(`BAĞIMLILIK İHLALİ:\n\n${violation.message}`);
        console.error("Dependency Violation:", violation);
      }
    }
    // =========================================================


    // --- Dispatch ---
    if (needsUpdate && finalItemId !== -1 && finalColumnId !== -1) {
      dispatch(updateItemValue({
        itemId: finalItemId,
        columnId: finalColumnId,
        value: finalValue,
      }));
    }

    // Tüm eylemleri sıfırla (Aynı)
    setIsDragging(false); setDraggedItemData(null);
    setIsResizing(false); setResizedItemData(null); setResizeSide(null);
    setOriginalStartDate(null); setOriginalEndDate(null);

  }, [
    isDragging, draggedItemData, dragStartX, initialDragOffsetDays,
    isResizing, resizedItemData, resizeSide, resizeStartX, originalStartDate, originalEndDate,
    viewMinDate, primaryTimelineId, dispatch, items, dayWidthPx, onItemClick, columns
  ]);

  // --- YENİ: Pane Mouse Leave Handler'ı (ZORLA SIFIRLAMA) ---
  const handlePaneMouseLeave = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    // Yalnızca sürükleme veya boyutlandırma AKTİFSE ve mouse pencereden çıkarsa sıfırla.
    if (isDragging || isResizing) {
      console.log("Panele fare ayrıldı, sürükleme/boyutlandırma state'i sıfırlandı.");
      handleMouseUp(event.nativeEvent); // MouseUp mantığını çağırarak temizleme yap
    }
  }, [isDragging, isResizing, handleMouseUp]);
  // --- YENİ HANDLER SONU ---

  useEffect(() => {
    const isActionActive = isDragging || isResizing;

    if (isActionActive) {
      // --- YENİ KISIM BAŞLANGICI ---

      // 1. Hangi imlecin gösterileceğine karar ver
      let cursor = 'grabbing'; // 'Tutma' imleci
      if (isResizing) {
        cursor = 'ew-resize'; // 'Yatay boyutlandırma' (doğu-batı) imleci
      }

      // 2. İmleci tüm sayfa üzerinde global olarak ayarla
      // Bu, imleç çubuğun dışına çıksa bile stilin korunmasını sağlar.
      document.body.style.cursor = cursor;

      // 3. Metin seçimini engelle (Ø ikonunun ana nedeni budur)
      // Kullanıcı yanlışlıkla çubuktaki metni seçmeye çalışamaz.
      document.body.style.userSelect = 'none';

      // --- YENİ KISIM SONU ---

      // Dinleyicileri ekle (Bu kısım aynı)
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('mouseleave', handleMouseUp); // Pencereden çıkarsa da bırak
    }

    // Cleanup fonksiyonu (Eylem bittiğinde veya component unmount olduğunda)
    return () => {
      // Dinleyicileri kaldır
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mouseleave', handleMouseUp);

      // --- YENİ KISIM: Stilleri sıfırla ---
      // Sürükleme bittiğinde, body'deki stilleri varsayılana döndür.
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

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