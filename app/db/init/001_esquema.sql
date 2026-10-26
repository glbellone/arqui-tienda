-- Se ejecuta al crear cada base (pool y Premium): todas las celdas tienen el mismo esquema.

-- La app se conecta con un usuario sin privilegios de dueño, para que row-level security aplique siempre.
CREATE ROLE app_user LOGIN PASSWORD 'app_pass';

CREATE TABLE productos (
  id              uuid        PRIMARY KEY,
  tienda_id       text        NOT NULL,
  sku             text        NOT NULL,
  nombre          text        NOT NULL,
  precio_centavos bigint      NOT NULL CHECK (precio_centavos >= 0),
  moneda          char(3)     NOT NULL,
  creado_en       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tienda_id, sku)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON productos TO app_user;

-- ADR-003: la base filtra por la tienda activa de la sesión, aunque el código se olvide del filtro.
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos FORCE ROW LEVEL SECURITY;

CREATE POLICY aislamiento_por_tienda ON productos
  USING      (tienda_id = current_setting('app.tienda_id', true))
  WITH CHECK (tienda_id = current_setting('app.tienda_id', true));
