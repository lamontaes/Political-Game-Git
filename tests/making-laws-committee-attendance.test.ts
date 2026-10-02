import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { smallWorld } from "./fixtures/small-world";
import { CHIEF_EXECUTIVE_JURISDICTIONS } from "../src/simulation/nationwide-world/state-executive-candidacy-packs";
import { drawLegislativeStartingProcedures } from "../src/simulation/legislative-starting-procedures";
import { ensureWorldStartingConditions } from "../src/simulation/world-setup/conditions";
import { CRUNCH46_WORLD_OPENING_VERSION } from "../src/simulation/world-setup/types";
import {
  legislativeProcedureForJurisdiction,
  legislativeRulePackForWorld,
} from "../src/simulation/legislative-procedure-world";
import { seatedChamberForPack } from "../src/simulation/governing/chamber-votes";
import { committeeRoster } from "../src/simulation/governing/committee-assignment";
import { applyInstitutionStep } from "../src/simulation/governing/legislative-clock";
import {
  introduceMeasure,
  referMeasure,
  scheduleCommitteeHearing,
} from "../src/simulation/legislation";
import { advanceWorld } from "../src/simulation/world";
import {
  majorityOf,
  resolveRequiredVotes,
} from "../src/simulation/legislature-rules";
import { nextMeasureNumbering } from "../src/simulation/measure-numbering";
import { addDays } from "../src/simulation/dates";

const seed = "making-laws-committee-attendance-all56-20261002";
const procedures = drawLegislativeStartingProcedures({ seed });
const cases = CHIEF_EXECUTIVE_JURISDICTIONS.filter((usps) => {
  const entry = procedures[`US-${usps}`];
  return entry && entry.baselinePack.chambers[0]?.committees[0];
})
  .map((usps) => ({
    usps,
    rank: createHash("sha256").update(`${seed}:${usps}`).digest("hex"),
  }))
  .sort((a, b) => a.rank.localeCompare(b.rank))
  .slice(0, 5);

function opening(usps: string, presentRule: boolean) {
  const cadence = procedures[`US-${usps}`]!;
  const game = smallWorld({
    place: usps,
    seed,
    date: `${cadence.sessionYearParity === "odd" ? 2025 : 2026}-01-05`,
    offices: ["state-legislature"],
  });
  let world = ensureWorldStartingConditions(game.world, {
    openingVersion: CRUNCH46_WORLD_OPENING_VERSION,
  });
  const procedure = legislativeProcedureForJurisdiction(
    world,
    game.stateJurisdictionId,
  )!;
  // Explicit fictional saved-pack control changes only the report denominator.
  // It is not evidence of this jurisdiction's committee law or quorum.
  if (presentRule)
    world = {
      ...world,
      history: {
        ...world.history,
        worldConditions: world.history.worldConditions!.map((record) =>
          record.kind === "legislative-starting-procedures"
            ? {
                ...record,
                procedures: {
                  ...record.procedures,
                  [procedure.jurisdictionKey]: {
                    ...procedure,
                    baselinePack: {
                      ...procedure.baselinePack,
                      chambers: procedure.baselinePack.chambers.map(
                        (chamber) => ({
                          ...chamber,
                          committees: chamber.committees.map((committee) => ({
                            ...committee,
                            reportThreshold: majorityOf(
                              "members-present",
                              "Fictional test control: majority of actual members present",
                              {
                                authority: "game-profile",
                                citation: "Fictional committee attendance test",
                                sourceTitle: "Explicit saved test control",
                                sourceUrl: null,
                                retrievedAt: null,
                                verification: "game-profile",
                                note: "This test row establishes no actual committee law or quorum.",
                              },
                            ),
                          })),
                        }),
                      ),
                    },
                  },
                },
              }
            : record,
        ),
      },
    };
  const pack = legislativeRulePackForWorld(
    world,
    procedure.baselinePack.packId,
  );
  const chamber = pack.chambers[0]!;
  const committee = chamber.committees[0]!;
  const body = seatedChamberForPack(
    world,
    pack.packId,
    chamber.chamberKey,
    chamber.name,
  )!.body;
  const roster = committeeRoster(
    body,
    chamber.committees,
    committee.committeeKey,
    `${pack.packId}:${chamber.chamberKey}`,
  );
  expect(roster.length).toBeGreaterThan(1);
  const playerPersonId = roster[0]!.personId!;
  world = { ...world, control: { kind: "person", personId: playerPersonId } };
  world = introduceMeasure(world, {
    stableKey: `committee-attendance:${usps}:measure`,
    rulePackId: pack.packId,
    jurisdictionId: game.stateJurisdictionId,
    ...nextMeasureNumbering(world, {
      jurisdictionId: game.stateJurisdictionId,
      rulePackId: pack.packId,
      originChamber: chamber,
    }),
    shortTitle: "Committee meeting records policy",
    summary: "Authored nonfiscal attendance test proposal.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    originChamberKey: chamber.chamberKey,
    sponsorPersonId: roster.at(-1)!.personId,
  });
  const measure = world.history.legislativeMeasures!.at(-1)!;
  world = referMeasure(world, {
    stableKey: `${measure.stableKey}:referral`,
    measureId: measure.id,
    committeeKey: committee.committeeKey,
  });
  const hearingDate = addDays(world.currentDate, 1);
  world = scheduleCommitteeHearing(world, {
    stableKey: `${measure.stableKey}:hearing`,
    measureId: measure.id,
    hearingDate,
  });
  world = advanceWorld(world, 1);
  return { world, measure, roster, committee, playerPersonId };
}

describe(`Making Laws actual committee attendance (seed ${seed})`, () => {
  it("samples five eligible actual state procedures from all 56 jurisdictions", () => {
    expect(CHIEF_EXECUTIVE_JURISDICTIONS).toHaveLength(56);
    expect(cases).toHaveLength(5);
    expect(new Set(cases.map((entry) => entry.usps)).size).toBe(5);
  });
  describe.each(cases)("committee report in $usps", ({ usps }) => {
    it.each([false, true])(
      "records every actual committee member; fictional present denominator control=%s",
      (presentRule) => {
        const fixture = opening(usps, presentRule);
        const result = applyInstitutionStep(
          fixture.world,
          fixture.measure.id,
          (world) => world,
        );
        expect(result.kind).toBe("applied");
        if (result.kind !== "applied")
          throw new Error(`Committee step returned ${result.kind}`);
        const vote = result.world.history.legislativeVotes!.find(
          (entry) =>
            entry.measureId === fixture.measure.id &&
            entry.purpose === "committee-report",
        )!;
        expect(vote).toBeDefined();
        expect(
          vote.dispositions.map((member) => [
            member.memberKey,
            member.personId,
          ]),
        ).toEqual(
          fixture.roster.map((member) => [member.memberKey, member.personId]),
        );
        expect(
          vote.dispositions.find(
            (member) => member.personId === fixture.playerPersonId,
          ),
        ).toMatchObject({
          disposition: "absent",
          reason: "member:player-not-present",
        });
        expect(vote.tally.absent).toBe(1);
        const present =
          vote.tally.yea + vote.tally.nay + vote.tally.presentNotVoting;
        expect(vote.presentMembers).toBe(present);
        expect(present).toBe(fixture.roster.length - 1);
        const rule = fixture.committee.reportThreshold;
        const denominator =
          rule.countedAgainst === "members-present"
            ? present
            : rule.countedAgainst === "members-voting"
              ? vote.tally.yea + vote.tally.nay
              : fixture.committee.appointedMembers;
        expect(vote.denominatorValue).toBe(denominator);
        expect(vote.requiredVotes).toBe(
          resolveRequiredVotes(rule, denominator).requiredVotes,
        );
        expect(vote.outcome).toBe(
          vote.tally.yea >= vote.requiredVotes ? "passed" : "failed",
        );
      },
    );
  });
  it.todo(
    "reproduce the owner's Conway HB2 committee vote from the actual saved world",
  );
  it.todo(
    "enforce an acquired committee quorum contract independently of the report threshold",
  );
});
