/**
 * Dev mode's scene trace (src/bench/dev-views/scene-trace.ts) through the bench's own request
 * handler on a built world: Ridgeville, Alabama (0164656), the draw "8341-pin"/"p6" the dev-views
 * test names. Every situation type is listed with how dev mode can cause it (87 types: 5 caused at
 * once, 81 by running the world until their cause record comes, 1 no engine writes: polling-place),
 * the register's tie class is read for a scene's lines, and a forced scene is a dev mark, never a
 * played scene.
 */
import type { IncomingMessage } from "node:http";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { lineByKey } from "../english/line-register";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import type { PersonId } from "../core2/types";
import { SITUATION_LIBRARY } from "../director/scheduling";
import { handleDev } from "./dev-api";
import { devModeMarks } from "./dev-mode";
import { loadDevViews } from "./dev-views";
import { buildBenchWorld } from "./world";

const PINNED = { run: "8341-pin", purpose: "p6", key: "0164656" };
/** The one type no engine writes a cause for, at this head. */
const UNREACHABLE = ["polling-place"];

function request(method: string, input?: unknown): IncomingMessage {
  const text = input === undefined ? "" : JSON.stringify(input);
  return {
    method,
    async *[Symbol.asyncIterator]() {
      if (text) yield text;
    },
  } as unknown as IncomingMessage;
}

it("the scene trace lists every scene, ties its lines and marks a forced scene (Ridgeville AL)", async () => {
  setBookkeeping(false);
  const place = drawPlace(PINNED.run, PINNED.purpose);
  const where = `${place.name} (${place.key}), world seed ${place.seed}`;
  expect(place.key, `${where}: the pinned place moved`).toBe(PINNED.key);
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  world.director.watch(world.core, world.playerId as PersonId);
  await loadDevViews();
  const ask = async (method: string, path: string, input?: unknown) => {
    let answer: { status: number; value: unknown } | undefined;
    const handled = await handleDev(
      request(method, input),
      new URL(`http://bench/api/dev/${path}`),
      (status, value) => (answer = { status, value }),
      () => ({
        core: world.core,
        director: world.director,
        placeId: world.placeId,
      }),
    );
    expect(handled, `${path} was not handled`).toBe(true);
    return answer!;
  };

  // Every situation type is listed, and the ones dev mode cannot reach are named.
  const types = (await ask("GET", "scene-trace/types")).value as {
    types: {
      key: string;
      forceable: boolean;
      purpose: string | null;
      lines: number;
      byTie: Record<string, number>;
    }[];
    unreachable: string[];
  };
  expect(types.types.map((row) => row.key).sort(), `${where}`).toEqual(
    SITUATION_LIBRARY.types.map((row) => row.key).sort(),
  );
  expect(types.unreachable, `${where}: scenes dev mode cannot cause`).toEqual(
    UNREACHABLE,
  );

  // A scene's lines are the register's, each with a tie class.
  const withLines = types.types.filter((row) => row.lines > 0);
  expect(
    withLines.length,
    `${where}: no scene type has scene-talk lines`,
  ).toBeGreaterThan(0);
  const row = withLines[0]!;
  const lines = (
    await ask("GET", `scene-trace/lines?type=${encodeURIComponent(row.key)}`)
  ).value as { key: string; tie: string; reach: string }[];
  expect(lines.length).toBe(row.lines);
  expect(
    lines.every((line) =>
      [
        "declared",
        "binding",
        "facts",
        "subject",
        "frame",
        "scene",
        "document",
        "slot-pair",
        "slot-world",
        "weak",
        "none",
      ].includes(line.tie),
    ),
  ).toBe(true);

  // One line looked up by its key says where it lives, what it is tied to and whether it plays.
  const oh = (
    await ask(
      "GET",
      "scene-trace/line?key=conversation.news-answer-react.oh-my",
    )
  ).value as { tie: string; bank: string };
  expect(oh).toMatchObject({ bank: "conversation", tie: "subject" });
  expect(lineByKey("conversation.news-answer-react.oh-my")?.tie).toBe(
    "subject",
  );

  // The player's staged scenes read as a list.
  expect(Array.isArray((await ask("GET", "scene-trace/moments")).value)).toBe(
    true,
  );

  // Forcing a scene causes its cause through the game's own code and marks it as a dev act.
  const before = devModeMarks(world.core).length;
  const forced = await ask("POST", "scene-trace/force", { typeKey: "layoff" });
  expect(forced.status, `${where}: ${JSON.stringify(forced.value)}`).toBe(200);
  expect(devModeMarks(world.core).length).toBeGreaterThan(before);
  expect(
    devModeMarks(world.core).some((id) => id.includes(":scene-forced:")),
  ).toBe(true);
}, 30_000);
