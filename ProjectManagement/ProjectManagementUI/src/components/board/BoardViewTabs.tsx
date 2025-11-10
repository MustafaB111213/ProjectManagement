// src/components/board/BoardViewTabs.tsx

import React, { useState, useRef, useEffect } from 'react';
// Gerekli ikonları import ediyoruz.
import { FiPlus, FiGrid, FiBarChart, FiMoreHorizontal, FiEdit, FiTrash2, FiCalendar } from 'react-icons/fi';
import Popover from '../common/Popover'; // Popover component'ini import et (yolu kontrol et)
import AddViewMenu from './AddViewMenu'; // Yeni oluşturduğumuz menü component'ini import et

// Görünüm nesnesinin tipini tanımlayalım (BoardView'dan da import edilebilir)
// ID tipinin Redux state'indekiyle (number) eşleştiğinden emin olalım
export interface BoardViewTabInfo {
  id: number; // Redux'tan number gelecek
  name: string;
  type: 'table' | 'gantt' | 'calendar'; // Şimdilik bu tipler
}

// Component'imizin hangi props'ları alacağını belirten interface.
interface BoardViewTabsProps {
    views: BoardViewTabInfo[];         // Görünümlerin listesi
    activeViewId: number | null;     // Aktif görünümün ID'si
    onViewChange: (viewId: number) => void; // Görünüm değiştirildiğinde çağrılacak fonksiyon (ID ile)
    onAddViewTypeSelected: (viewType: BoardViewTabInfo['type']) => void; // Seçilen tipi bildirecek
    onDeleteView: (viewId: number) => void; // Opsiyonel
    onRenameView: (viewId: number, newName: string) => void; // Opsiyonel
}

// Sekmeler için ikonları eşleştiren map (Senin TABS dizisindeki gibi)
const VIEW_ICONS: Record<BoardViewTabInfo['type'], React.ReactElement> = {
    table: <FiGrid />,
    gantt: <FiBarChart />,
    calendar: <FiCalendar />,
};

// Component'in bu props'ları kabul ettiğini React.FC<...> ile belirtiyoruz
const BoardViewTabs: React.FC<BoardViewTabsProps> = ({
    views,
    activeViewId,
    onViewChange,
    onAddViewTypeSelected, // Yeni prop adı
    onDeleteView,
    onRenameView
}) => {
    // --- YENİ: Menü State'i ---
    const [menuOpenForViewId, setMenuOpenForViewId] = useState<number | null>(null);
    const menuRef = useRef<HTMLDivElement>(null); // Menü referansı
    // --------------------------

    // --- YENİ: '+ Butonu' Popover State'i ---
    const [isAddViewPopoverOpen, setIsAddViewPopoverOpen] = useState(false);
    const addViewButtonRef = useRef<HTMLButtonElement>(null); // '+' butonunun ref'i

    // --- YENİ: Popover içinden tip seçildiğinde ---
    const handleSelectViewType = (viewType: BoardViewTabInfo['type']) => {
        setIsAddViewPopoverOpen(false); // Popover'ı kapat
        onAddViewTypeSelected(viewType); // Parent component'e seçilen tipi bildir
    };
    // --- YENİ: Dışarı tıklamayı dinle ---
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setMenuOpenForViewId(null); // Menü dışına tıklandıysa kapat
            }
        };
        // Menü açıkken dinleyiciyi ekle
        if (menuOpenForViewId !== null) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        // Cleanup: Component kaldırıldığında veya menü kapandığında dinleyiciyi kaldır
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [menuOpenForViewId]); // Sadece menü durumu değiştiğinde çalıştır
    // ---------------------------------

    const handleMenuToggle = (event: React.MouseEvent, viewId: number) => {
        event.stopPropagation(); // Butona tıklamanın sekmeye geçişi tetiklemesini engelle
        setMenuOpenForViewId(prevId => (prevId === viewId ? null : viewId));
    };

    const handleRename = (viewId: number) => {
        setMenuOpenForViewId(null); // Menüyü kapat
        const currentView = views.find(v => v.id === viewId);
        const newName = prompt("Yeni görünüm adını girin:", currentView?.name || "");
        if (newName && newName.trim() !== "" && newName !== currentView?.name) {
            onRenameView(viewId, newName.trim());
        }
    };

    const handleDelete = (viewId: number) => {
        setMenuOpenForViewId(null); // Menüyü kapat
        const currentView = views.find(v => v.id === viewId);
        if (window.confirm(`"${currentView?.name}" görünümünü silmek istediğinizden emin misiniz?`)) {
            onDeleteView(viewId);
        }
    };

    // Senin istediğin stil sınıfları
    const activeTabStyle = 'text-brand-blue border-b-1 border-brand-blue'; // Senin kodundan
    const inactiveTabStyle = 'text-text-secondary hover:text-text-primary'; // Senin kodundan
    const commonTabStyle = 'group relative flex items-center gap-x-2 px-2 py-2 text-base font-medium transition-colors focus:outline-none'; // Senin kodundan

    return (
        <div className="flex items-center border-b border-gray-200 :border-gray-700">
             <nav className="flex-1 flex space-x-1 px-3" aria-label="Tabs">
                {views.map(view => (
                    <div key={view.id} className="relative"> {/* Menü için relative konumlandırma */}
                        <div
                            onClick={() => onViewChange(view.id)}
                            className={`${commonTabStyle} ${
                                activeViewId === view.id ? activeTabStyle : inactiveTabStyle
                            }`}
                            aria-current={activeViewId === view.id ? 'page' : undefined}
                        >
                            <span className="w-4 h-4">{VIEW_ICONS[view.type]}</span>
                            <span>{view.name}</span>

                            {/* Üç nokta butonu (artık görünür ve tıklanabilir) */}
                            <button
                                onClick={(e) => handleMenuToggle(e, view.id)}
                                className={`ml-1 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 ${activeViewId === view.id ? 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 :hover:bg-gray-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200 :hover:bg-gray-600'}`}
                                title="Seçenekler"
                            >
                                <FiMoreHorizontal className="w-4 h-4"/>
                            </button>
                        </div>

                        {/* Açılır Menü (Sadece bu sekme için menü açıksa göster) */}
                        {menuOpenForViewId === view.id && (
                            <div
                                ref={menuRef} // Ref'i buraya bağla
                                className="absolute top-full left-0 mt-1 w-48 bg-white :bg-gray-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-30"
                                role="menu"
                                aria-orientation="vertical"
                                aria-labelledby={`menu-button-${view.id}`} // Erişilebilirlik için
                            >
                                <div className="py-1" role="none">
                                    <button
                                        onClick={() => handleRename(view.id)}
                                        className="text-gray-700 :text-gray-200 hover:bg-gray-100 :hover:bg-gray-700 block w-full px-4 py-2 text-sm text-left"
                                        role="menuitem"
                                    >
                                        <FiEdit className="inline w-4 h-4 mr-2" /> Yeniden Adlandır
                                    </button>
                                    <button
                                        onClick={() => handleDelete(view.id)}
                                        className="text-red-600 dark:text-red-400 hover:bg-red-50 :hover:bg-gray-700 block w-full px-4 py-2 text-sm text-left"
                                        role="menuitem"
                                    >
                                         <FiTrash2 className="inline w-4 h-4 mr-2" /> Sil
                                    </button>
                                    {/* Başka menü öğeleri eklenebilir */}
                                </div>
                            </div>
                        )}
                    </div> // relative div sonu
                ))}
            </nav>

            {/* "Yeni Görünüm Ekle" butonu (Popover'ı açar) */}
            <div className="px-2 py-1.5 relative"> {/* Popover'ın konumlanması için relative */}
                <button
                    ref={addViewButtonRef} // Ref'i butona ata
                    onClick={() => setIsAddViewPopoverOpen(prev => !prev)} // Popover'ı aç/kapat
                    className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 :hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500"
                    title="Yeni Görünüm Ekle"
                >
                    <FiPlus className="w-5 h-5" />
                </button>

                {/* Yeni Görünüm Ekleme Popover'ı */}
                <Popover
                    isOpen={isAddViewPopoverOpen}
                    onClose={() => setIsAddViewPopoverOpen(false)}
                    targetRef={addViewButtonRef}
                    position="bottom-end" // Sağ alt köşeden açılsın
                    widthClass="w-48"      // Genişlik
                    paddingClass="p-0"     // AddViewMenu kendi padding'ini ayarlasın
                >
                    <AddViewMenu onSelectViewType={handleSelectViewType} />
                </Popover>
             </div>
        </div>
    );
};

export default BoardViewTabs;