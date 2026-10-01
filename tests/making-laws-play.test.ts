import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { smallWorld } from "./fixtures/small-world";
import { governmentUnitsForState } from "../src/simulation/government-units";
import { lifePlaceByKey } from "../src/simulation/life-places";
import { CHIEF_EXECUTIVE_JURISDICTIONS } from "../src/simulation/nationwide-world/state-executive-candidacy-packs";
import { ensureLocalGovernmentOrganization } from "../src/simulation/nationwide-world/local-governments";
import {
  ensureLocalGovernmentSeatsForUnit,
  organizationIdFor,
  sittingLocalOfficers,
} from "../src/simulation/living-world/local-government-seats";
import { councilRules } from "../src/simulation/living-world/local-council-binding";
import { legislativePackForWorkKey } from "../src/simulation/legislative-institutions";
import { chamberByKey } from "../src/simulation/legislature-rules";
import { nextMeasureNumbering } from "../src/simulation/measure-numbering";
import {
  introduceMeasure,
  measurePosition,
} from "../src/simulation/legislation";
import { personName } from "../src/simulation/people";
import { completeCouncilPassage } from "../src/simulation/municipal-ordinance-procedure";
import {
  serializeWorld,
  deserializeWorld,
} from "../src/simulation/serialization";
import { ensureCouncilPrinciples } from "../src/simulation/governing/council-lawmaking";
import { applyInstitutionStep } from "../src/simulation/governing/legislative-clock";

// The Making Laws script currently reaches a real town council. The seed
// selects places from all 56 jurisdictions; it never selects a vote outcome.
// Pending steps below name the planned paths this script does not yet prove.
const SEED = "making-laws-play-20261001";
const cases = CHIEF_EXECUTIVE_JURISDICTIONS.flatMap(governmentUnitsForState)
  .flatMap((unit) => {
    const rules = councilRules(unit);
    const place = unit.placeGeoid ? lifePlaceByKey(unit.placeGeoid) : null;
    const pack = rules
      ? legislativePackForWorkKey(`institution:${rules.packId}`)
      : null;
    return unit.unitType === "municipality" &&
      unit.functionalActive &&
      rules?.governmentKey === null &&
      place &&
      pack
      ? [{ unit, place, pack }]
      : [];
  })
  .map((entry) => ({
    ...entry,
    rank: createHash("sha256").update(`${SEED}:${entry.unit.id}`).digest("hex"),
  }))
  .sort((a, b) => a.rank.localeCompare(b.rank))
  .slice(0, 5);

function fileBill({ unit, place, pack }: (typeof cases)[number]) {
  const opening = smallWorld({ place: place.key, seed: SEED });
  let world = ensureLocalGovernmentSeatsForUnit(
    ensureLocalGovernmentOrganization(opening.world, unit),
    unit,
    opening.jurisdictionId,
    [opening.personId],
  );
  const officers = sittingLocalOfficers(world, unit);
  const members = officers.filter((seat) => !seat.mayor);
  expect(organizationIdFor(world, unit)).not.toBeNull();
  expect(members.length).toBeGreaterThan(0);
  world = ensureCouncilPrinciples(world, officers);
  const numbering = nextMeasureNumbering(world, {
    jurisdictionId: opening.jurisdictionId,
    originChamber: chamberByKey(pack, "council"),
    rulePackId: pack.packId,
  });
  world = introduceMeasure(world, {
    stableKey: "making-laws-play:authored-room-policy",
    rulePackId: pack.packId,
    jurisdictionId: opening.jurisdictionId,
    ...numbering,
    shortTitle: "Council meeting room policy",
    summary: "An authored nonfiscal proposal for the recorded council.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    originChamberKey: "council",
    sponsorPersonId: members[0]!.personId,
  });
  return {
    world,
    bill: world.history.legislativeMeasures!.at(-1)!,
    members,
    context: {
      localCouncil: {
        governmentUnitId: unit.id,
        townJurisdictionId: opening.jurisdictionId,
        playerPersonId: null,
      },
    },
  };
}

function voteOnBill(entry: (typeof cases)[number]) {
  const filed = fileBill(entry);
  let world = filed.world;
  if (measurePosition(world, filed.bill.id).phase === "awaiting-referral") {
    const placed = applyInstitutionStep(
      world,
      filed.bill.id,
      (w) => w,
      filed.context,
    );
    expect(placed.kind).toBe("applied");
    if (placed.kind !== "applied") throw new Error("Council placement failed");
    world = placed.world;
  }
  const result = applyInstitutionStep(
    world,
    filed.bill.id,
    (w) => w,
    filed.context,
  );
  expect(result.kind).toBe("applied");
  if (result.kind !== "applied") throw new Error("Council vote failed");
  const votes = result.world.history.legislativeVotes!.filter(
    (row) => row.measureId === filed.bill.id,
  );
  expect(votes).toHaveLength(1);
  return { ...filed, world: result.world, vote: votes[0]! };
}

describe(`Making Laws play script (seed ${SEED})`, () => {
  it("draws five actual council places from the all-56 jurisdiction catalog", () => {
    expect(CHIEF_EXECUTIVE_JURISDICTIONS).toHaveLength(56);
    expect(cases).toHaveLength(5);
    expect(new Set(cases.map(({ unit }) => unit.id)).size).toBe(5);
  });

  describe.each(cases)("town council in $place.key", (entry) => {
    it("step 1: a sitting member files a numbered proposal in their own council", () => {
      const { world, bill, members } = fileBill(entry);
      expect(bill.rulePackId).toBe(entry.pack.packId);
      expect(bill.sponsorPersonId).toBe(members[0]!.personId);
      expect(personName(world.people[bill.sponsorPersonId!]!)).not.toBe("");
      expect(bill.designation).not.toBe("");
      expect(world.history.legislativeMeasures).toHaveLength(1);
    });

    it("step 2: the shared driver records each actual member's vote and reason", () => {
      const { world, vote, members } = voteOnBill(entry);
      expect(vote.dispositions.map((row) => row.personId).sort()).toEqual(
        members.map((row) => row.personId).sort(),
      );
      for (const row of vote.dispositions) {
        expect(row.reason).toBeTruthy();
        expect(personName(world.people[row.personId!]!)).not.toBe("");
      }
      expect(vote.outcome).toBe("passed");
    });

    it("step 3: the passed proposal receives exactly one saved enactment", () => {
      const { world, bill } = voteOnBill(entry);
      const enacted = completeCouncilPassage(world, bill, null);
      const acts = enacted.history.legislativeEnactments!.filter(
        (row) => row.measureId === bill.id,
      );
      expect(acts).toHaveLength(1);
      expect(acts[0]!.outcome).toBe("enacted");
    });

    it("step 4: Continue preserves the bill, members, votes and enactment", () => {
      const { world, bill, context } = voteOnBill(entry);
      const enacted = completeCouncilPassage(world, bill, null);
      const resumed = deserializeWorld(serializeWorld(enacted));
      expect(resumed).toEqual(enacted);
      const repeated = applyInstitutionStep(
        resumed,
        bill.id,
        (w) => w,
        context,
      );
      const after = repeated.kind === "applied" ? repeated.world : resumed;
      expect(after.history.legislativeMeasures).toEqual(
        enacted.history.legislativeMeasures,
      );
      expect(after.history.legislativeVotes).toEqual(
        enacted.history.legislativeVotes,
      );
      expect(after.history.legislativeEnactments).toEqual(
        enacted.history.legislativeEnactments,
      );
      expect(sittingLocalOfficers(after, entry.unit)).toEqual(
        sittingLocalOfficers(enacted, entry.unit),
      );
    });
  });

  it.todo(
    "step 1b / A72: the same agenda filer introduces bills for councils, Congress and states",
  );
  it.todo(
    "step 2b / A77 and A78: the player's session, compiled councils, DC, Congress and states use the same bill driver",
  );
  it.todo(
    "step 3b / A83: one saved effective date governs every law reader, including an on-adoption town law",
  );
  it.todo(
    "step 3c / A76: every body's title, support and repeal use the same rules",
  );
});
