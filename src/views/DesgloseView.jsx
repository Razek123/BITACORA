import { useMemo } from 'react';
import { Search, X, Download, MessageCircle, SearchX, Inbox } from 'lucide-react';
import { Card, Segmented, EmptyState, EmpresaDot, Button, inputClass, cx } from '../components/ui';
import { ExpenseRow } from '../components/ExpenseRow';
import { EMPRESAS, PERIODOS } from '../lib/constants';
import { fmtMXN, fmtDayHeader, relativeDayLabel } from '../lib/format';
import {
  applyFilters,
  groupByDay,
  summarize,
  hasActiveFilters,
  personasEnDatos,
  DEFAULT_FILTERS,
} from '../lib/selectors';

const selectClass = cx(inputClass, 'h-10 appearance-none pr-8 text-sm');

function SelectField({ label, value, onChange, children }) {
  return (
    <label className="relative block min-w-0">
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={selectClass}>
        {children}
      </select>
      <svg
        className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </label>
  );
}

export function DesgloseView({
  gastos,
  filters,
  setFilters,
  onOpen,
  onOpenTicket,
  onEdit,
  onDelete,
  onExportCSV,
  onCopyWhatsApp,
}) {
  const filtrados = useMemo(() => applyFilters(gastos, filters), [gastos, filters]);
  const dias = useMemo(() => groupByDay(filtrados), [filtrados]);
  const s = useMemo(() => summarize(filtrados), [filtrados]);
  const personas = useMemo(() => personasEnDatos(gastos), [gastos]);
  const activos = hasActiveFilters(filters);
  const set = (patch) => setFilters((prev) => ({ ...prev, ...patch }));

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <Card className="space-y-2.5 p-3">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="search"
            placeholder="Buscar por concepto o categoría…"
            value={filters.q}
            onChange={(e) => set({ q: e.target.value })}
            className={cx(inputClass, 'h-10 pl-9 text-sm')}
          />
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          <Segmented
            size="sm"
            ariaLabel="Empresa"
            value={filters.empresa}
            onChange={(empresa) => set({ empresa })}
            options={[
              { value: 'todas', label: 'Todas' },
              { value: 'LGHT', label: 'LGHT', activeClass: 'bg-lght text-white shadow-card' },
              { value: 'Nuvixa', label: 'Nuvixa', activeClass: 'bg-nuvixa text-white shadow-card' },
            ]}
          />
          <Segmented
            size="sm"
            ariaLabel="Método de pago"
            value={filters.metodo}
            onChange={(metodo) => set({ metodo })}
            options={[
              { value: 'todos', label: 'Todos' },
              { value: 'tarjeta', label: 'Tarjeta' },
              { value: 'efectivo', label: 'Efectivo' },
            ]}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <SelectField label="Persona" value={filters.persona} onChange={(persona) => set({ persona })}>
            <option value="todas">Persona: todas</option>
            {personas.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </SelectField>
          <SelectField label="Periodo" value={filters.periodo} onChange={(periodo) => set({ periodo })}>
            {PERIODOS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.id === 'todo' ? 'Todo el historial' : p.label}
              </option>
            ))}
          </SelectField>
        </div>
        {activos ? (
          <button
            type="button"
            onClick={() => setFilters(DEFAULT_FILTERS)}
            className="inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-ink"
          >
            <X size={13} /> Limpiar filtros
          </button>
        ) : null}
      </Card>

      {/* Totales + exportación */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-1 md:flex-row md:flex-wrap md:items-baseline md:gap-x-4">
          <p className="text-sm text-muted">
            <span className="font-semibold text-ink">{s.count}</span> registros ·{' '}
            <span className="font-semibold tabular-nums text-ink">{fmtMXN(s.total)}</span>
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {EMPRESAS.map((e) => (
              <span key={e} className="flex items-center gap-1.5 text-xs text-muted">
                <EmpresaDot empresa={e} className="size-2" />
                {e} <span className="font-medium tabular-nums text-ink">{fmtMXN(s.porEmpresa[e].total)}</span>
              </span>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 md:flex">
          <Button variant="secondary" className="whitespace-nowrap px-3" onClick={() => onExportCSV(filtrados)} disabled={!s.count}>
            <Download size={15} /> Exportar CSV
          </Button>
          <Button variant="secondary" className="whitespace-nowrap px-3" onClick={() => onCopyWhatsApp(filtrados)} disabled={!s.count}>
            <MessageCircle size={15} />
            <span className="md:hidden">Copiar WhatsApp</span>
            <span className="hidden md:inline">Copiar resumen para WhatsApp</span>
          </Button>
        </div>
      </div>

      {/* Lista por día */}
      {dias.length === 0 ? (
        <Card>
          {gastos.length === 0 ? (
            <EmptyState icon={Inbox} title="Aún no hay gastos registrados">
              Usa “Registrar gasto” para capturar el primero.
            </EmptyState>
          ) : (
            <EmptyState
              icon={SearchX}
              title="Ningún gasto coincide con los filtros"
              action={
                <Button variant="secondary" size="sm" onClick={() => setFilters(DEFAULT_FILTERS)}>
                  Limpiar filtros
                </Button>
              }
            />
          )}
        </Card>
      ) : (
        <div className="space-y-4">
          {dias.map((dia) => {
            const rel = relativeDayLabel(dia.fecha);
            return (
              <section key={dia.fecha}>
                <div className="mb-1.5 flex items-baseline justify-between gap-3 px-1">
                  <h3 className="text-[13px] font-semibold text-ink">
                    {fmtDayHeader(dia.fecha)}
                    {rel ? <span className="ml-1.5 font-normal text-muted">· {rel}</span> : null}
                  </h3>
                  <p className="text-xs text-muted">
                    Total del día: <span className="font-semibold tabular-nums text-ink">{fmtMXN(dia.total)}</span>
                  </p>
                </div>
                <Card className="divide-y divide-line overflow-hidden">
                  {dia.items.map((g) => (
                    <ExpenseRow
                      key={g.id}
                      gasto={g}
                      onOpen={onOpen}
                      onOpenTicket={onOpenTicket}
                      onEdit={onEdit}
                      onDelete={onDelete}
                    />
                  ))}
                </Card>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
