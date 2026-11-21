import { useMemo, useState } from 'react';
import { CircleCheck, HandCoins, User } from 'lucide-react';
import { Card, Segmented, EmptyState, EmpresaBadge, StatusPill, Button, cx } from '../components/ui';
import { TicketThumb } from '../components/ExpenseRow';
import { EMPRESAS, EMPRESA_INFO } from '../lib/constants';
import { fmtMXN, fmtDateShort } from '../lib/format';
import { isEfectivo, isPendiente, isPagado, groupByPersona, summarize } from '../lib/selectors';

function StatBox({ label, value, tone }) {
  return (
    <div className="px-4 py-3">
      <p className="text-xs text-muted">{label}</p>
      <p className={cx('mt-0.5 text-lg font-semibold tabular-nums', tone)}>{fmtMXN(value)}</p>
    </div>
  );
}

export function ReembolsosView({ gastos, onOpen, onOpenTicket, onMarkPaid }) {
  const [estado, setEstado] = useState('pendientes');
  const efectivo = useMemo(() => gastos.filter(isEfectivo), [gastos]);
  const totPend = useMemo(() => summarize(efectivo.filter(isPendiente)), [efectivo]);
  const totPag = useMemo(() => summarize(efectivo.filter(isPagado)), [efectivo]);

  const visibles = useMemo(() => {
    if (estado === 'pendientes') return efectivo.filter(isPendiente);
    if (estado === 'pagados') return efectivo.filter(isPagado);
    return efectivo;
  }, [efectivo, estado]);
  const grupos = useMemo(() => groupByPersona(visibles), [visibles]);

  return (
    <div className="space-y-4">
      <Card className="grid grid-cols-2 divide-line overflow-hidden md:grid-cols-4 md:divide-x">
        <StatBox label="Pendiente total" value={totPend.total} tone="text-due" />
        <StatBox label="Ya reembolsado" value={totPag.total} tone="text-ok" />
        {EMPRESAS.map((e) => (
          <div key={e} className="border-t border-line md:border-t-0">
            <StatBox label={`${e} debe`} value={totPend.pendiente[e]} tone={EMPRESA_INFO[e].text} />
          </div>
        ))}
      </Card>

      <Segmented
        size="sm"
        ariaLabel="Estado del reembolso"
        className="md:w-96"
        value={estado}
        onChange={setEstado}
        options={[
          { value: 'pendientes', label: `Pendientes (${efectivo.filter(isPendiente).length})` },
          { value: 'pagados', label: 'Pagados' },
          { value: 'todos', label: 'Todos' },
        ]}
      />

      {grupos.length === 0 ? (
        <Card>
          {estado === 'pendientes' ? (
            <EmptyState icon={CircleCheck} title="Sin reembolsos pendientes">
              Todos los gastos en efectivo están liquidados.
            </EmptyState>
          ) : (
            <EmptyState icon={HandCoins} title="No hay gastos en efectivo aquí" />
          )}
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {grupos.map((g) => (
            <Card key={g.persona} className="overflow-hidden">
              <div className="border-b border-line px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="flex items-center gap-2 text-sm text-ink">
                    <span className="flex size-7 items-center justify-center rounded-full bg-slate-100 text-muted">
                      <User size={14} />
                    </span>
                    {estado === 'pagados' ? (
                      <span>
                        A <strong>{g.persona}</strong> se le pagó:
                      </span>
                    ) : (
                      <span>
                        A <strong>{g.persona}</strong> le debe:
                      </span>
                    )}
                  </p>
                  <p
                    className={cx(
                      'text-base font-semibold tabular-nums',
                      estado === 'pagados' ? 'text-ok' : g.pendiente > 0 ? 'text-due' : 'text-ok',
                    )}
                  >
                    {fmtMXN(estado === 'todos' ? g.pendiente : g.total)}
                  </p>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {EMPRESAS.map((e) => {
                    const monto = estado === 'todos' ? g.items.filter((x) => x.empresa === e && isPendiente(x)).reduce((a, x) => a + x.monto, 0) : g[e] || 0;
                    return (
                      <span
                        key={e}
                        className={cx('inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs ring-1 ring-inset', EMPRESA_INFO[e].badge)}
                      >
                        <span className="font-semibold">{e}</span>
                        <span className="tabular-nums text-ink">{fmtMXN(monto)}</span>
                      </span>
                    );
                  })}
                  {estado === 'todos' && g.pagado > 0 ? (
                    <span className="inline-flex items-center rounded-md bg-ok-soft px-2 py-1 text-xs text-ok ring-1 ring-inset ring-ok/20">
                      Pagado <span className="ml-1 tabular-nums">{fmtMXN(g.pagado)}</span>
                    </span>
                  ) : null}
                </div>
              </div>
              <ul className="divide-y divide-line">
                {g.items.map((item) => {
                  const pend = isPendiente(item);
                  return (
                    <li key={item.id} className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <TicketThumb gasto={item} onOpen={onOpenTicket} />
                        <button type="button" onClick={() => onOpen(item)} className="min-w-0 flex-1 text-left">
                          <EmpresaBadge empresa={item.empresa} />
                          <p className="mt-0.5 truncate text-sm font-medium text-ink">{item.concepto}</p>
                          <p className="truncate text-xs text-muted">
                            {fmtDateShort(item.fecha)} ·{' '}
                            {pend ? `Registró ${item.registradoPor}` : `Pagado el ${fmtDateShort(item.fechaPago)}`}
                          </p>
                        </button>
                        <div className="flex shrink-0 flex-col items-end gap-1.5">
                          <span className="text-sm font-semibold tabular-nums text-ink">{fmtMXN(item.monto)}</span>
                          {pend ? (
                            <div className="hidden sm:block">
                              <Button size="sm" variant="success" onClick={() => onMarkPaid(item)}>
                                <CircleCheck size={14} /> Marcar pagado
                              </Button>
                            </div>
                          ) : (
                            <StatusPill estado={item.estadoReembolso} />
                          )}
                        </div>
                      </div>
                      {pend ? (
                        <div className="mt-2 flex justify-end sm:hidden">
                          <Button size="sm" variant="success" onClick={() => onMarkPaid(item)}>
                            <CircleCheck size={14} /> Marcar como pagado
                          </Button>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
