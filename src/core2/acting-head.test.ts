import { buildBenchWorld } from "../bench/world";
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "./game-start";
import { cabinetOf, leavePostOpen } from "./office-day-federal-president";
import { OFFICES_MODULE_ID, type TermRow } from "./modules/offices";
import { coreAPI } from "./state";

// A cabinet post the president leaves open runs under a named acting head: a person drawn from the
// wider population for that post and day (the same people path as an arrival), filled in because
// they are named. A place drawn from all 56 on a seed nobody chose. The vacancy is the one
// hand-set fact (the cabinet is full at the opening); the rest is the engine's.
const seed =
  process.env.ACTING_HEAD_SEED ??
  process.env.GOLDEN_PATH_SEED ??
  randomBytes(8).toString("hex");

describe(`an acting head is a person (seed ${seed})`, () => {
  it("names a person for a post left open, the same one on the same day", () => {
    const draw = drawPlace(seed, "acting-head");
    const world = buildBenchWorld(draw.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: draw.key,
    });
    const core = world.core;
    const api = coreAPI(core);
    const where = `${draw.name} (${draw.key}), seed ${draw.seed}`;
    const president = (
      api
        .moduleState(OFFICES_MODULE_ID)
        .table("terms")
        .query("bySeatStatus", [
          "seat:US:president",
          "serving",
        ]) as unknown as TermRow[]
    )[0]?.personId;
    expect(president, where).toBeTruthy();
    const row = cabinetOf(api)[0]!;
    api
      .moduleState("core2-office-day-federal-v1")
      .table("cabinet")
      .put({ ...row, status: "vacant", holderId: null } as never);
    leavePostOpen(api, president!, row.postId);
    const acting = cabinetOf(api).find((c) => c.postId === row.postId)!;
    expect(acting.status, where).toBe("acting");
    expect(acting.actingId, `${where}: an acting head is named`).toBeTruthy();
    const who = core.people.get(acting.actingId!);
    expect(who?.alive, where).toBe(true);
    console.log(
      `acting head: ${where}: ${row.postId} acting ${acting.actingId} ${JSON.stringify(who?.name ?? null)} born ${who?.birthDate ?? "?"}, until ${acting.actingUntil}`,
    );
  }, 600_000);
});
