import { expect, it } from "vitest";
import { createLegislativeScenario } from "./legislation-scenarios";
import { compileBillDraft } from "./legislation-drafting";
import { standingAuthority } from "./legislation-program-families";
import { recordFiledProvision } from "./legislative-politics";
import { recordDraftLineage } from "./legislation-draft-lineage";
import {
  availableMeasureSteps,
  measurePosition,
  introduceMeasure,
} from "./legislation";
import { applyLegislativeStep } from "../presentation/legislation-session";
import { advanceWorld, assertWorldIntegrity } from "./world";
import { addDays, daysBetween } from "./dates";
import { createFutureTransitionHandlerRegistry } from "./future-transitions";
import { deserializeWorld, serializeWorld } from "./serialization";
import { resolveTransitFunding } from "./transit-funding";
import {
  TRANSIT_FAMILY_KEY,
  TRANSIT_PROGRAM_KEY,
  TRANSIT_VARIANT_KEY,
} from "./legislation-transit-families";
import {
  requestTransitImplementation,
  createTransitTransitionRegistry,
  cancelTransitImplementation,
  deliverTransitStage,
  TRANSIT_DELIVERY_KEY,
  transitDueState,
  publishTransitReport,
  type TransitPaymentWriter,
} from "./transit-service";
import type { World } from "./types";

// Explicitly synthetic core fixture. The sponsor is authored through canonical
// writers. Ordinary creator/office/F receipts are proved separately.
function appropriation() {
  const scenario = createLegislativeScenario("alaska");
  const personId = scenario.playerPersonId;
  const jurisdictionId = scenario.world.jurisdictionOrder[0]!;
  const draft = compileBillDraft({
    familyKey: TRANSIT_FAMILY_KEY,
    variantKey: TRANSIT_VARIANT_KEY,
    scenarioKey: "alaska",
    jurisdictionId,
    rulePackId: scenario.pack.packId,
    designation: "HB 401",
    filedOn: scenario.world.currentDate,
    predicateAuthority: standingAuthority(TRANSIT_PROGRAM_KEY)!,
  });
  let world = introduceMeasure(scenario.world, {
    stableKey: "legislative-docket:alaska:bill-001:measure",
    jurisdictionId,
    rulePackId: scenario.pack.packId,
    designation: draft.designation,
    shortTitle: draft.shortTitle,
    summary: draft.summary,
    origin: "member-introduction",
    subjectClass: draft.subjectClass,
    sponsorPersonId: personId,
    originChamberKey: "house",
  });
  const measureId = world.history.legislativeMeasures!.at(-1)!.id;
  for (const c of draft.clauses)
    world = recordFiledProvision(world, {
      stableKey: `transit-core:${c.provisionKey}`,
      measureId,
      provisionKey: c.provisionKey,
      sectionNumber: c.sectionNumber,
      heading: c.heading,
      text: c.text,
      beneficiary: c.beneficiary,
      applicationScope: { jurisdictionId, segmentKey: null },
      ...(c.fiscalExposureLabel === null
        ? {}
        : {
            fiscalExposureLabel: c.fiscalExposureLabel,
            fiscalExposureMinorUnits: c.fiscalExposureMinorUnits,
          }),
    });
  world = recordDraftLineage(world, {
    stableKey: "transit-core:lineage",
    measureId,
    familyKey: draft.familyKey,
    familyVersion: draft.familyVersion,
    variantKey: draft.variantKey,
    compiledAt: draft.filedOn,
    parameterValues: draft.parameterValues,
    authorityKey: TRANSIT_PROGRAM_KEY,
    provenanceNote:
      "Explicitly synthetic core test, not the ordinary office route.",
  });
  for (
    let count = 0;
    count < 45 && measurePosition(world, measureId).phase !== "enacted";
    count++
  ) {
    const step = availableMeasureSteps(world, measureId).find(
      (s) => s !== "offer-amendment",
    );
    if (!step) throw new Error("No legal fixture step remains.");
    world = applyLegislativeStep(
      { ...scenario, measureId: measureId },
      world,
      step,
    ).world;
  }
  const enactment = world.history.legislativeEnactments!.find(
    (e) => e.measureId === measureId,
  )!;
  return {
    world,
    personId,
    measureId,
    availableAt: addDays(enactment.resolvedAt, 90),
  };
}
function operative(f = appropriation()) {
  return {
    ...f,
    world: advanceWorld(
      f.world,
      daysBetween(f.world.currentDate, f.availableAt),
      createFutureTransitionHandlerRegistry([]),
    ),
  };
}
const refuse: TransitPaymentWriter = (world) => ({
  kind: "refused",
  world,
  reason: "No actual public cash account.",
});

it("does not confuse a proposal with operative funding, or substitute Kentucky", () => {
  const f = appropriation();
  expect(resolveTransitFunding(f.world, f.measureId)).toEqual({
    kind: "unavailable",
    reason: `This appropriation takes effect on ${f.availableAt}.`,
  });
  const before = serializeWorld(f.world);
  expect(() => requestTransitImplementation(f.world, f)).toThrow(
    /takes effect/,
  );
  expect(serializeWorld(f.world)).toBe(before);
  const ready = operative(f);
  const funding = resolveTransitFunding(ready.world, ready.measureId);
  expect(funding.kind).toBe("available");
  if (funding.kind === "available") {
    expect(
      ready.world.jurisdictions[funding.mandate.jurisdictionId]!.name,
    ).toMatch(/Alaska/);
    expect(funding.mandate.administrativeEventId).toBe(
      ready.world.history.legislativeEnactments!.find(
        (e) => e.measureId === f.measureId,
      )!.outcomeEventId,
    );
  }
});
it("freezes two separate exact service forecasts, without cash, effects, or publication", () => {
  const f = operative();
  const world = requestTransitImplementation(f.world, f);
  expect(
    world.history.policyEstimates.filter((e) =>
      e.stableKey.startsWith("transit-request:"),
    ),
  ).toHaveLength(2);
  expect(world.history.effectActivations).toHaveLength(0);
  expect(world.history.resourceTransferOutcomes).toEqual(
    f.world.history.resourceTransferOutcomes,
  );
  expect(world.history.publications ?? []).toEqual(
    f.world.history.publications ?? [],
  );
  expect(
    world.history.knowledge.filter((k) =>
      k.stableKey.includes("transit-request:"),
    ),
  ).toHaveLength(2);
  expect(() => requestTransitImplementation(world, f)).toThrow(/already/);
  assertWorldIntegrity(deserializeWorld(serializeWorld(world)));
});
it("a due period with no cash creates no payment, service effect, or extra units", () => {
  const f = operative();
  const requested = requestTransitImplementation(f.world, f);
  const world = advanceWorld(
    requested,
    14,
    createTransitTransitionRegistry(refuse),
  );
  const due = world.history.futureDueItems.find(
    (d) => d.transitionKey === TRANSIT_DELIVERY_KEY,
  )!;
  expect(transitDueState(world, due.id).status).toBe("blocked");
  expect(world.history.policyRealizations.at(-1)!.status).toBe("blocked");
  expect(world.history.effectActivations).toHaveLength(0);
  expect(world.history.metricStates).toHaveLength(0);
  expect(world.history.resourceTransferOutcomes).toEqual(
    f.world.history.resourceTransferOutcomes,
  );
  expect(deliverTransitStage(world, due, refuse).world).toBe(world);
  expect(world.history.publications ?? []).toHaveLength(0);
  const eventId = world.history.events.find(
    (e) => e.type === "transit.service-period-settled",
  )!.id;
  const published = publishTransitReport(world, {
    personId: f.personId,
    eventId,
  });
  expect(published.history.publications!.at(-1)!.body).toContain(
    "not delivered",
  );
  expect(() =>
    publishTransitReport(published, { personId: f.personId, eventId }),
  ).toThrow(/already/);
});
it("cancels future delivery while preserving prior blocked history through save/reopen", () => {
  {
    const f = operative(appropriation());
    const requested = requestTransitImplementation(f.world, f);
    const first = advanceWorld(
      requested,
      14,
      createTransitTransitionRegistry(refuse),
    );
    const cancelled = cancelTransitImplementation(
      deserializeWorld(serializeWorld(first)),
      f,
    );
    const later = advanceWorld(
      cancelled,
      30,
      createTransitTransitionRegistry(refuse),
    );
    expect(
      later.history.futureDueItems
        .filter((d) => d.transitionKey === TRANSIT_DELIVERY_KEY)
        .map((d) => transitDueState(later, d.id).status),
    ).toEqual(["blocked", "cancelled"]);
    expect(later.history.policyRealizations).toEqual(
      first.history.policyRealizations,
    );
    expect(later.history.workItemStates.at(-1)!.status).toBe("completed");
    expect(deserializeWorld(serializeWorld(later))).toEqual(later);
  }
});
it("refuses changed adopted terms, wrong actors, expired authority", () => {
  const f = operative();
  const before = serializeWorld(f.world);
  const other = f.world.personOrder.find((id) => id !== f.personId)!;
  expect(() =>
    requestTransitImplementation(f.world, { ...f, personId: other }),
  ).toThrow(/controlled sponsor/);
  const edited: World = {
    ...f.world,
    history: {
      ...f.world.history,
      legislativeProvisions: f.world.history.legislativeProvisions!.map((p) =>
        p.measureId === f.measureId &&
        p.provisionKey === "administrative-mandate"
          ? { ...p, text: "No administrative implementation mandate." }
          : p,
      ),
    },
  };
  expect(resolveTransitFunding(edited, f.measureId).kind).toBe("unavailable");
  const expired = advanceWorld(
    f.world,
    366,
    createFutureTransitionHandlerRegistry([]),
  );
  expect(resolveTransitFunding(expired, f.measureId)).toEqual({
    kind: "unavailable",
    reason: "The transit appropriation has expired.",
  });
  expect(serializeWorld(f.world)).toBe(before);
});
