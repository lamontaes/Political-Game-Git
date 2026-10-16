import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { coreAPI } from "./state";

/**
 * A death in the played world leaves an estate that passes: a full resident
 * dies holding cash, probate closes, and the heirs (or the will's takers)
 * are paid by journal entry `estate:<dead>:<heir>`. Places are drawn in turn
 * until a year of one has such a death, as the other played-world tests do.
 */
describe("an estate in the played world", () => {
  it("passes a dead resident's cash to a named heir by journal entry", () => {
    const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
    const tried: string[] = [];
    for (let life = 0; life < 4; life += 1) {
      const place = drawPlace(`${seed}:${life}`, "estate-played");
      setBookkeeping(false);
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const core = world.core;
      const api = coreAPI(core);
      const paid: { id: string; to: string }[] = [];
      const post = api.postJournal.bind(api);
      api.postJournal = (entry) => {
        const id = String(entry.sourceRef.id);
        if (/^estate:person_[0-9a-f]+:person_[0-9a-f]+$/.test(id))
          paid.push({ id, to: id.split(":")[2]! });
        return post(entry);
      };
      for (let year = 0; year < 3 && !paid.length; year += 1)
        advanceCore(core, addDays(makeIsoDate(core.date), 365));
      if (paid.length) {
        const where = `${place.name}, seed ${seed}:${life}, ${paid[0]!.id}`;
        const [, dead, heir] = paid[0]!.id.split(":");
        expect(core.people.get(dead!)?.alive, where).toBe(false);
        expect(core.people.get(dead!)!.liquidMinor, where).toBe(0);
        expect(core.people.has(heir!), where).toBe(true);
        return;
      }
      tried.push(place.name);
    }
    throw new Error(
      `no resident left an estate in three years in ${tried.join("; ")} (seed ${seed})`,
    );
  }, 3_600_000);
});
