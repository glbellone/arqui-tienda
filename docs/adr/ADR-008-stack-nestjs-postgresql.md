# ADR-008: Stack NestJS + TypeScript y PostgreSQL

- **Estado:** Aceptada
- **Fecha:** 2026-10-22

## Contexto

Hay que elegir el lenguaje y el framework del backend, y una base que soporte el aislamiento del ADR-003.

## Decisión

Vamos a usar Node + TypeScript con NestJS para la app de las celdas y PostgreSQL 16 como base de cada celda. Los servicios chicos (gateway, Analítica y Tiendas e Inquilinos) usan Node + Express: tienen pocos endpoints y no necesitan la estructura de módulos de NestJS, pero comparten lenguaje y herramientas con la app. En la app, el acceso a datos se hace con Sequelize (ver ADR-013).

## Alternativas consideradas

- **Spring Boot (Java), .NET o FastAPI (Python):** también sirven, pero obligan a sumar un segundo lenguaje, porque el frontend ya es TypeScript.

## Consecuencias

- NestJS organiza el código en módulos con inyección de dependencias, lo que encaja con el monolito modular (ADR-002) y con los puertos y adaptadores de cada módulo.
- PostgreSQL ofrece row-level security nativo (ADR-003).
- Un solo lenguaje, TypeScript, en todo el sistema, también en el frontend.

## NFRs afectados

Favorece mantenibilidad y time-to-market.
