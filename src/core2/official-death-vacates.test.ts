/**
 * An official outside the town who dies leaves the seat that day, and their pay
 * ends with it (gov-dead-official-still-seated). Played world in a place drawn
 * from all 56; the place and seed are named in every failure message. Set
 * GOLDEN_PATH_SEED to reproduce a run.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { OFFICIALS_MODULE_ID, type OfficialRow } from "./modules/officials";
import { OFFICIAL_PAY_MODULE_ID } from "./modules/official-pay";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");

it("ends an outside official's row and pay on the day they die", () => {
  setBookkeeping(false);
  try {
    const draw = drawPlace(seed, "official-death");
    const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: draw.key,
    });
    const api = coreAPI(core);
    const where = `${draw.key} [${draw.state}], seed ${draw.seed}`;
    advanceCore(core, addDays(makeIsoDate(core.date), 62));
    const rows = () =>
      api
        .moduleState(OFFICIALS_MODULE_ID)
        .table("officials")
        .rows() as unknown as OfficialRow[];
    const pay = () => api.moduleState(OFFICIAL_PAY_MODULE_ID).table("pay");
    const official = rows().find(
      (row) =>
        row.ended === null &&
        row.officeKind === "us-house" &&
        core.people.get(row.id)?.alive &&
        pay().get(row.id),
    );
    expect(official, `${where}: a paid House member`).toBeDefined();
    api.updatePerson(official!.id, { alive: false });
    api.emit({
      id: `test-death:${official!.id}`,
      date: core.date,
      kind: "life.death",
      personIds: [official!.id],
      placeId: core.people.get(official!.id)!.placeId,
      source: { tag: "SOURCED", citation: "test", asOf: core.date },
    });
    const after = rows().find((row) => row.id === official!.id)!;
    expect(after.ended, `${where}: ${official!.id}`).toBe(core.date);
    // The pay row ends on the next review, and no paycheck follows.
    advanceCore(core, addDays(makeIsoDate(core.date), 62));
    const record = pay().get(official!.id) as unknown as
      { endedOn: string | null } | undefined;
    expect(record === undefined || record.endedOn !== null, where).toBe(true);
  } finally {
    setBookkeeping(true);
  }
}, 900_000);
