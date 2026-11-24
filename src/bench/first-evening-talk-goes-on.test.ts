/**
 * The first evening's talk at home goes past one exchange (pool item
 * play-first-evening-talk-ends-after-one-exchange). A relative raises a point
 * of the President's address; the player answers; the relative answers back
 * and the talk goes on to a related subject with replies to choose, as a
 * conversation's main topic leads to a related one (conversation-rules.json,
 * `related`), instead of a goodbye. Three places drawn from all 56, each a
 * new life built through the bench's own routes; every person in the room
 * is talked to the way the screen does it (the first reply each turn). Each
 * place needs at least one talk with a second set of replies, and every talk
 * passed over is named with its place and seed. Set GOLDEN_PATH_SEED to
 * reproduce a run.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { benchRequest } from "./handler";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const PLACES = 3;

interface Talk {
  otherId: string;
  lines: { kind: string; text: string }[];
  choices: { key: string }[];
}

const call = async (method: string, path: string) => {
  const reply = await benchRequest(method, new URL(path, "http://bench"), {
    developer: false,
  });
  const text =
    typeof reply.body === "string"
      ? reply.body
      : Buffer.from(reply.body).toString("utf8");
  expect(reply.status, `${method} ${path}: ${text.slice(0, 200)}`).toBe(200);
  return JSON.parse(text) as unknown;
};

it(
  "the first evening's talk at home reaches a second exchange in every drawn place",
  { timeout: 1_800_000 },
  async () => {
    const report: string[] = [];
    for (let draw = 0; draw < PLACES; draw += 1) {
      const place = drawPlace(seed, `first-evening-talk-goes-on:${draw}`);
      const where = `${place.name} (${place.key}), run seed ${seed}, place seed ${place.seed}`;
      const life = (await call(
        "POST",
        `/api/newlife?seed=${encodeURIComponent(place.seed)}&placeKey=${encodeURIComponent(place.key)}`,
      )) as { personId: string };
      const room = (await call(
        "GET",
        `/api/scene?id=${encodeURIComponent(life.personId)}`,
      )) as { people?: { personId: string }[] };
      const passed: string[] = [];
      let second = 0;
      for (const person of room.people ?? []) {
        const opened = (await call(
          "POST",
          `/api/talk/open?otherId=${encodeURIComponent(person.personId)}`,
        )) as Talk | null;
        if (!opened) {
          passed.push(`${person.personId}: nothing to say`);
          continue;
        }
        const first = opened.choices[0];
        if (!first) {
          passed.push(
            `${person.personId}: opened on ${opened.lines[0]?.kind} with no reply`,
          );
          await call("POST", "/api/talk/leave");
          continue;
        }
        const after = (await call(
          "POST",
          `/api/talk/say?key=${encodeURIComponent(first.key)}`,
        )) as Talk;
        if (after.choices.length) second += 1;
        else
          passed.push(
            `${person.personId}: opened on ${opened.lines[0]?.kind}, ended after one exchange on ${after.lines.at(-1)?.kind} ("${after.lines.at(-1)?.text}")`,
          );
        await call("POST", "/api/talk/leave");
      }
      report.push(
        `${where}: ${second} of ${room.people?.length ?? 0} room talks reached a second exchange${passed.length ? `; passed over: ${passed.join("; ")}` : ""}`,
      );
      expect(
        second,
        `${where}: no talk in the first evening's room reached a second exchange (${passed.join("; ") || "no one in the room"})`,
      ).toBeGreaterThan(0);
    }
    process.stdout.write(`first-evening-talk-goes-on:\n${report.join("\n")}\n`);
  },
);
