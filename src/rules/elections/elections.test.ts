import { describe, expect, it } from "vitest";
import { STATES } from "../../simulation/state-reference";
import { SeededRng } from "../../simulation/rng";
import { makeIsoDate } from "../../simulation/dates";
import * as oldDates from "../../simulation/nominations/date-rules";
import * as oldBallots from "../../simulation/municipal-ballot-rules";
import * as oldExecutive from "../../simulation/nationwide-world/state-executive-term-rules";
import * as oldTown from "../../simulation/nationwide-world/town-election-calendar";
import * as oldNational from "../../simulation/national-election-rules";
import * as oldVacancy from "../../simulation/nationwide-world/senate-vacancy-law";
import * as oldTerms from "../../simulation/nationwide-world/executive-term-limits";
import { datedTermsInOffice } from "../../simulation/nationwide-world/prior-terms";
import { createWorld } from "../../simulation/world";
import { createStableId } from "../../simulation/ids";
import * as oldPrimary from "../../simulation/nominations/party-nominations";
import { nominationPlan } from "../../simulation/nominations/nomination-rules";
import { dateFromElectionRule } from "./date-rules";
import { tabulateBallot } from "./ballots";
import * as calendar from "./executive-calendar";
import * as national from "./national-calendar";
import { nextTownElection } from "./town-calendar";
import { senateAppointmentTiming } from "./vacancy";
import { checkExecutiveTermLimit } from "./executive-term-limits";
import { holdNominationPrimary } from "./primary";
import type { World, HistoricalEvent } from "../../simulation/types";
const places = Object.keys(STATES);
const on = makeIsoDate("2026-10-11");
const base = createWorld({
  seed: "rules2-election-golden",
  currentDate: on,
  people: [],
  jurisdictions: [
    {
      id: createStableId("jurisdiction", "golden-root"),
      slug: "golden-root",
      name: "Golden root",
      kind: "state",
      parentName: null,
      provenance: {
        asOf: on,
        source: "Authored golden fixture",
        jurisdiction: createStableId("jurisdiction", "golden-root"),
        status: "placeholder",
      },
    },
  ],
});
function worldForTerms(place: string, starts: readonly string[]): World {
  const office = oldTerms.executiveTermLimitInWorld(base, place, on)?.officeKey;
  return {
    ...base,
    history: {
      ...base.history,
      events: starts.map(
        (start, i) =>
          ({
            id: createStableId("event", `${place}:${i}`),
            type: "world.office-tenure",
            occurredAt: makeIsoDate(start),
            recordedAt: on,
            tags: [
              `office:${office}`,
              ...(i + 1 < starts.length ? [`term-end:${starts[i + 1]}`] : []),
            ],
            participants: [{ personId: base.id, role: "focus:subject" }],
          }) as unknown as HistoricalEvent,
      ),
    },
  };
}
function primaryOracle(
  place: string,
  plan: oldPrimary.HoldNominationInput["plan"],
  entrants: oldPrimary.NominationEntrant[],
) {
  // Candidate entity validation accepts World itself. Distinct ids are fixture people.
  const people = Object.fromEntries(
    entrants.map((e) => [e.personId, { id: e.personId }]),
  );
  const jurisdictionId = createStableId("jurisdiction", `US-${place}`);
  const world = {
    ...base,
    people,
    jurisdictions: { [jurisdictionId]: { id: jurisdictionId } },
  } as unknown as World;
  const input = {
    stableKey: `primary:${place}`,
    seatKey: `seat:${place}`,
    title: "Golden field",
    jurisdictionId,
    involvedEntityIds: [world.id],
    plan,
    entrants,
    partyShare: (p: string) => (p === "A" ? 0.6 : null),
  };
  const result = oldPrimary.holdNominationPrimary(world, input);
  const event = oldPrimary.nominationPrimaryRecord(result, input.stableKey)!;
  return { input, event, result };
}
describe("P14 election golden rules: all 56 identities", () => {
  it("draws one reproducible random place and uses all identities", () => {
    expect(places).toHaveLength(56);
    expect(places).toContain(
      new SeededRng("rules2-elections-20261011").pick(places),
    );
  });
  for (const place of places) {
    it(`${place}: calendars match selected real rows and statutory date shapes`, () => {
      const rule = oldExecutive.stateExecutiveTermRule(place)!;
      for (const day of [
        "2024-01-01",
        "2026-11-03",
        "2026-11-04",
        "2030-12-31",
      ]) {
        const date = makeIsoDate(day);
        expect(calendar.nextRegularElection(rule, date)).toEqual(
          oldExecutive.nextRegularElection(rule, date),
        );
        expect(calendar.regularTermWindowOn(rule, date)).toEqual(
          oldExecutive.regularTermWindowOn(rule, date),
        );
        expect(calendar.termDatesAfterElection(rule, date)).toEqual(
          oldExecutive.termDatesAfterElection(rule, date),
        );
        const found = oldBallots.resolveMunicipalElectionTiming(
          place,
          `town:${place}`,
        );
        expect(nextTownElection(found, date, oldTown.FILING_LEAD_DAYS)).toEqual(
          oldTown.nextTownElection(place, `town:${place}`, date),
        );
      }
      for (const year of [2024, 2025, 2026, 2028, 2032]) {
        expect(national.isNationalElectionCycle(year)).toEqual(
          oldNational.isNationalElectionCycle(year),
        );
        expect(national.presidentialElectionDay(year)).toEqual(
          oldNational.presidentialElectionDay(year),
        );
        expect(national.electorMeetingDay(year)).toEqual(
          oldNational.electorMeetingDay(year),
        );
        for (const month of [2, 6, 11])
          for (const nth of [-2, -1, 1, 3, 5]) {
            const r = {
              kind: "nth-weekday",
              month,
              weekday: 2,
              nth,
              offsetDays: -1,
            } as const;
            expect(dateFromElectionRule(r, year)).toEqual(
              oldDates.dateFromElectionRule(r, year),
            );
          }
        for (const r of [
          {
            kind: "weekday-after",
            month: 11,
            anchorWeekday: 1,
            anchorNth: 1,
            weekday: 2,
          },
          { kind: "days-before-general", days: 56 },
          { kind: "days-after-primary", days: 28 },
        ] as const) {
          for (const anchors of [
            {},
            {
              generalDay: makeIsoDate(`${year}-11-03`),
              primaryDay: makeIsoDate(`${year}-06-01`),
            },
          ])
            expect(dateFromElectionRule(r, year, anchors)).toEqual(
              oldDates.dateFromElectionRule(r, year, anchors),
            );
        }
      }
    });
    it(`${place}: recorded municipal rule plus every counting method, ties and exhausted ballots`, () => {
      const ids = ["a", "b", "c", "d"].map((x) => `${place}:${x}`);
      for (const resolved of [
        oldBallots.resolveMunicipalBallotRule(place, `town:${place}`),
        ...[
          "pure-plurality",
          "majority-50-plus-1",
          "top-two-primary-runoff",
          "ranked-choice-instant-runoff",
        ].map((rule) => ({
          rule: rule as oldBallots.ResolvedMunicipalBallotRule["rule"],
          majorityTriggerPercent: 50,
        })),
      ]) {
        for (const counts of [
          [0, 0, 0, 0],
          [50, 25, 25, 0],
          [49, 30, 10, 11],
          [40, 40, 10, 10],
          [1, 1, 1, 1],
        ]) {
          const ballots = ids.map((id, i) => ({
            ranking: [id, ids[(i + 1) % 4]!],
            count: counts[i]!,
          }));
          ballots.push({ ranking: ["outside"], count: 7 });
          const input = { ...resolved, candidateIds: ids, ballots };
          expect(tabulateBallot(input)).toEqual(
            oldBallots.tabulateBallot(input),
          );
        }
      }
    });
    it(`${place}: Senate appointment timing matches law/null and comparator corpus`, () => {
      const rows = oldVacancy.senateVacancyLawRows();
      const law = oldVacancy.senateVacancyLaw(place);
      expect(senateAppointmentTiming(law, rows)).toEqual(
        oldVacancy.senateAppointmentTiming(law),
      );
      if (law)
        expect(
          senateAppointmentTiming(
            { ...law, appointmentDeadlineDays: null },
            rows,
          ),
        ).toEqual(
          oldVacancy.senateAppointmentTiming({
            ...law,
            appointmentDeadlineDays: null,
          }),
        );
    });
    it(`${place}: executive limits count dated, partial and discontinuous service identically`, () => {
      for (const starts of [
        [],
        ["2022-01-01"],
        ["2018-01-01", "2022-01-01"],
        ["2000-01-01", "2022-01-01"],
        ["2026-10-10"],
      ]) {
        const world = worldForTerms(place, starts);
        const limit = oldTerms.executiveTermLimitInWorld(world, place, on);
        const old = oldTerms.checkExecutiveTermLimit(world, {
          stateUsps: place,
          personId: world.id,
          termStartsAt: on,
        });
        const terms = limit
          ? datedTermsInOffice(world, world.id, limit.officeKey)
          : [];
        const result = checkExecutiveTermLimit(limit, terms, {
          stateUsps: place,
          termStartsAt: on,
        });
        expect(
          result && { ...result, barredReason: result.barredReason !== null },
        ).toEqual(old && { ...old, barredReason: old.barredReason !== null });
      }
    });
    it(`${place}: primary and runoff qualification decisions match legacy event rows`, () => {
      const compiled = nominationPlan(base, {
        stateUsps: place,
        family: "us-house",
        year: 2026,
        onDate: makeIsoDate("2025-07-01"),
        generalDay: makeIsoDate("2026-11-03"),
      });
      const selected = compiled.known ? compiled : syntheticPlan(place);
      const candidates = [0, 1, 2, 3].map((i) => ({
        personId: createStableId("person", `${place}:${i}`),
        party: i === 3 ? "B" : "A",
        incumbent: i === 0,
        partyBacked: i === 1,
      }));
      for (const method of [
        "party-primary",
        "top-two",
        "all-party-majority",
        "top-four",
      ] as const) {
        for (const thresholdPercent of [35, 50, 75]) {
          const plan = {
            ...selected,
            method,
            primaryDate: makeIsoDate("2026-06-01"),
            runoff: {
              thresholdPercent,
              outright: "at-least" as const,
              onRequest: false,
              minimumCandidates: null,
              date: makeIsoDate("2026-07-01"),
            },
            advance: method === "top-four" ? 4 : 2,
          };
          const { input, event } = primaryOracle(place, plan, candidates);
          const result = holdNominationPrimary({
            ...input,
            runoffRequested: () => false,
          });
          expect(
            result.rows
              .map((row) => ({
                personId: row.tally.entrant.personId,
                detail: `${row.tally.entrant.party}|${row.tally.permille}|${row.status}`,
              }))
              .sort((a, b) => a.personId.localeCompare(b.personId)),
          ).toEqual(
            event.participants.map(({ personId, detail }) => ({
              personId,
              detail,
            })),
          );
          expect(result.runoffParties).toEqual(
            event.tags
              .filter((t) => t.startsWith("runoff-party:"))
              .map((t) => t.slice(13)),
          );
          expect(result.runoffDate).toEqual(
            event.tags.find((t) => t.startsWith("runoff-date:"))?.slice(12) ??
              null,
          );
        }
      }
    });
  }
  it("retains ballot validation failures", () => {
    for (const input of [
      { candidateIds: [], ballots: [] },
      { candidateIds: ["a", "a"], ballots: [] },
      { candidateIds: ["a"], ballots: [{ ranking: ["a"], count: -1 }] },
    ]) {
      const facts = {
        ...input,
        rule: "pure-plurality" as const,
        majorityTriggerPercent: null,
      };
      expect(() => tabulateBallot(facts)).toThrow();
      expect(() => oldBallots.tabulateBallot(facts)).toThrow();
    }
  });
});

// Signature certification uses the same shared citizen-petition counter for recalls.
import * as oldPetitions from "../../simulation/recall";
import { petitionSignerEligibility } from "../../simulation/petition-signers";
import { isEligibleVoterIn } from "../../simulation/issue-record";
import { createLightweightPerson } from "../../simulation/people";
import { stateJurisdictionForKey } from "../../simulation/life-places";
import { recordedPetitionSignatures } from "./petition-signatures";
import { countNominationRunoff } from "./primary";
import type { DecisionTraceRecord } from "../../simulation/types";
describe("Recall signature certification and nomination runoff", () => {
  for (const place of places) {
    it(`${place}: records, duplicates, reviews and historical cutoffs match`, () => {
      const state = stateJurisdictionForKey(`US-${place}`)!;
      const people = [0, 1].map((index) =>
        createLightweightPerson({
          worldId: base.id,
          worldSeed: "rules2-petitions",
          index,
          currentDate: makeIsoDate("2020-01-01"),
          homeJurisdictionId: state.id,
        }),
      );
      const world = createWorld({
        seed: "rules2-election-golden",
        currentDate: on,
        people,
        jurisdictions: [state],
      });
      const petition = {
        stableKey: `petition:${place}`,
        kind: "local-initiative",
        jurisdictionId: state.id,
        closesAt: makeIsoDate("2026-10-10"),
        rule: { stateUsps: place },
      } as unknown as oldPetitions.CitizenPetition;
      const event = (
        id: string,
        type: string,
        sequence: number,
        tags: readonly string[],
        participants: HistoricalEvent["participants"],
        occurredAt = makeIsoDate("2026-10-09"),
      ) =>
        ({
          id: createStableId("event", id),
          type,
          sequence,
          tags: [`petition:${petition.stableKey}`, ...tags],
          participants,
          occurredAt,
          recordedAt: on,
          context: { motivation: "Recorded invalid" },
        }) as unknown as HistoricalEvent;
      const ask = event(
        "ask",
        oldPetitions.PETITION_ASKED,
        1,
        [],
        [{ personId: people[0]!.id, role: "focus:requested", detail: null }],
      );
      const trace = {
        id: createStableId("event", "signed"),
        sequence: 2,
        context: {
          actorPersonId: people[0]!.id,
          subject: { key: petition.stableKey },
        },
        selectedOptionKey: "sign",
      } as unknown as DecisionTraceRecord;
      const signed = event(
        "signed",
        oldPetitions.PETITION_SIGNED,
        3,
        [`ask:${ask.id}`, `signer-decision:${trace.id}`],
        [{ personId: people[0]!.id, role: "focus:signer", detail: null }],
      );
      const events = [
        ask,
        signed,
        event(
          "duplicate",
          oldPetitions.PETITION_SIGNED,
          4,
          signed.tags,
          signed.participants,
        ),
        event("missing-signer", oldPetitions.PETITION_SIGNED, 5, [], []),
        event(
          "late",
          oldPetitions.PETITION_SIGNED,
          6,
          signed.tags,
          signed.participants,
          on,
        ),
      ];
      for (const extra of [
        [],
        [
          event(
            "review",
            oldPetitions.PETITION_SIGNATURE_REVIEWED,
            7,
            [`signature:${signed.id}`, "validity:invalid"],
            [],
            on,
          ),
        ],
      ]) {
        const w = {
          ...world,
          history: {
            ...world.history,
            events: [...events, ...extra],
            decisionTraces: [trace],
            nextSequence: 8,
          },
        };
        const facts = {
          petition,
          events: w.history.events,
          decisionTraces: w.history.decisionTraces,
          currentDate: on,
          nextSequence: 8,
          eligibility: (id: string, date: string) =>
            petitionSignerEligibility(w, {
              stateUsps: place,
              jurisdictionId: state.id,
              signerPersonId: id as World["id"],
              on: makeIsoDate(date),
            }),
          registeredVoters: (date: string) =>
            w.personOrder.filter((id) =>
              isEligibleVoterIn(w, id, state.id, makeIsoDate(date)),
            ).length,
        };
        const actual = recordedPetitionSignatures(facts),
          old = oldPetitions.recordedPetitionSignatures(w, petition);
        expect({
          ...actual,
          invalid: actual.invalid.map(({ eventId }) => eventId),
        }).toEqual({
          ...old,
          invalid: old.invalid.map(({ eventId }) => eventId),
        });
        expect(actual.invalid.some((x) => x.reason === "missing-signer")).toBe(
          true,
        );
        // Only a prior valid record reserves the signer; invalidating that
        // record lets the later signed record count, exactly as in legacy.
        expect(actual.valid).toHaveLength(1);
        expect(actual.valid[0]!.eventId).toBe(
          extra.length ? events[2]!.id : signed.id,
        );
      }
    });
    it(`${place}: runoffs use recorded primary shares and exclude deceased finalists`, () => {
      const compiled = nominationPlan(base, {
        stateUsps: place,
        family: "us-house",
        year: 2026,
        onDate: makeIsoDate("2025-07-01"),
      });
      const selected = compiled.known ? compiled : syntheticPlan(place);
      const entrants = [0, 1].map((i) => ({
        personId: createStableId("person", `${place}:${i}`),
        party: "A",
        incumbent: i === 0,
        partyBacked: false,
      }));
      const plan = {
        ...selected,
        method: "party-primary" as const,
        primaryDate: makeIsoDate("2026-06-01"),
        runoff: {
          thresholdPercent: 75,
          outright: "more-than" as const,
          onRequest: false,
          minimumCandidates: null,
          date: makeIsoDate("2026-07-01"),
        },
      };
      const {
        input,
        event,
        result: world,
      } = primaryOracle(place, plan, entrants);
      for (const deaths of [
        [],
        [
          {
            personId: entrants[0]!.personId,
            diedAt: makeIsoDate("2026-07-01"),
          },
        ],
      ]) {
        const w = {
          ...world,
          history: { ...world.history, personDeaths: deaths },
        } as unknown as World;
        const counted = countNominationRunoff(
          event,
          (id) => !deaths.some((d) => d.personId === id),
        );
        const old = oldPrimary
          .holdNominationRunoff(w, input)
          .history.events.find(
            (e) => e.stableKey === `${input.stableKey}:runoff`,
          )!;
        expect(
          [...counted.rows].sort((a, b) =>
            a.personId.localeCompare(b.personId),
          ),
        ).toEqual(
          old.participants.map(({ personId, detail }) => ({
            personId,
            detail,
          })),
        );
      }
    });
  }
});

/** A supplied hypothetical plan exercises the counter where legacy returns no primary stage (e.g. general-day primaries). No legal coverage is asserted for this fixture. */
function syntheticPlan(
  stateUsps: string,
): oldPrimary.HoldNominationInput["plan"] {
  return {
    known: true,
    stateUsps,
    family: "us-house",
    year: 2026,
    method: "party-primary",
    primaryDate: makeIsoDate("2026-06-01"),
    dateBasis: "estimated-from-average",
    estimated: [],
    runoff: null,
    advance: 1,
    filingDeadline: makeIsoDate("2026-04-01"),
    filingBasis: "estimated-from-average",
  };
}
