// src/components/item/TimelineCell.tsx

import React, { useMemo, useState, useRef, useEffect } from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import type { Item, Column } from '../../types';
import { useAppDispatch } from '../../store/hooks';
import { updateItemValue } from '../../store/features/itemSlice';
import { format, parseISO, isValid, differenceInCalendarDays, startOfDay } from 'date-fns';
import { tr } from 'date-fns/locale';
import Popover from '../common/Popover';

// Türkçe yerelleştirme kaydı
registerLocale('tr', tr);

interface TimelineCellProps {
    item: Item;
    column: Column;
}

const TimelineCell: React.FC<TimelineCellProps> = ({ item, column }) => {
    const dispatch = useAppDispatch();
    const cellRef = useRef<HTMLDivElement>(null);
    const [isPopoverOpen, setPopoverOpen] = useState(false);

    // Redux'tan gelen ham string değer (Örn: "2023-10-01/2023-10-05")
    const currentValue = item.itemValues.find(v => v.columnId === column.id)?.value || '';

    // --- 1. MEMO: Tarih ve İlerleme Hesaplamaları ---
    const { savedStartDate, savedEndDate, progressPercent, displayLabel, savedDuration, statusColor } = useMemo(() => {
        const [startStr, endStr] = currentValue.split('/');
        let start: Date | null = null;
        let end: Date | null = null;
        let percent = 0;
        let duration = 0;
        // Varsayılan renk (henüz başlamadı)
        let colorClass = 'bg-gray-400'; 

        if (startStr) {
            try {
                const parsed = parseISO(startStr);
                if (isValid(parsed)) start = parsed;
            } catch { }
        }
        if (endStr) {
            try {
                const parsed = parseISO(endStr);
                if (isValid(parsed)) end = parsed;
            } catch { }
        }

        if (start && end) {
            const today = startOfDay(new Date());
            const startDay = startOfDay(start);
            const endDay = startOfDay(end);
            
            duration = differenceInCalendarDays(endDay, startDay) + 1;
            const elapsed = differenceInCalendarDays(today, startDay);

            if (today > endDay) {
                // Süre bitti -> %100 ve Yeşil
                percent = 100;
                colorClass = 'bg-emerald-500'; 
            } else if (today < startDay) {
                // Henüz başlamadı -> %0
                percent = 0;
                colorClass = 'bg-gray-300';
            } else {
                // Devam ediyor -> Oransal Mavi
                const rawPercent = (elapsed / duration) * 100;
                // Görsellik için en az %10 dolu gösterelim ki başladığı belli olsun
                percent = Math.max(10, Math.min(100, rawPercent));
                colorClass = 'bg-blue-600'; // Marka mavisi veya daha canlı bir mavi
            }
        }

        const startFmt = start ? format(start, 'd MMM', { locale: tr }) : '';
        const endFmt = end ? format(end, 'd MMM', { locale: tr }) : '';
        const label = (start && end) ? `${startFmt} - ${endFmt}` : '-';

        return { 
            savedStartDate: start, 
            savedEndDate: end, 
            progressPercent: percent, 
            displayLabel: label,
            savedDuration: duration,
            statusColor: colorClass
        };
    }, [currentValue]);

    // --- 2. STATE: Popover içindeki yerel seçim ---
    const [localStartDate, setLocalStartDate] = useState<Date | null>(savedStartDate);
    const [localEndDate, setLocalEndDate] = useState<Date | null>(savedEndDate);

    useEffect(() => {
        if (isPopoverOpen) {
            setLocalStartDate(savedStartDate);
            setLocalEndDate(savedEndDate);
        }
    }, [isPopoverOpen, savedStartDate, savedEndDate]);

    // --- 3. HANDLER: Tarih Seçimi ---
    const handleDateChange = (dates: [Date | null, Date | null]) => {
        const [start, end] = dates;
        setLocalStartDate(start);
        setLocalEndDate(end);

        if (start && !end) return;

        const startValue = start ? format(start, 'yyyy-MM-dd') : '';
        const endValue = end ? format(end, 'yyyy-MM-dd') : '';
        const valueToSave = (startValue && endValue) ? `${startValue}/${endValue}` : '';

        dispatch(updateItemValue({
            itemId: item.id,
            columnId: column.id,
            value: valueToSave,
        }));
        
        if ((start && end) || (!start && !end)) {
            setPopoverOpen(false);
        }
    };

    const currentDurationDisplay = useMemo(() => {
        if (localStartDate && localEndDate) {
            const diff = differenceInCalendarDays(localEndDate, localStartDate) + 1;
            return diff > 0 ? `${diff} gün` : '0 gün';
        }
        return 'Aralık seçin';
    }, [localStartDate, localEndDate]);

    return (
        <>
            {/* HÜCRE GÖRÜNÜMÜ (Renkli İlerleme Çubuğu) */}
            <div 
                ref={cellRef}
                onClick={() => setPopoverOpen(true)}
                className="w-full h-full px-2 py-1.5 flex items-center justify-center cursor-pointer group"
            >
                {savedStartDate && savedEndDate ? (
                    // Dolu Durum: Progress Bar
                    <div className="relative w-full h-7 bg-gray-200 rounded-md overflow-hidden shadow-sm border border-gray-300 group-hover:border-gray-400 transition-colors">
                        
                        {/* Renkli Dolgu (Progress) */}
                        <div 
                            className={`absolute top-0 left-0 h-full transition-all duration-500 ease-out ${statusColor}`} 
                            style={{ width: `${progressPercent}%` }}
                        >
                            {/* Hafif Parlama Efekti (Opsiyonel) */}
                            <div className="absolute top-0 right-0 bottom-0 w-px bg-white opacity-30 shadow-[0_0_10px_rgba(255,255,255,0.8)]"></div>
                        </div>
                        
                        {/* Metin (En Üstte) */}
                        <div className="absolute inset-0 flex items-center justify-center z-5 px-2 pointer-events-none">
                            <span 
                                className={`text-[11px] font-bold whitespace-nowrap transition-colors duration-300
                                ${progressPercent > 55 ? 'text-white drop-shadow-md' : 'text-gray-700'}`}
                            >
                                {displayLabel} 
                                {/* Süreyi sadece hover olunca veya yeterli yer varsa göster */}
                                <span className={`ml-1 font-normal opacity-80 text-[10px] hidden sm:inline ${progressPercent > 55 ? 'text-white' : 'text-gray-600'}`}>
                                    ({savedDuration}g)
                                </span>
                            </span>
                        </div>
                    </div>
                ) : (
                    // Boş Durum
                    <div className="w-full h-7 rounded-md bg-gray-50 border border-dashed border-gray-300 text-gray-400 text-xs flex items-center justify-center hover:bg-blue-50 hover:text-blue-500 hover:border-blue-300 transition-all">
                        <span>+ Tarih Ekle</span>
                    </div>
                )}
            </div>

            {/* AÇILIR PENCERE */}
            <Popover
                isOpen={isPopoverOpen}
                onClose={() => setPopoverOpen(false)}
                targetRef={cellRef}
                position="bottom-start"
                widthClass="w-auto"
                paddingClass="p-0"
            >
                <div className="p-2 bg-white rounded-lg shadow-2xl border border-gray-100 ring-1 ring-black ring-opacity-5">
                    <DatePicker
                        selected={localStartDate}
                        onChange={handleDateChange}
                        startDate={localStartDate}
                        endDate={localEndDate}
                        selectsRange
                        inline
                        locale="tr"
                        calendarClassName="!border-0 !shadow-none font-sans custom-calendar"
                        dayClassName={(date) => 
                            (date.getDay() === 0 || date.getDay() === 6) ? "text-orange-500 font-medium" : "font-medium text-gray-700"
                        }
                    />
                    
                    <div className="flex justify-between items-center px-2 pt-3 border-t border-gray-100 mt-1">
                        <button 
                            onClick={(e) => {
                                e.preventDefault();
                                handleDateChange([null, null]);
                            }}
                            className="text-xs text-gray-500 hover:text-red-600 font-medium px-2 py-1 rounded hover:bg-gray-100 transition-colors"
                        >
                            Temizle
                        </button>
                        <div className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                            {currentDurationDisplay}
                        </div>
                    </div>
                </div>
            </Popover>
        </>
    );
};

export default TimelineCell;