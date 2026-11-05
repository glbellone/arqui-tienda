# ADR-012: Tiendas e Inquilinos, un servicio aparte que es el plano de control

- **Estado:** Propuesta
- **Fecha:** 2026-11-05

## Contexto

Hasta ahora el registro de tiendas era un archivo del gateway (ADR-004) y dar de alta una tienda o
pasarla a Premium eran pasos a mano: editar el archivo, crear el usuario en Keycloak, levantar la
celda y copiar los datos. Con miles de tiendas y un equipo de 12 personas eso no escala, y además el
escenario pide que el administrador dé de alta tiendas y que el dueño pueda pasar a Premium (ADR-001).

Alguien tiene que ser el dueño de ese registro: qué tiendas existen, en qué celda vive cada una y
qué celdas hay. El registro tiene que ser **uno solo** para toda la plataforma, porque de él depende
el ruteo. La app, en cambio, corre **una vez por celda** (ADR-002): si el registro viviera en la app,
habría una copia por celda y ninguna sería la verdadera.

## Decisión

Vamos a tener un servicio de **Tiendas e Inquilinos** (`tiendas/`), aparte de las celdas, con su
propia base (`db-tiendas`). Es el plano de control de la plataforma: no atiende compradores, decide
dónde vive cada tienda.

- **El registro.** Las tablas `celdas` y `tiendas` son la única fuente de verdad. El gateway lee
  `GET /interno/registro` cada 2 segundos y guarda una copia en memoria. Si el servicio de Tiendas
  no responde, el gateway sigue ruteando con la **última copia buena**: una caída del plano de
  control no tira las tiendas, solo impide los cambios mientras dura.
- **Alta y baja de tiendas** (rol admin). El alta toca tres sistemas sin una transacción común: el
  registro, Keycloak (el usuario del dueño y el subdominio como destino de login) y la celda. Se hace
  con **compensación**: si falla un paso, se deshacen los anteriores y la tienda no queda a medias.
  Toda tienda nueva empieza en la celda pool, con plan Estándar.
- **Pase a Premium.** El dueño lo pide (`POST /v1/tiendas/{id}/plan/solicitud`), el admin lo aprueba
  y el servicio crea una celda nueva solo para esa tienda y la **muda**. La mudanza va dejando
  anotado el paso en la solicitud:
  1. **creando-celda:** levanta la base y la app de la celda nueva.
  2. **frenando-escrituras:** la tienda pasa a `mudandose`. El gateway responde 503 con
     `Retry-After` a todo lo que no sea GET, HEAD u OPTIONS. Se esperan unos 6 s para que el gateway
     lo vea y terminen los pedidos que ya estaban adentro. La vitrina se sigue viendo.
  3. **copiando-datos:** tabla por tabla, en orden (productos, pedidos, items), se lee del origen y
     se escribe en el destino en una sola transacción.
  4. **verificando:** las cantidades de filas tienen que coincidir en las dos bases.
  5. **cambiando-ruteo:** un solo UPDATE cambia plan, celda y estado a la vez, así el gateway nunca
     ve un estado intermedio. Se esperan otros 6 s a que el gateway lo vea.
  6. **limpiando-pool:** se borran los datos de la tienda en la pool.

  Si algo falla antes del paso 5, se deshace todo: la tienda vuelve a `activa` en la pool, se borra
  la celda nueva y la solicitud queda `fallida` con el error. Si el servicio se reinicia en medio de
  una mudanza, al arrancar la termina (si el ruteo ya había cambiado) o la deshace, y borra los
  contenedores que no figuren en el registro.
- **La copia de datos pasa por row-level security (ADR-003).** El servicio se conecta a las bases de
  las celdas con el usuario `migrador`, que no es dueño de las tablas: fija la tienda activa
  (`app.tienda_id`) igual que la app y solo ve y toca las filas de esa tienda. Un error en la copia
  no puede llevarse ni borrar datos de otra tienda.
- **Las celdas nuevas se crean con la API de Docker.** El servicio monta `/var/run/docker.sock` y
  clona la celda pool: la misma imagen de la app, los mismos scripts de init de la base (esquema, RLS,
  usuarios) y la misma red, con nombres y alias `db-premium-{id}` y `app-premium-{id}`. Espera a que
  la base acepte al migrador y a que la app responda `/health`, y recién ahí la anota en el registro
  con `dinamica = true`. Las celdas de docker-compose (`pool`, `premium-a`) no se tocan nunca. En
  producción esto lo haría Terraform (u otra herramienta de IaC) contra la nube: la idea es la misma,
  la celda sale de una plantilla y el plano de control la pide.
- **La vitrina no se entera.** Para el dueño solo existe el "Plan Premium" y el estado de su
  solicitud ("pendiente de aprobación", "estamos preparando tu tienda Premium"). Celdas, pasos de la
  mudanza y pools son cosas que ve solo el administrador.

## Alternativas consideradas

- **Un módulo Tiendas dentro de la app:** es lo que sugería ADR-002 (un módulo por bounded
  context), pero la app corre una vez por celda. El registro quedaría repetido en cada celda, o habría
  que elegir una celda "principal", que pasaría a ser el punto del que dependen todas las demás.
- **Celdas Premium ya levantadas esperando una tienda:** el pase sería más rápido, pero se paga
  por infraestructura que nadie usa, y hay que decidir cuántas tener listas. Con pago por uso no
  conviene; si crear una celda tardara mucho, se podría tener una o dos de reserva.
- **Copia en vivo, sin frenar las escrituras (CDC o doble escritura):** evita el corte, pero agrega un
  stream de cambios (Debezium, replicación lógica) o hace que la app escriba en dos bases y resuelva
  conflictos. Es mucha complejidad para algo que pasa una vez en la vida de cada tienda y que se puede
  hacer en un horario de poco tráfico.

## Consecuencias

- El registro es uno solo y tiene dueño. El gateway queda más simple: solo lee y rutea.
- Alta, baja y pase a Premium son automáticos y no necesitan a nadie del equipo.
- **El `docker.sock` da acceso total al Docker del host.** Quien comprometa el servicio de Tiendas
  puede crear, borrar o entrar a cualquier contenedor. Se acepta porque es una simulación local; en
  producción el servicio llamaría a la API de la nube con un rol limitado a crear y borrar celdas.
- **Las celdas creadas no se actualizan solas cuando cambia la imagen.** Se crean con el id de la
  imagen de la pool de ese momento. Un `docker compose up --build` actualiza la pool y `premium-a`,
  pero no las celdas dinámicas: hay que recrearlas. En producción, el pipeline tendría que desplegar
  en todas las celdas del registro.
- **Hay un corte breve de escrituras durante la mudanza** (del paso 2 al 5, del orden de 15 a 20
  segundos más el tiempo de copia). Mientras tanto la tienda se ve pero no acepta pedidos ni cambios.
- La plataforma crea contenedores que docker-compose no conoce: para limpiar todo hace falta
  `docker compose down -v --remove-orphans`.
- Un servicio más para operar, con su base. Si se cae, la plataforma sigue atendiendo con la última
  copia del registro, pero no se pueden dar de alta tiendas ni pasar a Premium.

## NFRs afectados

Favorece el aislamiento (las Premium quedan en su propia celda sin intervención manual), la
escalabilidad operativa (alta y pase a Premium sin pasos a mano) y la disponibilidad (el gateway no
depende del plano de control para rutear). Perjudica la seguridad del entorno local (`docker.sock`) y
la disponibilidad de escritura de la tienda que se muda, durante unos segundos.
