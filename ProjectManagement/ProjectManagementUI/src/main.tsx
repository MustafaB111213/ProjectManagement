import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx'; // .tsx uzantısı
import './index.css';
import { store } from './store/store.ts'; // .ts uzantısı
import { Provider } from 'react-redux';
import 'react-datepicker/dist/react-datepicker.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>,
);