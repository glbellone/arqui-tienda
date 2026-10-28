# ADR-010: Frontend como SPA en React

- **Estado:** Propuesta
- **Fecha:** 2026-10-26

## Contexto

Compradores y dueños necesitan una interfaz web: la vitrina de cada tienda y el panel para cargar productos. La lógica de negocio ya vive en la API, detrás del gateway.

## Decisión

Vamos a construir una SPA en React + TypeScript (Vite), servida por nginx, que consume la API del gateway y hace login OIDC contra Keycloak con Authorization Code + PKCE.

## Alternativas consideradas

- **MPA con render en el servidor:** acopla la interfaz al backend y habría que renderizar en cada celda.
- **App móvil o híbrida:** fuera del alcance del TP.

## Consecuencias

- Clara separación cliente-servidor: la interfaz no tiene reglas de negocio, solo muestra datos y captura acciones.
- Un mismo build sirve dos sitios según el host: la presentación de la plataforma y cada tienda, con su vitrina en `/` y el panel de su dueño en `/panel` (ver ADR-011).
- La SPA llama a la API en su mismo origen (`/api`) y nginx la reenvía al gateway, así que no hace falta CORS.
- El navegador no sabe en qué celda vive cada tienda: lo resuelve el gateway.
- La interfaz no muestra conceptos de la arquitectura ni de la plataforma: el comprador no ve el plan de la tienda, la celda que la atiende ni el nombre de la plataforma. Solo el dueño ve, en su panel, si su plan es Premium. La celda viaja en el header `X-Celda`, visible en la pestaña Red del navegador para la demo.
- La interfaz simula una aplicación real: la tienda tiene búsqueda, detalle de producto, carrito y checkout, y el panel del dueño tiene menú de navegación con inicio, productos, pedidos y datos de la tienda. Lo que todavía no tiene backend (fotos de productos, pago, pedidos) se resuelve con imágenes generadas, estados vacíos o avisos, sin inventar datos.
- El carrito vive en el navegador (localStorage). Como cada tienda es un origen distinto, cada una tiene su propio carrito. Cuando exista el módulo Ventas, el checkout lo convierte en un pedido.
- SEO limitado, aceptable para el TP.

## NFRs afectados

Favorece usabilidad y mantenibilidad. Agrega un contenedor más.
