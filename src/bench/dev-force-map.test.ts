/**
 * Every scene on dev mode's force map can be forced (owner, Nov 16: dev mode must "trace and force
 * every scene to play... see why every scene played and why dialogue options were chosen").
 * The map (src/bench/dev-views/scene-force-map.json) is measured at one world by
 * scripts/words/force-all-probe.mts; this check holds it in a place drawn from all 56, with a seed
 * nobody chose, on the New game route's warmed world (OPENING_WARMUP_DAYS):
 *  - every row is a situation type the director stages (anything else comes off the map), keeps no
 *    fact of the world it was measured in (the record is built for the player at the force,
 *    src/bench/dev-force-event.ts), and every type has a row or a recipe of an engine's own function;
 *  - a row the map says waits on a writer names a reason the scene trace words;
 *  - every type the map says a record of its cause stages is forced from the scene trace's own route
 *    (POST scene-trace/force) and stages on the next day.
 * The legislature's rows are forced by src/bench/dev-force-legislature.test.ts.
 * Seen red on Nov 24 at Warrenton, Virginia (5183136): the map named the probe world's player in its
 * records, so nine of its eighteen types made only a journal line in any other world.
 */
import { randomBytes } from "node:crypto";
import type { IncomingMessage } from "node:http";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import type { PersonId } from "../core2/types";
import { SITUATION_LIBRARY } from "../director/scheduling";
import { handleDev } from "./dev-api";
import { OWN_RECIPES } from "./dev-force-event";
import { DevMode } from "./dev-mode";
import { devViewList, loadDevViews } from "./dev-views";
import forceMap from "./dev-views/scene-force-map.json";
import { buildBenchWorld, OPENING_WARMUP_DAYS } from "./world";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const ROWS = (
  forceMap as { types: Record<string, Record<string, string | undefined>> }
).types;

function request(method: string, input?: unknown): IncomingMessage {
  const text = input === undefined ? "" : JSON.stringify(input);
  return {
    method,
    async *[Symbol.asyncIterator]() {
      if (text) yield text;
    },
  } as unknown as IncomingMessage;
}

it(`every scene on dev mode's force map can be forced, seed ${seed}`, async () => {
  setBookkeeping(false);
  await loadDevViews();
  const labels = devViewList().find((view) => view.name === "scene-trace")!
    .labels as { reasons: Record<string, string>; unreachable: string };
  const place = drawPlace(seed, "dev-force-map");
  const where = `${place.name} (${place.key}), world seed ${place.seed}`;
  process.stdout.write(`${where}\n`);
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
    warmUpDays: OPENING_WARMUP_DAYS,
  });
  const recipes = new Map(
    new DevMode(world.core, world.director, undefined, world.placeId)
      .scenes()
      .map((row) => [row.key, row.recipe]),
  );

  // The map holds scenes only, each said by how it is forced and nothing of the world it was measured in.
  const types = new Set(SITUATION_LIBRARY.types.map((type) => type.key));
  for (const [key, row] of Object.entries(ROWS)) {
    expect(types.has(key), `${key} is on the map and is no scene`).toBe(true);
    expect(
      Object.keys(row).every((field) =>
        ["how", "reason", "recipe"].includes(field),
      ),
      `${key}: the map keeps ${JSON.stringify(row)}`,
    ).toBe(true);
    // A type with no cause at all is worded as one no engine writes the cause of.
    if (row.how === "writer")
      expect(
        row.reason === "no-cause"
          ? labels.unreachable
          : labels.reasons[row.reason ?? ""],
        `${key}: the reason "${row.reason}" has no words in the scene trace`,
      ).toBeTruthy();
  }
  for (const key of types)
    expect(
      !!ROWS[key] || OWN_RECIPES.includes(recipes.get(key) ?? ""),
      `${key}: neither the map nor an engine's own recipe says how to force it`,
    ).toBe(true);

  // Each type a record of its cause stages is forced from the scene trace and stages the next day.
  world.director.watch(world.core, world.playerId as PersonId);
  const ask = async (method: string, path: string, input?: unknown) => {
    let answer: { status: number; value: unknown } | undefined;
    await handleDev(
      request(method, input),
      new URL(`http://bench/api/dev/${path}`),
      (status, value) => (answer = { status, value }),
      () => ({
        core: world.core,
        director: world.director,
        placeId: world.placeId,
      }),
    );
    return answer!;
  };
  const byEvent = Object.entries(ROWS)
    .filter(
      ([key, row]) =>
        row.how === "event" && !OWN_RECIPES.includes(recipes.get(key) ?? ""),
    )
    .map(([key]) => key);
  expect(byEvent.length, `${where}: no type is forced by a record`).toBe(
    Object.values(ROWS).filter((row) => row.how === "event").length,
  );
  const notStaged: string[] = [];
  for (const typeKey of byEvent) {
    const forced = await ask("POST", "scene-trace/force", { typeKey });
    expect(forced.status, `${where}: ${typeKey}`).toBe(200);
    const value = forced.value as { recipe: string; staged: boolean };
    expect(value.recipe, `${where}: ${typeKey}`).toBe("event");
    if (!value.staged) notStaged.push(typeKey);
  }
  expect(notStaged, `${where}: forced and not staged`).toEqual([]);
  process.stdout.write(
    `${where}: ${byEvent.length} types forced by a record, all staged\n`,
  );
}, 300_000);
