# ADR-012: Sequelize como ORM de la capa de datos

- **Estado:** Propuesta
- **Fecha:** 2026-11-05

## Contexto

El sistema es un monolito modular desplegado en celdas. La capa de datos usaba `pg` con SQL escrito a mano en el repositorio, y el esquema se definía en un script SQL que Postgres ejecutaba solo con el volumen vacío. Con Clean Architecture, el dominio no debería saber que detrás hay una base relacional, y las tablas, los tipos y el acceso deberían definirse en un solo lugar. Además, el ADR-003 pide que toda consulta pase por `TenantDb.conTienda()`, pero eso dependía de la disciplina de quien programa.

## Decisión

Vamos a usar Sequelize 6 como ORM, solo en la capa de infraestructura:

- **Puerto y adaptador:** el dominio y los casos de uso no cambian. `SequelizeProductoRepository` implementa el mismo puerto `ProductoRepository`, y un mapper traduce entre `ProductoModel` (persistencia) y el agregado `Producto` (dominio).
- **Esquema con Sequelize:** las tablas, los tipos, el índice único y el `CHECK` salen de la definición del modelo y se crean con `sync()`. El script `app/db/init/001_esquema.sql` desaparece.
- **Rol y RLS:** Sequelize no tiene una API para roles ni políticas, así que `EsquemaInicializador` los crea con `sequelize.query()`. Todo es idempotente y corre al arrancar la celda.
- **Dos conexiones:** el esquema lo crea una conexión de administración (`DB_ADMIN_URL`) que se cierra al terminar. La app en ejecución usa `DB_URL` con `app_user`, que no puede alterar el esquema ni desactivar RLS. Si `DB_ADMIN_URL` no está definida, la app asume que el esquema ya existe.
- **Modelos por módulo:** cada módulo define sus modelos y los registra en `ModelosPorTienda`; el núcleo compartido (`shared/db`) no conoce a ningún módulo de negocio.
- **Tenancy:** `TenantDb.conTienda()` abre una transacción gestionada y fija `app.tienda_id` con `set_config(..., true)`. RLS sigue haciendo el filtrado.
- **Guarda:** los modelos registran hooks (`exigirTransaccionDeTienda`) que rechazan cualquier operación fuera de una transacción creada por `conTienda()`. Sin esto, una consulta olvidada devolvería cero filas sin error.
- **Pool:** configurable con `DB_POOL_MAX`, `DB_POOL_IDLE_MS` y `DB_POOL_ACQUIRE_MS`. Si falta `DB_URL`, la app no arranca.

## Alternativas consideradas

- **Seguir con `pg` directo:** sin dependencia extra, pero el mapeo, el pool y el esquema quedan a mano.
- **TypeORM o Prisma:** completar con lo que evaluó el grupo.
- **Migraciones versionadas (Umzug o sequelize-cli):** permiten evolucionar el esquema con historial. Se dejaron afuera por ahora porque con un solo módulo con tablas `sync()` alcanza; conviene retomarlas cuando haya cambios sobre tablas con datos.
- **CLS (`Sequelize.useCLS`) en lugar de pasar la transacción:** evita pasar `{ transaction }`, pero agrega magia implícita y una dependencia; preferimos explícito más guarda.

## Consecuencias

- `sync()` crea lo que falta pero **no modifica tablas existentes**: agregar una columna o cambiar un tipo requiere un cambio manual o adoptar migraciones.
- Cada consulta de un modelo debe recibir `{ transaction: tx }`; si no, la guarda lanza un error.
- Las consultas con `sequelize.query` directo no pasan por la guarda; deben usarse solo dentro de `conTienda()`.
- Si varias réplicas de la app arrancan a la vez sobre la misma base, la creación del esquema puede competir; hoy hay una app por celda.
- Los modelos de Sequelize no salen de infraestructura: cambiar de ORM solo toca ese directorio.

## NFRs afectados

Favorece mantenibilidad, aislamiento (guarda adicional sobre ADR-003) y operabilidad (pool configurable, esquema autocontenido). Agrega una dependencia y algo de complejidad en la capa de datos.
