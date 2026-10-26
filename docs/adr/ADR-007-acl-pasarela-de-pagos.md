# ADR-007: Integración con la pasarela de pagos mediante Anti-Corruption Layer

- **Estado:** Propuesta
- **Fecha:** 2026-10-22

## Contexto

La pasarela es externa, su modelo no es el nuestro y un reintento no puede cobrar dos veces.

## Decisión

Vamos a aislar la pasarela detrás de un ACL (`PasarelaHttpAdapter`) que traduce su modelo, enviar cada cobro con `Idempotency-Key` y no almacenar datos de tarjeta (tokenización en la pasarela).

## Alternativas consideradas

- **Llamar a la pasarela directo desde Ventas:** su vocabulario contamina el dominio.

## Consecuencias

- Cambiar de pasarela solo toca el adaptador.
- El alcance de PCI-DSS queda reducido.

## NFRs afectados

Favorece seguridad, disponibilidad y mantenibilidad.
