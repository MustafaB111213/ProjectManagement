import { useEffect } from 'react'; // useEffect'i import et
import { useAppDispatch, useAppSelector } from './store/hooks';
import { fetchBoards, setSelectedBoard } from './store/features/boardSlice';
import { fetchGroupsForBoard } from './store/features/groupSlice';
import { fetchColumnsForBoard } from './store/features/columnSlice';
import WorkspaceSidebar from './components/layout/WorkspaceSidebar';
import BoardView from './components/board/BoardView';
import { BsKanbanFill } from 'react-icons/bs';
import { fetchUsers, selectUsersStatus } from './store/features/userSlice';

const App: React.FC = () => {
  const dispatch = useAppDispatch();

  const usersStatus = useAppSelector(selectUsersStatus);

    // Kullanıcıları yüklemek için useEffect
    useEffect(() => {
        // Sadece 'idle' durumundayken (yani daha önce hiç çekilmediyse) çek
        if (usersStatus === 'idle') {
            dispatch(fetchUsers());
        }
    }, [usersStatus, dispatch]);
    
  // Hem panoları hem de panoların yüklenme durumunu alıyoruz.
  const { selectedBoardId, status: boardStatus, items: boards } = useAppSelector((state) => state.boards);

  // --- 1. ETAP: Uygulama ilk yüklendiğinde panoları her zaman çek ---
  useEffect(() => {
    // Bu useEffect sadece bir kez çalışır ve panoların ana listesini API'den alır.
    dispatch(fetchBoards());
  }, [dispatch]);

  // --- 2. ETAP: Panolar yüklendikten sonra hafızadaki panoyu geri yükle ---
  useEffect(() => {
    // Bu useEffect, panoların yüklenme durumu değiştiğinde çalışır.
    if (boardStatus === 'succeeded') {
      // Panolar başarıyla yüklendiğinde, localStorage'ı kontrol et.
      const lastSelectedBoardId = localStorage.getItem('selectedBoardId');

      if (lastSelectedBoardId) {
        // Eğer hafızada bir ID varsa...
        const boardId = parseInt(lastSelectedBoardId, 10);
        
        // Ve bu ID'ye sahip pano, yeni çektiğimiz pano listesinde gerçekten varsa...
        if (boards.some(board => board.id === boardId)) {
          // O zaman sanki kullanıcı o panoya yeni tıklamış gibi tüm verileri çek.
          dispatch(setSelectedBoard(boardId));
          dispatch(fetchGroupsForBoard(boardId));
          dispatch(fetchColumnsForBoard(boardId));
        } else {
          // Eğer pano artık mevcut değilse (belki silinmiştir), hafızayı temizle.
          localStorage.removeItem('selectedBoardId');
        }
      }
    }
  }, [boardStatus, boards, dispatch]); // Bu değerlerden biri değiştiğinde tekrar çalışır.

  return (
    <div className="flex h-screen font-sans">
      <WorkspaceSidebar />
      <main className="flex-1 overflow-y-auto bg-main-bg">
        {selectedBoardId ? (
          <BoardView />
        ) : (
          
            <div className="flex flex-col items-center justify-center h-full text-center">
            <BsKanbanFill className="text-8xl text-gray-300 mb-4" />
            <h2 className="text-2xl font-semibold text-text-primary">Bir Pano Seçin</h2>
            <p className="text-text-secondary mt-2">
              Başlamak için sol menüden bir proje panosu seçin veya yeni bir tane oluşturun.
            </p>
          </div>
          
        )}
      </main>
    </div>
  );
};

export default App;