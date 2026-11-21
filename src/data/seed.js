import { METODO_TARJETA, METODO_EFECTIVO, ESTADO_PENDIENTE, ESTADO_PAGADO } from '../lib/constants';
import { todayISO, addDaysISO, fmtDateNumeric, fmtMXN } from '../lib/format';

/**
 * Datos de prueba realistas. Las fechas son relativas a hoy para que
 * los filtros "Hoy / Esta semana / Este mes" siempre tengan algo que mostrar.
 */
export function buildSeedData() {
  const hoy = todayISO();
  const now = Date.now();
  const raw = [
    {
      fecha: hoy,
      empresa: 'LGHT',
      concepto: 'Tornillería pista LED',
      categoria: 'Materiales',
      monto: 1250,
      metodoPago: METODO_TARJETA,
      registradoPor: 'Raziel',
      comercio: 'FERRETERÍA EL TORNILLO',
    },
    {
      fecha: hoy,
      empresa: 'Nuvixa',
      concepto: 'Marcos madera 50x70',
      categoria: 'Materiales',
      monto: 2200,
      metodoPago: METODO_TARJETA,
      registradoPor: 'Ema',
      comercio: 'MADERERÍA SAN JOSÉ',
    },
    {
      fecha: addDaysISO(hoy, -1),
      empresa: 'LGHT',
      concepto: 'Gasolina camioneta – montaje evento',
      categoria: 'Transporte/Gasolina',
      monto: 850,
      metodoPago: METODO_EFECTIVO,
      registradoPor: 'Raziel',
      reembolsoA: 'Raziel',
      estadoReembolso: ESTADO_PENDIENTE,
      comercio: 'GASOLINERA SERVICIO 4521',
    },
    {
      fecha: addDaysISO(hoy, -2),
      empresa: 'Nuvixa',
      concepto: 'Vidrio antirreflejante 50x70',
      categoria: 'Proveedores',
      monto: 320,
      metodoPago: METODO_EFECTIVO,
      registradoPor: 'Raziel',
      reembolsoA: 'Raziel',
      estadoReembolso: ESTADO_PENDIENTE,
      sinTicket: true,
    },
    {
      fecha: addDaysISO(hoy, -4),
      empresa: 'Nuvixa',
      concepto: 'Pegamento y cinta doble cara',
      categoria: 'Materiales',
      monto: 185.5,
      metodoPago: METODO_EFECTIVO,
      registradoPor: 'Ema',
      reembolsoA: 'Ema',
      estadoReembolso: ESTADO_PENDIENTE,
      comercio: 'PAPELERÍA LA ESTRELLA',
    },
    {
      fecha: addDaysISO(hoy, -6),
      empresa: 'LGHT',
      concepto: 'Comida equipo de montaje',
      categoria: 'Comidas/Viáticos',
      monto: 640,
      metodoPago: METODO_EFECTIVO,
      registradoPor: 'Santiago',
      reembolsoA: 'Santiago',
      estadoReembolso: ESTADO_PAGADO,
      fechaPago: addDaysISO(hoy, -3),
      comercio: 'TAQUERÍA LOS COMPADRES',
    },
  ];

  return raw.map((r, i) => {
    const { comercio, sinTicket, ...g } = r;
    return {
      id: `demo-${i + 1}`,
      reembolsoA: null,
      estadoReembolso: null,
      fechaPago: null,
      ...g,
      ticketImagen: sinTicket ? null : makeDemoTicket({ comercio, concepto: g.concepto, monto: g.monto, fecha: g.fecha, metodo: g.metodoPago }),
      createdAt: now - i * 3600 * 1000,
      updatedAt: now - i * 3600 * 1000,
      demo: true,
    };
  });
}

/** Vales de salida de ejemplo: uno con material fuera y otro ya completo. */
export function buildSeedSalidas() {
  const hoy = todayISO();
  const now = Date.now();
  const item = (nombre, tipo, cantidad, extra = {}) => ({
    id: `demo-it-${Math.random().toString(36).slice(2, 9)}`,
    nombre,
    tipo,
    cantidad,
    devuelto: 0,
    consumido: false,
    nota: '',
    ...extra,
  });
  return [
    {
      id: 'demo-salida-2',
      folio: 2,
      empresa: 'LGHT',
      destino: 'Boda – Hacienda Los Arcos',
      responsable: 'Santiago',
      autorizo: 'Raziel',
      fechaSalida: addDaysISO(hoy, -1),
      regresoEstimado: addDaysISO(hoy, 1),
      notas: 'Montaje viernes 6 pm. Regresar todo el sábado temprano.',
      items: [
        item('Módulos pista LED 60x60', 'Herramienta', 24),
        item('Extensión eléctrica 20 m', 'Herramienta', 3),
        item('Taladro inalámbrico DeWalt', 'Herramienta', 1),
        item('Controlador DMX', 'Herramienta', 1),
        item('Tornillería (bolsa)', 'Material', 2),
        item('Cinta de aislar', 'Material', 4),
      ],
      cerrada: false,
      fechaCierre: null,
      fechaCompleta: null,
      createdAt: now - 26 * 3600 * 1000,
      updatedAt: now - 26 * 3600 * 1000,
      demo: true,
    },
    {
      id: 'demo-salida-1',
      folio: 1,
      empresa: 'Nuvixa',
      destino: 'Instalación de cuadros – Oficinas Grupo Alfa',
      responsable: 'Ema',
      autorizo: '',
      fechaSalida: addDaysISO(hoy, -5),
      regresoEstimado: addDaysISO(hoy, -4),
      notas: '',
      items: [
        item('Nivel láser', 'Herramienta', 1, { devuelto: 1 }),
        item('Taladro percutor', 'Herramienta', 1, { devuelto: 1 }),
        item('Escalera de tijera', 'Herramienta', 1, { devuelto: 1 }),
        item('Taquetes y pijas (kit)', 'Material', 1, { consumido: true }),
      ],
      cerrada: false,
      fechaCierre: null,
      fechaCompleta: addDaysISO(hoy, -4),
      createdAt: now - 5 * 24 * 3600 * 1000,
      updatedAt: now - 4 * 24 * 3600 * 1000,
      demo: true,
    },
  ];
}

/** Dibuja un ticket de ejemplo para poder probar miniaturas y visor. */
function makeDemoTicket({ comercio, concepto, monto, fecha, metodo }) {
  try {
    const W = 360;
    const H = 520;
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#E9E5DC';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(28, 16, W - 56, H - 32);
    ctx.fillStyle = '#1E293B';
    ctx.textAlign = 'center';
    ctx.font = 'bold 17px monospace';
    ctx.fillText(comercio || 'COMERCIO', W / 2, 58);
    ctx.font = '12px monospace';
    ctx.fillStyle = '#475569';
    ctx.fillText('RFC XAXX010101000', W / 2, 80);
    ctx.fillText(`FECHA ${fmtDateNumeric(fecha)}  12:4${Math.floor(Math.random() * 9)}`, W / 2, 98);
    dashed(ctx, 46, 116, W - 46);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#1E293B';
    ctx.font = '13px monospace';
    const words = String(concepto).toUpperCase().slice(0, 44);
    ctx.fillText(words.slice(0, 22), 46, 146);
    if (words.length > 22) ctx.fillText(words.slice(22), 46, 164);
    ctx.textAlign = 'right';
    ctx.fillText(fmtMXN(monto), W - 46, 146);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#64748B';
    ctx.fillText('1 PZA', 46, 188);
    dashed(ctx, 46, 214, W - 46);
    ctx.fillStyle = '#1E293B';
    ctx.font = 'bold 16px monospace';
    ctx.fillText('TOTAL', 46, 246);
    ctx.textAlign = 'right';
    ctx.fillText(fmtMXN(monto), W - 46, 246);
    ctx.font = '12px monospace';
    ctx.fillStyle = '#475569';
    ctx.textAlign = 'left';
    ctx.fillText(metodo === 'Efectivo' ? 'PAGO: EFECTIVO' : 'PAGO: TARJETA ****4821', 46, 276);
    dashed(ctx, 46, 300, W - 46);
    // código de barras
    let x = 70;
    ctx.fillStyle = '#1E293B';
    while (x < W - 70) {
      const w = 1 + Math.floor(Math.random() * 3);
      ctx.fillRect(x, 330, w, 54);
      x += w + 1 + Math.floor(Math.random() * 3);
    }
    ctx.textAlign = 'center';
    ctx.fillStyle = '#64748B';
    ctx.fillText('GRACIAS POR SU COMPRA', W / 2, 420);
    ctx.fillText('TICKET DE EJEMPLO', W / 2, 440);
    return c.toDataURL('image/jpeg', 0.7);
  } catch {
    return null;
  }
}

function dashed(ctx, x1, y, x2) {
  ctx.save();
  ctx.strokeStyle = '#94A3B8';
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);
  ctx.stroke();
  ctx.restore();
}
