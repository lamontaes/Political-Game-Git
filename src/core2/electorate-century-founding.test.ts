/**
 * Parties founded in the century's own history (History family 9b, plan 6952133362 on #9747; CTO
 * lines 6935508228 and 6935528569: parties emerge through each world's own history). Voters whom
 * neither national party reaches build a pressure for a new one; a party is founded when the
 * pressure outweighs the cost of standing it. Every world is a drawn place (skill
 * drawn-place-tests); each assertion names it and its seed.
 */
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import {
  centuryOf,
  centuryParameter,
  foundingStep,
  setHistoryMode,
  type CenturyParty,
} from "./electorate-century";
import { gameStartDate } from "./game-start";

const RUN = `history-founding:${Date.now()}`;

/** Forty voters evenly spaced along the lean order, as the century counts them. */
const voters = Array.from({ length: 40 }, (_, i) => ({
  id: `v${i}`,
  rank: (i + 0.5) / 40,
  readiness: 1,
  incumbentLean: 0,
  weight: 1,
}));

function parties(left: number, right: number): CenturyParty[] {
  return [
    {
      id: "a",
      name: "a",
      side: -1,
      founded: null,
      positions: [{ year: 1900, position: left }],
    },
    {
      id: "b",
      name: "b",
      side: 1,
      founded: null,
      positions: [{ year: 1900, position: right }],
    },
  ];
}

/** Cycles run until a party is founded or the cycles run out. */
function cyclesToFound(
  left: number,
  right: number,
  cycles: number,
): number | null {
  let pressure = 0;
  for (let c = 0; c < cycles; c += 1) {
    const step = foundingStep(
      voters,
      parties(left, right),
      1900,
      pressure,
      false,
    );
    if (step.founding) return c + 1;
    pressure = step.pressure;
  }
  return null;
}

describe("a party is founded when the voters neither party reaches outweigh the cost", () => {
  it("builds pressure faster the farther the parties stand from their voters, and never when they stand at them", () => {
    // Parties at the voters (a lean of about 0.1 reaches nearly everyone) never found one.
    expect(cyclesToFound(-0.1, 0.1, 60)).toBeNull();
    // Parties far out leave the middle unreached; farther out founds sooner or at all.
    const wide = cyclesToFound(-0.9, 0.9, 60);
    const mid = cyclesToFound(-0.6, 0.6, 60);
    expect(wide, "parties at +-0.9").not.toBeNull();
    if (mid !== null) expect(wide!).toBeLessThanOrEqual(mid);
    // The pressure fades: a gap that opens once and closes again founds nothing.
    let pressure = 0;
    pressure = foundingStep(
      voters,
      parties(-0.9, 0.9),
      1900,
      pressure,
      false,
    ).pressure;
    for (let c = 0; c < 20; c += 1)
      pressure = foundingStep(
        voters,
        parties(-0.1, 0.1),
        1900,
        pressure,
        false,
      ).pressure;
    // It settles at what the close parties' own gap keeps (about 0.11), far under the cost.
    expect(pressure).toBeLessThan(centuryParameter("centuryFoundingCost") / 3);
  });

  it("founds at the centroid of the unreached voters, and spends the pressure while the party stands", () => {
    // A right party standing farther out than the left leaves more of the middle's right side unreached.
    let pressure = 0;
    let founded;
    for (let c = 0; c < 60 && !founded; c += 1) {
      const step = foundingStep(
        voters,
        parties(-0.3, 0.9),
        1900,
        pressure,
        false,
      );
      pressure = step.pressure;
      founded = step.founding;
    }
    expect(founded, "parties at -0.3 and 0.9").toBeDefined();
    expect(founded!.position).toBeGreaterThan(0);
    expect(founded!.side).toBe(1);
    expect(founded!.pressure).toBeGreaterThan(
      centuryParameter("centuryFoundingCost"),
    );
    expect(foundingStep(voters, parties(-0.3, 0.9), 1900, 5, true)).toEqual({
      pressure: 0,
    });
  });

  it("differs between drawn worlds, and each founding names its cause in the century's own record", () => {
    const years: string[] = [];
    const named: string[] = [];
    for (let i = 0; i < 6; i += 1) {
      const place = drawPlace(`${RUN}:${i}`, "history-founding");
      const where = `${place.name} (${place.key}), world seed ${place.seed}`;
      named.push(where);
      setHistoryMode(place.seed, "century", gameStartDate(), place.state);
      const century = centuryOf(place.seed, gameStartDate());
      for (const f of century.foundings) {
        expect(f.id, where).toBe(`party:founded:${f.year}`);
        expect(f.year % centuryParameter("presidentialTermYears"), where).toBe(
          0,
        );
        expect(f.pressure, where).toBeGreaterThan(
          centuryParameter("centuryFoundingCost"),
        );
        expect(f.unreachedShare, where).toBeGreaterThan(0);
        expect(f.unreachedShare, where).toBeLessThan(1);
        expect(f.side, where).toBe(Math.sign(f.position));
        // It stands between the two national parties, where the unreached voters are.
        const at = century.parties.map(
          (p) => p.positions.filter((r) => r.year <= f.year).at(-1)!.position,
        );
        expect(f.position, where).toBeGreaterThan(Math.min(...at));
        expect(f.position, where).toBeLessThan(Math.max(...at));
      }
      years.push(century.foundings.map((f) => f.year).join("+") || "none");
    }
    expect(
      new Set(years).size,
      `founding years across ${named.join("; ")}`,
    ).toBeGreaterThan(1);
  }, 180_000);
});
