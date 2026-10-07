import { describe, expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { nationalPlacePlan } from "./places";
import { canonicalHash } from "./parity";
import { crisisRecords } from "../../src/simulation/crisis/records";
import { crisisOfficeContinuityNotices } from "../../src/simulation/crisis/notices";
import { recordOfficialContinuity } from "../../src/simulation/crisis/continuity";
import { recordPersonDeath } from "../../src/simulation/vitality";
import { applyStateLegislatureTurnover } from "../../src/simulation/nationwide-world/state-legislature-turnover";
import { applyCongressTurnover } from "../../src/simulation/living-world/congress-turnover";
import { applyGovernorTurnover } from "../../src/simulation/nationwide-world/state-executive-turnover-calendar";
import {
  applyPresidentialTurnover,
  PRESIDENTIAL_TURNOVER_VERSION,
} from "../../src/simulation/nationwide-world/presidential-turnover";
import { applyConstitutionalReform } from "../../src/simulation/living-world/constitutional-reform";
import { applyArticleV } from "../../src/simulation/governing/article-v";
import { applyFederalReform } from "../../src/simulation/living-world/federal-reform";
import { applyCongressLawmaking } from "../../src/simulation/governing/congress-lawmaking";
import { projectCongress } from "../../src/simulation/living-world/congress";
import {
  addDays,
  makeIsoDate,
  simulationMomentAtLocalTime,
  simulationMomentOnLocalDate,
} from "../../src/simulation/dates";
import {
  deserializeWorld,
  serializeWorld,
} from "../../src/simulation/serialization";
import type { IsoDate, World } from "../../src/simulation/types";
import { advanceWithWorldIntegrityAtEnd } from "../../src/simulation/world";
import { applyDateBoundary } from "../../src/simulation/time-work";
import {
  applyNationalTermTransitions,
  nationalOfficeHolder,
  planNationalOfficeTerm,
} from "../../src/simulation/national-election-consumer";
import {
  ensureNationalElectionJurisdiction,
  NATIONAL_ELECTION_JURISDICTION,
} from "../../src/simulation/national-election-geography";
import {
  appendNationalRecord,
  nationalAllocation,
  nationalRecords,
  recordNationalCount,
  registerNationalElection,
} from "../../src/simulation/national-elections";
import { nationalElectionRules } from "../../src/simulation/national-election-rules";
import { applyEnactedCourtSizes } from "../../src/simulation/governing/court-size-law";
import { applyCrisisRepairFunding } from "../../src/simulation/governing/repair-funding";
import { applyJudicialReview } from "../../src/simulation/judiciary/judicial-review";
import {
  applyOfficeLifecycle,
  OFFICE_CONTINUITY_EVENT,
  officeContinuityRulings,
  applyOfficeContinuityNotices,
} from "../../src/simulation/governing/office-continuity";

const plan = nationalPlacePlan("a12-office-lifecycle-parity");

// Frozen original crisis adapter from main d7ede9f73. Its acquisition/cache
// remains independent from the consolidated consumer; the law writer is shared.
const baselineNoticeSequence = new WeakMap<readonly unknown[], number>();
function originalCrisisOfficeContinuity(world: World): World {
  if (
    !crisisRecords(world).some(
      (record) => record.kind === "official-continuity",
    )
  )
    return world;
  const events = world.history.events;
  let sequence = baselineNoticeSequence.get(events);
  if (sequence === undefined) {
    sequence = -1;
    for (let i = events.length - 1; i >= 0; i -= 1) {
      const event = events[i]!;
      if (event.type !== OFFICE_CONTINUITY_EVENT) continue;
      const key = event.tags
        .find((tag) => tag.startsWith("crisis-notice:"))
        ?.slice("crisis-notice:".length);
      const record = key
        ? crisisRecords(world).find((candidate) => candidate.stableKey === key)
        : undefined;
      if (record) {
        sequence = record.sequence;
        break;
      }
    }
    baselineNoticeSequence.set(events, sequence);
  }
  const notices = crisisOfficeContinuityNotices(world, {
    afterSequence: sequence,
  });
  return notices.length ? applyOfficeContinuityNotices(world, notices) : world;
}

function interveningLegislativeWork(before: IsoDate, world: World): World {
  return applyCongressLawmaking(
    before,
    applyFederalReform(before, applyArticleV(before, world)),
  );
}

// Exact six-call composition from main d7ede9f73 before the A12 replacement.
// The independent crisis adapter remains in place until this proof passes.
function originalOfficeLifecycle(before: IsoDate, world: World): World {
  return advanceWithWorldIntegrityAtEnd(
    () =>
      originalCrisisOfficeContinuity(
        interveningLegislativeWork(
          before,
          applyConstitutionalReform(
            before,
            applyPresidentialTurnover(
              before,
              applyGovernorTurnover(
                before,
                applyCongressTurnover(
                  before,
                  applyStateLegislatureTurnover(before, world),
                ),
              ),
            ),
          ),
        ),
      ),
    world,
  );
}

function originalDateBoundary(before: IsoDate, world: World): World {
  return applyJudicialReview(
    before,
    applyCrisisRepairFunding(
      applyEnactedCourtSizes(
        originalOfficeLifecycle(before, applyNationalTermTransitions(world)),
      ),
    ),
  );
}

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

function plannedPresidentialWinners(): {
  world: World;
  presidentId: string;
  vicePresidentId: string;
} {
  const row = plan.watched[1]!;
  const opened = smallWorld({
    place: row.placeKey,
    seed: `${row.seed}:noon`,
    date: "2026-01-05",
    offices: ["congress"],
  }).world;
  const provenance = {
    method: "authored" as const,
    sourceEntityIds: [],
    note: "Supplied fictional A12 election results.",
  };
  const [p, vp, q, qv] = opened.personOrder;
  if (!p || !vp || !q || !qv)
    throw new Error("Four canonical people required.");
  const planned = advanceWithWorldIntegrityAtEnd(() => {
    let world = ensureNationalElectionJurisdiction(at(opened, "2028-10-01"));
    const states = nationalElectionRules(2028)
      .units.filter((unit) => unit.key.length === 2)
      .slice(0, 4)
      .map((unit) => unit.key);
    world = registerNationalElection(world, {
      stableKey: "a12:presidential-2028",
      cycle: 2028,
      jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
      tickets: [
        {
          presidentPersonId: p,
          vicePresidentPersonId: vp,
          presidentState: states[0]!,
          vicePresidentState: states[1]!,
        },
        {
          presidentPersonId: q,
          vicePresidentPersonId: qv,
          presidentState: states[2]!,
          vicePresidentState: states[3]!,
        },
      ],
      provenance,
    });
    const electionId = world.history.nationalElections!.at(-1)!.id;
    world = at(world, "2028-11-08");
    for (const unit of nationalElectionRules(2028).units) {
      world = appendNationalRecord(world, {
        stableKey: `a12:result:${unit.key}`,
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
        stableKey: `a12:certification:${unit.key}`,
        electionId,
        kind: "certification",
        resultId: nationalRecords(world, electionId).at(-1)!.id,
        disposition: "certified",
        allocationWinnerPersonId: p,
        authorityNote: "Supplied fictional certification.",
        provenance,
      });
    }
    world = at(world, "2028-12-19");
    for (const elector of nationalAllocation(world, electionId).electors) {
      world = appendNationalRecord(world, {
        kind: "ballot",
        stableKey: `a12:ballot:${elector.key}`,
        electionId,
        electorKey: elector.key,
        presidentPersonId: p,
        vicePresidentPersonId: vp,
        disposition: "accepted",
        provenance,
      });
    }
    world = recordNationalCount(at(world, "2029-01-06"), {
      stableKey: "a12:count",
      electionId,
      provenance,
    });
    for (const office of ["president", "vice-president"] as const) {
      world = planNationalOfficeTerm(world, {
        stableKey: `${PRESIDENTIAL_TURNOVER_VERSION}:2028:term-plan:${office}`,
        electionId,
        office,
        qualificationNote:
          "Expected term; the existing receiver records its oath.",
        workTimeDemand: {
          expectedWeekly: { minimumHours: 35, maximumHours: 45 },
          attention: "high",
          concurrency: "partly-concurrent",
          scheduleRigidity: "mixed",
          interruptibility: "limited",
          locationJurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
        },
        provenance,
      });
    }
    return world;
  }, opened);
  return { world: planned, presidentId: p, vicePresidentId: vp };
}

function candidateOfficeLifecycle(before: IsoDate, world: World): World {
  return advanceWithWorldIntegrityAtEnd(
    () =>
      applyOfficeLifecycle(before, world, (next) =>
        interveningLegislativeWork(before, next),
      ),
    world,
  );
}

function followingDay(world: World): World {
  const date = addDays(world.currentDate, 1);
  return {
    ...world,
    currentDate: date,
    currentMoment: simulationMomentOnLocalDate(world.currentMoment, date),
  };
}

function expectParity(before: IsoDate, world: World): World {
  const original = originalOfficeLifecycle(before, structuredClone(world));
  const candidate = candidateOfficeLifecycle(before, structuredClone(world));
  expect(candidate).toEqual(original);
  expect(canonicalHash(candidate)).toBe(canonicalHash(original));
  const repeatedOriginal = originalOfficeLifecycle(before, original);
  const repeatedCandidate = candidateOfficeLifecycle(before, candidate);
  expect(repeatedCandidate).toEqual(repeatedOriginal);
  expect(repeatedCandidate.history).toEqual(candidate.history);
  const continuedOriginal = originalOfficeLifecycle(
    original.currentDate,
    followingDay(deserializeWorld(serializeWorld(original))),
  );
  const continuedCandidate = candidateOfficeLifecycle(
    candidate.currentDate,
    followingDay(deserializeWorld(serializeWorld(candidate))),
  );
  expect(continuedCandidate).toEqual(continuedOriginal);
  return candidate;
}

describe("A12 one office lifecycle", () => {
  it("covers all 56 source jurisdictions", () => {
    expect(plan.jurisdictions).toHaveLength(56);
    expect(
      new Set(plan.jurisdictions.map((row) => row.jurisdictionKey)).size,
    ).toBe(56);
  });

  it.each(plan.jurisdictions)(
    "$jurisdictionKey preserves seeded term scheduling, repeated entry and Continue",
    (row) => {
      const { world } = smallWorld({
        place: row.placeKey,
        seed: row.seed,
        date: "2026-01-05",
        offices: ["governor"],
      });
      expectParity(world.currentDate, followingDay(world));
      const moved = followingDay(world);
      const originalBoundary = advanceWithWorldIntegrityAtEnd(
        () => originalDateBoundary(world.currentDate, structuredClone(moved)),
        moved,
      );
      const currentBoundary = advanceWithWorldIntegrityAtEnd(
        () => applyDateBoundary(world.currentDate, structuredClone(moved)),
        moved,
      );
      expect(currentBoundary).toEqual(originalBoundary);
    },
  );

  it("records actual presidential entry at noon on the same date exactly once", () => {
    const { world, presidentId, vicePresidentId } =
      plannedPresidentialWinners();
    const early = at(world, "2029-01-20", 719);
    expect(
      nationalOfficeHolder(expectParity(early.currentDate, early), "president"),
    ).toBeNull();
    const noon = at(world, "2029-01-20", 720);
    const seated = expectParity(noon.currentDate, noon);
    expect(nationalOfficeHolder(seated, "president")!.plan.personId).toBe(
      presidentId,
    );
    expect(nationalOfficeHolder(seated, "vice-president")!.plan.personId).toBe(
      vicePresidentId,
    );
    const qualifications = nationalRecords(seated).filter(
      (record) => record.kind === "qualification",
    );
    expect(qualifications).toHaveLength(2);
    expect(
      nationalRecords(
        candidateOfficeLifecycle(noon.currentDate, seated),
      ).filter((record) => record.kind === "qualification"),
    ).toHaveLength(2);
  });

  it.each(plan.watched)(
    "$jurisdictionKey preserves the actual Congress and state-body writers",
    (row) => {
      const { world } = smallWorld({
        place: row.placeKey,
        seed: `${row.seed}:materialized-bodies`,
        date: "2026-01-05",
        offices: ["congress", "governor", "state-legislature"],
      });
      expect(projectCongress(world)).not.toBeNull();
      expectParity(world.currentDate, followingDay(world));
    },
  );

  it("consumes a recorded House vacancy once on the same date and after Continue", () => {
    const row = plan.watched[0]!;
    const { world } = smallWorld({
      place: row.placeKey,
      seed: `${row.seed}:recorded-vacancy`,
      date: "2026-01-05",
      offices: ["congress"],
    });
    const seat = projectCongress(world)!.house.seats.find(
      (entry) => entry.occupant.kind === "member",
    )!;
    if (seat.occupant.kind !== "member")
      throw new Error("Missing actual House member.");
    const personId = seat.occupant.member.personId;
    const died = recordPersonDeath(world, {
      stableKey: `a12:death:${personId}`,
      personId,
      diedAt: world.currentDate,
      causeKey: "cause:external-fixture",
      sourceEntityIds: [world.id],
      summary: "An officeholder died.",
      provenance: { kind: "authored", note: "A12 supplied continuity cause." },
    });
    const noticed = recordOfficialContinuity(world, died, personId, "death");
    let callbacks = 0;
    const result = applyOfficeLifecycle(
      noticed.currentDate,
      noticed,
      (next) => {
        callbacks += 1;
        expect(officeContinuityRulings(next, seat.seatKey)).toHaveLength(0);
        return next;
      },
    );
    expect(callbacks).toBe(1);
    expect(officeContinuityRulings(result, seat.seatKey)).toHaveLength(1);
    expect(
      projectCongress(result)!.house.seats.find(
        (entry) => entry.seatKey === seat.seatKey,
      )!.occupant.kind,
    ).toBe("vacancy");
    const matched = expectParity(noticed.currentDate, noticed);
    expect(
      matched.history.events.filter(
        (event) => event.type === OFFICE_CONTINUITY_EVENT,
      ),
    ).toHaveLength(1);
  });
});
