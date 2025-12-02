// src/store/features/boardViewSlice.ts

import { createSlice, createAsyncThunk, type PayloadAction, createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../store'; // Ana store tipini import et
import { API_BASE_URL } from '../../components/common/constants'; // API URL'sini import et

// Backend DTO'larına karşılık gelen frontend tipleri
export interface BoardViewData {
    id: number; // Backend int döndürecek
    name: string;
    type: string; // Backend 'Table', 'Gantt' gibi string dönecek
    order: number;
    settingsJson?: string | null; // <-- JSON ayarları için alan (opsiyonel)
}

// Yeni görünüm oluşturma isteği için tip
export interface CreateBoardViewPayload {
    name: string;
    type: string; // 'Table' veya 'Gantt'
}

// --- Güncelleme (Yeniden Adlandırma) için Payload Tipi ---
export interface UpdateBoardViewPayload {
    name: string;
}

// Ayarları güncellemek için payload tipi
export interface UpdateBoardViewSettingsPayload {
    settingsJson: string; // Ayarların tamamını string olarak göndereceğiz
}

// State arayüzü
interface BoardViewState {
    views: BoardViewData[];
    activeViewId: number | null; // ID'ler artık number
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    error: string | null;
    // YENİ: Tamamlananları filtreleme durumu
    showOnlyCompleted: boolean;
}

const initialState: BoardViewState = {
    views: [],
    activeViewId: null,
    status: 'idle',
    error: null,
    // YENİ: Varsayılan olarak kapalı (Tüm görevler görünür)
    showOnlyCompleted: false,
};

// --- Async Thunks ---

// Belirli bir panonun görünümlerini getirme
export const fetchViewsForBoard = createAsyncThunk<
    BoardViewData[], // Başarılı olursa dönecek tip
    number,          // Argüman tipi (boardId)
    { rejectValue: string } // Hata durumunda dönecek tip
>('boardViews/fetchViewsForBoard', async (boardId, { rejectWithValue }) => {
    try {
        const response = await fetch(`${API_BASE_URL}/boards/${boardId}/views`);
        if (!response.ok) {
            throw new Error(`Server Error: ${response.status}`);
        }
        return (await response.json()) as BoardViewData[];
    } catch (error: any) {
        return rejectWithValue(error.message || 'Görünümler getirilemedi');
    }
});

// Yeni görünüm oluşturma
export const createBoardView = createAsyncThunk<
    BoardViewData,
    { boardId: number; payload: CreateBoardViewPayload },
    { rejectValue: string }
>('boardViews/createBoardView', async ({ boardId, payload }, { rejectWithValue }) => {
    try {
        const response = await fetch(`${API_BASE_URL}/boards/${boardId}/views`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || `Server Error: ${response.status}`);
        }
        return (await response.json()) as BoardViewData;
    } catch (error: any) {
        return rejectWithValue(error.message || 'Görünüm oluşturulamadı');
    }
});

// --- GÜNCELLENDİ: deleteBoardView ---
export const deleteBoardView = createAsyncThunk<
    number, // Silinen viewId'yi döndür
    { boardId: number; viewId: number },
    { rejectValue: string }
>('boardViews/deleteBoardView', async ({ boardId, viewId }, { rejectWithValue }) => {
    try {
        const response = await fetch(`${API_BASE_URL}/boards/${boardId}/views/${viewId}`, { // URL doğru varsayılıyor
            method: 'DELETE',
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || `Server Error: ${response.status}`);
        }
        // Backend 204 No Content döndüreceği için bir şey parse etmeye gerek yok.
        return viewId; // Başarılı silmede ID'yi döndür
    } catch (error: any) {
        return rejectWithValue(error.message || 'Görünüm silinemedi');
    }
});

// --- GÜNCELLENMİŞ: updateBoardView (Yeniden Adlandırma için) ---
export const updateBoardView = createAsyncThunk<
    BoardViewData,
    { boardId: number; viewId: number; payload: UpdateBoardViewPayload },
    { rejectValue: string; state: RootState } // getState için RootState eklendi
>(
    'boardViews/updateBoardView',
    async ({ boardId, viewId, payload }, { dispatch, rejectWithValue, getState }) => {
        try {
            // 1. Mevcut state'i al
            const state = getState();
            // 2. Güncellenen görünümün mevcut verisini state'den bul
            const currentView = state.boardViews.views.find(v => v.id === viewId);

            if (!currentView) {
                throw new Error("Güncellenecek görünüm mevcut state'de bulunamadı.");
            }

            // 3. Payload'ı birleştir:
            // YENİ Adı ve ESKİ ayarları birleştir (ezilmemesi için)
            const combinedPayload = {
                ...payload, // { name: "Yeni Ad" }
                settingsJson: currentView.settingsJson // { settingsJson: "{\"activeTimelineId\":5}" }
            };

            const response = await fetch(`${API_BASE_URL}/boards/${boardId}/views/${viewId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(combinedPayload), // Birleştirilmiş payload'ı gönder
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || `Server Error: ${response.status}`);
            }

            // Backend 'Ok(updatedView)' döndüğü için JSON'u parse et
            return (await response.json()) as BoardViewData;

        } catch (error: any) {
            return rejectWithValue(error.message || 'Görünüm yeniden adlandırılamadı');
        }
    }
);


// Görünümleri yeniden sıralama
export const reorderBoardViews = createAsyncThunk<
    void, // Bir şey döndürmeyecek
    { boardId: number; orderedViewIds: number[] },
    { rejectValue: string }
>('boardViews/reorderBoardViews', async ({ boardId, orderedViewIds }, { rejectWithValue }) => {
    try {
        const response = await fetch(`${API_BASE_URL}/boards/${boardId}/views/reorder`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderedViewIds),
        });
        if (!response.ok) {
            throw new Error(`Server Error: ${response.status}`);
        }
    } catch (error: any) {
        return rejectWithValue(error.message || 'Görünüm sırası güncellenemedi');
    }
});

// --- GÜNCELLENMİŞ: updateBoardViewSettings Thunk ---
// Bu, bir görünümün SADECE ayarlarını (SettingsJson) günceller
export const updateBoardViewSettings = createAsyncThunk<
    BoardViewData, // Başarıda güncellenmiş görünümü döndür
    { boardId: number; viewId: number; payload: UpdateBoardViewSettingsPayload },
    { rejectValue: string; state: RootState } // getState'i kullanabilmek için RootState tipini ekleyin
>(
    'boardViews/updateBoardViewSettings',
    // 'getState'i parametrelere ekleyin
    async ({ boardId, viewId, payload }, { rejectWithValue, getState }) => {
        try {
            // 1. Mevcut state'i al
            const state = getState();

            // 2. Güncellenen görünümün mevcut verisini state'den bul
            const currentView = state.boardViews.views.find(v => v.id === viewId);

            if (!currentView) {
                throw new Error("Güncellenecek görünüm mevcut state'de bulunamadı.");
            }

            // 4. Backend'e gönderilecek payload'ı birleştir:
            // ESKİ Adı ve YENİ ayarları birleştir (ezilmemesi için)
            const combinedPayload = {
                name: currentView.name, // Backend'in [Required] Name alanını karşıla
                ...payload,             // { settingsJson: "..." } alanını ekle
            };

            const response = await fetch(`${API_BASE_URL}/boards/${boardId}/views/${viewId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(combinedPayload), // Birleştirilmiş payload'ı gönder
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || `Server Error: ${response.status}`);
            }

            // Backend'den güncellenmiş tam view nesnesini bekliyoruz
            return (await response.json()) as BoardViewData;

        } catch (error: any) {
            return rejectWithValue(error.message || 'Görünüm ayarları güncellenemedi');
        }
    }
);
// ---------------------------------------------

// --- Slice ---
const boardViewSlice = createSlice({
    name: 'boardViews',
    initialState,
    reducers: {
        // Aktif görünüm ID'sini senkron olarak ayarlama
        setActiveViewId: (state, action: PayloadAction<number | null>) => {
            state.activeViewId = action.payload;
        },
        // Pano değiştiğinde state'i temizleme
        clearBoardViews: (state) => {
            state.views = [];
            state.activeViewId = null;
            state.status = 'idle';
            state.error = null;
        },
        // YENİ: Filtreyi aç/kapa
        toggleShowOnlyCompleted: (state) => {
            state.showOnlyCompleted = !state.showOnlyCompleted;
        }
    },
    extraReducers: (builder) => {
        builder
            // Görünümleri Getirme
            .addCase(fetchViewsForBoard.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(fetchViewsForBoard.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.views = action.payload;
                // Eğer aktif ID yoksa veya listede olmayan bir ID ise, ilk görünümü aktif yap
                if (!state.activeViewId || !action.payload.some(v => v.id === state.activeViewId)) {
                    state.activeViewId = action.payload.length > 0 ? action.payload[0].id : null;
                }
            })
            .addCase(fetchViewsForBoard.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload ?? 'Bilinmeyen bir hata oluştu.';
            })
            // Görünüm Oluşturma
            .addCase(createBoardView.pending, (state) => {
                // Opsiyonel: Yükleniyor durumu gösterilebilir
            })
            .addCase(createBoardView.fulfilled, (state, action) => {
                state.views.push(action.payload); // Yeni görünümü listeye ekle
                state.activeViewId = action.payload.id; // Yeni ekleneni aktif yap
                state.error = null;
            })
            .addCase(createBoardView.rejected, (state, action) => {
                state.error = action.payload ?? 'Görünüm oluşturulamadı.';
            })
            // --- GÜNCELLENDİ: deleteBoardView.fulfilled ---
            .addCase(deleteBoardView.fulfilled, (state, action) => {
                const deletedId = action.payload;
                const deletedIndex = state.views.findIndex(v => v.id === deletedId);
                if (deletedIndex === -1) return; // Bulunamadıysa çık

                state.views.splice(deletedIndex, 1); // Görünümü listeden çıkar
                state.error = null; // Hata varsa temizle

                // Eğer silinen görünüm aktif idiyse
                if (state.activeViewId === deletedId) {
                    // Silinenin bir sonrakini veya bir öncekini (veya ilkini) aktif yap
                    const nextIndex = deletedIndex < state.views.length ? deletedIndex : deletedIndex - 1;
                    state.activeViewId = state.views.length > 0 ? state.views[Math.max(0, nextIndex)].id : null;
                }
            })
            .addCase(deleteBoardView.rejected, (state, action) => {
                state.error = action.payload ?? 'Görünüm silinemedi.';
            })
            // ----------------------------------------------

            // --- YENİ: updateBoardView case'leri ---
            .addCase(updateBoardView.pending, (state) => {
                // Opsiyonel: Yükleniyor durumu
            })
            .addCase(updateBoardView.fulfilled, (state, action) => {
                const updatedViewData = action.payload; // Backend'den dönen veri
                const index = state.views.findIndex(v => v.id === updatedViewData.id);
                if (index !== -1) {
                    // Backend'den tam nesne döndüğü için direkt değiştiriyoruz
                    state.views[index] = updatedViewData;
                }
                state.error = null;
            })
            .addCase(updateBoardView.rejected, (state, action) => {
                state.error = action.payload ?? 'Görünüm yeniden adlandırılamadı.';
            })
            // Görünüm Sıralama (Anlık güncelleme örneği)
            .addCase(reorderBoardViews.pending, (state, action) => {
                // Anlık (Optimistic) Güncelleme: Backend'den yanıt beklemeden sıralamayı değiştir
                const orderedIds = action.meta.arg.orderedViewIds;
                const viewMap = new Map(state.views.map(v => [v.id, v]));
                state.views = orderedIds.map(id => viewMap.get(id)!)
                    .filter(Boolean) // Olası hatalara karşı
                    .map((view, index) => ({ ...view, order: index })); // Order'ı da güncelle
            })
            .addCase(reorderBoardViews.rejected, (state, action) => {
                state.error = action.payload ?? 'Sıralama güncellenemedi.';
                // TODO: Hata durumunda anlık güncellemeyi geri al (fetchViewsForBoard tekrar çağrılabilir)
            })
            // --- Ayarları güncelleme case'i ---
            .addCase(updateBoardViewSettings.fulfilled, (state, action) => {
                const updatedView = action.payload;
                const index = state.views.findIndex(v => v.id === updatedView.id);
                if (index !== -1) {
                    // State'deki görünümü backend'den gelen güncel veriyle değiştir
                    state.views[index] = updatedView;
                }
            })
            .addCase(updateBoardViewSettings.rejected, (state, action) => {
                state.error = action.payload ?? 'Ayar güncellenemedi';
            });
        // ---------------------------------------
    },
});

// --- Actions ---
export const { setActiveViewId, clearBoardViews, toggleShowOnlyCompleted } = boardViewSlice.actions;

// --- Selectors ---
export const selectBoardViews = (state: RootState) => state.boardViews.views;
export const selectActiveViewId = (state: RootState) => state.boardViews.activeViewId;
export const selectBoardViewStatus = (state: RootState) => state.boardViews.status;
export const selectBoardViewError = (state: RootState) => state.boardViews.error;
export const selectShowOnlyCompleted = (state: RootState) => state.boardViews.showOnlyCompleted;

// Aktif görünüm nesnesini döndüren selector (useMemo gibi çalışır)
export const selectActiveView = createSelector(
    [selectBoardViews, selectActiveViewId],
    (views, activeId) => views.find(view => view.id === activeId) || null
);

// --- Reducer ---
export default boardViewSlice.reducer;