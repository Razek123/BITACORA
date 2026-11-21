import { useState, useRef, useMemo } from 'react';
import { Plus, X, Wrench, Package, CalendarDays } from 'lucide-react';
import { Sheet, Segmented, Chip, Button, FieldLabel, FieldError, inputClass, cx } from './ui';
import { Stepper } from './SalidaParts';
import { EMPRESAS, EMPRESA_INFO, PERSONAS } from '../lib/constants';
import { todayISO, fmtDayHeader, relativeDayLabel } from '../lib/format';
import { readPref, writePref } from '../lib/hooks';
import { TIPO_HERRAMIENTA, TIPO_MATERIAL, catalogoArticulos } from '../lib/salidas';
import { normalizeSalida } from '../services/dataService';

const PREF_EMPRESA = 'bitacora.ultimaEmpresa';
const tmpId = () => `it-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

function initial(salida) {
  if (salida) {
    const enLista = PERSONAS.includes(salida.responsable);
    return {
      empresa: salida.empresa,
      destino: salida.destino,
      responsable: enLista ? salida.responsable : 'Otro',
      responsableOtro: enLista ? '' : salida.responsable,
      autorizo: salida.autorizo || '',
      fechaSalida: salida.fechaSalida,
      regresoEstimado: salida.regresoEstimado || '',
      notas: salida.notas || '',
      items: (salida.items || []).map((it) => ({ ...it })),
    };
  }
  return {
    empresa: readPref(PREF_EMPRESA, 'LGHT'),
    destino: '',
    responsable: '',
    responsableOtro: '',
    autorizo: '',
    fechaSalida: todayISO(),
    regresoEstimado: '',
    notas: '',
    items: [],
  };
}

function TipoToggle({ value, onChange, size = 'md' }) {
  const opts = [
    { v: TIPO_HERRAMIENTA, label: 'Herramienta', icon: Wrench },
    { v: TIPO_MATERIAL, label: 'Material', icon: Package },
  ];
  return (
    <div className="inline-flex rounded-lg bg-slate-100 p-0.5">
      {opts.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          aria-pressed={value === o.v}
          className={cx(
            'inline-flex items-center gap-1 rounded-md font-medium transition-colors',
            size === 'sm' ? 'h-7 px-2 text-[11px]' : 'h-8 px-2.5 text-xs',
            value === o.v ? 'bg-white text-ink shadow-card ring-1 ring-line' : 'text-muted',
          )}
        >
          <o.icon size={13} />
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function SalidaForm({ salida, salidas, onClose, onSubmit }) {
  const editing = Boolean(salida);
  const [f, setF] = useState(() => initial(salida));
  const [draft, setDraft] = useState({ nombre: '', tipo: TIPO_HERRAMIENTA, cantidad: 1 });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [showFecha, setShowFecha] = useState(editing);
  const nombreRef = useRef(null);
  const set = (patch) => setF((prev) => ({ ...prev, ...patch }));

  const catalogo = useMemo(() => catalogoArticulos(salidas || []), [salidas]);
  const enLista = new Set(f.items.map((it) => it.nombre.toLowerCase()));
  const sugerencias = catalogo.filter((c) => !enLista.has(c.nombre.toLowerCase())).slice(0, 8);

  const responsableFinal = f.responsable === 'Otro' ? f.responsableOtro.trim() : f.responsable;
  const piezas = f.items.reduce((acc, it) => acc + (Number(it.cantidad) || 0), 0);
  const info = EMPRESA_INFO[f.empresa];

  const addItem = (nombre, tipo, cantidad) => {
    const n = String(nombre || '').trim();
    if (!n) {
      if (nombreRef.current) nombreRef.current.focus();
      return;
    }
    setF((prev) => {
      const idx = prev.items.findIndex((it) => it.nombre.toLowerCase() === n.toLowerCase() && it.tipo === tipo);
      if (idx >= 0) {
        const items = [...prev.items];
        items[idx] = { ...items[idx], cantidad: items[idx].cantidad + cantidad };
        return { ...prev, items };
      }
      return {
        ...prev,
        items: [...prev.items, { id: tmpId(), nombre: n, tipo, cantidad, devuelto: 0, consumido: false, nota: '' }],
      };
    });
    setErrors((e) => ({ ...e, items: undefined }));
  };

  const addDraft = () => {
    addItem(draft.nombre, draft.tipo, draft.cantidad);
    if (draft.nombre.trim()) {
      setDraft({ nombre: '', tipo: draft.tipo, cantidad: 1 });
      if (nombreRef.current) nombreRef.current.focus();
    }
  };

  const updateItem = (id, patch) =>
    setF((prev) => ({ ...prev, items: prev.items.map((it) => (it.id === id ? { ...it, ...patch } : it)) }));
  const removeItem = (id) => setF((prev) => ({ ...prev, items: prev.items.filter((it) => it.id !== id) }));

  const onNombre = (nombre) => {
    const match = catalogo.find((c) => c.nombre.toLowerCase() === nombre.trim().toLowerCase());
    setDraft((d) => ({ ...d, nombre, tipo: match ? match.tipo : d.tipo }));
  };

  const submit = async () => {
    // Si quedó algo escrito en el renglón de captura, se agrega antes de guardar
    const pendingDraft = draft.nombre.trim();
    const items = pendingDraft
      ? [...f.items, { id: tmpId(), nombre: pendingDraft, tipo: draft.tipo, cantidad: draft.cantidad, devuelto: 0, consumido: false, nota: '' }]
      : f.items;
    const payload = {
      ...(salida || {}),
      empresa: f.empresa,
      destino: f.destino,
      responsable: responsableFinal,
      autorizo: f.autorizo,
      fechaSalida: f.fechaSalida,
      regresoEstimado: f.regresoEstimado || null,
      notas: f.notas,
      items,
    };
    const check = normalizeSalida(payload);
    if (!check.valid) {
      setErrors(check.errors);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      writePref(PREF_EMPRESA, f.empresa);
      await onSubmit(payload);
    } catch (err) {
      setErrors({ general: err.message || 'No se pudo guardar.' });
      setSaving(false);
    }
  };

  const fechaRel = relativeDayLabel(f.fechaSalida);

  return (
    <Sheet
      open
      onClose={onClose}
      title={editing ? 'Editar salida' : 'Nueva salida de material'}
      subtitle={editing ? f.destino : 'Anota todo lo que sale para saber qué debe regresar'}
      footer={
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="lg" onClick={onClose} className="px-4">
            Cancelar
          </Button>
          <Button variant="primary" size="lg" className="flex-1 whitespace-nowrap" onClick={submit} loading={saving}>
            {editing ? 'Guardar cambios' : 'Registrar salida'}
            {piezas > 0 ? <span className="whitespace-nowrap opacity-80">· {piezas} pzas</span> : null}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div>
          <FieldLabel>¿De qué empresa sale?</FieldLabel>
          <Segmented
            size="lg"
            ariaLabel="Empresa"
            value={f.empresa}
            onChange={(empresa) => set({ empresa })}
            options={EMPRESAS.map((e) => ({
              value: e,
              label: e,
              sub: EMPRESA_INFO[e].giro,
              activeClass: cx(EMPRESA_INFO[e].solid, 'shadow-card'),
            }))}
          />
        </div>

        <div>
          <FieldLabel htmlFor="destino">Destino / evento / obra</FieldLabel>
          <input
            id="destino"
            autoComplete="off"
            placeholder={f.empresa === 'LGHT' ? 'Ej. Boda – Hacienda Los Arcos' : 'Ej. Instalación cuadros – Oficinas Alfa'}
            value={f.destino}
            onChange={(e) => set({ destino: e.target.value })}
            className={cx(inputClass, 'h-11', errors.destino && 'border-due')}
          />
          <FieldError>{errors.destino}</FieldError>
        </div>

        <div>
          <FieldLabel>¿Quién se lo lleva? (responsable)</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {[...PERSONAS, 'Otro'].map((p) => (
              <Chip key={p} active={f.responsable === p} onClick={() => set({ responsable: p })}>
                {p === 'Otro' ? 'Otro…' : p}
              </Chip>
            ))}
          </div>
          {f.responsable === 'Otro' ? (
            <input
              autoFocus
              placeholder="Nombre del responsable"
              value={f.responsableOtro}
              onChange={(e) => set({ responsableOtro: e.target.value })}
              className={cx(inputClass, 'mt-2 h-10')}
            />
          ) : null}
          <FieldError>{errors.responsable}</FieldError>
        </div>

        {/* Artículos */}
        <div>
          <FieldLabel
            right={
              f.items.length ? (
                <span className="text-xs tabular-nums text-muted">
                  {f.items.length} artículos · {piezas} piezas
                </span>
              ) : null
            }
          >
            Material y herramienta que sale
          </FieldLabel>

          <div className={cx('rounded-xl border bg-slate-50 p-3', errors.items ? 'border-due' : 'border-line')}>
            <input
              ref={nombreRef}
              list="bitacora-catalogo"
              autoComplete="off"
              enterKeyHint="done"
              placeholder="Ej. Extensión eléctrica 20 m"
              value={draft.nombre}
              onChange={(e) => onNombre(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addDraft();
                }
              }}
              className={cx(inputClass, 'h-11')}
              aria-label="Nombre del artículo"
            />
            <datalist id="bitacora-catalogo">
              {catalogo.map((c) => (
                <option key={c.nombre} value={c.nombre} />
              ))}
            </datalist>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <TipoToggle value={draft.tipo} onChange={(tipo) => setDraft((d) => ({ ...d, tipo }))} />
              <Stepper
                value={draft.cantidad}
                min={1}
                onChange={(cantidad) => setDraft((d) => ({ ...d, cantidad }))}
                label="Cantidad"
              />
              <Button variant="primary" size="md" className="ml-auto" onClick={addDraft}>
                <Plus size={16} /> Agregar
              </Button>
            </div>

            {sugerencias.length ? (
              <div className="mt-3">
                <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted">Usados antes · toca para agregar</p>
                <div className="flex flex-wrap gap-1.5">
                  {sugerencias.map((c) => (
                    <button
                      key={c.nombre}
                      type="button"
                      onClick={() => addItem(c.nombre, c.tipo, 1)}
                      className="inline-flex h-7 items-center gap-1 rounded-full border border-line bg-white px-2.5 text-xs text-ink hover:border-slate-300"
                    >
                      <Plus size={12} className="text-muted" />
                      {c.nombre}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
          <FieldError>{errors.items}</FieldError>

          {f.items.length ? (
            <ul className="mt-3 divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">
              {f.items.map((it, i) => (
                <li key={it.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5">
                  <span className="w-5 shrink-0 text-center text-xs tabular-nums text-muted">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <input
                      value={it.nombre}
                      onChange={(e) => updateItem(it.id, { nombre: e.target.value })}
                      className="w-full truncate rounded-md bg-transparent px-1 py-0.5 text-sm font-medium text-ink outline-none focus:bg-slate-50 focus:ring-1 focus:ring-line"
                      aria-label={`Nombre del artículo ${i + 1}`}
                    />
                  </div>
                  <div className="flex w-full items-center gap-2 pl-8 sm:w-auto sm:pl-0">
                    <TipoToggle size="sm" value={it.tipo} onChange={(tipo) => updateItem(it.id, { tipo, consumido: false })} />
                    <Stepper
                      size="sm"
                      value={it.cantidad}
                      min={Math.max(1, it.devuelto || 0)}
                      onChange={(cantidad) => updateItem(it.id, { cantidad })}
                      label={`Cantidad de ${it.nombre}`}
                    />
                    <button
                      type="button"
                      onClick={() => removeItem(it.id)}
                      className="ml-auto inline-flex size-8 items-center justify-center rounded-lg text-muted hover:bg-due-soft hover:text-due sm:ml-0"
                      aria-label={`Quitar ${it.nombre}`}
                    >
                      <X size={16} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {/* Fechas */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel htmlFor="fechaSalida">Fecha de salida</FieldLabel>
            {showFecha ? (
              <input
                id="fechaSalida"
                type="date"
                value={f.fechaSalida}
                onChange={(e) => set({ fechaSalida: e.target.value || todayISO() })}
                className={cx(inputClass, 'h-11 text-sm')}
              />
            ) : (
              <button
                type="button"
                onClick={() => setShowFecha(true)}
                className="flex h-11 w-full items-center gap-2 rounded-lg border border-line bg-white px-3 text-left text-sm shadow-card"
              >
                <CalendarDays size={15} className="shrink-0 text-muted" />
                <span className="truncate font-medium text-ink">{fechaRel || fmtDayHeader(f.fechaSalida)}</span>
              </button>
            )}
          </div>
          <div>
            <FieldLabel htmlFor="regreso">Regreso estimado</FieldLabel>
            <input
              id="regreso"
              type="date"
              value={f.regresoEstimado}
              min={f.fechaSalida}
              onChange={(e) => set({ regresoEstimado: e.target.value })}
              className={cx(inputClass, 'h-11 text-sm', !f.regresoEstimado && 'text-muted')}
            />
          </div>
        </div>

        <div>
          <FieldLabel>Autorizó / entregó (opcional)</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {PERSONAS.map((p) => (
              <Chip key={p} active={f.autorizo === p} onClick={() => set({ autorizo: f.autorizo === p ? '' : p })}>
                {p}
              </Chip>
            ))}
          </div>
        </div>

        <div>
          <FieldLabel htmlFor="notas">Notas (opcional)</FieldLabel>
          <textarea
            id="notas"
            rows={2}
            placeholder="Ej. Montaje viernes 6 pm; regresar sábado temprano."
            value={f.notas}
            onChange={(e) => set({ notas: e.target.value })}
            className={cx(inputClass, 'resize-none py-2.5 text-sm')}
          />
        </div>

        <p className={cx('rounded-lg px-3 py-2 text-[13px] ring-1 ring-inset', info.softBox)}>
          Se generará un vale con folio consecutivo que puedes descargar en PDF e imprimir para firmas.
        </p>

        {errors.general ? <p className="rounded-lg bg-due-soft px-3 py-2 text-sm font-medium text-due">{errors.general}</p> : null}
      </div>
    </Sheet>
  );
}
