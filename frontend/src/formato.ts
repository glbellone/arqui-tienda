/** Helpers de formato y presentación, sin dependencias de React. */

const pesosEnteros = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
const pesosConCentavos = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 });

export function formatearMonto(monto: number, moneda = 'ARS'): string {
  if (moneda !== 'ARS') return `${moneda} ${monto.toLocaleString('es-AR')}`;
  return Number.isInteger(monto) ? pesosEnteros.format(monto) : pesosConCentavos.format(monto);
}

export const formatearPrecio = (precio: { monto: number; moneda: string }) => formatearMonto(precio.monto, precio.moneda);

const CONECTORES = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'y', 'e', 'con', 'para', 'en', 'a', 'al', 'por']);

/**
 * Iniciales de un nombre: "La Yerbera" → "LY". Con `sinConectores`, saltea palabras como "de" o "y":
 * "Termo de acero" → "TA".
 */
export function iniciales(texto: string, maximo = 2, sinConectores = false): string {
  const palabras = texto
    .split(/\s+/)
    .map((p) => p.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter((p) => p && !(sinConectores && CONECTORES.has(p.toLowerCase())));
  const letras = palabras.slice(0, maximo).map((p) => p[0]!.toUpperCase());
  return letras.join('') || '·';
}

/** Hash chico y estable, para variar el aspecto de cada producto sin guardar nada. */
export function hash(texto: string): number {
  let h = 0;
  for (let i = 0; i < texto.length; i++) h = (Math.imul(31, h) + texto.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export const plural = (n: number, singular: string, plurales: string) => `${n} ${n === 1 ? singular : plurales}`;

/** Sugiere un SKU a partir del nombre: "Mate imperial de calabaza" → "MATE-IMPE-482". */
export function sugerirSku(nombre: string): string {
  const base = nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.slice(0, 4))
    .join('-');
  if (!base) return '';
  return `${base}-${String(hash(nombre) % 1000).padStart(3, '0')}`;
}

/** Copia al portapapeles, con un plan B para navegadores sin la API moderna. */
export async function copiar(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    const area = document.createElement('textarea');
    area.value = texto;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  }
}

export const sinProtocolo = (url: string) => url.replace(/^https?:\/\//, '');
