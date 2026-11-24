/**
 * A circle member's routine `drive.strengthened` entry leaves the log after
 * `circleDecisionDetailDays`; other circle entries keep the longer act window,
 * and any entry naming the player stays (memory and long runs, Nov 8). A
 * random place and seed each run, named so a failure can be replayed.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { isShortDetailKind } from "./decision-detail";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { coreAPI } from "./state";

const seed = process.env.SHORT_DETAIL_SEED ?? randomBytes(8).toString("hex");

describe(`short detail retention (seed ${seed})`, () => {
  it("drops a week-old drive update, keeps a fresh one, another kind and the player's", () => {
    setBookkeeping(false);
    const world = buildBenchWorld(seed, gameStartDate(), { twoLevel: true });
    const core = world.core,
      api = coreAPI(core);
    const [other] = [...core.people.keys()].filter(
      (id) => id !== core.playerId,
    );
    expect(isShortDetailKind("drive.strengthened")).toBe(true);
    expect(isShortDetailKind("person.acted")).toBe(false);
    const emit = (id: string, kind: string, personId: string) => {
      core.focusPersonIds.add(personId);
      api.emit({
        id,
        date: core.date,
        kind,
        personIds: [personId],
        placeId: core.people.get(personId)!.placeId,
        source: { tag: "SOURCED", citation: "test", asOf: core.date },
      });
    };
    emit("old", "drive.strengthened", other!);
    emit("old-other-kind", "test.routine", other!);
    emit("old-player", "drive.strengthened", core.playerId!);
    advanceCore(core, addDays(makeIsoDate(core.date), 6));
    emit("fresh", "drive.strengthened", other!);
    advanceCore(core, addDays(makeIsoDate(core.date), 4));
    const where = world.place.displayName;
    expect(core.durableLog.has("old"), where).toBe(false);
    expect(core.durableLog.has("fresh"), where).toBe(true);
    expect(core.durableLog.has("old-other-kind"), where).toBe(true);
    expect(core.durableLog.has("old-player"), where).toBe(true);
  }, 600_000);
});
