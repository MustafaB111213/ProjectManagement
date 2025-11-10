import React, { useEffect } from 'react';
// Yeni oluşturduğumuz tip-güvenli hook'ları import ediyoruz
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { fetchBoards , setSelectedBoard } from '../store/features/boardSlice';
import { fetchGroupsForBoard, clearGroups } from '../store/features/groupSlice'; // group action'larını import et

const BoardList: React.FC = () => {
    const dispatch = useAppDispatch();
    // Artık state'in tipi otomatik olarak biliniyor, 'any' değil!
    const { items: boards, status, error, selectedBoardId } = useAppSelector((state) => state.boards);

    useEffect(() => {
        // status'un da tipi biliniyor
        if (status === 'idle') {
            dispatch(fetchBoards());
        }
    }, [status, dispatch]);

    const handleBoardClick = (boardId: number) => {
        if (selectedBoardId === boardId) {
            // Eğer aynı panoya tekrar tıklanırsa seçimi kaldır ve grupları temizle
            dispatch(setSelectedBoard(null));
            dispatch(clearGroups());
        } else {
            // Yeni bir panoya tıklandığında
            dispatch(setSelectedBoard(boardId)); // Seçili panoyu ayarla
            dispatch(fetchGroupsForBoard(boardId)); // Grupları çek
        }
    };
    
    if (status === 'loading') {
        return <div className="text-center p-4">Yükleniyor...</div>;
    }

    if (status === 'failed') {
        return <div className="text-center p-4 text-red-500">Hata: {error}</div>;
    }

    return (
        <div className="p-4 bg-white rounded-lg shadow">
            <h2 className="text-2xl font-bold mb-4 border-b pb-2">Panolar</h2>
            <ul className="space-y-2">
                {boards.map((board) => (
                    <li 
                        key={board.id} 
                        // Tıklama olayını ekliyoruz
                        onClick={() => handleBoardClick(board.id)}
                        // Seçili olan panoyu farklı renkte gösteriyoruz
                        className={`p-3 rounded-md shadow-sm cursor-pointer transition-colors ${
                            selectedBoardId === board.id 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-gray-100 hover:bg-gray-200'
                        }`}
                    >
                        <h3 className="font-semibold">{board.name}</h3>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default BoardList;