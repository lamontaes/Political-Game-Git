/**
 * A governor declares a state of emergency (pool item
 * office-declare-an-emergency-needs-opus-core-s): the declaration cites a
 * disaster record from the disasters engine and the state's researched power,
 * and the state's budget line moves by its share of the non-federal cost of
 * the aid FEMA obligated, recorded with the declaration. A random place from
 * all 56 whose county has a disaster with aid to come.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { addDays, makeIsoDate } from "./kernel/dates";
import { gameStartDate } from "./game-start";
import { advanceCore } from "./life";
import { BUDGETS_MODULE_ID, governments } from "./modules/budgets";
import { federalAidFor, townDisasters } from "./modules/disasters";
import {
  declareEmergency,
  emergencyPower,
  EXECUTIVE_MODULE_ID,
} from "./modules/executive";
import { memberKey } from "./modules/legislature";
import { townSeats } from "./modules/offices";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it("moves the state's budget line by the declaration's share of the non-federal cost", () => {
  const tried: string[] = [];
  for (let draw = 0; draw < 14; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "declare-emergency");
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    tried.push(`${place.name} (${place.key})`);
    const core = world.core;
    const api = coreAPI(core);
    const horizon = addDays(makeIsoDate(core.date), 330);
    const ahead = townDisasters(api)
      .filter(
        (row) =>
          row.begins > core.date &&
          row.begins < horizon &&
          federalAidFor(api, row.number) > 0,
      )
      .sort((a, b) => a.begins.localeCompare(b.begins))[0];
    const governor = townSeats(api).find(
      (s) => s.office.kind === "governor",
    )?.holder;
    if (!ahead || !governor || !emergencyPower(api)) continue;
    const where = `${place.name} (${place.key}), seed ${seed}:${draw}`;
    advanceCore(core, addDays(makeIsoDate(ahead.begins), 1));
    const hazard = [...core.durableLog.values()].find(
      (row) =>
        row.kind === "hazard.disaster" &&
        row.facts?.disasterNumber === String(ahead.number),
    );
    expect(hazard, `${where}: disaster ${ahead.number}`).toBeDefined();
    const state = governments(api).find((g) => g.level === "state")!;
    const spendingBefore = (): number =>
      (
        api
          .moduleState(BUDGETS_MODULE_ID)
          .table("budgets")
          .rows() as unknown as {
          governmentId?: string;
          id: string;
          spendingMinor: Record<string, number>;
        }[]
      )
        .filter((row) => row.id.startsWith(`budget:${state.id}:`))
        .reduce((sum, row) => sum + (row.spendingMinor.otherPrograms ?? 0), 0);
    const before = spendingBefore();
    // Only the sitting governor may declare.
    expect(() =>
      declareEmergency(api, {
        executiveId: "person:nobody",
        hazardRecordId: hazard!.id,
      }),
    ).toThrow();
    const row = declareEmergency(api, {
      executiveId: memberKey(governor),
      hazardRecordId: hazard!.id,
    });
    expect(row.hazardRecordId, where).toBe(hazard!.id);
    expect(row.basis, where).toContain("emergency");
    expect(row.deltaMinor, where).toBeGreaterThan(0);
    expect(spendingBefore() - before, where).toBe(row.deltaMinor);
    // The declaration is on the record and in the news, citing the disaster.
    const event = core.durableLog.get(`emergency-declared:${row.id}`);
    expect(event?.news, where).toBe(true);
    expect(event?.facts?.hazardRecordId, where).toBe(hazard!.id);
    expect(
      api.moduleState(EXECUTIVE_MODULE_ID).table("emergencies").get(row.id),
      where,
    ).toBeDefined();
    // One declaration per disaster.
    expect(() =>
      declareEmergency(api, {
        executiveId: memberKey(governor),
        hazardRecordId: hazard!.id,
      }),
    ).toThrow();
    return;
  }
  throw new Error(`No drawn state had a disaster to come: ${tried.join("; ")}`);
}, 3_600_000);
