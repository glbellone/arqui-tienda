# ADR-004: Ruteo de tenants en el API Gateway

- **Estado:** Aceptada
- **Fecha:** 2026-10-22

## Contexto

Cada request tiene que llegar a la celda correcta (pool o silo Premium) sin que el cliente lo sepa.

## Decisión

Vamos a resolver la tienda en el API Gateway y rutear a la celda que figura en el registro de tiendas.

## Alternativas consideradas

- **Que cada cliente conozca la URL de su celda:** acopla al cliente con la infraestructura.

## Consecuencias

- Mover una tienda a Premium es cambiar un registro.
- El gateway es un componente crítico y debe estar replicado.
- El registro ya no es un archivo del gateway: lo provee el servicio de Tiendas e Inquilinos (ADR-012). El gateway lo lee cada 2 segundos, guarda una copia en memoria y, si el servicio no responde, sigue ruteando con la última copia buena.
- Mientras una tienda se muda de celda (ADR-012), el gateway rechaza sus escrituras con 503 y `Retry-After`.
- Desde ADR-011, el registro también guarda el subdominio de cada tienda: el gateway resuelve la tienda a partir del host.

## NFRs afectados

Favorece escalabilidad y aislamiento. El gateway es un punto único de falla a mitigar.
