# Bitácora · Control de Gastos: LGHT & Nuvixa

Micro-app web (mobile-first) para registrar, separar y auditar los gastos compartidos de **LGHT** (pistas de baile) y **Nuvixa** (enmarcado), y para controlar la **salida y regreso de material y herramienta** con vales imprimibles en PDF.

**Stack:** React 18 · Tailwind CSS 4 · Lucide React · Recharts · pdf-lib · Vite · (opcional) Firebase Firestore + Storage + Auth anónima.

---

## 1. Correr en tu computadora (1 minuto)

```bash
npm install
npm run dev
```

Abre la URL que muestra la terminal. `--host` ya viene activado: desde tu celular, en la misma red Wi-Fi, abre la dirección `http://192.168.x.x:5173` que aparece.

Sin configurar nada, la app usa **localStorage** y carga datos de prueba. Para borrarlos: ⚙ (arriba a la derecha) → *Borrar todos los registros*.

---

## 2. Conectar Firebase y compartir el link (≈5 minutos)

### 2.1 Crear el proyecto
1. Entra a <https://console.firebase.google.com> → **Agregar proyecto** (ej. `bitacora-lght-nuvixa`).
2. En la página del proyecto, haz clic en el ícono **Web `</>`**, ponle nombre "Bitácora" y **copia el objeto `firebaseConfig`**.

### 2.2 Activar los servicios
| Servicio | Dónde | Qué hacer |
|---|---|---|
| **Authentication** | Compilación → Authentication → Método de acceso | Habilita **Anónimo** |
| **Firestore** | Compilación → Firestore Database | **Crear base de datos** → modo producción → región cercana |
| **Storage** *(opcional)* | Compilación → Storage | **Comenzar**. Requiere el plan **Blaze** (pago por uso, con cuota gratuita). |

> **¿No quieres activar Blaze?** En `src/config/firebase.config.js` cambia `TICKETS_EN = 'storage'` por `TICKETS_EN = 'firestore'`. Las fotos (ya comprimidas a ~60–150 KB) se guardan dentro de cada documento de Firestore, que sí funciona en el plan gratuito.

### 2.3 Pegar la configuración
Abre **`src/config/firebase.config.js`** y pega tus valores:

```js
export const firebaseConfig = {
  apiKey: 'AIza...',
  authDomain: 'bitacora-lght-nuvixa.firebaseapp.com',
  projectId: 'bitacora-lght-nuvixa',
  storageBucket: 'bitacora-lght-nuvixa.firebasestorage.app',
  messagingSenderId: '1234567890',
  appId: '1:1234567890:web:abc123',
};
```

Listo: en cuanto `apiKey` y `projectId` tienen valor, la app deja localStorage y sincroniza en tiempo real con Firestore. **No hay que tocar ningún otro archivo.**

### 2.4 Publicar (Firebase Hosting)
```bash
npm install -g firebase-tools
firebase login
firebase use --add            # elige tu proyecto (o edita .firebaserc)
npm run build
firebase deploy               # sube la app + reglas de Firestore y Storage
```
Si usas `TICKETS_EN = 'firestore'` (sin Storage):
```bash
firebase deploy --only hosting,firestore
```

Firebase te dará un link como **`https://bitacora-lght-nuvixa.web.app`**: compártelo con tu jefe y el equipo. En el celular: *Compartir → Agregar a pantalla de inicio* para usarla como app.

### 2.5 (Alternativa) Publicar en GitHub Pages
El proyecto incluye `.github/workflows/deploy.yml`, que compila y publica la app sola cada vez que subes cambios.

1. Crea un repositorio **público** en GitHub (ej. `bitacora`). GitHub Pages gratis requiere repositorio público.
2. Sube **todo** el contenido de esta carpeta, incluida la carpeta oculta `.github`:
   ```bash
   git init
   git add .
   git commit -m "Bitácora"
   git branch -M main
   git remote add origin https://github.com/TU-USUARIO/bitacora.git
   git push -u origin main
   ```
   (o con GitHub Desktop: *File → Add local repository → Publish repository*, desmarcando "Keep this code private").
3. En el repo: **Settings → Pages → Source: GitHub Actions**.
4. Ve a la pestaña **Actions**: cuando el proceso termine en verde, tu app estará en `https://TU-USUARIO.github.io/bitacora/`.

Las reglas de Firestore se siguen publicando desde Firebase (`firebase deploy --only firestore` o pegándolas en la consola). La `apiKey` de Firebase puede quedar visible en el repo: no es secreta, los datos los protegen las reglas.

### Seguridad
- Las reglas (`firestore.rules`, `storage.rules`) exigen sesión (la app inicia sesión anónima sola) y validan cada gasto: empresa, método, monto > 0, concepto y fecha.
- Cualquier persona con el link puede ver y registrar gastos. Para un control más estricto, el siguiente paso es cambiar la sesión anónima por inicio con Google y limitar las reglas a una lista de correos.

---

## 3. Arquitectura

```
src/
├── config/
│   └── firebase.config.js      ← ÚNICO archivo a editar para conectar Firebase
├── services/
│   ├── dataService.js          ← fachada: la UI solo habla con este módulo
│   ├── localStorageAdapter.js  ← persistencia local (por defecto)
│   ├── firebaseAdapter.js      ← Firestore + Storage + Auth anónima (se carga bajo demanda)
│   └── imageService.js         ← compresión Canvas: máx. 800 px, JPEG 0.7
├── lib/
│   ├── constants.js            ← empresas, colores, categorías, personas
│   ├── format.js               ← MXN ($1,250.00), fechas locales
│   ├── selectors.js            ← totales, agrupaciones, filtros
│   ├── export.js               ← CSV para Excel y texto para WhatsApp
│   ├── salidas.js              ← estados de vales de salida (fuera, parcial, consumido, faltante)
│   ├── salidaPdf.js            ← PDF tamaño carta del vale y formato en blanco
│   └── pdfEngine.js            ← carga pdf-lib solo cuando se pide un PDF
│   └── hooks.js
├── data/seed.js                ← datos de prueba
├── components/                 ← UI reutilizable (formulario, detalle, visor, gráficas…)
├── views/                      ← Resumen · Desglose · Reembolsos · Salidas
└── App.jsx
```

Ambos adaptadores implementan la misma interfaz, así que cambiar de backend no toca la UI:

```js
subscribe(onData, onError) → unsubscribe
create(gasto, ticketDataUrl)
update(id, patch, ticket)   // ticket: undefined = sin cambio · null = quitar · dataURL = nuevo
remove(id)
```

### Estructura de cada gasto
```js
{
  id, fecha: 'YYYY-MM-DD', empresa: 'LGHT' | 'Nuvixa',
  concepto, categoria, monto,                    // monto en MXN (número)
  metodoPago: 'Tarjeta de Crédito' | 'Efectivo',
  registradoPor: 'Raziel' | 'Ema' | 'Santiago' | 'Otro' | nombre,
  reembolsoA,                                    // solo efectivo
  estadoReembolso: 'Pendiente' | 'Pagado',       // solo efectivo
  fechaPago,                                     // al marcar pagado
  ticketImagen,                                  // dataURL (local/firestore) o URL de Storage
  createdAt, updatedAt
}
```

### Estructura de cada vale de salida
```js
{
  id, folio,                                     // folio consecutivo: S-0001, S-0002…
  empresa: 'LGHT' | 'Nuvixa', destino, responsable, autorizo,
  fechaSalida, regresoEstimado, notas,
  items: [{ id, nombre, tipo: 'Herramienta' | 'Material', cantidad, devuelto, consumido, nota }],
  cerrada, fechaCierre,                          // cierre manual con faltantes
  fechaCompleta,                                 // se llena sola cuando todo regresó
  createdAt, updatedAt
}
```
Con Firebase, el folio se asigna con una transacción sobre `contadores/salidas` para que nunca se repita.

### Personalizar
- **Personas:** `PERSONAS` en `src/lib/constants.js`.
- **Categorías:** `CATEGORIAS` en el mismo archivo.
- **Colores:** bloque `@theme` en `src/index.css`.
