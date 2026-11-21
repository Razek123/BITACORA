export const EMPRESAS = ['LGHT', 'Nuvixa'];

export const EMPRESA_INFO = {
  LGHT: {
    nombre: 'LGHT',
    giro: 'Pistas de baile',
    color: '#1D4ED8',
    soft: '#EFF6FF',
    // Clases completas (no dinámicas) para que Tailwind las detecte al compilar.
    badge: 'bg-lght-soft text-lght ring-lght/20',
    solid: 'bg-lght text-white ring-lght',
    dot: 'bg-lght',
    text: 'text-lght',
    softBox: 'bg-lght-soft ring-lght/15',
  },
  Nuvixa: {
    nombre: 'Nuvixa',
    giro: 'Enmarcado',
    color: '#C2410C',
    soft: '#FFF7ED',
    badge: 'bg-nuvixa-soft text-nuvixa ring-nuvixa/20',
    solid: 'bg-nuvixa text-white ring-nuvixa',
    dot: 'bg-nuvixa',
    text: 'text-nuvixa',
    softBox: 'bg-nuvixa-soft ring-nuvixa/15',
  },
};

export const CATEGORIAS = [
  'Materiales',
  'Transporte/Gasolina',
  'Comidas/Viáticos',
  'Herramienta',
  'Proveedores',
  'Otros',
];

export const METODO_TARJETA = 'Tarjeta de Crédito';
export const METODO_EFECTIVO = 'Efectivo';
export const METODOS = [METODO_TARJETA, METODO_EFECTIVO];
export const METODO_CORTO = { [METODO_TARJETA]: 'Tarjeta', [METODO_EFECTIVO]: 'Efectivo' };

export const PERSONAS = ['Raziel', 'Ema', 'Santiago'];
export const REGISTRADORES = [...PERSONAS, 'Otro'];

export const ESTADO_PENDIENTE = 'Pendiente';
export const ESTADO_PAGADO = 'Pagado';

export const PALETTE = {
  bg: '#F4F5F7',
  card: '#FFFFFF',
  border: '#E2E8F0',
  grid: '#EEF2F6',
  text: '#1E293B',
  muted: '#64748B',
  ok: '#15803D',
  due: '#B91C1C',
  lght: '#1D4ED8',
  nuvixa: '#C2410C',
};

export const PERIODOS = [
  { id: 'hoy', label: 'Hoy' },
  { id: 'semana', label: 'Esta semana' },
  { id: 'mes', label: 'Este mes' },
  { id: 'todo', label: 'Todo' },
];
