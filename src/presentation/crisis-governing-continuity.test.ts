import { describe, expect, it } from "vitest";
import { createCampaignElectionTransitionRegistry } from "../simulation/campaigns";
import {
  beginHealthEpisode,
  crisisOfficeContinuityNotices,
  crisisRecords,
  currentGovernorOf,
  currentPresidentOf,
  recordViolenceAttempt,
} from "../simulation/crisis";
import { makeIsoDate, simulationMomentAtLocalTime } from "../simulation/dates";
import { createDemoWorld } from "../simulation/demo";
import { officeContinuityRulings } from "../simulation/governing/office-continuity";
import { projectCongress } from "../simulation/living-world/congress";
import {
  nationalOfficeHolder,
  planNationalOfficeTerm,
  qualifyNationalOfficeEntry,
  scheduleNationalCount,
} from "../simulation/national-election-consumer";
import {
  NATIONAL_ELECTION_JURISDICTION,
  ensureNationalElectionJurisdiction,
} from "../simulation/national-election-geography";
import { nationalElectionRules } from "../simulation/national-election-rules";
import {
  appendNationalRecord,
  nationalAllocation,
  nationalRecords,
  registerNationalElection,
} from "../simulation/national-elections";
import { deserializeWorld, serializeWorld } from "../simulation/serialization";
import { advanceWorldMinutes } from "../simulation/time-work";
import type { EntityId, World } from "../simulation/types";
import { advanceWorld } from "../simulation/world";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { openOrdinaryLife, passOrdinaryDays } from "./ordinary-life";

const SLOW = 1_800_000;
const handlers = () => createCampaignElectionTransitionRegistry();

function openingWorld(seed: string): World {
  const game = generateOpeningLife(
    prepareOpeningLife({ ...DEFAULT_NEW_GAME_SETUP, seed, startAge: 40 }),
  ).game!;
  return openOrdinaryLife(game.world, game.playerPersonId);
}

/** A CRISIS attempt that kills the target, found by stable key. */
function killed(world: World, targetPersonId: EntityId, evidenceId: EntityId) {
  for (let i = 0; i < 200; i += 1) {
    const next = recordViolenceAttempt(world, {
      stableKey: `proof-attempt-${i}`,
      targetPersonId,
      threatEvidenceIds: [evidenceId],
      basis: "Connected-route proof; represented threat evidence.",
    });
    if (next.history.personDeaths.some((d) => d.personId === targetPersonId))
      return next;
  }
  throw new Error("No attempt outcome killed the target.");
}

const outcome = (world: World, officeKey: string) =>
  officeContinuityRulings(world, officeKey)[0]?.outcome;

const provenance = {
  method: "authored" as const,
  sourceEntityIds: [],
  note: "Supplied fictional test result, not an observed election.",
};

function at(world: World, date: string, minute = 0): World {
  return {
    ...world,
    currentDate: makeIsoDate(date),
    currentMoment: simulationMomentAtLocalTime({
      date,
      minuteOfDay: minute,
      timeZone: "America/New_York",
    }),
  };
}

function electedPair() {
  let world = ensureNationalElectionJurisdiction(
    at(createDemoWorld("k3-national"), "2028-10-01"),
  );
  const [p, vp, q, qv] = world.personOrder as [
    EntityId,
    EntityId,
    EntityId,
    EntityId,
  ];
  world = registerNationalElection(world, {
    stableKey: "presidential-2028",
    cycle: 2028,
    jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
    tickets: [
      {
        presidentPersonId: p,
        vicePresidentPersonId: vp,
        presidentState: "CA",
        vicePresidentState: "NY",
      },
      {
        presidentPersonId: q,
        vicePresidentPersonId: qv,
        presidentState: "TX",
        vicePresidentState: "FL",
      },
    ],
    provenance,
  });
  const electionId = world.history.nationalElections![0]!.id;
  world = scheduleNationalCount(world, electionId);
  world = at(world, "2028-11-08");
  for (const unit of nationalElectionRules(2028).units) {
    world = appendNationalRecord(world, {
      stableKey: `result:${unit.key}`,
      electionId,
      kind: "unit-result",
      unitKey: unit.key,
      sourceContestResultId: null,
      allocationWinnerPersonId: p,
      tallies: [
        { candidatePersonId: p, votes: 2 },
        { candidatePersonId: q, votes: 1 },
      ],
      provenance,
    });
    world = appendNationalRecord(world, {
      stableKey: `certification:${unit.key}`,
      electionId,
      kind: "certification",
      resultId: nationalRecords(world, electionId).at(-1)!.id,
      disposition: "certified",
      allocationWinnerPersonId: p,
      authorityNote: "Supplied fixture certification.",
      provenance,
    });
  }
  world = at(world, "2028-12-19");
  for (const elector of nationalAllocation(world, electionId).electors)
    world = appendNationalRecord(world, {
      kind: "ballot",
      stableKey: `ballot:${elector.key}`,
      electionId,
      electorKey: elector.key,
      presidentPersonId: p,
      vicePresidentPersonId: vp,
      disposition: "accepted",
      provenance,
    });
  world = advanceWorld(world, 18, handlers());
  const demand = {
    expectedWeekly: { minimumHours: 10, maximumHours: 45 },
    attention: "high" as const,
    concurrency: "partly-concurrent" as const,
    scheduleRigidity: "mixed" as const,
    interruptibility: "limited" as const,
    locationJurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
  };
  for (const office of ["president", "vice-president"] as const)
    world = planNationalOfficeTerm(world, {
      stableKey: `${office}-term`,
      electionId,
      office,
      qualificationNote: "Expected term, not a recorded oath.",
      workTimeDemand: demand,
      provenance,
    });
  const plans = nationalRecords(world).filter((r) => r.kind === "term-plan");
  world = advanceWorldMinutes(at(world, "2029-01-20", 719), 1, handlers());
  for (const plan of plans)
    world = qualifyNationalOfficeEntry(world, {
      stableKey: `oath:${plan.id}`,
      electionId,
      planId: plan.id,
      personId: plan.kind === "term-plan" ? plan.personId : p,
      disposition: "qualified-and-sworn",
      authorityNote: "Supplied fixture oath.",
      provenance,
    });
  return { world, p, vp };
}

describe("CRISIS → GOVERNING office continuity through ordinary time", () => {
  it(
    "a Representative dies of ordinary mortality; the seat is vacated and refilled by special election, identically for any skip",
    () => {
      const world = openingWorld("crisis-gov-house");
      const seat = projectCongress(world)!.house.seats.find(
        (s) => s.occupant.kind === "member",
      )!;
      if (seat.occupant.kind !== "member") throw new Error("fixture");
      const member = seat.occupant.member.personId;
      const frail = beginHealthEpisode(world, {
        stableKey: "proof-member-frail",
        personId: member,
        severity: "chronic",
        initialLimitation: "none",
        origin: { kind: "authored", note: "Connected-route proof episode." },
        causalParentIds: [],
        hazard: {
          micros: 400_000_000,
          basis: "Proof fixture only; not clinical data.",
        },
      });
      const run = (step: number) => {
        let w = frail;
        for (
          let d = 0;
          d < 720 && !w.history.personDeaths.some((x) => x.personId === member);
          d += step
        )
          w = passOrdinaryDays(w, step);
        return w;
      };
      const died = run(30);
      const death = died.history.personDeaths.find(
        (d) => d.personId === member,
      )!;
      expect(death.causeKey).toBe("crisis-mortality:all-cause-unresolved");
      // No manual consumer call: the date boundary applied the notice.
      expect(
        crisisOfficeContinuityNotices(died).map((n) => n.offices[0]!.officeKey),
      ).toEqual([seat.seatKey]);
      expect(outcome(died, seat.seatKey)).toBe("special-election");
      const vacancy = projectCongress(died)!.house.seats.find(
        (s) => s.seatKey === seat.seatKey,
      )!.occupant;
      expect(vacancy.kind).toBe("vacancy");
      if (vacancy.kind === "vacancy") expect(vacancy.since).toBe(death.diedAt);
      const other = run(90);
      expect(
        other.history.personDeaths.find((d) => d.personId === member)!.diedAt,
      ).toBe(death.diedAt);
      const later = passOrdinaryDays(
        deserializeWorld(serializeWorld(died)),
        100,
      );
      const filled = projectCongress(later)!.house.seats.find(
        (s) => s.seatKey === seat.seatKey,
      )!.occupant;
      expect(filled.kind).toBe("member");
      if (filled.kind === "member")
        expect(filled.member.personId).not.toBe(member);
      const laterOther = passOrdinaryDays(other, 100);
      const filledOther = projectCongress(laterOther)!.house.seats.find(
        (s) => s.seatKey === seat.seatKey,
      )!.occupant;
      expect(filledOther).toEqual(filled);
    },
    SLOW,
  );

  it(
    "the opening President's known incapacity is not automatic, and death is a truthful block; a governor's death is blocked",
    () => {
      const world = openingWorld("crisis-gov-president");
      const president = currentPresidentOf(world)!.personId;
      const ill = beginHealthEpisode(world, {
        stableKey: "proof-president-ill",
        personId: president,
        severity: "serious",
        initialLimitation: "incapacitated",
        origin: { kind: "authored", note: "Connected-route proof episode." },
        causalParentIds: [],
      });
      const known = passOrdinaryDays(ill, 2);
      expect(outcome(known, "us-president")).toBe("not-automatic");
      const evidence = known.history.events.at(-1)!.id;
      const dead = passOrdinaryDays(killed(known, president, evidence), 1);
      expect(outcome(dead, "us-president")).toBe("blocked");
      expect(currentPresidentOf(dead)).toBeNull();

      const state = "KY";
      const governor = currentGovernorOf(dead, state)!;
      const govDead = passOrdinaryDays(
        killed(dead, governor.personId, evidence),
        1,
      );
      expect(outcome(govDead, governor.officeKey)).toBe("blocked");
      const reopened = deserializeWorld(serializeWorld(govDead));
      expect(officeContinuityRulings(reopened)).toEqual(
        officeContinuityRulings(govDead),
      );
    },
    SLOW,
  );

  it(
    "an elected President killed in office is succeeded by the elected Vice President under § 1",
    () => {
      const { world, p, vp } = electedPair();
      const later = at(world, "2029-06-01", 600);
      const evidence = later.history.events.at(-1)!.id;
      const attacked = killed(later, p, evidence);
      expect(
        crisisOfficeContinuityNotices(attacked)
          .at(-1)!
          .offices.map((o) => o.officeKey),
      ).toContain("us-president");
      const next = advanceWorld(attacked, 1, handlers());
      expect(outcome(next, "us-president")).toBe("succeeded");
      expect(nationalOfficeHolder(next, "president")!.plan.personId).toBe(vp);
      expect(currentPresidentOf(next)!.personId).toBe(vp);
      const again = advanceWorld(next, 3, handlers());
      expect(officeContinuityRulings(again, "us-president")).toEqual(
        officeContinuityRulings(next, "us-president"),
      );
      expect(
        nationalOfficeHolder(
          deserializeWorld(serializeWorld(again)),
          "president",
        )!.plan.personId,
      ).toBe(vp);
      expect(
        crisisRecords(again).filter((r) => r.kind === "official-continuity")
          .length,
      ).toBeGreaterThan(0);
    },
    SLOW,
  );
});
