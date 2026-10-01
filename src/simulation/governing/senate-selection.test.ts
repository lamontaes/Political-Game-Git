import { describe, expect, it } from "vitest";

import { explicitNewGameSetup } from "../../presentation/new-game-geography";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import {
  openOrdinaryLife,
  passOrdinaryDays,
} from "../../presentation/ordinary-life";
import {
  ARTICLE_V_STATE_KEYS,
  constitutionalPosition,
  proposeConstitutionalMeasure,
  recordArticleVRatification,
  recordConstitutionalProposalVote,
} from "../constitutional-process";
import { daysBetween, makeIsoDate } from "../dates";
import { congressCandidateSlate } from "../living-world/congress-candidates";
import {
  CONGRESS_RESULTS_EVENT,
  congressionalElectionDay,
} from "../living-world/congress-turnover";
import { SENATE_SELECTION_OFFICE_KEY } from "../enacted-rule-changes";
import { dispositionsFromCounts } from "../legislation-scenarios";
import { projectCongress } from "../living-world/congress";
import {
  NATIONAL_ELECTION_JURISDICTION,
  ensureNationalElectionJurisdiction,
} from "../national-election-geography";
import { SEAT_PARTY_TAG } from "../living-world/opening";
import { recordPersonDeath } from "../vitality";
import { lifePlaces } from "../life-places";
import { SeededRng } from "../rng";
import type { EntityId, World } from "../types";
import {
  HOUSE_SPECIAL_ELECTION,
  applyOfficeContinuityNotices,
  officeContinuityRulings,
} from "./office-continuity";
import {
  legislativeSenateElectionDay,
  senateSelectionRuleAt,
  stateLegislatureMajority,
} from "./senate-selection";
import { JOINT_ASSEMBLY_VOTE_EVENT } from "./joint-assembly";

/** The joint assembly's roll call for a seat: every member's own reason, and a majority for the winner. */
function expectElectedByMajority(world: World, seatKey: string): void {
  const vote = world.history.events.find(
    (event) =>
      event.type === JOINT_ASSEMBLY_VOTE_EVENT &&
      event.tags.includes(`seat:${seatKey}`),
  )!;
  expect(vote).toBeDefined();
  const ballots = vote.participants.filter(
    (row) => row.role === "agency:legislature-vote",
  );
  expect(ballots.length).toBeGreaterThan(0);
  for (const row of ballots) expect(row.detail!.split("|")[1]).toBeTruthy();
  if (vote.tags.includes("outcome:deadlocked")) return;
  const winner = vote.participants.find((row) => row.role === "focus:subject")!;
  const cast = ballots.filter((row) => !row.detail!.startsWith("none|"));
  const tallies = vote.tags
    .filter((tag) => tag.startsWith("votes:"))
    .map((tag) => Number(tag.slice(tag.lastIndexOf(":") + 1)));
  expect(Math.max(...tallies) * 2).toBeGreaterThan(cast.length);
  expect(vote.summary).toContain("legislature elected");
  expect(winner.personId).toBeTruthy();
}

/** A life in a place drawn by the seed from every place a life can start. */
function openingWorld(seed: string): World {
  const place = new SeededRng(seed).pick(lifePlaces());
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...explicitNewGameSetup({ placeKey: place.key, seed }),
      startAge: 40,
    }),
  ).game!;
  return openOrdinaryLife(game.world, game.playerPersonId);
}

/** Congress proposes, and 38 states ratify, an amendment setting the rule. */
function ratify(
  world: World,
  method: "popular-vote" | "state-legislature",
): World {
  let next = ensureNationalElectionJurisdiction(world);
  next = proposeConstitutionalMeasure(next, {
    stableKey: `b27-senate-selection:${method}`,
    jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
    jurisdictionKey: "US",
    processKind: "federal-amendment",
    designation: "Proposed Amendment to the Constitution (test)",
    shortTitle: "How senators are chosen",
    text: "Fictional test text.",
    textVersion: "v1",
    sponsoringAuthority: "The Congress of the United States",
    sponsorPersonId: null,
    ratificationMode: "state-legislatures",
    deadlineAt: null,
    delayedOperativeAt: null,
    ruleDelta: {
      kind: "rule-field",
      officeKey: SENATE_SELECTION_OFFICE_KEY,
      field: "senate.selection",
      value: method,
    },
    ordinaryMeasureId: null,
  });
  const measureId = next.history.constitutionalMeasures!.at(-1)!.id;
  for (const [bodyKey, size] of [
    ["house", 435],
    ["senate", 100],
  ] as const) {
    const members = Array.from({ length: size }, (_, index) => ({
      memberKey: `${bodyKey}:seat:${index + 1}`,
      name: `Seat ${index + 1}`,
      personId: null,
      caucusLabel: "",
    }));
    next = recordConstitutionalProposalVote(
      next,
      measureId,
      bodyKey,
      dispositionsFromCounts(members, { yea: size, nay: 0 }),
      size,
      {
        method: "authored-fixture",
        note: "Test fixture.",
        sourceEntityIds: [],
      },
    );
  }
  for (const stateKey of ARTICLE_V_STATE_KEYS.slice(0, 38))
    next = recordArticleVRatification(next, measureId, {
      kind: "state-ratification",
      stateKey,
      body: "state-legislature",
      approved: true,
      authenticationKey: `test:${stateKey}`,
    });
  expect(constitutionalPosition(next, measureId).operativeAt).not.toBeNull();
  return next;
}

describe("Build 27 step 4: how a state's senators are chosen", () => {
  it("starts at the Seventeenth Amendment and changes only by amendment", () => {
    const world = openingWorld("b27-selection-rule");
    expect(senateSelectionRuleAt(world, world.currentDate)).toEqual({
      method: "popular-vote",
      basis: "U.S. Const. amend. XVII",
    });
    const amended = ratify(world, "state-legislature");
    expect(senateSelectionRuleAt(amended, amended.currentDate).method).toBe(
      "state-legislature",
    );
    // The legislature fills a vacancy on the second Tuesday after notice.
    expect(legislativeSenateElectionDay(makeIsoDate("2026-09-29"))).toBe(
      "2026-10-13",
    );
    expect(legislativeSenateElectionDay(makeIsoDate("2026-09-27"))).toBe(
      "2026-10-06",
    );
  }, 300_000);

  it("after the amendment, a state's legislature fills an empty Senate seat by its members' votes", () => {
    const world = ratify(
      openingWorld("b27-selection-vacancy"),
      "state-legislature",
    );
    const congress = projectCongress(world)!;
    const nextRegularYear = Number(world.currentDate.slice(0, 4)) + 2;
    const candidates = congress.senate.seats.filter(
      (s) =>
        s.occupant.kind === "member" &&
        (s.occupant.member.endExclusive ?? "") > `${nextRegularYear}-06-01`,
    );
    // Prefer a state whose legislature is seated in this world.
    const seat =
      candidates.find((s) => stateLegislatureMajority(world, s.stateUsps)) ??
      candidates[0]!;
    if (seat.occupant.kind !== "member") throw new Error("fixture");
    const senator = seat.occupant.member;
    let next = recordPersonDeath(world, {
      stableKey: `b27:death:${senator.personId}`,
      personId: senator.personId,
      diedAt: world.currentDate,
      causeKey: "cause:external-fixture",
      sourceEntityIds: [world.id],
      summary: "A senator died.",
      provenance: { kind: "authored", note: "Build 27 fixture." },
    });
    const death = next.history.personDeaths.at(-1)!;
    next = applyOfficeContinuityNotices(next, [
      {
        noticeKey: `crisis:continuity:${death.id}`,
        sequence: death.sequence,
        originEventId: death.eventId,
        personId: senator.personId,
        kind: "death",
        effectiveDate: death.diedAt,
        recordedDate: next.currentDate,
        visibility: "public",
        sourceRecordId: death.id,
        offices: [
          {
            officeKey: seat.seatKey,
            title: senator.title,
            organizationId: null,
            termEvidenceId: senator.termId as EntityId,
          },
        ],
      },
    ]);
    const ruling = officeContinuityRulings(next, seat.seatKey)[0]!;
    expect(ruling.outcome).toBe("special-election");
    expect(
      next.history.events.find((event) => event.id === ruling.eventId)!.summary,
    ).toContain("legislature elects a senator in joint assembly");
    // No governor's appointment, and no popular vote months away.
    expect(
      next.history.futureDueItems.some((due) =>
        due.stableKey.includes(`:appointment:${seat.seatKey}:`),
      ),
    ).toBe(false);
    const due = next.history.futureDueItems.find(
      (item) =>
        item.transitionKey === HOUSE_SPECIAL_ELECTION &&
        item.stableKey.includes(`:special:${seat.seatKey}:`),
    )!;
    expect(due.dueAt).toBe(legislativeSenateElectionDay(next.currentDate));
    next = passOrdinaryDays(next, daysBetween(next.currentDate, due.dueAt) + 1);
    const filled = projectCongress(next)!.senate.seats.find(
      (s) => s.seatKey === seat.seatKey,
    )!;
    expect(stateLegislatureMajority(next, seat.stateUsps)).not.toBeNull();
    expectElectedByMajority(next, seat.seatKey);
    if (filled.occupant.kind === "member") {
      const term = next.history.events.find(
        (event) =>
          filled.occupant.kind === "member" &&
          event.id === filled.occupant.member.termId,
      )!;
      expect(term.tags.some((tag) => tag.startsWith(SEAT_PARTY_TAG))).toBe(
        true,
      );
    } else {
      // A deadlocked legislature leaves the seat empty.
      expect(
        next.history.events.some(
          (event) =>
            event.type === JOINT_ASSEMBLY_VOTE_EVENT &&
            event.tags.includes(`seat:${seat.seatKey}`) &&
            event.tags.includes("outcome:deadlocked"),
        ),
      ).toBe(true);
    }
  }, 900_000);

  it("after the amendment, the legislatures choose the senators at the regular election and no one files with the voters", () => {
    const world = ratify(
      openingWorld("b27-selection-regular"),
      "state-legislature",
    );
    const year = Number(world.currentDate.slice(0, 4));
    const electionYear = year % 2 === 0 ? year : year + 1;
    let electionDay = congressionalElectionDay(electionYear);
    if (electionDay <= world.currentDate)
      electionDay = congressionalElectionDay(electionYear + 2);
    const next = passOrdinaryDays(
      world,
      daysBetween(world.currentDate, electionDay) + 1,
    );
    const results = next.history.events.find(
      (event) =>
        event.type === CONGRESS_RESULTS_EVENT &&
        event.occurredAt === electionDay,
    )!;
    const senateSeats = results.participants.filter((row) =>
      row.detail?.startsWith("us-senate"),
    );
    expect(senateSeats.length).toBeGreaterThan(0);
    for (const row of senateSeats) {
      const seatKey = row.detail!.split("|")[0]!;
      expect(results.tags).toContain(`chosen-by-legislature:${seatKey}`);
      expect(
        congressCandidateSlate(next, seatKey, Number(electionDay.slice(0, 4))),
      ).toBeFalsy();
    }
    expect(results.summary).toContain("the state legislatures chose");
    // Where a state's legislature is seated, its members elected the senator
    // by a majority of the votes cast, each for their own reasons.
    for (const row of senateSeats) {
      const seatKey = row.detail!.split("|")[0]!;
      const usps = seatKey.split(":")[1]!;
      if (stateLegislatureMajority(next, usps))
        expectElectedByMajority(next, seatKey);
    }
  }, 1_800_000);
});
