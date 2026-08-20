import { createContext, useContext, useState } from 'react';
import { STR, GROUP_T, ITEM_T } from '../config/i18n.js';

export const LANGS = [
  { code: 'uz', label: "O'zbekcha", flag: '🇺🇿' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
];

const LangCtx = createContext(null);
export const useLang = () => useContext(LangCtx);

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try { return localStorage.getItem('iso_lang') || 'uz'; } catch { return 'uz'; }
  });
  function setLang(l) {
    setLangState(l);
    try { localStorage.setItem('iso_lang', l); } catch (e) {}
  }
  // common string
  const t = (key) => (STR[lang] && STR[lang][key]) || STR.uz[key] || key;
  // menu group (uz name is the key; uz returns itself)
  const tg = (name) => (lang === 'uz' ? name : (GROUP_T[name] && GROUP_T[name][lang]) || name);
  // menu item by key, with uz fallback label
  const tm = (key, uzLabel) => (lang === 'uz' ? uzLabel : (ITEM_T[key] && ITEM_T[key][lang]) || uzLabel);

  return <LangCtx.Provider value={{ lang, setLang, t, tg, tm }}>{children}</LangCtx.Provider>;
}
