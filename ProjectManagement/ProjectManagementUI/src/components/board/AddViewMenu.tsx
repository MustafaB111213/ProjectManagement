// src/components/board/AddViewMenu.tsx (YENİ DOSYA)

import React from 'react';
import { FiGrid, FiBarChart, FiCalendar } from 'react-icons/fi'; // İkonları import et
import { type BoardViewTabInfo } from './BoardViewTabs'; // View tipini almak için

// Component'in alacağı proplar: Hangi tip seçildiğini bildiren fonksiyon
interface AddViewMenuProps {
    // Seçilen tipin string adını ('table' veya 'gantt') argüman olarak alır
    onSelectViewType: (viewType: BoardViewTabInfo['type']) => void;
}

const AddViewMenu: React.FC<AddViewMenuProps> = ({ onSelectViewType }) => {
    // Menüdeki seçenekler
    const viewOptions: { type: BoardViewTabInfo['type']; name: string; icon: React.ReactElement }[] = [
        { type: 'table', name: 'Tablo', icon: <FiGrid /> },
        { type: 'gantt', name: 'Gantt', icon: <FiBarChart /> },
        { type: 'calendar', name: 'Takvim', icon: <FiCalendar /> },

        // Gelecekte buraya Kanban, Takvim vb. eklenebilir
    ];

    return (
        <div className="py-1"> {/* Menü öğeleri için dikey padding */}
            <p className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase z-20">Görünüm Ekle</p>
            {viewOptions.map((option) => (
                <button
                    key={option.type}
                    onClick={() => onSelectViewType(option.type)}
                    className="flex items-center w-full px-3 py-2 text-sm text-gray-700 :text-gray-200 hover:bg-gray-100 :hover:bg-gray-700"
                    role="menuitem"
                >
                    <span className="w-4 h-4 mr-2">{option.icon}</span>
                    {option.name}
                </button>
            ))}
        </div>
    );
};

export default AddViewMenu;