/**
 * PDF imprimible del vale de salida (tamaño carta).
 * También genera el formato en blanco para llenar a mano.
 */
import { loadPdfLib } from './pdfEngine';
import { EMPRESAS, EMPRESA_INFO } from './constants';
import { fmtDate, fmtDateTime } from './format';
import { fmtFolio, salidaStats, itemEstado, TIPO_MATERIAL } from './salidas';

const PAGE_W = 612; // carta: 8.5 x 11 in
const PAGE_H = 792;
const M = 40;
const CONTENT_W = PAGE_W - M * 2;

const COLS = [
  { key: 'n', label: '#', w: 22, align: 'center' },
  { key: 'cant', label: 'Cant.', w: 38, align: 'center' },
  { key: 'tipo', label: 'Tipo', w: 78 },
  { key: 'desc', label: 'Descripción', w: 214 },
  { key: 'regreso', label: 'Regresó', w: 82 },
  { key: 'obs', label: 'Observaciones', w: 98 },
];

const LOGO_LEFT = [
  'M0 5.4H5.4V59.5H40.2C43.8 59.5 46.6 61.6 47.6 64.6H0Z',
  'M8.1 0H40.7C45.1 0 48.7 3.6 48.7 8V60.7C46.9 58.1 44 56.4 40.7 56.4H8.1Z',
];
const LOGO_RIGHT = [
  'M100 5.4H94.6V59.5H59.8C56.2 59.5 53.4 61.6 52.4 64.6H100Z',
  'M91.9 0H59.3C54.9 0 51.3 3.6 51.3 8V60.7C53.1 58.1 56 56.4 59.3 56.4H91.9Z',
];
const LOGO_LINES = [
  [15, 10.5, 17.4],
  [15, 18.6, 27],
  [15, 26.6, 27],
  [15, 34.8, 27],
  [15, 42.9, 17.4],
];

/**
 * @param {object|null} salida  null = formato en blanco
 * @returns {Promise<{ bytes: Uint8Array, filename: string }>}
 */
export async function buildSalidaPdf(salida) {
  const { PDFDocument, StandardFonts, rgb } = await loadPdfLib();
  const blank = !salida;
  const s = salida || { items: [] };

  const pdf = await PDFDocument.create();
  pdf.setTitle(blank ? 'Formato de salida de material y herramienta' : `Vale de salida ${fmtFolio(s.folio)}`);
  pdf.setAuthor('Bitácora · LGHT & Nuvixa');
  pdf.setCreator('Bitácora');
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const hex = (h) => {
    const n = parseInt(h.slice(1), 16);
    return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
  };
  const C = {
    ink: hex('#1E293B'),
    muted: hex('#64748B'),
    line: hex('#CBD5E1'),
    soft: hex('#F1F5F9'),
    ok: hex('#15803D'),
    due: hex('#B91C1C'),
    white: rgb(1, 1, 1),
  };

  /* ── texto seguro (WinAnsi) ── */
  const okChars = new Map();
  const clean = (str) => {
    let out = '';
    for (const ch of String(str ?? '')) {
      if (ch === '\n' || ch === '\r' || ch === '\t') {
        out += ' ';
        continue;
      }
      let ok = okChars.get(ch);
      if (ok === undefined) {
        try {
          font.widthOfTextAtSize(ch, 10);
          ok = true;
        } catch {
          ok = false;
        }
        okChars.set(ch, ok);
      }
      out += ok ? ch : '?';
    }
    return out;
  };
  const fit = (str, size, maxW, f = font) => {
    let t = clean(str);
    if (f.widthOfTextAtSize(t, size) <= maxW) return t;
    while (t.length > 1 && f.widthOfTextAtSize(`${t}…`, size) > maxW) t = t.slice(0, -1);
    return `${t.trimEnd()}…`;
  };
  const wrap = (str, size, maxW, maxLines = 2, f = font) => {
    const words = clean(str).split(/\s+/).filter(Boolean);
    const lines = [];
    let cur = '';
    for (const w of words) {
      const next = cur ? `${cur} ${w}` : w;
      if (f.widthOfTextAtSize(next, size) <= maxW) cur = next;
      else {
        if (cur) lines.push(cur);
        cur = w;
      }
    }
    if (cur) lines.push(cur);
    if (lines.length > maxLines) {
      const kept = lines.slice(0, maxLines);
      kept[maxLines - 1] = fit(lines.slice(maxLines - 1).join(' '), size, maxW, f);
      return kept;
    }
    return lines.length ? lines : [''];
  };

  /* ── páginas ── */
  let page;
  let t; // cursor desde arriba
  const Y = (top) => PAGE_H - top;
  const text = (str, x, top, { size = 9, f = font, color = C.ink, align = 'left', maxW } = {}) => {
    const s2 = maxW ? fit(str, size, maxW, f) : clean(str);
    let xx = x;
    if (align === 'right') xx = x - f.widthOfTextAtSize(s2, size);
    if (align === 'center') xx = x - f.widthOfTextAtSize(s2, size) / 2;
    page.drawText(s2, { x: xx, y: Y(top), size, font: f, color });
  };
  const rect = (x, top, w, h, { fill, border = C.line, bw = 0.75 } = {}) =>
    page.drawRectangle({
      x,
      y: Y(top + h),
      width: w,
      height: h,
      color: fill,
      borderColor: border || undefined,
      borderWidth: border ? bw : 0,
    });
  const hline = (x1, x2, top, { color = C.line, th = 0.75 } = {}) =>
    page.drawLine({ start: { x: x1, y: Y(top) }, end: { x: x2, y: Y(top) }, thickness: th, color });
  const checkbox = (x, top, size = 8) => rect(x, top, size, size, { border: C.ink, bw: 0.8 });

  const folio = blank ? '__________' : fmtFolio(s.folio);
  const pages = [];

  function newPage(first) {
    page = pdf.addPage([PAGE_W, PAGE_H]);
    pages.push(page);
    if (first) {
      drawHeader();
    } else {
      t = M;
      text('Bitácora · Vale de salida', M, t + 8, { size: 9, f: bold });
      text(`Folio ${folio} (continuación)`, PAGE_W - M, t + 8, { size: 9, f: bold, align: 'right' });
      hline(M, PAGE_W - M, t + 16, { color: C.ink, th: 1 });
      t += 28;
      drawTableHeader();
    }
  }

  function drawLogo(x, top, scale) {
    const blue = hex(EMPRESA_INFO.LGHT.color);
    const orange = hex(EMPRESA_INFO[EMPRESAS[1]].color);
    for (const d of LOGO_LEFT) page.drawSvgPath(d, { x, y: Y(top), scale, color: blue });
    for (const d of LOGO_RIGHT) page.drawSvgPath(d, { x, y: Y(top), scale, color: orange });
    const bars = LOGO_LINES.flatMap(([lx, ly, lw]) => [
      `M${lx} ${ly}h${lw}v2.5h${-lw}Z`,
      `M${100 - lx - lw} ${ly}h${lw}v2.5h${-lw}Z`,
    ]).join(' ');
    page.drawSvgPath(bars, { x, y: Y(top), scale, color: C.white });
  }

  function drawHeader() {
    t = M;
    drawLogo(M, t, 0.44);
    text('Bitácora', M + 52, t + 15, { size: 17, f: bold });
    text('Control de Gastos: LGHT & Nuvixa', M + 52, t + 27, { size: 8.5, color: C.muted });

    text('VALE DE SALIDA', PAGE_W - M, t + 12, { size: 13, f: bold, align: 'right' });
    text('Material y herramienta', PAGE_W - M, t + 24, { size: 8.5, color: C.muted, align: 'right' });
    rect(PAGE_W - M - 132, t + 31, 132, 22, { border: C.ink, bw: 1 });
    text('FOLIO', PAGE_W - M - 126, t + 45, { size: 7, color: C.muted });
    text(folio, PAGE_W - M - 7, t + 46.5, { size: 12, f: bold, align: 'right' });
    t += 62;
    hline(M, PAGE_W - M, t, { color: C.ink, th: 1.2 });
    t += 10;

    // Empresa
    const info = EMPRESA_INFO[s.empresa];
    if (blank || !info) {
      rect(M, t, CONTENT_W, 26, {});
      text('EMPRESA', M + 8, t + 16.5, { size: 7.5, color: C.muted });
      let x = M + 70;
      for (const e of EMPRESAS) {
        checkbox(x, t + 9, 9);
        text(`${e} · ${EMPRESA_INFO[e].giro}`, x + 14, t + 16.5, { size: 9.5, f: bold });
        x += 170;
      }
    } else {
      const col = hex(info.color);
      rect(M, t, CONTENT_W, 26, { fill: hex(info.soft), border: col, bw: 1 });
      rect(M, t, 5, 26, { fill: col, border: null });
      text('EMPRESA', M + 14, t + 16.5, { size: 7.5, color: C.muted });
      text(`${info.nombre} · ${info.giro}`, M + 70, t + 17, { size: 11, f: bold, color: col });
      const e = estadoTexto();
      if (e) text(e.label, PAGE_W - M - 10, t + 16.5, { size: 8.5, f: bold, color: e.color, align: 'right' });
    }
    t += 34;

    // Datos generales
    const half = CONTENT_W / 2;
    const cell = (label, value, x, w, h = 32) => {
      rect(x, t, w, h, {});
      text(label.toUpperCase(), x + 8, t + 11, { size: 7, color: C.muted });
      if (value) text(value, x + 8, t + 24, { size: 10, maxW: w - 16 });
    };
    cell('Destino / evento / obra', blank ? '' : s.destino, M, CONTENT_W);
    t += 32;
    cell('Responsable (se lleva el material)', blank ? '' : s.responsable, M, half);
    cell('Autorizó', blank ? '' : s.autorizo || '', M + half, half);
    t += 32;
    cell('Fecha de salida', blank ? '' : fmtDate(s.fechaSalida), M, half);
    cell(
      'Regreso estimado',
      blank ? '' : s.regresoEstimado ? fmtDate(s.regresoEstimado) : 'Sin fecha',
      M + half,
      half,
    );
    t += 32 + 14;
    drawTableHeader();
  }

  function estadoTexto() {
    if (blank) return null;
    const st = salidaStats(s);
    if (st.pendientes === 0) {
      return { label: s.fechaCompleta ? `TODO REGRESÓ · ${fmtDate(s.fechaCompleta)}` : 'TODO REGRESÓ', color: C.ok };
    }
    if (s.cerrada) return { label: `CERRADA CON FALTANTES (${st.pendientes} pzas)`, color: C.due };
    return { label: `PENDIENTE DE REGRESO · ${st.pendientes} pzas fuera`, color: C.ink };
  }

  function drawTableHeader() {
    let x = M;
    rect(M, t, CONTENT_W, 20, { fill: C.soft });
    for (const c of COLS) {
      const tx = c.align === 'center' ? x + c.w / 2 : x + 6;
      text(c.label, tx, t + 13.5, { size: 8, f: bold, align: c.align === 'center' ? 'center' : 'left' });
      if (x > M) page.drawLine({ start: { x, y: Y(t) }, end: { x, y: Y(t + 20) }, thickness: 0.75, color: C.line });
      x += c.w;
    }
    t += 20;
  }

  const FOOTER_RESERVE = 44;
  const CLOSING_BLOCK = 178; // totales + notas + firmas

  function drawRow(idx, it) {
    const descLines = it ? wrap(it.nombre, 9, COLS[3].w - 12, 2) : [''];
    const obsLines = it && it.nota ? wrap(it.nota, 8, COLS[5].w - 12, 2) : [''];
    const h = Math.max(22, 10 + Math.max(descLines.length, obsLines.length) * 11);
    if (t + h > PAGE_H - FOOTER_RESERVE) newPage(false);

    rect(M, t, CONTENT_W, h, {});
    let x = M;
    const mid = t + h / 2 + 3;
    COLS.forEach((c, i) => {
      if (i > 0) page.drawLine({ start: { x, y: Y(t) }, end: { x, y: Y(t + h) }, thickness: 0.75, color: C.line });
      if (it) {
        if (c.key === 'n') text(String(idx), x + c.w / 2, mid, { size: 8.5, color: C.muted, align: 'center' });
        if (c.key === 'cant') text(String(it.cantidad), x + c.w / 2, mid, { size: 9.5, f: bold, align: 'center' });
        if (c.key === 'tipo') text(it.tipo === TIPO_MATERIAL ? 'Material' : 'Herramienta', x + 6, mid, { size: 8.5 });
        if (c.key === 'desc') {
          const startTop = t + h / 2 - ((descLines.length - 1) * 11) / 2 + 3;
          descLines.forEach((ln, k) => text(ln, x + 6, startTop + k * 11, { size: 9 }));
        }
        if (c.key === 'regreso') drawRegreso(it, x, mid);
        if (c.key === 'obs' && it.nota) {
          const startTop = t + h / 2 - ((obsLines.length - 1) * 11) / 2 + 3;
          obsLines.forEach((ln, k) => text(ln, x + 6, startTop + k * 11, { size: 8, color: C.muted }));
        }
      } else if (c.key === 'regreso') {
        checkbox(x + 6, t + h / 2 - 4);
      }
      x += c.w;
    });
    t += h;
  }

  function drawRegreso(it, x, mid) {
    const estado = itemEstado(it, Boolean(s.cerrada));
    const dev = Math.min(Number(it.devuelto) || 0, it.cantidad);
    if (estado === 'fuera') {
      checkbox(x + 6, mid - 7);
      text(`____ / ${it.cantidad}`, x + 19, mid, { size: 8.5, color: C.muted });
    } else if (estado === 'regreso') {
      text(`Sí (${it.cantidad})`, x + 6, mid, { size: 9, f: bold, color: C.ok });
    } else if (estado === 'parcial') {
      text(`${dev} de ${it.cantidad}`, x + 6, mid, { size: 9, f: bold });
    } else if (estado === 'consumido') {
      text(dev > 0 ? `${dev} + consumido` : 'Consumido', x + 6, mid, { size: 8.5, color: C.muted, maxW: COLS[4].w - 10 });
    } else if (estado === 'faltante') {
      text(`Faltan ${it.cantidad - dev}`, x + 6, mid, { size: 9, f: bold, color: C.due });
    }
  }

  function drawClosing() {
    if (t + CLOSING_BLOCK > PAGE_H - FOOTER_RESERVE) newPage(false);
    t += 14;
    if (!blank) {
      const st = salidaStats(s);
      text(
        `Total: ${st.articulos} artículo${st.articulos === 1 ? '' : 's'} · ${st.piezas} pieza${st.piezas === 1 ? '' : 's'}  (${st.herramientas} herramienta/equipo, ${st.materiales} material)`,
        M,
        t,
        { size: 9, f: bold },
      );
      if (st.devueltas || st.consumidas) {
        text(
          `Regresaron ${st.devueltas} · Consumidas ${st.consumidas} · Pendientes ${st.pendientes}`,
          PAGE_W - M,
          t,
          { size: 8.5, color: st.pendientes ? C.ink : C.ok, align: 'right' },
        );
      }
    } else {
      text('Total de piezas: ________', M, t, { size: 9, f: bold });
    }
    t += 10;

    // Notas
    rect(M, t, CONTENT_W, 44, {});
    text('NOTAS / OBSERVACIONES', M + 8, t + 11, { size: 7, color: C.muted });
    if (!blank && s.notas) wrap(s.notas, 9, CONTENT_W - 16, 2).forEach((ln, k) => text(ln, M + 8, t + 24 + k * 11, { size: 9 }));
    t += 44 + 44;

    // Firmas
    const gap = 22;
    const w = (CONTENT_W - gap * 2) / 3;
    const firmas = [
      { label: 'ENTREGA (ALMACÉN)', nombre: blank ? '' : s.autorizo || '' },
      { label: 'RECIBE (RESPONSABLE)', nombre: blank ? '' : s.responsable },
      { label: 'REGRESO VERIFICADO POR', nombre: '' },
    ];
    firmas.forEach((f, i) => {
      const x = M + i * (w + gap);
      if (f.nombre) text(f.nombre, x + w / 2, t - 6, { size: 9, align: 'center', color: C.muted });
      hline(x, x + w, t, { color: C.ink, th: 0.8 });
      text(f.label, x + w / 2, t + 11, { size: 7.5, f: bold, align: 'center' });
      text('Nombre y firma', x + w / 2, t + 21, { size: 7, color: C.muted, align: 'center' });
      text('Fecha: ____ / ____ / ______', x + w / 2, t + 34, { size: 7.5, color: C.muted, align: 'center' });
    });
    t += 40;
  }

  /* ── construir ── */
  newPage(true);
  const items = s.items || [];
  items.forEach((it, i) => drawRow(i + 1, it));
  // Renglones vacíos para anotar a mano
  const minRows = blank ? 30 : Math.max(items.length + 3, 10);
  for (let i = items.length; i < minRows; i += 1) {
    // Solo los renglones que caben sin mandar las firmas a otra hoja
    if (t + 22 + CLOSING_BLOCK > PAGE_H - FOOTER_RESERVE) break;
    drawRow(i + 1, null);
  }
  drawClosing();

  // Pie de página
  const stamp = fmtDateTime(Date.now());
  pages.forEach((p, i) => {
    page = p;
    hline(M, PAGE_W - M, PAGE_H - 34, { color: C.line });
    text(`Bitácora · Control de Gastos LGHT & Nuvixa · Generado ${stamp}`, M, PAGE_H - 22, { size: 7, color: C.muted });
    text(`Página ${i + 1} de ${pages.length}`, PAGE_W - M, PAGE_H - 22, { size: 7, color: C.muted, align: 'right' });
  });

  const bytes = await pdf.save();
  const filename = blank
    ? 'Formato-salida-en-blanco.pdf'
    : `Vale-salida-${fmtFolio(s.folio)}-${s.empresa}.pdf`;
  return { bytes, filename };
}
