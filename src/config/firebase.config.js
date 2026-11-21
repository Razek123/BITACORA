/**
 * ─────────────────────────────────────────────────────────────
 *  BITÁCORA · Configuración de Firebase (único archivo a editar)
 * ─────────────────────────────────────────────────────────────
 *
 *  1. Firebase Console → ⚙ Configuración del proyecto → "Tus apps" → Web (</>)
 *  2. Copia los valores de `firebaseConfig` y pégalos abajo.
 *  3. Guarda. En cuanto `apiKey` y `projectId` tengan valor, la app deja de usar
 *     localStorage y empieza a sincronizar con Firestore automáticamente.
 *
 *  Mientras estos campos estén vacíos, la app funciona 100% local (localStorage).
 */
export const firebaseConfig = {
  apiKey: 'AIzaSyB0PEkyR6Kp8H-eecHBFtIzCCO63HKxkdo', 
  authDomain: 'bitacora-e1649.firebaseapp.com',          // ej. bitacora-lght-nuvixa.firebaseapp.com
  projectId: 'bitacora-e1649',           // ej. bitacora-lght-nuvixa
  storageBucket: 'bitacora-e1649.firebasestorage.app',       // ej. bitacora-lght-nuvixa.firebasestorage.app
  messagingSenderId: '815760238155',
  appId: '1:815760238155:web:c9b365360ee58ce1000fce',
};

/**
 * Dónde guardar la foto del ticket cuando Firebase está activo:
 *  - 'storage'   → Firebase Storage (requiere plan Blaze de pago por uso; tiene cuota gratuita).
 *  - 'firestore' → la imagen comprimida (~60–150 KB) se guarda dentro del mismo documento.
 *                  No requiere Blaze. Límite de Firestore: 1 MB por documento (sobra).
 */
export const TICKETS_EN = 'storage';

/** Nombres de las colecciones en Firestore. */
export const COLECCION_GASTOS = 'gastos';
export const COLECCION_SALIDAS = 'salidas';

/** true cuando ya pegaste tus credenciales. */
export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
