import {
  EMPRESAS,
  METODO_TARJETA,
  METODO_EFECTIVO,
  ESTADO_PENDIENTE,
  ESTADO_PAGADO,
  PERIODOS,
} from './constants';
import { todayISO, startOfWeekISO, addDaysISO, fmtDate } from './format';

export const isEfectivo = (g) => g.metodoPago === METODO_EFECTIVO;
export const isPendiente = (g) => isEfectivo(g) && g.estadoReembolso !== ESTADO_PAGADO;
export const isPagado = (g) => isEfectivo(g) && g.estadoReembolso === ESTADO_PAGADO;

/** Rango [from, to] (ISO, inclusivo) para un periodo; null = sin límite. */
export function periodRange(periodo, today = todayISO()) {
  switch (periodo) {
    case 'hoy':
      return { from: today, to: today };
    case 'semana': {
      const from = startOfWeekISO(today);
      return { from, to: addDaysISO(from, 6) };
    }
    case 'mes':
      return { from: `${today.slice(0, 7)}-01`, to: `${today.slice(0, 7)}-31` };
    default:
      return null;
  }
}

export function periodLabel(periodo, today = todayISO()) {
  const p = PERIODOS.find((x) => x.id === periodo);
  const range = periodRange(periodo, today);
  if (!range) return 'Todo el historial';
  if (periodo === 'hoy') return `Hoy, ${fmtDate(today)}`;
  if (periodo === 'mes') return `${p.label} (${fmtDate(range.from).replace(/^1 /, '')})`;
  return `${p.label} (${fmtDate(range.from)} – ${fmtDate(range.to)})`;
}

export function filterByPeriod(list, periodo) {
  const range = periodRange(periodo);
  if (!range) return list;
  return list.filter((g) => g.fecha >= range.from && g.fecha <= range.to);
}

const emptyEmpresa = () => ({ total: 0, tarjeta: 0, efectivo: 0, pendiente: 0, pagado: 0, count: 0 });

/** Totales generales para KPIs y gráficas. */
export function summarize(list) {
  const porEmpresa = { LGHT: emptyEmpresa(), Nuvixa: emptyEmpresa() };
  let total = 0;
  let conTicket = 0;
  let pendientesCount = 0;

  for (const g of list) {
    const e = porEmpresa[g.empresa] || (porEmpresa[g.empresa] = emptyEmpresa());
    const m = Number(g.monto) || 0;
    total += m;
    e.total += m;
    e.count += 1;
    if (g.ticketImagen) conTicket += 1;
    if (g.metodoPago === METODO_TARJETA) e.tarjeta += m;
    else if (isEfectivo(g)) {
      e.efectivo += m;
      if (isPendiente(g)) {
        e.pendiente += m;
        pendientesCount += 1;
      } else e.pagado += m;
    }
  }

  const sum = (key) => EMPRESAS.reduce((acc, k) => acc + porEmpresa[k][key], 0);

  return {
    total: round2(total),
    count: list.length,
    conTicket,
    porEmpresa,
    tarjeta: { total: round2(sum('tarjeta')), LGHT: porEmpresa.LGHT.tarjeta, Nuvixa: porEmpresa.Nuvixa.tarjeta },
    efectivo: { total: round2(sum('efectivo')), LGHT: porEmpresa.LGHT.efectivo, Nuvixa: porEmpresa.Nuvixa.efectivo },
    pendiente: {
      total: round2(sum('pendiente')),
      LGHT: porEmpresa.LGHT.pendiente,
      Nuvixa: porEmpresa.Nuvixa.pendiente,
      count: pendientesCount,
    },
    pagado: { total: round2(sum('pagado')) },
  };
}

/** [{ fecha, items, total }] ordenado del día más reciente al más antiguo. */
export function groupByDay(list) {
  const map = new Map();
  for (const g of list) {
    if (!map.has(g.fecha)) map.set(g.fecha, []);
    map.get(g.fecha).push(g);
  }
  return [...map.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([fecha, items]) => ({
      fecha,
      items: items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)),
      total: round2(items.reduce((acc, g) => acc + (Number(g.monto) || 0), 0)),
    }));
}

/**
 * Agrupa gastos en efectivo por persona a reembolsar.
 * [{ persona, LGHT, Nuvixa, total, pendiente, pagado, items }]
 */
export function groupByPersona(list) {
  const map = new Map();
  for (const g of list) {
    if (!isEfectivo(g)) continue;
    const persona = (g.reembolsoA || 'Sin asignar').trim() || 'Sin asignar';
    if (!map.has(persona)) {
      map.set(persona, { persona, LGHT: 0, Nuvixa: 0, total: 0, pendiente: 0, pagado: 0, items: [] });
    }
    const row = map.get(persona);
    const m = Number(g.monto) || 0;
    row[g.empresa] = round2((row[g.empresa] || 0) + m);
    row.total = round2(row.total + m);
    if (isPendiente(g)) row.pendiente = round2(row.pendiente + m);
    else row.pagado = round2(row.pagado + m);
    row.items.push(g);
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}

export const DEFAULT_FILTERS = { empresa: 'todas', metodo: 'todos', persona: 'todas', periodo: 'todo', q: '' };

export function hasActiveFilters(f) {
  return (
    f.empresa !== 'todas' || f.metodo !== 'todos' || f.persona !== 'todas' || f.periodo !== 'todo' || f.q.trim() !== ''
  );
}

const normalize = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

export function applyFilters(list, f) {
  const q = normalize(f.q.trim());
  return filterByPeriod(list, f.periodo).filter((g) => {
    if (f.empresa !== 'todas' && g.empresa !== f.empresa) return false;
    if (f.metodo === 'tarjeta' && g.metodoPago !== METODO_TARJETA) return false;
    if (f.metodo === 'efectivo' && g.metodoPago !== METODO_EFECTIVO) return false;
    if (f.persona !== 'todas' && g.registradoPor !== f.persona && g.reembolsoA !== f.persona) return false;
    if (q && !normalize(`${g.concepto} ${g.categoria}`).includes(q)) return false;
    return true;
  });
}

/** Personas presentes en los datos (para el filtro). */
export function personasEnDatos(list) {
  const set = new Set(['Raziel', 'Ema', 'Santiago']);
  for (const g of list) {
    if (g.registradoPor) set.add(g.registradoPor);
    if (g.reembolsoA) set.add(g.reembolsoA);
  }
  return [...set];
}

export function sortGastos(list) {
  return [...list].sort((a, b) => {
    if (a.fecha !== b.fecha) return a.fecha < b.fecha ? 1 : -1;
    return (b.createdAt || 0) - (a.createdAt || 0);
  });
}

export { ESTADO_PENDIENTE, ESTADO_PAGADO };

function round2(n) {
  return Math.round(n * 100) / 100;
}
