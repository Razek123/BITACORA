/**
 * Carga perezosa del generador de PDF (pdf-lib): solo se descarga
 * la primera vez que alguien pide un PDF.
 */
export async function loadPdfLib() {
  return import('pdf-lib');
}
