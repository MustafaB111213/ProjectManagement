// src/components/board/BoardActionbar.tsx

import React from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { createGroup } from '../../store/features/groupSlice';
// YENİ IMPORTLAR:
import { toggleShowOnlyCompleted, selectShowOnlyCompleted } from '../../store/features/boardViewSlice';

import ActionButton from '../common/ActionButton';
import { FiPlus, FiSearch, FiUser, FiFilter, FiBarChart2, FiEyeOff, FiGrid, FiMoreHorizontal, FiCheckCircle } from 'react-icons/fi';
import { getRandomColor } from '../../utils/colors';

const BoardActionbar: React.FC = () => {
    const dispatch = useAppDispatch();
    const { selectedBoardId } = useAppSelector((state) => state.boards);
    
    // YENİ: State'i Redux'tan oku
    const showOnlyCompleted = useAppSelector(selectShowOnlyCompleted);

    const handleCreateGroupAtTop = () => {
        if (selectedBoardId) {
            const defaultGroupData = {
                title: 'Yeni Grup',
                color: getRandomColor(),
            };
            dispatch(createGroup({ boardId: selectedBoardId, groupData: defaultGroupData, position: 'top' }));
        }
    };

    const handleToggleFilter = () => {
        // Redux aksiyonunu tetikle
        dispatch(toggleShowOnlyCompleted());
    };
    
    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-x-2">
                <button 
                    onClick={handleCreateGroupAtTop}
                    className="flex items-center gap-x-2 px-4 py-2 text-sm font-medium text-white bg-main-purple rounded-lg shadow-md hover:bg-dark-purple focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-main-purple"
                >
                    <FiPlus />
                    <span>Yeni Grup</span>
                </button>

                {/* Buton - Aktif duruma göre renk değiştirir */}
                <button 
                    onClick={handleToggleFilter}
                    className={`flex items-center gap-x-2 px-3 py-2 text-sm font-medium border rounded-lg transition-colors
                        ${showOnlyCompleted 
                            ? 'bg-green-600 text-white border-green-700 shadow-inner' // Aktif (Koyu Yeşil)
                            : 'text-green-700 bg-green-50 border-green-200 hover:bg-green-100' // Pasif (Açık)
                        }`}
                    title={showOnlyCompleted ? "Tümünü Göster" : "Sadece Tamamlananları Göster"}
                >
                    <FiCheckCircle className={showOnlyCompleted ? 'text-white' : ''} />
                    <span>{showOnlyCompleted ? 'Filtre: Tamamlananlar' : 'Tamamlananlar'}</span>
                </button>
            </div>

            {/* ... Sağ taraf (Search vs) aynı kalabilir ... */}
             <div className="flex items-center gap-x-2">
                <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                    <input 
                        type="text"
                        placeholder="Aramalar"
                        className="w-48 pl-9 pr-3 py-1.5 text-sm bg-card-bg border border-border-color rounded-md focus:ring-2 focus:ring-brand-blue focus:outline-none"
                    />
                </div>
                <ActionButton icon={<FiFilter size={16} />} text="Filtre" />
                <button className="p-2 rounded-md text-text-secondary hover:bg-gray-100">
                    <FiMoreHorizontal />
                </button>
            </div>
        </div>
    );
};

export default BoardActionbar;