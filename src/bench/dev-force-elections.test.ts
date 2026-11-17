/**
 * Dev mode forces each of the elections' scenes through the elections engine's own writers, from the
 * scene trace's own route (src/bench/dev-views/scene-trace.ts, POST scene-trace/force), in a place
 * drawn from all 56 with a seed nobody chose (pool item dev-force-every-scene-through-its-writer).
 * Each forced type stages on the next day from the cause record the writer wrote, named by its id
 * in the log, or the view gives its worded reason; the ones no recipe can force carry a worded
 * reason in the type list. The four are forced in turn in one world: each loss runs to the count of
 * the player's next race still waiting on one, and files again where none is. The voters decide a
 * race, so a won race is said in words; the test needs a loss to stage, or a won race, in the draw.
 */
import { randomBytes } from "node:crypto";
import type { IncomingMessage } from "node:http";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import type { PersonId } from "../core2/types";
import { handleDev } from "./dev-api";
import { ELECTIONS_REASONS, ELECTIONS_SCENES } from "./dev-force-elections";
import { devModeMarks } from "./dev-mode";
import { devViewList, loadDevViews } from "./dev-views";
import { buildBenchWorld } from "./world";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const ATTEMPTS = 3;
/** The types in the order they are forced in one world: two filings, then a count for each loss. */
const ORDER = ["filing", "family-filing", "race-lost", "family-loss"];
/** Why a loss could not be brought about in a place: the place is passed over, by name. */
const PASS_OVER = ["no-race", "no-ballot", "no-count"];

function request(method: string, input?: unknown): IncomingMessage {
  const text = input === undefined ? "" : JSON.stringify(input);
  return {
    method,
    async *[Symbol.asyncIterator]() {
      if (text) yield text;
    },
  } as unknown as IncomingMessage;
}

type Forced = {
  staged: boolean;
  why: string | null;
  outcome: string | null;
  causeRecords: string[];
};

it(`dev mode forces every elections scene through the elections' writers, seed ${seed}`, async () => {
  setBookkeeping(false);
  await loadDevViews();
  const labels = devViewList().find((view) => view.name === "scene-trace")!
    .labels as { reasons: Record<string, string> };
  const passed: string[] = [];
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const place = drawPlace(`${seed}:${attempt}`, "dev-force-elections");
    const where = `${place.name} (${place.key}), world seed ${place.seed}`;
    const lines: string[] = [];
    let passOver: string | null = null;
    // One world: a second world in the same run is more memory than a shared container holds.
    {
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
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
      {
        // The type list names a worded reason for each type no recipe can force, and offers the rest.
        const types = (
          (await ask("GET", "scene-trace/types")).value as {
            types: { key: string; recipe: string | null; why: string | null }[];
          }
        ).types;
        for (const [key, reason] of Object.entries(ELECTIONS_REASONS)) {
          expect(
            types.find((type) => type.key === key)?.why,
            `${where}: ${key}`,
          ).toBe(reason);
          expect(labels.reasons[reason], `${where}: ${key}`).toBeTruthy();
        }
        for (const key of Object.keys(ELECTIONS_SCENES))
          expect(
            types.find((type) => type.key === key)?.recipe,
            `${where}: ${key}`,
          ).toBe("elections");
      }
      for (const key of ORDER) {
        const marks = devModeMarks(world.core).length;
        const forced = await ask("POST", "scene-trace/force", { typeKey: key });
        expect(
          forced.status,
          `${where}: ${key}: ${JSON.stringify(forced.value)}`,
        ).toBe(200);
        const out = forced.value as Forced;
        // Every force leaves its dev mark: a forced scene is never a played one.
        expect(
          devModeMarks(world.core)
            .slice(marks)
            .some((id) => id.includes(":scene-forced:")),
          `${where}: ${key}`,
        ).toBe(true);
        if (out.why) {
          expect(
            labels.reasons[out.why],
            `${where}: ${key}: ${out.why}`,
          ).toBeTruthy();
          // The clerk's scene follows every filing the counter takes.
          if (key === "filing")
            expect(
              out.why,
              `${where}: the clerk's scene did not follow the filing`,
            ).toBe("no-race");
          if (PASS_OVER.includes(out.why)) {
            passOver = `${key}: ${out.why}`;
            break;
          }
          lines.push(
            `${key}: not staged, ${out.why} (${labels.reasons[out.why]})`,
          );
          continue;
        }
        expect(out.staged, `${where}: ${key}: ${JSON.stringify(out)}`).toBe(
          true,
        );
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
    }
    if (passOver) {
      passed.push(`${where}: ${passOver}`);
      continue;
    }
    // The clerk's scene stages from every filing; a loss is the voters' to give, so the draw needs one.
    expect(
      lines.find((line) => line.startsWith("filing:")),
      where,
    ).toMatch(/staged/);
    expect(
      lines.some((line) => /^(race-lost|family-loss): staged/.test(line)) ||
        lines.some((line) => /^race-lost: not staged, won/.test(line)),
      `${where}: ${lines.join("; ")}`,
    ).toBe(true);
    process.stdout.write(
      `${where}, run seed ${seed}:${attempt}\n  ${lines.join("\n  ")}\n  passed over: ${passed.join("; ") || "none"}\n`,
    );
    return;
  }
  throw new Error(
    `No drawn place brought a filing to its count: ${passed.join("; ")}`,
  );
}, 1_500_000);
