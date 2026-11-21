import { useState, useRef, useMemo } from 'react';
import { Camera, ImagePlus, CreditCard, Banknote, Trash2, Info, LoaderCircle, CalendarDays } from 'lucide-react';
import { Sheet, Segmented, Chip, Button, FieldLabel, FieldError, TicketBadge, inputClass, cx } from './ui';
import {
  EMPRESAS,
  EMPRESA_INFO,
  CATEGORIAS,
  METODO_TARJETA,
  METODO_EFECTIVO,
  PERSONAS,
  REGISTRADORES,
  ESTADO_PENDIENTE,
} from '../lib/constants';
import { fmtMXN, parseMonto, todayISO, fmtDayHeader, relativeDayLabel } from '../lib/format';
import { readPref, writePref } from '../lib/hooks';
import { compressImage, dataUrlSizeKB } from '../services/imageService';
import { normalizeGasto } from '../services/dataService';

const PREF_REGISTRADOR = 'bitacora.ultimoRegistrador';
const PREF_EMPRESA = 'bitacora.ultimaEmpresa';

function initialState(gasto) {
  if (gasto) {
    const registradoPor = REGISTRADORES.includes(gasto.registradoPor) ? gasto.registradoPor : 'Otro';
    const reembolsoEsLista = PERSONAS.includes(gasto.reembolsoA);
    return {
      fecha: gasto.fecha,
      empresa: gasto.empresa,
      concepto: gasto.concepto,
      categoria: gasto.categoria,
      monto: String(gasto.monto),
      metodoPago: gasto.metodoPago,
      registradoPor,
      registradoOtro: registradoPor === 'Otro' && gasto.registradoPor !== 'Otro' ? gasto.registradoPor : '',
      reembolsoA: gasto.reembolsoA ? (reembolsoEsLista ? gasto.reembolsoA : 'Otro') : '',
      reembolsoOtro: gasto.reembolsoA && !reembolsoEsLista ? gasto.reembolsoA : '',
      estadoReembolso: gasto.estadoReembolso || ESTADO_PENDIENTE,
      fechaPago: gasto.fechaPago || null,
    };
  }
  const registradoPor = readPref(PREF_REGISTRADOR, 'Raziel');
  return {
    fecha: todayISO(),
    empresa: readPref(PREF_EMPRESA, 'LGHT'),
    concepto: '',
    categoria: 'Materiales',
    monto: '',
    metodoPago: METODO_TARJETA,
    registradoPor: REGISTRADORES.includes(registradoPor) ? registradoPor : 'Raziel',
    registradoOtro: '',
    reembolsoA: '',
    reembolsoOtro: '',
    estadoReembolso: ESTADO_PENDIENTE,
    fechaPago: null,
  };
}

export function ExpenseForm({ open, gasto, onClose, onSubmit }) {
  // La key en el padre reinicia el estado en cada apertura.
  const editing = Boolean(gasto);
  const [f, setF] = useState(() => initialState(gasto));
  const [ticket, setTicket] = useState(gasto ? gasto.ticketImagen || null : null);
  const [ticketChanged, setTicketChanged] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [imgError, setImgError] = useState('');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [reembolsoTocado, setReembolsoTocado] = useState(editing);
  const [showFecha, setShowFecha] = useState(false);
  const cameraRef = useRef(null);
  const fileRef = useRef(null);

  const set = (patch) => setF((prev) => ({ ...prev, ...patch }));
  const efectivo = f.metodoPago === METODO_EFECTIVO;
  const montoNum = parseMonto(f.monto);
  const info = EMPRESA_INFO[f.empresa];

  const registradorFinal = f.registradoPor === 'Otro' ? f.registradoOtro.trim() || 'Otro' : f.registradoPor;
  const reembolsoFinal = f.reembolsoA === 'Otro' ? f.reembolsoOtro.trim() : f.reembolsoA;

  const autoReembolso = (registradoPor) => (PERSONAS.includes(registradoPor) ? registradoPor : '');

  const setMetodo = (metodoPago) => {
    const patch = { metodoPago };
    if (metodoPago === METODO_EFECTIVO && !f.reembolsoA) patch.reembolsoA = autoReembolso(f.registradoPor);
    set(patch);
  };

  const setRegistrador = (registradoPor) => {
    const patch = { registradoPor };
    if (efectivo && !reembolsoTocado) patch.reembolsoA = autoReembolso(registradoPor);
    set(patch);
  };

  const handleFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setImgError('');
    setProcessing(true);
    try {
      const dataUrl = await compressImage(file);
      setTicket(dataUrl);
      setTicketChanged(true);
    } catch (err) {
      setImgError(err.message || 'No se pudo procesar la imagen.');
    } finally {
      setProcessing(false);
    }
  };

  const payload = useMemo(
    () => ({
      fecha: f.fecha,
      empresa: f.empresa,
      concepto: f.concepto,
      categoria: f.categoria,
      monto: montoNum,
      metodoPago: f.metodoPago,
      registradoPor: registradorFinal,
      reembolsoA: efectivo ? reembolsoFinal : null,
      estadoReembolso: efectivo ? f.estadoReembolso : null,
      fechaPago: efectivo ? f.fechaPago : null,
    }),
    [f, montoNum, registradorFinal, reembolsoFinal, efectivo],
  );

  const submit = async (e) => {
    if (e) e.preventDefault();
    const check = normalizeGasto(payload);
    if (!check.valid) {
      setErrors(check.errors);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      writePref(PREF_REGISTRADOR, f.registradoPor);
      writePref(PREF_EMPRESA, f.empresa);
      await onSubmit(payload, editing ? (ticketChanged ? ticket : undefined) : ticket);
    } catch (err) {
      setErrors({ general: err.message || 'No se pudo guardar.' });
      setSaving(false);
    }
  };

  const fechaRel = relativeDayLabel(f.fecha);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={editing ? 'Editar gasto' : 'Registrar gasto'}
      subtitle={editing ? gasto.concepto : 'Llénalo en segundos desde el celular'}
      footer={
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="lg" onClick={onClose} className="px-4">
            Cancelar
          </Button>
          <Button variant="primary" size="lg" className="flex-1" onClick={submit} loading={saving} disabled={processing}>
            {editing ? 'Guardar cambios' : 'Guardar gasto'}
            {montoNum > 0 ? <span className="tabular-nums opacity-80">· {fmtMXN(montoNum)}</span> : null}
          </Button>
        </div>
      }
    >
      <form onSubmit={submit} className="space-y-5" noValidate>
        {/* Empresa */}
        <div>
          <FieldLabel>¿Para qué empresa?</FieldLabel>
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

        {/* Monto */}
        <div>
          <FieldLabel htmlFor="monto">Monto (MXN)</FieldLabel>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-xl font-medium text-muted">$</span>
            <input
              id="monto"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0.00"
              value={f.monto}
              onChange={(e) => set({ monto: e.target.value })}
              className={cx(inputClass, 'h-14 pl-8 text-2xl font-semibold tabular-nums', errors.monto && 'border-due')}
            />
          </div>
          <FieldError>{errors.monto}</FieldError>
        </div>

        {/* Concepto */}
        <div>
          <FieldLabel htmlFor="concepto">Concepto</FieldLabel>
          <input
            id="concepto"
            autoComplete="off"
            placeholder={f.empresa === 'LGHT' ? 'Ej. Tornillería pista LED' : 'Ej. Marcos madera 50x70'}
            value={f.concepto}
            onChange={(e) => set({ concepto: e.target.value })}
            className={cx(inputClass, 'h-11', errors.concepto && 'border-due')}
          />
          <FieldError>{errors.concepto}</FieldError>
        </div>

        {/* Categoría */}
        <div>
          <FieldLabel>Categoría</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {CATEGORIAS.map((c) => (
              <Chip key={c} active={f.categoria === c} onClick={() => set({ categoria: c })} className="h-8 px-3 text-[13px]">
                {c}
              </Chip>
            ))}
          </div>
        </div>

        {/* Método de pago */}
        <div>
          <FieldLabel>Método de pago</FieldLabel>
          <Segmented
            size="lg"
            ariaLabel="Método de pago"
            value={f.metodoPago}
            onChange={setMetodo}
            options={[
              { value: METODO_TARJETA, label: 'Tarjeta de crédito', icon: CreditCard, activeClass: 'bg-ink text-white shadow-card' },
              { value: METODO_EFECTIVO, label: 'Efectivo', icon: Banknote, activeClass: 'bg-ink text-white shadow-card' },
            ]}
          />
        </div>

        {/* Reembolso (solo efectivo) */}
        {efectivo ? (
          <div className="animate-fade rounded-xl border border-line bg-slate-50 p-4">
            <FieldLabel>¿A quién se le debe reembolsar?</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {[...PERSONAS, 'Otro'].map((p) => (
                <Chip
                  key={p}
                  active={f.reembolsoA === p}
                  onClick={() => {
                    setReembolsoTocado(true);
                    set({ reembolsoA: p });
                  }}
                >
                  {p === 'Otro' ? 'Otro…' : p}
                </Chip>
              ))}
            </div>
            {f.reembolsoA === 'Otro' ? (
              <input
                autoFocus
                placeholder="Nombre de la persona"
                value={f.reembolsoOtro}
                onChange={(e) => set({ reembolsoOtro: e.target.value })}
                className={cx(inputClass, 'mt-2 h-10')}
              />
            ) : null}
            <FieldError>{errors.reembolsoA}</FieldError>
            <div className={cx('mt-3 flex gap-2.5 rounded-lg p-3 text-[13px] ring-1 ring-inset', info.softBox)}>
              <Info size={16} className={cx('mt-0.5 shrink-0', info.text)} />
              <p className="text-ink">
                Este pago lo asume <strong className={info.text}>{f.empresa}</strong>.{' '}
                {reembolsoFinal ? (
                  <>
                    Se sumará a lo que {f.empresa} le debe a <strong>{reembolsoFinal}</strong>
                    {montoNum > 0 ? <> (<span className="tabular-nums">{fmtMXN(montoNum)}</span>)</> : null} hasta marcarlo como
                    pagado.
                  </>
                ) : (
                  'Elige a quién se le debe para registrar el adeudo.'
                )}
              </p>
            </div>
          </div>
        ) : null}

        {/* Registrado por */}
        <div>
          <FieldLabel>Registrado por</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {REGISTRADORES.map((p) => (
              <Chip key={p} active={f.registradoPor === p} onClick={() => setRegistrador(p)}>
                {p}
              </Chip>
            ))}
          </div>
          {f.registradoPor === 'Otro' ? (
            <input
              placeholder="Nombre (opcional)"
              value={f.registradoOtro}
              onChange={(e) => set({ registradoOtro: e.target.value })}
              className={cx(inputClass, 'mt-2 h-10')}
            />
          ) : null}
        </div>

        {/* Ticket */}
        <div>
          <FieldLabel right={<TicketBadge has={Boolean(ticket)} />}>Evidencia de ticket</FieldLabel>
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          {ticket ? (
            <div className="flex items-center gap-3 rounded-xl border border-line p-2.5">
              <img src={ticket} alt="Vista previa del ticket" className="h-20 w-16 shrink-0 rounded-md border border-line object-cover" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink">Ticket adjunto</p>
                <p className="text-xs text-muted">
                  {dataUrlSizeKB(ticket) ? `JPEG comprimido · ${dataUrlSizeKB(ticket)} KB` : 'Imagen guardada'}
                </p>
                <div className="mt-1.5 flex gap-1">
                  <Button size="sm" variant="secondary" onClick={() => cameraRef.current && cameraRef.current.click()}>
                    <Camera size={14} /> Cambiar
                  </Button>
                  <Button
                    size="sm"
                    variant="dangerGhost"
                    onClick={() => {
                      setTicket(null);
                      setTicketChanged(true);
                    }}
                  >
                    <Trash2 size={14} /> Quitar
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => cameraRef.current && cameraRef.current.click()}
                disabled={processing}
                className="flex h-20 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm font-medium text-ink hover:border-slate-400 hover:bg-slate-100"
              >
                {processing ? <LoaderCircle size={20} className="animate-spin text-muted" /> : <Camera size={20} className="text-muted" />}
                {processing ? 'Comprimiendo…' : 'Tomar foto'}
              </button>
              <button
                type="button"
                onClick={() => fileRef.current && fileRef.current.click()}
                disabled={processing}
                className="flex h-20 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm font-medium text-ink hover:border-slate-400 hover:bg-slate-100"
              >
                <ImagePlus size={20} className="text-muted" />
                Subir imagen
              </button>
            </div>
          )}
          <FieldError>{imgError}</FieldError>
        </div>

        {/* Fecha */}
        <div>
          {showFecha || editing ? (
            <>
              <FieldLabel htmlFor="fecha">Fecha del ticket</FieldLabel>
              <input
                id="fecha"
                type="date"
                value={f.fecha}
                max={todayISO()}
                onChange={(e) => set({ fecha: e.target.value || todayISO() })}
                className={cx(inputClass, 'h-11')}
              />
            </>
          ) : (
            <button
              type="button"
              onClick={() => setShowFecha(true)}
              className="flex w-full items-center justify-between rounded-lg border border-line px-3 py-2.5 text-sm hover:bg-slate-50"
            >
              <span className="flex items-center gap-2 text-muted">
                <CalendarDays size={16} />
                Fecha del ticket
              </span>
              <span className="font-medium text-ink">
                {fechaRel ? `${fechaRel} · ` : ''}
                {fmtDayHeader(f.fecha)} <span className="ml-1 text-xs font-normal text-muted underline">Cambiar</span>
              </span>
            </button>
          )}
        </div>

        {errors.general ? (
          <p className="rounded-lg bg-due-soft px-3 py-2 text-sm font-medium text-due">{errors.general}</p>
        ) : null}
        <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
      </form>
    </Sheet>
  );
}
