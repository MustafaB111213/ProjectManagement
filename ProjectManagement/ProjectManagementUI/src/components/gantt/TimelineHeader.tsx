// src/components/gantt/TimelineHeader.tsx (PROFESYONEL VERSİYON)

import React, { useMemo } from 'react';
import {
    eachDayOfInterval,
    eachWeekOfInterval,
    eachMonthOfInterval,
    eachYearOfInterval, 
    format,
    differenceInDays,
    endOfWeek,
    endOfMonth, 
    endOfYear,  
    isSameDay,  
    min,
    max
} from 'date-fns';
import { tr } from 'date-fns/locale'; // Türkçe aylar için

interface TimelineHeaderProps {
    viewMinDate: Date;
    viewMaxDate: Date;
    dayWidthPx: number; // Her bir günün genişliği (constants.ts'den gelir)
    rowHeightPx: number; // Satır yüksekliği (sol panel ile aynı)
}

// Ay veya Hafta grupları için arayüz
interface IntervalGroup {
    key: string;       // React 'key' prop'u için benzersiz string
    name: string;      // Ekranda görünecek etiket (örn: "Kasım 2025" veya "H42")
    startDate: Date;
    endDate: Date;
    widthPx: number;   // Grubun toplam piksel genişliği
    isToday?: boolean; // "Bugün" sütununu işaretlemek için
}

const TimelineHeader: React.FC<TimelineHeaderProps> = ({
    viewMinDate,
    viewMaxDate,
    dayWidthPx,
    rowHeightPx,
}) => {

    // "Bugün" tarihini her render'da al (saat değişimi riskine karşı)
    const today = new Date();

// --- HANGİ BAŞLIK SEVİYESİNİ GÖSTERECEĞİMİZİ BELİRLE ---
    // Bu mantık, 'constants.ts' dosyanızdaki YENİ 13 adımlı (0-12)
    // ZOOM_STEPS dizisine göre güncellendi.

    // Yıl > Ay Görünümü (En uzak zoom)
    // 'month' seviyesi 10px'e kadar (dahil) olanları kapsar (Index 0-3)
    const isMonthZoom = dayWidthPx <= 10;

    // Ay > Gün Görünümü (Yakın zoom)
    // 'day' seviyesi 30px'ten BÜYÜK olanları kapsar (Index 8-12, dayWidth 35 ve üstü)
    const isDayZoom = dayWidthPx > 60;

    // Ay > Hafta Görünümü (Orta zoom)
    // Geriye kalan her şey (10px'ten büyük, 30px'e eşit veya küçük) 'Hafta'dır. (Index 4-7)
    const isWeekZoom = !isMonthZoom && !isDayZoom;
    // --- GÜNCELLEME SONU ---

    // --- Üst Başlık (Aylar veya Yıllar) ---
    const topHeaderIntervals = useMemo((): IntervalGroup[] => {
        if (isNaN(viewMinDate.getTime()) || isNaN(viewMaxDate.getTime()) || viewMaxDate < viewMinDate) {
            return [];
        }

        let intervals: Date[];
        let formatStr: string;

        if (isMonthZoom) {
            // UZAK ZOOM: Üst başlık YILLARI gösterir (örn: "2025")
            intervals = eachYearOfInterval({ start: viewMinDate, end: viewMaxDate });
            formatStr = 'yyyy';
        } else {
            // ORTA ve YAKIN ZOOM: Üst başlık AYLARI gösterir (örn: "Kasım 2025")
            intervals = eachMonthOfInterval({ start: viewMinDate, end: viewMaxDate });
            formatStr = 'MMMM yyyy';
        }

        return intervals.map((intervalStart) => {
            let intervalEnd: Date;
            if (isMonthZoom) {
                intervalEnd = endOfYear(intervalStart); // Yılın son günü
            } else {
                intervalEnd = endOfMonth(intervalStart); // Ayın son günü
            }

            // Görünüm aralığıyla kesişen günleri bul
            const start = max([viewMinDate, intervalStart]);
            const end = min([viewMaxDate, intervalEnd]);
            const daysInView = end >= start ? differenceInDays(end, start) + 1 : 0;
            const name = format(intervalStart, formatStr, { locale: tr });
            
            return {
                key: name, // Yıl veya Ay adı benzersizdir
                name: name.charAt(0).toUpperCase() + name.slice(1),
                startDate: start,
                endDate: end,
                widthPx: daysInView * dayWidthPx
            };
        });
    }, [viewMinDate, viewMaxDate, dayWidthPx, isMonthZoom]);

    // --- Alt Başlık (Aylar, Haftalar veya Günler) ---
    const bottomHeaderIntervals = useMemo((): IntervalGroup[] => {
        if (isNaN(viewMinDate.getTime()) || isNaN(viewMaxDate.getTime()) || viewMaxDate < viewMinDate) {
            return [];
        }

        // YAKIN ZOOM: Alt başlık GÜNLERİ gösterir (örn: "5", "6", "7")
        if (isDayZoom) {
            const days = eachDayOfInterval({ start: viewMinDate, end: viewMaxDate });
            return days.map(day => {
                const dayStr = format(day, 'd'); // Sadece gün numarası
                return {
                    key: day.toISOString(), // Gün için en benzersiz key
                    name: dayStr,
                    startDate: day,
                    endDate: day,
                    widthPx: dayWidthPx,
                    isToday: isSameDay(day, today) // "Bugün" kontrolü
                };
            });
        }
        // ORTA ZOOM: Alt başlık HAFTALARI gösterir (örn: "H42", "H43")
        else if (isWeekZoom) {
            const weeks = eachWeekOfInterval({ start: viewMinDate, end: viewMaxDate }, { weekStartsOn: 1 }); // Pzt başlar
            return weeks.map(weekStart => {
                const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
                const start = max([viewMinDate, weekStart]);
                const end = min([viewMaxDate, weekEnd]);
                const daysInView = end >= start ? differenceInDays(end, start) + 1 : 0;
                // 'ww', ISO hafta numarasını verir (01-53)
                const weekNumStr = format(weekStart, 'ww', { locale: tr, weekStartsOn: 1 });
                
                return {
                    key: `H${weekNumStr}-${weekStart.getFullYear()}`, // Benzersiz key
                    name: `H${weekNumStr}`,
                    startDate: start,
                    endDate: end,
                    widthPx: daysInView * dayWidthPx
                };
            });
        }
        // UZAK ZOOM: Alt başlık AYLARI gösterir (örn: "Oca", "Şub")
        else if (isMonthZoom) {
            const months = eachMonthOfInterval({ start: viewMinDate, end: viewMaxDate });
            return months.map(monthStart => {
                const monthEnd = endOfMonth(monthStart);
                const start = max([viewMinDate, monthStart]);
                const end = min([viewMaxDate, monthEnd]);
                const daysInView = end >= start ? differenceInDays(end, start) + 1 : 0;
                const monthStr = format(monthStart, 'MMM', { locale: tr }); // "Oca", "Şub"

                return {
                    key: monthStart.toISOString(), // Benzersiz key
                    name: monthStr.charAt(0).toUpperCase() + monthStr.slice(1),
                    startDate: start,
                    endDate: end,
                    widthPx: daysInView * dayWidthPx
                };
            });
        }
        // Hiçbiri eşleşmezse (teorik olarak imkansız)
        else {
            return [];
        }
    }, [viewMinDate, viewMaxDate, dayWidthPx, isDayZoom, isWeekZoom, isMonthZoom, today]);

    return (
        // Toplam yüksekliği koru
        <div
            className="sticky top-0 bg-gray-50 z-20 border-b border-gray-200"
            style={{ height: `${rowHeightPx}px` }}
        >
            {/* ÜST Başlık Satırı (Aylar veya Yıllar) */}
            <div className="flex border-b border-gray-200 h-1/2">
                {topHeaderIntervals.map(interval => (
                    <div
                        key={interval.key}
                        className="flex-shrink-0 flex items-center justify-center px-2 py-1 font-semibold text-xs text-gray-600 text-center border-r border-gray-200"
                        style={{ width: `${interval.widthPx}px` }}
                    >
                        {interval.name}
                    </div>
                ))}
            </div>

            {/* ALT Başlık Satırı (Aylar, Haftalar veya Günler) */}
            <div className="flex h-1/2">
                {bottomHeaderIntervals.map((interval) => (
                    <div
                        key={interval.key}
                        // Sadece 'Gün' görünümündeyken sola border ekle (daha temiz görünüm)
                        className={`relative flex-shrink-0 flex items-center justify-center px-1 py-1 font-medium text-xs text-gray-500 text-center ${isDayZoom ? 'border-r border-gray-200' : 'border-r border-gray-200'}`}
                        style={{ width: `${interval.widthPx}px` }}
                    >
                        {/* "Bugün" için özel işaretleyici */}
                        {interval.isToday && (
                            <div className="absolute top-0.5 left-1/2 -translate-x-1/2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center z-10">
                                <span className="text-white text-[10px] font-bold">{interval.name}</span>
                            </div>
                        )}
                        {/* "Bugün" değilse normal metni göster */}
                        {!interval.isToday && (
                            <span>{interval.name}</span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TimelineHeader;