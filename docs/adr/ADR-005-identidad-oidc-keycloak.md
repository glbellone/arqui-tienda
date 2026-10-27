# ADR-005: Identidad con OIDC (Keycloak)

- **Estado:** Propuesta
- **Fecha:** 2026-10-22

## Contexto

El TP exige OIDC con al menos 2 roles. Hay tres: administrador, dueño de tienda y comprador.

## Decisión

Vamos a usar Keycloak como proveedor OIDC, con roles de realm y un claim `tienda_id` en el token de cada dueño.

El login se hace siempre en la pantalla de Keycloak (Authorization Code + PKCE), con un tema propio
(`infra/keycloak/themes/vidriera`) que le da la identidad visual de la plataforma.

## Alternativas consideradas

- **Autenticación propia:** reinventar un subdominio genérico.
- **Proveedor en la nube:** no corre dentro del docker compose.
- **Formulario de login propio en la SPA (password grant):** la pantalla quedaría integrada, pero la
  SPA vería la contraseña del usuario, que es justamente lo que OIDC evita. Ese flujo está
  desaconsejado por las buenas prácticas de seguridad de OAuth y se elimina en OAuth 2.1. Además se
  perderían el inicio de sesión único entre tiendas, el segundo factor y la recuperación de
  contraseña que resuelve Keycloak. Para que el login no se vea ajeno, se usa un tema propio.

## Consecuencias

- Login estándar y desacoplado de la app.
- La contraseña la ve únicamente Keycloak: la SPA y la API solo reciben tokens.
- El usuario sale del sitio de la tienda para ingresar. El tema propio hace que esa pantalla se vea
  como parte de la plataforma, y es la misma para todas las tiendas, porque las cuentas son de la plataforma.
- El claim `tienda_id` permite controlar que un dueño solo opere sobre su tienda.

## NFRs afectados

Favorece seguridad y mantenibilidad.
