import { useEffect, useState, useCallback, useRef } from 'react';
import { LayoutDashboard, List, HandCoins, Wrench, Plus, Settings, TriangleAlert, LoaderCircle } from 'lucide-react';
import { LogoMark } from './components/Logo';
import { cx } from './components/ui';
import { ExpenseForm } from './components/ExpenseForm';
import { ExpenseDetail } from './components/ExpenseDetail';
import { Lightbox } from './components/Lightbox';
import { ConfirmDialog, MarkPaidDialog, TextFallbackDialog } from './components/Dialogs';
import { SettingsSheet } from './components/SettingsSheet';
import { ResumenView } from './views/ResumenView';
import { DesgloseView } from './views/DesgloseView';
import { ReembolsosView } from './views/ReembolsosView';
import { SalidasView } from './views/SalidasView';
import { SalidaForm } from './components/SalidaForm';
import { SalidaDetail } from './components/SalidaDetail';
import { dataService, salidasService } from './services/dataService';
import { useHashTab } from './lib/hooks';
import { DEFAULT_FILTERS, isPendiente, periodLabel } from './lib/selectors';
import { buildCSV, buildWhatsAppSummary, describeFilters, saveFile, copyText } from './lib/export';
import { fmtMXN, todayISO } from './lib/format';
import { fmtFolio, salidaStats, resumenSalidas } from './lib/salidas';
import { buildSalidaPdf } from './lib/salidaPdf';

const TABS = [
  { id: 'resumen', label: 'Resumen', icon: LayoutDashboard },
  { id: 'desglose', label: 'Desglose', icon: List },
  { id: 'reembolsos', label: 'Reembolsos', icon: HandCoins },
  { id: 'salidas', label: 'Salidas', icon: Wrench },
];

export default function App() {
  const [gastos, setGastos] = useState([]);
  const [salidas, setSalidas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [tab, setTab] = useHashTab('resumen');

  const [periodo, setPeriodo] = useState('mes');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  const [formState, setFormState] = useState(null); // { gasto?: object, key: number }
  const [detalleId, setDetalleId] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [paying, setPaying] = useState(null);
  const [fallbackText, setFallbackText] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [salidaForm, setSalidaForm] = useState(null); // { salida?: object, key: number }
  const [salidaId, setSalidaId] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  useEffect(
    () =>
      dataService.subscribe(
        (list) => {
          setGastos(list);
          setLoading(false);
        },
        (err) => {
          setLoadError(err.message || 'No se pudieron cargar los datos.');
          setLoading(false);
        },
      ),
    [],
  );

  useEffect(
    () =>
      salidasService.subscribe(
        (list) => setSalidas(list),
        (err) => setLoadError(err.message || 'No se pudieron cargar las salidas.'),
      ),
    [],
  );

  const notify = useCallback((message, tone = 'ok') => {
    setToast({ message, tone, id: Date.now() });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2800);
  }, []);

  const detalle = detalleId ? gastos.find((g) => g.id === detalleId) || null : null;
  const salidaDetalle = salidaId ? salidas.find((s) => s.id === salidaId) || null : null;

  /* ───────────── Acciones ───────────── */

  const openNew = () => setFormState({ gasto: null, key: Date.now() });
  const openEdit = (g) => {
    setDetalleId(null);
    setFormState({ gasto: g, key: Date.now() });
  };

  const handleSubmit = async (payload, ticket) => {
    if (formState && formState.gasto) {
      await dataService.update(formState.gasto.id, payload, ticket);
      notify('Cambios guardados');
    } else {
      await dataService.create(payload, ticket);
      notify(`Gasto registrado · ${payload.empresa} ${fmtMXN(payload.monto)}`);
    }
    setFormState(null);
  };

  const askDelete = (g) =>
    setConfirm({
      title: '¿Eliminar este gasto?',
      message: (
        <>
          “{g.concepto}” por <strong className="tabular-nums text-ink">{fmtMXN(g.monto)}</strong> se borrará junto con su ticket. Esta
          acción no se puede deshacer.
        </>
      ),
      confirmLabel: 'Eliminar',
      tone: 'danger',
      onConfirm: async () => {
        try {
          await dataService.remove(g.id);
          setDetalleId(null);
          notify('Gasto eliminado');
        } catch (err) {
          notify(err.message, 'error');
        }
        setConfirm(null);
      },
    });

  const confirmPaid = async (fecha) => {
    try {
      await dataService.markPaid(paying.id, fecha);
      notify(`Reembolso registrado · ${paying.reembolsoA} ${fmtMXN(paying.monto)}`);
    } catch (err) {
      notify(err.message, 'error');
    }
    setPaying(null);
  };

  const markPending = async (g) => {
    try {
      await dataService.markPending(g.id);
      notify('Marcado como pendiente');
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const exportCSV = async (list) => {
    const csv = buildCSV(list);
    const filename = `bitacora-gastos-${todayISO()}.csv`;
    const result = await saveFile(filename, csv, 'text/csv');
    if (result === 'saved') notify(`CSV exportado · ${list.length} registros`);
    else if (result === 'unavailable')
      setFallbackText({
        title: 'Exportar CSV',
        hint: 'Este navegador no permitió la descarga. Copia el contenido y pégalo en Excel o en un archivo .csv.',
        text: csv.replace(/^﻿/, ''),
      });
  };

  const copyWhatsApp = async (list) => {
    const text = buildWhatsAppSummary(list, {
      periodo: periodLabel(filters.periodo),
      filtros: describeFilters(filters),
    });
    const ok = await copyText(text);
    if (ok) notify('Resumen copiado · pégalo en WhatsApp');
    else
      setFallbackText({
        title: 'Resumen para WhatsApp',
        hint: 'Selecciona y copia el texto para pegarlo en el chat.',
        text,
      });
  };

  /* ───────────── Salidas de material y herramienta ───────────── */

  const openNewSalida = () => setSalidaForm({ salida: null, key: Date.now() });
  const openEditSalida = (s) => {
    setSalidaId(null);
    setSalidaForm({ salida: s, key: Date.now() });
  };

  const submitSalida = async (payload) => {
    if (salidaForm && salidaForm.salida) {
      await salidasService.save(salidaForm.salida.id, payload);
      notify('Vale actualizado');
      setSalidaForm(null);
      setSalidaId(salidaForm.salida.id);
    } else {
      const created = await salidasService.create(payload);
      notify(`Salida ${fmtFolio(created.folio)} registrada · ${salidaStats(created).piezas} piezas`);
      setSalidaForm(null);
      setSalidaId(created.id);
    }
  };

  const saveSalida = async (s) => {
    try {
      const before = salidaStats(salidas.find((x) => x.id === s.id) || s).pendientes;
      await salidasService.save(s.id, s);
      if (before > 0 && salidaStats(s).pendientes === 0) notify('Todo regresó · vale completo');
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const closeWithMissing = (s) =>
    setConfirm({
      title: '¿Cerrar con faltantes?',
      message: `${salidaStats(s).pendientes} piezas quedarán registradas como faltantes en el vale ${fmtFolio(s.folio)}. Puedes reabrirlo después si aparecen.`,
      confirmLabel: 'Cerrar vale',
      tone: 'danger',
      onConfirm: async () => {
        await saveSalida({ ...s, cerrada: true, fechaCierre: todayISO() });
        setConfirm(null);
        notify('Vale cerrado con faltantes');
      },
    });

  const askDeleteSalida = (s) =>
    setConfirm({
      title: '¿Eliminar este vale?',
      message: `El vale ${fmtFolio(s.folio)} (“${s.destino}”) se borrará por completo. Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
      tone: 'danger',
      onConfirm: async () => {
        try {
          await salidasService.remove(s.id);
          setSalidaId(null);
          notify('Vale eliminado');
        } catch (err) {
          notify(err.message, 'error');
        }
        setConfirm(null);
      },
    });

  const downloadSalidaPdf = async (s) => {
    try {
      const { bytes, filename } = await buildSalidaPdf(s);
      const result = await saveFile(filename, bytes, 'application/pdf');
      if (result === 'saved') notify(s ? `PDF del vale ${fmtFolio(s.folio)} listo` : 'Formato en blanco listo');
      else if (result === 'unavailable') notify('Este navegador no permitió descargar el PDF', 'error');
    } catch (err) {
      notify(err.message || 'No se pudo generar el PDF', 'error');
    }
  };

  const resetDemo = () =>
    setConfirm({
      title: '¿Restablecer datos de prueba?',
      message: 'Se reemplazarán todos los registros de este dispositivo por los datos de ejemplo.',
      confirmLabel: 'Restablecer',
      tone: 'danger',
      onConfirm: async () => {
        await dataService.resetDemo();
        setConfirm(null);
        setSettingsOpen(false);
        notify('Datos de prueba restablecidos');
      },
    });

  const clearAll = () =>
    setConfirm({
      title: '¿Borrar todos los registros?',
      message: 'Se eliminarán todos los gastos, tickets y vales de salida guardados en este dispositivo.',
      confirmLabel: 'Borrar todo',
      tone: 'danger',
      onConfirm: async () => {
        await dataService.clearAll();
        setConfirm(null);
        setSettingsOpen(false);
        notify('Registros eliminados');
      },
    });

  const pendientesCount = gastos.filter(isPendiente).length;
  const salidasResumen = resumenSalidas(salidas);
  const enSalidas = tab === 'salidas';
  const primaryAction = enSalidas ? openNewSalida : openNew;
  const primaryLabel = enSalidas ? 'Nueva salida' : 'Registrar gasto';

  const badgeFor = (id) => {
    if (id === 'reembolsos' && pendientesCount > 0) return { n: pendientesCount, due: true };
    if (id === 'salidas' && salidasResumen.abiertas > 0) return { n: salidasResumen.abiertas, due: salidasResumen.vencidas > 0 };
    return null;
  };

  const viewProps = {
    gastos,
    onOpen: (g) => setDetalleId(g.id),
    onOpenTicket: (g) => setLightbox(g),
    onEdit: openEdit,
    onDelete: askDelete,
    onMarkPaid: (g) => setPaying(g),
  };

  return (
    <div className="min-h-dvh bg-app pb-[calc(9rem+env(safe-area-inset-bottom))] text-ink md:pb-12">
      {/* Encabezado */}
      <header className="sticky top-0 z-30 border-b border-line bg-white/95 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5 md:px-6">
          <LogoMark className="h-7 w-auto shrink-0 md:h-8" />
          <div className="min-w-0 flex-1">
            <h1 className="text-[17px] font-bold leading-tight tracking-tight text-ink">Bitácora</h1>
            <p className="truncate text-[11px] text-muted md:text-xs">Control de Gastos: LGHT &amp; Nuvixa</p>
          </div>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-slate-100 hover:text-ink"
            aria-label="Datos y almacenamiento"
          >
            <Settings size={17} />
          </button>
        </div>
        {/* Pestañas escritorio */}
        <div className="mx-auto hidden max-w-6xl items-center justify-between px-6 md:flex">
          <nav className="flex gap-1" aria-label="Secciones">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cx(
                  'relative flex items-center gap-2 px-3 py-2.5 text-sm font-medium transition-colors',
                  tab === t.id ? 'text-ink' : 'text-muted hover:text-ink',
                )}
              >
                <t.icon size={16} />
                {t.label}
                {badgeFor(t.id) ? (
                  <span
                    className={cx(
                      'rounded-full px-1.5 text-[11px] font-semibold',
                      badgeFor(t.id).due ? 'bg-due-soft text-due' : 'bg-slate-100 text-ink',
                    )}
                  >
                    {badgeFor(t.id).n}
                  </span>
                ) : null}
                {tab === t.id ? <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-ink" /> : null}
              </button>
            ))}
          </nav>
          <button
            type="button"
            onClick={primaryAction}
            className="my-1.5 inline-flex h-9 items-center gap-1.5 rounded-lg bg-ink px-4 text-sm font-medium text-white shadow-card hover:bg-slate-700"
          >
            <Plus size={16} /> {primaryLabel}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-4 md:px-6 md:py-6">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-24 text-sm text-muted">
            <LoaderCircle size={18} className="animate-spin" /> Cargando gastos…
          </div>
        ) : loadError ? (
          <div className="mx-auto max-w-md rounded-xl border border-due/30 bg-due-soft p-4 text-sm text-due">
            <p className="flex items-center gap-2 font-semibold">
              <TriangleAlert size={16} /> No se pudieron cargar los datos
            </p>
            <p className="mt-1">{loadError}</p>
          </div>
        ) : tab === 'resumen' ? (
          <ResumenView
            gastos={gastos}
            salidas={salidas}
            periodo={periodo}
            setPeriodo={setPeriodo}
            onGoTo={setTab}
            onNew={openNew}
          />
        ) : tab === 'desglose' ? (
          <DesgloseView {...viewProps} filters={filters} setFilters={setFilters} onExportCSV={exportCSV} onCopyWhatsApp={copyWhatsApp} />
        ) : tab === 'reembolsos' ? (
          <ReembolsosView {...viewProps} />
        ) : (
          <SalidasView
            salidas={salidas}
            onOpen={(s) => setSalidaId(s.id)}
            onNew={openNewSalida}
            onPdf={downloadSalidaPdf}
            onBlankPdf={() => downloadSalidaPdf(null)}
          />
        )}
      </main>

      {/* Botón flotante (celular) */}
      <button
        type="button"
        onClick={primaryAction}
        className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-4 z-30 inline-flex h-12 items-center gap-2 rounded-full bg-ink pl-4 pr-5 text-[15px] font-semibold text-white shadow-fab active:scale-[0.98] md:hidden"
      >
        <Plus size={20} strokeWidth={2.5} /> {primaryLabel}
      </button>

      {/* Navegación inferior (celular) */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
        aria-label="Secciones"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cx('relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium', tab === t.id ? 'text-ink' : 'text-muted')}
          >
            {tab === t.id ? <span className="absolute inset-x-5 top-0 h-0.5 rounded-full bg-ink" /> : null}
            <span className="relative">
              <t.icon size={21} strokeWidth={tab === t.id ? 2.25 : 1.75} />
              {badgeFor(t.id) ? (
                <span
                  className={cx(
                    'absolute -right-2.5 -top-1.5 min-w-4 rounded-full px-1 text-center text-[10px] font-semibold leading-4 text-white',
                    badgeFor(t.id).due ? 'bg-due' : 'bg-ink',
                  )}
                >
                  {badgeFor(t.id).n}
                </span>
              ) : null}
            </span>
            {t.label}
          </button>
        ))}
      </nav>

      {/* Capas */}
      {formState ? (
        <ExpenseForm key={formState.key} open gasto={formState.gasto} onClose={() => setFormState(null)} onSubmit={handleSubmit} />
      ) : null}
      {detalle ? (
        <ExpenseDetail
          gasto={detalle}
          onClose={() => setDetalleId(null)}
          onOpenTicket={setLightbox}
          onEdit={openEdit}
          onDelete={askDelete}
          onMarkPaid={setPaying}
          onMarkPending={markPending}
        />
      ) : null}
      {salidaForm ? (
        <SalidaForm
          key={salidaForm.key}
          salida={salidaForm.salida}
          salidas={salidas}
          onClose={() => setSalidaForm(null)}
          onSubmit={submitSalida}
        />
      ) : null}
      {salidaDetalle ? (
        <SalidaDetail
          salida={salidaDetalle}
          onClose={() => setSalidaId(null)}
          onSave={saveSalida}
          onEdit={openEditSalida}
          onDelete={askDeleteSalida}
          onPdf={downloadSalidaPdf}
          onCloseWithMissing={closeWithMissing}
        />
      ) : null}
      {paying ? <MarkPaidDialog gasto={paying} onCancel={() => setPaying(null)} onConfirm={confirmPaid} /> : null}
      {confirm ? <ConfirmDialog {...confirm} onCancel={() => setConfirm(null)} /> : null}
      {fallbackText ? <TextFallbackDialog {...fallbackText} onClose={() => setFallbackText(null)} /> : null}
      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        count={gastos.length}
        countSalidas={salidas.length}
        onResetDemo={resetDemo}
        onClearAll={clearAll}
      />
      <Lightbox gasto={lightbox} onClose={() => setLightbox(null)} />

      {toast ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(8.5rem+env(safe-area-inset-bottom))] z-[70] flex justify-center px-4 md:bottom-8">
          <div
            key={toast.id}
            role="status"
            className={cx(
              'animate-pop rounded-lg px-4 py-2.5 text-sm font-medium text-white shadow-sheet',
              toast.tone === 'error' ? 'bg-due' : 'bg-ink',
            )}
          >
            {toast.message}
          </div>
        </div>
      ) : null}
    </div>
  );
}
