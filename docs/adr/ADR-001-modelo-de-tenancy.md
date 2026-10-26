# ADR-001: Modelo de tenancy híbrido (pool + silo Premium)

- **Estado:** Propuesta
- **Fecha:** 2026-10-22

## Contexto

Entre 5.000 y 20.000 tiendas con infraestructura de pago por uso. Los contratos Premium exigen datos físicamente separados y que su tráfico no afecte ni sea afectado por el resto.

## Decisión

Vamos a alojar las tiendas estándar en un pool compartido y cada tienda Premium en un silo dedicado (instancia de aplicación + base propia).

## Alternativas consideradas

- **Pool para todas:** no cumple la restricción de separación física de las Premium.
- **Silo para todas:** costo fijo por tienda, aunque no venda, e inoperable para 12 personas.

## Consecuencias

- Se cumple el contrato Premium y el costo del silo lo paga quien lo usa.
- Hay que aprovisionar silos y migrar esquemas en varias bases. En producción, crear una celda Premium es automático con IaC: crear la base y la app desde la misma imagen, correr migraciones, mudar los datos de la tienda y actualizar el registro de ruteo.

## NFRs afectados

Favorece aislamiento, escalabilidad y costo. Perjudica mantenibilidad.
