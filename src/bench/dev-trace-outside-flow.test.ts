/**
 * Dev mode's Trace on a seller's outside buyers' flow opens the residents
 * engine's flow record, whose source line names the sector and the country
 * tier's records it followed this month (the seller's state's row and the
 * nation). Each place is played 35 days through dev mode's own advance, so
 * the macro module has scaled outside sales at least once. Pinned (skill
 * `pinned-tests`): Woodland, Washington, where the drawn test ran 43 s beside
 * other world tests and went red at vitest's 30-second default; the world
 * seed is the one the old draw gave there. One place keeps the run near a
 * minute: building the world and 35 days take about 75 s.
 */
import { describe, expect, it } from "vitest";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { residentsRuntime } from "../core2/modules/residents";
import { COUNTRY_SECTORS } from "../core2/country-model";
import { DevMode } from "./dev-mode";
import { BenchPlayer } from "./player";
import { buildBenchWorld } from "./world";

const DAYS = 35;

const PLACES = [
  {
    name: "Woodland, Washington",
    key: "5379625",
    seed: "0b17a82c7aed73fdb7f2ef535619a7bfd54597cd0875af229e24dde4bee17990",
  },
];

describe("dev trace, outside buyers' flow", () => {
  for (const place of PLACES)
    it(`Trace on an outside-sales flow names the sector and the state it followed (${place.name})`, () => {
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const { core, director, playerId } = world;
      const where = `${place.name} (${place.key}), world seed ${place.seed}`;
      expect(world.place.displayName, where).toBe(place.name);
      const player = new BenchPlayer(core, director!);
      player.select(playerId!);
      const dev = new DevMode(core, director, player, world.placeId);
      dev.advance(addDays(makeIsoDate(core.date), DAYS));
      const flow = [...residentsRuntime(core)!.flows.values()].find(
        (row) => row.kind === "outside-sales" && !row.endedAt,
      );
      expect(flow, `${where}: no live outside-sales flow`).toBeDefined();
      const node = dev.trace(flow!.id);
      expect(node.engine, `${where}: ${flow!.id}`).toBe(
        "core2-residents.flows",
      );
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
    }, 200_000);
});
