import React from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { createGroup } from '../../store/features/groupSlice'; // createGroup'u import et
import ActionButton from '../common/ActionButton';
import { FiPlus, FiSearch, FiUser, FiFilter, FiBarChart2, FiEyeOff, FiGrid, FiMoreHorizontal } from 'react-icons/fi';
import { getRandomColor } from '../../utils/colors';



const BoardActionbar: React.FC = () => {
    const dispatch = useAppDispatch();
    const { selectedBoardId } = useAppSelector((state) => state.boards);

    const handleCreateGroupAtTop = () => {
        if (selectedBoardId) {
            const defaultGroupData = {
                title: 'Yeni Grup',
                color: getRandomColor(),
            };
            // YENİ GRUBU EN ÜSTE EKLEMEK İÇİN 'position: top' ipucunu gönderiyoruz.
            dispatch(createGroup({ boardId: selectedBoardId, groupData: defaultGroupData, position: 'top' }));
        }
    };
    
    return (
        <div className="flex items-center justify-between">
            {/* SOL TARAF: YENİ GRUP BUTONU */}
            {/* Monday.com'dan aldığın HTML'in Tailwind karşılığı: */}
            <div className="flex items-center">
                {/* Ana Buton */}
                <button 
                onClick={handleCreateGroupAtTop}
                className="flex items-center gap-x-2 px-4 py-2 text-sm font-medium text-white bg-main-purple rounded-lg shadow-md hover:bg-dark-purple focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-main-purple"
            >
                <FiPlus />
                <span>Yeni Grup</span>
            </button>
                
            </div>

            {/* SAĞ TARAF: Filtreler ve Arama */}
            <div className="flex items-center gap-x-2">
                {/* Arama Kutusu */}
                <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                    <input 
                        type="text"
                        placeholder="Aramalar"
                        className="w-48 pl-9 pr-3 py-1.5 text-sm bg-card-bg border border-border-color rounded-md focus:ring-2 focus:ring-brand-blue focus:outline-none"
                    />
                </div>

                {/* Eylem Butonları */}
                <ActionButton icon={<FiUser size={16} />} text="Kişi" />
                <ActionButton icon={<FiFilter size={16} />} text="Filtre" />
                <ActionButton icon={<FiBarChart2 size={16} transform="rotate(90)"/>} text="Sırala" />
                <ActionButton icon={<FiEyeOff size={16} />} text="Gizle" />
                <ActionButton icon={<FiGrid size={16} />} text="Grupla" />

                {/* Diğer (Overflow) Butonu */}
                <button className="p-2 rounded-md text-text-secondary hover:bg-gray-100">
                    <FiMoreHorizontal />
                </button>
            </div>
        </div>
    );
};

export default BoardActionbar;