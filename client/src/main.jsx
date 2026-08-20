import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext.jsx';
import { LangProvider } from './i18n/LangContext.jsx';
import App from './App.jsx';
import './index.css';

// Raqam kiritish maydonida (type="number") sichqoncha g'ildiragi qiymatni tasodifan
// o'zgartirib yubormasin — masalan to'lov summasi maydoni ustidan skroll qilib o'tilsa,
// brauzer standart holatda qiymatni 1 taga kamaytirib/oshirib qo'yadi. Butun ilova bo'ylab
// bitta joyda bloklanadi.
document.addEventListener('wheel', () => {
  const el = document.activeElement;
  if (el && el.tagName === 'INPUT' && el.type === 'number') el.blur();
}, { passive: true });

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <LangProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </LangProvider>
    </BrowserRouter>
  </React.StrictMode>
);
