import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type { Group } from '../../types'; // Kendi type tanımlarınızdan Group'u import edin
import { API_BASE_URL } from '../../components/common/constants'; // API adresinizi import edin
import type { RootState } from '../store'; // Ana store'unuzdan RootState tipini import edin

// --- Selector ---
// State'ten tüm grupları seçmek için selector
export const selectAllGroups = (state: RootState) => state.groups.items;

// --- Async Thunks (Asenkron İşlemler) ---

// Belirli bir panoya ait grupları getirmek için Thunk
export const fetchGroupsForBoard = createAsyncThunk<Group[], number, { rejectValue: string }>(
    'groups/fetchGroupsForBoard', // Action tipi öneki
    async (boardId, { rejectWithValue }) => { // boardId parametresini alır
        try {
            const response = await fetch(`${API_BASE_URL}/boards/${boardId}/groups`); // Backend endpoint'ine istek at
            if (!response.ok) {
                // Hata durumunda daha fazla detay almaya çalış
                const errorData = await response.text();
                console.error(`Pano ${boardId} için gruplar getirilirken hata: ${response.status} ${response.statusText}`, errorData);
                // Hata mesajını fırlat veya rejectWithValue ile döndür
                throw new Error(errorData || 'Sunucu bir hatayla yanıt verdi!');
            }
            const data: Group[] = await response.json();
            // Backend'in grupları 'order' özelliğine göre artan sırada gönderdiğini varsayıyoruz
            return data; // Başarılı olursa veriyi döndür
        } catch (error: any) {
            // Yakalanan hataları rejectWithValue ile işle
            return rejectWithValue(error.message || 'Gruplar getirilemedi');
        }
    }
);

// Yeni bir grup oluşturmak için argümanların arayüzü
interface CreateGroupArgs {
    boardId: number;
    groupData: { title: string; color: string };
    position?: 'top' | 'bottom'; // Frontend tarafında anlık güncelleme için ipucu (opsiyonel)
}
// Yeni grup oluşturmak için Thunk
export const createGroup = createAsyncThunk<Group, CreateGroupArgs, { rejectValue: string }>(
    'groups/createGroup',
    async ({ boardId, groupData, position }, { rejectWithValue }) => { // 'position' argümanı burada alınır
        try {
            // Backend'in yeni grup için doğru 'order' değerini ayarlaması beklenir
            const response = await fetch(`${API_BASE_URL}/boards/${boardId}/groups`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(groupData),
            });
            if (!response.ok) {
                const errorData = await response.text();
                console.error(`Pano ${boardId} için grup oluşturulurken hata: ${response.status} ${response.statusText}`, errorData);
                throw new Error(errorData || 'Grup oluşturulamadı');
            }
            const createdGroup: Group = await response.json();
            // Backend, oluşturulan grubun ID'sini ve atanmış 'order' değerini DÖNDÜRMELİDİR
            return createdGroup;
        } catch (error: any) {
             return rejectWithValue(error.message || 'Grup oluşturulamadı');
        }
    }
);

// Bir grubun özelliklerini (başlık, renk) güncellemek için argümanların arayüzü
interface UpdateGroupArgs {
    boardId: number;
    groupId: number;
    groupData: { title: string; color: string; }; // Sıralama ayrı yönetilir
}
// Grup güncellemek için Thunk
export const updateGroup = createAsyncThunk<Group, UpdateGroupArgs, { rejectValue: string }>(
    'groups/updateGroup',
    async ({ boardId, groupId, groupData }, { rejectWithValue }) => {
        try {
            const response = await fetch(`${API_BASE_URL}/boards/${boardId}/groups/${groupId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(groupData),
            });
            if (!response.ok) {
                 const errorData = await response.text();
                 console.error(`Grup ${groupId} güncellenirken hata: ${response.status} ${response.statusText}`, errorData);
                throw new Error(errorData || 'Grup güncellenemedi');
            }
             // Backend 204 döndürse bile, reducer'ın kullanması için temel bilgileri döndür
             return { id: groupId, boardId, ...groupData } as Group; // 'order' eksik olabilir!
        } catch (error: any) {
            return rejectWithValue(error.message || 'Grup güncellenemedi');
        }
    }
);

// Bir grubu silmek için argümanların arayüzü
interface DeleteGroupArgs {
    boardId: number;
    groupId: number;
}
// Grup silmek için Thunk
export const deleteGroup = createAsyncThunk<number, DeleteGroupArgs, { rejectValue: string }>(
    'groups/deleteGroup',
    async ({ boardId, groupId }, { rejectWithValue }) => {
         try {
            const response = await fetch(`${API_BASE_URL}/boards/${boardId}/groups/${groupId}`, { method: 'DELETE' });
             if (!response.ok) {
                 const errorData = await response.text();
                 console.error(`Grup ${groupId} silinirken hata: ${response.status} ${response.statusText}`, errorData);
                 throw new Error(errorData || 'Grup silinemedi');
             }
            return groupId; // Reducer için ID'yi döndür
         } catch (error: any) {
             return rejectWithValue(error.message || 'Grup silinemedi');
         }
    }
);

// Grupların sırasını backend'de güncellemek için argümanların arayüzü
interface ReorderGroupsArgs {
    boardId: number;
    orderedGroupIds: number[]; // Yeni sıraya göre grup ID'lerinin dizisi
}
// Grup sırasını güncellemek için Thunk
export const updateGroupOrder = createAsyncThunk<void, ReorderGroupsArgs, { rejectValue: string }>(
    'groups/updateOrder',
    async ({ boardId, orderedGroupIds }, { rejectWithValue }) => {
        try {
            // Backend endpoint'inizin URL ve body formatıyla eşleştiğinden emin olun
            const response = await fetch(`${API_BASE_URL}/boards/${boardId}/groups/reorder`, { // <-- ENDPOINT'İ KONTROL ET
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                // Backend'in List<int> yerine { orderedGroupIds: [...] } bekleme ihtimaline karşı bu formatı gönderiyoruz
                body: JSON.stringify({ orderedGroupIds: orderedGroupIds }),
            });
            if (!response.ok) {
                const errorData = await response.text();
                console.error('Gruplar yeniden sıralanırken hata:', response.status, response.statusText, errorData);
                // Hata mesajını rejectWithValue ile döndür, böylece reducer yakalayabilir
                return rejectWithValue(errorData || `Sunucuda grup sırası güncellenemedi (HTTP ${response.status})`);
            }
            // Başarılı olursa bir değer döndürmeye gerek yok
        } catch (error: any) {
             console.error('Grup sırası güncellenirken fetch hatası:', error);
             return rejectWithValue(error.message || 'Grup sırası güncellenirken bir ağ hatası oluştu');
        }
    }
);


// --- Slice Tanımı ---

// State yapısının arayüzü
interface GroupState {
    items: Group[]; // Group nesnelerinin dizisi, backend'den sıralı gelmesi beklenir
    status: 'idle' | 'loading' | 'succeeded' | 'failed'; // Veri getirme durumu
    error: string | null; // Hata mesajı
    isUpdatingOrder?: boolean; // Opsiyonel: Yeniden sıralama yüklenme durumu için bayrak
}

// Başlangıç state'i
const initialState: GroupState = {
    items: [],
    status: 'idle',
    error: null,
    isUpdatingOrder: false,
};

const groupSlice = createSlice({
    name: 'groups', // Slice adı
    initialState,
    // --- Senkron Reducer'lar ---
    reducers: {
        // Tüm grupları temizler, durumu sıfırlar
        clearGroups: (state) => {
            state.items = [];
            state.status = 'idle';
            state.error = null;
        },
        // Grupları state içinde anlık olarak yeniden sıralar (Sürükle-Bırak için İyimser Güncelleme)
        reorderGroupsLocally: (state, action: PayloadAction<{ orderedGroups: Group[] }>) => {
             state.items = action.payload.orderedGroups;
        }
    },
    // --- Asenkron Thunk'ların Durumlarını İşleme ---
    extraReducers: (builder) => {
        builder
            // Grupları Getirme
            .addCase(fetchGroupsForBoard.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(fetchGroupsForBoard.fulfilled, (state, action: PayloadAction<Group[]>) => {
                state.status = 'succeeded';
                // Backend'den gelen sıralı listeyi doğrudan kullan (SIRALAMA YAPMA)
                state.items = action.payload;
            })
            .addCase(fetchGroupsForBoard.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload || action.error.message || 'Grupları getirirken bir hata oluştu';
            })

            // Grup Oluşturma
            .addCase(createGroup.pending, (state) => { /* İsteğe bağlı yüklenme durumu */ })
            .addCase(createGroup.fulfilled, (state, action) => { // action: PayloadAction<Group> tipinde
                const yeniGrup = action.payload;
                const position = (action.meta.arg as CreateGroupArgs).position; // Cast ederek position'a eriş

                // İyimser güncelleme
                if (position === 'top') {
                    state.items.unshift(yeniGrup);
                } else {
                    state.items.push(yeniGrup);
                }
            })
            .addCase(createGroup.rejected, (state, action) => {
                state.status = 'failed';
                // action.payload artık string (rejectValue: string)
                state.error = action.payload || action.error.message || 'Grup oluşturulamadı';
            })

            // Grup Güncelleme (Başlık/Renk)
            .addCase(updateGroup.pending, (state) => { /* İsteğe bağlı yüklenme durumu */ })
            .addCase(updateGroup.fulfilled, (state, action: PayloadAction<Group>) => {
                const guncellenenGrupVerisi = action.payload;
                const index = state.items.findIndex(g => g.id === guncellenenGrupVerisi.id);
                if (index !== -1) {
                    // Mevcut grup ile güncellenen veriyi birleştir ('order' korunur)
                    state.items[index] = { ...state.items[index], ...guncellenenGrupVerisi };
                }
            })
             .addCase(updateGroup.rejected, (state, action) => {
                state.status = 'failed';
                state.error = (action.payload as string) || action.error.message || 'Grup güncellenemedi';
            })

            // Grup Silme
            .addCase(deleteGroup.pending, (state) => { /* İsteğe bağlı yüklenme durumu */ })
            .addCase(deleteGroup.fulfilled, (state, action: PayloadAction<number>) => {
                state.items = state.items.filter(g => g.id !== action.payload);
            })
            .addCase(deleteGroup.rejected, (state, action) => {
                state.status = 'failed';
                state.error = (action.payload as string) || action.error.message || 'Grup silinemedi';
            })

            // Grup Sırasını Güncelleme
            .addCase(updateGroupOrder.pending, (state) => {
                state.isUpdatingOrder = true;
                state.error = null;
                // console.log("Grup sırası güncelleniyor...");
            })
            .addCase(updateGroupOrder.fulfilled, (state) => {
                 state.isUpdatingOrder = false;
                 // console.log("Grup sırası başarıyla güncellendi.");
                 // İyimser güncelleme zaten yapıldı
            })
            .addCase(updateGroupOrder.rejected, (state, action) => {
                state.isUpdatingOrder = false;
                // action.payload string (rejectValue: string)
                state.error = action.payload || action.error.message || 'Grup sırası güncellenemedi';
                console.error("Grup sırası güncellenirken hata:", state.error);
                // TODO: Hata durumunda iyimser güncellemeyi geri al (daha karmaşık)
            });
        },
});

// Senkron action'ları export et
export const { clearGroups, reorderGroupsLocally } = groupSlice.actions;
// Reducer'ı export et
export default groupSlice.reducer;

