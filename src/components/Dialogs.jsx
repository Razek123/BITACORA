import { useState, useRef, useEffect } from 'react';
import { TriangleAlert, CircleCheck, Copy } from 'lucide-react';
import { Button, EmpresaBadge, inputClass, cx } from './ui';
import { fmtMXN, todayISO } from '../lib/format';
import { useEscape } from '../lib/hooks';
import { copyText } from '../lib/export';

function DialogShell({ onClose, children, label }) {
  useEscape(true, onClose);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="alertdialog" aria-modal="true" aria-label={label}>
      <button type="button" aria-label="Cerrar" className="absolute inset-0 bg-slate-900/50 animate-fade" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-sheet animate-pop">{children}</div>
    </div>
  );
}

/** Confirmación genérica (reemplaza window.confirm). */
export function ConfirmDialog({ title, message, confirmLabel = 'Confirmar', tone = 'danger', onConfirm, onCancel }) {
  const [busy, setBusy] = useState(false);
  return (
    <DialogShell onClose={onCancel} label={title}>
      <div className="flex gap-3">
        <div
          className={cx(
            'flex size-10 shrink-0 items-center justify-center rounded-full',
            tone === 'danger' ? 'bg-due-soft text-due' : 'bg-ok-soft text-ok',
          )}
        >
          {tone === 'danger' ? <TriangleAlert size={20} /> : <CircleCheck size={20} />}
        </div>
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-ink">{title}</h3>
          <div className="mt-1 text-sm text-muted">{message}</div>
        </div>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          variant={tone === 'danger' ? 'danger' : 'success'}
          loading={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onConfirm();
            } finally {
              setBusy(false);
            }
          }}
        >
          {confirmLabel}
        </Button>
      </div>
    </DialogShell>
  );
}

/** Confirmar reembolso con fecha de pago. */
export function MarkPaidDialog({ gasto, onConfirm, onCancel }) {
  const [fecha, setFecha] = useState(todayISO());
  const [busy, setBusy] = useState(false);
  return (
    <DialogShell onClose={onCancel} label="Marcar como pagado">
      <div className="flex gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ok-soft text-ok">
          <CircleCheck size={20} />
        </div>
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-ink">¿Confirmar reembolso?</h3>
          <p className="mt-1 text-sm text-muted">
            <EmpresaBadge empresa={gasto.empresa} /> le paga <strong className="tabular-nums text-ink">{fmtMXN(gasto.monto)}</strong> a{' '}
            <strong className="text-ink">{gasto.reembolsoA}</strong> por “{gasto.concepto}”.
          </p>
        </div>
      </div>
      <label className="mt-4 block text-[13px] font-medium text-ink" htmlFor="fechaPago">
        Fecha de pago
      </label>
      <input
        id="fechaPago"
        type="date"
        value={fecha}
        max={todayISO()}
        onChange={(e) => setFecha(e.target.value || todayISO())}
        className={cx(inputClass, 'mt-1.5 h-11')}
      />
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          variant="success"
          loading={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onConfirm(fecha);
            } finally {
              setBusy(false);
            }
          }}
        >
          Marcar pagado
        </Button>
      </div>
    </DialogShell>
  );
}

/** Respaldo cuando el navegador no permite copiar/descargar: texto seleccionable. */
export function TextFallbackDialog({ title, hint, text, onClose }) {
  const ref = useRef(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (ref.current) {
      ref.current.focus();
      ref.current.select();
    }
  }, []);
  return (
    <DialogShell onClose={onClose} label={title}>
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      <p className="mt-1 text-sm text-muted">{hint}</p>
      <textarea
        ref={ref}
        readOnly
        value={text}
        className="mt-3 h-56 w-full resize-none rounded-lg border border-line bg-slate-50 p-3 font-mono text-xs text-ink outline-none"
      />
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cerrar
        </Button>
        <Button
          variant="primary"
          onClick={async () => {
            const ok = await copyText(text);
            if (ok) setCopied(true);
            else if (ref.current) ref.current.select();
          }}
        >
          <Copy size={15} /> {copied ? 'Copiado' : 'Copiar'}
        </Button>
      </div>
    </DialogShell>
  );
}
