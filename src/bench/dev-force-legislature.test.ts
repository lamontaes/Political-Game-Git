/**
 * Dev mode forces each of the legislature's scenes through the legislature's own writers, from the
 * scene trace's own route (src/bench/dev-views/scene-trace.ts, POST scene-trace/force), in a place
 * drawn from all 56 with a seed nobody chose (pool item dev-force-every-scene-through-its-writer).
 * Each forced type stages on the next day from the cause record the writer wrote, named by its id
 * in the log, or the view gives its worded reason; the ones no recipe can force carry a worded
 * reason in the type list. A place whose state seats no member for the town is passed over by name.
 */
import { randomBytes } from "node:crypto";
import type { IncomingMessage } from "node:http";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { seatCoveringTown } from "../core2/office-day-state";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { handleDev } from "./dev-api";
import {
  LEGISLATURE_REASONS,
  LEGISLATURE_SCENES,
} from "./dev-force-legislature";
import { devModeMarks } from "./dev-mode";
import { devViewList, loadDevViews } from "./dev-views";
import { buildBenchWorld } from "./world";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const ATTEMPTS = 6;
/** The recipes that need only a seat, a colleague and a question: they stage in every place that seats the player. */
const ALWAYS = ["bill-carry", "press-interview", "desk-visit"];

function request(method: string, input?: unknown): IncomingMessage {
  const text = input === undefined ? "" : JSON.stringify(input);
  return {
    method,
    async *[Symbol.asyncIterator]() {
      if (text) yield text;
    },
  } as unknown as IncomingMessage;
}

it(`dev mode forces every legislature scene through the legislature's writers, seed ${seed}`, async () => {
  setBookkeeping(false);
  await loadDevViews();
  const labels = devViewList().find((view) => view.name === "scene-trace")!
    .labels as { reasons: Record<string, string> };
  const passed: string[] = [];
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const place = drawPlace(`${seed}:${attempt}`, "dev-force-legislature");
    const where = `${place.name} (${place.key}), world seed ${place.seed}`;
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(world.core);
    if (
      !seatCoveringTown(api, "legislator") ||
      !seatCoveringTown(api, "governor")
    ) {
      passed.push(`${where}: no state seat covers the town`);
      continue;
    }
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

    // The type list names a worded reason for each type no recipe can force, and offers the rest.
    const types = (
      (await ask("GET", "scene-trace/types")).value as {
        types: { key: string; recipe: string | null; why: string | null }[];
      }
    ).types;
    for (const [key, reason] of Object.entries(LEGISLATURE_REASONS)) {
      const row = types.find((type) => type.key === key);
      expect(row?.why, `${where}: ${key}`).toBe(reason);
      expect(labels.reasons[reason], `${where}: ${key}`).toBeTruthy();
    }
    for (const key of Object.keys(LEGISLATURE_SCENES))
      expect(
        types.find((type) => type.key === key)?.recipe,
        `${where}: ${key}`,
      ).toBe("legislature");

    // Each recipe, in the order a run of every recipe takes them.
    const lines: string[] = [];
    for (const key of Object.keys(LEGISLATURE_SCENES)) {
      const marks = devModeMarks(world.core).length;
      const forced = await ask("POST", "scene-trace/force", { typeKey: key });
      expect(
        forced.status,
        `${where}: ${key}: ${JSON.stringify(forced.value)}`,
      ).toBe(200);
      const out = forced.value as {
        staged: boolean;
        why: string | null;
        outcome: string | null;
        causeRecords: string[];
        written: string[];
      };
      // Every force leaves its dev mark: a forced scene is never a played one.
      expect(
        devModeMarks(world.core)
          .slice(marks)
          .some((id) => id.includes(":scene-forced:")),
        `${where}: ${key}`,
      ).toBe(true);
      if (out.why) {
        expect(ALWAYS, `${where}: ${key} refused: ${out.why}`).not.toContain(
          key,
        );
        expect(labels.reasons[out.why], `${where}: ${key}`).toBeTruthy();
        lines.push(`${key}: not staged, ${out.why}`);
        continue;
      }
      expect(out.staged, `${where}: ${key}: ${JSON.stringify(out)}`).toBe(true);
      // The scene was staged from the record the writer wrote, which the log keeps by its id.
      const cause = out.causeRecords[0]!;
      expect(
        world.core.durableLog.has(cause),
        `${where}: ${key}: ${cause}`,
      ).toBe(true);
      const book = world.director.ledger.people.get(
        world.core.playerId as PersonId,
      )!;
      expect(
        book.schedule.some(
          (row) =>
            book.momentsById.get(row.momentId)?.causeId === cause &&
            row.bindings.some((binding) => binding.typeKey === key),
        ),
        `${where}: ${key}`,
      ).toBe(true);
      lines.push(`${key}: staged (${out.outcome}) from ${cause}`);
    }
    process.stdout.write(
      `${where}, run seed ${seed}:${attempt}\n  ${lines.join("\n  ")}\n  passed over: ${passed.join("; ") || "none"}\n`,
    );
    return;
  }
  throw new Error(
    `No drawn place seats the player in its state: ${passed.join("; ")}`,
  );
}, 600_000);
