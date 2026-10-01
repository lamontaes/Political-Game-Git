import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { smallWorld } from "./fixtures/small-world";
import { governmentUnitsForState } from "../src/simulation/government-units";
import { lifePlaceByKey } from "../src/simulation/life-places";
import { CHIEF_EXECUTIVE_JURISDICTIONS } from "../src/simulation/nationwide-world/state-executive-candidacy-packs";
import { ensureLocalGovernmentOrganization } from "../src/simulation/nationwide-world/local-governments";
import {
  ensureLocalGovernmentSeatsForUnit,
  sittingLocalOfficers,
} from "../src/simulation/living-world/local-government-seats";
import { councilRules } from "../src/simulation/living-world/local-council-binding";
import { legislativePackForWorkKey } from "../src/simulation/legislative-institutions";
import {
  chamberByKey,
  floorStageByKey,
} from "../src/simulation/legislature-rules";
import { nextMeasureNumbering } from "../src/simulation/measure-numbering";
import {
  introduceMeasure,
  measurePosition,
  placeMeasureOnCalendar,
} from "../src/simulation/legislation";
import { personName } from "../src/simulation/people";
import { ensureCouncilPrinciples } from "../src/simulation/governing/council-lawmaking";
import { publicPartyOf } from "../src/simulation/governing/chamber-votes";
import * as clock from "../src/simulation/governing/legislative-clock";
import {
  recordMemberBallot,
  type MemberBallot,
} from "../src/simulation/governing/member-ballots";
import {
  deserializeWorld,
  serializeWorld,
} from "../src/simulation/serialization";
import type { LegislativeProcedureContext } from "../src/simulation/legislation-scenarios";
import { applyLegislativeStep } from "../src/presentation/legislation-session";

const seed = "making-laws-player-floor-all56-20261001";
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
    rank: createHash("sha256").update(`${seed}:${entry.unit.id}`).digest("hex"),
  }))
  .sort((a, b) => a.rank.localeCompare(b.rank))
  .slice(0, 5);

function opening(entry: (typeof cases)[number], ballot: MemberBallot | null) {
  const game = smallWorld({ place: entry.place.key, seed });
  let world = ensureLocalGovernmentSeatsForUnit(
    ensureLocalGovernmentOrganization(game.world, entry.unit),
    entry.unit,
    game.jurisdictionId,
    [game.personId],
  );
  const members = sittingLocalOfficers(world, entry.unit).filter(
    (seat) => !seat.mayor,
  );
  expect(members.length).toBeGreaterThan(0);
  expect(members.every((member) => member.participationId)).toBe(true);
  world = ensureCouncilPrinciples(world, members);
  // This existing actual seat becomes the controlled player for the supplied
  // procedure context. No new office, permission or vote outcome is created.
  const playerPersonId = members[0]!.personId;
  world = { ...world, control: { kind: "person", personId: playerPersonId } };
  const chamber = chamberByKey(entry.pack, "council");
  world = introduceMeasure(world, {
    stableKey: "making-laws-player-floor:authored-room-policy",
    rulePackId: entry.pack.packId,
    jurisdictionId: game.jurisdictionId,
    ...nextMeasureNumbering(world, {
      jurisdictionId: game.jurisdictionId,
      originChamber: chamber,
      rulePackId: entry.pack.packId,
    }),
    shortTitle: "Council meeting room policy",
    summary:
      "Authored nonfiscal proposal isolates the actual player-session floor caller.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    originChamberKey: chamber.chamberKey,
    sponsorPersonId: members.at(-1)!.personId,
  });
  const bill = world.history.legislativeMeasures!.at(-1)!;
  world = placeMeasureOnCalendar(world, {
    stableKey: `${bill.stableKey}:calendar`,
    measureId: bill.id,
  });
  const stage = floorStageByKey(
    chamber,
    measurePosition(world, bill.id).floorStageKey!,
  );
  if (ballot)
    world = recordMemberBallot(world, {
      personId: playerPersonId,
      jurisdictionId: game.jurisdictionId,
      question: {
        measureId: bill.id,
        purpose: "floor-stage",
        forumKey: chamber.chamberKey,
        floorStageKey: stage.stageKey,
      },
      ballot,
      summary:
        "The controlled actual member explicitly records this fixture ballot.",
    });
  const context: LegislativeProcedureContext = {
    pack: entry.pack,
    measureId: bill.id,
    bodies: [
      {
        chamberKey: chamber.chamberKey,
        chamberName: chamber.name,
        members: members.map((member) => ({
          memberKey: member.participationId!,
          personId: member.personId,
          name: personName(world.people[member.personId]!),
          caucusLabel: publicPartyOf(world, member.personId) ?? "No party",
        })),
      },
    ],
    committeeMemberCount: null,
    votePlan: {},
    governorAction: null,
    governorRationale: "This context tests a floor call only.",
    memberDecisions: { playerPersonId },
  };
  return { world, bill, members, context, playerPersonId };
}

afterEach(() => vi.restoreAllMocks());

describe(`Making Laws player floor caller (seed ${seed})`, () => {
  it("samples five actual council places from the all-56 catalog", () => {
    expect(CHIEF_EXECUTIVE_JURISDICTIONS).toHaveLength(56);
    expect(cases).toHaveLength(5);
    expect(new Set(cases.map(({ unit }) => unit.id)).size).toBe(5);
  });

  describe.each(cases)("actual player floor in $place.key", (entry) => {
    it.each([null, "nay"] as const)(
      "preserves the player's %s ballot through the shared driver and Continue",
      (ballot) => {
        const fixture = opening(entry, ballot);
        const driver = vi.spyOn(clock, "applyInstitutionStep");
        const result = applyLegislativeStep(
          fixture.context,
          fixture.world,
          "move-floor-vote",
        );
        expect(driver).toHaveBeenCalledTimes(1);
        const supplied = driver.mock.calls[0]![3]!.recordedFloorVote!;
        expect(supplied.measureId).toBe(fixture.bill.id);
        expect(supplied.seatedMemberPersonIds).toEqual(
          fixture.members.map((member) => member.personId),
        );
        const votes = result.world.history.legislativeVotes!.filter(
          (row) => row.measureId === fixture.bill.id,
        );
        expect(votes).toHaveLength(1);
        const vote = votes[0]!;
        expect(vote.provenance.method).toBe("member-decisions");
        expect(vote.dispositions).toEqual(supplied.dispositions);
        expect(vote.provenance).toEqual(supplied.provenance);
        expect(vote.dispositions.map((row) => row.personId).sort()).toEqual(
          fixture.members.map((member) => member.personId).sort(),
        );
        expect(
          vote.dispositions.find(
            (row) => row.personId === fixture.playerPersonId,
          )?.disposition,
        ).toBe(ballot ?? "absent");
        for (const row of vote.dispositions) {
          expect(row.reason).toBeTruthy();
          expect(personName(result.world.people[row.personId!]!)).not.toBe("");
        }
        const resumed = deserializeWorld(serializeWorld(result.world));
        expect(resumed).toEqual(result.world);
        const repeated = applyLegislativeStep(
          fixture.context,
          resumed,
          "move-floor-vote",
        );
        expect(repeated.world).toEqual(resumed);
        expect(sittingLocalOfficers(repeated.world, entry.unit)).toEqual(
          sittingLocalOfficers(fixture.world, entry.unit),
        );
        expect(repeated.world.control).toEqual(fixture.world.control);
        console.info(
          "[making-laws-player-floor]",
          JSON.stringify({
            seed,
            place: entry.place.key,
            player: personName(resumed.people[fixture.playerPersonId]!),
            ballot,
            billId: fixture.bill.id,
            outcome: vote.outcome,
            dispositions: vote.dispositions,
          }),
        );
      },
    );
  });

  it("refuses a duplicate actual member before writing a floor vote", () => {
    const fixture = opening(cases[0]!, null);
    const body = fixture.context.bodies[0]!;
    const forgedContext = {
      ...fixture.context,
      bodies: [{ ...body, members: [...body.members, body.members[0]!] }],
    };
    const result = applyLegislativeStep(
      forgedContext,
      fixture.world,
      "move-floor-vote",
    );
    expect(result.world).toBe(fixture.world);
    expect(result.message).toBe(
      "A member cannot vote twice on one floor question.",
    );
    expect(result.world.history.legislativeVotes ?? []).toEqual([]);
  });

  it("refuses an empty body without inventing a vote", () => {
    const fixture = opening(cases[0]!, null);
    const body = fixture.context.bodies[0]!;
    const result = applyLegislativeStep(
      { ...fixture.context, bodies: [{ ...body, members: [] }] },
      fixture.world,
      "move-floor-vote",
    );
    expect(result.world).toBe(fixture.world);
    expect(result.message).toBe(
      "No seated members can decide this floor question.",
    );
    expect(result.world.history.legislativeVotes ?? []).toEqual([]);
  });

  it.todo(
    "the ordinary elected-office UI supplies every real body's dated seat context to this caller",
  );
  it.todo(
    "authored non-person legacy scenarios use an admitted shared-driver adapter",
  );
});
