# ADR-008: Stack NestJS + TypeScript y PostgreSQL

- **Estado:** Propuesta
- **Fecha:** 2026-10-22

## Contexto

Hay que elegir el lenguaje y el framework del backend, y una base que soporte el aislamiento del ADR-003.

## Decisión

Vamos a usar Node + TypeScript con NestJS para la app y PostgreSQL como base de cada celda.

## Alternativas consideradas

- **Spring Boot, .NET, FastAPI:** completar con lo que evaluó el grupo.

## Consecuencias

- NestJS organiza el código en módulos, lo que encaja con el monolito modular (ADR-002).
- PostgreSQL ofrece row-level security nativo (ADR-003).

## NFRs afectados

Favorece mantenibilidad y time-to-market.
