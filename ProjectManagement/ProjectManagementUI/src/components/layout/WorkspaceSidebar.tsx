import React, { useState, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { fetchBoards, setSelectedBoard } from '../../store/features/boardSlice';
import { fetchGroupsForBoard } from '../../store/features/groupSlice';
import { BsKanban } from 'react-icons/bs';
import { FiPlus, FiEdit, FiTrash2 } from 'react-icons/fi';
import Modal from '../common/Modal';
import AddBoardForm from '../board/AddBoardForm';
import { fetchColumnsForBoard } from '../../store/features/columnSlice'; // column action'ı import et
import { deleteBoard } from '../../store/features/boardSlice'; // deleteBoard'u import et
import EditBoardForm from '../board/EditBoardForm'; // Yeni formu import et
import type { Board } from '../../types'; // Board tipini import et

const WorkspaceSidebar: React.FC = () => {
    const dispatch = useAppDispatch();
    const { items: boards, status, selectedBoardId } = useAppSelector((state) => state.boards);
    const [isAddModalOpen, setAddModalOpen] = useState(false);  
      // Düzenlenecek panoyu state'te tutmak, hangi modal'ın açılacağını ve hangi verinin gönderileceğini bilmemizi sağlar.
    const [editingBoard, setEditingBoard] = useState<Board | null>(null);
    
    useEffect(() => {
        if (status === 'idle') {
            dispatch(fetchBoards());
        }
    }, [status, dispatch]);
    
    const handleBoardClick = (boardId: number) => {
        if (selectedBoardId !== boardId) {
            // DÜZELTME (KRİTİK): Gereksiz 'clearGroups()' çağrısı kaldırıldı.
            // Bu, UI titremesini (flicker) önler ve daha akıcı bir geçiş sağlar.
            // fetchGroupsForBoard.pending durumu zaten yükleme ekranını gösterecektir.
            dispatch(setSelectedBoard(boardId));
            dispatch(fetchGroupsForBoard(boardId));
            dispatch(fetchColumnsForBoard(boardId));
            // Tıklanan panonun ID'sini tarayıcının hafızasına kaydediyoruz.
            localStorage.setItem('selectedBoardId', boardId.toString());
        }
    };

    const handleDelete = (boardId: number, boardName: string) => {
        if (window.confirm(`"${boardName}" panosunu ve içindeki her şeyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`)) {
            dispatch(deleteBoard({ boardId }));
            // YENİ EKLENEN SATIR: Eğer silinen pano o an seçili olansa, hafızadan da silelim.
            if (selectedBoardId === boardId) {
                localStorage.removeItem('selectedBoardId');
            }
        }
        
    };
    return (
        <>
            <aside className="bg-sidebar-bg text-gray-300 w-72 p-4 flex flex-col space-y-4">
                <div className="px-2">
                    <h1 className="text-xl font-bold text-white">Çalışma Alanım</h1>
                    <p className="text-xs text-gray-400">Proje Yönetim Modülü</p>
                </div>
                
                <div className="border-t border-gray-700 my-2"></div>

                <nav className="flex-grow overflow-y-auto">
                    <ul className="space-y-1">
                        {status === 'loading' && <li className="px-2 py-1">Yükleniyor...</li>}
                        {boards.map((board) => (
                            <li key={board.id} className="group flex items-center justify-between rounded-lg hover:bg-gray-700">
                                <a
                                    href="#"
                                    onClick={(e) => { e.preventDefault(); handleBoardClick(board.id); }}
                                    className={`flex-grow flex items-center p-2 rounded-lg transition-all duration-200 text-sm font-medium ${
                                        selectedBoardId === board.id ? 'bg-main-purple text-white' : ''
                                    }`}
                                >
                                    <BsKanban className="mr-3 flex-shrink-0" />
                                    <span className="truncate">{board.name}</span>
                                </a>
                                <div className="flex items-center space-x-1 pr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => setEditingBoard(board)} className="p-1 hover:text-white" title="Panoyu Düzenle"><FiEdit size={14}/></button>
                                    <button onClick={() => handleDelete(board.id, board.name)} className="p-1 hover:text-red-400" title="Panoyu Sil"><FiTrash2 size={14}/></button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </nav>

                <div className="border-t border-gray-700 my-2"></div>

                <button 
                    onClick={() => setAddModalOpen(true)}
                    className="flex items-center w-full p-2 text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
                >
                    <FiPlus className="mr-3" />
                    Yeni Pano Ekle
                </button>
            </aside>
            
            {/* "Pano Ekle" Modalı */}
            <Modal
                isOpen={isAddModalOpen}
                onClose={() => setAddModalOpen(false)}
                title="Yeni Pano Oluştur"
            >
                <AddBoardForm onClose={() => setAddModalOpen(false)} />
            </Modal>
            
            {/* "Pano Düzenle" Modalı */}
            {editingBoard && (
                <Modal isOpen={!!editingBoard} onClose={() => setEditingBoard(null)} title="Panoyu Düzenle">
                    <EditBoardForm board={editingBoard} onClose={() => setEditingBoard(null)} />
                </Modal>
            )}
        </>
    );
};

export default WorkspaceSidebar;