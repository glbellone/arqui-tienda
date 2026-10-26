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
- La SPA corre en otro origen, así que el gateway habilita CORS.
- El navegador no sabe en qué celda vive cada tienda: lo resuelve el gateway. La SPA solo muestra el header `X-Celda` para la demo.
- SEO limitado, aceptable para el TP.

## NFRs afectados

Favorece usabilidad y mantenibilidad. Agrega un contenedor más.
