// src/components/item/StatusCell.tsx (GÜNCELLENDİ)

import React, { useState, useRef } from 'react';
import type { Item, Column } from '../../types';
import { useAppDispatch } from '../../store/hooks';
import { updateItemValue } from '../../store/features/itemSlice';
import Pill from '../common/Pill';
import Popover from '../common/Popover';
import { FiCheck } from 'react-icons/fi'; // Onay ikonu için FiCheck import edildi

// Projemiz için varsayılan durum seçenekleri ve renkleri (Aynı)
const STATUS_OPTIONS = [
    { text: 'Yapılıyor', classes: 'bg-orange-100 text-orange-800' },
    { text: 'Tamamlandı', classes: 'bg-green-100 text-green-800' },
    { text: 'Takıldı', classes: 'bg-red-100 text-red-800' },
    { text: 'Beklemede', classes: 'bg-blue-100 text-blue-800' },
    { text: 'Belirsiz', classes: 'bg-gray-100 text-gray-800' },
];

interface StatusCellProps {
    item: Item;
    column: Column;
}

const StatusCell: React.FC<StatusCellProps> = ({ item, column }) => {
    const dispatch = useAppDispatch();
    const [isPopoverOpen, setPopoverOpen] = useState(false);
    const cellRef = useRef<HTMLDivElement>(null);

    // Mevcut değeri bul veya varsayılanı kullan
    const currentValue = item.itemValues.find(v => v.columnId === column.id)?.value || 'Belirsiz';
    const currentOption = STATUS_OPTIONS.find(opt => opt.text === currentValue) || STATUS_OPTIONS[4];

    const handleStatusChange = (newStatus: string) => {
        dispatch(updateItemValue({
            itemId: item.id,
            columnId: column.id,
            value: newStatus,
        }));
        setPopoverOpen(false); // Seçim yapıldıktan sonra popover'ı kapat
    };

    return (
        <>
            <div
                ref={cellRef}
                onClick={() => setPopoverOpen(true)}
                className="w-full h-full flex items-center justify-center cursor-pointer"
            >
                {/* Pill component'i aynı kalır */}
                <Pill text={currentOption.text} colorClasses={currentOption.classes} />
            </div>

            <Popover
                isOpen={isPopoverOpen}
                onClose={() => setPopoverOpen(false)}
                targetRef={cellRef}
                paddingClass="p-1" // Popover içi padding'i ayarlayalım
                widthClass="w-48" // Genişliği belirleyelim
            >
                <ul className="py-1">
                    {STATUS_OPTIONS.map(option => (
                        <li 
                            key={option.text}
                            onClick={() => handleStatusChange(option.text)}
                            // GÜNCELLENDİ: Düzenli flex yapısı ve hover
                            className="flex justify-between items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer rounded-md"
                        >
                            {/* YENİ: Renk Önizlemesi ve Metin */}
                            <div className="flex items-center gap-2">
                                <span 
                                    // Arka plan rengini (bg-...) alıyoruz. İlk sınıf genellikle arka plan rengidir.
                                    className={`w-3 h-3 rounded-full border border-gray-300 ${option.classes.split(' ')[0]}`}
                                    title={option.text}
                                ></span>
                                <span>{option.text}</span>
                            </div>

                            {/* Onay İkonu */}
                            {currentValue === option.text && <FiCheck className="text-blue-500" />}
                        </li>
                    ))}
                </ul>
            </Popover>
        </>
    );
};

export default StatusCell;