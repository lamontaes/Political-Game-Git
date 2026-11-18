/**
 * Every state's counted places stand where the century's last count left the state (owner, Nov
 * 17, 2026; CTO lines 6935086070 and 6936902133 on #9747, family 8, pin electorate-places.ts
 * makePlace): in a world whose day one is the century's, the century counts each county (History
 * 8a part 2) and a state with counties stands where its counties' vote-weighted mean does, so that
 * mean is the state's last century count. A county carries its own results, so counties no longer
 * move by one shift; they keep their order against the published map (it opened them) while each
 * drifts on its own count. Before 8a part 2 this test asserted the one shift; that premise is
 * replaced, not loosened. Every world is a drawn place (skill drawn-place-tests); each
 * assertion names it and its seed.
 */
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { centuryOf, setHistoryMode } from "./electorate-century";
import { publishedStatePlaces, statePlaces } from "./electorate-places";
import { gameStartDate } from "./game-start";

const RUN = `century-state-places:${Date.now()}`;

it("puts each state's counted places on the century's last count, keeping their differences, at drawn worlds", () => {
  const days: string[] = [];
  const named: string[] = [];
  for (let i = 0; i < 3; i += 1) {
    const place = drawPlace(`${RUN}:${i}`, "century-state-places");
    const where = `${place.name} (${place.key}), world seed ${place.seed}`;
    named.push(where);
    setHistoryMode(place.seed, "century", gameStartDate(), place.state);
    const leans = centuryOf(place.seed, gameStartDate()).leans;
    let states = 0;
    const means: string[] = [];
    for (const [stateKey, lean] of Object.entries(leans)) {
      const usps = stateKey.slice(3);
      const places = statePlaces(usps, place.seed);
      if (!places.length) continue;
      states += 1;
      const votes = places.reduce((s, p) => s + p.votes2024, 0);
      const mean =
        places.reduce((s, p) => s + p.votes2024 * p.rightShare, 0) / votes;
      expect(mean, `${where}: ${stateKey}`).toBeCloseTo(lean, 9);
      // Each county's own carry moves it, but the century opened them in the published order:
      // across a state's counties the two stay strongly related.
      const published = publishedStatePlaces(usps, place.seed);
      if (places.length >= 5) {
        const xs = places.map((p) => p.rightShare);
        const ys = published.map((p) => p.rightShare);
        const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
        const my = ys.reduce((a, b) => a + b, 0) / ys.length;
        let sxy = 0,
          sxx = 0,
          syy = 0;
        xs.forEach((x, k) => {
          sxy += (x - mx) * (ys[k]! - my);
          sxx += (x - mx) ** 2;
          syy += (ys[k]! - my) ** 2;
        });
        const r = sxx && syy ? sxy / Math.sqrt(sxx * syy) : 1;
        expect(
          r,
          `${where}: ${stateKey}'s counties against the map`,
        ).toBeGreaterThan(0.8);
      }
      expect(places[0]!.source, `${where}: ${stateKey}`).toContain("century");
      means.push(`${stateKey}=${mean.toFixed(6)}`);
    }
    expect(states, `${where}: states placed`).toBeGreaterThan(45);
    days.push(means.join(","));
  }
  expect(
    new Set(days).size,
    `the states' day-one leans across ${named.join("; ")}`,
  ).toBe(days.length);
}, 180_000);
