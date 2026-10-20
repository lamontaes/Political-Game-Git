/**
 * A player marks a line they were told as a gap (pool item play-mark-gap):
 * one record names the scene and the line, the clock does not move, and the
 * bench lists it. Through the bench's own routes, in a place drawn from all 56;
 * set GOLDEN_PATH_SEED to reproduce a run.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { benchRequest, benchWorld } from "./handler";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

const ask = async (method: string, path: string) => {
  const reply = await benchRequest(method, new URL(path, "http://bench"), {
    developer: true,
  });
  return {
    status: reply.status,
    json: JSON.parse(String(reply.body)) as Record<string, unknown>,
  };
};

it("marking a line as a gap writes one record naming the scene and the line, and spends no time", async () => {
  const place = drawPlace(seed, "mark-gap");
  const where = `${place.name} (${place.key}), seed ${place.seed}`;
  const built = await ask(
    "POST",
    `/api/build?seed=${encodeURIComponent(place.seed)}`,
  );
  expect(built.status, where).toBe(200);
  const world = benchWorld();
  const core = world.core!;
  const ids = [...core.people.values()].filter((p) => p.alive).map((p) => p.id);
  const [me, other] = ids;
  world.player!.select(me!);
  const opened = await ask("POST", `/api/talk/open?otherId=${other}`);
  expect(opened.status, where).toBe(200);
  const lines = opened.json.lines as { text: string }[];
  expect(lines.length, where).toBeGreaterThan(0);
  const date = core.date;
  const gaps = await ask("GET", "/api/gaps");
  expect((gaps.json as unknown as unknown[]).length, where).toBe(0);
  const marked = await ask("POST", "/api/gap");
  expect(marked.status, where).toBe(200);
  expect(core.date, `${where}: the clock did not move`).toBe(date);
  const after = (await ask("GET", "/api/gaps")).json as unknown as {
    control: string;
    facts: { sceneId: string; line: string; text: string };
  }[];
  expect(after, where).toHaveLength(1);
  expect(after[0]!.facts.text, where).toBe(lines.at(-1)!.text);
  expect(after[0]!.facts.line, where).toBe(
    `${after[0]!.facts.sceneId}#${lines.length - 1}`,
  );
  // A second mark is a second record, never the same id twice.
  await ask("POST", "/api/gap?line=0");
  const twice = (await ask("GET", "/api/gaps")).json as unknown as {
    id: string;
  }[];
  expect(new Set(twice.map((g) => g.id)).size, where).toBe(2);
}, 600_000);
