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
import {
  introduceMeasure,
  referMeasure,
  scheduleCommitteeHearing,
  committeeHearingTransitionHandler,
  COMMITTEE_HEARING_TRANSITION_KEY,
  recordCommitteeDisposition,
} from "../src/simulation/legislation";
import { nextMeasureNumbering } from "../src/simulation/measure-numbering";
import { advanceWorld } from "../src/simulation/world";
import { addDays } from "../src/simulation/dates";
import {
  serializeWorld,
  deserializeWorld,
} from "../src/simulation/serialization";
import type { LegislativeMemberDisposition } from "../src/simulation/types";

const seed = "making-laws-committee-news-all56-20261002";
const procedures = drawLegislativeStartingProcedures({ seed });
const cases = CHIEF_EXECUTIVE_JURISDICTIONS.filter((usps) => {
  const committee =
    procedures[`US-${usps}`]?.baselinePack.chambers[0]?.committees[0];
  return (
    committee &&
    committee.appointedMembers > 2 &&
    committee.reportThreshold.countedAgainst === "committee-members-appointed"
  );
})
  .map((usps) => ({
    usps,
    rank: createHash("sha256").update(`${seed}:${usps}`).digest("hex"),
  }))
  .sort((a, b) => a.rank.localeCompare(b.rank))
  .slice(0, 5);

function opening(usps: string) {
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
  expect(roster).toHaveLength(committee.appointedMembers);
  world = introduceMeasure(world, {
    stableKey: `committee-news:${usps}:measure`,
    rulePackId: pack.packId,
    jurisdictionId: game.stateJurisdictionId,
    ...nextMeasureNumbering(world, {
      jurisdictionId: game.stateJurisdictionId,
      rulePackId: pack.packId,
      originChamber: chamber,
    }),
    shortTitle: "Committee meeting records policy",
    summary: "Authored nonfiscal proposal for public committee receipts.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    originChamberKey: chamber.chamberKey,
    sponsorPersonId: roster[0]!.personId,
  });
  const measure = world.history.legislativeMeasures!.at(-1)!;
  world = referMeasure(world, {
    stableKey: `${measure.stableKey}:referral`,
    measureId: measure.id,
    committeeKey: committee.committeeKey,
  });
  world = scheduleCommitteeHearing(world, {
    stableKey: `${measure.stableKey}:hearing`,
    measureId: measure.id,
    hearingDate: addDays(world.currentDate, 1),
  });
  world = advanceWorld(
    world,
    1,
    new Map([
      [COMMITTEE_HEARING_TRANSITION_KEY, committeeHearingTransitionHandler],
    ]),
  );
  return { world, measure, roster, committee };
}

describe(`Making Laws saved committee receipts (seed ${seed})`, () => {
  it("samples five eligible actual committee procedures from all 56 jurisdictions", () => {
    expect(CHIEF_EXECUTIVE_JURISDICTIONS).toHaveLength(56);
    expect(cases).toHaveLength(5);
  });
  describe.each(cases)("committee receipt in $usps", ({ usps }) => {
    it.each([
      "absent",
      "present-not-voting",
      "excused",
      "mixed",
      "passed",
    ] as const)(
      "preserves actual roster with explicit fictional %s ballots",
      (control) => {
        const fixture = opening(usps);
        const remaining: LegislativeMemberDisposition[] = [
          "present-not-voting",
          "absent",
          "excused",
        ];
        // Ballots are explicit fictional controls. Membership and the report rule
        // come unchanged from the actual saved jurisdiction and seated roster.
        const dispositions = fixture.roster.map((member, index) => ({
          memberKey: member.memberKey,
          personId: member.personId,
          disposition:
            control === "passed" || index === 0
              ? ("yea" as const)
              : control === "mixed"
                ? remaining[(index - 1) % remaining.length]!
                : control,
        }));
        const world = recordCommitteeDisposition(fixture.world, {
          stableKey: `${fixture.measure.stableKey}:report:${control}`,
          measureId: fixture.measure.id,
          recommendation: "favorable",
          dispositions,
          presentMembers: dispositions.filter((member) =>
            ["yea", "nay", "present-not-voting"].includes(member.disposition),
          ).length,
          rationale:
            "Explicit fictional named ballots isolate saved committee receipt categories.",
          provenance: {
            method: "authored-fixture",
            note: "Fictional ballot controls, not an observed player vote or acquired committee law.",
            sourceEntityIds: fixture.roster.map((member) => member.personId!),
          },
        });
        const vote = world.history.legislativeVotes!.find(
          (entry) =>
            entry.measureId === fixture.measure.id &&
            entry.purpose === "committee-report",
        )!;
        expect(
          vote.dispositions.map((member) => [
            member.memberKey,
            member.personId,
          ]),
        ).toEqual(
          fixture.roster.map((member) => [member.memberKey, member.personId]),
        );
        expect(vote.outcome).toBe(control === "passed" ? "passed" : "failed");
        if (control !== "passed") {
          expect(vote.tally.yea).toBe(1);
          expect(vote.tally.nay).toBe(0);
        }
        const tally = vote.tally;
        const receipt = `${tally.yea} in favor, ${tally.nay} against, ${tally.presentNotVoting} present without voting, ${tally.absent} absent, ${tally.excused} excused; ${vote.requiredVotes} of ${vote.denominatorValue} needed`;
        const expected =
          control === "passed"
            ? `The ${fixture.committee.name} reported ${fixture.measure.designation} to the floor favorably (${receipt}).`
            : `The ${fixture.committee.name} did not report ${fixture.measure.designation} (${receipt}).`;
        const action = world.history.legislativeActions!.find(
          (entry) =>
            entry.measureId === fixture.measure.id &&
            entry.kind ===
              (control === "passed"
                ? "committee-reported"
                : "committee-not-reported"),
        )!;
        expect(action.summary).toBe(expected);
        const event = world.history.events.find(
          (entry) => entry.id === action.eventId,
        )!;
        expect(event.summary).toBe(expected);
        const restored = deserializeWorld(serializeWorld(world));
        expect(
          restored.history.legislativeVotes!.find(
            (entry) => entry.id === vote.id,
          ),
        ).toEqual(vote);
        expect(
          restored.history.legislativeActions!.find(
            (entry) => entry.id === action.id,
          )?.summary,
        ).toBe(expected);
        expect(
          restored.history.events.find((entry) => entry.id === event.id)
            ?.summary,
        ).toBe(expected);
      },
    );
  });
  it.todo(
    "trace the actual player's committee receipt through published News and browser before claiming the Audit fix",
  );
});
