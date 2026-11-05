import { request } from 'node:http';

/** Lo que se usa de `docker inspect` de un contenedor. */
export interface ContenedorInspeccionado {
  Id: string;
  Name: string;
  /** El id de la imagen (sha256:…), no su nombre. */
  Image: string;
  Config: { Env: string[] | null; Labels: Record<string, string> | null };
  Mounts: { Type: string; Source: string; Destination: string; RW: boolean }[];
  NetworkSettings: { Networks: Record<string, unknown> };
}

/** Un contenedor tal como lo devuelve el listado. */
export interface ContenedorListado {
  Id: string;
  Names: string[];
  Labels: Record<string, string>;
  State: string;
}

/** Lo mínimo para crear un contenedor: el cuerpo de POST /containers/create. */
export interface ConfigContenedor {
  Image: string;
  Env: string[];
  Labels: Record<string, string>;
  HostConfig: { Binds?: string[]; RestartPolicy: { Name: string } };
  NetworkingConfig: { EndpointsConfig: Record<string, { Aliases: string[] }> };
}

export class ErrorDeDocker extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Cliente mínimo de la API de Docker (ADR-012), por el socket del host montado en el contenedor.
 * Se usa node:http con socketPath para no sumar dependencias. En producción las celdas las crearía
 * Terraform; acá alcanza con esto para mostrar el aprovisionamiento automático.
 */
export class Docker {
  constructor(private readonly socketPath = process.env.DOCKER_SOCKET ?? '/var/run/docker.sock') {}

  /** Contenedores (también los frenados) que tienen todos los labels indicados, como `clave=valor` o solo `clave`. */
  listarPorLabel(...labels: string[]): Promise<ContenedorListado[]> {
    const filtros = encodeURIComponent(JSON.stringify({ label: labels }));
    return this.pedir('GET', `/containers/json?all=true&filters=${filtros}`) as Promise<ContenedorListado[]>;
  }

  inspeccionar(id: string): Promise<ContenedorInspeccionado> {
    return this.pedir('GET', `/containers/${encodeURIComponent(id)}/json`) as Promise<ContenedorInspeccionado>;
  }

  /** Crea el contenedor (sin arrancarlo) y devuelve su id. */
  async crear(nombre: string, config: ConfigContenedor): Promise<string> {
    const { Id } = (await this.pedir('POST', `/containers/create?name=${encodeURIComponent(nombre)}`, config)) as { Id: string };
    return Id;
  }

  async arrancar(id: string): Promise<void> {
    await this.pedir('POST', `/containers/${encodeURIComponent(id)}/start`);
  }

  /** Lo frena si hace falta y lo borra junto con sus volúmenes anónimos (los datos de la base). */
  async borrar(id: string): Promise<void> {
    try {
      await this.pedir('DELETE', `/containers/${encodeURIComponent(id)}?force=true&v=true`);
    } catch (error) {
      if (error instanceof ErrorDeDocker && error.status === 404) return; // ya no estaba
      throw error;
    }
  }

  private pedir(metodo: string, ruta: string, cuerpo?: unknown): Promise<unknown> {
    const datos = cuerpo === undefined ? undefined : JSON.stringify(cuerpo);
    return new Promise((resolver, rechazar) => {
      const req = request(
        {
          socketPath: this.socketPath,
          path: ruta,
          method: metodo,
          headers: datos === undefined ? {} : { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(datos) },
        },
        (res) => {
          let texto = '';
          res.setEncoding('utf8');
          res.on('data', (parte) => (texto += parte));
          res.on('end', () => {
            const status = res.statusCode ?? 0;
            let json: unknown = null;
            try {
              json = texto ? JSON.parse(texto) : null;
            } catch {
              json = null;
            }
            if (status >= 200 && status < 300) return resolver(json);
            const mensaje = (json as { message?: string } | null)?.message ?? texto;
            rechazar(new ErrorDeDocker(status, `Docker respondió ${status} a ${metodo} ${ruta.split('?')[0]}: ${mensaje}`));
          });
          res.on('error', rechazar);
        },
      );
      req.setTimeout(30_000, () => req.destroy(new Error(`Docker no respondió a ${metodo} ${ruta.split('?')[0]}`)));
      req.on('error', rechazar);
      if (datos !== undefined) req.write(datos);
      req.end();
    });
  }
}
