// src/components/gantt/TimelineHeader.tsx

import React, { useMemo } from 'react';
import {
    eachDayOfInterval,
    eachWeekOfInterval,
    eachMonthOfInterval,
    eachQuarterOfInterval,
    eachYearOfInterval,
    format,
    differenceInCalendarDays,
    endOfWeek,
    endOfMonth,
    endOfQuarter,
    endOfYear,
    isSameDay,
    min,
    max,
    addYears,
    startOfWeek,
    startOfMonth, // Gerekirse kullanılabilir
    startOfQuarter // Gerekirse kullanılabilir
} from 'date-fns';
import { tr } from 'date-fns/locale';

interface TimelineHeaderProps {
    viewMinDate: Date;
    viewMaxDate: Date;
    dayWidthPx: number;
    rowHeightPx: number;
}

interface IntervalGroup {
    key: string;
    name: string;
    startDate: Date;
    endDate: Date;
    widthPx: number;
    isToday?: boolean;
    className?: string;
}

const TimelineHeader: React.FC<TimelineHeaderProps> = ({
    viewMinDate,
    viewMaxDate,
    dayWidthPx,
    rowHeightPx,
}) => {
    const today = new Date();

    // --- ZOOM SEVİYESİ MANTIĞI (Hiyerarşi Belirleme) ---
    
    // 1. YIL GÖRÜNÜMÜ: 0.5px - 1.5px (Altta Yıl, Üstte On Yıl)
    const isYearZoom = dayWidthPx <= 1.5;

    // 2. ÇEYREK GÖRÜNÜMÜ: 2px - 6px (Altta Çeyrek, Üstte Yıl)
    const isQuarterZoom = dayWidthPx > 1.5 && dayWidthPx <= 6;

    // 3. AY GÖRÜNÜMÜ: 7px - 15px (Altta Ay, Üstte Çeyrek(Yıl))
    const isMonthZoom = dayWidthPx > 6 && dayWidthPx <= 15;

    // 4. GÜN GÖRÜNÜMÜ: 60px ve üzeri (Altta Gün, Üstte Hafta(Ay Yıl))
    const isDayZoom = dayWidthPx >= 60;

    // 5. HAFTA GÖRÜNÜMÜ: Geriye kalanlar (20px - 50px) (Altta Hafta, Üstte Ay(Çeyrek))
    const isWeekZoom = !isYearZoom && !isQuarterZoom && !isMonthZoom && !isDayZoom;


    // --- ÜST BAŞLIK HESAPLAMASI ---
    const topHeaderIntervals = useMemo((): IntervalGroup[] => {
        if (isNaN(viewMinDate.getTime()) || isNaN(viewMaxDate.getTime()) || viewMaxDate < viewMinDate) return [];

        // 1. YIL GÖRÜNÜMÜ -> Üstte ON YILLAR (Decades)
        if (isYearZoom) {
            const startYear = viewMinDate.getFullYear();
            const endYear = viewMaxDate.getFullYear();
            const startDecade = Math.floor(startYear / 10) * 10;
            const endDecade = Math.floor(endYear / 10) * 10;
            
            const intervals: IntervalGroup[] = [];
            for (let y = startDecade; y <= endDecade; y += 10) {
                const decadeStart = new Date(y, 0, 1);
                const decadeEnd = endOfYear(addYears(decadeStart, 9));
                
                const start = max([viewMinDate, decadeStart]);
                const end = min([viewMaxDate, decadeEnd]);
                
                if (start <= end) {
                    const daysInView = differenceInCalendarDays(end, start) + 1;
                    intervals.push({
                        key: `decade-${y}`,
                        name: `${y} - ${y + 9}`, // Örn: 2020 - 2029
                        startDate: start,
                        endDate: end,
                        widthPx: daysInView * dayWidthPx
                    });
                }
            }
            return intervals;
        }

        // 2. ÇEYREK GÖRÜNÜMÜ -> Üstte YILLAR
        if (isQuarterZoom) {
            const years = eachYearOfInterval({ start: viewMinDate, end: viewMaxDate });
            return years.map(yearStart => {
                const yearEnd = endOfYear(yearStart);
                const start = max([viewMinDate, yearStart]);
                const end = min([viewMaxDate, yearEnd]);
                const daysInView = end >= start ? differenceInCalendarDays(end, start) + 1 : 0;

                return {
                    key: `top-year-${yearStart.getFullYear()}`,
                    name: yearStart.getFullYear().toString(), // Örn: 2025
                    startDate: start,
                    endDate: end,
                    widthPx: daysInView * dayWidthPx
                };
            });
        }

        // 3. AY GÖRÜNÜMÜ -> Üstte ÇEYREK (YIL)
        if (isMonthZoom) {
            const quarters = eachQuarterOfInterval({ start: viewMinDate, end: viewMaxDate });
            return quarters.map(qStart => {
                const qEnd = endOfQuarter(qStart);
                const start = max([viewMinDate, qStart]);
                const end = min([viewMaxDate, qEnd]);
                const daysInView = end >= start ? differenceInCalendarDays(end, start) + 1 : 0;
                
                // İstenen format: "Çeyrek (Yıl)" -> "Ç1 (2025)"
                const qName = format(qStart, 'QQQ (yyyy)', { locale: tr });

                return {
                    key: `top-q-${qStart.toISOString()}`,
                    name: qName,
                    startDate: start,
                    endDate: end,
                    widthPx: daysInView * dayWidthPx
                };
            });
        }

        // 4. HAFTA GÖRÜNÜMÜ -> Üstte AY (ÇEYREK)
        if (isWeekZoom) {
            const months = eachMonthOfInterval({ start: viewMinDate, end: viewMaxDate });
            return months.map(monthStart => {
                const monthEnd = endOfMonth(monthStart);
                const start = max([viewMinDate, monthStart]);
                const end = min([viewMaxDate, monthEnd]);
                const daysInView = end >= start ? differenceInCalendarDays(end, start) + 1 : 0;
                
                // İstenen format: "Ay (Çeyrek)" -> "Ocak (Ç1)"
                const name = format(monthStart, 'MMMM (YYY)', { locale: tr });
                
                return {
                    key: `top-m-${monthStart.toISOString()}`,
                    name: name.charAt(0).toUpperCase() + name.slice(1), // Baş harfi büyüt
                    startDate: start,
                    endDate: end,
                    widthPx: daysInView * dayWidthPx
                };
            });
        }

        // 5. GÜN GÖRÜNÜMÜ -> Üstte HAFTA (AY YIL)
        if (isDayZoom) {
            const weeks = eachWeekOfInterval({ start: viewMinDate, end: viewMaxDate }, { weekStartsOn: 1 });
            return weeks.map(weekStart => {
                const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
                const start = max([viewMinDate, weekStart]);
                const end = min([viewMaxDate, weekEnd]);
                const daysInView = end >= start ? differenceInCalendarDays(end, start) + 1 : 0;
                
                // İstenen format: "Hafta (Ay Yıl)" -> "H42 (Eki 2025)"
                const weekNum = format(weekStart, 'ww', { weekStartsOn: 1 });
                const monthNameShort = format(weekStart, 'MMM', { locale: tr });
                const year = format(weekStart, 'yyyy');
                
                return {
                    key: `top-w-${weekStart.toISOString()}`,
                    name: `H${weekNum} (${monthNameShort} ${year})`, 
                    startDate: start,
                    endDate: end,
                    widthPx: daysInView * dayWidthPx
                };
            });
        }

        return [];
    }, [viewMinDate, viewMaxDate, dayWidthPx, isYearZoom, isQuarterZoom, isMonthZoom, isWeekZoom, isDayZoom]);


    // --- ALT BAŞLIK HESAPLAMASI ---
    const bottomHeaderIntervals = useMemo((): IntervalGroup[] => {
        if (isNaN(viewMinDate.getTime()) || isNaN(viewMaxDate.getTime()) || viewMaxDate < viewMinDate) return [];

        // 1. YIL GÖRÜNÜMÜ -> Altta YILLAR
        if (isYearZoom) {
            const years = eachYearOfInterval({ start: viewMinDate, end: viewMaxDate });
            return years.map(yearStart => {
                const yearEnd = endOfYear(yearStart);
                const start = max([viewMinDate, yearStart]);
                const end = min([viewMaxDate, yearEnd]);
                const daysInView = end >= start ? differenceInCalendarDays(end, start) + 1 : 0;

                return {
                    key: `bot-y-${yearStart.getFullYear()}`,
                    name: yearStart.getFullYear().toString(),
                    startDate: start,
                    endDate: end,
                    widthPx: daysInView * dayWidthPx,
                    isToday: yearStart.getFullYear() === today.getFullYear()
                };
            });
        }

        // 2. ÇEYREK GÖRÜNÜMÜ -> Altta ÇEYREKLER
        if (isQuarterZoom) {
            const quarters = eachQuarterOfInterval({ start: viewMinDate, end: viewMaxDate });
            return quarters.map(qStart => {
                const qEnd = endOfQuarter(qStart);
                const start = max([viewMinDate, qStart]);
                const end = min([viewMaxDate, qEnd]);
                const daysInView = end >= start ? differenceInCalendarDays(end, start) + 1 : 0;
                
                // Örn: "Ç1"
                const qName = format(qStart, 'QQQ', { locale: tr });

                return {
                    key: `bot-q-${qStart.toISOString()}`,
                    name: qName,
                    startDate: start,
                    endDate: end,
                    widthPx: daysInView * dayWidthPx,
                    // Bugün bu çeyreğin içinde mi?
                    isToday: today >= qStart && today <= qEnd
                };
            });
        }

        // 3. AY GÖRÜNÜMÜ -> Altta AYLAR
        if (isMonthZoom) {
            const months = eachMonthOfInterval({ start: viewMinDate, end: viewMaxDate });
            return months.map(monthStart => {
                const monthEnd = endOfMonth(monthStart);
                const start = max([viewMinDate, monthStart]);
                const end = min([viewMaxDate, monthEnd]);
                const daysInView = end >= start ? differenceInCalendarDays(end, start) + 1 : 0;
                const monthStr = format(monthStart, 'MMM', { locale: tr });

                return {
                    key: `bot-m-${monthStart.toISOString()}`,
                    name: monthStr.charAt(0).toUpperCase() + monthStr.slice(1),
                    startDate: start,
                    endDate: end,
                    widthPx: daysInView * dayWidthPx,
                    isToday: monthStart.getMonth() === today.getMonth() && monthStart.getFullYear() === today.getFullYear()
                };
            });
        }

        // 4. HAFTA GÖRÜNÜMÜ -> Altta HAFTALAR
        if (isWeekZoom) {
            const weeks = eachWeekOfInterval({ start: viewMinDate, end: viewMaxDate }, { weekStartsOn: 1 });
            return weeks.map(weekStart => {
                const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
                const start = max([viewMinDate, weekStart]);
                const end = min([viewMaxDate, weekEnd]);
                const daysInView = end >= start ? differenceInCalendarDays(end, start) + 1 : 0;
                const weekNumStr = format(weekStart, 'ww', { locale: tr, weekStartsOn: 1 });
                
                const isCurrentWeek = today >= startOfWeek(weekStart, { weekStartsOn: 1 }) && 
                                      today <= endOfWeek(weekStart, { weekStartsOn: 1 });

                return {
                    key: `bot-w-${weekStart.toISOString()}`,
                    name: `H${weekNumStr}`,
                    startDate: start,
                    endDate: end,
                    widthPx: daysInView * dayWidthPx,
                    isToday: isCurrentWeek
                };
            });
        }

        // 5. GÜN GÖRÜNÜMÜ -> Altta GÜNLER
        if (isDayZoom) {
            const days = eachDayOfInterval({ start: viewMinDate, end: viewMaxDate });
            return days.map(day => {
                const dayStr = format(day, 'd');
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                
                return {
                    key: `bot-d-${day.toISOString()}`,
                    name: dayStr,
                    startDate: day,
                    endDate: day,
                    widthPx: dayWidthPx,
                    isToday: isSameDay(day, today),
                    className: isWeekend ? 'bg-gray-50 text-gray-400' : ''
                };
            });
        }

        return [];
    }, [viewMinDate, viewMaxDate, dayWidthPx, isYearZoom, isQuarterZoom, isMonthZoom, isWeekZoom, isDayZoom, today]);

    return (
        <div
            className="sticky top-0 bg-white z-20 border-b border-gray-200 select-none"
            style={{ height: `${rowHeightPx}px` }}
        >
            {/* ÜST BAŞLIK SATIRI */}
            <div className="flex border-b border-gray-200 h-1/2 overflow-hidden">
                {topHeaderIntervals.map(interval => (
                    <div
                        key={interval.key}
                        className="flex-shrink-0 flex items-center justify-center px-2 py-1 font-bold text-xs text-gray-600 text-center border-r border-gray-200 whitespace-nowrap overflow-hidden"
                        style={{ width: `${interval.widthPx}px` }}
                        title={interval.name}
                    >
                        {interval.name}
                    </div>
                ))}
            </div>

            {/* ALT BAŞLIK SATIRI */}
            <div className="flex h-1/2 overflow-hidden">
                {bottomHeaderIntervals.map((interval) => (
                    <div
                        key={interval.key}
                        className={`relative flex-shrink-0 flex items-center justify-center px-1 py-1 font-medium text-xs text-gray-500 text-center border-r border-gray-200 ${interval.className || ''}`}
                        style={{ width: `${interval.widthPx}px` }}
                        title={interval.name}
                    >
                         {interval.isToday ? (
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-5 bg-blue-600 rounded-full flex items-center justify-center z-10 shadow-sm">
                                <span className="text-white text-[10px] font-bold leading-none">{interval.name}</span>
                            </div>
                        ) : (
                            <span className="truncate">{interval.name}</span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TimelineHeader;