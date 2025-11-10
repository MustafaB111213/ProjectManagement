import { createSlice, createAsyncThunk, createSelector, type PayloadAction } from '@reduxjs/toolkit';
import type { Item, ItemValue, Group } from '../../types';
import type { RootState } from '../store';
import { API_BASE_URL } from '../../components/common/constants';

// --- STATE ---

interface ItemState {
    itemsByGroup: Record<number, Item[]>;
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    error: string | null;
}

const initialState: ItemState = {
    itemsByGroup: {},
    status: 'idle',
    error: null,
};

// --- SELECTORS ---

const selectItemsByGroup = (state: RootState) => state.items.itemsByGroup;

export const makeSelectItemsByGroup = () =>
    createSelector(
        [selectItemsByGroup, (_: RootState, groupId: number) => groupId],
        (itemsByGroup, groupId) => itemsByGroup[groupId] || []
    );

export const selectAllItemsFlat = createSelector(
    [selectItemsByGroup],
    (itemsByGroup) => Object.values(itemsByGroup).flat()
);

// --- ASYNC THUNKS ---

// Tüm panonun item'larını getir
export const fetchItemsForBoard = createAsyncThunk<
    Item[],
    number,
    { rejectValue: string }
>('items/fetchItemsForBoard', async (boardId, { rejectWithValue }) => {
    try {
        const res = await fetch(`${API_BASE_URL}/boards/${boardId}/items`);
        if (!res.ok) throw new Error(await res.text());
        return (await res.json()) as Item[];
    } catch (err: any) {
        return rejectWithValue(err.message || 'Panodaki item\'lar getirilemedi');
    }
});

// Tek bir grubun item'larını getir
export interface FetchItemsArgs {
    boardId: number;
    groupId: number;
}
export const fetchItemsForGroup = createAsyncThunk<
    Item[],
    FetchItemsArgs,
    { rejectValue: string }
>('items/fetchItemsForGroup', async ({ boardId, groupId }, { rejectWithValue }) => {
    try {
        const res = await fetch(`${API_BASE_URL}/boards/${boardId}/items?groupId=${groupId}`);
        if (!res.ok) throw new Error(await res.text());
        return (await res.json()) as Item[];
    } catch (err: any) {
        return rejectWithValue(err.message || 'Gruba ait item\'lar getirilemedi');
    }
});

// Yeni item oluştur
export interface CreateItemArgs {
    boardId: number;
    groupId: number;
    itemData: { name: string };
}
export const createItem = createAsyncThunk<
    Item,
    CreateItemArgs,
    { rejectValue: string }
>('items/createItem', async ({ boardId, groupId, itemData }, { rejectWithValue }) => {
    try {
        const res = await fetch(`${API_BASE_URL}/boards/${boardId}/items?groupId=${groupId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(itemData),
        });
        if (!res.ok) throw new Error(await res.text());
        return (await res.json()) as Item;
    } catch (err: any) {
        return rejectWithValue(err.message || 'Item oluşturulamadı');
    }
});

// --- YENİ THUNK (GÖREV ADINI GÜNCELLEMEK İÇİN) ---
export interface UpdateItemArgs {
    boardId: number;
    itemId: number;
    groupId: number;
    itemData: {
        name: string;
    };
}
// itemSlice.ts

export const updateItem = createAsyncThunk<
    // Thunk'ın ne döndüreceğini tanımlıyoruz:
    { itemId: number, groupId: number, newName: string },
    UpdateItemArgs,
    { rejectValue: string }
>('items/updateItem', async ({ boardId, itemId, groupId, itemData }, { rejectWithValue }) => {
    try {
        const response = await fetch(`${API_BASE_URL}/boards/${boardId}/items/${itemId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(itemData),
        });

        if (!response.ok) {
            // Hata mesajı JSON olmayabilir, text olarak almak daha güvenli
            const errorText = await response.text();
            throw new Error(errorText || 'Sunucu hatası');
        }

        // BAŞARILI: Backend '204 No Content' (boş gövde) döndürdü.
        // response.json() ÇAĞIRMIYORUZ.
        // Reducer'ın state'i güncellemesi için gönderdiğimiz verileri geri yolluyoruz.
        return { itemId: itemId, groupId: groupId, newName: itemData.name };

    } catch (err: any) {
        // 'Unexpected end of JSON input' hatası artık buraya düşmeyecek.
        return rejectWithValue(err.message || 'Item güncellenemedi');
    }
})
// --- YENİ THUNK SONU ---

// Item sil
export interface DeleteItemArgs {
    boardId: number;
    itemId: number;
    groupId: number;
}
export const deleteItem = createAsyncThunk<
    number, // Silinen item'ın ID'sini döndürür
    DeleteItemArgs,
    { rejectValue: string }
>('items/deleteItem', async ({ boardId, itemId, groupId }, { rejectWithValue }) => {
    try {
        const res = await fetch(`${API_BASE_URL}/boards/${boardId}/items/${itemId}`, {
            method: 'DELETE',
        });
        if (!res.ok) throw new Error(await res.text());
        return itemId;
    } catch (err: any) {
        return rejectWithValue(err.message || 'Item silinemedi');
    }
});

// Item taşı (grup içi veya gruplar arası)
export interface MoveItemArgs {
    boardId: number;
    itemId: number;
    destinationGroupId: number;
    destinationIndex: number;
    sourceGroupId: number;
    sourceIndex: number;
}
export const moveItem = createAsyncThunk<void, MoveItemArgs, { rejectValue: string }>(
    'items/moveItem',
    async ({ boardId, itemId, destinationGroupId, destinationIndex }, { rejectWithValue }) => {
        try {
            const res = await fetch(`${API_BASE_URL}/boards/${boardId}/items/move`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ itemId, destinationGroupId, destinationIndex }),
            });
            if (!res.ok) throw new Error(await res.text());
        } catch (err: any) {
            return rejectWithValue(err.message || 'Item taşınamadı');
        }
    }
);

// Hücre değeri (ItemValue) güncelle
export interface UpdateItemValueArgs {
    itemId: number;
    columnId: number;
    value: string;
}
export const updateItemValue = createAsyncThunk<
    ItemValue,
    UpdateItemValueArgs,
    { rejectValue: string }
>('items/updateItemValue', async ({ itemId, columnId, value }, { rejectWithValue }) => {
    try {
        const res = await fetch(`${API_BASE_URL}/items/${itemId}/values`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ columnId, value }),
        });
        if (!res.ok) throw new Error(await res.text());
        return (await res.json()) as ItemValue;
    } catch (err: any) {
        return rejectWithValue(err.message || 'Hücre değeri güncellenemedi');
    }
});

// --- SLICE ---

const itemSlice = createSlice({
    name: 'items',
    initialState,
    // --- SENKRON REDUCER'LAR ---
    reducers: {
        reorderItemsLocally: (state, action: PayloadAction<MoveItemArgs>) => {
            const {
                sourceGroupId,
                sourceIndex,
                destinationGroupId,
                destinationIndex,
                itemId
            } = action.payload;

            const sourceList = state.itemsByGroup[sourceGroupId];
            if (!sourceList) {
                console.error(`reorderItemsLocally: Kaynak grup (ID: ${sourceGroupId}) bulunamadı.`);
                return;
            }
            const [itemToMove] = sourceList.splice(sourceIndex, 1);

            if (!itemToMove || itemToMove.id !== itemId) {
                console.error(`reorderItemsLocally: Kaynak grupta (ID: ${sourceGroupId}) index ${sourceIndex} veya item ID ${itemId} bulunamadı/eşleşmedi.`);
                if (itemToMove) sourceList.splice(sourceIndex, 0, itemToMove);
                return;
            }

            if (sourceGroupId === destinationGroupId) {
                sourceList.splice(destinationIndex, 0, itemToMove);
                sourceList.forEach((item, index) => item.order = index);
            }
            else {
                const destinationList = state.itemsByGroup[destinationGroupId];
                if (!destinationList) {
                    console.error(`reorderItemsLocally: Hedef grup (ID: ${destinationGroupId}) bulunamadı.`);
                    sourceList.splice(sourceIndex, 0, itemToMove);
                    return;
                }
                itemToMove.groupId = destinationGroupId;
                destinationList.splice(destinationIndex, 0, itemToMove);
                sourceList.forEach((item, index) => item.order = index);
                destinationList.forEach((item, index) => item.order = index);
            }
        },

        clearItems: (state) => {
            state.itemsByGroup = {};
            state.status = 'idle';
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            // Grup item'ları
            .addCase(fetchItemsForGroup.pending, (s) => { s.status = 'loading'; })
            .addCase(fetchItemsForGroup.fulfilled, (s, a) => {
                s.itemsByGroup[a.meta.arg.groupId] = a.payload;
                s.status = 'succeeded';
            })
            .addCase(fetchItemsForGroup.rejected, (s, a) => {
                s.status = 'failed';
                s.error = a.payload || 'Itemlar getirilemedi';
            })

            // Tüm panodaki item'lar
            .addCase(fetchItemsForBoard.pending, (s) => { s.status = 'loading'; })
            .addCase(fetchItemsForBoard.fulfilled, (s, a) => {
                const newMap: Record<number, Item[]> = {};
                a.payload.forEach((i) => {
                    if (!newMap[i.groupId]) newMap[i.groupId] = [];
                    newMap[i.groupId].push(i);
                });
                Object.values(newMap).forEach((list) => list.sort((a, b) => a.order - b.order));
                s.itemsByGroup = newMap;
                s.status = 'succeeded';
            })
            .addCase(fetchItemsForBoard.rejected, (s, a) => {
                s.status = 'failed';
                s.error = a.payload || 'Panodaki itemlar getirilemedi';
            })

            // Item oluşturma
            .addCase(createItem.fulfilled, (s, a) => {
                const groupId = (a.meta.arg as CreateItemArgs).groupId;
                if (!s.itemsByGroup[groupId]) s.itemsByGroup[groupId] = [];
                s.itemsByGroup[groupId].push(a.payload);
            })
            .addCase(createItem.rejected, (s, a) => {
                s.error = a.payload || 'Item oluşturulamadı';
            })
            // itemSlice.ts -> extraReducers içindeki case

            // --- YENİ CASE (GÖREV ADINI GÜNCELLEMEK İÇİN) ---
            .addCase(updateItem.fulfilled, (state, action) => {
                // action.payload artık: { itemId, groupId, newName }
                const { itemId, groupId, newName } = action.payload;

                if (state.itemsByGroup[groupId]) {
                    const originalItems = state.itemsByGroup[groupId];

                    // YENİ DİZİ OLUŞTURARAK STATE'İ GÜNCELLE (Yenileme sorununu çözer)
                    state.itemsByGroup[groupId] = originalItems.map(item =>
                        item.id === itemId ? { ...item, name: newName } : item
                    );
                }
            })
            .addCase(updateItem.rejected, (state, action) => {
                state.error = action.payload as string; // Payload artık bir string
            })
            // --- YENİ CASE SONU ---

            // Item silme
            // Item silme (GÜNCELLENDİ)
            .addCase(deleteItem.fulfilled, (state, action) => {
                const idToDelete = action.payload; // Silinen item'ın ID'si

                // HATA DÜZELTMESİ:
                // Sadece 'meta.arg.groupId'ye güvenmek yerine, 
                // item'ın nerede olduğunu bulmak için TÜM grupları döngüye al.
                for (const groupId in state.itemsByGroup) {
                    const itemsInGroup = state.itemsByGroup[groupId];
                    const initialLength = itemsInGroup.length;

                    // Bu gruptan silinen ID'yi filtrele
                    state.itemsByGroup[groupId] = itemsInGroup.filter((i) => i.id !== idToDelete);

                    // Eğer bu gruptan bir şey silindiyse,
                    // o grubun sırasını (order) yeniden hesapla ve döngüden çık.
                    if (state.itemsByGroup[groupId].length < initialLength) {
                        state.itemsByGroup[groupId].forEach((i, idx) => (i.order = idx));
                        break;
                    }
                }
            })
            .addCase(deleteItem.rejected, (s, a) => {
                s.error = a.payload || 'Item silinemedi';
            })

            // Hücre değeri güncelleme
            .addCase(updateItemValue.fulfilled, (s, a) => {
                const v = a.payload;
                for (const g in s.itemsByGroup) {
                    const item = s.itemsByGroup[g].find((i) => i.id === v.itemId);
                    if (item) {
                        const idx = item.itemValues.findIndex((iv) => iv.columnId === v.columnId);
                        if (idx > -1) item.itemValues[idx] = v;
                        else item.itemValues.push(v);
                        break;
                    }
                }
            })
            .addCase(updateItemValue.rejected, (s, a) => {
                s.error = a.payload || 'Hücre değeri güncellenemedi';
            })

            // Item taşıma
            .addCase(moveItem.pending, (s) => { })
            .addCase(moveItem.fulfilled, (s) => { })
            .addCase(moveItem.rejected, (s, a) => {
                s.error = a.payload || 'Item taşınamadı';
                console.error("Item taşıma hatası (backend):", a.payload);
            });
    },
});

export const { clearItems, reorderItemsLocally: reorderItems } = itemSlice.actions;
export default itemSlice.reducer;