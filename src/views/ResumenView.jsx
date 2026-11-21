import { useMemo } from 'react';
import { Wallet, CreditCard, HandCoins, ArrowRight, Receipt, Wrench } from 'lucide-react';
import { Card, Segmented, EmpresaDot, EmptyState, SectionTitle, cx } from '../components/ui';
import { DonutEmpresas, BarrasMetodo } from '../components/Charts';
import { EMPRESAS, EMPRESA_INFO, PERIODOS } from '../lib/constants';
import { fmtMXN } from '../lib/format';
import { filterByPeriod, summarize, groupByPersona, isPendiente, periodLabel } from '../lib/selectors';
import { resumenSalidas } from '../lib/salidas';

function KpiCard({ icon: Icon, title, value, tone, children, className = '' }) {
  return (
    <Card className={cx('flex flex-col p-4', className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-medium text-muted">{title}</p>
        <span
          className={cx(
            'flex size-7 items-center justify-center rounded-md',
            tone === 'due' ? 'bg-due-soft text-due' : 'bg-slate-100 text-ink',
          )}
        >
          <Icon size={15} />
        </span>
      </div>
      <p className={cx('mt-1.5 text-[22px] font-semibold leading-tight tabular-nums md:text-2xl', tone === 'due' ? 'text-due' : 'text-ink')}>
        {fmtMXN(value)}
      </p>
      {children ? <div className="mt-3 border-t border-line pt-2.5">{children}</div> : null}
    </Card>
  );
}

function SplitRows({ values }) {
  return (
    <ul className="space-y-1">
      {EMPRESAS.map((e) => (
        <li key={e} className="flex items-center justify-between gap-2 text-xs">
          <span className="flex items-center gap-1.5 text-muted">
            <EmpresaDot empresa={e} className="size-2" />
            {e}
          </span>
          <span className="font-medium tabular-nums text-ink">{fmtMXN(values[e])}</span>
        </li>
      ))}
    </ul>
  );
}

function SplitBar({ values, total }) {
  return (
    <div>
      <div className="flex h-2 w-full gap-0.5 overflow-hidden rounded-full bg-slate-100">
        {total > 0
          ? EMPRESAS.map((e) => (
              <div
                key={e}
                className={cx('h-full first:rounded-l-full last:rounded-r-full', EMPRESA_INFO[e].dot)}
                style={{ width: `${(values[e] / total) * 100}%` }}
              />
            ))
          : null}
      </div>
      <div className="mt-2 flex justify-between text-xs">
        {EMPRESAS.map((e) => (
          <span key={e} className="flex items-center gap-1.5 text-muted">
            <EmpresaDot empresa={e} className="size-2" />
            {e} <span className="font-medium tabular-nums text-ink">{fmtMXN(values[e])}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function ResumenView({ gastos, salidas = [], periodo, setPeriodo, onGoTo, onNew }) {
  const delPeriodo = useMemo(() => filterByPeriod(gastos, periodo), [gastos, periodo]);
  const s = useMemo(() => summarize(delPeriodo), [delPeriodo]);
  // Los adeudos se acumulan sin importar el periodo
  const deuda = useMemo(() => summarize(gastos.filter(isPendiente)), [gastos]);
  const porPersona = useMemo(() => groupByPersona(gastos.filter(isPendiente)), [gastos]);
  const totals = { LGHT: s.porEmpresa.LGHT.total, Nuvixa: s.porEmpresa.Nuvixa.total };
  const fuera = useMemo(() => resumenSalidas(salidas), [salidas]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <Segmented
          size="sm"
          ariaLabel="Periodo"
          className="md:w-[26rem]"
          value={periodo}
          onChange={setPeriodo}
          options={PERIODOS.map((p) => ({ value: p.id, label: p.label }))}
        />
        <p className="text-xs text-muted">{periodLabel(periodo)}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <KpiCard icon={Wallet} title="Gasto total combinado" value={s.total} className="col-span-2 md:col-span-1">
          <SplitBar values={totals} total={s.total} />
          <p className="mt-1.5 text-xs text-muted">
            {s.count} registros · {s.conTicket} con ticket
          </p>
        </KpiCard>
        <KpiCard icon={CreditCard} title="Tarjeta de crédito" value={s.tarjeta.total}>
          <SplitRows values={s.tarjeta} />
        </KpiCard>
        <KpiCard icon={HandCoins} title="Efectivo por reembolsar" value={s.pendiente.total} tone="due">
          <SplitRows values={s.pendiente} />
        </KpiCard>
      </div>

      {s.count === 0 ? (
        <Card>
          <EmptyState icon={Receipt} title="Sin gastos en este periodo" action={<button type="button" onClick={onNew} className="text-sm font-medium text-ink underline">Registrar el primero</button>}>
            Cambia el periodo o registra un gasto nuevo.
          </EmptyState>
        </Card>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          <Card className="p-4">
            <SectionTitle className="mb-4">LGHT vs. Nuvixa</SectionTitle>
            <DonutEmpresas porEmpresa={s.porEmpresa} />
          </Card>
          <Card className="p-4">
            <SectionTitle className="mb-3">Por método de pago</SectionTitle>
            <BarrasMetodo porEmpresa={s.porEmpresa} />
          </Card>
        </div>
      )}

      {/* Resumen rápido de adeudos */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-ink">Adeudos por reembolsar</h2>
            <p className="text-xs text-muted">Efectivo pendiente acumulado (todos los periodos)</p>
          </div>
          <button
            type="button"
            onClick={() => onGoTo('reembolsos')}
            className="inline-flex shrink-0 items-center gap-1 text-[13px] font-medium text-ink hover:underline"
          >
            Ver detalle <ArrowRight size={14} />
          </button>
        </div>
        <div className="grid grid-cols-2 divide-x divide-line">
          {EMPRESAS.map((e) => (
            <div key={e} className="px-4 py-3">
              <p className="flex items-center gap-1.5 text-xs text-muted">
                <EmpresaDot empresa={e} className="size-2" />
                <span className={cx('font-semibold', EMPRESA_INFO[e].text)}>{e}</span> debe
              </p>
              <p className={cx('mt-0.5 text-lg font-semibold tabular-nums', deuda.pendiente[e] > 0 ? 'text-due' : 'text-ok')}>
                {fmtMXN(deuda.pendiente[e])}
              </p>
              <p className="text-xs text-muted">en reembolsos</p>
            </div>
          ))}
        </div>
        {porPersona.length > 0 ? (
          <ul className="divide-y divide-line border-t border-line bg-slate-50/60">
            {porPersona.map((p) => (
              <li key={p.persona} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 px-4 py-2 text-[13px]">
                <span className="text-ink">
                  A <strong>{p.persona}</strong> le debe:
                </span>
                <span className="tabular-nums text-muted">
                  {EMPRESAS.map((e, i) => (
                    <span key={e}>
                      {i > 0 ? ' / ' : ''}
                      <span className={cx('font-medium', EMPRESA_INFO[e].text)}>{e}</span>{' '}
                      <span className="text-ink">{fmtMXN(p[e] || 0)}</span>
                    </span>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="border-t border-line px-4 py-3 text-[13px] text-ok">Todo liquidado: no hay reembolsos pendientes.</p>
        )}
      </Card>

      {/* Material y herramienta fuera */}
      <Card className="flex items-center gap-3 px-4 py-3">
        <span
          className={cx(
            'flex size-9 shrink-0 items-center justify-center rounded-lg',
            fuera.vencidas ? 'bg-due-soft text-due' : 'bg-slate-100 text-ink',
          )}
        >
          <Wrench size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">Material y herramienta fuera</p>
          <p className="truncate text-xs text-muted">
            {fuera.abiertas === 0 ? (
              <span className="text-ok">Todo está de regreso</span>
            ) : (
              <>
                {fuera.piezasFuera} piezas en {fuera.abiertas} salida{fuera.abiertas === 1 ? '' : 's'}
                {fuera.vencidas ? <span className="font-medium text-due"> · {fuera.vencidas} con regreso vencido</span> : null}
              </>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onGoTo('salidas')}
          className="inline-flex shrink-0 items-center gap-1 text-[13px] font-medium text-ink hover:underline"
        >
          Ver <ArrowRight size={14} />
        </button>
      </Card>
    </div>
  );
}
