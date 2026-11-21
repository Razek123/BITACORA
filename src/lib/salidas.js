/**
 * Lógica de los vales de salida de material y herramienta.
 *
 * Cada artículo:
 *   { id, nombre, tipo: 'Herramienta' | 'Material', cantidad, devuelto, consumido, nota }
 *   - devuelto:  piezas que ya regresaron (0…cantidad)
 *   - consumido: solo materiales; true = lo que no regresó se usó en la obra/evento
 */
import { todayISO } from './format';

export const TIPO_HERRAMIENTA = 'Herramienta';
export const TIPO_MATERIAL = 'Material';
export const TIPOS_ARTICULO = [
  { value: TIPO_HERRAMIENTA, label: 'Herramienta / equipo', corto: 'Herramienta' },
  { value: TIPO_MATERIAL, label: 'Material', corto: 'Material' },
];

export const fmtFolio = (n) => (n ? `S-${String(n).padStart(4, '0')}` : 'S-____');

const num = (n) => Math.max(0, Math.floor(Number(n) || 0));

/** Piezas que siguen fuera de un artículo. */
export function itemPendiente(it) {
  if (it.consumido) return 0;
  return Math.max(0, num(it.cantidad) - Math.min(num(it.devuelto), num(it.cantidad)));
}

/**
 * Estado de un artículo:
 *  'regreso' | 'consumido' | 'parcial' | 'fuera' | 'faltante'
 */
export function itemEstado(it, cerrada = false) {
  const cantidad = num(it.cantidad);
  const devuelto = Math.min(num(it.devuelto), cantidad);
  if (devuelto >= cantidad) return 'regreso';
  if (it.consumido) return 'consumido';
  if (cerrada) return 'faltante';
  if (devuelto > 0) return 'parcial';
  return 'fuera';
}

export function itemEstadoLabel(it, cerrada = false) {
  const cantidad = num(it.cantidad);
  const devuelto = Math.min(num(it.devuelto), cantidad);
  switch (itemEstado(it, cerrada)) {
    case 'regreso':
      return 'Regresó';
    case 'consumido':
      return devuelto > 0 ? `${devuelto} regresó · resto consumido` : 'Consumido';
    case 'faltante':
      return `Faltan ${cantidad - devuelto}`;
    case 'parcial':
      return `Regresó ${devuelto} de ${cantidad}`;
    default:
      return 'Fuera';
  }
}

export function salidaStats(s) {
  const items = s.items || [];
  let piezas = 0;
  let devueltas = 0;
  let consumidas = 0;
  let pendientes = 0;
  let herramientas = 0;
  let materiales = 0;
  for (const it of items) {
    const cantidad = num(it.cantidad);
    const dev = Math.min(num(it.devuelto), cantidad);
    piezas += cantidad;
    devueltas += dev;
    if (it.consumido) consumidas += cantidad - dev;
    pendientes += itemPendiente(it);
    if (it.tipo === TIPO_MATERIAL) materiales += 1;
    else herramientas += 1;
  }
  const resueltas = piezas - pendientes;
  return {
    articulos: items.length,
    piezas,
    devueltas,
    consumidas,
    pendientes,
    resueltas,
    herramientas,
    materiales,
    avance: piezas ? resueltas / piezas : 1,
  };
}

/**
 * Estado general del vale:
 *  'completa'  → todo regresó o se consumió
 *  'faltantes' → se cerró manualmente con piezas sin regresar
 *  'vencida'   → sigue fuera y ya pasó la fecha estimada de regreso
 *  'abierta'   → sigue fuera, en tiempo
 */
export function salidaEstado(s, today = todayISO()) {
  const { pendientes } = salidaStats(s);
  if (pendientes === 0) return 'completa';
  if (s.cerrada) return 'faltantes';
  if (s.regresoEstimado && s.regresoEstimado < today) return 'vencida';
  return 'abierta';
}

export const ESTADOS_SALIDA = {
  abierta: { label: 'Fuera', tone: 'neutral' },
  vencida: { label: 'Regreso vencido', tone: 'due' },
  completa: { label: 'Todo regresó', tone: 'ok' },
  faltantes: { label: 'Cerrada con faltantes', tone: 'due' },
};

export const salidaAbierta = (s) => {
  const e = salidaEstado(s);
  return e === 'abierta' || e === 'vencida';
};

export function sortSalidas(list) {
  return [...list].sort((a, b) => {
    if (a.fechaSalida !== b.fechaSalida) return a.fechaSalida < b.fechaSalida ? 1 : -1;
    return (Number(b.folio) || 0) - (Number(a.folio) || 0);
  });
}

/** Resumen de lo que está fuera ahora mismo. */
export function resumenSalidas(salidas) {
  const today = todayISO();
  let abiertas = 0;
  let vencidas = 0;
  let piezasFuera = 0;
  for (const s of salidas) {
    const e = salidaEstado(s, today);
    if (e === 'abierta' || e === 'vencida') {
      abiertas += 1;
      piezasFuera += salidaStats(s).pendientes;
      if (e === 'vencida') vencidas += 1;
    }
  }
  return { abiertas, vencidas, piezasFuera };
}

/** Artículos usados antes (para autocompletar), del más frecuente al menos. */
export function catalogoArticulos(salidas) {
  const map = new Map();
  for (const s of salidas) {
    for (const it of s.items || []) {
      const nombre = String(it.nombre || '').trim();
      if (!nombre) continue;
      const k = nombre.toLowerCase();
      const prev = map.get(k);
      map.set(k, { nombre, tipo: it.tipo, veces: (prev ? prev.veces : 0) + 1 });
    }
  }
  return [...map.values()].sort((a, b) => b.veces - a.veces || a.nombre.localeCompare(b.nombre, 'es'));
}
