import { Minus, Plus, CircleCheck, Clock, CircleAlert, PackageCheck } from 'lucide-react';
import { cx } from './ui';
import { salidaEstado, ESTADOS_SALIDA, itemEstado, itemEstadoLabel } from '../lib/salidas';

const TONES = {
  ok: 'bg-ok-soft text-ok ring-ok/20',
  due: 'bg-due-soft text-due ring-due/20',
  neutral: 'bg-slate-100 text-ink ring-slate-300/60',
  muted: 'bg-slate-50 text-muted ring-line',
};

export function SalidaEstadoPill({ salida, size = 'sm' }) {
  const estado = salidaEstado(salida);
  const meta = ESTADOS_SALIDA[estado];
  const Icon = estado === 'completa' ? CircleCheck : estado === 'abierta' ? Clock : CircleAlert;
  return (
    <span
      className={cx(
        'inline-flex shrink-0 items-center gap-1 rounded-full font-medium ring-1 ring-inset',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
        TONES[meta.tone],
      )}
    >
      <Icon size={size === 'sm' ? 11 : 13} strokeWidth={2.25} />
      {meta.label}
    </span>
  );
}

export function ItemEstadoPill({ item, cerrada }) {
  const estado = itemEstado(item, cerrada);
  const tone = { regreso: 'ok', faltante: 'due', consumido: 'muted', parcial: 'neutral', fuera: 'neutral' }[estado];
  const Icon = estado === 'regreso' ? CircleCheck : estado === 'consumido' ? PackageCheck : estado === 'faltante' ? CircleAlert : Clock;
  return (
    <span
      className={cx(
        'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset',
        TONES[tone],
      )}
    >
      <Icon size={11} strokeWidth={2.25} />
      {itemEstadoLabel(item, cerrada)}
    </span>
  );
}

export function ProgressBar({ value, tone = 'ink' }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        className={cx('h-full rounded-full transition-all', tone === 'ok' ? 'bg-ok' : tone === 'due' ? 'bg-due' : 'bg-ink')}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/** Selector numérico − n + con botones grandes para el dedo. */
export function Stepper({ value, min = 0, max = 9999, onChange, label, size = 'md' }) {
  const btn = cx(
    'inline-flex items-center justify-center rounded-md text-ink transition-colors hover:bg-white disabled:opacity-30',
    size === 'sm' ? 'size-7' : 'size-8',
  );
  return (
    <div className="inline-flex items-center gap-0.5 rounded-lg bg-slate-100 p-0.5" role="group" aria-label={label}>
      <button type="button" className={btn} onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label="Menos">
        <Minus size={15} strokeWidth={2.25} />
      </button>
      <input
        inputMode="numeric"
        value={value}
        onChange={(e) => {
          const n = parseInt(e.target.value.replace(/\D/g, ''), 10);
          onChange(Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : min);
        }}
        onFocus={(e) => e.target.select()}
        className={cx(
          'bg-transparent text-center font-semibold tabular-nums text-ink outline-none',
          size === 'sm' ? 'w-8 text-sm' : 'w-10 text-[15px]',
        )}
        aria-label={label}
      />
      <button type="button" className={btn} onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label="Más">
        <Plus size={15} strokeWidth={2.25} />
      </button>
    </div>
  );
}
