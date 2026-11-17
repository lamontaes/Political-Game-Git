/**
 * Day one's President is the century's (owner, Nov 17, 2026, CTO line 6935086070 on #9747: "History
 * is pure simulation from 1925 ... Day one is whatever that history produced"; "the 2024 result
 * doesn't matter"). The century runs every presidential election from 1928 on the one count, and
 * the offices engine seats its 2024 winner; under the world setting "today" the real record holds.
 * Every world is a drawn place (skill drawn-place-tests); each assertion names it and its seed.
 */
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { candidateReasons, electorateParameter } from "./electorate-inputs";
import {
  centuryOf,
  centuryPresidency,
  setHistoryMode,
} from "./electorate-century";
import { gameStartDate } from "./game-start";
import { presidentElection } from "./modules/national-opinion";
import { OFFICES_MODULE_ID, type TermRow } from "./modules/offices";
import { coreAPI } from "./state";
import { contestedStates2024 } from "./officials-president";

const RUN = `history-president:${Date.now()}`;

function presidentTerms(world: ReturnType<typeof buildBenchWorld>) {
  const terms = coreAPI(world.core)
    .moduleState(OFFICES_MODULE_ID)
    .table("terms");
  const of = (status: string) =>
    terms.query("bySeatStatus", [
      "seat:US:president",
      status,
    ]) as unknown as TermRow[];
  return { serving: of("serving")[0], ended: of("ended") };
}

describe("the century elects day one's President", () => {
  it("seats the century's 2024 winner, with the century's career and race, at two drawn places", () => {
    setBookkeeping(false);
    for (let i = 0; i < 2; i += 1) {
      const place = drawPlace(`${RUN}:${i}`, "history-president");
      const where = `${place.name} (${place.key}), world seed ${place.seed}`;
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const century = centuryPresidency(place.seed, gameStartDate());
      expect(century, where).toBeDefined();
      const { serving, ended } = presidentTerms(world);
      // The party the century's 2024 count gave the office, not the real one.
      expect(serving?.party, where).toBe(century!.winnerParty);
      // A President the century elected twice served the term before (no term invented
      // otherwise), so their service began four years earlier.
      expect(ended.length, where).toBe(century!.personTerms - 1);
      expect(serving?.serviceStart, where).toBe(
        century!.personTerms > 1 ? "2021-01-20" : "2025-01-20",
      );
      // The race behind the term is the century's: its date, and its share of the popular
      // vote to the whole vote (the past race keeps whole votes).
      const election = presidentElection(coreAPI(world.core));
      expect(election?.date, where).toBe("2024-11-05");
      expect(election!.share, where).toBeCloseTo(century!.winnerShare, 6);
    }
  }, 240_000);

  it("differs between drawn worlds: both parties hold the office on day one somewhere", () => {
    const parties = new Map<string, string>();
    for (let i = 0; i < 20; i += 1) {
      const place = drawPlace(`${RUN}:worlds:${i}`, "history-president");
      parties.set(
        `${place.name} (${place.key}), world seed ${place.seed}`,
        centuryOf(place.seed, gameStartDate()).presidencies.at(-1)!.winnerParty,
      );
    }
    const seen = new Set(parties.values());
    expect(
      seen.size,
      `day one's President by drawn world: ${JSON.stringify([...parties])}`,
    ).toBe(2);
  }, 120_000);

  it("gives every century election to the side its states' electors chose", () => {
    const place = drawPlace(`${RUN}:electors`, "history-president");
    const where = `${place.name} (${place.key}), world seed ${place.seed}`;
    for (const row of centuryOf(place.seed, gameStartDate()).presidencies) {
      const electors = (side: number) =>
        row.states
          .filter((s) => s.winnerSide === side)
          .reduce((n, s) => n + s.electors, 0);
      expect(row.electoral.republican, `${where}, ${row.year}`).toBe(
        electors(1),
      );
      expect(row.electoral.democratic, `${where}, ${row.year}`).toBe(
        electors(-1),
      );
      if (!row.noMajority)
        expect(
          row.winnerSide > 0
            ? row.electoral.republican
            : row.electoral.democratic,
          `${where}, ${row.year}`,
        ).toBeGreaterThanOrEqual(270);
    }
  });

  it("weighs a party's time in the White House: two straight terms or more cost it the research's share", () => {
    const conditions = {
      cycle: "presidential" as const,
      federal: true,
      typicalSpendPerVote: 0,
      raceVotes: 1,
      approvalGapPoints: 0,
      town: null,
    };
    const candidate = (partyTermsHeld: number) => ({
      id: "party:R",
      party: "Republican",
      side: 1,
      incumbent: false,
      experienced: true,
      spentMinor: null,
      record: 0,
      presidentsParty: true,
      seatPartyHolder: true,
      partyTermsHeld,
    });
    const second = candidateReasons(candidate(1), conditions);
    const third = candidateReasons(candidate(2), conditions);
    expect(second.timeForChange).toBe(0);
    expect(third.timeForChange).toBeCloseTo(
      -electorateParameter("timeForChangeShare"),
      12,
    );
    expect(second.total - third.total).toBeCloseTo(
      electorateParameter("timeForChangeShare"),
      12,
    );
  });

  it('keeps today\'s real record under the world setting "today"', () => {
    setBookkeeping(false);
    const place = drawPlace(`${RUN}:today`, "history-president");
    const where = `${place.name} (${place.key}), world seed ${place.seed}`;
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
      settings: { history: "today" },
    });
    expect(centuryPresidency(place.seed, gameStartDate()), where).toBe(
      undefined,
    );
    // data/research/offices/federal-executive-2026.json: the real office's party.
    expect(presidentTerms(world).serving?.party, where).toBe("Republican");
  }, 120_000);

  it("leaves states near even in a close year: no drawn world with an even 2024 has no contested state", () => {
    // Each state's 1925 shift may be any size (electorate-century.ts centuryShift). A floor on it
    // left no state near the nation, so a world whose 2024 was even had no state near 50%
    // (#9820's guards, realistic-not-real row 42, Kingfield, Maine, seed cab9fef34d92ab59).
    const empty: string[] = [];
    let close = 0;
    for (let i = 0; i < 24; i += 1) {
      const place = drawPlace(`${RUN}:contested:${i}`, "history-president");
      setHistoryMode(place.seed, "century", gameStartDate());
      const last = centuryOf(place.seed, gameStartDate()).presidencies.at(-1)!;
      if (Math.abs(last.republicanShare - 0.5) > 0.02) continue;
      close += 1;
      if (!contestedStates2024(place.seed, gameStartDate()).length)
        empty.push(
          `${place.name} (${place.key}), world seed ${place.seed}: ${(last.republicanShare * 100).toFixed(1)}% R`,
        );
    }
    expect(
      close,
      "drawn worlds with a 2024 within 2 points of even",
    ).toBeGreaterThan(0);
    expect(empty, "close worlds with no contested state").toEqual([]);
  }, 120_000);
});
