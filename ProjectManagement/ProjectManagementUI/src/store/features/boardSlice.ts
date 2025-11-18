import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Board } from '../../types'; // Tanımladığımız Board tipini import ediyoruz
import type { RootState } from '../store';
import { API_BASE_URL } from '../../components/common/constants';

// State'imizin tipini tanımlıyoruz
interface BoardState {
    items: Board[];
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    error: string | null;
    selectedBoardId: number | null;
}

// Başlangıç state'ini bu tiple oluşturuyoruz
const initialState: BoardState = {
    items: [],
    status: 'idle',
    error: null,
    selectedBoardId: null,  
};

// YENİ ASENKRON ACTION: Bir panoyu güncellemek için
interface UpdateBoardArgs {
    boardId: number;
    boardData: { name: string; description?: string };
}
export const updateBoard = createAsyncThunk<Board, UpdateBoardArgs>(
    'boards/updateBoard',
    async ({ boardId, boardData }) => {
        await fetch(`${API_BASE_URL}/board/${boardId}`, { // Controller adınız "BoardController" ise burası "board" olmalı
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(boardData),
        });
        // Backend 204 NoContent döndürdüğü için, state'i güncellemek üzere
        // gönderdiğimiz veriyi ID ile birleştirip geri döndürüyoruz.
        return { id: boardId, ...boardData };
    }
);

// YENİ ASENKRON ACTION: Bir panoyu silmek için
interface DeleteBoardArgs {
    boardId: number;
}
export const deleteBoard = createAsyncThunk<number, DeleteBoardArgs>(
    'boards/deleteBoard',
    async ({ boardId }) => {
        await fetch(`${API_BASE_URL}/board/${boardId}`, { method: 'DELETE' });
        return boardId; // Reducer'a silinen panonun ID'sini döndür
    }
);
// createAsyncThunk'ı tiplemek:
// 1. Dönecek verinin tipi (Board[]), 2. argüman tipi (void), 3. thunk'ın ekstra tipleri
export const fetchBoards = createAsyncThunk<Board[]>(
    'boards/fetchBoards', 
    async () => {
        const response = await fetch(`${API_BASE_URL}/Board/getall`);
        // fetch'in de tip-güvenli olması için kontrol ekleyebiliriz
        if (!response.ok) {
            throw new Error('Server responded with an error!');
        }
        const data: Board[] = await response.json();
        return data;
    }
);
export const createBoard = createAsyncThunk<Board, { name: string; description?: string }>(
    'boards/createBoard',
    async (newBoardData) => {
        const response = await fetch(`${API_BASE_URL}/board`, { // DİKKAT: Controller adınız "BoardController" ise burası "board" olmalı
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(newBoardData),
        });
        if (!response.ok) {
            throw new Error('Server responded with an error!');
        }
        const createdBoard: Board = await response.json();
        return createdBoard;
    }
);

const boardSlice = createSlice({
    name: 'boards',
    initialState,
    reducers: { 
        setSelectedBoard: (state, action: PayloadAction<number | null>) => {
            state.selectedBoardId = action.payload;
        }
     },
    extraReducers: (builder) => {
        builder
            .addCase(fetchBoards.pending, (state) => {
                state.status = 'loading';
            })
            .addCase(fetchBoards.fulfilled, (state, action: PayloadAction<Board[]>) => {
                state.status = 'succeeded';
                state.items = action.payload; // Payload'ın artık bir Board dizisi olduğu biliniyor!
            })
            .addCase(fetchBoards.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.error.message || 'Something went wrong';
            })
            // Pano başarıyla oluşturulduğunda
            .addCase(createBoard.fulfilled, (state, action: PayloadAction<Board>) => {
                // Yeni panoyu mevcut pano listesine ekle.
                // Bu sayede sayfa yenilemeden arayüz anında güncellenir!
                state.items.push(action.payload);
            })// Pano başarıyla güncellendiğinde
            .addCase(updateBoard.fulfilled, (state, action: PayloadAction<Board>) => {
                const updatedBoard = action.payload;
                const index = state.items.findIndex(b => b.id === updatedBoard.id);
                if (index !== -1) {
                    state.items[index] = { ...state.items[index], ...updatedBoard };
                }
            })
            // Pano başarıyla silindiğinde
            .addCase(deleteBoard.fulfilled, (state, action: PayloadAction<number>) => {
                const deletedBoardId = action.payload;
                // Panoyu listeden kaldır
                state.items = state.items.filter(b => b.id !== deletedBoardId);
                // Eğer silinen pano o an seçili olan pano ise, seçimi temizle
                if (state.selectedBoardId === deletedBoardId) {
                    state.selectedBoardId = null;
                }
            });
        },
});
// const boardSlice = createSlice({
//     name: 'boards',
//     initialState,
    
//     reducers: {
//         setSelectedBoard: (state, action: PayloadAction<number | null>) => {
//             state.selectedBoardId = action.payload;
//         }
//     },
//     extraReducers: (builder) => {
//         builder
//             .addCase(fetchBoards.pending, (state) => {
//                 state.status = 'loading';
//             })
//             .addCase(fetchBoards.fulfilled, (state, action: PayloadAction<Board[]>) => {
//                 state.status = 'succeeded';
//                 state.items = action.payload; // Payload'ın artık bir Board dizisi olduğu biliniyor!
//             })
//             .addCase(fetchBoards.rejected, (state, action) => {
//                 state.status = 'failed';
//                 state.error = action.error.message || 'Something went wrong';
//             });
//     },
// });

export const { setSelectedBoard } = boardSlice.actions;

// 1. Girdi Selector'ları: State'ten ham veriyi çeken basit fonksiyonlar.
const selectBoardItems = (state: RootState) => state.boards.items;
const selectSelectedBoardId = (state: RootState) => state.boards.selectedBoardId;

// 2. Çıktı Selector'ı (Memoized):
// Bu selector, sadece girdi selector'larının sonuçları değiştiğinde yeniden çalışır.
export const selectSelectedBoard = createSelector(
  [selectBoardItems, selectSelectedBoardId], // Girdiler
  (boards, selectedId) => {
    // Bu fonksiyon sadece 'boards' veya 'selectedId' değiştiğinde tetiklenir.
    if (!selectedId) return null;
    return boards.find(board => board.id === selectedId) || null;
  }
);

export default boardSlice.reducer;