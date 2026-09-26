import { describe, expect, it } from "vitest";

import {
  createLegislativeScenario,
  nextMeasureStableKey,
  recordEnactment,
  serializeWorld,
} from "../simulation";
import type { EntityId, World } from "../simulation";
import {
  applyEnactedLawEffects,
  enactedLawEffects,
  enactedLawsWithEffects,
} from "../simulation/enacted-law-effects";
import {
  availableMeasureSteps,
  measurePosition,
} from "../simulation/legislation";
import { currentMeasureProvisions } from "../simulation/legislative-politics";
import { fileBundleDraft } from "./legislation-bundle-docket";
import { fileDraft } from "./legislation-docket";
import { projectMeasureBriefing } from "./legislation-projection";
import { applyLegislativeStep } from "./legislation-session";
import { publishLegislativeTransition } from "./publish-legislative-transition";
import { createScenarioWorld } from "../simulation/demo";
import { addDays } from "../simulation/dates";
import {
  programCapacity,
  programPosition,
} from "../simulation/governing/public-program";
import { municipalGovernmentForLifePlace } from "../simulation/municipal-government";
import {
  installMunicipalGovernment,
  introduceMunicipalOrdinance,
  municipalSeats,
  seatMunicipalMember,
} from "../simulation/municipal-public-work";
import {
  passMunicipalOrdinance,
  placeMunicipalOrdinanceOnAgenda,
} from "../simulation/municipal-ordinance-procedure";
import { requireLifePlace } from "../simulation/life-places";
import { advanceWorld } from "../simulation/world";
import type {
  LegislativeVoteDisposition,
  LegislativeVoteProvenance,
} from "../simulation/types";

/**
 * A law the player passes changes the records it governs, through the same
 * transition the game runs after every legislative action — and the player
 * can read back what it changed and what it could not change yet.
 *
 * Nebraska and Alaska, not Kentucky: the owner asked that tests span places.
 */

function enactFromDocket(
  scenarioKey: "nebraska" | "alaska",
  draft: {
    readonly familyKey: string;
    readonly variantKey: string;
    readonly authorityKey?: string;
  },
  effectiveDelayDays?: number,
  legacyNullEffectiveDate = false,
): { readonly world: World; readonly measureId: EntityId } {
  const scenario = createLegislativeScenario(scenarioKey);
  const filed = fileDraft(scenario.world, {
    scenarioKey,
    playerPersonId: scenario.playerPersonId,
    jurisdictionId:
      scenario.world.history.legislativeMeasures![0]!.jurisdictionId,
    ...draft,
  });
  const measureId = filed.bill.measureId;
  const context = { ...scenario, measureId };
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
    if (step === "record-enactment" && legacyNullEffectiveDate) {
      // Current state procedure supplies an effective date. Recreate an older
      // saved enactment with that field missing before any effect is applied,
      // so this test still checks that the effect gateway does not guess one.
      const enacted = recordEnactment(world, {
        stableKey: nextMeasureStableKey(
          world,
          measureId,
          `measure:${measureId}:enactment`,
        ),
        measureId,
      });
      world = applyEnactedLawEffects(
        {
          ...enacted,
          history: {
            ...enacted.history,
            legislativeEnactments: enacted.history.legislativeEnactments?.map(
              (row) =>
                row.measureId === measureId
                  ? { ...row, effectiveAt: null }
                  : row,
            ),
          },
        },
        measureId,
      );
      continue;
    }
    if (step === "record-enactment" && effectiveDelayDays !== undefined) {
      world = publishLegislativeTransition(
        world,
        recordEnactment(world, {
          stableKey: nextMeasureStableKey(
            world,
            measureId,
            `measure:${measureId}:enactment`,
          ),
          measureId,
          effectiveAt: addDays(world.currentDate, effectiveDelayDays),
        }),
      );
      continue;
    }
    // The same boundary the game runs after every player legislative action.
    world = publishLegislativeTransition(
      world,
      applyLegislativeStep(context, world, step).world,
    );
  }
  return { world, measureId };
}

const appropriations = (world: World, measureId: EntityId) =>
  (world.history.publicProgramRecords ?? []).filter(
    (row) => row.kind === "appropriation" && row.sourceMeasureId === measureId,
  );

const MUNICIPAL_PROVENANCE: LegislativeVoteProvenance = {
  method: "authored-fixture",
  note: "Test roll call supplied by the test.",
  sourceEntityIds: [],
};

function municipalRoll(
  council: readonly EntityId[],
  yeas: number,
  nays: number,
): readonly LegislativeVoteDisposition[] {
  return council.map((personId, index) => ({
    memberKey: `council:${index + 1}`,
    personId,
    disposition: index < yeas ? "yea" : index < yeas + nays ? "nay" : "absent",
  }));
}

function enactCharlottesvilleOrdinance() {
  const place = requireLifePlace("5114968");
  const government = municipalGovernmentForLifePlace(place)!;
  let world = createScenarioWorld(
    "enacted-law-effects-local-level",
    place.context,
    { peopleCount: 12 },
  );
  const people = world.personOrder;
  world = installMunicipalGovernment(world, {
    governmentKey: government.key,
    jurisdictionId: place.context.jurisdiction.id,
    formedAt: world.currentDate,
  });
  for (let index = 0; index < 5; index += 1) {
    world = seatMunicipalMember(world, {
      governmentKey: government.key,
      personId: people[index + 1]!,
      startedAt: world.currentDate,
      role: index === 0 ? "presiding-member" : "member",
      seatLabel: index === 0 ? "Mayor" : `Seat ${index + 1}`,
    });
  }
  const member = people[1]!;
  world = { ...world, control: { kind: "person", personId: member } };
  const filed = introduceMunicipalOrdinance(world, {
    governmentKey: government.key,
    designation: "Ord. 26-1",
    shortTitle: "Sidewalk dining permits",
    summary: "A general ordinance introduced by a councilor.",
  });
  if (!filed.ok) throw new Error(filed.reason);
  const measure = filed.world.history.legislativeMeasures!.at(-1)!;
  const agenda = placeMunicipalOrdinanceOnAgenda(filed.world, {
    governmentKey: government.key,
    measureId: measure.id,
  });
  if (!agenda.ok) throw new Error(agenda.reason);
  const passed = passMunicipalOrdinance(advanceWorld(agenda.world, 4), {
    governmentKey: government.key,
    measureId: measure.id,
    dispositions: municipalRoll(
      municipalSeats(agenda.world, government.key).map((seat) => seat.personId),
      3,
      0,
    ),
    provenance: MUNICIPAL_PROVENANCE,
  });
  if (!passed.ok) throw new Error(passed.reason);
  return { world: passed.world, measureId: measure.id };
}

describe("a law the player passes changes what it governs", () => {
  it("turns a passed Nebraska appropriation into money the state can spend", () => {
    const { world, measureId } = enactFromDocket("nebraska", {
      familyKey: "appropriations",
      variantKey: "single-programme",
      authorityKey: "standing:school-facilities",
    });
    expect(measurePosition(world, measureId).outcome).toBe("enacted");
    // Before this step existed, the player's route wrote no spending
    // authority at all: only the institution clock did.
    expect(appropriations(world, measureId)).toHaveLength(1);

    const effects = enactedLawEffects(world, measureId)!;
    expect(effects.level).toBe("state");
    const money = effects.lines.find((line) => line.kind === "appropriation");
    expect(money).toBeDefined();
    if (money?.kind !== "appropriation") return;
    const record = appropriations(world, measureId)[0]!;
    expect(record.kind === "appropriation" && record.amount.minorUnits).toBe(
      money.amountMinorUnits,
    );
    expect(money.amountMinorUnits).toBeGreaterThan(0);
    // Nothing has been committed or paid yet; the reading says so rather
    // than implying delivery.
    expect(money.committedMinorUnits).toBe(0);
    expect(money.paidMinorUnits).toBe(0);
  });

  it("classifies a passed Charlottesville council ordinance as local under its state jurisdiction", () => {
    const { world, measureId } = enactCharlottesvilleOrdinance();
    expect(measurePosition(world, measureId).outcome).toBe("enacted");
    expect(enactedLawEffects(world, measureId)?.level).toBe("local");
  });

  it("funds every part of a multi-part bill, a transit part included", () => {
    const scenario = createLegislativeScenario("nebraska");
    const filed = fileBundleDraft(scenario.world, {
      scenarioKey: "nebraska",
      playerPersonId: scenario.playerPersonId,
      jurisdictionId:
        scenario.world.history.legislativeMeasures![0]!.jurisdictionId,
      subjectRule: "unrestricted",
      components: [
        {
          componentKey: "transit-money",
          familyKey: "appropriations",
          variantKey: "transit-staged-service-v2",
          subject: "transit",
          authorityKey: "standing:rural-transit-assistance",
        },
        {
          componentKey: "schools-money",
          familyKey: "appropriations",
          variantKey: "single-programme",
          subject: "schools",
          authorityKey: "standing:school-facilities",
        },
      ],
    });
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
    // Only a single-family transit bill reads its own clause; a bundle's
    // parts each become their own spending authority.
    expect(appropriations(world, measureId)).toHaveLength(2);
    expect(
      appropriations(world, measureId)
        .map((record) => record.programKey)
        .sort(),
    ).toEqual(["appropriations:ne", "transit:ne"]);
    expect(programCapacity(world, "transit:ne")).toMatchObject({
      kind: "capacity",
      programKey: "transit:ne",
      serviceLabel: "modeled state rural-transit service",
      unitLabel: "transit service unit",
      unitsTotal: 1,
      unitsOperational: 0,
      restorationCostPerUnit: { minorUnits: 1_000_000, currency: "USD" },
      basis: { kind: "game-profile" },
    });
  });

  it("uses Nebraska's saved effective date and transit profile without creating cash", () => {
    const { world, measureId } = enactFromDocket(
      "nebraska",
      {
        familyKey: "appropriations",
        variantKey: "transit-staged-service-v2",
        authorityKey: "standing:rural-transit-assistance",
      },
      13,
    );
    const enactment = world.history.legislativeEnactments!.find(
      (row) => row.measureId === measureId,
    )!;
    const record = appropriations(world, measureId)[0]!;
    expect(enactment.effectiveAt).not.toBeNull();
    expect(record.programKey).toBe("transit:ne");
    expect(record.availableFrom).toBe(enactment.effectiveAt);
    expect(record.availableThrough).toBe(addDays(enactment.effectiveAt!, 364));
    expect(programCapacity(world, record.programKey)).toMatchObject({
      serviceLabel: "modeled state rural-transit service",
      unitsTotal: 1,
      unitsOperational: 0,
      restorationCostPerUnit: { minorUnits: 1_000_000, currency: "USD" },
      basis: {
        kind: "game-profile",
        note: expect.stringContaining("state-transit-service:us-ne:capacity"),
      },
    });
    const position = programPosition(world, record.programKey, record.id);
    expect(position.appropriated.minorUnits).toBe(record.amount.minorUnits);
    expect(position.committed.minorUnits).toBe(0);
    expect(position.posted.minorUnits).toBe(0);
    expect(
      enactedLawEffects(world, measureId)?.lines.find(
        (line) => line.kind === "appropriation",
      ),
    ).toMatchObject({
      kind: "appropriation",
      programKey: "transit:ne",
      availableFrom: enactment.effectiveAt,
      committedMinorUnits: 0,
      paidMinorUnits: 0,
    });
  });

  it("does not invent a state transit start date when the enactment has none", () => {
    const { world, measureId } = enactFromDocket(
      "nebraska",
      {
        familyKey: "appropriations",
        variantKey: "transit-staged-service-v2",
        authorityKey: "standing:rural-transit-assistance",
      },
      undefined,
      true,
    );
    expect(
      world.history.legislativeEnactments!.find(
        (row) => row.measureId === measureId,
      )!.effectiveAt,
    ).toBeNull();
    expect(appropriations(world, measureId)).toHaveLength(0);
  });

  it("writes each effect once, however many routes apply it", () => {
    const { world, measureId } = enactFromDocket("nebraska", {
      familyKey: "appropriations",
      variantKey: "single-programme",
      authorityKey: "standing:school-facilities",
    });
    const twice = applyEnactedLawEffects(
      applyEnactedLawEffects(world, measureId),
      measureId,
    );
    expect(appropriations(twice, measureId)).toHaveLength(1);
  });

  it("says plainly which parts of a passed Alaska law the world cannot act on yet", () => {
    const { world, measureId } = enactFromDocket("alaska", {
      familyKey: "agency-reporting",
      variantKey: "annual-legislative-report",
    });
    expect(measurePosition(world, measureId).outcome).toBe("enacted");
    expect(appropriations(world, measureId)).toHaveLength(0);
    const effects = enactedLawEffects(world, measureId)!;
    expect(effects.hasTypedOperativeEffect).toBe(false);
    expect(effects.operativeEffectOutcomes).toEqual([]);
    expect(effects.lines.length).toBeGreaterThan(0);
    // A reporting duty has no consumer, so every line is an honest gap with
    // the research question behind it, never an invented effect.
    for (const line of effects.lines) {
      expect(line.kind).toBe("not-modeled");
      if (line.kind !== "not-modeled") continue;
      expect(line.heading.length).toBeGreaterThan(0);
      expect(line.researchQuestionId).toBe("law-clause-effects-by-family");
    }
  });

  it("reports the exact missing-authority result for a typed but unapplied amount", () => {
    const { world, measureId } = enactFromDocket("nebraska", {
      familyKey: "appropriations",
      variantKey: "single-programme",
      authorityKey: "standing:school-facilities",
    });
    const amountProvision = currentMeasureProvisions(world, measureId).find(
      (provision) => provision.provisionKey === "amount-provided",
    )!;
    const typedWorld: World = {
      ...world,
      history: {
        ...world.history,
        legislativeProvisions: world.history.legislativeProvisions!.map(
          (provision) =>
            provision.id === amountProvision.id
              ? {
                  ...provision,
                  operativeEffect: {
                    kind: "public-program-appropriation" as const,
                  },
                }
              : provision,
        ),
      },
    };
    expect(enactedLawEffects(typedWorld, measureId)).toMatchObject({
      hasTypedOperativeEffect: true,
      operativeEffectOutcomes: [
        {
          effectKind: "public-program-appropriation",
          status: "applied",
          refusalReason: null,
        },
      ],
    });
    const withoutAuthority: World = {
      ...typedWorld,
      history: {
        ...typedWorld.history,
        publicProgramRecords: (
          typedWorld.history.publicProgramRecords ?? []
        ).filter(
          (record) =>
            !(
              record.kind === "appropriation" &&
              record.sourceMeasureId === measureId
            ),
        ),
      },
    };
    expect(enactedLawEffects(withoutAuthority, measureId)).toMatchObject({
      hasTypedOperativeEffect: true,
      operativeEffectOutcomes: [
        {
          effectKind: "public-program-appropriation",
          status: "refused",
          refusalReason:
            "No spending authority matching the typed amount and jurisdiction was recorded.",
        },
      ],
    });
  });

  it("reads a law's effects without spending a day or writing a fact", () => {
    const { world, measureId } = enactFromDocket("nebraska", {
      familyKey: "appropriations",
      variantKey: "single-programme",
      authorityKey: "standing:school-facilities",
    });
    const before = serializeWorld(world);
    enactedLawEffects(world, measureId);
    enactedLawsWithEffects(world);
    expect(serializeWorld(world)).toBe(before);
  });

  it("tells the player on the bill's page what the law changed", () => {
    const { world, measureId } = enactFromDocket("nebraska", {
      familyKey: "appropriations",
      variantKey: "single-programme",
      authorityKey: "standing:school-facilities",
    });
    const briefing = projectMeasureBriefing(world, measureId);
    expect(briefing.whatItChanged.length).toBeGreaterThan(0);
    const money = briefing.whatItChanged.find((line) => line.includes("$"));
    expect(money).toMatch(/available to spend|can be spent from/);
    // No source, research id or internal key reaches the page.
    for (const line of briefing.whatItChanged)
      expect(line).not.toMatch(/law-clause|research|standing:/i);

    const reporting = enactFromDocket("alaska", {
      familyKey: "agency-reporting",
      variantKey: "annual-legislative-report",
    });
    const gaps = projectMeasureBriefing(
      reporting.world,
      reporting.measureId,
    ).whatItChanged;
    expect(
      gaps.every((line) =>
        line.endsWith("nothing in the world acts on this part of the law yet."),
      ),
    ).toBe(true);
  });

  it("shows nothing on the page of a bill that is not law", () => {
    const scenario = createLegislativeScenario("alaska");
    const filed = fileDraft(scenario.world, {
      scenarioKey: "alaska",
      playerPersonId: scenario.playerPersonId,
      jurisdictionId:
        scenario.world.history.legislativeMeasures![0]!.jurisdictionId,
      familyKey: "agency-reporting",
      variantKey: "annual-legislative-report",
    });
    expect(
      projectMeasureBriefing(filed.world, filed.bill.measureId).whatItChanged,
    ).toEqual([]);
  });

  it("has nothing to say about a bill that is not law", () => {
    const scenario = createLegislativeScenario("alaska");
    const filed = fileDraft(scenario.world, {
      scenarioKey: "alaska",
      playerPersonId: scenario.playerPersonId,
      jurisdictionId:
        scenario.world.history.legislativeMeasures![0]!.jurisdictionId,
      familyKey: "agency-reporting",
      variantKey: "annual-legislative-report",
    });
    expect(enactedLawEffects(filed.world, filed.bill.measureId)).toBeNull();
    expect(applyEnactedLawEffects(filed.world, filed.bill.measureId)).toBe(
      filed.world,
    );
  });
});
