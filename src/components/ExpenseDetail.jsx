import { Pencil, Trash2, CircleCheck, Undo2, ImageOff, ZoomIn } from 'lucide-react';
import { Sheet, EmpresaBadge, StatusPill, TicketBadge, Button } from './ui';
import { MetodoTag } from './ExpenseRow';
import { METODO_EFECTIVO, ESTADO_PAGADO, EMPRESA_INFO } from '../lib/constants';
import { fmtMXN, fmtDate, fmtDateTime } from '../lib/format';

function Field({ label, children }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 truncate text-sm font-medium text-ink">{children}</dd>
    </div>
  );
}

export function ExpenseDetail({ gasto, onClose, onOpenTicket, onEdit, onDelete, onMarkPaid, onMarkPending }) {
  if (!gasto) return null;
  const efectivo = gasto.metodoPago === METODO_EFECTIVO;
  const pagado = gasto.estadoReembolso === ESTADO_PAGADO;

  const footer = (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="dangerGhost" onClick={() => onDelete(gasto)} className="px-3">
        <Trash2 size={16} /> Eliminar
      </Button>
      <div className="flex-1" />
      <Button variant="secondary" onClick={() => onEdit(gasto)}>
        <Pencil size={15} /> Editar
      </Button>
      {efectivo && !pagado ? (
        <Button variant="success" onClick={() => onMarkPaid(gasto)}>
          <CircleCheck size={16} /> Marcar pagado
        </Button>
      ) : null}
      {efectivo && pagado ? (
        <Button variant="secondary" onClick={() => onMarkPending(gasto)}>
          <Undo2 size={15} /> Volver a pendiente
        </Button>
      ) : null}
    </div>
  );

  return (
    <Sheet open onClose={onClose} title="Detalle del gasto" footer={footer}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <EmpresaBadge empresa={gasto.empresa} size="md" />
            <TicketBadge has={Boolean(gasto.ticketImagen)} />
            {efectivo ? <StatusPill estado={gasto.estadoReembolso} size="md" /> : null}
          </div>
          <h3 className="mt-2 text-lg font-semibold leading-snug text-ink">{gasto.concepto}</h3>
          <p className="text-sm text-muted">{gasto.categoria}</p>
        </div>
        <p className="shrink-0 text-xl font-semibold tabular-nums text-ink">{fmtMXN(gasto.monto)}</p>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border border-line p-4">
        <Field label="Fecha del ticket">{fmtDate(gasto.fecha)}</Field>
        <Field label="Método de pago">
          <MetodoTag metodo={gasto.metodoPago} />
        </Field>
        <Field label="Registrado por">{gasto.registradoPor}</Field>
        <Field label="Empresa">
          {gasto.empresa} · {EMPRESA_INFO[gasto.empresa] ? EMPRESA_INFO[gasto.empresa].giro : ''}
        </Field>
        {efectivo ? (
          <>
            <Field label="Reembolso a">{gasto.reembolsoA || '—'}</Field>
            <Field label={pagado ? 'Pagado el' : 'Estado'}>{pagado ? fmtDate(gasto.fechaPago) : 'Pendiente de reembolso'}</Field>
          </>
        ) : null}
        <Field label="Capturado">{fmtDateTime(gasto.createdAt)}</Field>
        {gasto.updatedAt && gasto.updatedAt !== gasto.createdAt ? (
          <Field label="Última modificación">{fmtDateTime(gasto.updatedAt)}</Field>
        ) : null}
      </dl>

      {efectivo && !pagado ? (
        <p className="mt-3 rounded-lg bg-due-soft px-3 py-2 text-[13px] text-due">
          <strong>{gasto.empresa}</strong> le debe <strong className="tabular-nums">{fmtMXN(gasto.monto)}</strong> a{' '}
          <strong>{gasto.reembolsoA}</strong> por este gasto.
        </p>
      ) : null}

      <div className="mt-4">
        <p className="mb-2 text-[13px] font-medium text-ink">Comprobante</p>
        {gasto.ticketImagen ? (
          <button
            type="button"
            onClick={() => onOpenTicket(gasto)}
            className="group relative block w-full overflow-hidden rounded-xl border border-line bg-slate-100"
          >
            <img src={gasto.ticketImagen} alt={`Ticket de ${gasto.concepto}`} className="max-h-72 w-full object-contain" />
            <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-md bg-white/95 px-2 py-1 text-xs font-medium text-ink shadow-card">
              <ZoomIn size={13} /> Ver completo
            </span>
          </button>
        ) : (
          <div className="flex items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-muted">
            <ImageOff size={18} />
            Este gasto no tiene respaldo fotográfico.
          </div>
        )}
      </div>
    </Sheet>
  );
}
