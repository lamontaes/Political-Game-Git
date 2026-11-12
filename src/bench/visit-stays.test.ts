/**
 * A place the player goes to is where they are until they leave it: a talk
 * there leaves them in the same room, going home takes them home, and the
 * next morning is at home. (Before, the room after any talk was drawn from
 * the day's schedule: the player went to a parent's workplace, talked to
 * them, and stood in their own kitchen with the same parent. Polkville,
 * Mississippi, seed dc46979e-5cd3-4ef4-aa57-4500488ec8ed, Nov 11.)
 * Through the bench's own routes, in a place drawn from all 56; set
 * GOLDEN_PATH_SEED to reproduce a run.
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
  return { status: reply.status, json: JSON.parse(String(reply.body)) };
};

it("a visit lasts through a talk, ends on going home and ends with the day", async () => {
  const place = drawPlace(seed, "visit-stays");
  const where = `${place.name} (${place.key}), seed ${place.seed}`;
  const built = await ask(
    "POST",
    `/api/build?seed=${encodeURIComponent(place.seed)}`,
  );
  expect(built.status, where).toBe(200);
  const world = benchWorld();
  const core = world.core!;
  const me = [...core.people.values()].find((p) => p.alive)!.id;
  world.player!.select(me);
  expect((await ask("POST", "/api/advance?mode=day")).status, where).toBe(200);
  const scene = async () =>
    (await ask("GET", `/api/scene?id=${me}`)).json as {
      organizationId?: string;
      people: { personId: string }[];
    };
  expect((await scene()).organizationId, `${where}: at home`).toBeUndefined();

  const places = (await ask("GET", `/api/goto?id=${me}`)).json as {
    organizationId: string;
  }[];
  expect(places.length, `${where}: somewhere to go`).toBeGreaterThan(0);
  const org = places[0]!.organizationId;
  const visit = await ask(
    "POST",
    `/api/goto/visit?org=${encodeURIComponent(org)}`,
  );
  expect(visit.status, where).toBe(200);
  expect((await scene()).organizationId, `${where}: there`).toBe(org);
  expect(
    (await ask("GET", "/api/goto/home")).json.away,
    `${where}: Travel knows the player is out`,
  ).toBe(true);

  // A talk there, with anyone who has something to say, and its minutes.
  const others = [...core.people.values()]
    .filter((p) => p.alive && p.id !== me)
    .map((p) => p.id);
  for (const other of others.slice(0, 20)) {
    const opened = await ask("POST", `/api/talk/open?otherId=${other}`);
    expect(opened.status, where).toBe(200);
    const said = (opened.json.lines ?? []).length;
    expect((await ask("POST", "/api/talk/leave")).status, where).toBe(200);
    if (said) break;
  }
  expect(
    (await scene()).organizationId,
    `${where}: still there after a talk`,
  ).toBe(org);

  // Going home is a trip: the clock moves and the room is no longer the place.
  const before = world.player!.packet!.at.minuteOfDay;
  const home = await ask("POST", "/api/goto/home");
  expect(home.status, where).toBe(200);
  expect(home.json.scene.organizationId, `${where}: home`).toBeUndefined();
  expect(
    world.player!.packet!.at.minuteOfDay,
    `${where}: the trip home took time`,
  ).toBeGreaterThan(before);
  expect((await ask("GET", "/api/goto/home")).json.away, where).toBe(false);

  // Out again, and the day ends: the next morning is not at the place.
  expect(
    (await ask("POST", `/api/goto/visit?org=${encodeURIComponent(org)}`))
      .status,
    where,
  ).toBe(200);
  expect((await scene()).organizationId, `${where}: there again`).toBe(org);
  expect((await ask("POST", "/api/advance?mode=day")).status, where).toBe(200);
  expect(
    (await scene()).organizationId,
    `${where}: the next morning`,
  ).toBeUndefined();
}, 900_000);
