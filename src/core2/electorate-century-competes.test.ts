/**
 * A party founded in the century's history competes on the one count (History family 9b part 2,
 * plan 6952133362 on #9747; World B's yes to an optional candidate `position`, 6951002590): its
 * voters' appeal is how near their lean is to it, read only where a position is set, and it
 * stands a ticket in the presidential count from the next presidential year. Every world is a
 * drawn place (skill drawn-place-tests); each assertion names it and its seed.
 */
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { countParties } from "./electorate";
import type { CandidateInputs, RaceConditions } from "./electorate-inputs";
import {
  centuryOf,
  centuryParameter,
  setHistoryMode,
} from "./electorate-century";
import { gameStartDate } from "./game-start";

const RUN = `history-competes:${Date.now()}`;

const voters = Array.from({ length: 40 }, (_, i) => ({
  id: `v${i}`,
  rank: (i + 0.5) / 40,
  readiness: 1,
  incumbentLean: 0,
  weight: 1,
}));

const conditions: RaceConditions = {
  cycle: "presidential",
  federal: true,
  typicalSpendPerVote: 0,
  raceVotes: 1000,
  approvalGapPoints: 0,
  town: null,
};

function candidate(
  id: string,
  side: number,
  extra: Partial<CandidateInputs> = {},
): CandidateInputs {
  return {
    id,
    party: null,
    side,
    incumbent: false,
    experienced: false,
    spentMinor: null,
    record: 0,
    presidentsParty: false,
    seatPartyHolder: false,
    ...extra,
  };
}

function count(rightShare: number, field: readonly CandidateInputs[]) {
  return countParties(
    voters,
    [
      {
        id: "place",
        name: "place",
        eligible: 100_000,
        rightShare,
        votes2024: 100_000,
        source: "test",
      },
    ],
    field,
    conditions,
  ).counted.votes;
}

describe("a party off the two national sides competes by where it stands", () => {
  it("counts a party standing at a side's own end exactly as that side, so every count without a position is unchanged", () => {
    for (const right of [0.3, 0.5, 0.7]) {
      const bySide = count(right, [candidate("R", 1), candidate("D", -1)]);
      const byPosition = count(right, [
        candidate("R", 1, { position: 1 }),
        candidate("D", -1, { position: -1 }),
      ]);
      expect(byPosition, `race at right share ${right}`).toEqual(bySide);
    }
  });

  it("takes votes from both sides, more the more of a voter's appeal it holds", () => {
    const alone = count(0.5, [candidate("R", 1), candidate("D", -1)]);
    const took: number[] = [];
    for (const pull of [0.1, 0.4, 0.8]) {
      const votes = count(0.5, [
        candidate("R", 1),
        candidate("D", -1),
        candidate("C", 0, { position: 0, pull }),
      ]);
      expect(votes["R"], `pull ${pull}`).toBeLessThan(alone["R"]!);
      expect(votes["D"], `pull ${pull}`).toBeLessThan(alone["D"]!);
      took.push(votes["C"] ?? 0);
    }
    expect(took[0]!).toBeGreaterThan(0);
    expect(took[1]!).toBeGreaterThan(took[0]!);
    expect(took[2]!).toBeGreaterThan(took[1]!);
  });
});

describe("a founded party stands a ticket from the next presidential year", () => {
  it("is on no race before its founding and on every one from then until it merges, in drawn worlds", () => {
    const named: string[] = [];
    let founded = 0;
    for (let i = 0; i < 8; i += 1) {
      const place = drawPlace(`${RUN}:${i}`, "history-competes");
      const where = `${place.name} (${place.key}), world seed ${place.seed}`;
      named.push(where);
      setHistoryMode(place.seed, "century", gameStartDate(), place.state);
      const century = centuryOf(place.seed, gameStartDate());
      const first = century.foundings[0];
      for (const race of century.presidencies) {
        // A party stands from the race after its founding until the race it merges in.
        const standing = century.foundings.find(
          (f) =>
            f.year < race.year &&
            (f.endedYear === undefined || race.year <= f.endedYear),
        );
        if (!standing) {
          expect(race.foundedParty, `${where}: ${race.id}`).toBeUndefined();
          continue;
        }
        expect(race.foundedParty?.id, `${where}: ${race.id}`).toBe(standing.id);
        expect(
          race.foundedParty!.share,
          `${where}: ${race.id}`,
        ).toBeGreaterThan(0);
        expect(race.foundedParty!.share, `${where}: ${race.id}`).toBeLessThan(
          1,
        );
      }
      if (first) founded += 1;
    }
    expect(
      founded,
      `worlds that founded a party across ${named.join("; ")}`,
    ).toBeGreaterThan(0);
    expect(centuryParameter("centuryFoundedPartyPull")).toBeGreaterThan(0);
  }, 240_000);
});
