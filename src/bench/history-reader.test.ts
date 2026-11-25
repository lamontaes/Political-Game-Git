// @vitest-environment node
// The world first, as the game loads it: the life record is reached through it.
import { buildBenchWorld } from "./world";
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { lifeOf } from "../core2/person-life";
import {
  historyEvent,
  historyOf,
  preStartHistory,
  whereOf,
  type HistoryEvent,
  type HistoryScope,
} from "../core2/past";
import type { PersonId, PlaceId } from "../core2/types";

// The one history reader (owner, Nov 25: "THE JOURNAL, DIRECTOR, PERSON
// CARDS, ETC ALL PULL FROM THE SAME HISTORY"): every scope's events are the
// world's own records, each opened by id the same way from every scope, each
// cause a record that exists, and each "led to" a record that names it as
// its cause. A drawn place, named in every message.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
setBookkeeping(false);
const place = drawPlace(seed, "history-reader");
const where = `${place.name} (${place.key}), seed ${seed}`;
process.stdout.write(`history reader: ${where}\n`);
const world = buildBenchWorld(place.seed, gameStartDate(), {
  twoLevel: true,
  placeKey: place.key,
});
const core = world.core;
const me = world.playerId as PersonId;
const player = core.people.get(me)!;
const town = player.placeId as PlaceId;
const state = whereOf({ placeId: town }).state!;
const household = core.households.get(player.householdId)!;
const employer = player.jobId
  ? core.jobs.get(player.jobId)?.organizationId
  : undefined;

const scopes: [string, HistoryScope][] = [
  ["the player", { person: me }],
  ["the household", { household: household.id }],
  ...(employer
    ? [["the employer", { employer }] as [string, HistoryScope]]
    : []),
  ["the town", { place: town }],
  ["the state", { state }],
  ["the nation", { nation: true }],
];
const told = new Map<string, HistoryEvent[]>(
  scopes.map(([name, scope]) => [name, historyOf(core, scope)]),
);
process.stdout.write(
  `history reader: ${[...told].map(([name, events]) => `${name} ${events.length} events (${events.filter((event) => event.causeIds.length).length} with a cause, ${events.filter((event) => event.ledTo.length).length} that led to more)`).join("; ")}\n`,
);

describe(`the one history reader (${where})`, () => {
  it("tells a person's life in the life record's own order", () => {
    for (const id of household.memberIds) {
      const history = historyOf(core, { person: id as PersonId });
      expect(
        history.map((event) => event.id),
        `${id} at ${where}`,
      ).toEqual(lifeOf(core, id as PersonId).map((event) => event.id));
    }
  });

  it("finds a past in every scope a world opens with", () => {
    for (const [name, events] of told)
      if (name !== "the employer")
        expect(events.length, `${name} at ${where}`).toBeGreaterThan(0);
  });

  it("opens every event by its record id, the same from every scope", () => {
    for (const [name, events] of told)
      for (const event of events) {
        // A fact a person was made with is theirs alone, not a record.
        if (event.from === "built") continue;
        const one = historyEvent(core, event.id);
        expect(one, `${name}: ${event.id} at ${where}`).toBeDefined();
        expect(
          {
            date: one!.date,
            record: one!.record,
            causeIds: one!.causeIds,
            ledTo: one!.ledTo,
          },
          `${name}: ${event.id} at ${where}`,
        ).toEqual({
          date: event.date,
          record: event.record,
          causeIds: event.causeIds,
          ledTo: event.ledTo,
        });
      }
  });

  it("gives causes that are records, and what each led to names it back", () => {
    for (const [name, events] of told)
      for (const event of events) {
        for (const cause of event.causeIds)
          expect(
            historyEvent(core, cause),
            `${name}: ${event.id} names ${cause} at ${where}`,
          ).toBeDefined();
        for (const later of event.ledTo)
          expect(
            historyEvent(core, later)?.causeIds,
            `${name}: ${event.id} led to ${later} at ${where}`,
          ).toContain(event.id);
      }
  });

  it("holds each member's life in the household's history, once", () => {
    const ids = told.get("the household")!.map((event) => event.id);
    expect(new Set(ids).size, where).toBe(ids.length);
    for (const id of household.memberIds)
      for (const event of lifeOf(core, id as PersonId))
        expect(ids, `${id}: ${event.id} at ${where}`).toContain(event.id);
  });

  it("keeps a place's, a state's and the nation's records where they happened", () => {
    for (const event of told.get("the town")!)
      expect(whereOf(event).place, `${event.id} at ${where}`).toBe(town);
    for (const event of told.get("the state")!)
      expect(whereOf(event).state, `${event.id} at ${where}`).toBe(state);
    for (const event of told.get("the nation")!)
      if (event.record !== "century.presidency")
        expect(whereOf(event).nation, `${event.id} at ${where}`).toBe(true);
  });

  it("holds every public record in the history of where it happened", () => {
    const ids = (name: string) =>
      new Set(told.get(name)!.map((event) => event.id));
    const inTown = ids("the town");
    const inState = ids("the state");
    const inNation = ids("the nation");
    const records = [
      ...preStartHistory(core).filter((row) => row.publicRecord),
      ...[...core.durableLog.values()].filter(
        (row) =>
          row.publicRecord ||
          row.news ||
          row.visibility === "public" ||
          row.visibility === "news",
      ),
    ];
    let checked = 0;
    for (const record of records) {
      const at = whereOf({
        placeId: record.placeId as PlaceId | undefined,
        facts: Object.fromEntries(
          Object.entries(record.facts ?? {}).map(([key, value]) => [
            key,
            String(value),
          ]),
        ),
      });
      const label = `${record.kind} ${record.id} at ${where}`;
      if (at.nation) expect(inNation.has(record.id), label).toBe(true);
      else if (at.place === town)
        expect(inTown.has(record.id), label).toBe(true);
      if (!at.nation && at.state === state)
        expect(inState.has(record.id), label).toBe(true);
      checked += 1;
    }
    expect(checked, where).toBeGreaterThan(0);
  });

  it("tells the century's presidencies as the nation's history", () => {
    const presidencies = historyOf(
      core,
      { nation: true },
      { kinds: ["century.presidency"] },
    );
    expect(presidencies.length, where).toBeGreaterThan(0);
    expect(presidencies[0]!.date < core.startedAt, where).toBe(true);
  });
});
