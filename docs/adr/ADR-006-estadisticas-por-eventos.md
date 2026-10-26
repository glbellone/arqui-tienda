# ADR-006: Estadísticas de plataforma por eventos (Publish-Subscribe)

- **Estado:** Propuesta
- **Fecha:** 2026-10-22

## Contexto

La regla de negocio 2 pide métricas de todas las tiendas, pero las Premium están en bases físicamente separadas.

## Decisión

Vamos a publicar eventos de negocio (producto creado, pedido confirmado) desde cada celda a un broker (RabbitMQ). Un servicio de Analítica los consume y guarda solo agregados, visibles únicamente para el Administrador.

## Alternativas consideradas

- **Consultar todas las bases desde un reporte:** rompe el aislamiento y acopla al esquema de cada celda.

## Consecuencias

- Las celdas no conocen a Analítica.
- Las estadísticas tienen consistencia eventual.

## NFRs afectados

Favorece aislamiento y escalabilidad. Agrega un broker que operar.
