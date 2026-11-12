/**
 * A town post's `official-appointed` record names the appointer as well as the
 * appointee when the appointer is a full person, and keeps the people the
 * appointer weighed (pool item world-appointment-names-the-appointer). A place
 * drawn from all 56; GOLDEN_PATH_SEED pins the draws.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import type { PersonId } from "./types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it(`every town post's appointment record names its appointer when they are a full person (seed ${seed})`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  for (let draw = 0; draw < 8; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "appointment-names-appointer");
    const where = `${place.name} (${place.key}), place seed ${place.seed}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    advanceCore(core, addDays(makeIsoDate(core.date), 120));
    const records = [...(core.logByKind.get("official-appointed") ?? [])]
      .map((id) => core.durableLog.get(id as never)!)
      .filter((row) => row.id.startsWith("appointed:appointment:town:"));
    let named = 0;
    for (const row of records) {
      const by = String(row.facts?.appointedBy);
      // A full person appointer (a key that is a person here) is on the record.
      if (core.people.has(by as PersonId)) {
        expect(
          row.personIds,
          `${where}: ${row.id} omits its appointer ${by}`,
        ).toContain(by);
        named += 1;
      }
      expect(
        row.facts?.ranked,
        `${where}: ${row.id} keeps no ranked candidates`,
      ).toBeTruthy();
      expect(row.personIds, `${where}: ${row.id}`).toContain(
        row.facts?.appointee as PersonId,
      );
    }
    if (!records.length || !named) {
      tried.push(
        `${where}: ${records.length} town appointments, ${named} by a full person`,
      );
      continue;
    }
    return;
  }
  throw new Error(`no place proved it: ${tried.join("; ")}`);
}, 1_800_000);
