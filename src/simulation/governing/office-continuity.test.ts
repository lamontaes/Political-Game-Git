import { describe, expect, it } from "vitest";

import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import {
  openOrdinaryLife,
  passOrdinaryDays,
} from "../../presentation/ordinary-life";
import { createCampaignElectionTransitionRegistry } from "../campaigns";
import { makeIsoDate, simulationMomentAtLocalTime } from "../dates";
import { createDemoWorld } from "../demo";
import { projectCongress } from "../living-world/congress";
import {
  nationalOfficeHolder,
  planNationalOfficeTerm,
  qualifyNationalOfficeEntry,
  scheduleNationalCount,
} from "../national-election-consumer";
import {
  NATIONAL_ELECTION_JURISDICTION,
  ensureNationalElectionJurisdiction,
} from "../national-election-geography";
import { nationalElectionRules } from "../national-election-rules";
import {
  appendNationalRecord,
  nationalAllocation,
  nationalRecords,
  registerNationalElection,
} from "../national-elections";
import { currentStateExecutiveHolders } from "../nationwide-world/state-executives";
import { deserializeWorld, serializeWorld } from "../serialization";
import { advanceWorldMinutes } from "../time-work";
import type { EntityId, World } from "../types";
import { recordPersonDeath } from "../vitality";
import { advanceWorld } from "../world";
import { currentPresidentOf, publicOfficesHeldBy } from "../crisis/offices";
import { currentFederalTenure } from "../federal-tenures";
import {
  CHIEF_JUSTICE_NOMINATED_EVENT,
  CHIEF_JUSTICE_VACANCY_PROFILE,
} from "./chief-justice-vacancy";
import {
  VICE_PRESIDENTIAL_VACANCY_PROFILE,
  VICE_PRESIDENT_NOMINATED_EVENT,
  VICE_PRESIDENT_NOMINATION,
  applyOfficeContinuityNotices,
  officeContinuityRulings,
  type OfficeContinuityNoticeInput,
} from "./office-continuity";

const VITALITY = {
  kind: "authored" as const,
  note: "GOVERNING K3 continuity fixture.",
};
const handlers = () => createCampaignElectionTransitionRegistry();

/** Kills a person and returns the CRISIS-shaped notice for their offices. */
function die(
  world: World,
  personId: EntityId,
  offices: OfficeContinuityNoticeInput["offices"],
): { world: World; notice: OfficeContinuityNoticeInput } {
  const next = recordPersonDeath(world, {
    stableKey: `k3:death:${personId}`,
    personId,
    diedAt: world.currentDate,
    causeKey: "cause:external-fixture",
    sourceEntityIds: [world.id],
    summary: "An officeholder died.",
    provenance: VITALITY,
  });
  const death = next.history.personDeaths.at(-1)!;
  return {
    world: next,
    notice: {
      noticeKey: `crisis:continuity:${death.id}`,
      sequence: death.sequence,
      originEventId: death.eventId,
      personId,
      kind: "death",
      effectiveDate: death.diedAt,
      recordedDate: next.currentDate,
      visibility: "public",
      offices,
      sourceRecordId: death.id,
    },
  };
}

function openingWorld(seed: string): World {
  const game = generateOpeningLife(
    prepareOpeningLife({ ...DEFAULT_NEW_GAME_SETUP, seed, startAge: 40 }),
  ).game!;
  return openOrdinaryLife(game.world, game.playerPersonId);
}

describe("GOVERNING K3: an office after its holder dies", () => {
  it("a Representative's seat is vacant, then a special election fills it once", () => {
    const world = openingWorld("k3-house");
    const seat = projectCongress(world)!.house.seats.find(
      (s) => s.occupant.kind === "member",
    )!;
    if (seat.occupant.kind !== "member") throw new Error("fixture");
    const member = seat.occupant.member;
    const { world: dead, notice } = die(world, member.personId, [
      {
        officeKey: seat.seatKey,
        title: member.title,
        organizationId: projectCongress(world)!.house.organizationId,
        termEvidenceId: member.termId,
      },
    ]);
    let next = applyOfficeContinuityNotices(dead, [notice]);
    expect(applyOfficeContinuityNotices(next, [notice])).toBe(next);
    const view = projectCongress(next)!.house.seats.find(
      (s) => s.seatKey === seat.seatKey,
    )!;
    expect(view.occupant.kind).toBe("vacancy");
    expect(officeContinuityRulings(next, seat.seatKey)[0]!.outcome).toBe(
      "special-election",
    );
    next = passOrdinaryDays(next, 89);
    expect(
      projectCongress(next)!.house.seats.find(
        (s) => s.seatKey === seat.seatKey,
      )!.occupant.kind,
    ).toBe("vacancy");
    next = passOrdinaryDays(next, 1);
    const filled = projectCongress(next)!.house.seats.find(
      (s) => s.seatKey === seat.seatKey,
    )!;
    expect(filled.occupant.kind).toBe("member");
    if (filled.occupant.kind === "member")
      expect(filled.occupant.member.personId).not.toBe(member.personId);
    const reopened = deserializeWorld(serializeWorld(next));
    expect(projectCongress(reopened)).toEqual(projectCongress(next));
  }, 300_000);

  it("a Senate seat stays unfilled and says which rule is missing; a governor's successor serves out the term", () => {
    const world = openingWorld("k3-senate");
    const seat = projectCongress(world)!.senate.seats.find(
      (s) => s.occupant.kind === "member",
    )!;
    if (seat.occupant.kind !== "member") throw new Error("fixture");
    const senator = seat.occupant.member;
    const died = die(world, senator.personId, [
      {
        officeKey: seat.seatKey,
        title: senator.title,
        organizationId: null,
        termEvidenceId: senator.termId,
      },
    ]);
    let next = applyOfficeContinuityNotices(died.world, [died.notice]);
    expect(
      projectCongress(next)!.senate.seats.find(
        (s) => s.seatKey === seat.seatKey,
      )!.occupant.kind,
    ).toBe("vacancy");
    expect(officeContinuityRulings(next, seat.seatKey)[0]!.outcome).toBe(
      "blocked",
    );
    const governor = currentStateExecutiveHolders(next).find(
      (h) => h.personId !== senator.personId,
    )!;
    const second = die(next, governor.personId, [
      {
        officeKey: governor.officeKey,
        title: governor.title,
        organizationId: governor.organizationId,
        termEvidenceId: governor.termId,
      },
    ]);
    next = applyOfficeContinuityNotices(second.world, [second.notice]);
    expect(applyOfficeContinuityNotices(next, [second.notice])).toBe(next);
    const ruling = officeContinuityRulings(next, governor.officeKey)[0]!;
    expect(ruling.outcome).toBe("succeeded");
    // PLACEHOLDER successor (governor-succession.ts): a new person holds the
    // same office until the same term ends.
    const successor = currentStateExecutiveHolders(next).find(
      (h) => h.officeKey === governor.officeKey,
    )!;
    expect(successor.personId).not.toBe(governor.personId);
    expect(successor.origin).toBe("succession");
    expect(successor.startedAt).toBe(next.currentDate);
    expect(successor.endExclusive).toBe(governor.endExclusive);
    expect(
      publicOfficesHeldBy(next, successor.personId).map((r) => r.officeKey),
    ).toContain(governor.officeKey);
    // Past the term's end, the successor no longer holds it.
    if (governor.endExclusive) {
      const after = at(next, governor.endExclusive);
      expect(
        currentStateExecutiveHolders(after).some(
          (h) => h.personId === successor.personId,
        ),
      ).toBe(false);
    }
    const reopened = deserializeWorld(serializeWorld(next));
    expect(
      currentStateExecutiveHolders(reopened).find(
        (h) => h.officeKey === governor.officeKey,
      )!.personId,
    ).toBe(successor.personId);
  }, 300_000);

  it("a Chief Justice who dies is replaced by the President's nominee once the Senate confirms", () => {
    const world = openingWorld("k3-chief-justice");
    const chief = currentFederalTenure(world, "us-chief-justice")!;
    const president = currentPresidentOf(world)!;
    expect(
      publicOfficesHeldBy(world, chief.personId).map((ref) => ref.officeKey),
    ).toContain("us-chief-justice");
    const dead = die(world, chief.personId, [
      {
        officeKey: "us-chief-justice",
        title: "Chief Justice of the United States",
        organizationId: null,
        termEvidenceId: chief.event.id,
      },
    ]);
    let next = applyOfficeContinuityNotices(dead.world, [dead.notice]);
    expect(officeContinuityRulings(next, "us-chief-justice")[0]!.outcome).toBe(
      "vacant",
    );
    expect(currentFederalTenure(next, "us-chief-justice")).toBeNull();
    next = passOrdinaryDays(
      next,
      CHIEF_JUSTICE_VACANCY_PROFILE.daysFromVacancyToNomination,
    );
    const nomination = next.history.events.find(
      (event) => event.type === CHIEF_JUSTICE_NOMINATED_EVENT,
    )!;
    expect(nomination).toBeDefined();
    const nomineeId = nomination.participants.find(
      (p) => p.role === "focus:subject",
    )!.personId;
    expect(nomineeId).not.toBe(president.personId);
    if (next.control.kind === "person")
      expect(nomineeId).not.toBe(next.control.personId);
    expect(currentFederalTenure(next, "us-chief-justice")).toBeNull();
    next = passOrdinaryDays(
      next,
      CHIEF_JUSTICE_VACANCY_PROFILE.daysFromNominationToConfirmation,
    );
    const confirmed = currentFederalTenure(next, "us-chief-justice")!;
    expect(confirmed.personId).toBe(nomineeId);
    // Good behavior: no fixed end.
    expect(confirmed.endExclusive).toBeNull();
    const reopened = deserializeWorld(serializeWorld(next));
    expect(currentFederalTenure(reopened, "us-chief-justice")!.personId).toBe(
      nomineeId,
    );
  }, 600_000);

  it("the opening Vice President succeeds a President who dies; illness transfers nothing", () => {
    const world = openingWorld("k3-opening");
    const tenure = world.history.events.find(
      (e) =>
        e.type === "world.office-tenure" &&
        e.tags.includes("office:us-president"),
    )!;
    const president = tenure.participants.find(
      (p) => p.role === "focus:subject",
    )!.personId;
    const office = {
      officeKey: "us-president",
      title: "President of the United States",
      organizationId: null,
      termEvidenceId: tenure.id,
    };
    const ill: OfficeContinuityNoticeInput = {
      noticeKey: "crisis:continuity:illness",
      sequence: world.history.nextSequence - 1,
      originEventId: tenure.id,
      personId: president,
      kind: "incapacity-began",
      effectiveDate: world.currentDate,
      recordedDate: world.currentDate,
      visibility: "public",
      offices: [office],
      sourceRecordId: tenure.id,
    };
    let next = applyOfficeContinuityNotices(world, [ill]);
    expect(officeContinuityRulings(next, "us-president")[0]!.outcome).toBe(
      "not-automatic",
    );
    const vice = currentFederalTenure(next, "us-vice-president")!;
    const termEnd = currentFederalTenure(next, "us-president")!.endExclusive;
    const dead = die(next, president, [office]);
    next = applyOfficeContinuityNotices(dead.world, [dead.notice]);
    expect(officeContinuityRulings(next, "us-president")[0]!.outcome).toBe(
      "succeeded",
    );
    // The Vice President is President for the rest of the same term, every
    // reader agrees, and the vice presidency is vacant with a nomination due.
    expect(currentPresidentOf(next)!.personId).toBe(vice.personId);
    expect(currentFederalTenure(next, "us-president")!.endExclusive).toBe(
      termEnd,
    );
    expect(currentFederalTenure(next, "us-vice-president")).toBeNull();
    expect(
      publicOfficesHeldBy(next, vice.personId).map((ref) => ref.officeKey),
    ).toEqual(["us-president"]);
    expect(
      next.history.futureDueItems.some(
        (due) => due.transitionKey === VICE_PRESIDENT_NOMINATION,
      ),
    ).toBe(true);
    const reopened = deserializeWorld(serializeWorld(next));
    expect(currentPresidentOf(reopened)!.personId).toBe(vice.personId);
  }, 300_000);

  it("a Vice President who dies is replaced by the President's confirmed nominee for the rest of the term", () => {
    const world = openingWorld("k3-vice");
    const vice = currentFederalTenure(world, "us-vice-president")!;
    const president = currentPresidentOf(world)!;
    const office = {
      officeKey: "us-vice-president",
      title: "Vice President of the United States",
      organizationId: null,
      termEvidenceId: vice.event.id,
    };
    // Detection: the opening Vice President's death raises a notice at all.
    expect(
      publicOfficesHeldBy(world, vice.personId).map((ref) => ref.officeKey),
    ).toContain("us-vice-president");
    const dead = die(world, vice.personId, [office]);
    let next = applyOfficeContinuityNotices(dead.world, [dead.notice]);
    expect(officeContinuityRulings(next, "us-vice-president")[0]!.outcome).toBe(
      "vacant",
    );
    expect(currentFederalTenure(next, "us-vice-president")).toBeNull();

    next = passOrdinaryDays(
      next,
      VICE_PRESIDENTIAL_VACANCY_PROFILE.daysFromVacancyToNomination,
    );
    const nomination = next.history.events.find(
      (event) => event.type === VICE_PRESIDENT_NOMINATED_EVENT,
    )!;
    expect(nomination).toBeDefined();
    const nomineeId = nomination.participants.find(
      (p) => p.role === "focus:subject",
    )!.personId;
    // Anyone old enough, other than the President and the player's own
    // character; not confined to any office or party.
    expect(nomineeId).not.toBe(president.personId);
    if (next.control.kind === "person")
      expect(nomineeId).not.toBe(next.control.personId);
    const nomineeBirthYear = Number(
      next.people[nomineeId]!.birthDate.slice(0, 4),
    );
    expect(
      Number(next.currentDate.slice(0, 4)) - nomineeBirthYear,
    ).toBeGreaterThanOrEqual(35);
    const heldSeat = [
      ...projectCongress(next)!.house.seats,
      ...projectCongress(next)!.senate.seats,
    ].find(
      (s) =>
        s.occupant.kind === "member" &&
        s.occupant.member.personId === nomineeId,
    );
    // Still vacant while Congress considers the nomination.
    expect(currentFederalTenure(next, "us-vice-president")).toBeNull();

    next = passOrdinaryDays(
      next,
      VICE_PRESIDENTIAL_VACANCY_PROFILE.daysFromNominationToConfirmation,
    );
    const confirmed = currentFederalTenure(next, "us-vice-president")!;
    expect(confirmed.personId).toBe(nomineeId);
    // The rest of the same term, not a new four years.
    expect(confirmed.endExclusive).toBe(
      currentFederalTenure(next, "us-president")!.endExclusive,
    );
    expect(
      publicOfficesHeldBy(next, nomineeId).map((ref) => ref.officeKey),
    ).toEqual(["us-vice-president"]);
    // A nominee who sat in Congress has left the seat.
    if (heldSeat) {
      const left = [
        ...projectCongress(next)!.house.seats,
        ...projectCongress(next)!.senate.seats,
      ].find((s) => s.seatKey === heldSeat.seatKey)!;
      expect(left.occupant.kind).toBe("vacancy");
    }
    const reopened = deserializeWorld(serializeWorld(next));
    expect(currentFederalTenure(reopened, "us-vice-president")!.personId).toBe(
      nomineeId,
    );
  }, 600_000);
});

// --- Elected President and Vice President (supplied fictional results) ---

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

describe("GOVERNING K3: the Twenty-Fifth Amendment, § 1", () => {
  it("the elected Vice President becomes President once, and every reader agrees", () => {
    const { world, p, vp } = electedPair();
    const president = nationalOfficeHolder(world, "president")!;
    expect(president.plan.personId).toBe(p);
    const later = at(world, "2029-06-01", 600);
    const dead = die(later, p, [
      {
        officeKey: "us-president",
        title: "President of the United States",
        organizationId: null,
        termEvidenceId: president.plan.id,
      },
    ]);
    const next = applyOfficeContinuityNotices(dead.world, [dead.notice]);
    expect(applyOfficeContinuityNotices(next, [dead.notice])).toBe(next);
    expect(officeContinuityRulings(next, "us-president")[0]!.outcome).toBe(
      "succeeded",
    );
    expect(nationalOfficeHolder(next, "president")!.plan.personId).toBe(vp);
    expect(nationalOfficeHolder(next, "vice-president")).toBeNull();
    const reopened = deserializeWorld(serializeWorld(next));
    expect(nationalOfficeHolder(reopened, "president")!.plan.personId).toBe(vp);
    // The vice presidency is vacant with the President's nomination due.
    expect(
      next.history.futureDueItems.some(
        (due) => due.transitionKey === VICE_PRESIDENT_NOMINATION,
      ),
    ).toBe(true);
    // A second death before anyone is nominated has no Vice President to
    // succeed. (Jumping the clock past the nomination would skip it.)
    const second = die(at(next, "2029-06-05", 600), vp, [
      {
        officeKey: "us-president",
        title: "President of the United States",
        organizationId: null,
        termEvidenceId: nationalOfficeHolder(next, "president")!.plan.id,
      },
    ]);
    const after = applyOfficeContinuityNotices(second.world, [second.notice]);
    expect(nationalOfficeHolder(after, "president")).toBeNull();
    expect(officeContinuityRulings(after, "us-president")[0]!.outcome).not.toBe(
      "succeeded",
    );
  }, 300_000);
});
