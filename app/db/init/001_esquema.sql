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

-- ADR-007: pedidos del checkout. Mismo aislamiento por tienda que los productos.
CREATE TABLE pedidos (
  id                 uuid        PRIMARY KEY,
  tienda_id          text        NOT NULL,
  clave_idempotencia text        NOT NULL,
  huella             text        NOT NULL,  -- hash de los items: detecta la misma clave con otro carrito
  estado             text        NOT NULL DEFAULT 'PENDIENTE'
                     CHECK (estado IN ('PENDIENTE','PAGADO','RECHAZADO')),
  total_centavos     bigint      NOT NULL CHECK (total_centavos >= 0),
  moneda             char(3)     NOT NULL,
  pago_referencia    text,
  -- Datos del checkout: a quién se le entrega el pedido.
  comprador_nombre   text        NOT NULL,
  comprador_email    text        NOT NULL,
  comprador_telefono text,
  envio_direccion    text        NOT NULL,
  envio_ciudad       text        NOT NULL,
  envio_codigo_postal text       NOT NULL,
  creado_en          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tienda_id, clave_idempotencia)
);

CREATE TABLE pedido_items (
  pedido_id       uuid   NOT NULL REFERENCES pedidos(id),
  tienda_id       text   NOT NULL,
  producto_id     uuid   NOT NULL,
  nombre          text   NOT NULL,   -- copia al momento de la compra
  cantidad        int    NOT NULL CHECK (cantidad > 0),
  precio_centavos bigint NOT NULL CHECK (precio_centavos >= 0),
  PRIMARY KEY (pedido_id, producto_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON productos    TO app_user;
GRANT SELECT, INSERT, UPDATE         ON pedidos      TO app_user;
GRANT SELECT, INSERT                 ON pedido_items TO app_user;

-- ADR-003: la base filtra por la tienda activa de la sesión, aunque el código se olvide del filtro.
ALTER TABLE productos    ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos    FORCE  ROW LEVEL SECURITY;
ALTER TABLE pedidos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos      FORCE  ROW LEVEL SECURITY;
ALTER TABLE pedido_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_items FORCE  ROW LEVEL SECURITY;

CREATE POLICY aislamiento_por_tienda ON productos
  USING      (tienda_id = current_setting('app.tienda_id', true))
  WITH CHECK (tienda_id = current_setting('app.tienda_id', true));

CREATE POLICY aislamiento_por_tienda ON pedidos
  USING      (tienda_id = current_setting('app.tienda_id', true))
  WITH CHECK (tienda_id = current_setting('app.tienda_id', true));

CREATE POLICY aislamiento_por_tienda ON pedido_items
  USING      (tienda_id = current_setting('app.tienda_id', true))
  WITH CHECK (tienda_id = current_setting('app.tienda_id', true));
