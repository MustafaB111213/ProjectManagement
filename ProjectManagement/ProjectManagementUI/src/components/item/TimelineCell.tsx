import React, { useMemo } from 'react'; // useMemo eklendi
import DatePicker from 'react-datepicker';
import type { Item, Column } from '../../types';
import { useAppDispatch } from '../../store/hooks';
import { updateItemValue } from '../../store/features/itemSlice';
import { FiCalendar } from 'react-icons/fi';
// GÜNCELLEME: date-fns import'larını zenginleştir
import { format, parseISO, isValid } from 'date-fns';
import { tr } from 'date-fns/locale'; // Türkçe formatlama için

interface TimelineCellProps {
    item: Item;
    column: Column;
}

const TimelineCell: React.FC<TimelineCellProps> = ({ item, column }) => {
    const dispatch = useAppDispatch();
    const currentValue = item.itemValues.find(v => v.columnId === column.id)?.value || '';

    // GÜNCELLEME 1: 'new Date()' yerine 'parseISO' kullanarak güvenli okuma
    // useMemo kullanarak bu işlemin her render'da tekrarlanmasını engelliyoruz.
    const { startDate, endDate } = useMemo(() => {
        const [startStr, endStr] = currentValue.split('/');
        let start: Date | null = null;
        let end: Date | null = null;

        if (startStr) {
            try {
                // parseISO, "YYYY-MM-DD" string'ini UTC olarak değil, yerel saat olarak yorumlar.
                const parsedStart = parseISO(startStr);
                if (isValid(parsedStart)) start = parsedStart;
            } catch { }
        }
        if (endStr) {
            try {
                const parsedEnd = parseISO(endStr);
                if (isValid(parsedEnd)) end = parsedEnd;
            } catch { }
        }
        return { startDate: start, endDate: end };
    }, [currentValue]);

    const handleDateChange = (dates: [Date | null, Date | null]) => {
        const [start, end] = dates;

        // GÜNCELLEME 2: '.toISOString()' yerine 'format' kullanarak kaydetme
        // Bu, tarihi UTC'ye dönüştürmeden, göründüğü gibi kaydeder.
        const startValue = start ? format(start, 'yyyy-MM-dd') : '';
        const endValue = end ? format(end, 'yyyy-MM-dd') : '';

        const valueToSave = `${startValue}/${endValue}`;

        dispatch(updateItemValue({
            itemId: item.id,
            columnId: column.id,
            value: valueToSave,
        }));
    };

    // GÜNCELLEME 3: 'toLocaleDateString' yerine 'format' kullanarak formatlama
    // Bu, 'parseISO' ile tam uyumlu çalışır.
    const formatDate = (date: Date | null) => {
        if (!date) return '';
        return format(date, 'MMM d', { locale: tr });
    };

    return (
        <div className="w-full h-full flex items-center justify-center cursor-pointer">
            <DatePicker
                selected={startDate}
                onChange={handleDateChange}
                startDate={startDate}
                endDate={endDate}
                selectsRange
                dateFormat="MMM d"
                customInput={
                    <div className="flex items-center justify-center w-full h-full cursor-pointer">
                        {startDate && endDate ? (
                            <span>{`${formatDate(startDate)} - ${formatDate(endDate)}`}</span>
                        ) : (
                            <FiCalendar className="text-gray-400" />
                        )}
                    </div>
                }
                popperContainer={({ children }) => (
                    <div style={{ zIndex: 9999, position: 'fixed' }}>
                        {children}
                    </div>
                )}
            />
        </div>
    );
};

export default TimelineCell;