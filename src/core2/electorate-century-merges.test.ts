/**
 * A founded party merges into the national party nearest it when its share of the vote has fallen
 * in each of several straight presidential races (History family 9b part 3, plan 6952133362 on
 * #9747). Every world is a drawn place (skill drawn-place-tests); each assertion names it and
 * its seed.
 */
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import {
  centuryOf,
  centuryParameter,
  foundedPartyHasFallen,
  nearestParty,
  setHistoryMode,
  type CenturyParty,
} from "./electorate-century";
import { gameStartDate } from "./game-start";

const RUN = `history-merges:${Date.now()}`;

function party(side: number, position: number): CenturyParty {
  return {
    id: `party:${side}`,
    name: "x",
    side,
    founded: null,
    positions: [{ year: 2000, position }],
  };
}

describe("the rule that ends a founded party", () => {
  // Rare in a drawn world, so the rule is checked on shares built to meet it (drawn-place-tests:
  // build a rare case, do not search for it).
  it("ends a party only when its share fell in every one of the last races", () => {
    const falls = centuryParameter("centuryFoundedPartyFallCycles");
    const falling = Array.from({ length: falls + 1 }, (_, i) => 0.3 - 0.05 * i);
    expect(foundedPartyHasFallen(falling)).toBe(true);
    // One race that held or rose keeps it standing.
    expect(
      foundedPartyHasFallen([...falling.slice(0, -1), falling.at(-2)!]),
    ).toBe(false);
    expect(
      foundedPartyHasFallen([
        ...falling.slice(0, 1),
        0.31,
        ...falling.slice(2),
      ]),
    ).toBe(false);
    // Too few races to have fallen that many times.
    expect(foundedPartyHasFallen(falling.slice(1))).toBe(false);
    // A long history only reads its last races.
    expect(foundedPartyHasFallen([0.1, 0.05, ...falling])).toBe(true);
  });

  it("joins the national party whose position stood nearest it, on either side", () => {
    const parties = [party(-1, -0.2), party(1, 0.6)];
    expect(nearestParty(parties, 2004, 0.1).id).toBe("party:-1");
    expect(nearestParty(parties, 2004, 0.3).id).toBe("party:1");
    expect(nearestParty(parties, 2004, -0.5).id).toBe("party:-1");
  });
});

describe("a founded party that keeps losing voters merges into the party nearest it", () => {
  it("merges only after its share fell in every one of the last races, into the nearest national party, in drawn worlds", () => {
    const falls = centuryParameter("centuryFoundedPartyFallCycles");
    for (let i = 0; i < 8; i += 1) {
      const place = drawPlace(`${RUN}:${i}`, "history-merges");
      const where = `${place.name} (${place.key}), world seed ${place.seed}`;
      setHistoryMode(place.seed, "century", gameStartDate(), place.state);
      const century = centuryOf(place.seed, gameStartDate());
      for (const f of century.foundings) {
        const shares = century.presidencies
          .filter(
            (p) =>
              p.foundedParty?.id === f.id &&
              (f.endedYear === undefined || p.year <= f.endedYear),
          )
          .map((p) => p.foundedParty!.share);
        if (f.endedYear === undefined) {
          // Still standing: its share has not fallen in each of the last races.
          expect(
            foundedPartyHasFallen(shares),
            `${where}: ${f.id} should have merged`,
          ).toBe(false);
          expect(f.mergedInto, where).toBeUndefined();
          continue;
        }
        const recent = shares.slice(-(falls + 1));
        expect(recent, `${where}: ${f.id}'s last races`).toHaveLength(
          falls + 1,
        );
        recent.forEach((s, k) => {
          if (k > 0)
            expect(s, `${where}: ${f.id} race ${k}`).toBeLessThan(
              recent[k - 1]!,
            );
        });
        // Into the national party whose position stood nearest it going into that election.
        const nearest = century.parties
          .map((party) => ({
            id: party.id,
            gap: Math.abs(
              party.positions.filter((r) => r.year < f.endedYear!).at(-1)!
                .position - f.position,
            ),
          }))
          .sort((a, b) => a.gap - b.gap)[0]!;
        expect(f.mergedInto, `${where}: ${f.id}`).toBe(nearest.id);
        // Its ticket ends with the merge.
        for (const p of century.presidencies.filter(
          (p) => p.year > f.endedYear!,
        ))
          expect(p.foundedParty?.id, `${where}: ${p.id}`).not.toBe(f.id);
      }
    }
  }, 240_000);
});
