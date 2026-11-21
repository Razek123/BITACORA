import { useState } from 'react';
import { X, ZoomIn, ZoomOut } from 'lucide-react';
import { EmpresaBadge } from './ui';
import { fmtMXN, fmtDate } from '../lib/format';
import { useBodyScrollLock, useEscape } from '../lib/hooks';

/** Visor de ticket a pantalla completa. */
export function Lightbox({ gasto, onClose }) {
  const [zoom, setZoom] = useState(false);
  useBodyScrollLock(Boolean(gasto));
  useEscape(Boolean(gasto), onClose);
  if (!gasto || !gasto.ticketImagen) return null;
  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-slate-950/95 animate-fade" role="dialog" aria-modal="true" aria-label="Ticket">
      <div className="flex items-center gap-3 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-white">
        <EmpresaBadge empresa={gasto.empresa} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{gasto.concepto}</p>
          <p className="text-xs text-slate-400">
            <span className="tabular-nums">{fmtMXN(gasto.monto)}</span> · {fmtDate(gasto.fecha)} · {gasto.registradoPor}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setZoom((z) => !z)}
          className="inline-flex size-10 items-center justify-center rounded-lg text-slate-200 hover:bg-white/10"
          aria-label={zoom ? 'Ajustar a pantalla' : 'Acercar'}
        >
          {zoom ? <ZoomOut size={20} /> : <ZoomIn size={20} />}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex size-10 items-center justify-center rounded-lg text-slate-200 hover:bg-white/10"
          aria-label="Cerrar visor"
        >
          <X size={22} />
        </button>
      </div>
      <div
        className={zoom ? 'flex-1 overflow-auto' : 'flex flex-1 items-center justify-center overflow-hidden p-3'}
        onClick={(e) => {
          if (e.target === e.currentTarget && !zoom) onClose();
        }}
      >
        <img
          src={gasto.ticketImagen}
          alt={`Ticket de ${gasto.concepto}`}
          onClick={() => setZoom((z) => !z)}
          className={
            zoom
              ? 'mx-auto max-w-none cursor-zoom-out'
              : 'max-h-full max-w-full cursor-zoom-in rounded-md object-contain shadow-2xl'
          }
          style={zoom ? { width: 'min(200%, 1600px)' } : undefined}
        />
      </div>
      <p className="pb-[max(0.75rem,env(safe-area-inset-bottom))] text-center text-xs text-slate-400">
        Toca la imagen para {zoom ? 'ajustar' : 'acercar'} · Esc para cerrar
      </p>
    </div>
  );
}
