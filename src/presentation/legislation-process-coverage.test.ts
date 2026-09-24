import { describe, expect, it } from "vitest";

import { suppliedLegislativeSeat } from "../../tests/fixtures/supplied-legislative-seat";
import { addDays, makeIsoDate } from "../simulation/dates";
import {
  enactedRuleChangeAt,
  fileRuleChangeProvision,
  ruleValueInWorld,
} from "../simulation/enacted-rule-changes";
import {
  seatsForChamber,
  legislatureForState,
} from "../simulation/legislature-game-profile";
import {
  availableMeasureSteps,
  introduceMeasure,
  measurePosition,
} from "../simulation/legislation";
import {
  seatBodyForPack,
  votePlanKeyForAmendment,
  votePlanKeyForCommittee,
  votePlanKeyForFloor,
  type LegislativeProcedureContext,
} from "../simulation/legislation-scenarios";
import { rulePackById } from "../simulation/legislature-rule-packs";
import {
  legislativeProcedureForJurisdiction,
  legislativeRulePackForWorld,
  regularSessionDateStatus,
  regularSessionYearForWorld,
} from "../simulation/legislative-procedure-world";
import { stateJurisdictionForKey } from "../simulation/life-places";
import { deserializeWorld, serializeWorld } from "../simulation/serialization";
import { STATES, isTerritoryUsps } from "../simulation/state-reference";
import type { EntityId, World } from "../simulation/types";
import { assertWorldIntegrity, createWorld } from "../simulation/world";
import { ensureWorldStartingConditions } from "../simulation/world-setup/conditions";
import { CRUNCH46_WORLD_OPENING_VERSION } from "../simulation/world-setup/types";
import { applyLegislativeStep } from "./legislation-session";
import {
  legislativeWorkAvailableIn,
  openLegislativeWork,
} from "./legislation-world";

/**
 * This measures direct institutional procedure with authored unanimous votes.
 * It does not establish that an ordinary player can win a seat or persuade one.
 */
const STATE_CODES = Object.keys(STATES)
  .filter((usps) => usps !== "DC" && !isTerritoryUsps(usps))
  .sort();

interface FiledProcedure {
  readonly world: World;
  readonly measureId: EntityId;
  readonly context: LegislativeProcedureContext;
  readonly stateUsps: string;
  readonly officeKey: string;
  readonly originalSeats: number;
}

function fileProcedureBill(
  stateUsps: string,
  base: World,
  pack: ReturnType<typeof rulePackById>,
): FiledProcedure {
  const jurisdictionKey = `US-${stateUsps}`;
  const identity = stateJurisdictionForKey(jurisdictionKey);
  if (!identity)
    throw new Error(`${stateUsps}: no state jurisdiction identity`);
  const chamberKey = pack.chamberOrder[0];
  if (!chamberKey) throw new Error(`${stateUsps}: no origin chamber`);
  const originalSeats = seatsForChamber(pack, chamberKey)?.seats;
  if (!originalSeats) throw new Error(`${stateUsps}: no seated origin chamber`);

  const world = introduceMeasure(base, {
    stableKey: `matrix:${stateUsps}:bill`,
    jurisdictionId: identity.id,
    rulePackId: pack.packId,
    designation: `${stateUsps} Test Bill 1`,
    shortTitle: "Fixture chamber rule bill",
    summary: "A fictional development bill used to exercise state procedure.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    originChamberKey: chamberKey,
  });
  const measureId = world.history.legislativeMeasures?.at(-1)?.id;
  if (!measureId) throw new Error(`${stateUsps}: bill was not recorded`);

  const bodies = pack.chambers.map((chamber) => {
    const count = seatsForChamber(pack, chamber.chamberKey)?.seats;
    if (!count)
      throw new Error(`${stateUsps}: ${chamber.chamberKey} has no seats`);
    return seatBodyForPack(
      chamber.chamberKey,
      chamber.name,
      count,
      [],
      pack.structure === "unicameral",
    );
  });
  const votePlan: Record<string, { readonly yea: number }> = {};
  for (const chamber of pack.chambers) {
    const body = bodies.find(
      (candidate) => candidate.chamberKey === chamber.chamberKey,
    )!;
    for (const committee of chamber.committees) {
      votePlan[votePlanKeyForCommittee(committee.committeeKey)] = {
        yea: Math.min(body.members.length, committee.appointedMembers),
      };
    }
    for (const stage of chamber.floorStages) {
      votePlan[votePlanKeyForFloor(chamber.chamberKey, stage.stageKey)] = {
        yea: body.members.length,
      };
    }
    votePlan[votePlanKeyForAmendment(chamber.chamberKey)] = {
      yea: body.members.length,
    };
  }
  return {
    world,
    measureId,
    stateUsps,
    officeKey: `${pack.packId}:${chamberKey}`,
    originalSeats,
    context: {
      pack,
      measureId,
      bodies,
      committeeMemberCount: null,
      votePlan,
      governorAction: "signed",
      governorRationale: "The fictional executive signed this fixture bill.",
    },
  };
}

function fileFixtureBill(stateUsps: string): FiledProcedure {
  const jurisdictionKey = `US-${stateUsps}`;
  const identity = stateJurisdictionForKey(jurisdictionKey);
  if (!identity)
    throw new Error(`${stateUsps}: no state jurisdiction identity`);
  const selected = legislatureForState(jurisdictionKey);
  if (!selected) throw new Error(`${stateUsps}: no legislature profile`);
  // The legacy fixture deliberately has no saved starting procedure record.
  const pack = rulePackById(selected.packId);
  const base = createWorld({
    seed: `state-bill-process-matrix:${stateUsps}`,
    currentDate: makeIsoDate("2026-01-05"),
    jurisdictions: [identity],
    people: [],
  });
  return fileProcedureBill(stateUsps, base, pack);
}

const savedMatrixWorlds = new Map<number, World>();

function savedMatrixWorld(year: number): World {
  const existing = savedMatrixWorlds.get(year);
  if (existing) return existing;
  const jurisdictions = STATE_CODES.map((usps) => {
    const identity = stateJurisdictionForKey(`US-${usps}`);
    if (!identity) throw new Error(`${usps}: no state jurisdiction identity`);
    return identity;
  });
  const world = ensureWorldStartingConditions(
    createWorld({
      seed: "state-bill-saved-process-matrix",
      currentDate: makeIsoDate(`${year}-01-05`),
      jurisdictions,
      people: [],
    }),
    { openingVersion: CRUNCH46_WORLD_OPENING_VERSION },
  );
  savedMatrixWorlds.set(year, world);
  return world;
}

function fileSavedFixtureBill(stateUsps: string): FiledProcedure {
  const jurisdictionKey = `US-${stateUsps}`;
  const identity = stateJurisdictionForKey(jurisdictionKey);
  if (!identity)
    throw new Error(`${stateUsps}: no state jurisdiction identity`);
  const initial = savedMatrixWorld(2026);
  const profile = legislativeProcedureForJurisdiction(initial, identity.id);
  if (!profile) throw new Error(`${stateUsps}: no saved starting procedure`);
  const year =
    profile.sessionCadence === "biennial" && profile.sessionYearParity === "odd"
      ? 2027
      : 2026;
  const base = savedMatrixWorld(year);
  if (!regularSessionYearForWorld(base, identity.id, year)) {
    throw new Error(`${stateUsps}: selected year is outside saved cadence`);
  }
  const pack = legislativeRulePackForWorld(base, profile.baselinePack.packId);
  if (
    regularSessionDateStatus(pack, base.currentDate).kind !==
    "within-outer-limit"
  ) {
    throw new Error(`${stateUsps}: selected date is outside saved session`);
  }
  return fileProcedureBill(stateUsps, base, pack);
}

function enactFiledBill(
  filed: FiledProcedure,
  startingWorld = filed.world,
): World {
  let world = startingWorld;
  for (let guard = 0; guard < 40; guard += 1) {
    const position = measurePosition(world, filed.measureId);
    if (position.phase === "enacted") return world;
    if (position.terminal) {
      throw new Error(`${filed.stateUsps}: bill ended as ${position.outcome}`);
    }
    const step = availableMeasureSteps(world, filed.measureId).find(
      (candidate) => candidate !== "offer-amendment",
    );
    if (!step) {
      throw new Error(
        `${filed.stateUsps}: no executable step at ${position.phase}`,
      );
    }
    try {
      world = applyLegislativeStep(filed.context, world, step).world;
    } catch (error) {
      throw new Error(
        `${filed.stateUsps}: ${position.phase} / ${step}: ${String(error)}`,
      );
    }
  }
  throw new Error(`${filed.stateUsps}: procedure exceeded 40 steps`);
}

function reachFirstFloor(filed: FiledProcedure): World {
  let world = filed.world;
  for (let guard = 0; guard < 10; guard += 1) {
    const position = measurePosition(world, filed.measureId);
    if (position.phase === "on-floor") return world;
    const step = availableMeasureSteps(world, filed.measureId).find(
      (candidate) => candidate !== "offer-amendment",
    );
    if (!step) {
      throw new Error(
        `${filed.stateUsps}: no step to first floor at ${position.phase}`,
      );
    }
    world = applyLegislativeStep(filed.context, world, step).world;
  }
  throw new Error(
    `${filed.stateUsps}: did not reach its first floor in ten steps`,
  );
}

describe("one shared state bill procedure across the fifty states", () => {
  it("enumerates fifty state identities, excluding the District and territories", () => {
    expect(STATE_CODES).toHaveLength(50);
  });

  it.each(STATE_CODES)(
    "%s: files and enacts a direct procedure bill",
    (usps) => {
      const filed = fileFixtureBill(usps);
      expect(rulePackById(filed.context.pack.packId).jurisdictionKey).toBe(
        `US-${usps}`,
      );
      const enacted = enactFiledBill(filed);
      expect(measurePosition(enacted, filed.measureId).outcome).toBe("enacted");
      expect(enacted.history.legislativeEnactments?.at(-1)?.measureId).toBe(
        filed.measureId,
      );
    },
  );

  it.each(STATE_CODES)(
    "%s: saved starting procedure files and enacts a direct bill",
    (usps) => {
      const filed = fileSavedFixtureBill(usps);
      const enacted = enactFiledBill(filed);
      const profile = legislativeProcedureForJurisdiction(
        enacted,
        stateJurisdictionForKey(`US-${usps}`)!.id,
      );
      if (!profile) throw new Error(`${usps}: saved procedure disappeared`);
      const enactment = enacted.history.legislativeEnactments?.at(-1);
      expect(measurePosition(enacted, filed.measureId).outcome).toBe("enacted");
      expect(enactment).toMatchObject({
        measureId: filed.measureId,
        effectiveDateBasis: "game-default",
        effectiveDateGameProfile: {
          version: profile.procedureProvenance.version,
          days: profile.effectiveDateDays,
        },
      });
      expect(enactment?.effectiveAt).toBe(
        addDays(enactment!.resolvedAt, profile.effectiveDateDays),
      );
    },
  );

  it("reloads a saved Kentucky direct enactment with its effective-date terms", () => {
    const filed = fileSavedFixtureBill("KY");
    const enacted = enactFiledBill(filed);
    const loaded = deserializeWorld(serializeWorld(enacted));
    expect(loaded.history.legislativeEnactments?.at(-1)).toEqual(
      enacted.history.legislativeEnactments?.at(-1),
    );
    expect(
      legislativeRulePackForWorld(loaded, filed.context.pack.packId),
    ).toEqual(filed.context.pack);
    expect(() => assertWorldIntegrity(loaded)).not.toThrow();
  });

  it("measures amendment admission and adoption across the same fifty packs", () => {
    const admitted: string[] = [];
    const unavailable: string[] = [];
    for (const usps of STATE_CODES) {
      const filed = fileFixtureBill(usps);
      const floor = reachFirstFloor(filed);
      const steps = availableMeasureSteps(floor, filed.measureId);
      if (!steps.includes("offer-amendment")) {
        unavailable.push(usps);
        continue;
      }
      admitted.push(usps);
      const beforeProvisions = floor.history.legislativeProvisions ?? [];
      const amended = applyLegislativeStep(
        filed.context,
        floor,
        "offer-amendment",
      ).world;
      expect(amended.history.legislativeAmendments?.at(-1)?.status).toBe(
        "adopted",
      );
      expect(measurePosition(amended, filed.measureId).phase).toBe("on-floor");
      // A generic floor vote records the amendment. Only the provision-revision
      // bridge changes the bill's operative text.
      expect(amended.history.legislativeProvisions ?? []).toEqual(
        beforeProvisions,
      );
    }
    expect(admitted.length + unavailable.length).toBe(50);
    expect(unavailable).toEqual(["AK", "IL", "MD", "MN", "MO", "NV", "OH"]);
    expect(admitted).toHaveLength(43);
  });

  it.each(STATE_CODES)(
    "%s: admits a supplied member seat through its listed work route",
    (usps) => {
      const stateKey = `US-${usps}`;
      const pack = legislatureForState(stateKey);
      if (!pack) throw new Error(`${usps}: missing legislature profile`);
      const chamberKey = pack.chamberOrder[0];
      if (!chamberKey) throw new Error(`${usps}: missing origin chamber`);
      const seat = suppliedLegislativeSeat(stateKey, chamberKey);
      const scenarioKey = legislativeWorkAvailableIn(seat.jurisdictionId)[0];
      if (!scenarioKey) throw new Error(`${usps}: no listed legislative work`);
      const opened = openLegislativeWork(seat.world, {
        scenarioKey,
        playerPersonId: seat.personId,
        jurisdictionId: seat.jurisdictionId,
      });
      expect(opened.assignment.measureId).toBeDefined();
      expect(opened.assignment.procedure.pack.packId).toBe(seat.packId);
    },
  );

  it.each(["NE", "AK", "TX"])(
    "%s: an enacted rule changes a saved world after its effective date",
    (usps) => {
      const filed = fileFixtureBill(usps);
      const changedSeats = filed.originalSeats + 1;
      const proposed = fileRuleChangeProvision(filed.world, {
        stableKey: `matrix:${usps}:seat-rule`,
        measureId: filed.measureId,
        officeKey: filed.officeKey,
        field: "body.seats",
        value: changedSeats,
      });
      const enacted = enactFiledBill(filed, proposed);
      const enactment = enacted.history.legislativeEnactments?.at(-1);
      expect(enactment?.measureId).toBe(filed.measureId);
      expect(enactment?.effectiveAt).not.toBeNull();
      const effectiveAt = enactment!.effectiveAt!;
      const loaded = deserializeWorld(serializeWorld(enacted));
      expect(loaded.history.legislativeEnactments?.at(-1)).toMatchObject({
        measureId: filed.measureId,
        effectiveAt,
        effectiveDateBasis: usps === "AK" ? "source-default" : "game-default",
      });
      const reading = (world: World, date: string) =>
        ruleValueInWorld(
          world,
          {
            jurisdiction: `US-${usps}`,
            officeKey: filed.officeKey,
            field: "body.seats",
            onDate: makeIsoDate(date),
          },
          filed.originalSeats,
        );
      // The reader calls any baseline "compiled", including Texas's game profile.
      expect(reading(loaded, addDays(effectiveAt, -1))).toEqual({
        source: "compiled",
        value: filed.originalSeats,
      });
      expect(reading(loaded, effectiveAt)).toMatchObject({
        source: "enacted",
        value: changedSeats,
        measureId: filed.measureId,
        instrument: "statute",
      });
      expect(
        enactedRuleChangeAt(loaded, {
          stateUsps: usps,
          officeKey: filed.officeKey,
          field: "body.seats",
          onDate: effectiveAt,
        }),
      ).toMatchObject({
        value: changedSeats,
        measureId: filed.measureId,
        instrument: "statute",
      });
      expect(() => assertWorldIntegrity(loaded)).not.toThrow();
    },
  );
});
