import { describe, expect, it } from "vitest";

import { addDays, ageOnDate } from "../simulation/dates";
import { governmentUnitsForState } from "../simulation/government-units";
import {
  LOCAL_ELECTION_FILING,
  LOCAL_ELECTIONS_PROFILE,
  LOCAL_GOVERNMENT_YEAR,
  nextTownElectionDay,
  seatIsUp,
} from "../simulation/living-world/local-elections";
import { sittingLocalOfficers } from "../simulation/living-world/local-government-seats";
import { localChiefExecutiveRules } from "../simulation/nationwide-world/local-chief-executive-rules";
import { localGoverningBodyRules } from "../simulation/nationwide-world/local-governing-body-rules";
import { homeLocalGovernmentUnits } from "../simulation/nationwide-world/local-governments";
import { STATES } from "../simulation/state-reference";
import { makeIsoDate } from "../simulation/dates";
import { observerSetup, openObserverWorld } from "./observer-world";
import type { EntityId } from "../simulation/types";
import { resolveDueThrough } from "../../tests/fixtures/due-item-clock";

/**
 * Lane C step 3: the town's own elections. The council and mayor seated at
 * the opening stand again on the town's calendar, neighbors file against
 * them, a field of more than two meets in a primary, and the winner takes the
 * seat.
 */

const FIFTY_STATES = Object.keys(STATES).filter(
  (usps) =>
    usps.length === 2 && !["DC", "PR", "GU", "VI", "AS", "MP"].includes(usps),
);

describe("the town's election calendar, in every state", () => {
  it("covers fifty states", () => {
    expect(FIFTY_STATES).toHaveLength(50);
  });

  for (const usps of FIFTY_STATES) {
    it(`${usps}: a town's next election has a date and a basis, and every seat comes up within a term`, () => {
      const unit = governmentUnitsForState(usps).find(
        (candidate) =>
          candidate.unitType === "municipality" && candidate.functionalActive,
      )!;
      expect(unit, usps).toBeDefined();
      const onDate = makeIsoDate("2026-01-05");
      const day = nextTownElectionDay(unit, onDate);
      expect(day.electionDate > onDate).toBe(true);
      expect([
        "state-law-unverified",
        "local-choice-estimated",
        "game-default",
      ]).toContain(day.basis);
      // An election day is a Tuesday.
      expect(new Date(`${day.electionDate}T00:00:00Z`).getUTCDay()).toBe(2);
      const rules = localGoverningBodyRules(unit);
      const seats = rules?.seats?.value ?? 0;
      const term = rules?.termYears?.value ?? 4;
      const year = Number(day.electionDate.slice(0, 4));
      for (let n = 1; n <= seats; n += 1) {
        const upWithinTerm = Array.from(
          { length: Math.max(1, Math.round(term / day.cadenceYears)) },
          (_, cycle) =>
            seatIsUp(
              n,
              year + cycle * day.cadenceYears,
              day.cadenceYears,
              term,
            ),
        );
        expect(upWithinTerm.filter(Boolean), `${usps} seat ${n}`).toHaveLength(
          1,
        );
      }
    });
  }
});

describe("Columbus, Ohio elects its council on its own", () => {
  it(
    "holds primaries and a general, with residents running and the winners seated",
    { timeout: 600_000 },
    () => {
      const opened = openObserverWorld(observerSetup("round-1", "3918000"));
      let world = opened.world;
      const units = homeLocalGovernmentUnits(
        world,
        opened.anchorPersonId,
      ).municipal;
      const due = world.history.futureDueItems.filter(
        (item) =>
          item.transitionKey === LOCAL_ELECTION_FILING ||
          item.transitionKey === LOCAL_GOVERNMENT_YEAR,
      );
      expect(due.length).toBe(units.length * 2);
      const town = due[0]!.jurisdictionId!;

      // Through the November 2027 general election: every due item on the
      // way (filings, primaries, generals, counts, seatings) is resolved by
      // the handlers that own it, without the per-day life pass.
      world = resolveDueThrough(world, "2027-11-04");

      const contests = (world.history.electionContests ?? []).filter((row) =>
        row.stableKey.startsWith("local-elections/v1:"),
      );
      const primaries = contests.filter((row) =>
        row.stableKey.endsWith(":primary"),
      );
      const generals = contests.filter((row) =>
        row.stableKey.endsWith(":general"),
      );
      expect(primaries.length).toBeGreaterThan(0);
      expect(generals.length).toBeGreaterThan(0);
      // A field of more than two belongs only in a primary.
      for (const row of generals)
        expect(row.candidatePersonIds.length).toBeLessThanOrEqual(2);
      expect(
        Math.max(...primaries.map((row) => row.candidatePersonIds.length)),
      ).toBeGreaterThan(2);
      // Every race was counted, and every candidate lived in the town when
      // its field closed. The field now closes the estimated filing lead
      // (85 days) before the first vote, so a candidate can move away before
      // election day: nothing yet takes a mover off the ballot (A118 missing
      // link), so a later move is accepted only when it is on the record.
      const movedAfter = (personId: EntityId, date: string) =>
        world.history.events.some(
          (event) =>
            event.type === "migration.moved" &&
            event.involvedEntityIds.includes(personId) &&
            event.occurredAt > date,
        );
      for (const row of contests) {
        const general = row.stableKey.split(":")[3]!;
        const fieldClosed = addDays(
          makeIsoDate(general),
          -(
            LOCAL_ELECTIONS_PROFILE.filingLeadDays +
            LOCAL_ELECTIONS_PROFILE.primaryLeadDays
          ),
        );
        expect(
          (world.history.electionContestResults ?? []).some(
            (result) => result.contestId === row.id,
          ),
          row.stableKey,
        ).toBe(true);
        for (const id of row.candidatePersonIds) {
          const person = world.people[id]!;
          expect(
            person.homeJurisdictionId === town || movedAfter(id, fieldClosed),
            `${row.stableKey}: ${id} lived in town when the field closed`,
          ).toBe(true);
          expect(
            ageOnDate(person.birthDate, row.electionDate),
          ).toBeGreaterThanOrEqual(21);
        }
      }
      // The body is still its size after the seats change hands.
      for (const unit of units) {
        const rules = localGoverningBodyRules(unit);
        if (!rules?.seats) continue;
        const officers = sittingLocalOfficers(world, unit);
        expect(officers.filter((row) => !row.mayor)).toHaveLength(
          rules.seats.value,
        );
        expect(officers.filter((row) => row.mayor)).toHaveLength(
          localChiefExecutiveRules(unit)?.directlyElected.value ? 1 : 0,
        );
      }
      const types = new Set(world.history.events.map((event) => event.type));
      expect(types.has("local.election-primary-held")).toBe(true);
      expect(types.has("local.seat-changed")).toBe(true);
    },
  );
});

import { createWorld, createWorldId } from "../simulation/world";
import { createLightweightPerson, personName } from "../simulation/people";
import {
  lifePlaceByKey,
  stateJurisdictionForKey,
} from "../simulation/life-places";
import {
  setFutureDueItemTerminalState,
  createFutureTransitionHandlerRegistry,
  resolveFutureDueItemsThrough,
  scheduleFutureDueItem,
} from "../simulation/future-transitions";
import {
  scheduleElectionContest,
  ELECTION_CONTEST_TRANSITION_KEY,
  electionContestTransitionHandler,
  electionContestResult,
  electionContestStatus,
} from "../simulation/election-contests";
import { localGoverningBodyIdentity } from "../simulation/nationwide-world/local-governing-body-candidacy-packs";
import {
  LOCAL_ELECTION_COUNT,
  localElectionCountHandler,
} from "../simulation/living-world/local-elections";
import { simulationMomentOnLocalDate } from "../simulation/dates";
import { placeOutcomesForMonth } from "../simulation/outcome-web/place-outcomes";
import { placeOutcomeAt } from "../simulation/outcome-web/place-outcome-store";
import {
  createFormationContext,
  recordPrivateBelief,
} from "../simulation/politics";
import { officialOpinionSubject } from "../simulation/political-opinion-subjects";

describe("A112 town counts use saved support without a seed draw", () => {
  it("counts equivalent saved three-candidate Columbus support under two seeds", () => {
    const place = lifePlaceByKey("3918000")!;
    const state = stateJurisdictionForKey(place.stateJurisdictionKey!)!;
    const date = makeIsoDate("2026-01-05");
    const unit = governmentUnitsForState("OH").find(
      (row) =>
        row.unitType === "municipality" && row.placeGeoid === place.sourceGeoid,
    )!;
    expect(unit).toBeDefined();
    const office = localGoverningBodyIdentity(unit)!;
    expect(office).not.toBeNull();
    const seat = 1,
      town = place.context.jurisdiction.id;
    const voteDate = makeIsoDate(addDays(date, 1)),
      generalDate = makeIsoDate(addDays(date, 2));
    const contestKey = `local-elections/v1:${unit.id}:${generalDate}:seat-${seat}:primary`;
    const results = ["audit-a112-count-seed-a", "audit-a112-count-seed-b"].map(
      (seed) => {
        const people = Array.from({ length: 4 }, (_, index) =>
          createLightweightPerson({
            worldId: createWorldId(seed),
            worldSeed: seed,
            index,
            currentDate: date,
            homeJurisdictionId: place.context.jurisdiction.id,
          }),
        );
        let world = createWorld({
          seed,
          currentDate: date,
          jurisdictions: [state, place.context.jurisdiction],
          people,
        });
        const month = makeIsoDate(`${date.slice(0, 7)}-01`);
        world = {
          ...world,
          placeOutcomes: {
            months: [
              {
                month,
                records: placeOutcomesForMonth(world, month, [
                  "voting.turnout-pct",
                ]),
              },
            ],
          },
        };
        for (const [candidateIndex, voterIndexes] of [
          [0, [1, 2, 3]],
          [1, [3]],
        ] as const) {
          const candidateId = world.personOrder[candidateIndex]!;
          for (const voterIndex of voterIndexes) {
            const voterId = world.personOrder[voterIndex]!;
            world = recordPrivateBelief(world, {
              stableKey: `controlled-election:support:${voterIndex}:${candidateIndex}`,
              personId: voterId,
              propositionId: null,
              subject: officialOpinionSubject(candidateId),
              formedAt: date,
              position: "support",
              conviction: "strong",
              salience: "high",
              flexibility: "firm",
              rationale: "Authored controlled election fixture.",
              formation: createFormationContext("reflection:fixture", {
                note: "Authored support for the controlled candidate.",
              }),
              supersedesBeliefId: null,
            });
          }
        }
        world = scheduleFutureDueItem(world, {
          stableKey: contestKey + ":count",
          dueAt: voteDate,
          transitionKey: LOCAL_ELECTION_COUNT,
          entityIds: [town],
          jurisdictionId: town,
          provenance: {
            kind: "authored",
            note: "Controlled saved three-person primary; no natural filing or calendar claim.",
          },
        });
        const due = world.history.futureDueItems.at(-1)!;
        world = scheduleElectionContest(world, {
          stableKey: contestKey,
          jurisdictionId: town,
          office: {
            officeKey: office.officeKey,
            title: office.bodyName + " controlled primary",
            seatKey: "seat-1",
            occupationClassification: "service:municipal-office",
          },
          electionDate: voteDate,
          candidatePersonIds: world.personOrder.slice(0, 3),
          provenance: {
            method: "authored",
            sourceEntityIds: world.personOrder.slice(0, 3),
            note: "Actual saved people in a controlled primary; not legal candidacy evidence.",
          },
        });
        const contest = world.history.electionContests!.at(-1)!;
        const sharedCount = world.history.futureDueItems.find(
          (item) => item.stableKey === `${contestKey}:due`,
        )!;
        const queued = world;
        let neutralQueued = queued;
        for (const belief of queued.history.privateBeliefs) {
          neutralQueued = recordPrivateBelief(neutralQueued, {
            stableKey: `${belief.stableKey}:uncertain`,
            personId: belief.personId,
            propositionId: belief.propositionId,
            subject: belief.subject,
            formedAt: date,
            position: "uncertain",
            conviction: belief.conviction,
            salience: belief.salience,
            flexibility: belief.flexibility,
            rationale:
              "The controlled voter records no preference for this candidate.",
            formation: createFormationContext("reflection:fixture", {
              note: "Authored neutral views retain complete saved history.",
            }),
            supersedesBeliefId: belief.id,
          });
        }
        const registry = createFutureTransitionHandlerRegistry([
          [LOCAL_ELECTION_COUNT, localElectionCountHandler],
          [ELECTION_CONTEST_TRANSITION_KEY, electionContestTransitionHandler],
        ]);
        // Older scheduled races still contain both due items. The local
        // refusal must block the shared fallback before the queue reaches it.
        for (const pending of [
          { ...queued, placeOutcomes: undefined },
          neutralQueued,
          {
            ...queued,
            placeOutcomes: {
              months: queued.placeOutcomes!.months.map((row) => ({
                ...row,
                records: row.records.map((record) => ({
                  ...record,
                  value: 0,
                })),
              })),
            },
          },
        ]) {
          const settled = resolveFutureDueItemsThrough(
            pending,
            voteDate,
            registry,
          );
          expect(electionContestResult(settled, contest.id)).toBeNull();
          expect(electionContestStatus(settled, contest.id)).toBe("pending");
          expect(
            settled.history.futureDueItemStates
              .filter((state) => state.dueItemId === due.id)
              .at(-1)!.status,
          ).toBe("blocked");
          expect(
            settled.history.futureDueItemStates
              .filter((state) => state.dueItemId === sharedCount.id)
              .at(-1)!.status,
          ).toBe("blocked");
          expect(
            pending.history.futureDueItemStates
              .filter((state) => state.dueItemId === sharedCount.id)
              .at(-1)!.status,
          ).toBe("scheduled");
          expect(
            resolveFutureDueItemsThrough(settled, voteDate, registry),
          ).toBe(settled);
        }
        const resolvedQueue = resolveFutureDueItemsThrough(
          queued,
          voteDate,
          registry,
        );
        expect(electionContestResult(resolvedQueue, contest.id)).not.toBeNull();
        expect(electionContestStatus(resolvedQueue, contest.id)).toBe(
          "resolved",
        );
        const atVote = setFutureDueItemTerminalState(
          {
            ...world,
            currentDate: voteDate,
            currentMoment: simulationMomentOnLocalDate(
              world.currentMoment,
              voteDate,
            ),
          },
          {
            // Direct refusals are idempotent when the shared count is already blocked.
            stableKey: `${contestKey}:fixture-shared-count-blocked`,
            dueItemId: sharedCount.id,
            effectiveAt: voteDate,
            status: "blocked",
            reasonKey: "local-election:local-count-blocked",
            context: "The controlled local count retains pending authority.",
            outcomeEventId: null,
          },
        );
        const unavailable = localElectionCountHandler(
          { ...atVote, placeOutcomes: undefined },
          due,
        );
        expect(unavailable.status).toBe("blocked");
        expect(
          unavailable.world.history.electionContestResults ?? [],
        ).toHaveLength(0);
        expect(electionContestResult(unavailable.world, contest.id)).toBeNull();
        const neutral = {
          ...atVote,
          history: { ...atVote.history, privateBeliefs: [] },
        };
        const tied = localElectionCountHandler(neutral, due);
        expect(tied.status).toBe("blocked");
        expect(tied.world).toBe(neutral);
        expect(electionContestResult(tied.world, contest.id)).toBeNull();
        const reversed = {
          ...neutral,
          history: {
            ...neutral.history,
            electionContests: neutral.history.electionContests!.map((row) =>
              row.id === contest.id
                ? {
                    ...row,
                    candidatePersonIds: [...row.candidatePersonIds].reverse(),
                  }
                : row,
            ),
          },
        };
        const reversedTie = localElectionCountHandler(reversed, due);
        expect(reversedTie.status).toBe("blocked");
        expect(reversedTie.world).toBe(reversed);
        const zeroTurnout = {
          ...atVote,
          placeOutcomes: {
            months: atVote.placeOutcomes!.months.map((row) => ({
              ...row,
              records: row.records.map((record) => ({
                ...record,
                value: 0,
              })),
            })),
          },
        };
        const empty = localElectionCountHandler(zeroTurnout, due);
        expect(empty.status).toBe("blocked");
        expect(empty.world).toBe(zeroTurnout);
        expect(electionContestResult(empty.world, contest.id)).toBeNull();
        const counted = localElectionCountHandler(atVote, due);
        expect(counted.status).toBe("resolved");
        const result = electionContestResult(counted.world, contest.id)!;
        expect(result).not.toBeNull();
        expect(result.tallies).toHaveLength(3);
        expect(result.tallies.every((row) => row.votes > 0)).toBe(true);
        console.log(
          JSON.stringify({
            a112Count: {
              place: place.displayName,
              seed,
              recordedTurnoutPercent: placeOutcomeAt(
                world,
                "voting.turnout-pct",
                town,
                voteDate,
              )!.value,
              candidates: result.tallies.map((row) => ({
                name: personName(counted.world.people[row.candidatePersonId]!),
                votes: row.votes,
              })),
              winner: personName(counted.world.people[result.winnerPersonId]!),
            },
          }),
        );
        return {
          tallies: result.tallies.map((row) => ({
            candidateIndex: contest.candidatePersonIds.indexOf(
              row.candidatePersonId,
            ),
            votes: row.votes,
            voteShare: row.voteShare,
          })),
          winnerIndex: contest.candidatePersonIds.indexOf(
            result.winnerPersonId,
          ),
        };
      },
    );
    expect(results[0]!.tallies).toEqual(results[1]!.tallies);
    expect(results[0]!.winnerIndex).toBe(results[1]!.winnerIndex);
  });
});
