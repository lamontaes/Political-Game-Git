/**
 * A new life starts without the last life's election nights and canvassed
 * mornings. The bench keyed them by person and race, and a world built again
 * from the same seed has the same people and races, so a second New game
 * from that seed found its own election night already watched: the returns
 * never opened (seen in election-day.browser.mjs run twice on one server,
 * Hampstead, Maryland, the Nov 3 governor's race).
 *
 * The seed is drawn per run and named in every message.
 */
import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import { benchRequest, benchWorld } from "./handler";

const seed = `new-life-forgets-${randomUUID()}`;

const ask = async (method: string, path: string) => {
  const reply = await benchRequest(method, new URL(path, "http://bench"), {
    developer: true,
  });
  expect(
    reply.status,
    `${method} ${path}, seed ${seed}: ${String(reply.body).slice(0, 300)}`,
  ).toBeLessThan(400);
  return reply;
};

it(`a new life forgets the last life's election nights, seed ${seed}`, async () => {
  // The last life watched a night and canvassed a morning.
  await ask(
    "POST",
    `/api/election-night/watched?${new URLSearchParams({ id: "person_last", contestId: "contest:last" })}`,
  );
  benchWorld().canvassedOn.add("person_last|2026-11-03");
  expect(benchWorld().nightsWatched.size, `seed ${seed}`).toBe(1);
  await ask("POST", `/api/newlife?${new URLSearchParams({ seed })}`);
  const where = `${benchWorld().placeId}, seed ${seed}`;
  expect([...benchWorld().nightsWatched], where).toEqual([]);
  expect([...benchWorld().canvassedOn], where).toEqual([]);
}, 240_000);
