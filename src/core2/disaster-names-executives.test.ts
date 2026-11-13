/**
 * A declared disaster's record names the sitting executives over the town (the
 * mayor, the county executive, the governor) who are full people, so a
 * first-hours scene can find its executive (pool item
 * world-disaster-names-the-executives). A place drawn from all 56 until one has
 * a disaster beginning in the first year; GOLDEN_PATH_SEED pins the draws.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { townDisasters } from "./modules/disasters";
import { townSeats } from "./modules/offices";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it(`a disaster's record names the town's sitting mayor, county executive and governor who are full people (seed ${seed})`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  for (let draw = 0; draw < 12; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "disaster-names-executives");
    const where = `${place.name} (${place.key}), place seed ${place.seed}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const opened = core.date;
    const due = townDisasters(api).filter(
      (row) =>
        row.begins > opened && row.begins <= addDays(makeIsoDate(opened), 365),
    );
    if (!due.length) {
      tried.push(`${where}: no first-year disaster`);
      continue;
    }
    advanceCore(core, addDays(makeIsoDate(due[0]!.begins), 1));
    const sitting = new Set(
      townSeats(api)
        .filter(
          (s) =>
            ["mayor", "county-executive", "governor"].includes(s.office.kind) &&
            s.holder?.personId &&
            core.people.has(s.holder.personId as never),
        )
        .map((s) => s.holder!.personId as string),
    );
    const records = [...(core.logByKind.get("hazard.disaster") ?? [])]
      .map((id) => core.durableLog.get(id as never))
      .filter((row) => row && row.date >= due[0]!.begins);
    expect(
      records.length,
      `${where}: no hazard.disaster record`,
    ).toBeGreaterThan(0);
    // Each full-person executive who sits is named on the record, and only executives are.
    const named = new Set(records[0]!.personIds as string[]);
    for (const id of sitting)
      expect(
        named.has(id),
        `${where}: ${records[0]!.id} omits sitting executive ${id}`,
      ).toBe(true);
    for (const id of named)
      expect(
        sitting.has(id),
        `${where}: ${records[0]!.id} names ${id}, not a sitting executive`,
      ).toBe(true);
    if (!sitting.size) {
      tried.push(`${where}: no full-person executive sits over the town`);
      continue;
    }
    return;
  }
  throw new Error(`no place proved it: ${tried.join("; ")}`);
}, 1_800_000);
