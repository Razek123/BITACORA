import { CreditCard, Banknote, ImageOff, Pencil, Trash2 } from 'lucide-react';
import { EmpresaBadge, StatusPill, cx } from './ui';
import { METODO_EFECTIVO, METODO_CORTO } from '../lib/constants';
import { fmtMXN, fmtDate } from '../lib/format';

export function TicketThumb({ gasto, onOpen, size = 'md' }) {
  const dims = size === 'lg' ? 'size-14' : 'size-12';
  if (!gasto.ticketImagen) {
    return (
      <div
        className={cx(
          dims,
          'flex shrink-0 flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-slate-400',
        )}
        title="Sin ticket"
      >
        <ImageOff size={16} />
        <span className="mt-0.5 text-[9px] font-medium leading-none">Sin ticket</span>
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onOpen(gasto);
      }}
      className={cx(dims, 'group relative shrink-0 overflow-hidden rounded-lg border border-line bg-slate-100')}
      aria-label={`Ver ticket de ${gasto.concepto}`}
    >
      <img src={gasto.ticketImagen} alt="" loading="lazy" className="size-full object-cover transition group-hover:scale-105" />
    </button>
  );
}

export function MetodoTag({ metodo }) {
  const Icon = metodo === METODO_EFECTIVO ? Banknote : CreditCard;
  return (
    <span className="inline-flex items-center gap-1">
      <Icon size={13} className="shrink-0" />
      {METODO_CORTO[metodo] || metodo}
    </span>
  );
}

export function ExpenseRow({ gasto, onOpen, onOpenTicket, onEdit, onDelete, showFecha = false }) {
  const efectivo = gasto.metodoPago === METODO_EFECTIVO;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(gasto)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onOpen(gasto);
      }}
      className="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
    >
      <TicketThumb gasto={gasto} onOpen={onOpenTicket} />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <EmpresaBadge empresa={gasto.empresa} />
          <span className="truncate text-xs text-muted">{gasto.categoria}</span>
        </div>
        <p className="mt-0.5 truncate text-[15px] font-medium text-ink">{gasto.concepto}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted">
          <MetodoTag metodo={gasto.metodoPago} />
          <span aria-hidden>·</span>
          <span>{gasto.registradoPor}</span>
          {efectivo && gasto.reembolsoA ? (
            <>
              <span aria-hidden>·</span>
              <span className="truncate">Reembolso a {gasto.reembolsoA}</span>
            </>
          ) : null}
          {showFecha ? (
            <>
              <span aria-hidden>·</span>
              <span>{fmtDate(gasto.fecha)}</span>
            </>
          ) : null}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="text-[15px] font-semibold tabular-nums text-ink">{fmtMXN(gasto.monto)}</span>
        {efectivo ? <StatusPill estado={gasto.estadoReembolso} /> : null}
      </div>
      {onEdit || onDelete ? (
        <div className="hidden shrink-0 items-center gap-0.5 md:flex">
          {onEdit ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(gasto);
              }}
              className="inline-flex size-8 items-center justify-center rounded-lg text-muted hover:bg-slate-100 hover:text-ink"
              aria-label="Editar"
              title="Editar"
            >
              <Pencil size={15} />
            </button>
          ) : null}
          {onDelete ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(gasto);
              }}
              className="inline-flex size-8 items-center justify-center rounded-lg text-muted hover:bg-due-soft hover:text-due"
              aria-label="Eliminar"
              title="Eliminar"
            >
              <Trash2 size={15} />
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
