import { useState } from 'react';
import { FileDown, Pencil, Trash2, CircleCheck, Lock, LockOpen, Wrench, Package } from 'lucide-react';
import { Sheet, EmpresaBadge, Button, cx } from './ui';
import { SalidaEstadoPill, ItemEstadoPill, ProgressBar, Stepper } from './SalidaParts';
import { fmtDate } from '../lib/format';
import { fmtFolio, salidaStats, salidaEstado, TIPO_MATERIAL } from '../lib/salidas';

function Field({ label, children }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 truncate text-sm font-medium text-ink">{children}</dd>
    </div>
  );
}

export function SalidaDetail({ salida, onClose, onSave, onEdit, onDelete, onPdf, onCloseWithMissing }) {
  const [pdfBusy, setPdfBusy] = useState(false);
  const stats = salidaStats(salida);
  const estado = salidaEstado(salida);
  const cerrada = Boolean(salida.cerrada);

  const saveItems = (items, extra = {}) => onSave({ ...salida, items, ...extra });
  const setItem = (id, patch) => saveItems(salida.items.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  const todoRegreso = () =>
    saveItems(salida.items.map((it) => (it.consumido ? it : { ...it, devuelto: it.cantidad })));

  const pdf = async () => {
    setPdfBusy(true);
    try {
      await onPdf(salida);
    } finally {
      setPdfBusy(false);
    }
  };

  return (
    <Sheet
      open
      onClose={onClose}
      size="lg"
      title={`Vale de salida ${fmtFolio(salida.folio)}`}
      footer={
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="lg" onClick={pdf} loading={pdfBusy} className="px-4">
            {!pdfBusy ? <FileDown size={17} /> : null} PDF
          </Button>
          {stats.pendientes > 0 ? (
            <Button variant="success" size="lg" className="flex-1" onClick={todoRegreso}>
              <CircleCheck size={17} /> Todo regresó
            </Button>
          ) : (
            <div className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-ok-soft py-3 text-sm font-medium text-ok">
              <CircleCheck size={17} /> Completo
              {salida.fechaCompleta ? <span className="font-normal">· {fmtDate(salida.fechaCompleta)}</span> : null}
            </div>
          )}
        </div>
      }
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <EmpresaBadge empresa={salida.empresa} size="md" />
        <SalidaEstadoPill salida={salida} size="md" />
      </div>
      <h3 className="mt-2 text-lg font-semibold leading-snug text-ink">{salida.destino}</h3>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border border-line p-4">
        <Field label="Responsable">{salida.responsable}</Field>
        <Field label="Autorizó">{salida.autorizo || '—'}</Field>
        <Field label="Salió">{fmtDate(salida.fechaSalida)}</Field>
        <Field label="Regreso estimado">
          <span className={estado === 'vencida' ? 'text-due' : undefined}>
            {salida.regresoEstimado ? fmtDate(salida.regresoEstimado) : 'Sin fecha'}
          </span>
        </Field>
        {salida.notas ? (
          <div className="col-span-2">
            <dt className="text-xs text-muted">Notas</dt>
            <dd className="mt-0.5 text-sm text-ink">{salida.notas}</dd>
          </div>
        ) : null}
      </dl>

      {/* Avance */}
      <div className="mt-4">
        <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
          <span className="font-medium text-ink">
            {stats.resueltas} de {stats.piezas} piezas de regreso
          </span>
          <span className={cx('text-xs tabular-nums', stats.pendientes ? 'text-muted' : 'text-ok')}>
            {stats.pendientes ? `${stats.pendientes} siguen fuera` : 'Nada pendiente'}
          </span>
        </div>
        <ProgressBar value={stats.avance} tone={stats.pendientes ? (estado === 'abierta' ? 'ink' : 'due') : 'ok'} />
      </div>

      {/* Control de regreso */}
      <p className="mb-2 mt-5 text-[13px] font-medium text-ink">Registrar lo que regresa</p>
      <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
        {salida.items.map((it) => {
          const material = it.tipo === TIPO_MATERIAL;
          const TipoIcon = material ? Package : Wrench;
          return (
            <li key={it.id} className="px-3 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">{it.nombre}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                    <TipoIcon size={12} /> {material ? 'Material' : 'Herramienta / equipo'} · Salieron{' '}
                    <span className="font-semibold tabular-nums text-ink">{it.cantidad}</span>
                  </p>
                </div>
                <ItemEstadoPill item={it} cerrada={cerrada} />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted">Regresaron</span>
                <Stepper
                  size="sm"
                  value={Math.min(it.devuelto || 0, it.cantidad)}
                  min={0}
                  max={it.cantidad}
                  onChange={(devuelto) => setItem(it.id, { devuelto })}
                  label={`Regresaron de ${it.nombre}`}
                />
                <span className="text-xs tabular-nums text-muted">de {it.cantidad}</span>
                {(it.devuelto || 0) < it.cantidad ? (
                  <button
                    type="button"
                    onClick={() => setItem(it.id, { devuelto: it.cantidad, consumido: false })}
                    className="h-7 rounded-md px-2 text-xs font-medium text-ok hover:bg-ok-soft"
                  >
                    Todas
                  </button>
                ) : null}
                {material && (it.devuelto || 0) < it.cantidad ? (
                  <button
                    type="button"
                    aria-pressed={Boolean(it.consumido)}
                    onClick={() => setItem(it.id, { consumido: !it.consumido })}
                    className={cx(
                      'ml-auto inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-xs font-medium',
                      it.consumido ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink',
                    )}
                  >
                    <Package size={12} /> Se consumió
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-xs text-muted">
        Los cambios se guardan al instante. Marca “Se consumió” para material que se usó y no va a regresar.
      </p>

      <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
        <Button variant="secondary" size="sm" onClick={() => onEdit(salida)}>
          <Pencil size={14} /> Editar vale
        </Button>
        {stats.pendientes > 0 && !cerrada ? (
          <Button variant="secondary" size="sm" onClick={() => onCloseWithMissing(salida)}>
            <Lock size={14} /> Cerrar con faltantes
          </Button>
        ) : null}
        {cerrada ? (
          <Button variant="secondary" size="sm" onClick={() => onSave({ ...salida, cerrada: false, fechaCierre: null })}>
            <LockOpen size={14} /> Reabrir
          </Button>
        ) : null}
        <Button variant="dangerGhost" size="sm" className="ml-auto" onClick={() => onDelete(salida)}>
          <Trash2 size={14} /> Eliminar
        </Button>
      </div>
    </Sheet>
  );
}
