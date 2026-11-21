import { useState, useEffect, useCallback } from 'react';

/** Estado recordado en este navegador (preferencias: último registrador, empresa…). */
export function usePersistentState(key, initial) {
  const [value, setValue] = useState(() => readPref(key, initial));
  useEffect(() => {
    writePref(key, value);
  }, [key, value]);
  return [value, setValue];
}

export function readPref(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function writePref(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* sin almacenamiento: se ignora */
  }
}

const TABS = ['resumen', 'desglose', 'reembolsos', 'salidas'];

/** Pestaña activa sincronizada con #resumen / #desglose / #reembolsos. */
export function useHashTab(defaultTab = 'resumen') {
  const read = () => {
    const h = (window.location.hash || '').replace('#', '');
    return TABS.includes(h) ? h : defaultTab;
  };
  const [tab, setTabState] = useState(read);
  useEffect(() => {
    const onHash = () => setTabState(read());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const setTab = useCallback((t) => {
    setTabState(t);
    try {
      if (window.location.hash !== `#${t}`) window.history.replaceState(null, '', `#${t}`);
    } catch {
      /* algunos entornos no permiten modificar el historial */
    }
    window.scrollTo({ top: 0 });
  }, []);
  return [tab, setTab];
}

/** Bloquea el scroll del fondo mientras haya un modal abierto. */
export function useBodyScrollLock(active) {
  useEffect(() => {
    if (!active) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [active]);
}

/** Cierra con la tecla Escape. */
export function useEscape(active, onEscape) {
  useEffect(() => {
    if (!active) return undefined;
    const handler = (e) => {
      if (e.key === 'Escape') onEscape();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [active, onEscape]);
}
