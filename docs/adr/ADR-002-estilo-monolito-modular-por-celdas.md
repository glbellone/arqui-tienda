# ADR-002: Estilo monolito modular desplegado por celdas

- **Estado:** Propuesta
- **Fecha:** 2026-10-22

## Contexto

Hace falta aislar celdas sin multiplicar el trabajo de un equipo de 12 personas.

## Decisión

Vamos a construir un único monolito modular (un módulo por bounded context) y desplegar el mismo artefacto en cada celda: una celda pool y una por cada tienda Premium.

## Alternativas consideradas

- **Microservicios:** más repositorios, pipelines y contratos internos de los que el equipo puede sostener (Ley de Conway).
- **Monolito en capas:** peor cohesión por dominio y más acoplamiento con el tiempo.

## Consecuencias

- Un solo código y un solo pipeline.
- Los módulos pueden extraerse a servicios más adelante si un contexto lo justifica.

## NFRs afectados

Favorece mantenibilidad y time-to-market. La escalabilidad es por celda, no por módulo.
