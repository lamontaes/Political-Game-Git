/**
 * A law taking effect names no one, but a local outlet ranks it by the
 * followers it reaches (named and counted), so it competes with stories that
 * name people. A random place from all 56 whose local outlet has a reporter.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { coreAPI } from "./state";
import { runDesk, type DeskOutlet } from "./press-desk";
import { deskContext, followersOf, outletsHere } from "./modules/press";
import type { WireItem } from "./press-topics";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const COUNTED = 400;

it("ranks a law that reaches the outlet's followers by how many it reaches", () => {
  const tried: string[] = [];
  for (let draw = 0; draw < 10; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "press-law-reach");
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    tried.push(`${place.name} (${place.key})`);
    const api = coreAPI(world.core);
    const outlet = outletsHere(api).find(
      (o) =>
        o.tier === "local" &&
        o.reporterIds.some((id) => world.core.people.get(id)?.alive),
    ) as DeskOutlet | undefined;
    if (!outlet) continue;
    const date = world.core.date;
    const law: WireItem = {
      id: "law-took-effect:law:test:fare-free",
      kind: "law-took-effect",
      facts: { lawId: "law:test:fare-free", series: "fare-free-transit" },
      date,
      level: "town",
      topic:
        "us-policy-positions:transportation-infrastructure.fare-free-transit",
      desiredChange: "enact",
      ending: false,
      subjectIds: [],
    };
    const ctx = { ...deskContext(api), countedFollowers: () => COUNTED };
    const printed = runDesk(api, ctx, outlet, [law]);
    const where = `${place.name}, seed ${seed}:${draw}`;
    const story = printed.find((row) => row.wireId === law.id);
    expect(story, where).toBeDefined();
    const named = followersOf(api, outlet.id).length;
    // Nobody is named, so the people term is the followers it reaches.
    expect(story!.pick!.people, where).toBeCloseTo(
      Math.log1p(named + COUNTED),
      6,
    );
    return;
  }
  throw new Error(`No local outlet with a reporter: ${tried.join("; ")}`);
}, 3_600_000);
