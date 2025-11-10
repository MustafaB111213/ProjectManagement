// src/components/gantt/GanttMoreMenu.tsx (YENİ DOSYA)

import React from 'react';
import { FiSettings, FiMoreHorizontal } from 'react-icons/fi';

interface GanttMoreMenuProps {
    // Ayarlar butonu bu menüde mi gösterilecek?
    showSettingsInMenu: boolean;
    // Ayarlar butonuna tıklandığında ne olacak?
    onSettingsClick: () => void;
    // Menüyü kapatmak için (opsiyonel)
    onClose: () => void;
}

const GanttMoreMenu: React.FC<GanttMoreMenuProps> = ({ 
    showSettingsInMenu, 
    onSettingsClick,
    onClose
}) => {

    const handleSettingsClick = () => {
        onSettingsClick(); // Parent'taki fonksiyonu çağır (Modal'ı açacak)
        onClose(); // Menüyü kapat
    };

    const handleOtherClick = () => {
        alert('Diğer seçenek tıklandı');
        onClose(); // Menüyü kapat
    };

    return (
        <div className="py-1 w-48"> {/* Popover içeriği */}
            {/* Ayarlar butonu (Sadece GanttView'da gösterilecek) */}
            {showSettingsInMenu && (
                <button
                    onClick={handleSettingsClick}
                    className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    role="menuitem"
                >
                    <FiSettings className="w-4 h-4 mr-2" />
                    Widget Ayarları
                </button>
            )}
            
            {/* Diğer menü seçenekleri buraya eklenebilir */}
            <button
                onClick={handleOtherClick}
                className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                role="menuitem"
            >
                <FiMoreHorizontal className="w-4 h-4 mr-2" />
                Başka Bir Seçenek
            </button>
        </div>
    );
};

export default GanttMoreMenu;