/** Una tienda en el registro: dónde se publica, en qué celda vive y sus datos públicos. */
export interface TiendaRegistrada {
  subdominio: string;
  celda: string;
  nombre: string;
  rubro: string;
  plan: 'Estándar' | 'Premium';
  color: string;
  /** mudandose: se está pasando a otra celda; mientras tanto el gateway frena las escrituras (ADR-012). */
  estado: 'activa' | 'mudandose';
}

/** Lo que devuelve el servicio de Tiendas: las tiendas y la URL de cada celda. */
interface Instantanea {
  tiendas: Record<string, TiendaRegistrada>;
  celdas: Record<string, string>;
}

/**
 * Registro tienda → subdominio y celda (ADR-004 y ADR-011). Su dueño es el servicio de Tiendas
 * (ADR-012): el gateway guarda una copia en memoria y la refresca cada pocos segundos. Si el
 * servicio no responde, sigue ruteando con la última copia buena.
 */
export class Registro {
  private porId = new Map<string, TiendaRegistrada>();
  private idPorSubdominio = new Map<string, string>();
  private urlsDeCeldas = new Map<string, string>();
  private cargado = false;

  constructor(
    private readonly url: string,
    private readonly intervaloMs: number,
  ) {}

  /** Empieza a leer el registro y lo vuelve a leer cada `intervaloMs`. */
  iniciar(): void {
    const leer = () =>
      this.actualizar().catch((error) => console.warn(`No se pudo leer el registro de tiendas: ${String(error)}`));
    void leer();
    setInterval(leer, this.intervaloMs).unref();
  }

  private async actualizar(): Promise<void> {
    const res = await fetch(`${this.url}/interno/registro`, { signal: AbortSignal.timeout(this.intervaloMs) });
    if (!res.ok) throw new Error(`respondió ${res.status}`);
    const { tiendas, celdas } = (await res.json()) as Instantanea;

    this.porId = new Map(Object.entries(tiendas));
    this.idPorSubdominio = new Map([...this.porId].map(([id, t]) => [t.subdominio.toLowerCase(), id]));
    this.urlsDeCeldas = new Map(Object.entries(celdas));
    this.cargado = true;
  }

  /** false hasta la primera lectura: recién arrancado, el gateway todavía no sabe rutear. */
  get listo(): boolean {
    return this.cargado;
  }

  buscar(id: string): TiendaRegistrada | undefined {
    return this.porId.get(id);
  }

  idDelSubdominio(subdominio: string): string | undefined {
    return this.idPorSubdominio.get(subdominio.toLowerCase());
  }

  urlDeCelda(celda: string): string | undefined {
    return this.urlsDeCeldas.get(celda);
  }

  celdas(): string[] {
    return [...this.urlsDeCeldas.keys()];
  }
}

/** Subdominios de la plataforma que no son tiendas. */
const RESERVADOS = new Set(['www', 'api']);

/**
 * Devuelve el subdominio de tienda del host, o undefined si el pedido llega a un host de la
 * plataforma (localhost, www.localhost, etc.). El puerto se ignora.
 */
export function subdominioDeTienda(host: string | undefined, dominioBase: string): string | undefined {
  if (!host) return undefined;
  const nombre = host.toLowerCase().replace(/:\d+$/, '');
  const sufijo = `.${dominioBase.toLowerCase()}`;
  if (!nombre.endsWith(sufijo)) return undefined;
  const subdominio = nombre.slice(0, -sufijo.length);
  if (!subdominio || subdominio.includes('.') || RESERVADOS.has(subdominio)) return undefined;
  return subdominio;
}
