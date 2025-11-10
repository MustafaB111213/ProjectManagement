import { configureStore } from '@reduxjs/toolkit';
import boardReducer from './features/boardSlice';
import groupReducer from './features/groupSlice'; // Yeni reducer'ı import et
import itemReducer from './features/itemSlice';
import columnReducer from './features/columnSlice'; // Yeni reducer
import boardViewReducer from './features/boardViewSlice';
import userReducer from './features/userSlice'
export const store = configureStore({
    reducer: {
        boards: boardReducer,
        groups: groupReducer, // Yeni reducer'ı ekle
        items: itemReducer,
        columns: columnReducer,
        boardViews: boardViewReducer,
        users: userReducer,
    },
});

// RootState tipini store'un kendisinden türetiyoruz.
export type RootState = ReturnType<typeof store.getState>;
// AppDispatch tipini de alıyoruz. Bu, thunk action'ları için önemlidir.
export type AppDispatch = typeof store.dispatch;