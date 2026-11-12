# ADR-013: Sequelize como ORM de la app

- **Estado:** Aceptada
- **Fecha:** 2026-11-12

## Contexto

La app (Catálogo y Ventas) accedía a la base con `pg` y SQL escrito a mano en cada repositorio: el
mapeo entre filas y agregados, y el armado de cada consulta, quedaban a cargo de quien programa.
Además, el ADR-003 pide que toda consulta pase por `TenantDb.conTienda()`, pero eso dependía de la
disciplina: una consulta que se olvidara de hacerlo salía sin `app.tienda_id` y row-level security
devolvía cero filas sin dar error.

## Decisión

Vamos a usar Sequelize 6 como ORM de la app, solo en la capa de infraestructura:

- **Puerto y adaptador:** el dominio y los casos de uso no cambian. `SequelizeProductoRepository` y
  `SequelizePedidoRepository` implementan los mismos puertos que antes, y un mapper por módulo traduce
  entre los modelos de Sequelize y los agregados (`Producto`, `Pedido`).
- **El esquema sigue en SQL:** las tablas, las restricciones, el rol `app_user`, el usuario `migrador`
  y las políticas de RLS los crea `app/db/init/001_esquema.sql` al levantar cada base. Sequelize solo
  lee y escribe: nunca se llama a `sync()`. Es el mismo script que usan las celdas Premium nuevas y
  el que el servicio de Tiendas necesita para mudar datos (ADR-012).
- **Tenancy:** `TenantDb.conTienda()` abre una transacción gestionada y fija `app.tienda_id` con
  `set_config(..., true)`. RLS sigue haciendo el filtrado.
- **Guarda:** cada modelo registra hooks (`exigirTransaccionDeTienda`) que rechazan cualquier
  operación fuera de una transacción creada por `conTienda()`. Así una consulta olvidada da un error
  claro en vez de devolver cero filas.
- **Modelos por módulo:** cada módulo define sus modelos sobre la conexión compartida; el núcleo
  (`shared/db`) no conoce a ningún módulo de negocio.
- **Alcance:** solo la app. Tiendas y Analítica siguen con `pg`: tienen pocas consultas, fijas, y
  Tiendas trabaja con el usuario `migrador` sobre tablas de otra base.
- **Pool:** configurable con `DB_POOL_MAX`, `DB_POOL_IDLE_MS` y `DB_POOL_ACQUIRE_MS`. Si falta
  `DB_URL`, la app no arranca.

## Alternativas consideradas

- **Seguir con `pg` directo:** sin dependencia extra, pero el mapeo y las consultas quedan a mano y
  no hay forma simple de exigir que todo pase por `conTienda()`.
- **TypeORM:** se integra con los decoradores de NestJS, pero sus entidades con decoradores tienden a
  mezclarse con el dominio, y la transacción con la tienda activa se maneja con un `QueryRunner`
  aparte.
- **Prisma:** genera un cliente tipado, pero define el esquema en su propio archivo: sería una
  segunda fuente de verdad además del SQL, que no expresa roles ni políticas de RLS.
- **Que Sequelize cree el esquema (`sync()`):** se probó en la primera versión de esta rama. Se
  descartó porque `sync()` no modifica tablas existentes, el SQL de roles y RLS igual había que
  escribirlo a mano, y el servicio de Tiendas depende del script para crear celdas Premium.
- **CLS (`Sequelize.useCLS`) en lugar de pasar la transacción:** evita pasar `{ transaction }`,
  pero agrega magia implícita y una dependencia; preferimos explícito más guarda.

## Consecuencias

- Cada consulta de un modelo debe recibir `{ transaction: tx }`; si no, la guarda lanza un error.
- Las consultas con `sequelize.query` directo no pasan por la guarda; deben usarse solo dentro de
  `conTienda()`.
- Un cambio de esquema se hace en el SQL y en el modelo a la vez. Como el script solo corre con la
  base vacía, todavía no hay migraciones versionadas: conviene sumarlas cuando haya que cambiar
  tablas con datos.
- Los modelos de Sequelize no salen de infraestructura: cambiar de ORM solo toca ese directorio.

## NFRs afectados

Favorece mantenibilidad y aislamiento (guarda adicional sobre el ADR-003). Agrega una dependencia y
algo de complejidad en la capa de datos.
