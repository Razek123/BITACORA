/**
 * Adaptadores de persistencia local (localStorage).
 * Misma interfaz que firebaseAdapter.js → se intercambian sin tocar la UI.
 *   - localAdapter         → gastos
 *   - localSalidasAdapter  → vales de salida de material y herramienta
 */
import { buildSeedData, buildSeedSalidas } from '../data/seed';
import { sortGastos } from '../lib/selectors';
import { sortSalidas } from '../lib/salidas';

const newId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/** Colección guardada en una llave de localStorage, con respaldo en memoria. */
function createLocalStore(key, { seed, sort, migrate = (list) => list }) {
  let memoryCache = null;
  const listeners = new Set();

  function readAll() {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) {
        // Primera vez en este navegador → datos de prueba
        if (memoryCache) return memoryCache;
        const initial = seed();
        persist(initial, { silent: true });
        return initial;
      }
      const list = JSON.parse(raw);
      const fixed = migrate(list);
      if (fixed !== list) {
        try {
          window.localStorage.setItem(key, JSON.stringify(fixed));
        } catch {
          /* se corrige de nuevo en la próxima lectura */
        }
      }
      return fixed;
    } catch {
      if (!memoryCache) memoryCache = seed();
      return memoryCache;
    }
  }

  function persist(list, { silent = false } = {}) {
    try {
      window.localStorage.setItem(key, JSON.stringify(list));
    } catch (err) {
      const quota =
        err && (err.name === 'QuotaExceededError' || err.code === 22 || err.name === 'NS_ERROR_DOM_QUOTA_REACHED');
      if (quota) {
        throw new Error('Este dispositivo se quedó sin espacio. Elimina registros antiguos o conecta Firebase.');
      }
      // localStorage bloqueado (modo privado, iframe…) → memoria
    }
    memoryCache = list;
    if (!silent) emit();
  }

  function emit() {
    const snapshot = sort(readAll());
    listeners.forEach((cb) => cb(snapshot));
  }

  return {
    readAll,
    persist,
    subscribe(onData) {
      listeners.add(onData);
      // Entrega inicial asíncrona (igual que onSnapshot de Firestore)
      Promise.resolve().then(() => onData(sort(readAll())));
      // Sincroniza entre pestañas del mismo navegador
      const onStorage = (e) => {
        if (e.key === key) emit();
      };
      window.addEventListener('storage', onStorage);
      return () => {
        listeners.delete(onData);
        window.removeEventListener('storage', onStorage);
      };
    },
    async update(id, patch) {
      const list = readAll();
      const idx = list.findIndex((x) => x.id === id);
      if (idx === -1) throw new Error('El registro ya no existe.');
      const next = { ...list[idx], ...patch, updatedAt: Date.now() };
      const copy = [...list];
      copy[idx] = next;
      persist(copy);
      return next;
    },
    async remove(id) {
      persist(readAll().filter((x) => x.id !== id));
    },
    usageKB() {
      try {
        return Math.round(((window.localStorage.getItem(key) || '').length * 2) / 1024);
      } catch {
        return null;
      }
    },
  };
}

/* ───────────────────────── Gastos ───────────────────────── */

/** Corrige registros guardados con el nombre anterior de la empresa ("Nubixa" → "Nuvixa"). */
function migrateEmpresa(list) {
  const LEGACY = 'Nub' + 'ixa';
  if (!list.some((g) => g.empresa === LEGACY)) return list;
  return list.map((g) => (g.empresa === LEGACY ? { ...g, empresa: 'Nuvixa' } : g));
}

const gastosStore = createLocalStore('bitacora.gastos.v1', {
  seed: buildSeedData,
  sort: sortGastos,
  migrate: migrateEmpresa,
});

export const localAdapter = {
  name: 'local',
  label: 'Guardado en este dispositivo',
  canReset: true,
  subscribe: gastosStore.subscribe,

  async create(gasto, ticketDataUrl) {
    const now = Date.now();
    const record = { ...gasto, id: newId(), ticketImagen: ticketDataUrl || null, createdAt: now, updatedAt: now };
    gastosStore.persist([record, ...gastosStore.readAll()]);
    return record;
  },

  async update(id, patch, ticket) {
    const extra = ticket !== undefined ? { ticketImagen: ticket } : {}; // null = quitar, string = reemplazar
    return gastosStore.update(id, { ...patch, ...extra });
  },

  remove: gastosStore.remove,

  async resetDemo() {
    gastosStore.persist(buildSeedData());
  },

  async clearAll() {
    gastosStore.persist([]);
  },

  usageKB: gastosStore.usageKB,
};

/* ───────────────────────── Salidas ───────────────────────── */

const salidasStore = createLocalStore('bitacora.salidas.v1', { seed: buildSeedSalidas, sort: sortSalidas });

export const localSalidasAdapter = {
  subscribe: salidasStore.subscribe,

  async create(salida) {
    const list = salidasStore.readAll();
    const folio = list.reduce((max, s) => Math.max(max, Number(s.folio) || 0), 0) + 1;
    const now = Date.now();
    const record = { ...salida, id: newId(), folio, createdAt: now, updatedAt: now };
    salidasStore.persist([record, ...list]);
    return record;
  },

  update: salidasStore.update,
  remove: salidasStore.remove,

  async resetDemo() {
    salidasStore.persist(buildSeedSalidas());
  },

  async clearAll() {
    salidasStore.persist([]);
  },

  usageKB: salidasStore.usageKB,
};
