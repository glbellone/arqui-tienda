# ADR-009: La tienda se identifica en la URL

- **Estado:** Propuesta
- **Fecha:** 2026-10-22

## Contexto

El gateway necesita saber a qué tienda va cada request para elegir la celda. Los compradores navegan sin estar logueados, así que no siempre hay token.

## Decisión

Vamos a identificar la tienda en el path de la API (`/v1/tiendas/{tiendaId}/...`).

## Alternativas consideradas

- **Por subdominio (`t1.plataforma.com`):** es lo natural en producción, pero complica la demo local.
- **Por claim del token:** los compradores anónimos no tienen token.

## Consecuencias

- Funciona igual para compradores anónimos y para dueños.
- La app verifica que el `tienda_id` del token del dueño coincida con el de la URL.
- En producción el subdominio se puede traducir a este path en el gateway sin cambiar la app. Eso es lo que hace ADR-011: la dirección pública de cada tienda es su subdominio, y este path queda como contrato interno de la API.

## NFRs afectados

Favorece aislamiento y simplicidad.
