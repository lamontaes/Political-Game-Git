import { describe, expect, it } from "vitest";

import { addDays } from "../dates";
import { appropriatedAgainst } from "../enacted-appropriations";
import { fileBundleDraft } from "../../presentation/legislation-bundle-docket";
import { recordWorldEvent } from "../world";
import { playerRequiredWorkIds, releasePlayerRequiredWork } from "../time-work";
import { ensureStateExecutiveIncumbent } from "../nationwide-world/state-executives";
import {
  governorOfficeForJurisdiction,
  governingMatters,
  decideGoverningMatter,
} from "./state-governing";
import { BILL_SIGN } from "./governor-bill-decision";
import { applyEnactedLawEffects } from "../enacted-law-effects";
import {
  availableMeasureSteps,
  measurePosition,
  nextMeasureStableKey,
  recordEnactment,
} from "../legislation";
import { createLegislativeScenario } from "../legislation-scenarios";
import { deserializeWorld, serializeWorld } from "../serialization";
import { stateJurisdictionForKey } from "../life-places";
import { legislatureProfilePackId } from "../legislature-game-profile";
import { US_STATE_USPS } from "../nationwide-world/state-executive-candidacy-packs";
import { stateTransitServiceProfileForMeasure } from "../state-transit-service-profile";
import {
  STATE_TRANSIT_VARIANT_KEY,
  TRANSIT_PROGRAM_KEY,
  TRANSIT_VARIANT_KEY,
} from "../legislation-transit-families";
import { resolveTransitFunding } from "../transit-funding";
import {
  appropriationFromEnactedMeasure,
  openAppropriationsFor,
} from "./program-governing";
import type { EntityId, World } from "../types";
import { fileDraft } from "../../presentation/legislation-docket";
import { applyLegislativeStep } from "../../presentation/legislation-session";
import { publishLegislativeTransition } from "../../presentation/publish-legislative-transition";

const scenario = createLegislativeScenario("nebraska");
const jurisdictionId = (() => {
  const id = scenario.world.history.legislativeMeasures?.[0]?.jurisdictionId;
  if (!id) throw new Error("The Nebraska legislature was not opened.");
  return id;
})();

/** Record the fixture's control change without rewriting pending work. */
function controlForFixture(
  world: World,
  personId: EntityId,
  stableKey: string,
): World {
  const previous =
    world.control.kind === "person" ? world.control.personId : null;
  if (previous === personId) return world;
  const handoff = recordWorldEvent(world, {
    stableKey,
    type: "test.control-moved",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: null,
    involvedEntityIds: [
      personId,
      ...(previous
        ? [previous, ...playerRequiredWorkIds(world, previous)]
        : []),
    ],
    participants: [],
    personFactConstraints: [],
    visibility: "private",
    tags: [],
    summary:
      "Controlled downstream fixture moves play to the actual actor for its next recorded action.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const released = previous
    ? releasePlayerRequiredWork(handoff, {
        personId: previous,
        stableKeyPrefix: `${stableKey}:released`,
        outcomeEventId: handoff.history.events.at(-1)!.id,
      })
    : handoff;
  return { ...released, control: { kind: "person", personId } };
}

/** A controlled actual-office signature for downstream law-effect fixtures. */
function signAtActualGovernorDesk(
  scenario: ReturnType<typeof createLegislativeScenario>,
  start: World,
  measureId: EntityId,
): World {
  let world = ensureStateExecutiveIncumbent(
    start,
    scenario.playerPersonId,
    scenario.pack.jurisdictionKey.slice(3),
  );
  const office = governorOfficeForJurisdiction(
    world,
    scenario.pack.jurisdictionKey,
  );
  expect(
    office,
    "A recorded governor is required for this controlled signature.",
  ).not.toBeNull();
  world = controlForFixture(
    world,
    office!.holderPersonId,
    `a80:governor-control:${measureId}`,
  );
  world = applyLegislativeStep(
    { ...scenario, measureId },
    world,
    "await-executive-decision",
  ).world;
  const matter = governingMatters(world, office!.officeKey).find(
    (row) => row.measureId === measureId && row.status === "open",
  );
  expect(
    matter,
    "The actual bill must reach its recorded governor's desk.",
  ).toBeDefined();
  const decision = decideGoverningMatter(world, matter!.id, BILL_SIGN);
  expect(decision.ok, decision.ok ? "" : decision.reason).toBe(true);
  const next = decision.world;
  expect(measurePosition(next, measureId).phase).toBe("awaiting-enactment");
  const recorded = next.history.events.find(
    (event) =>
      event.tags.includes(`matter:${matter!.id}`) &&
      event.tags.includes(`choice:${BILL_SIGN}`),
  );
  expect(
    recorded?.participants.some(
      (participant) =>
        participant.personId === office!.holderPersonId &&
        participant.role === "agency:decider",
    ),
  ).toBe(true);
  return next;
}

function enact(
  startingWorld: World,
  draft: {
    readonly familyKey: string;
    readonly variantKey: string;
    readonly authorityKey?: string;
  },
): {
  readonly world: World;
  readonly measureId: EntityId;
  readonly docketKey: string;
} {
  const controlledStart = controlForFixture(
    startingWorld,
    scenario.playerPersonId,
    `a80:program-filing:${startingWorld.history.nextSequence}`,
  );
  const filed = fileDraft(controlledStart, {
    scenarioKey: "nebraska",
    playerPersonId: scenario.playerPersonId,
    jurisdictionId,
    ...draft,
  });
  return enactFiled(filed);
}

function enactFiled(filed: {
  readonly world: World;
  readonly bill: { readonly measureId: EntityId; readonly docketKey: string };
}) {
  const measureId = filed.bill.measureId;
  let world = filed.world;
  for (
    let guard = 0;
    guard < 40 && measurePosition(world, measureId).phase !== "enacted";
    guard++
  ) {
    const step = availableMeasureSteps(world, measureId).find(
      (key) => key !== "offer-amendment",
    );
    if (!step) break;
    if (step === "await-executive-decision") {
      world = publishLegislativeTransition(
        world,
        signAtActualGovernorDesk(scenario, world, measureId),
      );
      continue;
    }
    if (step === "record-enactment") {
      world = publishLegislativeTransition(
        world,
        recordEnactment(world, {
          stableKey: nextMeasureStableKey(
            world,
            measureId,
            `measure:${measureId}:enactment`,
          ),
          measureId,
          effectiveAt: addDays(world.currentDate, 13),
        }),
      );
      continue;
    }
    world = publishLegislativeTransition(
      world,
      applyLegislativeStep({ ...scenario, measureId }, world, step).world,
    );
  }
  expect(measurePosition(world, measureId).outcome).toBe("enacted");
  return { world, measureId, docketKey: filed.bill.docketKey };
}

function appropriations(world: World) {
  return (world.history.publicProgramRecords ?? []).filter(
    (record) => record.kind === "appropriation",
  );
}

describe("one program identity per named spending target", () => {
  it("keeps the legacy Alaska transit clause out of Nebraska while v2 writes its own authority", () => {
    // This core fixture bypasses the ordinary operative-section filing gate,
    // as an older save might. The enacted writer and payment adapter must
    // still refuse the pinned Alaska-specific v1 text in Nebraska.
    const legacy = enact(scenario.world, {
      familyKey: "appropriations",
      variantKey: TRANSIT_VARIANT_KEY,
      authorityKey: TRANSIT_PROGRAM_KEY,
    });
    expect(
      appropriations(legacy.world).filter(
        (record) => record.sourceMeasureId === legacy.measureId,
      ),
    ).toHaveLength(0);
    expect(resolveTransitFunding(legacy.world, legacy.measureId)).toEqual({
      kind: "unavailable",
      reason:
        "The explicit ninety-day transit clause is compiled only for Alaska.",
    });

    const statewide = enact(legacy.world, {
      familyKey: "appropriations",
      variantKey: STATE_TRANSIT_VARIANT_KEY,
      authorityKey: TRANSIT_PROGRAM_KEY,
    });
    expect(
      appropriations(statewide.world).filter(
        (record) => record.sourceMeasureId === statewide.measureId,
      ),
    ).toMatchObject([{ programKey: "transit:ne" }]);
  });

  it("has one distinct state transit game profile in every state", () => {
    const keys = new Set<string>();
    for (const stateUsps of US_STATE_USPS) {
      const jurisdictionKey = `US-${stateUsps}`;
      const jurisdiction = stateJurisdictionForKey(jurisdictionKey);
      expect(jurisdiction).not.toBeNull();
      if (!jurisdiction) continue;
      const profile = stateTransitServiceProfileForMeasure(
        { jurisdictions: { [jurisdiction.id]: jurisdiction } },
        {
          jurisdictionId: jurisdiction.id,
          rulePackId: legislatureProfilePackId(jurisdictionKey),
        },
      );
      expect(profile?.jurisdictionKey).toBe(jurisdictionKey);
      expect(profile?.programKey).toBe(`transit:${stateUsps.toLowerCase()}`);
      expect(profile?.availabilityDays).toBe(365);
      if (profile) keys.add(profile.programKey);
    }
    expect(keys.size).toBe(50);
  });
  it("keeps separate standing funds in the same state distinct", () => {
    const schools = enact(scenario.world, {
      familyKey: "appropriations",
      variantKey: "single-programme",
      authorityKey: "standing:school-facilities",
    });
    const transit = enact(schools.world, {
      familyKey: "appropriations",
      variantKey: "single-programme",
      authorityKey: "standing:rural-transit-assistance",
    });
    expect(
      openAppropriationsFor(transit.world, jurisdictionId).map(
        (record) => record.sourceMeasureId,
      ),
    ).not.toContain(transit.measureId);
    expect(appropriations(transit.world)).toMatchObject([
      {
        sourceMeasureId: schools.measureId,
        programKey: "appropriations:ne",
      },
      { sourceMeasureId: transit.measureId, programKey: "transit:ne" },
    ]);
  });

  it("keeps a supplemental in its named program with a separate edition after reload", () => {
    const first = enact(scenario.world, {
      familyKey: "appropriations",
      variantKey: "single-programme",
      authorityKey: "standing:school-facilities",
    });
    const resumed = deserializeWorld(serializeWorld(first.world));
    const supplemental = enact(resumed, {
      familyKey: "appropriations",
      variantKey: "supplemental",
      authorityKey: "standing:school-facilities",
    });
    const records = appropriations(supplemental.world);
    expect(records).toHaveLength(2);
    expect(records.map((record) => record.programKey)).toEqual([
      "appropriations:ne",
      "appropriations:ne",
    ]);
    expect(new Set(records.map((record) => record.id)).size).toBe(2);
    expect(records.map((record) => record.sourceMeasureId)).toEqual([
      first.measureId,
      supplemental.measureId,
    ]);
    const replayed = applyEnactedLawEffects(
      deserializeWorld(serializeWorld(supplemental.world)),
      supplemental.measureId,
    );
    expect(serializeWorld(replayed)).toBe(serializeWorld(supplemental.world));
  });

  it("funds an unambiguous enacted bridge target once and refuses unread or invalid target authority", () => {
    const authorized = enact(scenario.world, {
      familyKey: "bridge-maintenance",
      variantKey: "worst-first-condition",
    });
    const funded = enact(authorized.world, {
      familyKey: "appropriations",
      variantKey: "single-programme",
      authorityKey: `docket:${authorized.docketKey}`,
    });
    expect(appropriatedAgainst(authorized.world, authorized.measureId)).toBe(0);
    expect(appropriatedAgainst(funded.world, authorized.measureId)).toBe(
      1_200_000_000,
    );
    const records = appropriations(funded.world).filter(
      (record) => record.sourceMeasureId === funded.measureId,
    );
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      programKey: "bridge-maintenance:ne",
      sourceMeasureId: funded.measureId,
      amount: { minorUnits: 1_200_000_000, currency: "USD" },
    });
    const continued = deserializeWorld(serializeWorld(funded.world));
    expect(appropriatedAgainst(continued, authorized.measureId)).toBe(
      1_200_000_000,
    );
    expect(
      serializeWorld(
        appropriationFromEnactedMeasure(continued, funded.measureId),
      ),
    ).toBe(serializeWorld(continued));
    // A negative saved-history fixture cannot supply an absent authorization.
    // Preserve the real saved measures and final sections; only the exact
    // target's enactment evidence is unread in this older-history projection.
    const unbound: World = {
      ...continued,
      history: {
        ...continued.history,
        publicProgramRecords: continued.history.publicProgramRecords?.filter(
          (record) =>
            record.kind !== "appropriation" ||
            record.sourceMeasureId !== funded.measureId,
        ),
      },
    };
    const absent: World = {
      ...unbound,
      history: {
        ...unbound.history,
        legislativeEnactments: unbound.history.legislativeEnactments?.filter(
          (record) => record.measureId !== authorized.measureId,
        ),
      },
    };
    expect(appropriationFromEnactedMeasure(absent, funded.measureId)).toBe(
      absent,
    );
    const noFinalCeiling: World = {
      ...unbound,
      history: {
        ...unbound.history,
        legislativeProvisions: unbound.history.legislativeProvisions?.map(
          (record) =>
            record.measureId === authorized.measureId
              ? { ...record, fiscalExposureMinorUnits: null }
              : record,
        ),
      },
    };
    expect(
      appropriationFromEnactedMeasure(noFinalCeiling, funded.measureId),
    ).toBe(noFinalCeiling);
  });

  it("counts only the exact saved target component, not a sibling with a longer key", () => {
    const repair = enact(scenario.world, {
      familyKey: "bridge-maintenance",
      variantKey: "worst-first-condition",
    });
    const hardening = enact(repair.world, {
      familyKey: "utility-resilience",
      variantKey: "hardening-grants",
    });
    expect(appropriatedAgainst(hardening.world, repair.measureId)).toBe(0);
    expect(appropriatedAgainst(hardening.world, hardening.measureId)).toBe(0);
    const controlled = controlForFixture(
      hardening.world,
      scenario.playerPersonId,
      `a80:bundle-filing:${hardening.world.history.nextSequence}`,
    );
    const funded = enactFiled(
      fileBundleDraft(controlled, {
        scenarioKey: "nebraska",
        playerPersonId: scenario.playerPersonId,
        jurisdictionId,
        subjectRule: "unrestricted",
        components: [
          {
            componentKey: "repair",
            familyKey: "appropriations",
            variantKey: "single-programme",
            subject: "repair",
            authorityKey: `docket:${repair.docketKey}`,
          },
          {
            componentKey: "repair-extra",
            familyKey: "appropriations",
            variantKey: "supplemental",
            subject: "hardening",
            authorityKey: `docket:${hardening.docketKey}`,
          },
        ],
      }),
    );
    const records = appropriations(funded.world).filter(
      (r) => r.sourceMeasureId === funded.measureId,
    );
    expect(records).toHaveLength(2);
    expect(records.map((r) => [r.programKey, r.amount.minorUnits])).toEqual([
      ["bridge-maintenance:ne", 1_200_000_000],
      ["utility-resilience:ne", 350_000_000],
    ]);
    expect(appropriatedAgainst(funded.world, repair.measureId)).toBe(
      1_200_000_000,
    );
    expect(appropriatedAgainst(funded.world, hardening.measureId)).toBe(
      350_000_000,
    );
    const continued = deserializeWorld(serializeWorld(funded.world));
    const repeated = appropriationFromEnactedMeasure(
      continued,
      funded.measureId,
    );
    expect(serializeWorld(repeated)).toBe(serializeWorld(continued));
    expect(appropriatedAgainst(repeated, repair.measureId)).toBe(1_200_000_000);
    expect(appropriatedAgainst(repeated, hardening.measureId)).toBe(
      350_000_000,
    );
  });
});
