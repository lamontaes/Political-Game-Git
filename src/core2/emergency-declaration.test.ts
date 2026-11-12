/**
 * A governor declares a state of emergency (pool items
 * office-declare-an-emergency-needs-opus-core-s and
 * world-governor-declares-emergency-in-play): in a played year the sitting
 * governor answers a federally declared disaster the day it is recorded, where
 * the state's law gives the power, with no hand call; the declaration cites a
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
  for (let draw = 0; draw < 30; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "declare-emergency");
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    tried.push(`${place.name} (${place.key})`);
    const core = world.core;
    const api = coreAPI(core);
    const horizon = addDays(makeIsoDate(core.date), 700);
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
    // The governor is not the player here: the engine answers the disaster
    // the day it is recorded (world-governor-declares-emergency-in-play).
    expect(memberKey(governor), where).not.toBe(core.playerId);
    const state = governments(api).find((g) => g.level === "state")!;
    const spending = (): number =>
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
    advanceCore(core, addDays(makeIsoDate(ahead.begins), -1));
    const before = spending();
    advanceCore(core, addDays(makeIsoDate(ahead.begins), 1));
    const hazard = [...core.durableLog.values()].find(
      (row) =>
        row.kind === "hazard.disaster" &&
        row.facts?.disasterNumber === String(ahead.number),
    );
    expect(hazard, `${where}: disaster ${ahead.number}`).toBeDefined();
    const declared = (
      api
        .moduleState(EXECUTIVE_MODULE_ID)
        .table("emergencies")
        .rows() as unknown as {
        id: string;
        executiveId: string;
        hazardRecordId: string;
        basis: string;
        deltaMinor: number;
      }[]
    ).find((r) => r.hazardRecordId === hazard!.id);
    expect(
      declared,
      `${where}: no declaration for ${hazard!.id}`,
    ).toBeDefined();
    expect(declared!.executiveId, where).toBe(memberKey(governor));
    expect(declared!.basis, where).toContain("emergency");
    expect(declared!.deltaMinor, where).toBeGreaterThan(0);
    expect(spending() - before, where).toBe(declared!.deltaMinor);
    // The declaration is on the record and in the news, citing the disaster.
    const event = core.durableLog.get(`emergency-declared:${declared!.id}`);
    expect(event?.news, where).toBe(true);
    expect(event?.facts?.hazardRecordId, where).toBe(hazard!.id);
    // Only the sitting governor may declare, and once a disaster.
    expect(() =>
      declareEmergency(api, {
        executiveId: "person:nobody",
        hazardRecordId: hazard!.id,
      }),
    ).toThrow();
    expect(() =>
      declareEmergency(api, {
        executiveId: memberKey(governor),
        hazardRecordId: hazard!.id,
      }),
    ).toThrow();
    process.stdout.write(
      `EMERGENCY ${where}: ${hazard!.id} declared by ${declared!.executiveId} as ${declared!.id}, state budget line up ${declared!.deltaMinor}\n`,
    );
    return;
  }
  throw new Error(`No drawn state had a disaster to come: ${tried.join("; ")}`);
}, 3_600_000);
