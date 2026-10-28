# Tiendas online

Plataforma para que emprendedores tengan su tienda online. Cada tienda se publica en su propia
dirección y sus compradores ven solo esa tienda. El dueño la administra desde un panel dentro de la
misma tienda.

> Trabajo práctico integrador de Arquitectura de Software 1 (UNAHUR), escenario 4B.
> La documentación de arquitectura está en [`docs/`](docs/).

## Qué se puede hacer

**Como comprador**, en la tienda:

- Recorrer el catálogo, buscar productos y ordenarlos por precio o nombre.
- Ver el detalle de cada producto.
- Armar el carrito y completar los datos de la compra. El pago online todavía no está disponible.

**Como dueño**, en el panel de tu tienda (`/panel`):

- Ver un resumen de la tienda y los primeros pasos.
- Ver los productos publicados y cargar productos nuevos.
- Consultar los pedidos (todavía no hay) y los datos de la tienda y del plan.

El ingreso es con Keycloak. Un dueño solo puede administrar su propia tienda.

## Cómo levantarlo

Requisitos: Docker con Docker Compose. Para correr los tests, además, Node 20 o superior.

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

Usá Chrome o Firefox: resuelven las direcciones `*.localhost` solos, sin tocar el archivo `hosts`.

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

## Recorrido sugerido

1. Abrí [La Yerbera](http://la-yerbera.localhost:5173). Todavía no tiene productos.
2. Tocá **Ingresar** y entrá con `duenio.t1` / `duenio123`. Como sos el dueño, aparece el botón
   **Administrar tienda**.
3. En el panel, andá a **Productos → Nuevo producto**, completá los datos y publicalo. Volvé a la
   tienda: el producto ya está.
4. Abrí [Cerámica Ñandú](http://ceramica-nandu.localhost:5173). El producto no aparece y tampoco el
   botón del panel: tu usuario no administra esta tienda. Si entrás a `/panel` a mano, te frena.
5. Abrí [Sastrería Ombú](http://sastreria-ombu.localhost:5173) e ingresá con `duenio.p1`: en su
   panel aparece la marca **Plan Premium**.

Para ver qué parte del sistema atendió cada pedido, abrí la pestaña **Red** del navegador: las
respuestas de `/api/...` traen el header `X-Celda` (`pool` o `premium-a`).

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

Con la plataforma levantada, desde la raíz del repositorio:

```bash
npm test
```

Son tests de punta a punta que verifican el aislamiento entre tiendas: un producto se ve solo en su
tienda, un dueño no puede cargar productos en una tienda ajena (ni estándar ni Premium), sin
ingresar no se puede cargar nada y desde la dirección de una tienda no se llega a otra.

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
