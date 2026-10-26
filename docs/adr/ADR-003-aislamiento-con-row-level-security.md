# ADR-003: Aislamiento de datos en el pool con tienda_id y row-level security

- **Estado:** Propuesta
- **Fecha:** 2026-10-22

## Contexto

Miles de tiendas estándar comparten una base. Un filtro olvidado en una consulta expondría datos de otra tienda.

## Decisión

Vamos a guardar `tienda_id` en cada tabla y activar row-level security en PostgreSQL. Cada transacción fija la tienda activa (`app.tienda_id`) y la base filtra por ella. La app se conecta con un usuario sin privilegios de dueño.

## Alternativas consideradas

- **Solo filtro en el código:** un error de programación lo rompe.
- **Un esquema por tienda:** miles de esquemas que migrar.

## Consecuencias

- Doble barrera de aislamiento: el código y la base.
- Toda consulta tiene que ejecutarse dentro de `TenantDb.conTienda()`.

## NFRs afectados

Favorece seguridad y aislamiento. Agrega algo de complejidad en la capa de datos.
