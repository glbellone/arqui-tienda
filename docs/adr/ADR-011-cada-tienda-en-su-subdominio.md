# ADR-011: Cada tienda se publica en su propio subdominio

- **Estado:** Propuesta
- **Fecha:** 2026-10-26

## Contexto

La primera versión del frontend (ADR-010) servía todas las tiendas bajo una misma dirección
(`localhost:5173/tiendas/t1`) y la página de inicio listaba todas las tiendas, como un shopping.

En el escenario 4B eso no tiene sentido. Cada emprendedor contrata la plataforma para publicar
*su* tienda: quiere una dirección propia para compartir con sus clientes, y no que esos clientes
naveguen hacia otras tiendas, que pueden ser su competencia. Además, el bundle del frontend
tenía la lista completa de tiendas.

## Decisión

Vamos a publicar cada tienda en su propio subdominio: `{subdominio}.plataforma.com`
(en local, `la-yerbera.localhost:5173`).

- **El gateway resuelve la tienda a partir del host.** El registro de tiendas (ADR-004) pasa a
  guardar, para cada tienda, su subdominio además de su celda. Va de host a tienda, y de tienda a celda.
- **Desde el subdominio de una tienda solo se llega a esa tienda.** `GET /v1/productos` en
  `la-yerbera.localhost` se traduce a `/v1/tiendas/t1/productos`. Cualquier ruta con otro id da 404.
- **La app no cambia.** Su contrato sigue siendo `/v1/tiendas/{tiendaId}/...` (ADR-009): la
  dirección pública es una cosa y el contrato interno de la API es otra.
- **El panel de los dueños vive aparte**, en `panel.plataforma.com`. Cada dueño opera sobre la
  tienda de su token.
- **La raíz de la plataforma es una presentación**, sin listado de tiendas.
- **La SPA llama a la API en su mismo origen** (`/api`), y nginx la reenvía al gateway conservando
  el host. Así el gateway sabe de qué tienda es el pedido y no hace falta CORS.

## Alternativas consideradas

- **Tienda en el path (`plataforma.com/tiendas/t1`):** era la versión anterior. Todas las tiendas
  comparten dirección y origen, y la plataforma se ve como una vidriera compartida.
- **Dominio propio para cada tienda (`layerbera.com.ar`):** es lo ideal para el emprendedor, pero
  exige verificar el DNS y emitir un certificado TLS por cada dominio. Se descarta por ahora, y
  se puede sumar después agregando el dominio al registro, sin cambiar la app.
- **Resolver la tienda en el frontend:** la SPA leería su hostname y elegiría el id. El mapeo
  quedaría en el cliente, que tendría que conocer todas las tiendas.

## Consecuencias

- Cada tienda tiene una dirección para compartir, y sus compradores no ven otras tiendas.
- Cada tienda es un origen distinto para el navegador: cookies y almacenamiento local quedan
  separados entre tiendas. Es aislamiento también del lado del cliente.
- Sumar una tienda no requiere cambios de infraestructura: alcanza con un DNS comodín
  (`*.plataforma.com`) y un certificado comodín. En local, los navegadores resuelven `*.localhost` solos.
- El gateway responde los datos públicos de la tienda (`GET /v1/tiendas/{id}`) con su registro.
  Es una simplificación del TP hasta que exista el módulo Tiendas e Inquilinos.
- Cambiar el subdominio de una tienda rompe los enlaces viejos.
- Keycloak solo necesita aceptar el panel como destino de login. Si los compradores inician
  sesión en el futuro, cada subdominio va a tener que estar registrado en el cliente OIDC.

## NFRs afectados

Favorece el aislamiento entre tiendas (NFR estrella) y la escalabilidad, porque no hay pasos
manuales por cada tienda nueva. Agrega una responsabilidad al gateway.
