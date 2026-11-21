/**
 * Adaptador Firebase (Firestore + Storage + Auth anónima).
 * Se carga solo cuando src/config/firebase.config.js tiene credenciales.
 */
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  onSnapshot,
  query,
  orderBy,
  runTransaction,
} from 'firebase/firestore';
import { getStorage, ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import * as cfg from '../config/firebase.config';

const { firebaseConfig, TICKETS_EN, COLECCION_GASTOS } = cfg;
// Compatible con un firebase.config.js anterior que no tenga esta constante
const COLECCION_SALIDAS = cfg.COLECCION_SALIDAS || 'salidas';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = TICKETS_EN === 'storage' ? getStorage(app) : null;
const gastosRef = collection(db, COLECCION_GASTOS);

let authPromise = null;
function ensureAuth() {
  if (!authPromise) {
    authPromise = auth.currentUser
      ? Promise.resolve(auth.currentUser)
      : signInAnonymously(auth).then((cred) => cred.user);
    authPromise.catch(() => {
      authPromise = null; // permite reintentar
    });
  }
  return authPromise;
}

async function saveTicket(id, dataUrl) {
  if (TICKETS_EN === 'storage') {
    const fileRef = ref(storage, `tickets/${id}.jpg`);
    await uploadString(fileRef, dataUrl, 'data_url', { contentType: 'image/jpeg' });
    return { ticketImagen: await getDownloadURL(fileRef), ticketPath: fileRef.fullPath };
  }
  // Modo sin Storage: la imagen comprimida vive dentro del documento
  return { ticketImagen: dataUrl, ticketPath: null };
}

async function deleteTicket(path) {
  if (!path || !storage) return;
  try {
    await deleteObject(ref(storage, path));
  } catch {
    /* ya no existía */
  }
}

export const firebaseAdapter = {
  name: 'firebase',
  label: 'Sincronizado con Firebase',
  canReset: false, // nunca borrar datos compartidos desde un botón

  subscribe(onData, onError) {
    let unsub = () => {};
    let cancelled = false;
    ensureAuth()
      .then(() => {
        if (cancelled) return;
        unsub = onSnapshot(
          query(gastosRef, orderBy('fecha', 'desc')),
          (snap) => {
            const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            list.sort((a, b) => (a.fecha !== b.fecha ? (a.fecha < b.fecha ? 1 : -1) : (b.createdAt || 0) - (a.createdAt || 0)));
            onData(list);
          },
          (err) => onError(new Error(`Firestore: ${err.message}`)),
        );
      })
      .catch((err) => onError(new Error(`No se pudo iniciar sesión en Firebase: ${err.message}`)));
    return () => {
      cancelled = true;
      unsub();
    };
  },

  async create(gasto, ticketDataUrl) {
    const user = await ensureAuth();
    const docRef = doc(gastosRef); // genera id
    const now = Date.now();
    const ticket = ticketDataUrl ? await saveTicket(docRef.id, ticketDataUrl) : { ticketImagen: null, ticketPath: null };
    const record = { ...gasto, ...ticket, createdAt: now, updatedAt: now, createdBy: user.uid };
    await setDoc(docRef, record);
    return { id: docRef.id, ...record };
  },

  async update(id, patch, ticket) {
    await ensureAuth();
    const docRef = doc(gastosRef, id);
    const data = { ...patch, updatedAt: Date.now() };
    if (ticket !== undefined) {
      const current = await getDoc(docRef);
      const prevPath = current.exists() ? current.data().ticketPath : null;
      if (ticket === null) {
        await deleteTicket(prevPath);
        Object.assign(data, { ticketImagen: null, ticketPath: null });
      } else {
        Object.assign(data, await saveTicket(id, ticket));
      }
    }
    await updateDoc(docRef, data);
  },

  async remove(id) {
    await ensureAuth();
    const docRef = doc(gastosRef, id);
    const current = await getDoc(docRef);
    if (current.exists()) await deleteTicket(current.data().ticketPath);
    await deleteDoc(docRef);
  },
};

/* ───────────────────── Salidas de material y herramienta ───────────────────── */

const salidasRef = collection(db, COLECCION_SALIDAS);
const contadorSalidasRef = doc(db, 'contadores', 'salidas');

export const firebaseSalidasAdapter = {
  subscribe(onData, onError) {
    let unsub = () => {};
    let cancelled = false;
    ensureAuth()
      .then(() => {
        if (cancelled) return;
        unsub = onSnapshot(
          query(salidasRef, orderBy('fechaSalida', 'desc')),
          (snap) => {
            const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            list.sort((a, b) =>
              a.fechaSalida !== b.fechaSalida ? (a.fechaSalida < b.fechaSalida ? 1 : -1) : (b.folio || 0) - (a.folio || 0),
            );
            onData(list);
          },
          (err) => onError(new Error(`Firestore (salidas): ${err.message}`)),
        );
      })
      .catch((err) => onError(new Error(`No se pudo iniciar sesión en Firebase: ${err.message}`)));
    return () => {
      cancelled = true;
      unsub();
    };
  },

  /** Crea el vale con folio consecutivo (S-0001, S-0002…) usando una transacción. */
  async create(salida) {
    const user = await ensureAuth();
    const docRef = doc(salidasRef);
    const now = Date.now();
    const record = await runTransaction(db, async (tx) => {
      const counter = await tx.get(contadorSalidasRef);
      const folio = (counter.exists() ? Number(counter.data().ultimo) || 0 : 0) + 1;
      tx.set(contadorSalidasRef, { ultimo: folio });
      const data = { ...salida, folio, createdAt: now, updatedAt: now, createdBy: user.uid };
      tx.set(docRef, data);
      return data;
    });
    return { id: docRef.id, ...record };
  },

  async update(id, patch) {
    await ensureAuth();
    await updateDoc(doc(salidasRef, id), { ...patch, updatedAt: Date.now() });
  },

  async remove(id) {
    await ensureAuth();
    await deleteDoc(doc(salidasRef, id));
  },
};
