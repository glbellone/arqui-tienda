# ADR-004: Ruteo de tenants en el API Gateway

- **Estado:** Propuesta
- **Fecha:** 2026-10-22

## Contexto

Cada request tiene que llegar a la celda correcta (pool o silo Premium) sin que el cliente lo sepa.

## Decisión

Vamos a resolver la tienda en el API Gateway y rutear a la celda que figura en el registro de tiendas.

## Alternativas consideradas

- **Que cada cliente conozca la URL de su celda:** acopla al cliente con la infraestructura.

## Consecuencias

- Mover una tienda a Premium es cambiar un registro.
- El gateway es un componente crítico y debe estar replicado.
- Simplificación del TP: el registro es el archivo `gateway/registro-tiendas.json`. En producción lo provee el módulo Tiendas e Inquilinos.

## NFRs afectados

Favorece escalabilidad y aislamiento. El gateway es un punto único de falla a mitigar.
