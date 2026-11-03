-- Se ejecuta al inicializar la base de datos de analítica

CREATE TABLE analitica_tiendas (
  tienda_id                   text        PRIMARY KEY,
  total_productos             bigint      NOT NULL DEFAULT 0 CHECK (total_productos >= 0),
  total_pedidos_confirmados   bigint      NOT NULL DEFAULT 0 CHECK (total_pedidos_confirmados >= 0),
  monto_total_ventas_centavos bigint      NOT NULL DEFAULT 0 CHECK (monto_total_ventas_centavos >= 0),
  actualizado_en              timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON analitica_tiendas TO app_user;