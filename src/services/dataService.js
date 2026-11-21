/**
 * ─────────────────────────────────────────────────────────────
 *  Capa de datos de Bitácora
 * ─────────────────────────────────────────────────────────────
 *  La UI SOLO habla con este módulo. Por debajo elige el adaptador:
 *
 *   • localStorageAdapter  → por defecto (funciona al instante, sin servidor)
 *   • firebaseAdapter      → en cuanto llenas src/config/firebase.config.js
 *
 *  Ambos implementan la misma interfaz:
 *    subscribe(onData, onError) → unsubscribe
 *    create(gasto, ticketDataUrl)
 *    update(id, patch, ticket)   // ticket: undefined = sin cambio, null = quitar, dataURL = nuevo
 *    remove(id)
 *    resetDemo() / clearAll()    // solo local
 */
import { isFirebaseConfigured } from '../config/firebase.config';
import { localAdapter, localSalidasAdapter } from './localStorageAdapter';
import {
  EMPRESAS,
  CATEGORIAS,
  METODOS,
  METODO_EFECTIVO,
  ESTADO_PENDIENTE,
  ESTADO_PAGADO,
} from '../lib/constants';
import { todayISO } from '../lib/format';
import { TIPO_MATERIAL, TIPO_HERRAMIENTA, itemPendiente } from '../lib/salidas';

let adapterPromise = null;
let salidasPromise = null;

function getAdapter() {
  if (!adapterPromise) {
    adapterPromise = isFirebaseConfigured
      ? import('./firebaseAdapter.js').then((m) => m.firebaseAdapter)
      : Promise.resolve(localAdapter);
  }
  return adapterPromise;
}

function getSalidasAdapter() {
  if (!salidasPromise) {
    salidasPromise = isFirebaseConfigured
      ? import('./firebaseAdapter.js').then((m) => m.firebaseSalidasAdapter)
      : Promise.resolve(localSalidasAdapter);
  }
  return salidasPromise;
}

/** Limpia y valida un gasto antes de guardarlo (misma regla para cualquier backend). */
export function normalizeGasto(input) {
  const monto = Math.round((Number(input.monto) || 0) * 100) / 100;
  const efectivo = input.metodoPago === METODO_EFECTIVO;
  const gasto = {
    fecha: /^\d{4}-\d{2}-\d{2}$/.test(input.fecha || '') ? input.fecha : todayISO(),
    empresa: EMPRESAS.includes(input.empresa) ? input.empresa : EMPRESAS[0],
    concepto: String(input.concepto || '').trim(),
    categoria: CATEGORIAS.includes(input.categoria) ? input.categoria : 'Otros',
    monto,
    metodoPago: METODOS.includes(input.metodoPago) ? input.metodoPago : METODOS[0],
    registradoPor: String(input.registradoPor || '').trim() || 'Otro',
    reembolsoA: efectivo ? String(input.reembolsoA || '').trim() || null : null,
    estadoReembolso: efectivo ? (input.estadoReembolso === ESTADO_PAGADO ? ESTADO_PAGADO : ESTADO_PENDIENTE) : null,
    fechaPago: efectivo && input.estadoReembolso === ESTADO_PAGADO ? input.fechaPago || todayISO() : null,
  };
  const errors = {};
  if (!(gasto.monto > 0)) errors.monto = 'Captura un monto mayor a $0.00';
  if (!gasto.concepto) errors.concepto = 'Describe el gasto';
  if (efectivo && !gasto.reembolsoA) errors.reembolsoA = 'Indica a quién se le debe reembolsar';
  return { gasto, errors, valid: Object.keys(errors).length === 0 };
}

export const dataService = {
  backend: isFirebaseConfigured ? 'firebase' : 'local',

  subscribe(onData, onError = () => {}) {
    let unsubscribe = null;
    let cancelled = false;
    getAdapter()
      .then((adapter) => {
        if (!cancelled) unsubscribe = adapter.subscribe(onData, onError);
      })
      .catch(onError);
    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
  },

  async create(input, ticketDataUrl = null) {
    const { gasto, valid, errors } = normalizeGasto(input);
    if (!valid) throw Object.assign(new Error(Object.values(errors)[0]), { errors });
    return (await getAdapter()).create(gasto, ticketDataUrl);
  },

  async update(id, input, ticket) {
    const { gasto, valid, errors } = normalizeGasto(input);
    if (!valid) throw Object.assign(new Error(Object.values(errors)[0]), { errors });
    return (await getAdapter()).update(id, gasto, ticket);
  },

  async markPaid(id, fechaPago = todayISO()) {
    return (await getAdapter()).update(id, { estadoReembolso: ESTADO_PAGADO, fechaPago });
  },

  async markPending(id) {
    return (await getAdapter()).update(id, { estadoReembolso: ESTADO_PENDIENTE, fechaPago: null });
  },

  async remove(id) {
    return (await getAdapter()).remove(id);
  },

  async info() {
    const adapter = await getAdapter();
    const salidas = await getSalidasAdapter();
    const kb = adapter.usageKB && salidas.usageKB ? (adapter.usageKB() || 0) + (salidas.usageKB() || 0) : null;
    return {
      name: adapter.name,
      label: adapter.label,
      canReset: Boolean(adapter.canReset),
      usageKB: kb,
    };
  },

  /** Restablece gastos y salidas de prueba (solo modo local). */
  async resetDemo() {
    const [adapter, salidas] = await Promise.all([getAdapter(), getSalidasAdapter()]);
    if (!adapter.resetDemo) throw new Error('No disponible con este backend.');
    await adapter.resetDemo();
    if (salidas.resetDemo) await salidas.resetDemo();
  },

  /** Borra gastos y salidas (solo modo local). */
  async clearAll() {
    const [adapter, salidas] = await Promise.all([getAdapter(), getSalidasAdapter()]);
    if (!adapter.clearAll) throw new Error('No disponible con este backend.');
    await adapter.clearAll();
    if (salidas.clearAll) await salidas.clearAll();
  },
};

/* ───────────────────── Salidas de material y herramienta ───────────────────── */

const isoOrNull = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(v || '') ? v : null);
const newItemId = () => `it-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

/** Limpia y valida un vale de salida. */
export function normalizeSalida(input) {
  const items = (input.items || [])
    .map((it) => {
      const cantidad = Math.max(1, Math.floor(Number(it.cantidad) || 1));
      const tipo = it.tipo === TIPO_MATERIAL ? TIPO_MATERIAL : TIPO_HERRAMIENTA;
      return {
        id: it.id || newItemId(),
        nombre: String(it.nombre || '').trim().slice(0, 120),
        tipo,
        cantidad,
        devuelto: Math.min(cantidad, Math.max(0, Math.floor(Number(it.devuelto) || 0))),
        consumido: tipo === TIPO_MATERIAL && Boolean(it.consumido),
        nota: String(it.nota || '').trim().slice(0, 140),
      };
    })
    .filter((it) => it.nombre);

  const pendientes = items.reduce((acc, it) => acc + itemPendiente(it), 0);
  const cerrada = Boolean(input.cerrada) && pendientes > 0;
  const salida = {
    empresa: EMPRESAS.includes(input.empresa) ? input.empresa : EMPRESAS[0],
    destino: String(input.destino || '').trim().slice(0, 160),
    responsable: String(input.responsable || '').trim().slice(0, 60),
    autorizo: String(input.autorizo || '').trim().slice(0, 60),
    fechaSalida: isoOrNull(input.fechaSalida) || todayISO(),
    regresoEstimado: isoOrNull(input.regresoEstimado),
    notas: String(input.notas || '').trim().slice(0, 500),
    items,
    cerrada,
    fechaCierre: cerrada ? isoOrNull(input.fechaCierre) || todayISO() : null,
    // Fecha en que todo quedó de regreso (se calcula sola)
    fechaCompleta: items.length && pendientes === 0 ? isoOrNull(input.fechaCompleta) || todayISO() : null,
  };
  const errors = {};
  if (!salida.destino) errors.destino = 'Indica el evento, obra o destino';
  if (!salida.responsable) errors.responsable = '¿Quién se lleva el material?';
  if (!items.length) errors.items = 'Agrega al menos un artículo';
  return { salida, errors, valid: Object.keys(errors).length === 0 };
}

export const salidasService = {
  subscribe(onData, onError = () => {}) {
    let unsubscribe = null;
    let cancelled = false;
    getSalidasAdapter()
      .then((adapter) => {
        if (!cancelled) unsubscribe = adapter.subscribe(onData, onError);
      })
      .catch(onError);
    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
  },

  async create(input) {
    const { salida, valid, errors } = normalizeSalida(input);
    if (!valid) throw Object.assign(new Error(Object.values(errors)[0]), { errors });
    return (await getSalidasAdapter()).create(salida);
  },

  /** Guarda el vale completo (edición o registro de regreso). */
  async save(id, input) {
    const { salida, valid, errors } = normalizeSalida(input);
    if (!valid) throw Object.assign(new Error(Object.values(errors)[0]), { errors });
    return (await getSalidasAdapter()).update(id, salida);
  },

  async remove(id) {
    return (await getSalidasAdapter()).remove(id);
  },
};
