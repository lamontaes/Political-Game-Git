import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";

// An appointment's public record names who was appointed, so News, Government
// and the director read the same fact.
const seed = process.env.APPOINTEE_SEED ?? randomBytes(8).toString("hex");

describe(`official-appointed records (seed ${seed})`, () => {
  it("carry the appointee's person id in two drawn places", () => {
    const checked: string[] = [];
    const tried: string[] = [];
    for (let i = 0; i < 20 && checked.length < 2; i += 1) {
      const place = drawPlace(`${seed}:${i}`, "appointee-record");
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const core = world.core;
      advanceCore(core, addDays(makeIsoDate(core.date), 30));
      const records = [...core.durableLog.values()].filter(
        (e) => e.kind === "official-appointed",
      );
      if (!records.length) {
        tried.push(`${where}: no appointment in the first month`);
        continue;
      }
      for (const record of records) {
        const appointee = record.facts?.appointee;
        expect(
          appointee,
          `${where}: ${record.id} names its appointee`,
        ).toBeTypeOf("string");
        expect(
          core.people.has(appointee as string) ||
            core.husks.has(appointee as string),
          `${where}: ${record.id} appointee ${appointee} is a person in the world`,
        ).toBe(true);
        expect(record.personIds, `${where}: ${record.id}`).toContain(appointee);
      }
      checked.push(`${where}: ${records.length} appointments`);
    }
    expect(
      checked.length,
      `no two places with appointments: ${tried.join("; ")}`,
    ).toBe(2);
  }, 900_000);
});
