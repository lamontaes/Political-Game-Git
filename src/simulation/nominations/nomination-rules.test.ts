import { describe, expect, it } from "vitest";

import nominationRules from "../../../data/research/elections/party-nomination-rules-2026.json" with { type: "json" };
import {
  assertAmendableRuleValue,
  describeRuleChangeValue,
} from "../enacted-rule-changes";
import { makeIsoDate } from "../dates";
import { createStableId } from "../ids";
import { createLightweightPerson } from "../people";
import type { EntityId, HistoricalEvent, World } from "../types";
import { createWorld, createWorldId } from "../world";
import { dateFromElectionRule, type ElectionDateRule } from "./date-rules";
import { generalElectionDay, nominationPlan } from "./nomination-rules";
import {
  holdNominationPrimary,
  holdNominationRunoff,
  nominationNominees,
  nominationPrimaryRecord,
  type NominationEntrant,
} from "./party-nominations";

const places = (
  nominationRules as unknown as {
    places: Record<
      string,
      {
        primary: {
          rule: ElectionDateRule | null;
          dates2026: Record<string, string>;
        };
        runoff: unknown;
      }
    >;
  }
).places;

const createMinimalWorld = () =>
  createWorld({
    seed: "nomination rules",
    currentDate: makeIsoDate("2026-01-05"),
    people: [],
    jurisdictions: [
      {
        id: createStableId("jurisdiction", "US-TX"),
        slug: "texas",
        name: "Texas",
        kind: "state",
        parentName: null,
        provenance: {
          asOf: makeIsoDate("2026-01-05"),
          source: "Authored identity fixture",
          jurisdiction: createStableId("jurisdiction", "US-TX"),
          status: "placeholder",
        },
      },
    ],
  });

describe("party nomination rules, 2026", () => {
  it("covers 50 states, D.C. and five territories", () => {
    expect(Object.keys(places)).toHaveLength(56);
  });

  it("reproduces every 2026 date its standing rule is read to give", () => {
    // Virginia, Massachusetts and Rhode Island moved 2026 alone by a one-year
    // law; their standing rule gives the ordinary date instead.
    const oneYearLaws: Record<string, string> = {
      "US-VA": "2026-06-16",
      "US-MA": "2026-09-15",
      "US-RI": "2026-09-08",
    };
    const general = generalElectionDay(2026);
    expect(general).toBe("2026-11-03");
    for (const [key, row] of Object.entries(places)) {
      if (!row.primary.rule) continue;
      const fromRule = dateFromElectionRule(row.primary.rule, 2026, {
        generalDay: general,
      });
      expect(fromRule, key).toBe(oneYearLaws[key] ?? row.primary.dates2026.all);
    }
  });

  it("gives Texas a March 3 primary and a May 26 runoff in 2026, and a rule-made date in 2028", () => {
    const world = createMinimalWorld();
    const texas = nominationPlan(world, {
      stateUsps: "TX",
      family: "us-house",
      year: 2026,
      onDate: "2026-01-06" as IsoDate,
    });
    expect(texas).toMatchObject({
      known: true,
      method: "party-primary",
      primaryDate: "2026-03-03",
      dateBasis: "set-for-2026",
      runoff: { thresholdPercent: 50, date: "2026-05-26" },
      // The FEC's 2026 table: Texas candidates filed by December 8, 2025.
      filingDeadline: "2025-12-08",
      filingBasis: "set-for-2026",
    });
    const later = nominationPlan(world, {
      stateUsps: "TX",
      family: "us-house",
      year: 2028,
      onDate: "2028-01-06" as IsoDate,
    });
    expect(later).toMatchObject({
      known: true,
      primaryDate: "2028-03-07",
      dateBasis: "standing-rule",
      runoff: { date: "2028-05-23" },
      // Texas's 2026 gap, 85 days before the primary, estimated forward.
      filingDeadline: "2027-12-13",
      filingBasis: "estimated-from-average",
    });
  });

  it("sends the top two on in California and runs North Carolina's runoff only on request", () => {
    const world = createMinimalWorld();
    expect(
      nominationPlan(world, {
        stateUsps: "CA",
        family: "us-house",
        year: 2028,
        onDate: "2028-01-06" as IsoDate,
      }),
    ).toMatchObject({
      known: true,
      method: "top-two",
      advance: 2,
      // Presidential years move California's primary to March.
      primaryDate: "2028-03-07",
      runoff: null,
    });
    expect(
      nominationPlan(world, {
        stateUsps: "NC",
        family: "us-senate",
        year: 2026,
        onDate: "2026-01-06" as IsoDate,
      }),
    ).toMatchObject({
      runoff: { thresholdPercent: 30, onRequest: true, date: "2026-05-12" },
    });
  });

  it("estimates an unread rule from the closest real one, and says so", () => {
    const world = createMinimalWorld();
    const plan = (
      stateUsps: string,
      family: "us-house" | "us-senate",
      year: number,
    ) =>
      nominationPlan(world, {
        stateUsps,
        family,
        year,
        onDate: `${year}-01-06` as IsoDate,
      });
    // Louisiana's 2026 U.S. House primary falls on the general election day,
    // so the seat keeps its November-only path.
    expect(plan("LA", "us-house", 2026).known).toBe(false);
    // Louisiana's standing rule is unread: its 2026 Senate primary was the
    // third Saturday in May, and its runoff six weeks later, so 2028 keeps
    // that pattern (May 20, then July 1).
    expect(plan("LA", "us-senate", 2028)).toMatchObject({
      known: true,
      primaryDate: "2028-05-20",
      dateBasis: "estimated-from-average",
      estimated: ["primary-date", "runoff"],
      runoff: { thresholdPercent: 50, date: "2028-07-01" },
    });
    // Ohio's presidential-year rule, read: the third Tuesday after the first
    // Monday in March.
    expect(plan("OH", "us-house", 2028)).toMatchObject({
      known: true,
      primaryDate: "2028-03-21",
      dateBasis: "standing-rule",
      estimated: [],
    });
    // Mississippi's rule covers Congress only, so its legislature's odd-year
    // primary uses the same rule, estimated.
    expect(
      nominationPlan(world, {
        stateUsps: "MS",
        family: "state-legislature",
        year: 2027,
        onDate: "2027-01-06" as IsoDate,
      }),
    ).toMatchObject({
      known: true,
      dateBasis: "estimated-from-average",
    });
    // Nothing about American Samoa is read: the method most places use, the
    // date rule most places share (the Tuesday after the first Monday in
    // June), and no runoff, the rule most places have.
    expect(plan("AS", "us-house", 2026)).toMatchObject({
      known: true,
      method: "party-primary",
      primaryDate: "2026-06-02",
      estimated: ["method", "primary-date", "runoff"],
      runoff: null,
      // No 2026 row: the median gap, 85 days before the primary.
      filingDeadline: "2026-03-09",
      filingBasis: "estimated-from-average",
    });
    // Virginia's Senate candidates filed earlier than its House candidates.
    expect(plan("VA", "us-senate", 2026)).toMatchObject({
      filingDeadline: "2026-04-02",
    });
    expect(plan("VA", "us-house", 2026)).toMatchObject({
      filingDeadline: "2026-05-26",
    });
    // A read rule carries no estimate.
    expect(plan("TX", "us-house", 2026)).toMatchObject({ estimated: [] });
  });

  it("accepts a date rule and a method as law", () => {
    const rule = {
      kind: "nth-weekday",
      month: 5,
      weekday: 2,
      nth: 1,
    } as const;
    expect(() =>
      assertAmendableRuleValue(
        "nomination.primary.dateRule",
        rule,
        "us-ga-election-law",
      ),
    ).not.toThrow();
    expect(describeRuleChangeValue(rule, "nomination.primary.dateRule")).toBe(
      "the first Tuesday in May",
    );
    expect(() =>
      assertAmendableRuleValue(
        "nomination.primary.dateRule",
        { kind: "nth-weekday", month: 13, weekday: 2, nth: 1 },
        "us-ga-election-law",
      ),
    ).toThrow();
    expect(() =>
      assertAmendableRuleValue(
        "nomination.method",
        "top-two",
        "us-ga-election-law",
      ),
    ).not.toThrow();
  });
});

describe("A114: a primary is decided by the entrants' records, not a draw", () => {
  const texas = createStableId("jurisdiction", "US-TX");
  // One world holds the same four people every time; only its seed, the
  // input the old campaign draw read, differs between runs.
  const worldId = createWorldId("a114-entrants");
  const people = [0, 1, 2, 3].map((index) =>
    createLightweightPerson({
      worldId,
      worldSeed: "a114-entrants",
      index,
      currentDate: makeIsoDate("2026-01-05"),
      homeJurisdictionId: texas,
    }),
  );
  const entrantsWorld = createWorld({
    seed: "a114-entrants",
    currentDate: makeIsoDate("2026-05-26"),
    people,
    jurisdictions: Object.values(createMinimalWorld().jurisdictions),
  });
  const [first, second, third, fourth] = people.map((person) => person.id) as [
    EntityId,
    EntityId,
    EntityId,
    EntityId,
  ];
  const entrant = (
    personId: EntityId,
    party: string,
    standing: "incumbent" | "recruit" | "self-starter",
  ): NominationEntrant => ({
    personId,
    party,
    incumbent: standing === "incumbent",
    partyBacked: standing === "recruit",
  });

  /** Texas's 2026 House primary on March 3, held in a world on May 26. */
  function primary(seed: string, entrants: readonly NominationEntrant[]) {
    const world: World = { ...entrantsWorld, seed };
    const plan = nominationPlan(world, {
      stateUsps: "TX",
      family: "us-house",
      year: 2026,
      onDate: makeIsoDate("2026-01-06"),
    });
    if (!plan.known) throw new Error("Texas's plan is read.");
    const input = {
      stableKey: "a114:us-house-tx-07:2026",
      seatKey: "us-house-tx-07",
      title: "Texas's 7th District",
      jurisdictionId: texas,
      involvedEntityIds: [],
    };
    const held = holdNominationPrimary(world, {
      ...input,
      plan,
      entrants,
      partyShare: () => null,
    });
    return {
      world: holdNominationRunoff(held, input),
      record: nominationPrimaryRecord(held, input.stableKey)!,
      stableKey: input.stableKey,
    };
  }

  /** Each entrant's recorded result, as "party|share per mille|status". */
  const results = (event: HistoricalEvent | undefined) =>
    Object.fromEntries(
      (event?.participants ?? []).map((row) => [row.personId, row.detail]),
    );
  const runoffOf = (world: World, stableKey: string) =>
    world.history.events.find(
      (event) => event.stableKey === `${stableKey}:runoff`,
    );

  it("nominates the same person with the same shares under two seeds", () => {
    const field = [
      entrant(first, "republican", "incumbent"),
      entrant(second, "republican", "self-starter"),
      entrant(third, "democratic", "recruit"),
      entrant(fourth, "democratic", "self-starter"),
    ];
    const one = primary("a114-first-seed", field);
    const two = primary("a114-second-seed", field);
    // A sitting member 1.5 to 1; a party recruit 1.25 to 1.
    expect(results(one.record)).toEqual({
      [first]: "republican|600|nominated",
      [second]: "republican|400|lost",
      [third]: "democratic|556|nominated",
      [fourth]: "democratic|444|lost",
    });
    expect(results(two.record)).toEqual(results(one.record));
    expect(nominationNominees(two.world, two.stableKey)).toEqual(
      nominationNominees(one.world, one.stableKey),
    );
  });

  it("decides a runoff by each finalist's recorded share of the primary vote", () => {
    const { world, record, stableKey } = primary("a114-runoff", [
      entrant(first, "republican", "incumbent"),
      entrant(second, "republican", "recruit"),
      entrant(third, "republican", "self-starter"),
    ]);
    // Nobody reached half of the vote, so the top two meet again.
    expect(results(record)).toEqual({
      [first]: "republican|400|runoff",
      [second]: "republican|333|runoff",
      [third]: "republican|267|lost",
    });
    // 400 to 333 in the primary is 546 to 454 between the two.
    expect(results(runoffOf(world, stableKey))).toEqual({
      [first]: "republican|546|nominated",
      [second]: "republican|454|lost",
    });
    expect(nominationNominees(world, stableKey)).toEqual([
      { personId: first, party: "republican" },
    ]);
  });

  it("records an exact tie as tied and nominates nobody, not a coin toss", () => {
    const { world, record, stableKey } = primary("a114-tie", [
      entrant(first, "republican", "incumbent"),
      entrant(second, "democratic", "self-starter"),
      entrant(third, "democratic", "self-starter"),
    ]);
    // Texas sends a tied primary to its runoff, where the two tie again.
    expect(results(record)).toEqual({
      [first]: "republican|1000|unopposed",
      [second]: "democratic|500|runoff",
      [third]: "democratic|500|runoff",
    });
    const runoff = runoffOf(world, stableKey);
    expect(results(runoff)).toEqual({
      [second]: "democratic|500|tied",
      [third]: "democratic|500|tied",
    });
    expect(runoff?.summary).toContain("ended in a tie");
    expect(nominationNominees(world, stableKey)).toEqual([
      { personId: first, party: "republican" },
    ]);
  });
});
