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

import { createWorld, createWorldId } from "../simulation/world";
import { createLightweightPerson } from "../simulation/people";
import {
  lifePlaces,
  lifePlaceStateIdentities,
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
import {
  createFormationContext,
  recordPrivateBelief,
} from "../simulation/politics";
import { deserializeWorld, serializeWorld } from "../simulation/serialization";
import { isEligibleVoterIn } from "../simulation/issue-record";
import { officialOpinionSubject } from "../simulation/political-opinion-subjects";

import { pickDistinct, SeededRng } from "../simulation/rng";
import { townRoster } from "../simulation/living-world/town-residents";
import { drawRandomPlace } from "../../tests/support/random-place";

/** An older saved world omits optional outcome books; explicit undefined is invalid JSON. */
function withoutPlaceOutcomes(
  world: Parameters<typeof localElectionCountHandler>[0],
) {
  const { placeOutcomes: omitted, ...rest } = world;
  void omitted;
  return rest;
}

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

const calendarSeed = "overflow8-a112-town-calendar";
const calendarPlace = drawRandomPlace(calendarSeed, (candidate) =>
  governmentUnitsForState(candidate.stateJurisdictionKey?.slice(3) ?? "").some(
    (unit) =>
      unit.unitType === "municipality" &&
      unit.placeGeoid === candidate.sourceGeoid &&
      localGoverningBodyIdentity(unit) !== null &&
      (localGoverningBodyRules(unit)?.seats?.value ?? 0) > 0,
  ),
);
describe(`${calendarPlace.displayName} elects its council, seed ${calendarSeed}`, () => {
  it(
    "holds primaries and a general, with residents running and the winners seated",
    { timeout: 600_000 },
    () => {
      const opened = openObserverWorld(
        observerSetup(calendarSeed, calendarPlace.key),
      );
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
      world = resolveDueThrough(
        world,
        "2027-11-04",
        createFutureTransitionHandlerRegistry([
          [
            LOCAL_ELECTION_COUNT,
            (atCount, item) => {
              const key = item.stableKey.replace(/:count$/, "");
              const contest = atCount.history.electionContests?.find(
                (row) => row.stableKey === key,
              );
              expect(contest, item.stableKey).toBeDefined();
              let recorded = atCount;
              const voters = atCount.personOrder
                .filter(
                  (id) =>
                    !contest!.candidatePersonIds.includes(id) &&
                    isEligibleVoterIn(
                      atCount,
                      id,
                      contest!.jurisdictionId,
                      atCount.currentDate,
                    ),
                )
                .slice(0, 4);
              expect(voters.length).toBeGreaterThanOrEqual(4);
              const holders = new Set(
                units.flatMap((unit) =>
                  sittingLocalOfficers(atCount, unit).map(
                    (row) => row.personId,
                  ),
                ),
              );
              const challengerIndex = contest!.candidatePersonIds.findIndex(
                (id) => !holders.has(id),
              );
              const preferredIndex = challengerIndex < 0 ? 0 : challengerIndex;
              const otherIndex =
                preferredIndex === 0 && contest!.candidatePersonIds.length > 1
                  ? 1
                  : 0;
              for (const [voterIndex, voterId] of voters.entries()) {
                for (const [
                  index,
                  candidateId,
                ] of contest!.candidatePersonIds.entries()) {
                  recorded = recordPrivateBelief(recorded, {
                    stableKey: `calendar-fixture:${contest!.id}:${voterId}:${candidateId}`,
                    personId: voterId,
                    propositionId: null,
                    subject: officialOpinionSubject(candidateId),
                    formedAt: atCount.currentDate,
                    position:
                      index === (voterIndex === 3 ? otherIndex : preferredIndex)
                        ? "support"
                        : "oppose",
                    conviction: "strong",
                    salience: "high",
                    flexibility: "firm",
                    rationale: "Authored recorded-voter calendar fixture.",
                    formation: createFormationContext("reflection:fixture", {
                      note: "Saved candidate views for the calendar fixture.",
                    }),
                    supersedesBeliefId: null,
                  });
                }
              }
              return localElectionCountHandler(recorded, item);
            },
          ],
        ]),
      );

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
          const race = row.stableKey.replace(/:(primary|general)$/, "");
          expect(
            world.history.decisionTraces.some(
              (trace) =>
                trace.context.actorPersonId === id &&
                trace.context.subject.key === race &&
                (trace.selectedOptionKey === "run" ||
                  trace.selectedOptionKey === "seek"),
            ),
            `${row.stableKey}: ${id} recorded their own candidacy choice`,
          ).toBe(true);
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
      const reopened = deserializeWorld(serializeWorld(world));
      expect(reopened.history.electionContestResults).toEqual(
        world.history.electionContestResults,
      );
      expect(reopened.history.decisionTraces).toEqual(
        world.history.decisionTraces,
      );
      for (const unit of units)
        expect(sittingLocalOfficers(reopened, unit)).toEqual(
          sittingLocalOfficers(world, unit),
        );
    },
  );
});

describe("A112 town counts use saved support without a seed draw", () => {
  const selectionSeed = "audit-a112-count-place";
  const places = lifePlaces();
  // Consider all 56 jurisdictions. Only actual admitted municipal offices
  // enter this positive fixture; absent office data is not an invented office.
  const representatives = lifePlaceStateIdentities().flatMap((identity) => {
    const admitted = new Set(
      governmentUnitsForState(identity.usps)
        .filter(
          (unit) =>
            unit.unitType === "municipality" &&
            unit.placeGeoid !== null &&
            localGoverningBodyIdentity(unit) !== null,
        )
        .map((unit) => unit.placeGeoid),
    );
    return places
      .filter(
        (place) =>
          place.scope === "locality" &&
          place.stateJurisdictionKey === identity.jurisdictionKey &&
          admitted.has(place.sourceGeoid ?? null),
      )
      .sort(
        (left, right) =>
          townRoster(right.context.jurisdiction.id).population -
            townRoster(left.context.jurisdiction.id).population ||
          left.key.localeCompare(right.key),
      )
      .slice(0, 1);
  });
  const place = pickDistinct(
    new SeededRng(selectionSeed),
    representatives,
    1,
  )[0]!;
  it(`counts equivalent saved three-candidate support in ${place.displayName} selected by ${selectionSeed} under two seeds`, () => {
    const state = stateJurisdictionForKey(place.stateJurisdictionKey!)!;
    const date = makeIsoDate("2026-01-05");
    const unit = governmentUnitsForState(
      place.stateJurisdictionKey!.slice(3),
    ).find(
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
        const people = Array.from({ length: 6 }, (_, index) =>
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
          [0, [3, 4, 5]],
          [1, [2]],
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
            stableKey: `${belief.stableKey}:conflicted`,
            personId: belief.personId,
            propositionId: belief.propositionId,
            subject: belief.subject,
            formedAt: date,
            position: "conflicted",
            conviction: belief.conviction,
            salience: belief.salience,
            flexibility: belief.flexibility,
            rationale:
              "The controlled voter records conflicting views of this candidate.",
            formation: createFormationContext("reflection:fixture", {
              note: "Authored conflicting views retain history and neutral aggregate support.",
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
        for (const pending of [neutralQueued]) {
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
          withoutPlaceOutcomes(atVote),
          due,
        );
        expect(unavailable.status).toBe("resolved");
        expect(
          electionContestResult(unavailable.world, contest.id)!.tallies.map(
            (row) => row.votes,
          ),
        ).toEqual([3, 1, 0]);
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
        expect(empty.status).toBe("resolved");
        expect(
          electionContestResult(empty.world, contest.id)!.tallies.map(
            (row) => row.votes,
          ),
        ).toEqual([3, 1, 0]);
        const counted = localElectionCountHandler(atVote, due);
        expect(counted.status).toBe("resolved");
        const result = electionContestResult(counted.world, contest.id)!;
        expect(result).not.toBeNull();
        expect(result.tallies).toHaveLength(3);
        expect(result.tallies.map((row) => row.votes)).toEqual([3, 1, 0]);
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
