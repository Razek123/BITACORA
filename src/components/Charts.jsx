import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LabelList,
} from 'recharts';
import { EMPRESAS, EMPRESA_INFO, PALETTE } from '../lib/constants';
import { fmtMXN, fmtMXN0, fmtPct, fmtCompact } from '../lib/format';

const chartsAvailable = () => typeof window === 'undefined' || !window.__BITACORA_CHARTS_FAILED;

function TooltipBox({ title, rows }) {
  return (
    <div className="min-w-40 rounded-lg border border-line bg-white px-3 py-2 text-xs shadow-sheet">
      {title ? <p className="mb-1 font-semibold text-ink">{title}</p> : null}
      {rows.map((r) => (
        <div key={r.label} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-1.5 text-muted">
            <span className="inline-block size-2.5 rounded-[3px]" style={{ background: r.color }} />
            {r.label}
          </span>
          <span className="font-medium tabular-nums text-ink">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

/* ───────────────────────── Dona LGHT vs Nuvixa ───────────────────────── */

export function DonutEmpresas({ porEmpresa }) {
  const total = EMPRESAS.reduce((acc, e) => acc + porEmpresa[e].total, 0);
  const rows = EMPRESAS.map((e) => ({ name: e, value: porEmpresa[e].total, color: EMPRESA_INFO[e].color }));

  const PieTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length || !total) return null;
    const p = payload[0].payload;
    return (
      <TooltipBox rows={[{ label: p.name, value: `${fmtMXN(p.value)} · ${fmtPct(p.value, total)}`, color: p.color }]} />
    );
  };

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row">
      <div className="relative size-44 shrink-0">
        {chartsAvailable() ? (
          <PieChart width={176} height={176}>
            <Pie
              data={total ? rows : [{ name: 'Sin datos', value: 1, color: PALETTE.border }]}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={86}
              startAngle={90}
              endAngle={-270}
              stroke="#FFFFFF"
              strokeWidth={2}
              isAnimationActive={false}
            >
              {(total ? rows : [{ color: PALETTE.border }]).map((r, i) => (
                <Cell key={i} fill={r.color} />
              ))}
            </Pie>
            {total ? <Tooltip content={<PieTooltip />} /> : null}
          </PieChart>
        ) : (
          <div className="size-44 rounded-full border-[26px] border-slate-100" />
        )}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted">Total</span>
          <span className="text-[17px] font-semibold tabular-nums text-ink">{fmtMXN0(total)}</span>
        </div>
      </div>

      <ul className="w-full space-y-2.5">
        {rows.map((r) => (
          <li key={r.name} className="rounded-lg border border-line px-3 py-2.5">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                <span className="inline-block size-3 rounded-[3px]" style={{ background: r.color }} />
                <span className="text-sm font-semibold text-ink">{r.name}</span>
                <span className="hidden text-xs text-muted min-[380px]:inline">{EMPRESA_INFO[r.name].giro}</span>
              </span>
              <span className="text-sm font-semibold tabular-nums text-ink">{fmtPct(r.value, total)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-muted">
              <span>{porEmpresa[r.name].count} registros</span>
              <span className="tabular-nums">{fmtMXN(r.value)}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ───────────────────── Barras: empresa × método de pago ───────────────────── */

export function BarrasMetodo({ porEmpresa }) {
  const data = [
    { metodo: 'Tarjeta', LGHT: porEmpresa.LGHT.tarjeta, Nuvixa: porEmpresa.Nuvixa.tarjeta },
    { metodo: 'Efectivo', LGHT: porEmpresa.LGHT.efectivo, Nuvixa: porEmpresa.Nuvixa.efectivo },
  ];
  const max = Math.max(1, ...data.flatMap((d) => [d.LGHT, d.Nuvixa]));

  const BarTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    return (
      <TooltipBox
        title={label === 'Tarjeta' ? 'Tarjeta de crédito' : 'Efectivo'}
        rows={payload.map((p) => ({ label: p.dataKey, value: fmtMXN(p.value), color: EMPRESA_INFO[p.dataKey].color }))}
      />
    );
  };

  return (
    <div>
      <div className="mb-2 flex items-center gap-4 text-xs text-muted">
        {EMPRESAS.map((e) => (
          <span key={e} className="flex items-center gap-1.5">
            <span className="inline-block size-2.5 rounded-[3px]" style={{ background: EMPRESA_INFO[e].color }} />
            {e}
          </span>
        ))}
      </div>
      {chartsAvailable() ? (
        <div className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 4, right: 64, left: 4, bottom: 4 }}
              barGap={2}
              barCategoryGap="22%"
            >
              <CartesianGrid horizontal={false} stroke={PALETTE.grid} />
              <XAxis
                type="number"
                domain={[0, Math.ceil(max * 1.05)]}
                tickFormatter={fmtCompact}
                tickLine={false}
                axisLine={false}
                tick={{ fill: PALETTE.muted, fontSize: 11 }}
                tickCount={4}
              />
              <YAxis
                type="category"
                dataKey="metodo"
                tickLine={false}
                axisLine={{ stroke: PALETTE.border }}
                tick={{ fill: PALETTE.text, fontSize: 12, fontWeight: 500 }}
                width={64}
              />
              <Tooltip cursor={{ fill: '#F1F5F9' }} content={<BarTooltip />} />
              {EMPRESAS.map((e) => (
                <Bar key={e} dataKey={e} name={e} fill={EMPRESA_INFO[e].color} radius={[0, 4, 4, 0]} maxBarSize={24}>
                  <LabelList
                    dataKey={e}
                    position="right"
                    formatter={(v) => (v ? fmtMXN0(v) : '$0')}
                    style={{ fill: PALETTE.muted, fontSize: 11, fontVariantNumeric: 'tabular-nums' }}
                  />
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <table className="w-full text-sm">
          <tbody>
            {data.map((d) => (
              <tr key={d.metodo} className="border-t border-line">
                <td className="py-2 font-medium text-ink">{d.metodo}</td>
                {EMPRESAS.map((e) => (
                  <td key={e} className="py-2 text-right tabular-nums text-muted">
                    {e} {fmtMXN(d[e])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
