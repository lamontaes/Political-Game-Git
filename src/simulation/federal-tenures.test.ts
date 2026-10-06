import { performance } from "node:perf_hooks";
import { beforeAll, describe, expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { drawRandomPlace } from "../../tests/support/random-place";
import { makeIsoDate } from "./dates";
import {
  currentFederalTenure,
  FEDERAL_TENURE_EVENT,
  FEDERAL_VACANCY_EVENT,
  latestFederalOfficeRecord,
  type FederalTenureOfficeKey,
} from "./federal-tenures";
import { appendedList, withHistoryAppendTransaction } from "./history-index";
import { deserializeWorld, serializeWorld } from "./serialization";
import type { HistoricalEvent, IsoDate, World } from "./types";
import { recordPersonDeath } from "./vitality";
import { recordWorldEvent } from "./world";

// Preserve the original reader as an independent comparison oracle.
function originalRead(
  world: World,
  officeKey: FederalTenureOfficeKey,
  asOf: IsoDate,
): HistoricalEvent | null {
  let latest: HistoricalEvent | null = null;
  for (const event of world.history.events) {
    if (
      (event.type !== FEDERAL_TENURE_EVENT &&
        event.type !== FEDERAL_VACANCY_EVENT) ||
      !event.tags.includes(`office:${officeKey}`) ||
      event.occurredAt > asOf
    )
      continue;
    if (
      !latest ||
      event.occurredAt > latest.occurredAt ||
      (event.occurredAt === latest.occurredAt &&
        event.sequence > latest.sequence)
    )
      latest = event;
  }
  return latest;
}

const offices: readonly FederalTenureOfficeKey[] = [
  "us-president",
  "us-vice-president",
  "us-chief-justice",
];
const seed = "session13-federal-tenure-index";
const place = drawRandomPlace(seed);
let generated: World;

function appendOffice(
  world: World,
  key: string,
  date: string,
  type: typeof FEDERAL_TENURE_EVENT | typeof FEDERAL_VACANCY_EVENT,
  office: FederalTenureOfficeKey = "us-president",
): World {
  const personId = Object.values(world.people)[0]!.id;
  return recordWorldEvent(world, {
    stableKey: `tenure-index-fixture:${key}`,
    type,
    occurredAt: makeIsoDate(date),
    recordedAt: world.currentDate,
    jurisdictionId: null,
    involvedEntityIds: [personId],
    participants:
      type === FEDERAL_TENURE_EVENT
        ? [{ personId, role: "focus:subject", detail: null }]
        : [],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      `office:${office}`,
      "provenance:authored-fixture",
      "term-end:2032-02-01",
    ],
    summary: "Authored tenure reader regression record.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
}

function compare(world: World, dates: readonly string[]): void {
  for (const date of dates) {
    for (const office of offices) {
      expect(latestFederalOfficeRecord(world, office, makeIsoDate(date))).toBe(
        originalRead(world, office, makeIsoDate(date)),
      );
    }
  }
}

describe("federal tenure reads follow recorded history", () => {
  beforeAll(() => {
    generated = smallWorld({
      place: place.key,
      date: "2032-02-01",
      seed,
      offices: ["congress"],
    }).world;
    console.info(
      `Federal reader fixture: ${place.key}; seed=${seed}; events=${generated.history.events.length}`,
    );
  });

  it("matches the original scan before, on and after generated records", () => {
    expect(
      offices.every((office) =>
        originalRead(generated, office, generated.currentDate),
      ),
    ).toBe(true);
    const dates = new Set<string>(["1900-01-01", "2032-02-01", "2040-01-01"]);
    for (const event of generated.history.events) {
      if (
        event.type === FEDERAL_TENURE_EVENT ||
        event.type === FEDERAL_VACANCY_EVENT
      )
        dates.add(event.occurredAt);
    }
    compare(generated, [...dates]);
    expect(latestFederalOfficeRecord(generated, "us-president")).toBe(
      originalRead(generated, "us-president", generated.currentDate),
    );
  });

  it("keeps date precedence, same-day sequence and earlier snapshots after appends", () => {
    compare(generated, ["2032-01-31"]);
    const vacancy = appendOffice(
      generated,
      "vacancy",
      "2032-01-31",
      FEDERAL_VACANCY_EVENT,
    );
    const filled = appendOffice(
      vacancy,
      "filled",
      "2032-01-31",
      FEDERAL_TENURE_EVENT,
    );
    const backdated = appendOffice(
      filled,
      "backdated",
      "2032-01-30",
      FEDERAL_VACANCY_EVENT,
    );
    for (const world of [
      vacancy,
      filled,
      backdated,
      generated,
      filled,
      vacancy,
    ])
      compare(world, ["2032-01-29", "2032-01-30", "2032-01-31", "2032-02-01"]);
    expect(
      latestFederalOfficeRecord(backdated, "us-president")?.stableKey,
    ).toBe("tenure-index-fixture:filled");
    expect(currentFederalTenure(vacancy, "us-president")).toBeNull();
    expect(
      currentFederalTenure(filled, "us-president", makeIsoDate("2032-01-31")),
    ).not.toBeNull();
    expect(
      currentFederalTenure(filled, "us-president", makeIsoDate("2032-02-01")),
    ).toBeNull();
  });

  it("rebuilds divergent histories and follows transaction appends", () => {
    const branchA = appendOffice(
      generated,
      "branch-a",
      "2032-01-31",
      FEDERAL_VACANCY_EVENT,
    );
    compare(branchA, ["2032-01-31"]);
    const branchB = appendOffice(
      generated,
      "branch-b",
      "2032-01-31",
      FEDERAL_TENURE_EVENT,
    );
    compare(branchB, ["2032-01-31"]);
    const transaction = withHistoryAppendTransaction(
      branchB,
      ["events"],
      (world) => {
        const first = appendOffice(
          world,
          "transaction-1",
          "2032-01-31",
          FEDERAL_VACANCY_EVENT,
        );
        compare(first, ["2032-01-31"]);
        return appendOffice(
          first,
          "transaction-2",
          "2032-01-31",
          FEDERAL_TENURE_EVENT,
        );
      },
    );
    for (const world of [transaction, branchA, branchB, generated])
      compare(world, ["2032-01-30", "2032-01-31"]);
  });

  it("preserves the first record when date and sequence are tied in saved history", () => {
    const first = appendOffice(
      generated,
      "equal",
      "2032-01-31",
      FEDERAL_TENURE_EVENT,
    );
    const event = first.history.events.at(-1)!;
    // Authored legacy-history edge: do not mutate canonical events or their IDs.
    const tied = { ...event, type: FEDERAL_VACANCY_EVENT };
    const world = {
      ...first,
      history: {
        ...first.history,
        events: appendedList(first.history.events, [tied]),
      },
    };
    expect(latestFederalOfficeRecord(world, "us-president")).toBe(event);
    compare(world, ["2032-01-30", "2032-01-31"]);
  });

  it("reads saves without an index and still honors a holder's recorded death", () => {
    const filled = appendOffice(
      generated,
      "save",
      "2032-01-31",
      FEDERAL_TENURE_EVENT,
      "us-chief-justice",
    );
    const restored = deserializeWorld(serializeWorld(filled));
    compare(restored, ["2032-01-30", "2032-01-31", "2040-01-01"]);
    const holder = currentFederalTenure(
      restored,
      "us-chief-justice",
      makeIsoDate("2032-01-31"),
    )!;
    const dead = recordPersonDeath(restored, {
      stableKey: "tenure-index-fixture:death",
      personId: holder.personId,
      diedAt: makeIsoDate("2032-02-01"),
      causeKey: "fixture:tenure-reader",
      summary: "Authored death record for tenure reader coverage.",
      sourceEntityIds: [holder.personId],
      provenance: { kind: "simulated", sourceEntityIds: [holder.personId] },
    });
    expect(
      currentFederalTenure(dead, "us-chief-justice", makeIsoDate("2032-01-31")),
    ).not.toBeNull();
    expect(currentFederalTenure(dead, "us-chief-justice")).toBeNull();
    compare(dead, ["2032-01-31", "2032-02-01"]);
  });

  it("measures repeated reads against the original scan on the same generated history", () => {
    const iterations = 30_000;
    const dates = [
      makeIsoDate("1900-01-01"),
      generated.currentDate,
      makeIsoDate("2040-01-01"),
    ];
    const measure = (read: typeof originalRead) => {
      let matches = 0;
      const started = performance.now();
      for (let at = 0; at < iterations; at += 1)
        if (
          read(
            generated,
            offices[at % offices.length]!,
            dates[at % dates.length]!,
          )
        )
          matches += 1;
      return { milliseconds: performance.now() - started, matches };
    };
    measure(latestFederalOfficeRecord);
    const original = measure(originalRead);
    const indexed = measure(latestFederalOfficeRecord);
    expect(indexed.matches).toBe(original.matches);
    process.stdout.write(
      `${JSON.stringify({
        method: "bounded repeated reader calls, not a game-year benchmark",
        place: place.displayName,
        jurisdiction: place.stateJurisdictionKey,
        seed,
        iterations,
        events: generated.history.events.length,
        original,
        indexed,
      })}\n`,
    );
  });
});
