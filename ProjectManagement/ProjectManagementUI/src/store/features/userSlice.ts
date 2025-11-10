import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type { User } from '../../types';
import { API_BASE_URL } from '../../components/common/constants'; // groupSlice'tan kopyalandı
import type { RootState } from '../store';

// --- Async Thunks ---

// Tüm kullanıcıları getirmek için Thunk
export const fetchUsers = createAsyncThunk<User[], void, { rejectValue: string }>(
    'users/fetchAllUsers',
    async (_, { rejectWithValue }) => {
        try {
            const response = await fetch(`${API_BASE_URL}/users`);
            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(errorData || 'Sunucu kullanıcıları getirirken bir hatayla yanıt verdi!');
            }
            const data: User[] = await response.json();
            return data;
        } catch (error: any) {
            return rejectWithValue(error.message || 'Kullanıcılar getirilemedi');
        }
    }
);

// --- Slice Tanımı ---

interface UserState {
    items: User[];
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    error: string | null;
}

const initialState: UserState = {
    items: [],
    status: 'idle',
    error: null,
};

const userSlice = createSlice({
    name: 'users',
    initialState,
    reducers: {
        // Gerekirse buraya senkron reducer'lar eklenebilir
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchUsers.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(fetchUsers.fulfilled, (state, action: PayloadAction<User[]>) => {
                state.status = 'succeeded';
                state.items = action.payload;
            })
            .addCase(fetchUsers.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload || action.error.message || 'Kullanıcıları getirirken bir hata oluştu';
            });
    },
});

// --- Selectors ---
export const selectAllUsers = (state: RootState) => state.users.items;
export const selectUsersStatus = (state: RootState) => state.users.status;
export const selectUserById = (state: RootState, userId: number) =>
    state.users.items.find(user => user.id === userId);


// Reducer'ı export et
export default userSlice.reducer;