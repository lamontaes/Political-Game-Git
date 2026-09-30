import type { World } from "./types";

/** Financial book checks at save and clock boundaries; never creates holdings. */
export function assertCongressInvestmentIntegrity(world: World): void {
  const store = world.congressInvestments;
  if (!store) return;
  if (
    store.version !== "congress-investments-v1" ||
    !Number.isSafeInteger(store.clearingStockCents) ||
    store.clearingStockCents < 0
  )
    throw Error("Invalid congressional investment store");
  const orgs = new Set(world.history.organizations.map((r) => r.id));
  for (const id of [
    store.clearingOrganizationId,
    store.managerOrganizationId,
    store.penaltyOrganizationId,
  ])
    if (!orgs.has(id))
      throw Error(
        "Congressional investments require recorded financial organizations",
      );
  const measures = new Set(world.history.legislativeMeasures?.map((r) => r.id));
  for (const [id, p] of Object.entries(store.portfolios)) {
    if (
      id !== p.personId ||
      !world.people[p.personId] ||
      p.openedOn > world.currentDate ||
      !p.basis.trim() ||
      ![
        p.estimatedWealthCents,
        p.individualStockCents,
        p.diversifiedFundCents,
      ].every((n) => Number.isSafeInteger(n) && n >= 0) ||
      (p.conversionMeasureId && !measures.has(p.conversionMeasureId))
    )
      throw Error("Invalid congressional portfolio");
  }
  const outcomes = new Map(
    world.history.resourceTransferOutcomes.map((r) => [r.id, r]),
  );
  const keys = new Set<string>();
  for (const charge of store.charges) {
    const outcome = outcomes.get(charge.outcomeId);
    if (
      keys.has(charge.key) ||
      !store.portfolios[charge.personId] ||
      !measures.has(charge.measureId) ||
      !outcome ||
      charge.on > world.currentDate ||
      !Number.isSafeInteger(charge.assessedCents) ||
      charge.assessedCents < 0 ||
      outcome.attemptedAmount.minorUnits !== charge.assessedCents ||
      !charge.reason.trim()
    )
      throw Error("Invalid congressional investment charge");
    keys.add(charge.key);
  }
}
