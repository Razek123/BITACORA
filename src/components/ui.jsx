import { useEffect, useRef } from 'react';
import { X, Clock, CircleCheck, Paperclip, ImageOff, LoaderCircle } from 'lucide-react';
import { EMPRESA_INFO, ESTADO_PAGADO } from '../lib/constants';
import { fmtMXN } from '../lib/format';
import { useBodyScrollLock, useEscape } from '../lib/hooks';

export function cx(...parts) {
  return parts.filter(Boolean).join(' ');
}

export function Card({ className = '', children, ...rest }) {
  return (
    <div className={cx('rounded-xl border border-line bg-white shadow-card', className)} {...rest}>
      {children}
    </div>
  );
}

export function Money({ value, className = '' }) {
  return <span className={cx('tabular-nums', className)}>{fmtMXN(value)}</span>;
}

export function EmpresaBadge({ empresa, size = 'sm' }) {
  const info = EMPRESA_INFO[empresa];
  if (!info) return null;
  return (
    <span
      className={cx(
        'inline-flex shrink-0 items-center gap-1 rounded-md font-semibold tracking-wide ring-1 ring-inset',
        size === 'sm' ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-1 text-xs',
        info.badge,
      )}
    >
      {info.nombre}
    </span>
  );
}

export function EmpresaDot({ empresa, className = '' }) {
  const info = EMPRESA_INFO[empresa];
  return <span className={cx('inline-block size-2.5 shrink-0 rounded-[3px]', info ? info.dot : 'bg-muted', className)} />;
}

export function StatusPill({ estado, size = 'sm' }) {
  const pagado = estado === ESTADO_PAGADO;
  const Icon = pagado ? CircleCheck : Clock;
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full font-medium ring-1 ring-inset',
        size === 'sm' ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-1 text-xs',
        pagado ? 'bg-ok-soft text-ok ring-ok/20' : 'bg-due-soft text-due ring-due/20',
      )}
    >
      <Icon size={size === 'sm' ? 11 : 13} strokeWidth={2.25} />
      {pagado ? 'Pagado' : 'Pendiente'}
    </span>
  );
}

export function TicketBadge({ has, className = '' }) {
  return has ? (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full bg-ok-soft px-2 py-0.5 text-[11px] font-medium text-ok ring-1 ring-inset ring-ok/20',
        className,
      )}
    >
      <Paperclip size={11} strokeWidth={2.25} />
      Con ticket
    </span>
  ) : (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-muted ring-1 ring-inset ring-line',
        className,
      )}
    >
      <ImageOff size={11} strokeWidth={2.25} />
      Sin ticket
    </span>
  );
}

/**
 * Control segmentado.
 * options: [{ value, label, sub?, icon?, activeClass? }]
 */
export function Segmented({ options, value, onChange, size = 'md', className = '', ariaLabel }) {
  const sizes = {
    sm: 'h-8 text-xs',
    md: 'h-10 text-sm',
    lg: 'min-h-14 text-[15px]',
  };
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cx('grid gap-1 rounded-lg bg-slate-100 p-1', className)}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={cx(
              'flex min-w-0 items-center justify-center gap-1.5 rounded-md px-2 font-medium transition-colors',
              sizes[size],
              active
                ? opt.activeClass || 'bg-white text-ink shadow-card ring-1 ring-line'
                : 'text-muted hover:text-ink',
            )}
          >
            {Icon ? <Icon size={size === 'lg' ? 18 : 15} strokeWidth={2} className="shrink-0" /> : null}
            <span className="flex min-w-0 flex-col items-center leading-tight">
              <span className="truncate">{opt.label}</span>
              {opt.sub ? (
                <span className={cx('truncate text-[11px] font-normal', active && opt.activeClass ? 'opacity-85' : 'text-muted')}>
                  {opt.sub}
                </span>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function Chip({ active, onClick, children, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        'inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors',
        active ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink hover:border-slate-300',
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Button({ variant = 'secondary', size = 'md', className = '', children, loading, disabled, ...rest }) {
  const variants = {
    primary: 'bg-ink text-white hover:bg-slate-700 shadow-card',
    secondary: 'bg-white text-ink border border-line hover:bg-slate-50 shadow-card',
    ghost: 'text-muted hover:text-ink hover:bg-slate-100',
    danger: 'bg-due text-white hover:bg-red-800 shadow-card',
    success: 'bg-ok text-white hover:bg-green-800 shadow-card',
    dangerGhost: 'text-due hover:bg-due-soft',
  };
  const sizes = {
    sm: 'h-8 px-3 text-xs gap-1.5',
    md: 'h-10 px-4 text-sm gap-2',
    lg: 'h-12 px-5 text-[15px] gap-2',
    icon: 'size-9 justify-center',
  };
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={cx(
        'inline-flex items-center justify-center rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {loading ? <LoaderCircle size={16} className="animate-spin" /> : null}
      {children}
    </button>
  );
}

export function FieldLabel({ children, right, htmlFor }) {
  return (
    <div className="mb-1.5 flex items-center justify-between gap-2">
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-ink">
        {children}
      </label>
      {right}
    </div>
  );
}

export function FieldError({ children }) {
  if (!children) return null;
  return <p className="mt-1 text-xs font-medium text-due">{children}</p>;
}

export const inputClass =
  'block w-full rounded-lg border border-line bg-white px-3 text-[15px] text-ink placeholder:text-slate-400 shadow-card outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200';

/**
 * Hoja modal: bottom-sheet en celular, diálogo centrado en escritorio.
 */
export function Sheet({ open, onClose, title, subtitle, children, footer, size = 'md', z = 'z-40' }) {
  useBodyScrollLock(open);
  useEscape(open, onClose);
  const panelRef = useRef(null);
  useEffect(() => {
    if (open && panelRef.current) panelRef.current.scrollTop = 0;
  }, [open]);
  if (!open) return null;
  const widths = { sm: 'md:max-w-md', md: 'md:max-w-lg', lg: 'md:max-w-2xl' };
  return (
    <div className={cx('fixed inset-0 flex items-end justify-center md:items-center md:p-6', z)}>
      <button type="button" aria-label="Cerrar" className="absolute inset-0 bg-slate-900/40 animate-fade" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cx(
          'relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-sheet animate-sheet md:rounded-2xl',
          widths[size],
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 pb-3 pt-4">
          <div className="min-w-0">
            <div className="mx-auto -mt-1 mb-2 h-1 w-10 rounded-full bg-slate-200 md:hidden" />
            <h2 className="truncate text-base font-semibold text-ink">{title}</h2>
            {subtitle ? <p className="mt-0.5 text-[13px] text-muted">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="-mr-1.5 mt-1 inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-slate-100 hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>
        <div ref={panelRef} className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          {children}
        </div>
        {footer ? (
          <div className="border-t border-line bg-white px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      {Icon ? (
        <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-slate-100 text-muted">
          <Icon size={20} />
        </div>
      ) : null}
      <p className="text-sm font-semibold text-ink">{title}</p>
      {children ? <p className="mt-1 max-w-xs text-[13px] text-muted">{children}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function SectionTitle({ children, right, className = '' }) {
  return (
    <div className={cx('flex items-center justify-between gap-3', className)}>
      <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted">{children}</h2>
      {right}
    </div>
  );
}
