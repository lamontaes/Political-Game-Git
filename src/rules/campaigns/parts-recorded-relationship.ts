// STOPGAP RULES3-CAM-040: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/living-world/movement-succession.ts :: recordedRelationship.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/campaigns-kernels.json.

/** Legacy line 98: interaction.occurredAt <= world.currentDate */
export function recordedRelationshipRule1(facts: {
  readonly interactionOccurredAt: string;
  readonly currentDate: string;
}) {
  return facts.interactionOccurredAt <= facts.currentDate;
}
