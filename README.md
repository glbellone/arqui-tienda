# Tiendas online

Plataforma para que emprendedores tengan su tienda online. Cada tienda se publica en su propia
dirección y sus compradores ven solo esa tienda. El dueño la administra desde un panel dentro de la
misma tienda.

> Trabajo práctico integrador de Arquitectura de Software 1 (UNAHUR), escenario 4B.
> La documentación de arquitectura está en [`docs/`](docs/).

## Requisitos

- Docker con Docker Compose.
- Node 20 o superior, solo para correr los tests.
- Chrome o Firefox: resuelven las direcciones `*.localhost` de las tiendas sin tocar el archivo `hosts`.

## Cómo levantarlo

```bash
docker compose up --build
```

La primera vez tarda unos minutos, porque construye las imágenes. Keycloak necesita unos segundos
más que el resto para estar listo.

### Tiendas de prueba

| Tienda | Dirección | Plan |
| --- | --- | --- |
| La Yerbera | http://la-yerbera.localhost:5173 | Estándar |
| Cerámica Ñandú | http://ceramica-nandu.localhost:5173 | Estándar |
| Sastrería Ombú | http://sastreria-ombu.localhost:5173 | Premium |

El panel de cada tienda está en `/panel`, por ejemplo http://la-yerbera.localhost:5173/panel.

### Otros servicios

| Servicio | Dirección |
| --- | --- |
| Página de la plataforma | http://localhost:5173 |
| API | http://localhost:8000 |
| Keycloak (consola: `admin` / `admin`) | http://localhost:8080 |
| Pasarela de pagos simulada | http://localhost:4000 |
| RabbitMQ (`guest` / `guest`) | http://localhost:15672 |

### Usuarios de prueba

| Usuario | Contraseña | Qué puede hacer |
| --- | --- | --- |
| `duenio.t1` | `duenio123` | Administra La Yerbera |
| `duenio.t2` | `duenio123` | Administra Cerámica Ñandú |
| `duenio.p1` | `duenio123` | Administra Sastrería Ombú |
| `comprador` | `comprador123` | Compra en las tiendas |
| `admin` | `admin123` | Administra la plataforma (todavía sin pantallas propias) |

### Comandos útiles

| Para | Comando |
| --- | --- |
| Levantar todo | `docker compose up --build` |
| Aplicar cambios de código de un servicio | `docker compose up -d --build <servicio>` |
| Aplicar cambios en usuarios o roles de Keycloak | `docker compose down && docker compose up --build` |
| Ver los logs de un servicio | `docker compose logs -f <servicio>` |
| Bajar todo | `docker compose down` |

Los servicios son `frontend`, `gateway`, `app-pool`, `app-premium-a`, `db-pool`, `db-premium-a`,
`keycloak`, `pasarela-mock` y `rabbitmq`.

Keycloak importa usuarios y roles solo al crear su contenedor: por eso esos cambios necesitan el
`down`. Los cambios en el diseño de la pantalla de login, en cambio, se ven con solo recargar.

## Usar la API

La especificación está en [`api/openapi.yaml`](api/openapi.yaml). Los errores llegan en formato
Problem Details. Este ejemplo necesita `curl` y `jq`:

```bash
# Ingresar como dueño de La Yerbera y obtener un token
TOKEN=$(curl -s http://localhost:8080/realms/tiendas/protocol/openid-connect/token \
  -d grant_type=password -d client_id=tiendas-web \
  -d username=duenio.t1 -d password=duenio123 | jq -r .access_token)

# Cargar un producto en su tienda → 201
curl -i -X POST http://localhost:8000/v1/tiendas/t1/productos \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"sku": "MATE-001", "nombre": "Mate de calabaza", "precio": 15000}'

# Verlo como comprador, desde la dirección de la tienda
curl -i -H 'Host: la-yerbera.localhost' http://localhost:8000/v1/productos

# En otra tienda no aparece
curl -i -H 'Host: ceramica-nandu.localhost' http://localhost:8000/v1/productos

# Intentar cargar en una tienda ajena → 403
curl -i -X POST http://localhost:8000/v1/tiendas/t2/productos \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"sku": "X-1", "nombre": "Intruso", "precio": 1}'
```

## Tests

```bash
npm test
```

Levanta la plataforma si hace falta y corre los tests de aislamiento entre tiendas.

## Estructura del repositorio

```
.
├── frontend/           Sitio web: cada tienda (vitrina y panel del dueño) y la página de la plataforma
├── app/                Backend (NestJS), un módulo por área: catálogo, tiendas, ventas y pagos
│   └── db/init/        Esquema de la base de datos
├── gateway/            Puerta de entrada de la API: identifica la tienda y deriva el pedido
├── pasarela-mock/      Pasarela de pagos simulada
├── infra/keycloak/     Usuarios, roles y diseño de la pantalla de login
├── api/                Especificación OpenAPI
├── tests/aislamiento/  Tests de punta a punta
├── docs/               Documentación de arquitectura
└── docker-compose.yml  Toda la plataforma con un comando
```

## Tecnologías

React con Vite, NestJS, PostgreSQL, Keycloak, Express, RabbitMQ y Docker Compose.
