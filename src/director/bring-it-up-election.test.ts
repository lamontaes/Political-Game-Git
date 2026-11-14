import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { advanceCore } from "../core2/life";
import { coreAPI } from "../core2/state";
import type { CoreState, IsoDate } from "../core2/types";
import {
  ELECTIONS_MODULE_ID,
  type FilingRow,
} from "../core2/modules/elections";
import { bringItUp, resultLean } from "./bring-it-up";

// After a count, a person who read the result brings it up: who won, and,
// for a person clearly with or against the winner's party, how it sits with
// them. Each world opens a week before the November 3, 2026 count and lives
// through it to the week after, on the engines' own calendar (the count, the
// paper, the reading). Pinned places and seeds (found by drawing, Nov 14).
const PLACES = [
  {
    name: "Sheridan, Wyoming",
    key: "5669845",
    seed: "5c66d25fa63c1ee8adb53909d641ab9d36015cebcc0726284859fc46b07ea7aa",
  },
  {
    name: "Arkadelphia, Arkansas",
    key: "0501870",
    seed: "21010b62bd4246a31e542b9adccfab253f0def8aa4057d00ff76a0a6fee5adf7",
  },
  {
    name: "Astoria, Oregon",
    key: "4103150",
    seed: "0c04a6002f604427e427591b0e1749643730d79a9b5ed334c1a9e3ab91be8e63",
  },
] as const;
const OPENS = "2026-10-27" as IsoDate;
const WEEK_AFTER = "2026-11-10" as IsoDate;

describe.each(PLACES)("a race's result brought up in $name", (place) => {
  it("is told by tellers with, against and with no clear lean, each citing the result", () => {
    setBookkeeping(false);
    try {
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      const world = buildBenchWorld(place.seed, OPENS, {
        twoLevel: true,
        placeKey: place.key,
      });
      const core = world.core as CoreState;
      const playerId = world.playerId!;
      advanceCore(core, WEEK_AFTER);
      const seen = new Map<string, string[]>();
      for (const person of core.people.values()) {
        if (seen.size === 3) break;
        if (!person.alive || person.tier === "husk" || person.id === playerId)
          continue;
        const said = bringItUp(core, person.id, playerId);
        if (!said?.resultId) continue;
        const result = core.durableLog.get(said.resultId)!;
        expect(result.kind, where).toBe("election-result");
        const lean = resultLean(core, result, person.id);
        const side = lean?.side ?? "none";
        const texts = said.lines.map((line) => line.text);
        const winner = core.people.get(String(result.facts?.winnerId));
        const named = `${winner?.givenName} ${winner?.familyName}`;
        // Every line stands on the result; the winner is named once.
        for (const line of said.lines)
          expect(line.sourceRecordIds, `${where}: ${line.text}`).toContain(
            result.id,
          );
        expect(texts.join(" ").split(named).length - 1, texts.join(" / ")).toBe(
          1,
        );
        // A lean line only for a teller with a lean; a ballot line only on
        // their ballot for the winner; no figure.
        expect(texts.length, `${where}: ${texts.join(" / ")}`).toBe(
          lean ? 2 : 1,
        );
        if (texts.some((text) => text.startsWith("I voted for")))
          expect(lean?.ballotId, texts.join(" / ")).toBeTruthy();
        for (const text of texts) expect(text, where).not.toMatch(/\d/);
        if (!seen.has(side)) seen.set(side, texts);
      }
      expect(
        [...seen.keys()].sort(),
        `${where}: ${JSON.stringify([...seen])}`,
      ).toEqual(["against", "none", "with"]);
      // Nobody tells a candidate how their own race came out.
      const filings = coreAPI(core)
        .moduleState(ELECTIONS_MODULE_ID)
        .table("filings")
        .rows() as unknown as FilingRow[];
      const candidate = filings.find(
        (f) =>
          core.people.get(f.personId)?.alive &&
          core.durableLog.has(`election-result:${f.contestId}`),
      );
      expect(
        candidate,
        `${where}: no candidate in a counted race`,
      ).toBeTruthy();
      const own = `election-result:${candidate!.contestId}`;
      for (const person of core.people.values()) {
        if (!person.alive || person.tier === "husk") continue;
        if (person.id === candidate!.personId) continue;
        expect(
          bringItUp(core, person.id, candidate!.personId)?.resultId,
          where,
        ).not.toBe(own);
      }
    } finally {
      setBookkeeping(true);
    }
  }, 300_000);
});
