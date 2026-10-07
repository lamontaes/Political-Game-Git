import { committeeRoster } from "../simulation/governing/committee-assignment";
import { seatedCongressChamber } from "../simulation/governing/congress-chambers";
import * as chamberVotes from "../simulation/governing/chamber-votes";
import { afterEach, describe, expect, it, vi } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { drawRandomPlace } from "../../tests/support/random-place";
import { US_CONGRESS_RULE_PACK } from "../simulation/congress-rule-pack";
import {
  introduceMeasure,
  measurePosition,
  referMeasure,
  scheduleCommitteeHearing,
} from "../simulation/legislation";
import {
  votePlanKeyForCommittee,
  type LegislativeProcedureContext,
} from "../simulation/legislation-scenarios";
import {
  ensureNationalElectionJurisdiction,
  NATIONAL_ELECTION_JURISDICTION,
} from "../simulation/national-election-geography";
import { personName } from "../simulation/people";
import { deserializeWorld, serializeWorld } from "../simulation/serialization";
import { advanceWorld } from "../simulation/world";
import * as clock from "../simulation/governing/legislative-clock";
import { applyLegislativeStep } from "./legislation-session";

const seed = "session132-a78-committee-report-referral";
const place = drawRandomPlace(seed);
const fixture = smallWorld({
  place: place.key,
  date: "2026-01-05",
  seed,
  people: 40,
  offices: ["congress"],
});

afterEach(() => vi.restoreAllMocks());

function inCommittee(chamberKey: string, usePolicyReferral: boolean) {
  const world = ensureNationalElectionJurisdiction(fixture.world);
  // This is a legacy intake-key fixture with authored votes, not an election proof.
  const introduced = introduceMeasure(world, {
    stableKey: `congress-intake/v1:health.coverage:test:a78:${chamberKey}`,
    jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
    rulePackId: US_CONGRESS_RULE_PACK.packId,
    designation: "TEST 1",
    shortTitle: "Committee referral caller fixture",
    summary: "Tests the committee used by a player report command.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    originChamberKey: chamberKey,
  });
  const measureId = introduced.history.legislativeMeasures!.at(-1)!.id;
  const chamber = US_CONGRESS_RULE_PACK.chambers.find(
    (entry) => entry.chamberKey === chamberKey,
  )!;
  const policyCommittee = clock.referralCommittee(
    introduced,
    measureId,
    chamberKey,
  )!;
  expect(policyCommittee.committeeKey).not.toBe(
    chamber.committees[0]!.committeeKey,
  );
  const committee = usePolicyReferral
    ? policyCommittee
    : chamber.committees[0]!;
  const referred = referMeasure(introduced, {
    stableKey: `test:a78:refer:${chamberKey}`,
    measureId,
    committeeKey: committee.committeeKey,
  });
  const scheduled = scheduleCommitteeHearing(referred, {
    stableKey: `test:a78:hearing:${chamberKey}`,
    measureId,
    hearingDate: "2026-01-06",
  });
  const heard = advanceWorld(scheduled, 1);
  expect(measurePosition(heard, measureId).hearingHeld).toBe(true);
  const scenario: LegislativeProcedureContext = {
    pack: US_CONGRESS_RULE_PACK,
    measureId,
    bodies: [
      {
        chamberKey,
        chamberName: chamber.name,
        members: heard.personOrder
          .slice(0, committee.appointedMembers)
          .map((id, index) => ({
            memberKey: `test:a78:member:${index}`,
            name: personName(heard.people[id]!),
            personId: id,
            caucusLabel: "Authored caller fixture",
          })),
      },
    ],
    committeeMemberCount: committee.appointedMembers,
    votePlan: {
      [votePlanKeyForCommittee(committee.committeeKey)]: {
        yea: committee.appointedMembers,
      },
      ...Object.fromEntries(
        chamber.committees
          .filter((entry) => entry.committeeKey !== committee.committeeKey)
          .map((entry) => [
            votePlanKeyForCommittee(entry.committeeKey),
            { yea: 0, nay: entry.appointedMembers },
          ]),
      ),
    },
    governorAction: null,
    governorRationale: "No executive decision in this caller fixture.",
  };
  return { world: heard, scenario, committee, chamber };
}

describe("the player committee report command uses the clock's referral", () => {
  for (const chamberKey of ["house", "senate"]) {
    it(`uses the policy referral rather than the first ${chamberKey} committee when the caller's committee list is incomplete`, () => {
      const input = inCommittee(chamberKey, true);
      const incomplete = {
        ...input.scenario,
        pack: {
          ...input.scenario.pack,
          chambers: input.scenario.pack.chambers.map((chamber) =>
            chamber.chamberKey === chamberKey
              ? {
                  ...chamber,
                  committees: chamber.committees.filter(
                    (entry) =>
                      entry.committeeKey !== input.committee.committeeKey,
                  ),
                }
              : chamber,
          ),
        },
      };
      const reloaded = deserializeWorld(serializeWorld(input.world));
      const result = applyLegislativeStep(
        incomplete,
        reloaded,
        "move-committee-report",
      );
      const vote = result.world.history.legislativeVotes!.at(-1)!;
      expect(vote.forum).toMatchObject({
        kind: "committee",
        chamberKey,
        committeeKey: input.committee.committeeKey,
      });
      expect(vote.tally.yea).toBe(input.committee.appointedMembers);
      expect(vote.tally.nay).toBe(0);
      expect(vote.outcome).toBe("passed");
      expect(result.message).toBe(
        `The ${input.committee.name} voted to send your bill to the floor.`,
      );
      expect(reloaded.history.legislativeVotes).toEqual(
        input.world.history.legislativeVotes,
      );
    });

    it(`keeps a valid saved ${chamberKey} referral ahead of a newly inferred policy referral`, () => {
      const input = inCommittee(chamberKey, false);
      const result = applyLegislativeStep(
        input.scenario,
        input.world,
        "move-committee-report",
      );
      expect(
        result.world.history.legislativeVotes!.at(-1)!.forum,
      ).toMatchObject({ committeeKey: input.committee.committeeKey });
      expect(result.world.history.legislativeVotes!.at(-1)!.outcome).toBe(
        "passed",
      );
      expect(result.message).toContain(input.committee.name);
    });
  }

  it("uses the canonical committee roster for seated NPCs when the caller list is incomplete", () => {
    const input = inCommittee("house", true);
    const body = seatedCongressChamber(input.world, "house")!.body;
    const expected = committeeRoster(
      body,
      input.chamber.committees,
      input.committee.committeeKey,
      "test:a78",
    );
    expect(expected.length).toBeGreaterThan(0);
    const scenario = {
      ...input.scenario,
      bodies: [body],
      memberDecisions: { playerPersonId: null },
      pack: {
        ...input.scenario.pack,
        chambers: input.scenario.pack.chambers.map((chamber) =>
          chamber.chamberKey === "house"
            ? {
                ...chamber,
                committees: chamber.committees.filter(
                  (entry) =>
                    entry.committeeKey !== input.committee.committeeKey,
                ),
              }
            : chamber,
        ),
      },
    };
    const decide = vi.spyOn(chamberVotes, "decideChamberVote");
    const result = applyLegislativeStep(
      scenario,
      input.world,
      "move-committee-report",
    );
    expect(decide).toHaveBeenCalledWith(
      input.world,
      expect.objectContaining({ members: expected }),
    );
    expect(
      result.world.history
        .legislativeVotes!.at(-1)!
        .dispositions.map((row) => row.memberKey)
        .sort(),
    ).toEqual(expected.map((row) => row.memberKey).sort());
  });

  it("leaves the world unchanged when the caller and clock have no compiled committee", () => {
    const input = inCommittee("house", true);
    const incomplete = {
      ...input.scenario,
      pack: {
        ...input.scenario.pack,
        chambers: input.scenario.pack.chambers.map((chamber) => ({
          ...chamber,
          committees: [],
        })),
      },
    };
    vi.spyOn(clock, "referralCommittee").mockReturnValue(null);
    const result = applyLegislativeStep(
      incomplete,
      input.world,
      "move-committee-report",
    );
    expect(result.world).toBe(input.world);
    expect(result.message).toBe(
      `The ${input.chamber.name}'s committees are not compiled, so no committee report vote is taken.`,
    );
  });
});
