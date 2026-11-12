# ADR-006: Estadísticas de plataforma por eventos (Publish-Subscribe)

- **Estado:** Aceptada
- **Fecha:** 2026-10-22 (implementación: 2026-11-03)

## Contexto

La regla de negocio 2 pide métricas de todas las tiendas, pero las Premium están en bases físicamente separadas.

## Decisión

Vamos a publicar eventos de negocio (producto creado, pedido confirmado) desde cada celda a un broker (RabbitMQ). Un servicio de Analítica los consume y guarda solo agregados, visibles únicamente para el Administrador.

Cómo se implementó:

- **Las celdas publican a través de un puerto.** El caso de uso llama a `PublicadorDeEventos` (capa de aplicación); el adaptador de RabbitMQ publica en el exchange `eventos`, de tipo topic, con el tipo de evento como clave. Catálogo publica `producto.creado` y Ventas, `pedido.confirmado` cuando la pasarela aprueba el pago. Ninguno sabe que existe Analítica.
- **Analítica es un servicio aparte** (`analitica/`), con su contenedor y su propia base. Enlaza su cola `analitica` al exchange y suma totales por tienda: productos, pedidos confirmados y ventas. No guarda productos, pedidos ni datos de compradores.
- **Entrega al menos una vez.** Analítica confirma cada mensaje recién después de guardarlo. Si RabbitMQ lo reenvía, lo descarta por su `eventoId`.
- **Solo el administrador ve las estadísticas** (`GET /v1/admin/estadisticas`, rol `admin`). El gateway deriva `/v1/admin/` a Analítica solo desde el dominio de la plataforma, nunca desde el subdominio de una tienda.

## Alternativas consideradas

- **Consultar todas las bases desde un reporte:** rompe el aislamiento y acopla al esquema de cada celda.
- **Un módulo de Analítica dentro de la app:** fue el primer intento. Como la app corre en cada celda, cada celda tenía su propia tabla de totales y competía con las demás por los mensajes de la misma cola, así que los totales quedaban repartidos. Además obligaba a consultar la base sin fijar la tienda activa, saltando la seguridad por fila (ADR-003).

## Consecuencias

- Las celdas no conocen a Analítica: si mañana otro servicio necesita los mismos eventos, enlaza su propia cola al exchange.
- Las estadísticas tienen consistencia eventual: un producto nuevo aparece en los totales unos instantes después.
- Si RabbitMQ no está, las celdas siguen atendiendo y reintentan publicar. Si una celda se reinicia antes de publicar, ese evento se pierde; un outbox (guardar el evento en la misma transacción que el producto) lo evitaría y queda como mejora.
- Hay dos componentes más que operar: el broker y el servicio de Analítica con su base.

## NFRs afectados

Favorece aislamiento y escalabilidad: las celdas no comparten base con Analítica y un problema en el broker no afecta a las tiendas. Agrega un broker que operar.
