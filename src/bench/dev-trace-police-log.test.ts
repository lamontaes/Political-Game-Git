/**
 * Dev mode's Trace opens a printed police log down to why it ran (owner, Nov
 * 16: "all this stuff that you're tracing, if it's not already being traced
 * by the dev mode, it should be"). In a played Hesperia, Michigan (seed pl8,
 * the police-log test's comparison town, which reports crime most months),
 * dev mode advances 200 days through its own advance; then the newest printed
 * police log is traced on dev mode's Trace screen (`DevMode.trace`). The log
 * must show the month's reported count, how it stood against the town's usual
 * (the facts the wire carried, read by the press's own function), the share
 * of a brief's space the desk gave it, and the closed months the usual rests
 * on; the crime month must show the fraction carried in with each kind's
 * expected count, and the counted groups it happened to. Place and seed are
 * named.
 */
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { coreAPI } from "../core2/state";
import { DevMode } from "./dev-mode";
import { BenchPlayer } from "./player";
import { buildBenchWorld } from "./world";

it("Trace opens a printed police log to its usual, its space, its months and who it happened to (Hesperia, seed pl8)", () => {
  const place = drawPlace("pl8", "police-log");
  expect(place.key).toBe("2637860");
  const where = `${place.name} (${place.key}), seed pl8`;
  setBookkeeping(false);
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const { core, director, playerId } = world;
  const player = new BenchPlayer(core, director!);
  player.select(playerId!);
  const dev = new DevMode(core, director, player, world.placeId);
  const api = coreAPI(core);
  // What the wire carried for each month's log, read as the paper read it.
  const wire = new Map<string, Record<string, string>>();
  const end = addDays(makeIsoDate(core.date), 200);
  while (core.date < end) {
    dev.advance([addDays(makeIsoDate(core.date), 7), end].sort()[0]!);
    for (const row of api
      .moduleState("core2-press-v1")
      .table("wire")
      .rows() as unknown as {
      id: string;
      kind: string;
      facts: Record<string, string>;
    }[])
      if (row.kind === "crime.month") wire.set(row.id, row.facts);
  }

  const log = (
    api.moduleState("news").table("stories").rows() as unknown as {
      id: string;
      kind: string;
      facts: Record<string, unknown>;
    }[]
  )
    .filter(
      (story) =>
        story.kind === "press.printed" &&
        String(story.facts.sourceRecordId).startsWith("police-log:"),
    )
    .at(-1);
  // The newest log in these 200 days is July's, whose usual rests on five months.
  expect(log?.facts.sourceRecordId, `${where}: the newest police log`).toBe(
    "police-log:2025-07",
  );

  const node = dev.trace(log!.id);
  const reason = (key: string) =>
    node.children.find((child) => child.id === `${log!.id}#${key}`)?.value;
  expect(Number(reason("reported")), `${where}: reported`).toBeGreaterThan(0);
  // The trace shows what the wire carried, fact for fact.
  const carried = wire.get("police-log:2025-07")!;
  for (const [key, value] of Object.entries(carried))
    if (key !== "monthId")
      expect(
        reason(`usual.${key}`),
        `${where}: ${key} as the wire carried it`,
      ).toBe(value);
  expect(reason("usual.vsUsual"), `${where}: vsUsual`).toBeDefined();
  expect(
    reason("usual.monthsOfRecord"),
    `${where}: months of record`,
  ).toBeDefined();
  expect(reason("usual.chance"), `${where}: chance`).toBeDefined();
  const space = Number(reason("space"));
  expect(space, `${where}: space share`).toBeGreaterThanOrEqual(0);
  expect(space, `${where}: space share`).toBeLessThanOrEqual(1);
  const months = node.children.filter(
    (child) => child.via === "core2-press-v1.usualMonth",
  );
  expect(months.length, `${where}: the closed months the usual rests on`).toBe(
    Number(reason("usual.monthsOfRecord")),
  );
  for (const month of months)
    expect(dev.trace(month.id).engine, `${where}: ${month.id}`).toBe(
      "core2-crime-v1.months",
    );

  // The crime month itself: why that many, and who it happened to.
  const monthId = String(log!.facts.monthId);
  const crime = dev.trace(monthId);
  expect(crime.engine).toBe("core2-crime-v1.months");
  const types = (
    crime.record as { types: Record<string, Record<string, number>> }
  ).types;
  for (const [type, row] of Object.entries(types)) {
    expect(
      row.carriedIn,
      `${where}: ${monthId} ${type} carriedIn`,
    ).toBeGreaterThanOrEqual(0);
    expect(
      row.carriedIn,
      `${where}: ${monthId} ${type} carriedIn`,
    ).toBeLessThan(1);
    // How many happened is the expected count with the carried fraction, rounded down.
    expect(row.count, `${where}: ${monthId} ${type} count`).toBe(
      Math.floor(row.carriedIn + row.expected),
    );
  }
  const counted = Object.values(types).reduce(
    (sum, row) => sum + row.countedCount,
    0,
  );
  const tallies = crime.children.filter(
    (child) => child.via === "core2-crime-v1.tallies",
  );
  if (counted > 0)
    expect(
      tallies.length,
      `${where}: ${monthId} counted groups`,
    ).toBeGreaterThan(0);
  for (const tally of tallies)
    expect(dev.trace(tally.id).answer, `${where}: ${tally.id}`).not.toBe(
      "not-a-record",
    );
  // Limit near twice the slowest run (train-gate): 50.1 s and 53.6 s alone (Nov 16).
}, 110_000);
