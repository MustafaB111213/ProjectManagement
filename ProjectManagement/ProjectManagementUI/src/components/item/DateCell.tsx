import React from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css'; // Stil dosyasını import etmeyi unutma!
import type { Item, Column } from '../../types';
import { useAppDispatch } from '../../store/hooks';
import { updateItemValue } from '../../store/features/itemSlice';
// date-fns'ten format ve parseISO fonksiyonları daha güvenilir olabilir
import { parseISO, format } from 'date-fns';

interface DateCellProps {
    item: Item;
    column: Column;
}

const DateCell: React.FC<DateCellProps> = ({ item, column }) => {
    const dispatch = useAppDispatch();
    const currentValue = item.itemValues.find(v => v.columnId === column.id)?.value;
    
    // GÜNCELLEME 1: Date nesnesini parseISO ile oluştur (daha güvenilir)
    // "YYYY-MM-DD" string'ini yerel saat diliminde gece yarısı olarak yorumlar.
    let selectedDate: Date | null = null;
    if (currentValue) {
        try {
            // "YYYY-MM-DD" formatını doğru parse etmek için parseISO kullan
            // Bu, string'i yerel saat diliminde 00:00 olarak alır.
             selectedDate = parseISO(currentValue);
             // Eğer parseISO başarısız olursa (Invalid Date), null bırak
             if (isNaN(selectedDate.getTime())) {
                 selectedDate = null;
                 console.warn(`Geçersiz tarih formatı: ${currentValue}`);
             }
        } catch (e) {
            console.error(`Tarih parse hatası: ${currentValue}`, e);
            selectedDate = null;
        }
    }

    const handleDateChange = (date: Date | null) => {
        // GÜNCELLEME 2: Seçilen tarihi format ile "YYYY-MM-DD" string'ine çevir
        // date-fns format fonksiyonu genellikle saat dilimi sorunlarını daha iyi yönetir.
        const valueToSave = date ? format(date, 'yyyy-MM-dd') : '';
        dispatch(updateItemValue({
            itemId: item.id,
            columnId: column.id,
            value: valueToSave,
        }));
    };

    return (
        <div className="w-full h-full flex items-center justify-center cursor-pointer">
        <DatePicker
            selected={selectedDate}
            onChange={handleDateChange}
            dateFormat="MMM d" // "Eki 19" gibi görünecek
            placeholderText="-"
            className="w-full bg-transparent text-center outline-none cursor-pointer"
        />
        </div>
    );
};

export default DateCell;