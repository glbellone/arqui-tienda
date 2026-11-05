-- Registro de la plataforma (ADR-012): qué celdas hay, qué tiendas existen y en qué celda vive cada una.
-- Es uno solo para toda la plataforma; el gateway lo lee para rutear (ADR-004 y ADR-011).

CREATE TABLE celdas (
  nombre     text        PRIMARY KEY,                -- pool, premium-a, premium-t100…
  tipo       text        NOT NULL CHECK (tipo IN ('pool', 'premium')),
  url_app    text        NOT NULL,                   -- a dónde rutea el gateway
  host_db    text        NOT NULL,                   -- la base de la celda, para las mudanzas
  -- true si la creó este servicio con la API de Docker; las de docker-compose no se tocan.
  dinamica   boolean     NOT NULL DEFAULT false,
  creada_en  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE tiendas (
  id         text        PRIMARY KEY CHECK (id ~ '^[a-z0-9-]{1,40}$'),
  subdominio text        NOT NULL UNIQUE CHECK (subdominio ~ '^[a-z0-9](-?[a-z0-9])*$'),
  nombre     text        NOT NULL,
  rubro      text        NOT NULL,
  color      text        NOT NULL,
  plan       text        NOT NULL CHECK (plan IN ('Estándar', 'Premium')),
  celda      text        NOT NULL REFERENCES celdas (nombre),
  -- mudandose: la tienda se está pasando a otra celda y el gateway frena las escrituras.
  estado     text        NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa', 'mudandose')),
  creada_en  timestamptz NOT NULL DEFAULT now()
);

-- Ids de las tiendas nuevas: t100, t101…
CREATE SEQUENCE numero_de_tienda START 100;

-- Las celdas que levanta docker-compose y las tiendas de ejemplo.
INSERT INTO celdas (nombre, tipo, url_app, host_db) VALUES
  ('pool',      'pool',    'http://app-pool:3000',      'db-pool'),
  ('premium-a', 'premium', 'http://app-premium-a:3000', 'db-premium-a');

INSERT INTO tiendas (id, subdominio, nombre, rubro, color, plan, celda) VALUES
  ('t1', 'la-yerbera',     'La Yerbera',     'Yerbas, mates y bombillas', '#C98A12', 'Estándar', 'pool'),
  ('t2', 'ceramica-nandu', 'Cerámica Ñandú', 'Vajilla hecha a mano',      '#24806F', 'Estándar', 'pool'),
  ('p1', 'sastreria-ombu', 'Sastrería Ombú', 'Indumentaria a medida',     '#6D3FD0', 'Premium',  'premium-a');
