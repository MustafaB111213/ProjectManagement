import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Column, ColumnType } from '../../types';
import { API_BASE_URL } from '../../components/common/constants';
import type { RootState } from '../store'; // <-- 1. BU IMPORT'U EKLEYİN

interface ColumnState {
    items: Column[];
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    error: string | null;
}
// YENİ ASENKRON ACTION: Yeni bir sütun oluşturmak için
interface CreateColumnArgs {
    boardId: number;
    columnData: {
        title: string;
        type: ColumnType;
    };
}

// --- YENİ ASENKRON ACTION: Sütun sırasını güncellemek için ---
interface UpdateColumnOrderArgs {
    boardId: number;
    // Sadece ID'lerin sıralı dizisini göndermek genellikle yeterlidir
    orderedColumnIds: number[];
}

// columnSlice.ts

export const updateColumnOrder = createAsyncThunk<void, UpdateColumnOrderArgs>(
    'columns/updateColumnOrder',
    async ({ boardId, orderedColumnIds }) => {

        // --- ÇOK ÖNEMLİ DÜZELTME ---
        // Hata logu, /order URL'sinin backend'de /:columnId olarak 
        // yorumlandığını gösteriyor. BU YANLIŞTIR.
        // Backend'inizdeki "Tüm sütunların sırasını" güncelleyen
        // endpoint'in doğru URL'sini buraya girmelisiniz.
        // 
        // "reorder" olduğunu varsayıyorum. Lütfen backend'den teyit edin.
        const response = await fetch(`${API_BASE_URL}/boards/${boardId}/columns/reorder`, {
            // --- ESKİ YANLIŞ URL ---
            // const response = await fetch(`${API_BASE_URL}/boards/${boardId}/columns/order`, {
            // --- DÜZELTME SONU ---

            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },

            // Önceki düzeltmemiz (nesne olarak yollamak) muhtemelen hala geçerli.
            // Backend'inizin [FromBody] kısmının bir nesne beklemesi çok olası.
            body: JSON.stringify({ orderedColumnIds: orderedColumnIds }),
        });

        if (!response.ok) {
            // Hata detayını konsola yazdırmak daha faydalı olabilir
            const errorData = await response.text(); // .json() da olabilir
            console.error('Backend Hatası:', errorData);
            throw new Error('Sütun sırası güncellenemedi');
        }
    }
);

// ... (dosyanın geri kalanı aynı)
export const createColumn = createAsyncThunk<Column, CreateColumnArgs>(
    'columns/createColumn',
    async ({ boardId, columnData }) => {
        const response = await fetch(`${API_BASE_URL}/boards/${boardId}/columns`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(columnData),
        });
        if (!response.ok) {
            throw new Error('Failed to create column');
        }
        return await response.json() as Column;
    }
);
// YENİ ASENKRON ACTION: Bir sütunu güncellemek için
interface UpdateColumnArgs {
    boardId: number;
    columnId: number;
    columnData: { title: string }; // Sadece başlık güncellenebilir
}
export const updateColumn = createAsyncThunk<Column, UpdateColumnArgs>(
    'columns/updateColumn',
    async ({ boardId, columnId, columnData }) => {
        await fetch(`${API_BASE_URL}/boards/${boardId}/columns/${columnId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(columnData),
        });
        // Backend 204 NoContent döndürdüğü için, state'i güncellemek üzere
        // gönderdiğimiz veriyi ve ID'leri birleştirip geri döndürüyoruz.
        // Not: 'type' bilgisi kaybolacağı için, state'teki mevcut 'type'ı korumak daha iyi bir yaklaşımdır.
        // Reducer bu işlemi daha akıllıca yapacak.
        return { id: columnId, boardId, ...columnData } as Column;
    }
);

// YENİ ASENKRON ACTION: Bir sütunu silmek için
interface DeleteColumnArgs {
    boardId: number;
    columnId: number;
}
export const deleteColumn = createAsyncThunk<number, DeleteColumnArgs>(
    'columns/deleteColumn',
    async ({ boardId, columnId }) => {
        await fetch(`${API_BASE_URL}/boards/${boardId}/columns/${columnId}`, { method: 'DELETE' });
        return columnId; // Reducer'a silinen sütunun ID'sini döndür
    }
);


const initialState: ColumnState = { items: [], status: 'idle', error: null };

export const fetchColumnsForBoard = createAsyncThunk<Column[], number>(
    'columns/fetchColumnsForBoard',
    async (boardId) => {
        const response = await fetch(`${API_BASE_URL}/boards/${boardId}/columns`);
        if (!response.ok) throw new Error('Failed to fetch columns');
        return await response.json() as Column[];
    }
);

const columnSlice = createSlice({
    name: 'columns',
    initialState,
    reducers: {
        // Sütunları anında (optimistic) güncellemek için
        reorderColumnsLocally: (state, action: PayloadAction<{ orderedColumns: Column[] }>) => {
            state.items = action.payload.orderedColumns;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchColumnsForBoard.pending, (state) => {
                state.status = 'loading';
            })
            .addCase(fetchColumnsForBoard.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.items = action.payload;
            })
            .addCase(fetchColumnsForBoard.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.error.message || 'Error';
            })
            // Sütun başarıyla oluşturulduğunda
            .addCase(createColumn.fulfilled, (state, action: PayloadAction<Column>) => {
                // Yeni sütunu mevcut sütun listesine ekle.
                // Bu sayede arayüz anında güncellenir.
                state.items.push(action.payload);
            })
            // Sütun başarıyla güncellendiğinde
            .addCase(updateColumn.fulfilled, (state, action: PayloadAction<Column>) => {
                const updatedColumn = action.payload;
                const index = state.items.findIndex(c => c.id === updatedColumn.id);
                if (index !== -1) {
                    // Sadece 'title'ı güncelle, 'type' gibi diğer özellikleri koru
                    state.items[index].title = updatedColumn.title;
                    if (updatedColumn.settings) {
                        state.items[index].settings = updatedColumn.settings;
                    }
                }
            })
            // Sütun başarıyla silindiğinde
            .addCase(deleteColumn.fulfilled, (state, action: PayloadAction<number>) => {
                state.items = state.items.filter(c => c.id !== action.payload);
            })
            // --- Sütun sırasını güncelleme ---
            .addCase(updateColumnOrder.pending, (state) => {
                // Optimistic update yaptığımız için 'loading' state'ine geçebiliriz
                // ama UI'ı kilitlememek için 'succeeded'de kalmak da bir tercih.
                state.status = 'loading';
            })
            .addCase(updateColumnOrder.fulfilled, (state) => {
                state.status = 'succeeded';
            })
            .addCase(updateColumnOrder.rejected, (state, action) => {
                // Hata durumunda state 'failed' olarak işaretlenir.
                // Geri alma (revert) işlemi BoardView.tsx'te yapılacak.
                state.status = 'failed';
                state.error = action.error.message || 'Error';
            });
    },
});
export const { reorderColumnsLocally } = columnSlice.actions;
export const selectAllColumns = (state: RootState) => state.columns.items;
export default columnSlice.reducer;