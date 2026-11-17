/**
 * The century's parties (owner, Nov 17, 2026, CTO lines 6935508228 and 6935528569 on #9747:
 * "parties emerge and change through each world's own history, and each one can be described from
 * its own records"; History's family 9 plan, PR 9a). Each party stands where the members it holds
 * in Congress stand, after every even November, so its position moves with its own seats and
 * differs between worlds. Every world is a drawn place (skill drawn-place-tests); each assertion
 * names it and its seed.
 */
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { centuryOf, setHistoryMode } from "./electorate-century";
import { partyKeyIssues } from "./electorate-century-laws";
import { gameStartDate } from "./game-start";

const RUN = `history-parties:${Date.now()}`;

describe("the century's parties stand where their members stand", () => {
  it("records each party's position after every even November, on its own side, moving with its seats, and different between drawn worlds", () => {
    const lastPositions: string[] = [];
    const named: string[] = [];
    for (let i = 0; i < 4; i += 1) {
      const place = drawPlace(`${RUN}:${i}`, "history-parties");
      const where = `${place.name} (${place.key}), world seed ${place.seed}`;
      named.push(where);
      setHistoryMode(place.seed, "century", gameStartDate(), place.state);
      const century = centuryOf(place.seed, gameStartDate());
      expect(century.parties.map((p) => p.side).sort(), where).toEqual([-1, 1]);
      const evens = century.congresses.length;
      for (const party of century.parties) {
        // One position per Congress, on the party's own side of the scale.
        expect(party.positions, `${where}: ${party.id}`).toHaveLength(evens);
        for (const row of party.positions)
          expect(
            Math.sign(row.position),
            `${where}: ${party.id} ${row.year}`,
          ).toBe(party.side);
        // It moves with the seats it holds: never one figure for a hundred years.
        expect(
          new Set(party.positions.map((row) => row.position.toFixed(4))).size,
          `${where}: ${party.id}'s positions`,
        ).toBeGreaterThan(1);
        // Its record names the issues it stands on.
        const other = century.parties.find((p) => p.side !== party.side)!;
        expect(
          partyKeyIssues(
            party.positions.at(-1)!.position,
            other.positions.at(-1)!.position,
            3,
          ),
          `${where}: ${party.id}'s key issues`,
        ).toHaveLength(3);
      }
      lastPositions.push(
        century.parties
          .map((p) => p.positions.at(-1)!.position.toFixed(4))
          .join(","),
      );
    }
    expect(
      new Set(lastPositions).size,
      `day one's party positions across ${named.join("; ")}`,
    ).toBeGreaterThan(1);
  }, 120_000);
});
