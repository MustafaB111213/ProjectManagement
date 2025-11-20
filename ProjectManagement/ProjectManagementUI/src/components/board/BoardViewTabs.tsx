// src/components/board/BoardViewTabs.tsx

import React, { useState, useRef, useEffect } from 'react';
import { FiPlus, FiGrid, FiBarChart, FiMoreHorizontal, FiEdit, FiTrash2, FiCalendar } from 'react-icons/fi';
import Popover from '../common/Popover';
import AddViewMenu from './AddViewMenu';

export interface BoardViewTabInfo {
    id: number;
    name: string;
    type: 'table' | 'gantt' | 'calendar';
}

interface BoardViewTabsProps {
    views: BoardViewTabInfo[];
    activeViewId: number | null;
    onViewChange: (viewId: number) => void;
    onAddViewTypeSelected: (viewType: BoardViewTabInfo['type']) => void;
    onDeleteView: (viewId: number) => void;
    onRenameView: (viewId: number, newName: string) => void;
}

const VIEW_ICONS: Record<BoardViewTabInfo['type'], React.ReactElement> = {
    table: <FiGrid />,
    gantt: <FiBarChart />,
    calendar: <FiCalendar />,
};

const BoardViewTabs: React.FC<BoardViewTabsProps> = ({
    views,
    activeViewId,
    onViewChange,
    onAddViewTypeSelected,
    onDeleteView,
    onRenameView
}) => {
    const [menuOpenForViewId, setMenuOpenForViewId] = useState<number | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    
    const [isAddViewPopoverOpen, setIsAddViewPopoverOpen] = useState(false);
    const addViewButtonRef = useRef<HTMLButtonElement>(null);

    const handleSelectViewType = (viewType: BoardViewTabInfo['type']) => {
        setIsAddViewPopoverOpen(false);
        onAddViewTypeSelected(viewType);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setMenuOpenForViewId(null);
            }
        };
        if (menuOpenForViewId !== null) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [menuOpenForViewId]);

    const handleMenuToggle = (event: React.MouseEvent, viewId: number) => {
        event.stopPropagation();
        setMenuOpenForViewId(prevId => (prevId === viewId ? null : viewId));
    };

    const handleRename = (viewId: number) => {
        setMenuOpenForViewId(null);
        const currentView = views.find(v => v.id === viewId);
        const newName = prompt("Yeni görünüm adını girin:", currentView?.name || "");
        if (newName && newName.trim() !== "" && newName !== currentView?.name) {
            onRenameView(viewId, newName.trim());
        }
    };

    const handleDelete = (viewId: number) => {
        setMenuOpenForViewId(null);
        const currentView = views.find(v => v.id === viewId);
        if (window.confirm(`"${currentView?.name}" görünümünü silmek istediğinizden emin misiniz?`)) {
            onDeleteView(viewId);
        }
    };

    // Stiller
    const activeTabStyle = 'text-brand-blue border-b-2 border-brand-blue';
    const inactiveTabStyle = 'text-text-secondary hover:text-text-primary border-b-2 border-transparent';
    
    // DÜZELTME: 'w-full' ve 'text-left' eklendi çünkü artık buton kullanıyoruz.
    const commonTabStyle = 'group relative flex items-center gap-x-2 px-2 py-3 text-base font-medium transition-colors focus:outline-none bg-transparent';

    return (
        <div className="flex items-center">
            <nav className="flex-1 flex space-x-1" aria-label="Tabs">
                {views.map(view => (
                    <div key={view.id} className="relative">
                        {/* DÜZELTME: div yerine button kullanıldı */}
                        <button
                            type="button"
                            onClick={() => onViewChange(view.id)}
                            style={{ cursor: 'pointer' }} // GARANTİ ÇÖZÜM: Inline stil
                            className={`${commonTabStyle} ${
                                activeViewId === view.id ? activeTabStyle : inactiveTabStyle
                            }`}
                            aria-current={activeViewId === view.id ? 'page' : undefined}
                        >
                            <span className="w-4 h-4">{VIEW_ICONS[view.type]}</span>
                            <span>{view.name}</span>

                            {/* Üç nokta butonu */}
                            <div
                                onClick={(e) => handleMenuToggle(e, view.id)}
                                className={`ml-1 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer ${activeViewId === view.id ? 'text-indigo-600 hover:bg-indigo-100' : 'text-gray-400 hover:bg-gray-200'}`}
                                title="Seçenekler"
                                role="button" // Erişilebilirlik için
                            >
                                <FiMoreHorizontal className="w-4 h-4"/>
                            </div>
                        </button>

                        {/* Açılır Menü */}
                        {menuOpenForViewId === view.id && (
                            <div
                                ref={menuRef}
                                className="absolute top-full left-0 mt-1 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-30"
                                role="menu"
                            >
                                <div className="py-1" role="none">
                                    <button
                                        onClick={() => handleRename(view.id)}
                                        className="text-gray-700 hover:bg-gray-100 block w-full px-4 py-2 text-sm text-left"
                                        role="menuitem"
                                    >
                                        <FiEdit className="inline w-4 h-4 mr-2" /> Yeniden Adlandır
                                    </button>
                                    <button
                                        onClick={() => handleDelete(view.id)}
                                        className="text-red-600 hover:bg-red-50 block w-full px-4 py-2 text-sm text-left"
                                        role="menuitem"
                                    >
                                        <FiTrash2 className="inline w-4 h-4 mr-2" /> Sil
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </nav>

            <div className="px-2 py-1.5 relative">
                <button
                    ref={addViewButtonRef}
                    onClick={() => setIsAddViewPopoverOpen(prev => !prev)}
                    className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus:outline-none cursor-pointer"
                    title="Yeni Görünüm Ekle"
                >
                    <FiPlus className="w-5 h-5" />
                </button>

                <Popover
                    isOpen={isAddViewPopoverOpen}
                    onClose={() => setIsAddViewPopoverOpen(false)}
                    targetRef={addViewButtonRef}
                    position="bottom-end"
                    widthClass="w-48"
                    paddingClass="p-0"
                >
                    <AddViewMenu onSelectViewType={handleSelectViewType} />
                </Popover>
            </div>
        </div>
    );
};

export default BoardViewTabs;