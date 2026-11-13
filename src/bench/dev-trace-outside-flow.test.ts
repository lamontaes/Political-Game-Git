/**
 * Dev mode's Trace on a seller's outside buyers' flow opens the residents
 * engine's flow record, whose source line names the sector and the country
 * tier's records it followed this month (the seller's state's row and the
 * nation). A drawn place is played 35 days through dev mode's own advance, so
 * the macro module has scaled outside sales at least once. The place and seed
 * are printed; replay with DEV_TRACE_SEED.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { residentsRuntime } from "../core2/modules/residents";
import { COUNTRY_SECTORS } from "../core2/country-model";
import { DevMode } from "./dev-mode";
import { BenchPlayer } from "./player";
import { buildBenchWorld } from "./world";

const seed = process.env.DEV_TRACE_SEED ?? randomBytes(8).toString("hex");
const DAYS = 35;

const drawn = drawPlace(seed, "dev-trace-outside-flow");
const world = buildBenchWorld(drawn.seed, gameStartDate(), {
  twoLevel: true,
  placeKey: drawn.key,
});
const { core, director, playerId } = world;
const where = `${world.place.displayName} (${drawn.key}), seed ${seed}`;
const player = new BenchPlayer(core, director!);
player.select(playerId!);
const dev = new DevMode(core, director, player, world.placeId);

describe(`dev trace, outside buyers' flow: ${where}`, () => {
  it("Trace on an outside-sales flow names the sector and the state it followed", () => {
    dev.advance(addDays(makeIsoDate(core.date), DAYS));
    const flow = [...residentsRuntime(core)!.flows.values()].find(
      (row) => row.kind === "outside-sales" && !row.endedAt,
    );
    expect(flow, `${where}: no live outside-sales flow`).toBeDefined();
    const node = dev.trace(flow!.id);
    expect(node.engine, `${where}: ${flow!.id}`).toBe("core2-residents.flows");
    const line = String(
      (node.record as { source?: { estimatedFrom?: unknown } }).source
        ?.estimatedFrom ?? "",
    );
    const sector = COUNTRY_SECTORS.find((name) =>
      line.includes(`follow ${name} sales in `),
    );
    expect(sector, `${where}: ${flow!.id} says "${line}"`).toBeDefined();
    expect(line, `${where}: ${flow!.id}`).toMatch(
      /sales in (country-state:\S+ for the \d+% sold at home|the nation)/,
    );
    process.stdout.write(
      `dev-trace-outside-flow ${where}: ${flow!.id}: ${line}\n`,
    );
  });
});
