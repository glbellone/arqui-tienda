import { Link } from 'react-router-dom';

export default function NoEncontrada() {
  return (
    <section>
      <h1 className="titulo">Esta página no existe</h1>
      <p className="bajada">
        <Link to="/">Volver a las tiendas</Link>
      </p>
    </section>
  );
}
