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
  setHistoryMode,
} from "./electorate-century";
import { gameStartDate } from "./game-start";

const RUN = `history-merges:${Date.now()}`;

describe("a founded party that keeps losing voters merges into the party nearest it", () => {
  it("merges only after its share fell in every one of the last races, into the nearest national party, in drawn worlds", () => {
    const falls = centuryParameter("centuryFoundedPartyFallCycles");
    const named: string[] = [];
    let merged = 0;
    let standing = 0;
    // Draw worlds until one of each has been seen, within a bound (skill drawn-place-tests).
    for (let i = 0; i < 24 && (merged === 0 || standing === 0); i += 1) {
      const place = drawPlace(`${RUN}:${i}`, "history-merges");
      const where = `${place.name} (${place.key}), world seed ${place.seed}`;
      named.push(where);
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
          standing += 1;
          // Still standing: its share has not fallen in each of the last races.
          const recent = shares.slice(-(falls + 1));
          expect(
            recent.length === falls + 1 &&
              recent.every((s, k) => k === 0 || s < recent[k - 1]!),
            `${where}: ${f.id} should have merged`,
          ).toBe(false);
          expect(f.mergedInto, where).toBeUndefined();
          continue;
        }
        merged += 1;
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
    expect(
      merged,
      `parties that merged across ${named.join("; ")}`,
    ).toBeGreaterThan(0);
    expect(
      standing,
      `parties still standing across ${named.join("; ")}`,
    ).toBeGreaterThan(0);
  }, 420_000);
});
