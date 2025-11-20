import WorkspaceSidebar from './components/layout/WorkspaceSidebar';
import BoardView from './components/board/BoardView';
import { BsKanbanFill } from 'react-icons/bs';
import { fetchUsers, selectUsersStatus } from './store/features/userSlice';
import { useAppDispatch, useAppSelector } from './store/hooks';
import { fetchBoards, setSelectedBoard } from './store/features/boardSlice';
import { useEffect } from 'react';

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
    if (boardStatus !== 'succeeded') return;;

      const pathMatch = window.location.pathname.match(/^\/boards\/(\d+)/);
    const boardIdFromPath = pathMatch ? parseInt(pathMatch[1], 10) : null;
    const storedBoardId = localStorage.getItem('selectedBoardId');

    if (boardIdFromPath && boards.some((board) => board.id === boardIdFromPath)) {
      if (selectedBoardId !== boardIdFromPath) {
        dispatch(setSelectedBoard(boardIdFromPath));
      }
      localStorage.setItem('selectedBoardId', boardIdFromPath.toString());
      return;
    }

    if (storedBoardId) {
      const boardId = parseInt(storedBoardId, 10);
      if (boards.some((board) => board.id === boardId)) {
        if (window.location.pathname !== `/boards/${boardId}`) {
          window.history.replaceState(null, '', `/boards/${boardId}`);
        }
        if (selectedBoardId !== boardId) {
          // O zaman sanki kullanıcı o panoya yeni tıklamış gibi tüm verileri çek.
          dispatch(setSelectedBoard(boardId));
          
        }
        } else {
        localStorage.removeItem('selectedBoardId');
      }
    } else if (window.location.pathname !== '/') {
      window.history.replaceState(null, '', '/');
      if (selectedBoardId !== null) {
        dispatch(setSelectedBoard(null));
      }
    }
  }, [boardStatus, boards, dispatch, selectedBoardId]);

   useEffect(() => {
    const handlePopState = () => {
      const pathMatch = window.location.pathname.match(/^\/boards\/(\d+)/);
      const boardIdFromPath = pathMatch ? parseInt(pathMatch[1], 10) : null;

      if (boardIdFromPath && boards.some((board) => board.id === boardIdFromPath)) {
        dispatch(setSelectedBoard(boardIdFromPath));
        localStorage.setItem('selectedBoardId', boardIdFromPath.toString());
      } else {
        dispatch(setSelectedBoard(null));
        localStorage.removeItem('selectedBoardId');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [boards, dispatch]);
  
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