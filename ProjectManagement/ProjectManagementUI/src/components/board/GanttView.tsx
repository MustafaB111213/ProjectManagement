// src/components/board/GanttView.tsx

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { ColumnType, type Group, type Item } from '../../types'; // type importu burada sorun olmaz

// Redux slice'larımızdan selector'ları import ediyoruz
import { selectAllGroups } from '../../store/features/groupSlice';
import { selectAllItemsFlat } from '../../store/features/itemSlice';
import { selectAllColumns } from '../../store/features/columnSlice';

// Child component'leri import ediyoruz
// GanttToolbar'dan ViewModeOption tipini de import ediyoruz
import GanttToolbar, { type ViewModeOption } from '../gantt/GanttToolbar';
import GanttLeftPanel from '../gantt/GanttLeftPanel'; // Dosya adını kontrol et (Panel vs Pane)
import GanttRightPanel from '../gantt/GanttRightPanel'; // Dosya adını kontrol et (Panel vs Pane)

// date-fns kütüphanesinden gerekli fonksiyonları import ediyoruz
import { format, addMonths, subMonths, differenceInDays, subYears, addYears, isValid, parseISO, addDays } from 'date-fns'; // isValid eklendi
// lodash'tan debounce fonksiyonunu import ediyoruz
import { debounce } from 'lodash';
import { DEFAULT_ZOOM_INDEX, MAX_ZOOM_INDEX, ZOOM_STEPS } from '../common/constants';
import GanttBaselineModal from '../gantt/GanttBaselineModal'; // YENİ MODAL
import { updateBoardViewSettings } from '../../store/features/boardViewSlice';
import ItemDetailModal from '../item/ItemDetailModal';
import { selectSelectedBoard } from '../../store/features/boardSlice';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

// --- YENİ: Durum Grupları için Yapılandırma ---
// StatusCell.tsx'deki listenizi temel alarak, sol paneldeki grup başlıkları
// için sabit ID'ler (panellerin number beklemesine karşılık) ve renkler tanımlıyoruz.
const STATUS_OPTIONS_CONFIG = [
    // ID'ler, panellerin (collapsedGroupIds vb.) number beklemesi nedeniyle önemlidir
    { id: 0, text: 'Yapılıyor', color: '#C2410C' }, // Tailwind 'text-orange-800'
    { id: 1, text: 'Tamamlandı', color: '#047857' }, // Tailwind 'text-green-800'
    { id: 2, text: 'Takıldı', color: '#B91C1C' }, // Tailwind 'text-red-800'
    { id: 3, text: 'Beklemede', color: '#1D4ED8' }, // Tailwind 'text-blue-800'
    { id: 4, text: 'Belirsiz', color: '#374151' }, // Tailwind 'text-gray-700'
];

// Hızlı erişim için bir Harita (Map) oluşturalım
const STATUS_CONFIG_MAP = new Map(STATUS_OPTIONS_CONFIG.map(opt => [opt.text, opt]));
const DEFAULT_STATUS_CONFIG = STATUS_CONFIG_MAP.get('Belirsiz')!;
// --- YENİ ALAN SONU ---

// Props arayüzü
interface GanttViewProps {
    boardId: number; // Bu prop şimdilik kullanılmıyor ama ileride lazım olabilir
    viewId: number; // Hangi görünüm olduğunu bilmek için
    settingsJson: string | null | undefined; // Görünüm ayarları
    zoomIndex: number; // Dışarıdan alınacak
    onZoomIndexChange: (index: number) => void; // Dışarıyı bilgilendirmek için
}
// Ayar JSON'unun tipini tanımla (opsiyonel)
interface GanttSettings {
    activeTimelineIds?: number[];
    groupByColumnId?: number | null;
    colorByColumnId?: number | null;
    labelById?: number | null; // <-- YENİ: null = Proje Adı, -1 = Grup Adı, 123 = Sütun ID
}

const GanttView: React.FC<GanttViewProps> = ({
    boardId,
    viewId,
    settingsJson,
    zoomIndex, // Prop olarak al
    onZoomIndexChange // Prop olarak al
}) => {
    // --- Redux State ---
    const dispatch = useAppDispatch();
    const allGroups = useAppSelector(selectAllGroups);
    const allItems = useAppSelector(selectAllItemsFlat);
    const allColumns = useAppSelector(selectAllColumns);
    const columnStatus = useAppSelector(state => state.columns.status); // Sütunların yüklenme durumu


    const selectedBoard = useAppSelector(selectSelectedBoard);

    // --- Refs ---
    const rightPanelScrollRef = useRef<HTMLDivElement>(null); // Sağ panel (ana scroll)
    const leftPanelInnerRef = useRef<HTMLDivElement>(null); // YENİ: Sol panelin *iç* kayan div'i için ref
    const initialScrollDone = useRef(false);
    
    // --- Ayarları Parse Etme ---
    const settings: GanttSettings = useMemo(() => {
        try {
            return JSON.parse(settingsJson || '{}');
        } catch (e) {
            console.error("Gantt ayarları parse edilemedi:", e);
            return {}; // Hata durumunda boş ayar
        }
    }, [settingsJson]);

    // --- Component State ---
    const [collapsedGroupIds, setCollapsedGroupIds] = useState<Set<number>>(new Set()); // Kapalı grupların ID'leri

    // --- Modal State ---
    const [isWidgetModalOpen, setIsWidgetModalOpen] = useState(false); // Modal'ın genel açık/kapalı durumu

    // --- YENİ: Öğe Detay Modalı State'i ---
    const [selectedItemId, setSelectedItemId] = useState<number | null>(null);

    const [hoveredItemId, setHoveredItemId] = useState<number | null>(null);

    const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);

    // --- Tarih Aralığı State'i ---
    // Başlangıç aralığı: Bugünden 1 yıl öncesi, 2 yıl sonrası
    const initialMinDate = useMemo(() => subYears(new Date(), 1), []);
    const initialMaxDate = useMemo(() => addYears(new Date(), 2), []);
    const [viewMinDate, setViewMinDate] = useState<Date>(initialMinDate);
    const [viewMaxDate, setViewMaxDate] = useState<Date>(initialMaxDate);

    // --- Hesaplanan Değerler (Artık prop'tan gelen zoomIndex'i kullanıyor) ---
    const currentDayWidth = ZOOM_STEPS[zoomIndex].dayWidth;
    const currentLevelLabel = ZOOM_STEPS[zoomIndex].level as ViewModeOption;

    const [focusDate, setFocusDate] = useState<Date | null>(null);
    // --- DEĞİŞİKLİK 1: Kafa karıştırıcı 'timelineColumnId' useMemo'su kaldırıldı. ---
    // Bu değişken yerine 'activeTimelineId' state'i kullanılacak.
    /*
    const timelineColumnId = useMemo(() => {
      if (columnStatus === 'succeeded') {
        return allColumns.find(c => c.type === ColumnType.Timeline)?.id || null;
      }
      return null;
    }, [allColumns, columnStatus]);
    */

    // --- Başlangıç Timeline ID'sini Bul ---
    // Bu mantığı artık array'e göre ayarlamalıyız.
    const initialTimelineIds = useMemo(() => {
        // 1. Kaydedilmiş ayarlar varsa onu kullan
        if (settings.activeTimelineIds && Array.isArray(settings.activeTimelineIds)) {
            // Geçerli ID'leri filtrele
            return settings.activeTimelineIds.filter(id => allColumns.some(c => c.id === id));
        }
        // 2. Kayıtlı ayar yoksa veya geçersizse, ilk 'Timeline' sütununu bul ve dizi olarak dön
        if (columnStatus === 'succeeded') {
            const firstTimeline = allColumns.find(c => c.type === ColumnType.Timeline);
            return firstTimeline ? [firstTimeline.id] : [];
        }
        return [];
    }, [allColumns, columnStatus, settings.activeTimelineIds]); // settings.activeTimelineId -> settings.activeTimelineIds

    // activeTimelineId artık activeTimelineIds dizisi
    const [activeTimelineIds, setActiveTimelineIds] = useState<number[]>(initialTimelineIds);

    // Prop'tan (SettingsJson) gelen 'initialTimelineIds' değiştiğinde state'i güncelle
    useEffect(() => {
        // Sadece gerçekten değiştiyse veya içeriği farklıysa güncelle
        if (JSON.stringify(activeTimelineIds) !== JSON.stringify(initialTimelineIds)) {
            setActiveTimelineIds(initialTimelineIds);
        }
    }, [initialTimelineIds]);


    // --- YENİ: Başlangıç GroupBy ID'sini Bul ---
    const initialGroupByColumnId = useMemo(() => {
        // Ayarlarda 'groupByColumnId' (0 dahil) tanımlıysa onu al, değilse 'null' (Gruplama Yok)
        return settings.groupByColumnId !== undefined ? settings.groupByColumnId : null;
    }, [settings.groupByColumnId]);

    // --- YENİ: GroupBy State'i ---
    const [groupByColumnId, setGroupByColumnId] = useState<number | null>(initialGroupByColumnId);

    // --- YENİ: State'leri Ayarlardan Besleme (Color By) ---
    const initialColorByColumnId = useMemo(() => {
        // Ayarlarda varsa onu al, yoksa varsayılan olarak 'Status' sütununu bul ve ata
        if (settings.colorByColumnId !== undefined) {
            return settings.colorByColumnId; // null veya ID olabilir
        }
        // Varsayılan olarak 'Status' sütununu bul
        const defaultStatusCol = allColumns.find(c => c.type === ColumnType.Status);
        return defaultStatusCol ? defaultStatusCol.id : null;
    }, [settings.colorByColumnId, allColumns]);

    const [colorByColumnId, setColorByColumnId] = useState<number | null>(initialColorByColumnId);

    useEffect(() => {
        // Ayarlar değiştiğinde (örn: başka bir tarayıcıda) state'i güncelle
        const newId = settings.colorByColumnId !== undefined ? settings.colorByColumnId : initialColorByColumnId;
        if (colorByColumnId !== newId) {
            setColorByColumnId(newId);
        }
    }, [settings.colorByColumnId, initialColorByColumnId]); // 'initialColorByColumnId' eklendi

    // --- YENİ: Ayarlar değiştikçe GroupBy State'ini güncelle ---
    useEffect(() => {
        const newId = settings.groupByColumnId !== undefined ? settings.groupByColumnId : null;
        if (groupByColumnId !== newId) {
            setGroupByColumnId(newId);
        }
    }, [settings.groupByColumnId]); // Sadece 'settings' 'den gelen 'groupByColumnId' değiştiğinde çalışır


    // --- YENİ: State'leri Ayarlardan Besleme (Label By) ---
    const initialLabelById = useMemo(() => {
        // Varsayılan 'null' (Proje Adı)
        return settings.labelById !== undefined ? settings.labelById : null;
    }, [settings.labelById]);

    const [labelById, setLabelById] = useState<number | null>(initialLabelById);

    useEffect(() => {
        const newId = settings.labelById !== undefined ? settings.labelById : null;
        if (labelById !== newId) {
            setLabelById(newId);
        }
    }, [settings.labelById]);
    // --- YENİ ALAN SONU ---

    // --- DEĞİŞİKLİK 2: Projenin Min/Max Tarih Aralığını Hesaplayan useMemo ---
    // Bu, 'Otomatik Sığdırma'nın hangi aralığa sığdıracağını bilmesi için gereklidir.
    const projectDateRange = useMemo(() => {
        const primaryTimelineId = activeTimelineIds.length > 0 ? activeTimelineIds[0] : null;
        if (!primaryTimelineId || allItems.length === 0) {
            return { minDate: null, maxDate: null };
        }

        let minProjectDate: Date | null = null;
        let maxProjectDate: Date | null = null;

        for (const item of allItems) {
            const timelineValue = item.itemValues.find(v => v.columnId === primaryTimelineId)?.value;
            if (timelineValue) {
                const [startStr, endStr] = timelineValue.split('/');
                if (startStr && endStr) {
                    try {
                        const startDate = parseISO(startStr);
                        const endDate = parseISO(endStr);

                        if (isValid(startDate) && isValid(endDate)) {
                            if (!minProjectDate || startDate < minProjectDate) {
                                minProjectDate = startDate;
                            }
                            if (!maxProjectDate || endDate > maxProjectDate) {
                                maxProjectDate = endDate;
                            }
                        }
                    } catch (e) { /* Geçersiz tarih, görmezden gel */ }
                }
            }
        }
        return { minDate: minProjectDate, maxDate: maxProjectDate };
    }, [allItems, activeTimelineIds]);
    // --- DEĞİŞİKLİK 2 SONU ---

    // --- Olay Yöneticileri (useCallback ile optimize edildi) ---

    // Bir grubun açılıp kapanmasını yönetir
    const handleToggleGroup = useCallback((groupId: number) => {
        setCollapsedGroupIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(groupId)) newSet.delete(groupId);
            else newSet.add(groupId);
            return newSet;
        });
    }, []);

    // Sağ paneli belirli bir tarihe yatay olarak kaydırır
    const scrollToDate = useCallback((date: Date, behavior: 'smooth' | 'auto' = 'smooth') => {
        // Ref yoksa, min tarih geçerli değilse veya kaydırma zaten yapılmışsa çık
        if (!rightPanelScrollRef.current || !isValid(viewMinDate)) {
            console.warn("scrollToDate iptal edildi: Ref yok veya viewMinDate geçersiz.");
            return;
        }
        try {
            // Tarihin viewMinDate'e göre kaç gün ileride olduğunu hesapla
            const offsetDays = differenceInDays(date, viewMinDate);
            // Kaydırılabilir alanın genişliğini al
            const containerWidth = rightPanelScrollRef.current.offsetWidth;
            // Hedef scroll pozisyonu: (gün sayısı * gün genişliği) - (ekranın yarısı) + (bir günün yarısı)
            // Bu, hedef tarihi ekranın ortasına getirmeye çalışır
            let scrollLeft = (offsetDays * currentDayWidth) - (containerWidth / 2) + (currentDayWidth / 2);
            // Scroll pozisyonunu, toplam scroll genişliğinin sınırları içinde tut
            scrollLeft = Math.max(0, Math.min(scrollLeft, rightPanelScrollRef.current.scrollWidth - containerWidth));

            // Kaydırmayı yap
            rightPanelScrollRef.current.scrollTo({ left: scrollLeft, behavior });
            // console.log(`scrollToDate: Hedef=${format(date, 'yyyy-MM-dd')}, offsetDays=${offsetDays}, scrollLeft=${scrollLeft.toFixed(0)}`);

        } catch (error) {
            console.error("scrollToDate hatası:", error);
        }
    }, [viewMinDate, currentDayWidth]); // viewMinDate ve currentDayWidth değişince bu fonksiyon yeniden oluşturulur

    // --- YENİ EFFECT: Otomatik Sığdırma'nın kaydırma işlemini tetiklemek için ---
useEffect(() => {
    // Sadece focusDate ayarlandığında çalış
    if (focusDate) {
        // state'ler (viewMinDate, zoomIndex) güncellendikten SONRA,
        // scrollToDate'i 'auto' (animasyonsuz) olarak çağır.
        // Bu, 'scrollToDate'in yeni 'currentDayWidth' ve 'viewMinDate'
        // değerlerini (scrollToDate'in bağımlılıkları aracılığıyla) kullanmasını garanti eder.
        console.log(`[useEffect Focus] ${format(focusDate, 'yyyy-MM-dd')} tarihine kaydırılıyor...`);
        
        scrollToDate(focusDate, 'auto');
        
        // Tetiği hemen sıfırla ki tekrar çalışmasın
        setFocusDate(null);
    }
    // 'scrollToDate' (ve onun bağımlılıkları olan 'viewMinDate' ve 'currentDayWidth') 
    // güncel olduğunda bu effect'in çalışması güvenlidir.
}, [focusDate, scrollToDate]);

    // --- Yan Etkiler (useEffect) ---

    // Component ilk yüklendiğinde bugüne kaydır
    useEffect(() => {
        // Eğer scroll zaten yapıldıysa veya sütunlar henüz yüklenmediyse veya min tarih geçerli değilse çık
        if (initialScrollDone.current || columnStatus !== 'succeeded' || !isValid(viewMinDate)) {
            return;
        }

        // Kısa bir gecikmeyle bugüne kaydır (DOM'un tamamen hazır olması için)
        const timer = setTimeout(() => {
            console.log("İlk yükleme: Bugüne kaydırılıyor...");
            scrollToDate(new Date(), 'auto'); // İlk kaydırma anlık olsun
            initialScrollDone.current = true; // Scroll yapıldı olarak işaretle
        }, 150);

        // Component kaldırılırsa timer'ı temizle
        return () => clearTimeout(timer);

    }, [viewMinDate, columnStatus, scrollToDate]); // Bu değerler değiştiğinde useEffect tekrar çalışır

    // --- Zoom Fonksiyonları (Scroll Koruma ile) ---

    // Kaydırma pozisyonunu koruyarak zoom index'ini güncelleyen yardımcı fonksiyon
    const updateZoomIndexAndScroll = useCallback((newIndexCallback: (prevIndex: number) => number) => {
        // Ref yoksa veya min tarih geçerli değilse çık
        if (!rightPanelScrollRef.current || !isValid(viewMinDate)) {
            console.warn("updateZoomIndexAndScroll iptal edildi: Ref yok veya viewMinDate geçersiz.");
            return;
        }


        const scrollDiv = rightPanelScrollRef.current;
        const oldScrollLeft = scrollDiv.scrollLeft; // Mevcut scroll pozisyonu
        const oldOffsetWidth = scrollDiv.offsetWidth; // Konteynerin görünür genişliği
        const oldDayWidth = currentDayWidth; // Zoom DEĞİŞMEDEN ÖNCEKİ gün genişliği

        // Ekranın ortasına denk gelen pikseli bul
        const centerPx = oldScrollLeft + oldOffsetWidth / 2;
        // Bu pikselin kaçıncı güne denk geldiğini (min tarihten itibaren) hesapla
        const centerDayOffset = Math.round(centerPx / oldDayWidth);
        // Ortadaki günün tarihini bul (çok hassas olmasına gerek yok, sadece scroll için)
        // const centerDate = addSeconds(viewMinDate, centerDayOffset * 86400);


        // Yeni zoom index'ini hesapla (callback kullanarak)
        const newIndex = newIndexCallback(zoomIndex);
        // Yeni index'e karşılık gelen gün genişliğini al
        const newDayWidth = ZOOM_STEPS[newIndex].dayWidth;

        // Eğer index değişmediyse (zaten en uçta ise) bir şey yapma
        if (newIndex === zoomIndex) return;


        console.log(`[ZOOM] Değişim: Index ${zoomIndex} (${oldDayWidth}px) -> ${newIndex} (${newDayWidth}px)`);
        console.log(`[ZOOM] Merkez Hesaplama: centerPx=${centerPx.toFixed(0)}, centerDayOffset=${centerDayOffset}`);

        // --- DEĞİŞTİ: Lokal state yerine parent'ı bilgilendir ---
        onZoomIndexChange(newIndex);

        // Scroll pozisyonunu AYARLAMAK için requestAnimationFrame kullanıyoruz.
        // Bu, React render işlemi bittikten ve DOM güncellendikten SONRA çalışır.
        requestAnimationFrame(() => {
            // Ref hala geçerli mi diye tekrar kontrol et (önemli!)
            if (rightPanelScrollRef.current) {
                // YENİ scroll pozisyonunu hesapla:
                // (Merkezdeki günün sırası * YENİ gün genişliği) - (ekran genişliğinin yarısı)
                const currentOffsetWidth = scrollDiv.offsetWidth; // Güncel genişliği al
                const newScrollLeft = (centerDayOffset * newDayWidth) - (currentOffsetWidth / 2);
                // Hesaplanan scroll değerini 0'dan küçük olmayacak şekilde ayarla
                const clampedScrollLeft = Math.max(0, newScrollLeft);

                console.log(`[ZOOM RAF] scrollLeft ayarlanıyor: ${clampedScrollLeft.toFixed(0)} (Offset=${centerDayOffset}, NewWidth=${newDayWidth}, ContWidth=${currentOffsetWidth})`);
                // Scroll'u anlık olarak ayarla (behavior: 'auto')
                scrollDiv.scrollLeft = clampedScrollLeft;
            } else {
                console.warn("[ZOOM RAF] scrollDiv ref'i geçersiz oldu!");
            }
        });

    }, [zoomIndex, currentDayWidth, viewMinDate, onZoomIndexChange]); // Bu değerler değişince fonksiyon yeniden oluşturulur


    // Dropdown'dan preset (Gün/Hafta/Ay) seçildiğinde
    const handleViewModeChange = useCallback((newMode: ViewModeOption) => {
        console.log(`Preset seçildi: ${newMode}`);
        // Seçilen moda en uygun zoom index'ini bul
        let targetIndex = DEFAULT_ZOOM_INDEX; // Varsayılan 'Gün'
        if (newMode === 'week') {
            targetIndex = 4; // ZOOM_STEPS içindeki 'week' (10px) index'i
        } else if (newMode === 'month') {
            targetIndex = 1; // ZOOM_STEPS içindeki 'month' (3px) index'i
        }
        // updateZoomIndexAndScroll'a hedef index'i döndüren bir fonksiyon ver
        updateZoomIndexAndScroll(() => targetIndex);
    }, [updateZoomIndexAndScroll, DEFAULT_ZOOM_INDEX]); // updateZoomIndexAndScroll değişince bu da yeniden oluşur

    // Yakınlaştır (+) butonuna tıklandığında
    const handleZoomIn = useCallback(() => {
        // Mevcut index'i 1 artır, MAX_ZOOM_INDEX'i geçmesin
        updateZoomIndexAndScroll(prev => Math.min(prev + 1, MAX_ZOOM_INDEX));
    }, [updateZoomIndexAndScroll]);

    // Uzaklaştır (-) butonuna tıklandığında
    const handleZoomOut = useCallback(() => {
        // Mevcut index'i 1 azalt, 0'ın altına düşmesin
        updateZoomIndexAndScroll(prev => Math.max(prev - 1, 0));
    }, [updateZoomIndexAndScroll]);

    // --- YENİ: Hover Handler'ları ---
    const handleItemMouseEnter = useCallback((itemId: number) => {
        setHoveredItemId(itemId);
    }, []);

    const handleItemMouseLeave = useCallback(() => {
        setHoveredItemId(null);
    }, []);
    // --- YENİ ALAN SONU ---

    // --- Aşamalı Yükleme State ve Mantığı ---
    const loadMoreDatesThreshold = 500; // Kenara kaç piksel kala yüklenecek
    const loadMoreMonthsAmount = 6;     // Her seferinde kaç ay eklenecek
    const [isLoadingMorePast, setIsLoadingMorePast] = useState(false);
    const [isLoadingMoreFuture, setIsLoadingMoreFuture] = useState(false);

    // Debounce edilmiş (gecikmeli çalışan) asıl yükleme fonksiyonu
    const debouncedLoadMore = useCallback(debounce((
        scrollLeft: number,
        scrollWidth: number,
        offsetWidth: number
    ) => {
        // Sola (geçmişe) doğru yükleme kontrolü
        if (!isLoadingMorePast && scrollLeft < loadMoreDatesThreshold) {
            setIsLoadingMorePast(true); // Yükleme başladığını işaretle
            setViewMinDate(prevMinDate => { // Min tarihi güncelle
                const newMinDate = subMonths(prevMinDate, loadMoreMonthsAmount);
                console.log(`[Gantt Scroll] Geçmiş yükleniyor... Yeni Min Tarih: ${format(newMinDate, 'yyyy-MM-dd')}`);
                // Kısa bir süre sonra yükleme bayrağını sıfırla (tekrar tetiklenebilmesi için)
                setTimeout(() => setIsLoadingMorePast(false), 500);
                return newMinDate;
            });
        }

        // Sağa (geleceğe) doğru yükleme kontrolü
        // (scrollWidth > offsetWidth kontrolü, scroll bar varsa yükleme yap demek)
        if (!isLoadingMoreFuture && scrollWidth > offsetWidth &&
            (scrollWidth - scrollLeft - offsetWidth) < loadMoreDatesThreshold) {
            setIsLoadingMoreFuture(true); // Yükleme başladığını işaretle
            setViewMaxDate(prevMaxDate => { // Max tarihi güncelle
                const newMaxDate = addMonths(prevMaxDate, loadMoreMonthsAmount);
                console.log(`[Gantt Scroll] Gelecek yükleniyor... Yeni Max Tarih: ${format(newMaxDate, 'yyyy-MM-dd')}`);
                // Kısa bir süre sonra yükleme bayrağını sıfırla
                setTimeout(() => setIsLoadingMoreFuture(false), 500);
                return newMaxDate;
            });
        }
    }, 300), [loadMoreMonthsAmount, isLoadingMorePast, isLoadingMoreFuture, setViewMinDate, setViewMaxDate]);

// --- DEĞİŞTİRİLMİŞ 'handleAutoFit' Fonksiyonu ---
    const handleAutoFit = useCallback(() => {
        const { minDate } = projectDateRange;
        const scrollContainer = rightPanelScrollRef.current;

        // 1. Projede görev yoksa
        if (!minDate || !scrollContainer) {
            alert("Otomatik sığdırma için geçerli tarih aralığına sahip görev bulunamadı.");
            return;
        }

        // 2. Zoom'u "Hafta" (index 1) olarak ayarla. 
        // (Siz 'ideal uzaklığı' sonra ayarlayacağımızı söylediniz, 
        // bu yüzden şimdilik sabit bir 'Hafta' görünümü kullanıyoruz)
        const newZoomIndex = 1; // ZOOM_STEPS[1] = 10px/day ('week')

        // 3. Görünüm aralığını genişlet (Kaydırma çubuğunun oluşması için)
        // Proje başlangıç tarihini baz alarak 1 yıl önce ve 1 yıl sonra
        const newMinDate = subYears(minDate, 1);
        const newMaxDate = addYears(minDate, 1);

        console.log(`[AutoFit Click] State'ler ayarlanıyor. Hedef: ${format(minDate, 'yyyy-MM-dd')}, Zoom: ${newZoomIndex}`);

        // 4. State'leri Güncelle
        onZoomIndexChange(newZoomIndex); 
        setViewMinDate(newMinDate);
        setViewMaxDate(newMaxDate);
        
        // 5. KAYDIRMA TETİĞİNİ AYARLA
        // scrollToDate'i buradan ÇAĞIRMIYORUZ.
        // Sadece 'focusDate' state'ini ayarlıyoruz. 
        // Bu, yukarıdaki useEffect'i tetikleyecek.
        setFocusDate(minDate); 

    }, [projectDateRange, onZoomIndexChange]);

// --- PERFORMANS GÜNCELLEMESİ: handleScroll ---
    const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
        const { scrollLeft, scrollTop, scrollWidth, offsetWidth } = event.currentTarget;

        // 1. Dikey scroll'u SOL panele anında aktar (RE-RENDER YOK)
        // 'leftPanelInnerRef'in (GanttLeftPanel'den gelen ref) 'style.transform'ını ayarla
        if (leftPanelInnerRef.current) {
            leftPanelInnerRef.current.style.transform = `translateY(-${scrollTop}px)`;
        }

        // 2. Yatay scroll (Lazy loading için - Değişmedi)
        debouncedLoadMore(scrollLeft, scrollWidth, offsetWidth);
    };
    // --- GÜNCELLEME SONU ---

    // YENİ: Toplam İçerik Yüksekliğini Hesaplamak İçin Ref
    const totalHeightRef = useRef(0);

// --- PERFORMANS GÜNCELLEMESİ: handleLeftPanelWheel ---
    const handleLeftPanelWheel = useCallback((deltaY: number) => {
        const rightPanel = rightPanelScrollRef.current;
        if (!rightPanel) return;

        // 1. Sağ panelin scroll'unu programatik olarak ayarla
        const newScrollTop = rightPanel.scrollTop + deltaY;
        rightPanel.scrollTop = newScrollTop; // Bu, 'onScroll' event'ini tetiklemez

        // 2. 'onScroll' tetiklenmediği için, sol paneli MANUEL olarak senkronize et
        if (leftPanelInnerRef.current) {
            leftPanelInnerRef.current.style.transform = `translateY(-${newScrollTop}px)`;
        }
    }, []); // Bağımlılık dizisi boş
    // --- GÜNCELLEME SONU ---

    // --- YENİ: Ayar Değişikliği Handler (Dizi Yönetimi) ---
    // Bu fonksiyon artık bir dizi ID alacak ve settingsJson'ı dizi olarak kaydedecek.
    const handleTimelineColumnChange = useCallback((newIds: number[]) => {
        setActiveTimelineIds(newIds);

        // GÜNCELLEME: Diğer ayarları (groupByColumnId gibi) koru
        const newSettings: GanttSettings = {
            ...settings, // Mevcut ayarları al
            activeTimelineIds: newIds // Sadece timeline'ı güncelle
        };

        dispatch(updateBoardViewSettings({
            boardId: boardId,
            viewId: viewId,
            payload: {
                settingsJson: JSON.stringify(newSettings)
            }
        }));
    }, [dispatch, boardId, viewId, settings]); // <-- 'settings' 'i dependency olarak ekle

    // --- YENİ: GroupBy Değişikliği Handler'ı ---
    const handleGroupByColumnChange = useCallback((newId: number | null) => {
        setGroupByColumnId(newId);

        // Mevcut ayarları (activeTimelineIds) koru
        const newSettings: GanttSettings = {
            ...settings,
            groupByColumnId: newId // Sadece gruplamayı güncelle
        };

        dispatch(updateBoardViewSettings({
            boardId: boardId,
            viewId: viewId,
            payload: {
                settingsJson: JSON.stringify(newSettings)
            }
        }));
    }, [dispatch, boardId, viewId, settings]); // <-- 'settings' 'i dependency olarak ekle


    // --- YENİ: Dinamik Grup ve Görev Oluşturma ---
    // Bu `useMemo`, Gantt panellerine hangi grupların ve görevlerin
    // gönderileceğine karar veren ana mantıktır.
    // --- YENİ: ColorBy Değişikliği Handler'ı ---
    const handleColorByColumnChange = useCallback((newId: number | null) => {
        setColorByColumnId(newId);

        // Mevcut ayarları (diğerlerini) koru
        const newSettings: GanttSettings = {
            ...settings,
            colorByColumnId: newId // Sadece renklendirmeyi güncelle
        };

        dispatch(updateBoardViewSettings({
            boardId: boardId,
            viewId: viewId,
            payload: {
                settingsJson: JSON.stringify(newSettings)
            }
        }));
    }, [dispatch, boardId, viewId, settings]);

    // --- YENİ: LabelBy Değişikliği Handler'ı ---
    const handleLabelByChange = useCallback((newId: number | null) => {
        setLabelById(newId);

        const newSettings: GanttSettings = {
            ...settings,
            labelById: newId // Sadece etiketi güncelle
        };

        dispatch(updateBoardViewSettings({
            boardId: boardId,
            viewId: viewId,
            payload: {
                settingsJson: JSON.stringify(newSettings)
            }
        }));
    }, [dispatch, boardId, viewId, settings]);
    // --- YENİ ALAN SONU ---

    // --- YENİ: Öğe Tıklama Handler'ı ---
    const handleItemClick = useCallback((itemId: number) => {
        setSelectedItemId(itemId);
    }, []);

    // --- Modal Kapatma Handler'ı (GÜNCELLENDİ) ---
    const handleCloseModal = () => {
        setIsWidgetModalOpen(false); // Ayar modalını kapat
        setSelectedItemId(null); // Öğe detay modalını kapat
    };
    // --- YENİ ALAN SONU ---

    // --- YENİ: Sol Panel Kapatma Handler'ı ---
    const handleToggleLeftPanel = useCallback(() => {
        setIsLeftPanelOpen(prev => !prev);
    }, []);
    // --- YENİ ALAN SONU ---

    // --- Dinamik Grup ve Görev Oluşturma ---
    const displayData = useMemo(() => {

        // 1. Gruplama ayarı seçilmemişse (Aynı)
        if (!groupByColumnId) {
            return { groups: allGroups, items: allItems };
        }
        // 2. Gruplama ayarı seçilmişse (Aynı)
        const groupingColumn = allColumns.find(c => c.id === groupByColumnId);

        // 3. Ayar 'Durum' sütununa göreyse
        if (groupingColumn && groupingColumn.type === ColumnType.Status) {

            // 3a. Sanal Grupları Oluştur (HATA DÜZELTMESİ EKLENDİ)
            const displayGroups: Group[] = STATUS_OPTIONS_CONFIG.map((config, index) => ({
                id: config.id,
                title: config.text,
                color: config.color,
                // --- HATA DÜZELTMESİ (TS2322) ---
                // 'Group' tipinizin beklediği eksik alanları ekliyoruz
                boardId: boardId,
                order: index // Sıralama için index'i kullanabiliriz
                // --- DÜZELTME SONU ---
            }));

            // 3b. Görevleri (items) klonla ve 'groupId'lerini değiştir (Aynı)
            const displayItems: Item[] = allItems.map(item => {
                const itemValue = item.itemValues.find(v => v.columnId === groupByColumnId)?.value;
                const config = STATUS_CONFIG_MAP.get(itemValue || '') || DEFAULT_STATUS_CONFIG;
                return { ...item, groupId: config.id };
            });

            return { groups: displayGroups, items: displayItems };
        }

        // 4. Diğer durumlar (Aynı)
        return { groups: allGroups, items: allItems };

    }, [groupByColumnId, allGroups, allItems, allColumns, boardId]); // <-- 'boardId' dependency eklendi

    // --- YENİ: Seçilen Öğeyi ve Grubunu Bul ---
    const selectedItem = useMemo(() => {
        if (!selectedItemId) return null;
        return allItems.find(i => i.id === selectedItemId) || null;
    }, [selectedItemId, allItems]);

    const selectedGroup = useMemo(() => {
        if (!selectedItem) return null;
        // 'displayData.groups'u kullanıyoruz ki, 'Grupla: Durum' seçiliyse
        // "Yapılıyor" gibi sanal grup adını göstersin.
        return displayData.groups.find(g => g.id === selectedItem.groupId) || null;
    }, [selectedItem, displayData.groups]);
    // --- YENİ ALAN SONU ---


    // --- YENİ: Toplam Yüksekliği Hesapla (GanttRightPanel'deki mantığın aynısı)
    const maxRowIndex = useMemo(() => {
        // Bu mantık processedData'nın hesaplanmasına dayanır. Basitleştirilmiş bir versiyonunu alalım:
        const visibleGroups = displayData.groups.filter(g => !collapsedGroupIds.has(g.id));
        let count = 0;
        visibleGroups.forEach(g => {
            count++; // Grup başlığı
            count += displayData.items.filter(i => i.groupId === g.id).length; // Görevler
        });
        return count > 0 ? count - 1 : 0;
    }, [displayData.groups, displayData.items, collapsedGroupIds]);

    // Toplam yüksekliği hesapla ve ref'e kaydet
    useEffect(() => {
        // Hesaplanan totalHeight, RightPanel'deki içerik div'inin yüksekliğidir.
        const totalHeight = (maxRowIndex + 1) * 44; // 44, GANTT_ROW_HEIGHT_PX olmalı
        totalHeightRef.current = totalHeight;
    }, [maxRowIndex]);
    // --- YÜKSEKLİK HESAPLAMA SONU ---

    // --- Yüklenme Durumu ---
    const isLoading = useAppSelector(state =>
        state.groups.status !== 'succeeded' ||
        state.items.status !== 'succeeded' ||
        state.columns.status !== 'succeeded'
    );

    // Veri yükleniyorsa veya Timeline sütunu bulunamadıysa gösterilecekler
    if (isLoading || columnStatus !== 'succeeded') {
        return <div className="p-4 text-center">Gantt Şeması Yükleniyor...</div>;
    }

    // Hata kontrolünü güncelleyin (Artık activeTimelineIds.length > 0 olmalı)
    // (Satır 378 civarı)
    if (activeTimelineIds.length === 0) { // activeTimelineId === null -> activeTimelineIds.length === 0
        return <div className="p-4 text-center text-red-600">Hata: Bu panoda 'Timeline' tipinde bir sütun bulunamadı. Lütfen ekleyin.</div>;
    }

    // --- YENİ: Tek Modal Açma Fonksiyonu ---
    const handleOpenWidgetModal = () => {
        setIsWidgetModalOpen(true); // Modalı aç
    };

    // ------------------------------------
    // --- RENDER ---
    return (
        // Ana Konteyner (Çerçeve stilleriyle)
        <div className="flex flex-col h-full w-full border border-gray-200 rounded-lg shadow-sm overflow-hidden bg-white:bg-gray-800 dark:border-gray-700 relative">
            {/* Araç Çubuğu */}
            <GanttToolbar
                scrollToDate={scrollToDate}
                currentLevelLabel={currentLevelLabel} // Mevcut zoom seviyesinin etiketini gönder
                onViewModeChange={handleViewModeChange} // Preset seçildiğinde çalışacak fonksiyon
                onZoomIn={handleZoomIn}
                onZoomOut={handleZoomOut}
                zoomIndex={zoomIndex}
                maxZoomIndex={MAX_ZOOM_INDEX}
                // 1. Ayarlar (FiSettings) butonuna tıklandığında:
                onSettingsClick={handleOpenWidgetModal}
                onAutoFit={handleAutoFit}
                // 2. Ayarlar ikonu aktif mi? (Modal açıksa evet)
                isSettingsOpen={isWidgetModalOpen}
            />

            {/* İçerik Alanı (Sol ve Sağ Paneller) */}
            <div className="flex-1 flex w-full relative overflow-hidden">

                {/* Sol Panel (Görev Listesi) - GÜNCELLENDİ */}
                <div
                    // Dikey scroll YASAK (overflow-y-hidden)
                    className={`
                        flex-shrink-0 
                        transition-all duration-300 ease-in-out
                        overflow-hidden
                        ${isLeftPanelOpen ? 'w-[400px]' : 'w-0'}
                        relative 
                    `}
                >
                    {/* İçerik, animasyon sırasında sıkışmasın diye ekstra wrapper */}
                    <div
                        className="w-[400px] h-full overflow-y-hidden overflow-x-hidden border-r dark:border-gray-700"
                        // YENİ: Mouse tekerlek olayını yakala
                        onWheel={(e) => handleLeftPanelWheel(e.deltaY)}
                    >
                        <GanttLeftPanel
                            innerRef={leftPanelInnerRef}
                            onWheel={() => {}} // Zaten kapsayıcı div'de ele alıyoruz, boş fonksiyon
                            groups={displayData.groups}
                            items={displayData.items}
                            collapsedGroupIds={collapsedGroupIds}
                            onToggleGroup={handleToggleGroup}
                            onItemClick={handleItemClick}
                            hoveredItemId={hoveredItemId}
                        />
                    </div>
                </div>
                <div className="flex-shrink-0 w-px bg-gray-200 :bg-gray-700 relative z-20">
                    <button
                        onClick={handleToggleLeftPanel}
                        className="
                                absolute top-1/2 -left-3 w-7 h-7 
                                bg-white :bg-gray-800 
                                border border-gray-300 dark:border-gray-600 
                                rounded-full shadow-md 
                                flex items-center justify-center 
                                text-gray-500 hover:text-gray-900 :hover:text-white
                                focus:outline-none focus:ring-2 focus:ring-gray-500
                                "
                        style={{ transform: 'translateY(-50%)' }}
                        title={isLeftPanelOpen ? "Paneli daralt" : "Paneli genişlet"}
                    >
                        {isLeftPanelOpen ? <FiChevronLeft size={18} /> : <FiChevronRight size={18} />}
                    </button>
                </div>
                {/* Sağ Panel Sarmalayıcısı - GÜNCELLENDİ */}
                <div
                    ref={rightPanelScrollRef}
                    // 'flex' ve 'justify-center' kaldırıldı.
                    // Bu, 'Bugün' butonunun scrollLeft=0'a takılmasını engeller.
                    className="flex-1 w-full overflow-auto"
                    onScroll={handleScroll}
                >
                    <GanttRightPanel
                        groups={displayData.groups}
                        items={displayData.items}
                        columns={allColumns}
                        activeTimelineIds={activeTimelineIds}
                        colorByColumnId={colorByColumnId}
                        labelById={labelById}
                        viewMinDate={viewMinDate}
                        viewMaxDate={viewMaxDate}
                        // scrollTop={scrollTop} // <-- KALDIRILDI (Çift kaydırma hatası)
                        collapsedGroupIds={collapsedGroupIds}
                        dayWidthPx={currentDayWidth}
                        onItemClick={handleItemClick}
                        onMouseEnterBar={handleItemMouseEnter} // <-- YENİ
                        onMouseLeaveBar={handleItemMouseLeave} // <-- YENİ
                    />
                </div>
            </div>
            {/* Modal (GÜNCELLENDİ - colorBy... propları eklendi) */}
            {/* Modal (GÜNCELLENDİ - Tüm UI state'leri ve setter'lar eklendi) */}
            {boardId && (
                <GanttBaselineModal
                    isOpen={isWidgetModalOpen}
                    onClose={handleCloseModal}
                    boardId={boardId}
                    initialOpenSection={null}
                    groups={displayData.groups}
                    items={displayData.items}
                    activeTimelineIds={activeTimelineIds}
                    onTimelineColumnChange={handleTimelineColumnChange}
                    groupByColumnId={groupByColumnId}
                    onGroupByColumnChange={handleGroupByColumnChange}
                    colorByColumnId={colorByColumnId}
                    onColorByColumnChange={handleColorByColumnChange}
                    labelById={labelById}
                    onLabelByChange={handleLabelByChange}
                    // PAYLAŞILAN STATE'LER
                    zoomIndex={zoomIndex}
                    setZoomIndex={onZoomIndexChange} 
                    viewMinDate={viewMinDate}
                    setViewMinDate={setViewMinDate}
                    viewMaxDate={viewMaxDate}
                    setViewMaxDate={setViewMaxDate}
                    collapsedGroupIds={collapsedGroupIds}
                    setCollapsedGroupIds={setCollapsedGroupIds}
                    hoveredItemId={hoveredItemId}
                    setHoveredItemId={setHoveredItemId}
                    isLeftPanelOpen={isLeftPanelOpen}
                    setIsLeftPanelOpen={setIsLeftPanelOpen}
                />
            )}

            {/* 2. YENİ: Öğe Detay Modalı */}
            {selectedItem && (
                <ItemDetailModal
                    isOpen={selectedItemId !== null}
                    onClose={handleCloseModal} // Aynı kapatma fonksiyonu
                    item={selectedItem}
                    group={selectedGroup}
                    columns={allColumns}
                    boardName={selectedBoard.name}
                    allItems={allItems} // <-- YENİ PROP (Tüm item listesi)
                />
            )}
        </div>
    );
};

export default GanttView;