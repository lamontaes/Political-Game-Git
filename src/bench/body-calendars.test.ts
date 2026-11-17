import { buildBenchWorld } from "./world";
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "../core2/game-start";
import { BenchPlayer } from "./player";
import { DevMode } from "./dev-mode";
import {
  nextSittingOf,
  memberKey,
  members,
} from "../core2/modules/legislature";
import { coreAPI } from "../core2/state";
import { seatView } from "./legislature";

// Done-when item 7: every body that makes law meets on a calendar the world keeps (a real
// sitting date with its source), and the seat of a member at each level shows the body and what
// it can do. A place drawn from all 56 on a seed nobody chose.
const seed =
  process.env.BODY_CALENDARS_SEED ??
  process.env.GOLDEN_PATH_SEED ??
  randomBytes(8).toString("hex");

describe(`bodies meet on real calendars (seed ${seed})`, () => {
  it("every body has a next sitting on or after today with a source, and its member's seat shows the body", () => {
    const levels = new Set<string>();
    const report: string[] = [];
    for (let i = 0; i < 4; i += 1) {
      const place = drawPlace(`${seed}:${i}`, "body-calendars");
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const dev = new DevMode(
        world.core,
        world.director,
        new BenchPlayer(world.core, world.director),
        world.placeId,
      );
      const api = coreAPI(world.core);
      const where = `${place.name} (${place.key}, seed ${place.seed})`;
      for (const body of dev.lawmakingBodies()) {
        if (body.members.length < 2) continue;
        levels.add(body.level ?? "none");
        const sitting = nextSittingOf(api, body.id);
        expect(
          sitting,
          `${where}: ${body.kind} has a next sitting`,
        ).not.toBeNull();
        expect(
          sitting!.date >= world.core.date,
          `${where}: ${body.kind} sits ${sitting!.date}, not before ${world.core.date}`,
        ).toBe(true);
        expect(
          sitting!.source.citation?.length ?? 0,
          `${where}: ${body.kind} says where its date comes from`,
        ).toBeGreaterThan(0);
        // The seat of a member of this body lists it.
        const member = members(api, body.id)[0]!;
        const seat = seatView(world.core, memberKey(member));
        expect(
          seat.bodies.some((b) => b.officeId === body.id || b.id === body.id),
          `${where}: ${body.kind} appears in its member's seat`,
        ).toBe(true);
        report.push(
          `${where} ${body.kind} (${body.level}): next ${sitting!.date} [${sitting!.source.tag}]`,
        );
      }
    }
    expect(levels.size, "levels of government drawn").toBeGreaterThan(2);
    console.log(report.join("\n"));
  }, 1_800_000);
});
