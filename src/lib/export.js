import { METODO_CORTO, EMPRESAS } from './constants';
import { fmtMXN, fmtDateNumeric, fmtDateTime } from './format';
import { summarize, groupByPersona, isPendiente } from './selectors';

/* ───────────────────────── CSV (compatible con Excel) ───────────────────────── */

const CSV_HEADERS = [
  'Fecha',
  'Empresa',
  'Concepto',
  'Categoría',
  'Monto (MXN)',
  'Método de pago',
  'Registrado por',
  'Reembolso a',
  'Estado reembolso',
  'Fecha de pago',
  'Ticket',
];

const csvCell = (value) => {
  const s = value === null || value === undefined ? '' : String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function buildCSV(list) {
  const rows = list.map((g) => [
    fmtDateNumeric(g.fecha),
    g.empresa,
    g.concepto,
    g.categoria,
    (Number(g.monto) || 0).toFixed(2),
    g.metodoPago,
    g.registradoPor,
    g.metodoPago === 'Efectivo' ? g.reembolsoA || '' : '',
    g.metodoPago === 'Efectivo' ? g.estadoReembolso || 'Pendiente' : 'N/A',
    g.fechaPago ? fmtDateNumeric(g.fechaPago) : '',
    g.ticketImagen ? 'Sí' : 'No',
  ]);
  const total = list.reduce((acc, g) => acc + (Number(g.monto) || 0), 0);
  rows.push([]);
  rows.push(['', '', 'TOTAL', '', total.toFixed(2)]);
  // BOM para que Excel respete acentos (UTF-8)
  return '﻿' + [CSV_HEADERS, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
}

/* ───────────────────────── Texto para WhatsApp ───────────────────────── */

export function buildWhatsAppSummary(list, { periodo = 'Todo el historial', filtros = '' } = {}) {
  const s = summarize(list);
  const lines = [];
  lines.push('*BITÁCORA · Control de Gastos LGHT & Nuvixa*');
  lines.push(`Periodo: ${periodo}`);
  if (filtros) lines.push(`Filtros: ${filtros}`);
  lines.push(`Registros: ${s.count}`);
  lines.push('');

  for (const emp of EMPRESAS) {
    const e = s.porEmpresa[emp];
    lines.push(`*${emp}:* ${fmtMXN(e.total)}`);
    lines.push(`   • Tarjeta: ${fmtMXN(e.tarjeta)}`);
    lines.push(`   • Efectivo: ${fmtMXN(e.efectivo)}`);
  }
  lines.push(`*TOTAL COMBINADO:* ${fmtMXN(s.total)}`);
  lines.push('');

  lines.push('*Reembolsos pendientes (efectivo)*');
  const personas = groupByPersona(list.filter(isPendiente));
  if (personas.length === 0) {
    lines.push('   Sin reembolsos pendientes ✅');
  } else {
    for (const p of personas) {
      const partes = EMPRESAS.filter((emp) => p[emp] > 0).map((emp) => `${emp} ${fmtMXN(p[emp])}`);
      lines.push(`   • A ${p.persona}: ${partes.join(' / ')}`);
    }
    lines.push(`LGHT debe ${fmtMXN(s.pendiente.LGHT)} | Nuvixa debe ${fmtMXN(s.pendiente.Nuvixa)}`);
  }

  const sinTicket = s.count - s.conTicket;
  if (sinTicket > 0) {
    lines.push('');
    lines.push(`⚠️ ${sinTicket} gasto(s) sin ticket fotográfico`);
  }
  lines.push('');
  lines.push(`_Generado ${fmtDateTime(Date.now())}_`);
  return lines.join('\n');
}

export function describeFilters(f) {
  const parts = [];
  if (f.empresa !== 'todas') parts.push(f.empresa);
  if (f.metodo !== 'todos') parts.push(f.metodo === 'tarjeta' ? METODO_CORTO['Tarjeta de Crédito'] : 'Efectivo');
  if (f.persona !== 'todas') parts.push(f.persona);
  if (f.q.trim()) parts.push(`"${f.q.trim()}"`);
  return parts.join(' · ');
}

/* ───────────────────────── Utilidades de salida ───────────────────────── */

/**
 * Guarda un archivo. Devuelve:
 *  'saved'       → descargado
 *  'declined'    → el usuario canceló
 *  'unavailable' → este entorno no permite descargas (usar copia como respaldo)
 */
export async function saveFile(filename, content, mime = 'text/plain') {
  const host = typeof window !== 'undefined' ? window.claude : null;
  if (host && typeof host.use === 'function') {
    // Vista previa alojada: las descargas pasan por la capacidad "downloads".
    try {
      const downloads = await host.use('downloads');
      if (!downloads) return 'unavailable';
      await downloads.save({ filename, data: content });
      return 'saved';
    } catch (err) {
      if (err && err.code === 'declined') return 'declined';
      return 'unavailable';
    }
  }
  try {
    const blob = new Blob([content], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return 'saved';
  } catch {
    return 'unavailable';
  }
}

/** Copia texto al portapapeles. Debe llamarse desde un click. */
export async function copyText(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* intenta el método clásico */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}
