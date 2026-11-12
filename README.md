# Tiendas online

Plataforma para que emprendedores tengan su tienda online. Cada tienda se publica en su propia
dirección y sus compradores ven solo esa tienda. El dueño la administra desde un panel dentro de la
misma tienda.

> Trabajo práctico integrador de Arquitectura de Software 1 (UNAHUR), escenario 4B.
> El documento de arquitectura está en [`docs/arquitectura.pdf`](docs/arquitectura.pdf).

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
| Administración de la plataforma (`admin` / `admin123`): tiendas, solicitudes de Premium y estadísticas | http://localhost:5173/admin |
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
| `admin` | `admin123` | Administra la plataforma: da de alta y de baja tiendas, aprueba los pases a Premium y ve las estadísticas |

### Comandos útiles

| Para | Comando |
| --- | --- |
| Levantar todo | `docker compose up --build` |
| Aplicar cambios de código de un servicio | `docker compose up -d --build <servicio>` |
| Aplicar cambios en usuarios o roles de Keycloak | `docker compose down && docker compose up --build` |
| Ver los logs de un servicio | `docker compose logs -f <servicio>` |
| Frenar todo sin perder datos | `docker compose stop` (y después `docker compose up -d`) |
| Borrar todo y empezar de cero | `docker compose down -v --remove-orphans` |

## Tests

```bash
npm test
```

Levanta la plataforma si hace falta y corre los tests de aislamiento entre tiendas, checkout,
estadísticas, alta y baja de tiendas y pase a Premium. El de Premium crea una celda nueva y muda la
tienda, así que tarda un par de minutos. Para empezar de cero: `docker compose down -v --remove-orphans && npm test`.

## Estructura del repositorio

```
.
├── frontend/           Sitio web: cada tienda (vitrina y panel del dueño) y la página de la plataforma
├── app/                Backend (NestJS), un módulo por área: catálogo, ventas y pagos
│   ├── db/init/        Esquema de la base de datos (SQL)
│   └── src/shared/db/  Conexión con Sequelize y aislamiento por tienda
├── gateway/            Puerta de entrada de la API: identifica la tienda y deriva el pedido
├── tiendas/            Registro de tiendas y celdas: alta y baja de tiendas y pase a Premium
├── analitica/          Estadísticas de la plataforma: escucha los eventos de RabbitMQ
├── pasarela-mock/      Pasarela de pagos simulada
├── infra/keycloak/     Usuarios, roles y diseño de la pantalla de login
├── api/                Especificación OpenAPI
├── tests/aislamiento/  Tests de punta a punta
├── docs/               Documento de arquitectura (PDF)
└── docker-compose.yml  Toda la plataforma con un comando
```

## Tecnologías

React con Vite, NestJS, PostgreSQL con Sequelize, Keycloak, Express, RabbitMQ y Docker Compose.
