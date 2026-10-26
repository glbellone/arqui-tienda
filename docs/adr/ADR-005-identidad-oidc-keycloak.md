# ADR-005: Identidad con OIDC (Keycloak)

- **Estado:** Propuesta
- **Fecha:** 2026-10-22

## Contexto

El TP exige OIDC con al menos 2 roles. Hay tres: administrador, dueño de tienda y comprador.

## Decisión

Vamos a usar Keycloak como proveedor OIDC, con roles de realm y un claim `tienda_id` en el token de cada dueño.

## Alternativas consideradas

- **Autenticación propia:** reinventar un subdominio genérico.
- **Proveedor en la nube:** no corre dentro del docker compose.

## Consecuencias

- Login estándar y desacoplado de la app.
- El claim `tienda_id` permite controlar que un dueño solo opere sobre su tienda.

## NFRs afectados

Favorece seguridad y mantenibilidad.
