/**
 * An organization that enters the world after day one has an entry record that
 * names its cause (pool item core-entry-records-name-no-cause). In a drawn
 * place (replay with ENTRY_CAUSE_SEED) the world runs until a business is
 * founded; its `organization.recorded` entry holds `causeId`, the id of the
 * `organization.founded` event, which exists on the record. The place and seed
 * are in every message; the test draws more places, up to a bound, until a
 * business is founded in the window.
 */
import { createHash, randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";

const base = process.env.ENTRY_CAUSE_SEED ?? randomBytes(8).toString("hex");
const ATTEMPTS = 4;
const DAYS = 365;

it(`a business's entry record names the founding that put it in the world (seed ${base})`, () => {
  const tried: string[] = [];
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const seed = createHash("sha256")
      .update(`${base}:${attempt}`)
      .digest("hex");
    const place = drawPlace(seed, "entry-cause");
    const where = `${place.name} (${place.key}), seed ${seed}`;
    const was = setBookkeeping(false);
    try {
      const { core } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      advanceCore(core, addDays(makeIsoDate(core.date), DAYS));
      const founded = [...core.eventIds].filter((id) =>
        id.startsWith("event:organization.founded:"),
      );
      if (!founded.length) {
        tried.push(`${where}: no business founded in ${DAYS} days`);
        continue;
      }
      let named = 0;
      for (const foundedId of founded) {
        const organizationId = foundedId.slice(
          "event:organization.founded:".length,
        );
        const entries = [...core.eventIds].filter((id) =>
          id.startsWith(`organization.recorded:${organizationId}:`),
        );
        // A business founded on the world's first day is the opening's own.
        if (!entries.length) continue;
        const entry = core.durableLog.get(entries[0]!) as
          { facts?: Record<string, string> } | undefined;
        expect(
          entry?.facts?.causeId,
          `${where}: ${entries[0]} names no cause`,
        ).toBe(foundedId);
        named += 1;
      }
      expect(
        named,
        `${where}: founded businesses with an entry record`,
      ).toBeGreaterThan(0);
      console.log(
        `entry-cause: ${where}; ${founded.length} businesses founded in ${DAYS} days, ${named} entry records name their founding; first ${founded[0]}`,
      );
      return;
    } finally {
      setBookkeeping(was);
    }
  }
  throw new Error(
    `no drawn place founded a business: ${tried.join("; ")} (seed ${base})`,
  );
}, 3_600_000);
