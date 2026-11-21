import { useMemo, useState } from 'react';
import { FileDown, Wrench, ClipboardList, CircleCheck, Plus } from 'lucide-react';
import { Card, Segmented, EmptyState, EmpresaBadge, Button, cx } from '../components/ui';
import { SalidaEstadoPill, ProgressBar } from '../components/SalidaParts';
import { fmtDateShort } from '../lib/format';
import { fmtFolio, salidaStats, salidaEstado, salidaAbierta, resumenSalidas } from '../lib/salidas';

function Stat({ label, value, tone }) {
  return (
    <div className="px-4 py-3">
      <p className="text-xs text-muted">{label}</p>
      <p className={cx('mt-0.5 text-xl font-semibold tabular-nums', tone || 'text-ink')}>{value}</p>
    </div>
  );
}

function SalidaCard({ salida, onOpen, onPdf }) {
  const st = salidaStats(salida);
  const estado = salidaEstado(salida);
  return (
    <Card className="overflow-hidden">
      <button type="button" onClick={() => onOpen(salida)} className="block w-full px-4 pb-3 pt-3.5 text-left hover:bg-slate-50">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="text-xs font-semibold tabular-nums text-muted">{fmtFolio(salida.folio)}</span>
            <EmpresaBadge empresa={salida.empresa} />
          </div>
          <SalidaEstadoPill salida={salida} />
        </div>
        <p className="mt-1.5 truncate text-[15px] font-semibold text-ink">{salida.destino}</p>
        <p className="mt-0.5 truncate text-xs text-muted">
          {salida.responsable} · Salió {fmtDateShort(salida.fechaSalida)}
          {salida.regresoEstimado ? (
            <span className={estado === 'vencida' ? 'font-medium text-due' : undefined}>
              {' '}
              · Regresa {fmtDateShort(salida.regresoEstimado)}
            </span>
          ) : null}
        </p>
        <div className="mt-3">
          <ProgressBar value={st.avance} tone={st.pendientes ? (estado === 'abierta' ? 'ink' : 'due') : 'ok'} />
          <div className="mt-1.5 flex items-center justify-between text-xs">
            <span className="text-muted">
              {st.articulos} artículos · {st.piezas} piezas
            </span>
            <span className={cx('font-medium tabular-nums', st.pendientes ? 'text-ink' : 'text-ok')}>
              {st.pendientes ? `${st.pendientes} fuera` : 'Todo de regreso'}
            </span>
          </div>
        </div>
      </button>
      <div className="flex border-t border-line">
        <button
          type="button"
          onClick={() => onPdf(salida)}
          className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-ink hover:bg-slate-50"
        >
          <FileDown size={14} /> Descargar PDF
        </button>
        <button
          type="button"
          onClick={() => onOpen(salida)}
          className="flex flex-1 items-center justify-center gap-1.5 border-l border-line py-2.5 text-xs font-medium text-ink hover:bg-slate-50"
        >
          <CircleCheck size={14} /> Registrar regreso
        </button>
      </div>
    </Card>
  );
}

export function SalidasView({ salidas, onOpen, onNew, onPdf, onBlankPdf }) {
  const [filtro, setFiltro] = useState('abiertas');
  const resumen = useMemo(() => resumenSalidas(salidas), [salidas]);
  const visibles = useMemo(() => {
    if (filtro === 'abiertas') return salidas.filter(salidaAbierta);
    if (filtro === 'cerradas') return salidas.filter((s) => !salidaAbierta(s));
    return salidas;
  }, [salidas, filtro]);
  const [blankBusy, setBlankBusy] = useState(false);

  return (
    <div className="space-y-4">
      <Card className="grid grid-cols-3 divide-x divide-line overflow-hidden">
        <Stat label="Abiertas" value={resumen.abiertas} />
        <Stat label="Piezas fuera" value={resumen.piezasFuera} />
        <Stat label="Vencidas" value={resumen.vencidas} tone={resumen.vencidas ? 'text-due' : 'text-ink'} />
      </Card>

      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <Segmented
          size="sm"
          ariaLabel="Filtrar salidas"
          className="md:w-96"
          value={filtro}
          onChange={setFiltro}
          options={[
            { value: 'abiertas', label: `Fuera (${resumen.abiertas})` },
            { value: 'cerradas', label: 'Cerradas' },
            { value: 'todas', label: 'Todas' },
          ]}
        />
        <Button
          variant="secondary"
          loading={blankBusy}
          onClick={async () => {
            setBlankBusy(true);
            try {
              await onBlankPdf();
            } finally {
              setBlankBusy(false);
            }
          }}
        >
          {!blankBusy ? <ClipboardList size={15} /> : null} Formato en blanco (PDF)
        </Button>
      </div>

      {visibles.length === 0 ? (
        <Card>
          {salidas.length === 0 ? (
            <EmptyState
              icon={Wrench}
              title="Aún no hay salidas registradas"
              action={
                <Button variant="primary" onClick={onNew}>
                  <Plus size={16} /> Nueva salida
                </Button>
              }
            >
              Registra cada vez que saquen herramienta o material para saber qué tiene que regresar.
            </EmptyState>
          ) : filtro === 'abiertas' ? (
            <EmptyState icon={CircleCheck} title="Todo está de regreso">
              No hay material ni herramienta fuera en este momento.
            </EmptyState>
          ) : (
            <EmptyState icon={ClipboardList} title="No hay salidas en esta vista" />
          )}
        </Card>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {visibles.map((s) => (
            <SalidaCard key={s.id} salida={s} onOpen={onOpen} onPdf={onPdf} />
          ))}
        </div>
      )}
    </div>
  );
}
