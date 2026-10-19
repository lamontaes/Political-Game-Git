/**
 * The situation room (pool item office-stopgap-office-day-federal-president-
 * missing-record, SG-OFFICE-FED-situation-room): a disaster the disasters
 * engine writes from a FEMA declaration opens the president's situation room
 * with the department that answers it, and the daily brief tells the
 * president. A random place from all 56 whose county has a disaster that
 * begins in the next year.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { addDays, makeIsoDate } from "./kernel/dates";
import { gameStartDate } from "./game-start";
import { advanceCore } from "./life";
import { townDisasters } from "./modules/disasters";
import { OFFICES_MODULE_ID, type TermRow } from "./modules/offices";
import {
  cabinetOf,
  crisesToday,
  dailyBrief,
} from "./office-day-federal-president";
import { federalParameter } from "./office-day-federal";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it("opens the situation room on a disaster record, with the department that answers it", () => {
  const tried: string[] = [];
  for (let draw = 0; draw < 12; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "situation-room");
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    tried.push(`${place.name} (${place.key})`);
    const core = world.core;
    const api = coreAPI(core);
    const horizon = addDays(makeIsoDate(core.date), 330);
    const ahead = townDisasters(api)
      .filter((row) => row.begins > core.date && row.begins < horizon)
      .sort((a, b) => a.begins.localeCompare(b.begins))[0];
    if (!ahead) continue;
    const where = `${place.name} (${place.key}), seed ${seed}:${draw}`;
    expect(crisesToday(api), where).toEqual([]);
    advanceCore(core, addDays(makeIsoDate(ahead.begins), 2));
    const crisis = crisesToday(api).find((row) =>
      row.recordId.startsWith(`disaster:${ahead.number}:`),
    );
    expect(crisis, `${where}: disaster ${ahead.number}`).toBeDefined();
    expect(crisis!.began, where).toBe(ahead.begins);
    expect(crisis!.department, where).toContain("Department of");
    expect(core.durableLog.get(crisis!.recordId)?.kind, where).toBe(
      "hazard.disaster",
    );
    // The secretary is whoever holds the post now, none while it is vacant.
    expect(crisis!.secretaryId, where).toBe(
      cabinetOf(api).find((row) => row.postId === crisis!.postId)?.holderId ??
        null,
    );
    // The president is told: the brief records the crisis with its source record.
    const president = (
      api
        .moduleState(OFFICES_MODULE_ID)
        .table("terms")
        .query("bySeatStatus", [
          "seat:US:president",
          "serving",
        ]) as unknown as TermRow[]
    )[0]!.personId;
    dailyBrief(api, president);
    expect(
      api.knows(president, `brief:crisis:${crisis!.recordId}`),
      where,
    ).toBeDefined();
    // The room closes once the days it stays open on a crisis have run.
    advanceCore(
      core,
      addDays(
        makeIsoDate(ahead.begins),
        federalParameter("situationRoomOpenDays") + 1,
      ),
    );
    expect(
      crisesToday(api).some((row) => row.recordId === crisis!.recordId),
      where,
    ).toBe(false);
    return;
  }
  throw new Error(`No drawn town had a disaster to come: ${tried.join("; ")}`);
}, 3_600_000);
