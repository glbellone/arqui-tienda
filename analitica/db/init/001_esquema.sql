-- Base propia del servicio de Analítica (ADR-006). Guarda solo totales por tienda, nunca productos,
-- pedidos ni datos de compradores: por eso puede juntar las tiendas del pool y las Premium sin
-- romper el aislamiento de sus datos.

CREATE TABLE totales_por_tienda (
  tienda_id           text        PRIMARY KEY,
  productos           bigint      NOT NULL DEFAULT 0 CHECK (productos >= 0),
  pedidos_confirmados bigint      NOT NULL DEFAULT 0 CHECK (pedidos_confirmados >= 0),
  ventas_centavos     bigint      NOT NULL DEFAULT 0 CHECK (ventas_centavos >= 0),
  actualizado_en      timestamptz NOT NULL DEFAULT now()
);

-- Cada evento se suma una sola vez, aunque RabbitMQ lo vuelva a entregar después de un corte.
CREATE TABLE eventos_procesados (
  evento_id    uuid        PRIMARY KEY,
  tipo         text        NOT NULL,
  procesado_en timestamptz NOT NULL DEFAULT now()
);
