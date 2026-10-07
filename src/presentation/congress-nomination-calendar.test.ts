import { describe, expect, it } from "vitest";
import rules from "../../data/research/elections/party-nomination-rules-2026.json" with { type: "json" };
import { drawRandomPlace } from "../../tests/support/random-place";
import { stateJurisdictionForKey } from "../simulation/life-places";
import { createLightweightPerson } from "../simulation/people";
import { makeIsoDate } from "../simulation/dates";
import { congressSeats } from "../simulation/living-world/congress-seats";
import { createWorld, createWorldId } from "../simulation/world";
import {
  generalElectionDay,
  nominationPlan,
  type NominationPlan,
} from "../simulation/nominations/nomination-rules";
import {
  holdNominationPrimary,
  holdNominationRunoff,
  nominationPrimaryRecord,
  NOMINATION_RUNOFF_EVENT,
} from "../simulation/nominations/party-nominations";
import type { HistoricalEvent } from "../simulation/types";

type Plan = Extract<NominationPlan, { known: true }>;
const calendar = createWorld({
  seed: "overflow8-calendar-data",
  currentDate: makeIsoDate("2026-01-05"),
  people: [],
  jurisdictions: [
    stateJurisdictionForKey(
      drawRandomPlace("overflow8-calendar-place").stateJurisdictionKey!,
    )!,
  ],
});
const planOf = (stateUsps: string) =>
  nominationPlan(calendar, {
    stateUsps,
    family: "us-house",
    year: 2026,
    onDate: calendar.currentDate,
  });
const places = rules.places as unknown as Record<
  string,
  {
    primary: { dates2026: Record<string, string | null> };
    filing?: { deadlines2026: Record<string, string | null> };
  }
>;

it("checks dated primary and filing rows for all 56 places without advancing the world", () => {
  expect(Object.keys(places)).toHaveLength(56);
  // Preserve the former sweep's sourced 38-seat cardinality fact as data.
  expect(
    congressSeats().filter(
      (seat) => seat.stateUsps === "TX" && seat.chamberKey === "us-house",
    ),
  ).toHaveLength(38);
  for (const [key, row] of Object.entries(places)) {
    for (const family of ["us-house", "us-senate"] as const) {
      const date = row.primary.dates2026[family] ?? row.primary.dates2026.all;
      const plan = nominationPlan(calendar, {
        stateUsps: key.slice(3),
        family,
        year: 2026,
        onDate: calendar.currentDate,
      });
      if (date && date >= generalElectionDay(2026)) {
        expect(
          plan.known,
          `${key}/${family}: general-day primary is not modeled`,
        ).toBe(false);
        continue;
      }
      expect(plan.known, `${key}/${family}`).toBe(true);
      if (!plan.known) throw new Error(`${key}/${family} lacks a dated plan`);
      expect(plan.primaryDate).toMatch(/^2026-\d{2}-\d{2}$/);
      if (date) expect(plan.primaryDate, `${key}/${family}`).toBe(date);
      const filing =
        row.filing?.deadlines2026[family] ?? row.filing?.deadlines2026.all;
      if (filing) {
        expect(plan.filingDeadline, `${key}/${family}`).toBe(filing);
        expect(plan.filingBasis).toBe("set-for-2026");
      }
      expect(plan.filingDeadline < plan.primaryDate).toBe(true);
      if (plan.runoff?.date)
        expect(plan.runoff.date > plan.primaryDate).toBe(true);
    }
  }
});

function field(seed: string, fits: (plan: Plan) => boolean, shared = false) {
  const place = drawRandomPlace(seed, (candidate) => {
    const plan = planOf(candidate.stateJurisdictionKey!.slice(3));
    return plan.known && fits(plan);
  });
  const state = stateJurisdictionForKey(place.stateJurisdictionKey!)!;
  const plan = planOf(place.stateJurisdictionKey!.slice(3));
  if (!plan.known) throw new Error("The selected field has no primary.");
  const worldId = createWorldId("a114-entrants");
  const people = [0, 1, 2, 3].map((index) =>
    createLightweightPerson({
      worldId,
      worldSeed: "a114-entrants",
      index,
      currentDate: makeIsoDate("2026-01-05"),
      homeJurisdictionId: state.id,
    }),
  );
  const world = createWorld({
    seed: "a114-entrants",
    currentDate: makeIsoDate("2026-12-31"),
    people,
    jurisdictions: [state],
  });
  const input = {
    stableKey: `${seed}:field`,
    seatKey: `${state.id}:house`,
    title: `${place.displayName} nomination fixture`,
    jurisdictionId: state.id,
    involvedEntityIds: [],
    plan,
    entrants: people.slice(0, shared ? 4 : 3).map((person, index) => ({
      personId: person.id,
      party: shared && index % 2 ? "democratic" : "republican",
      incumbent: index === 0,
      partyBacked: index === 1,
    })),
    partyShare: () => null,
  };
  const primaryWorld = holdNominationPrimary(world, input);
  const primary = nominationPrimaryRecord(primaryWorld, input.stableKey)!;
  return {
    place,
    plan,
    primary,
    input,
    world: holdNominationRunoff(primaryWorld, input),
  };
}
const shares = (event: HistoricalEvent) =>
  event.participants.map((row) => Number(row.detail!.split("|")[1]));

const partySeed = "overflow8-party-accounting";
const sharedSeed = "overflow8-shared-accounting";
const runoffSeed = "overflow8-runoff-calendar";

describe("bounded nomination writer fixtures preserve the nationwide sweep's branch assertions", () => {
  it(`requires a contested party primary and its 1000-per-mille total, seed ${partySeed}`, () => {
    const { primary, plan } = field(
      partySeed,
      (plan) => plan.method === "party-primary" && plan.runoff === null,
    );
    expect(plan.method).toBe("party-primary");
    expect(primary.participants).toHaveLength(3);
    expect(
      Math.abs(shares(primary).reduce((sum, value) => sum + value, 0) - 1000),
    ).toBeLessThanOrEqual(2);
  });
  it(`requires a top-two shared primary with at most two advancing and one 1000 total, seed ${sharedSeed}`, () => {
    const { primary, plan } = field(
      sharedSeed,
      (plan) => plan.method === "top-two",
      true,
    );
    expect(plan.method).toBe("top-two");
    expect(primary.participants).toHaveLength(4);
    expect(
      primary.participants.filter((row) =>
        /\|(advanced|unopposed)$/.test(row.detail ?? ""),
      ).length,
    ).toBeLessThanOrEqual(2);
    expect(
      Math.abs(shares(primary).reduce((sum, value) => sum + value, 0) - 1000),
    ).toBeLessThanOrEqual(3);
  });
  it(`requires an actual runoff on its recorded later date, seed ${runoffSeed}`, () => {
    const { primary, plan, world } = field(
      runoffSeed,
      (plan) =>
        plan.method === "party-primary" &&
        plan.runoff !== null &&
        plan.runoff.date !== null &&
        !plan.runoff.onRequest &&
        (plan.runoff.minimumCandidates ?? 0) <= 3 &&
        plan.runoff.thresholdPercent > 40,
    );
    const runoff = world.history.events.find(
      (event) => event.type === NOMINATION_RUNOFF_EVENT,
    );
    expect(runoff).toBeDefined();
    expect(runoff!.occurredAt).toBe(plan.runoff!.date);
    expect(runoff!.occurredAt > primary.occurredAt).toBe(true);
  });
});
