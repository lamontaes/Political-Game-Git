import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { PLATFORM_QUESTIONS } from "./campaign-data";
import { personLean } from "./campaign-views";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { agreementWith } from "./modules/views";
import { coreAPI } from "./state";

/**
 * A kept agreement (`agreementWith`, Speed, Nov 11) is the number a fresh
 * read gives, after the world has played on with the keeping in force: every
 * writer of a stance a kept agreement read has reset it. With bookkeeping on,
 * nothing is kept, so that read is the fresh one.
 */
const seed = process.env.AGREEMENT_KEPT_SEED ?? randomBytes(8).toString("hex");

describe("kept agreements", () => {
  const place = drawPlace(seed, "agreement-kept");
  it(`match a fresh read after 40 played days (${place.name}, seed ${seed})`, () => {
    const was = setBookkeeping(false);
    try {
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const api = coreAPI(world.core);
      const adults = [...world.core.people.values()]
        .filter((p) => p.alive)
        .slice(0, 400);
      const platforms = [0, 3, 6].map((at) =>
        PLATFORM_QUESTIONS.slice(at, at + 4).map((question, i) => ({
          question,
          position: i % 2 ? -1 : 1,
        })),
      );
      const read = () =>
        adults.flatMap((p) =>
          platforms.map((platform) =>
            agreementWith(
              api,
              p.id,
              personLean(world.core.people, p, 0),
              platform,
            ),
          ),
        );
      read();
      advanceCore(world.core, addDays(makeIsoDate(world.core.date), 40));
      const kept = read();
      setBookkeeping(true);
      const fresh = read();
      expect(kept).toEqual(fresh);
      expect(kept.length).toBe(adults.length * platforms.length);
    } finally {
      setBookkeeping(was);
    }
  }, 600_000);
});
