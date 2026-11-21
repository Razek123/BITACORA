/**
 * Compresión de tickets en el cliente vía Canvas.
 * Máx. 800 px de ancho, JPEG calidad 0.7 → normalmente 60–150 KB por foto.
 */
export const TICKET_MAX_WIDTH = 800;
export const TICKET_QUALITY = 0.7;

export async function compressImage(file, { maxWidth = TICKET_MAX_WIDTH, quality = TICKET_QUALITY } = {}) {
  if (!file || !/^image\//.test(file.type || 'image/')) {
    throw new Error('El archivo no es una imagen.');
  }
  const source = await loadImageSource(file);
  const width = source.width || source.naturalWidth;
  const height = source.height || source.naturalHeight;
  if (!width || !height) throw new Error('No se pudo leer la imagen.');

  const scale = Math.min(1, maxWidth / width);
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#FFFFFF'; // fondo blanco para PNG con transparencia
  ctx.fillRect(0, 0, w, h);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, w, h);
  if (typeof source.close === 'function') source.close();

  return canvas.toDataURL('image/jpeg', quality);
}

async function loadImageSource(file) {
  if (typeof window.createImageBitmap === 'function') {
    try {
      // Respeta la orientación EXIF de las fotos del celular.
      return await window.createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      /* Safari antiguo: usa <img> */
    }
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo leer la imagen (formato no compatible).'));
    };
    img.src = url;
  });
}

/** Tamaño aproximado en KB de un data URL base64. */
export function dataUrlSizeKB(dataUrl) {
  if (!dataUrl || !dataUrl.startsWith('data:')) return null;
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  return Math.round((base64.length * 3) / 4 / 1024);
}
