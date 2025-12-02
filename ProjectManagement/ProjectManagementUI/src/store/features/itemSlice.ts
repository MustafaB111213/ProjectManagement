// src/store/features/itemSlice.ts

import { createSlice, createAsyncThunk, createSelector, type PayloadAction } from '@reduxjs/toolkit';
import type { Item, ItemValue } from '../../types';
import type { RootState } from '../store';
import { API_BASE_URL } from '../../components/common/constants';
import { calculateStatusChangeEffects } from '../../utils/automationLogic';

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

export interface BulkUpdateItemValueArgs {
    updates: { itemId: number; columnId: number; value: string }[];
}

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

// 1. Toplu Değer Güncelleme (Otomasyon için kritik)
export const updateMultipleItemValues = createAsyncThunk<
    { itemId: number; columnId: number; value: string }[], 
    BulkUpdateItemValueArgs,
    { rejectValue: string }
>('items/updateMultipleItemValues', async ({ updates }, { rejectWithValue }) => {
    try {
        const promises = updates.map(u =>
            fetch(`${API_BASE_URL}/items/${u.itemId}/values`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ columnId: u.columnId, value: u.value }),
            }).then(res => {
                if (!res.ok) throw new Error('Update failed');
                return u;
            })
        );

        const results = await Promise.all(promises);
        return results;

    } catch (err: any) {
        return rejectWithValue(err.message || 'Toplu güncelleme başarısız');
    }
});

// 2. Tüm panonun item'larını getir
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

// 3. Tek bir grubun item'larını getir
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

// 4. Yeni item oluştur
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

// 5. Görev Adını Güncelle
export interface UpdateItemArgs {
    boardId: number;
    itemId: number;
    groupId: number;
    itemData: {
        name: string;
    };
}
export const updateItem = createAsyncThunk<
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
            const errorText = await response.text();
            throw new Error(errorText || 'Sunucu hatası');
        }
        return { itemId: itemId, groupId: groupId, newName: itemData.name };

    } catch (err: any) {
        return rejectWithValue(err.message || 'Item güncellenemedi');
    }
});

// 6. Item sil
export interface DeleteItemArgs {
    boardId: number;
    itemId: number;
    groupId: number;
}
export const deleteItem = createAsyncThunk<
    number, 
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

// 7. Item taşı (API Çağrısı)
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

// 8. Tek Hücre Değeri Güncelle
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

// 9. YENİ: Akıllı Statü Değişikliği (Orkestratör)
export const changeItemStatus = createAsyncThunk<
    void,
    { itemId: number, columnId: number, newStatus: string },
    { state: RootState }
>('items/changeItemStatus', async ({ itemId, columnId, newStatus }, { dispatch, getState }) => {
    
    const state = getState();
    
    // Verileri Topla
    const allItems = Object.values(state.items.itemsByGroup).flat();
    const allColumns = state.columns.items;
    const allGroups = state.groups.items; // GroupSlice yapınıza göre burası değişebilir

    // Otomasyonu Çalıştır
    const result = calculateStatusChangeEffects(
        itemId,
        newStatus,
        allItems,
        allColumns,
        allGroups
    );

    // A. Hücre Güncellemelerini Uygula (Statü, Tarih, Unblocking)
    if (result.updates.length > 0) {
        await dispatch(updateMultipleItemValues({ updates: result.updates }));
    }

    // B. Taşıma İşlemini Uygula (Otomatik olarak "Tamamlananlar" grubuna)
    if (result.moveAction) {
        const currentItem = allItems.find(i => i.id === itemId);
        if (currentItem) {
            const moveArgs: MoveItemArgs = {
                boardId: state.boards.selectedBoardId || 0,
                itemId: itemId,
                sourceGroupId: currentItem.groupId,
                sourceIndex: currentItem.order,
                destinationGroupId: result.moveAction.targetGroupId,
                destinationIndex: 0 // En tepeye ekle
            };

            // Önce UI'ı güncelle (Hız hissi için)
            dispatch(itemSlice.actions.reorderItemsLocally(moveArgs));
            
            // Sonra Backend'e bildir
            await dispatch(moveItem(moveArgs));
        }
    }

    // C. Bildirim Göster (Opsiyonel)
    if (result.notification) {
        console.log("🔔 BİLDİRİM:", result.notification);
        // İsterseniz burada bir Toast dispatch edebilirsiniz
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

            // 1. Kaynak Grubu Kontrol Et
            const sourceList = state.itemsByGroup[sourceGroupId];
            if (!sourceList) {
                console.error(`reorderItemsLocally: Kaynak grup (ID: ${sourceGroupId}) bulunamadı.`);
                return;
            }

            // 2. Item'ı Kaynaktan Çıkar
            const [itemToMove] = sourceList.splice(sourceIndex, 1);

            // Item ID kontrolü (Senkronizasyon hatası varsa geri koy)
            if (!itemToMove || itemToMove.id !== itemId) {
                console.error(`reorderItemsLocally: Item ID eşleşmedi veya bulunamadı.`);
                if (itemToMove) sourceList.splice(sourceIndex, 0, itemToMove);
                return;
            }

            // 3. Hedef Gruba Ekle
            if (sourceGroupId === destinationGroupId) {
                // Aynı grup içi sıralama
                sourceList.splice(destinationIndex, 0, itemToMove);
                sourceList.forEach((item, index) => item.order = index);
            }
            else {
                // --- DÜZELTME BURADA ---
                // Hedef grup state'de yoksa (çünkü boş olabilir), onu başlatıyoruz.
                if (!state.itemsByGroup[destinationGroupId]) {
                    state.itemsByGroup[destinationGroupId] = [];
                }
                
                const destinationList = state.itemsByGroup[destinationGroupId];
                
                // Item'ın grup bilgisini güncelle
                itemToMove.groupId = destinationGroupId;
                
                // Yeni listeye ekle
                destinationList.splice(destinationIndex, 0, itemToMove);
                
                // Sıralamaları güncelle
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
            // --- GRUP ITEMLARI ---
            .addCase(fetchItemsForGroup.pending, (s) => { s.status = 'loading'; })
            .addCase(fetchItemsForGroup.fulfilled, (s, a) => {
                s.itemsByGroup[a.meta.arg.groupId] = a.payload;
                s.status = 'succeeded';
            })
            .addCase(fetchItemsForGroup.rejected, (s, a) => {
                s.status = 'failed';
                s.error = a.payload || 'Itemlar getirilemedi';
            })

            // --- PANO ITEMLARI ---
            .addCase(fetchItemsForBoard.pending, (s) => { s.status = 'loading'; })
            .addCase(fetchItemsForBoard.fulfilled, (s, a) => {
                const newMap: Record<number, Item[]> = {};
                a.payload.forEach((i) => {
                    if (!newMap[i.groupId]) newMap[i.groupId] = [];
                    newMap[i.groupId].push(i);
                });
                // Sıralama
                Object.values(newMap).forEach((list) => list.sort((a, b) => a.order - b.order));
                s.itemsByGroup = newMap;
                s.status = 'succeeded';
            })
            .addCase(fetchItemsForBoard.rejected, (s, a) => {
                s.status = 'failed';
                s.error = a.payload || 'Panodaki itemlar getirilemedi';
            })

            // --- CREATE ---
            .addCase(createItem.fulfilled, (s, a) => {
                const groupId = (a.meta.arg as CreateItemArgs).groupId;
                if (!s.itemsByGroup[groupId]) s.itemsByGroup[groupId] = [];
                s.itemsByGroup[groupId].push(a.payload);
            })
            .addCase(createItem.rejected, (s, a) => {
                s.error = a.payload || 'Item oluşturulamadı';
            })

            // --- UPDATE (NAME) ---
            .addCase(updateItem.fulfilled, (state, action) => {
                const { itemId, groupId, newName } = action.payload;
                if (state.itemsByGroup[groupId]) {
                    const originalItems = state.itemsByGroup[groupId];
                    state.itemsByGroup[groupId] = originalItems.map(item =>
                        item.id === itemId ? { ...item, name: newName } : item
                    );
                }
            })
            .addCase(updateItem.rejected, (state, action) => {
                state.error = action.payload as string;
            })

            // --- DELETE ---
            .addCase(deleteItem.fulfilled, (state, action) => {
                const idToDelete = action.payload;
                for (const groupId in state.itemsByGroup) {
                    const itemsInGroup = state.itemsByGroup[groupId];
                    const initialLength = itemsInGroup.length;
                    state.itemsByGroup[groupId] = itemsInGroup.filter((i) => i.id !== idToDelete);
                    if (state.itemsByGroup[groupId].length < initialLength) {
                        state.itemsByGroup[groupId].forEach((i, idx) => (i.order = idx));
                        break;
                    }
                }
            })
            .addCase(deleteItem.rejected, (s, a) => {
                s.error = a.payload || 'Item silinemedi';
            })

            // --- UPDATE VALUE (SINGLE) ---
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

            // --- UPDATE VALUE (MULTIPLE / AUTOMATION) ---
            .addCase(updateMultipleItemValues.fulfilled, (state, action) => {
                const updates = action.payload;
                updates.forEach(u => {
                    for (const groupId in state.itemsByGroup) {
                        const item = state.itemsByGroup[groupId].find(i => i.id === u.itemId);
                        if (item) {
                            const idx = item.itemValues.findIndex(iv => iv.columnId === u.columnId);
                            // ID'yi 0 geçiyoruz çünkü backend response'unda gerçek ID var ama burada UI güncellemesi yapıyoruz
                            if (idx > -1) item.itemValues[idx].value = u.value;
                            else item.itemValues.push({ id: 0, itemId: u.itemId, columnId: u.columnId, value: u.value });
                            break;
                        }
                    }
                });
            })

            // --- MOVE ITEM ---
            .addCase(moveItem.rejected, (s, a) => {
                s.error = a.payload || 'Item taşınamadı';
                console.error("Item taşıma hatası (backend):", a.payload);
                // İdeal senaryoda burada bir "rollback" mekanizması olmalı
            });
    },
});

export const { clearItems, reorderItemsLocally: reorderItems } = itemSlice.actions;
export default itemSlice.reducer;