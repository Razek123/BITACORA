const mxn = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const mxn0 = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** $1,250.00 */
export function fmtMXN(value) {
  return mxn.format(Number(value) || 0);
}

/** $1,250 (sin centavos, para etiquetas de gráficas) */
export function fmtMXN0(value) {
  return mxn0.format(Math.round(Number(value) || 0));
}

/** $1.3k para ejes */
export function fmtCompact(value) {
  const n = Number(value) || 0;
  if (Math.abs(n) >= 1000000) return `$${(n / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
  if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return `$${Math.round(n)}`;
}

export function fmtPct(part, total) {
  if (!total) return '0%';
  const p = (part / total) * 100;
  return `${p >= 10 || p === 0 ? Math.round(p) : p.toFixed(1)}%`;
}

/** Convierte "1,250.50" / "1250,5" / "$ 1 250" a número. */
export function parseMonto(raw) {
  if (typeof raw === 'number') return raw;
  let s = String(raw || '').replace(/[^\d.,]/g, '');
  if (!s) return 0;
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  if (lastComma > lastDot && s.length - lastComma <= 3) {
    // coma como separador decimal
    s = s.replace(/\./g, '').replace(',', '.');
  } else {
    s = s.replace(/,/g, '');
  }
  const n = parseFloat(s);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

/* ───────────── Fechas (siempre en hora local, formato YYYY-MM-DD) ───────────── */

export const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
export const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
export const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

const pad = (n) => String(n).padStart(2, '0');

export function toISODate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayISO() {
  return toISODate(new Date());
}

export function parseISODate(iso) {
  const [y, m, d] = String(iso || '').split('-').map(Number);
  if (!y || !m || !d) return new Date(NaN);
  return new Date(y, m - 1, d);
}

export function addDaysISO(iso, days) {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/** Lunes de la semana de `iso`. */
export function startOfWeekISO(iso) {
  const d = parseISODate(iso);
  const offset = (d.getDay() + 6) % 7; // lunes = 0
  d.setDate(d.getDate() - offset);
  return toISODate(d);
}

/** "Miércoles 18 Nov" (+ año si no es el actual) */
export function fmtDayHeader(iso) {
  const d = parseISODate(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const base = `${DIAS[d.getDay()]} ${d.getDate()} ${MESES_CORTOS[d.getMonth()]}`;
  return d.getFullYear() === new Date().getFullYear() ? base : `${base} ${d.getFullYear()}`;
}

/** "18 Nov 2026" */
export function fmtDate(iso) {
  const d = parseISODate(iso);
  if (Number.isNaN(d.getTime())) return iso || '—';
  return `${d.getDate()} ${MESES_CORTOS[d.getMonth()]} ${d.getFullYear()}`;
}

/** "18 Nov" (año solo si no es el actual) */
export function fmtDateShort(iso) {
  const d = parseISODate(iso);
  if (Number.isNaN(d.getTime())) return iso || '—';
  const base = `${d.getDate()} ${MESES_CORTOS[d.getMonth()]}`;
  return d.getFullYear() === new Date().getFullYear() ? base : `${base} ${d.getFullYear()}`;
}

/** "18/11/2026" para CSV */
export function fmtDateNumeric(iso) {
  const d = parseISODate(iso);
  if (Number.isNaN(d.getTime())) return iso || '';
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function fmtDateTime(ms) {
  if (!ms) return '—';
  const d = new Date(ms);
  return `${d.getDate()} ${MESES_CORTOS[d.getMonth()]} ${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function relativeDayLabel(iso) {
  const today = todayISO();
  if (iso === today) return 'Hoy';
  if (iso === addDaysISO(today, -1)) return 'Ayer';
  return null;
}
