import { useEffect, useState } from 'react';
import { Database, Cloud, RotateCcw, Trash2, Info } from 'lucide-react';
import { Sheet, Button } from './ui';
import { dataService } from '../services/dataService';

export function SettingsSheet({ open, onClose, count, countSalidas = 0, onResetDemo, onClearAll }) {
  const [info, setInfo] = useState(null);
  useEffect(() => {
    if (open) dataService.info().then(setInfo).catch(() => setInfo(null));
  }, [open, count, countSalidas]);

  const local = !info || info.name === 'local';
  const Icon = local ? Database : Cloud;

  return (
    <Sheet open={open} onClose={onClose} title="Datos y almacenamiento" size="sm">
      <div className="flex gap-3 rounded-xl border border-line p-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-ink">
          <Icon size={18} />
        </div>
        <div className="min-w-0 text-sm">
          <p className="font-semibold text-ink">{info ? info.label : 'Cargando…'}</p>
          <p className="mt-0.5 text-muted">
            {count} gastos · {countSalidas} vales de salida
            {info && info.usageKB !== null ? ` · ${info.usageKB.toLocaleString('es-MX')} KB usados` : ''}
          </p>
        </div>
      </div>

      {local ? (
        <div className="mt-3 flex gap-2.5 rounded-lg bg-lght-soft p-3 text-[13px] text-ink ring-1 ring-inset ring-lght/15">
          <Info size={16} className="mt-0.5 shrink-0 text-lght" />
          <p>
            En modo local los gastos viven solo en este navegador. Para que tu jefe y el equipo vean los mismos datos, conecta
            Firebase (archivo <code className="rounded bg-white px-1 text-xs">src/config/firebase.config.js</code>).
          </p>
        </div>
      ) : null}

      {info && info.canReset ? (
        <div className="mt-5 space-y-2">
          <p className="text-[13px] font-medium text-ink">Mantenimiento</p>
          <Button variant="secondary" className="w-full justify-start" onClick={onResetDemo}>
            <RotateCcw size={16} /> Restablecer datos de prueba
          </Button>
          <Button variant="secondary" className="w-full justify-start text-due" onClick={onClearAll}>
            <Trash2 size={16} /> Borrar todos los registros
          </Button>
          <p className="text-xs text-muted">Útil para empezar a usar Bitácora con datos reales después de probarla.</p>
        </div>
      ) : null}
    </Sheet>
  );
}
