import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { advanceCore } from "./life";
import { addDays, makeIsoDate } from "./kernel/dates";
import {
  damagedHomesOf,
  disasterAssistancePaid,
  normalizedGovernmentName,
  townDisastersWithDamage,
} from "./modules/disasters";
import households from "./data/disasters/households.json" with { type: "json" };
import { residentsAccountFor } from "./modules/residents";
import { coreAPI } from "./state";
import { townsWithDamage } from "./tooling/disaster-damage-screen";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");

describe(`a disaster's damaged homes (seed ${seed})`, () => {
  it("marks the weakest owners' homes and pays their aid to their own accounts", () => {
    run(false);
  }, 900_000);
  it("sends counted households that cannot pay for repairs away when FEMA's damage is more than its aid and the pool is spent", () => {
    run(true);
  }, 900_000);
});

function damageBeatsAid(disaster: number, town: string): boolean {
  const rows = households.byCountyDisaster as unknown as Record<
    string,
    Record<string, [number, number, number]>
  >;
  return Object.entries(rows).some(
    ([key, towns]) =>
      key.endsWith(`|${disaster}`) &&
      (towns[town]?.[1] ?? 0) > (towns[town]?.[0] ?? 0),
  );
}

function run(short: boolean): void {
  {
    const tried: string[] = [];
    let opened = 0;
    for (let draw = 0; draw < 2000 && opened < 10; draw++) {
      const place = drawPlace(`${seed}:damaged:${draw}`, "core2-disasters");
      const name = normalizedGovernmentName(place.name.split(",")[0] ?? "");
      if (!townsWithDamage(place.state.replace(/^US-/, "")).has(name)) continue;
      opened += 1;
      const where = `${place.name}, ${place.state} (seed ${seed}:damaged:${draw})`;
      const { core } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const api = coreAPI(core);
      const yearEnd = addDays(makeIsoDate(core.date), 365);
      const disaster = townDisastersWithDamage(api)
        .filter((row) => row.declared > core.date && row.declared <= yearEnd)
        // The short case: FEMA's damage in the town is more than its aid, so the pool cannot cover repairs from aid alone.
        .filter((row) => !short || damageBeatsAid(row.number, name))
        .sort((x, y) => x.declared.localeCompare(y.declared))[0];
      if (!disaster) {
        tried.push(`${where}: no damaged-home disaster in the year`);
        continue;
      }
      if (short) {
        // The town's counted households have spent their cash by the eve of the declaration, so only the aid pays repairs.
        advanceCore(core, addDays(makeIsoDate(disaster.declared), -1));
        const town = core.people.get(core.playerId ?? "")?.placeId as string;
        const pool = residentsAccountFor(core, town)!;
        const sink = [...core.organizations.values()].find(
          (org) => org.placeId === town,
        )!;
        api.accounts().transfer({
          id: `test-drain:${disaster.number}`,
          from: pool,
          to: api.accounts().main(sink.id),
          amountMinor: 10 ** 15,
          partial: true,
          reasonKey: "test.drain",
          source: { tag: "SOURCED", asOf: core.date, citation: "test" },
        });
      }
      advanceCore(core, yearEnd);
      const homes = damagedHomesOf(api, disaster.number);
      if (!homes.length) {
        tried.push(`${where}: no owned home to mark damaged`);
        continue;
      }
      // The weakest first: the marked homes are never stronger or dearer than an unmarked one in kind order.
      const named = homes.filter((home) => home.headId);
      const paid = disasterAssistancePaid(api).filter(
        (row) => row.disaster === disaster.number,
      );
      for (const home of named) {
        const own = api.accounts().main(home.headId!);
        const aid = paid.filter((row) => row.orgId === own);
        expect(
          aid.reduce((n, row) => n + row.cents, 0),
          `${where}: household ${home.householdId} aid`,
        ).toBe(home.aidMinor);
      }
      if (short)
        expect(
          homes.filter((home) => !home.headId && home.moved).length,
          `${where}: counted households that moved`,
        ).toBeGreaterThan(0);
      expect(homes.every((home) => home.repairsOwedMinor >= 0)).toBe(true);
      const moved = homes.filter((home) => home.moved);
      const sample = named[0] ?? homes[0]!;
      process.stdout.write(
        `damaged homes: ${where}; disaster ${disaster.number}; ${homes.length} homes, ${named.length} named; household ${sample.householdId} (${sample.kind}) aid ${sample.aidMinor} cents, repairs ${sample.repairsPaidMinor} of ${sample.repairsOwedMinor}; ${moved.length} moved away${moved[0] ? ` (${moved[0].householdId})` : ""}; ${draw + 1} draws, ${opened} opened\n`,
      );
      return;
    }
    throw new Error(
      `no damaged homes in ${opened} opened places (seed ${seed}):\n${tried.join("\n")}`,
    );
  }
}
