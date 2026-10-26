# Plataforma de Tiendas Online · TP Arquitectura de Software 1 (UNAHUR) · Escenario 4B

Plataforma SaaS multi-inquilino donde cada emprendedor tiene su tienda online.
Prioriza el **aislamiento entre tiendas** y la **escalabilidad**: las tiendas estándar comparten
una celda (pool) y cada tienda Premium tiene su propia celda (silo), con el mismo código.

## Cómo levantarlo

Requisitos: Docker con Docker Compose.

```bash
docker compose up --build
```

| Servicio | URL |
| --- | --- |
| API (gateway) | http://localhost:8000 |
| Keycloak (consola: admin / admin) | http://localhost:8080 |
| Pasarela de pagos simulada | http://localhost:4000 |
| RabbitMQ (guest / guest) | http://localhost:15672 |

Keycloak tarda unos segundos en arrancar la primera vez.

## Usuarios de prueba

| Usuario | Contraseña | Rol | Tienda |
| --- | --- | --- | --- |
| `admin` | `admin123` | admin | — |
| `duenio.t1` | `duenio123` | duenio | t1 (estándar, celda pool) |
| `duenio.t2` | `duenio123` | duenio | t2 (estándar, celda pool) |
| `duenio.p1` | `duenio123` | duenio | p1 (Premium, celda premium-a) |
| `comprador` | `comprador123` | comprador | — |

## Probar el caso de uso mínimo

Un dueño carga un producto y un comprador lo ve solo en esa tienda. Requiere `curl` y `jq`.

```bash
# 1. Login del dueño de t1 (OIDC con Keycloak)
TOKEN_T1=$(curl -s http://localhost:8080/realms/tiendas/protocol/openid-connect/token \
  -d grant_type=password -d client_id=tiendas-web \
  -d username=duenio.t1 -d password=duenio123 | jq -r .access_token)

# 2. Carga un producto en su tienda → 201
curl -i -X POST http://localhost:8000/v1/tiendas/t1/productos \
  -H "Authorization: Bearer $TOKEN_T1" -H 'Content-Type: application/json' \
  -d '{"sku": "REM-001", "nombre": "Remera de algodón", "precio": 15000}'

# 3. Un comprador lo ve en t1 (header X-Celda: pool)...
curl -i http://localhost:8000/v1/tiendas/t1/productos

# 4. ...pero no en t2, aunque viva en la misma base
curl -i http://localhost:8000/v1/tiendas/t2/productos

# 5. El dueño de t1 no puede cargar productos en t2 → 403
curl -i -X POST http://localhost:8000/v1/tiendas/t2/productos \
  -H "Authorization: Bearer $TOKEN_T1" -H 'Content-Type: application/json' \
  -d '{"sku": "X-1", "nombre": "Intruso", "precio": 1}'

# 6. La tienda Premium responde desde su propia celda (header X-Celda: premium-a)
curl -i http://localhost:8000/v1/tiendas/p1/productos
```

## Estructura

```
.
├── app/                    Monolito modular (NestJS). Se despliega en cada celda.
│   ├── db/init/            Esquema SQL con row-level security
│   └── src/
│       ├── modules/
│       │   ├── catalogo/   domain · application · infrastructure · http
│       │   ├── pagos/      Puerto + Anti-Corruption Layer hacia la pasarela
│       │   ├── tiendas/    Tiendas e inquilinos (pendiente)
│       │   └── ventas/     Carrito, pedidos y checkout (pendiente)
│       └── shared/         Base por tienda, auth OIDC, Problem Details
├── gateway/                Valida el token y rutea cada tienda a su celda
├── pasarela-mock/          Pasarela de pagos simulada con Idempotency-Key
├── infra/keycloak/         Realm con roles y usuarios de prueba
├── api/openapi.yaml        Especificación de la API
├── docs/adr/               Decisiones de arquitectura
└── docker-compose.yml      Toda la plataforma con un comando
```

## Decisiones de arquitectura

Ver [`docs/adr/`](docs/adr/). Resumen:

1. [ADR-001](docs/adr/ADR-001-modelo-de-tenancy.md): pool para tiendas estándar, silo por tienda Premium.
2. [ADR-002](docs/adr/ADR-002-estilo-monolito-modular-por-celdas.md): monolito modular desplegado por celdas.
3. [ADR-003](docs/adr/ADR-003-aislamiento-con-row-level-security.md): `tienda_id` + row-level security.
4. [ADR-004](docs/adr/ADR-004-ruteo-de-tenants-en-gateway.md): ruteo de tiendas en el gateway.
5. [ADR-005](docs/adr/ADR-005-identidad-oidc-keycloak.md): identidad OIDC con Keycloak.
6. [ADR-006](docs/adr/ADR-006-estadisticas-por-eventos.md): estadísticas por eventos Pub-Sub.
7. [ADR-007](docs/adr/ADR-007-acl-pasarela-de-pagos.md): ACL e idempotencia con la pasarela.
8. [ADR-008](docs/adr/ADR-008-stack-nestjs-postgresql.md): NestJS + PostgreSQL.
9. [ADR-009](docs/adr/ADR-009-identificacion-de-tienda-en-la-url.md): la tienda se identifica en la URL.
