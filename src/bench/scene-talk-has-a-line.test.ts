/**
 * A scene's own talk never opens a box with no line in it (pool item
 * play-talk-opens-with-no-line-after-a-year). A bench world is played 56
 * weeks through the bench's own routes in a place drawn from all 56; every
 * scheduled moment of the player's that names a person to talk to is opened
 * the way the screen opens it. The talk that opens has a line, and a talk with
 * nothing to say opens none (the server answers null and the screen hands the
 * room back). Set GOLDEN_PATH_SEED to reproduce a run.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { benchRequest, benchWorld } from "./handler";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const WEEKS = 56;

const call = async (method: string, path: string) => {
  const reply = await benchRequest(method, new URL(path, "http://bench"), {
    developer: false,
  });
  expect(
    reply.status,
    `${method} ${path}: ${String(reply.body).slice(0, 200)}`,
  ).toBe(200);
  return JSON.parse(
    typeof reply.body === "string"
      ? reply.body
      : Buffer.from(reply.body).toString("utf8"),
  ) as Record<string, unknown> | null;
};

it(
  "every scene talk that opens has a line, and a scene with nothing to say opens none",
  { timeout: 1_800_000 },
  async () => {
    const place = drawPlace(seed, "scene-talk-has-a-line");
    const where = `${place.name} (${place.key}), run seed ${seed}, place seed ${place.seed}`;
    await call(
      "POST",
      `/api/newlife?seed=${encodeURIComponent(place.seed)}&placeKey=${encodeURIComponent(place.key)}`,
    );
    const checked = new Set<string>();
    const tally = { opened: 0, silent: 0 };
    const read = async () => {
      const world = benchWorld();
      const me = world.player!.personId!;
      const book = world.director!.ledger.people.get(me);
      for (const entry of book?.schedule ?? []) {
        if (checked.has(entry.momentId) || entry.date > world.core!.date)
          continue;
        checked.add(entry.momentId);
        const story = await call(
          "GET",
          `/api/story?momentId=${encodeURIComponent(entry.momentId)}`,
        ).catch(() => null);
        const withId = story?.talkToId as string | undefined;
        if (!story || !withId || story.talk) continue;
        // As the screen opens a scene's talk: about the scene's moment.
        const opened = await call(
          "POST",
          `/api/talk/open?otherId=${encodeURIComponent(withId)}&momentId=${encodeURIComponent(entry.momentId)}`,
        );
        if (opened === null) {
          tally.silent += 1;
          continue;
        }
        expect(
          (opened.lines as unknown[]).length,
          `${where}: scene ${entry.momentId} opened a talk with ${withId} that has no line`,
        ).toBeGreaterThan(0);
        tally.opened += 1;
        await call("POST", "/api/talk/leave");
      }
    };
    for (let week = 0; week < WEEKS; week += 1) {
      // An election day the player's own town votes: leave the polling place first.
      const polling = await benchRequest(
        "GET",
        new URL("/api/polling-place", "http://bench"),
        { developer: false },
      );
      if (polling.status === 200 && JSON.parse(String(polling.body)) !== null)
        await call("POST", "/api/polling-place/leave");
      let step = await call("POST", "/api/advance?mode=week");
      for (let stops = 0; stops < 50; stops += 1) {
        const packet = step?.packet as
          { kind?: string; pauseId?: string } | undefined;
        if (!packet || packet.kind === "complete" || packet.kind === "choice")
          break;
        step = await call(
          "POST",
          `/api/resume?pauseId=${encodeURIComponent(packet.pauseId ?? "")}`,
        );
      }
      await read();
    }
    process.stdout.write(
      `scene-talk-has-a-line: ${where}: ${checked.size} moments, ${tally.opened} talks with a line, ${tally.silent} scenes with nothing to say (no box)\n`,
    );
    expect(
      tally.opened + tally.silent,
      `${where}: no scene named a person to talk to in ${WEEKS} weeks`,
    ).toBeGreaterThan(0);
  },
);
