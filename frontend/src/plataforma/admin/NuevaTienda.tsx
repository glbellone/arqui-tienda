import { useState, type CSSProperties, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { admin, aProblema, type Problema, type TiendaCreada } from '../../api';
import AvisoError from '../../componentes/AvisoError';
import Icono from '../../componentes/Icono';
import Monograma from '../../componentes/Monograma';
import { useToast } from '../../componentes/Toasts';
import { copiar, sugerirSubdominio } from '../../formato';
import { useTitulo } from '../../hooks/useTitulo';
import EncabezadoPagina from '../../panel/Encabezado';
import EnlaceTienda from '../../panel/EnlaceTienda';
import { NOMBRE_PLATAFORMA } from '../marca';

const COLORES = ['#C98A12', '#24806F', '#6D3FD0', '#C2410C', '#1D4ED8', '#BE185D', '#4D7C0F'];

/** Dominio donde se publican las tiendas, para mostrar cómo va a quedar la dirección. */
const DOMINIO = `.${window.location.host}`;

/**
 * Alta de una tienda (ADR-012): se crea en la celda compartida, con plan Estándar, y su dueño queda
 * listo para ingresar. La contraseña inicial se muestra una sola vez.
 */
export default function NuevaTienda() {
  useTitulo(`Nueva tienda · ${NOMBRE_PLATAFORMA}`);
  const [creada, setCreada] = useState<TiendaCreada | null>(null);

  return (
    <>
      <EncabezadoPagina
        antes={
          <Link to="/admin/tiendas" className="volver">
            <Icono nombre="izquierda" medida={16} />
            Tiendas
          </Link>
        }
        titulo={creada ? 'Tienda creada' : 'Nueva tienda'}
        descripcion={creada ? 'Pasale estos datos al dueño para que ingrese a su panel.' : 'Empieza con el plan Estándar, en la celda compartida.'}
      />
      {creada ? <Credenciales creada={creada} alCrearOtra={() => setCreada(null)} /> : <Formulario alCrear={setCreada} />}
    </>
  );
}

function Formulario({ alCrear }: { alCrear: (creada: TiendaCreada) => void }) {
  const [nombre, setNombre] = useState('');
  const [subdominio, setSubdominio] = useState('');
  const [subdominioEditado, setSubdominioEditado] = useState(false);
  const [rubro, setRubro] = useState('');
  const [color, setColor] = useState(COLORES[0]);
  const [duenio, setDuenio] = useState({ nombre: '', email: '' });
  const [enviando, setEnviando] = useState(false);
  const [errorSubdominio, setErrorSubdominio] = useState<string | null>(null);
  const [error, setError] = useState<Problema | null>(null);

  function cambiarNombre(valor: string) {
    setNombre(valor);
    if (!subdominioEditado) setSubdominio(sugerirSubdominio(valor));
  }

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    setErrorSubdominio(null);
    try {
      alCrear(await admin.crearTienda({ nombre: nombre.trim(), subdominio, rubro: rubro.trim(), color, duenio }));
    } catch (err) {
      const problema = aProblema(err);
      // Un subdominio repetido es un error del campo, no del formulario entero.
      if (problema.status === 409 && problema.detail.includes('subdominio')) setErrorSubdominio(problema.detail);
      else setError(problema);
      setEnviando(false);
    }
  }

  return (
    <div className="grilla-formulario">
      <form className="tarjeta formulario" onSubmit={enviar}>
        {error && <AvisoError problema={error} />}

        <label className="campo">
          <span>Nombre de la tienda</span>
          <input className="control" value={nombre} onChange={(e) => cambiarNombre(e.target.value)} placeholder="Ej.: Vivero La Glicina" required maxLength={80} autoFocus />
        </label>

        <label className="campo">
          <span>Subdominio</span>
          <span className="control-con-sufijo">
            <input
              className={`control texto-mono ${errorSubdominio ? 'control-error' : ''}`}
              value={subdominio}
              onChange={(e) => {
                setSubdominio(e.target.value.toLowerCase());
                setSubdominioEditado(true);
                setErrorSubdominio(null);
              }}
              required
              minLength={3}
              maxLength={40}
              pattern="[a-z0-9](-?[a-z0-9])*"
              aria-invalid={!!errorSubdominio}
              aria-describedby="ayuda-subdominio"
            />
            <span className="sufijo texto-mono">{DOMINIO}</span>
          </span>
          <small id="ayuda-subdominio" className={errorSubdominio ? 'error-campo' : 'ayuda'}>
            {errorSubdominio ?? 'Letras minúsculas, números y guiones. Es la dirección que el dueño comparte con sus clientes.'}
          </small>
        </label>

        <label className="campo">
          <span>Rubro</span>
          <input className="control" value={rubro} onChange={(e) => setRubro(e.target.value)} placeholder="Ej.: Plantas y macetas" required maxLength={80} />
        </label>

        <fieldset className="campo">
          <legend>Color</legend>
          <div className="selector-color">
            {COLORES.map((c) => (
              <button
                key={c}
                type="button"
                className={`muestra-color ${c === color ? 'muestra-color-elegida' : ''}`}
                style={{ background: c }}
                onClick={() => setColor(c)}
                aria-label={`Color ${c}`}
                aria-pressed={c === color}
              />
            ))}
          </div>
        </fieldset>

        <hr />
        <div className="campos-2">
          <label className="campo">
            <span>Nombre del dueño</span>
            <input className="control" value={duenio.nombre} onChange={(e) => setDuenio({ ...duenio, nombre: e.target.value })} autoComplete="off" required maxLength={80} />
          </label>
          <label className="campo">
            <span>Email del dueño</span>
            <input className="control" type="email" value={duenio.email} onChange={(e) => setDuenio({ ...duenio, email: e.target.value })} autoComplete="off" required />
            <small className="ayuda">Con este email ingresa a su panel.</small>
          </label>
        </div>

        <div className="formulario-acciones">
          <Link to="/admin/tiendas" className="boton boton-fantasma">
            Cancelar
          </Link>
          <button type="submit" className="boton" disabled={enviando}>
            {enviando ? <span className="girando" aria-hidden="true" /> : <Icono nombre="check" medida={16} />}
            {enviando ? 'Creando…' : 'Crear tienda'}
          </button>
        </div>
      </form>

      <aside className="vista-previa" aria-label="Vista previa">
        <span className="vista-previa-titulo">Así se va a ver</span>
        <div className="tarjeta vista-previa-tienda" style={{ '--acento': color } as CSSProperties}>
          <Monograma nombre={nombre.trim() || 'Tienda'} medida="grande" />
          <strong>{nombre.trim() || 'Nombre de la tienda'}</strong>
          <span className="texto-suave">{rubro.trim() || 'Rubro'}</span>
          <span className="texto-mono texto-suave">{(subdominio || 'subdominio') + DOMINIO}</span>
        </div>
      </aside>
    </div>
  );
}

function Credenciales({ creada, alCrearOtra }: { creada: TiendaCreada; alCrearOtra: () => void }) {
  const toast = useToast();
  const { tienda, duenio } = creada;

  async function copiarDatos() {
    const texto = `Tu tienda ${tienda.nombre} ya está online: ${tienda.url}\nPanel: ${tienda.url}/panel\nUsuario: ${duenio.usuario}\nContraseña: ${duenio.clave}`;
    if (await copiar(texto)) toast({ tipo: 'exito', titulo: 'Datos copiados', detalle: 'Mandáselos al dueño de la tienda.' });
  }

  return (
    <div className="tarjeta credenciales">
      <div className="aviso aviso-info" role="status">
        <Icono nombre="alerta" medida={20} />
        <div className="aviso-texto">
          <strong>Guardá la contraseña ahora</strong>
          <p>Es la única vez que se muestra. El dueño ingresa con estos datos en el panel de su tienda.</p>
        </div>
      </div>
      <dl className="credenciales-datos">
        <div>
          <dt>Tienda</dt>
          <dd>{tienda.nombre}</dd>
        </div>
        <div>
          <dt>Usuario</dt>
          <dd className="texto-mono">{duenio.usuario}</dd>
        </div>
        <div>
          <dt>Contraseña</dt>
          <dd className="texto-mono">{duenio.clave}</dd>
        </div>
      </dl>
      <EnlaceTienda url={tienda.url} />
      <div className="formulario-acciones">
        <button type="button" className="boton boton-fantasma" onClick={alCrearOtra}>
          Crear otra
        </button>
        <button type="button" className="boton boton-secundario" onClick={copiarDatos}>
          <Icono nombre="copiar" medida={16} />
          Copiar datos para el dueño
        </button>
        <Link to="/admin/tiendas" className="boton">
          Ver tiendas
        </Link>
      </div>
    </div>
  );
}
