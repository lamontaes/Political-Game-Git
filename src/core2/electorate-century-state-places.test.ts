/**
 * Every state's counted places stand where the century's last count left the state (owner, Nov
 * 17, 2026; CTO lines 6935086070 and 6936902133 on #9747, family 8, pin electorate-places.ts
 * makePlace): in a world whose day one is the century's, a state's counties move together by one
 * shift so that the state's vote-weighted lean is its last century count, and each county keeps how
 * it differs from the others. Every world is a drawn place (skill drawn-place-tests); each
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
      // One shift for every place that the bounds did not stop.
      const published = publishedStatePlaces(usps, place.seed);
      const shifts = new Set(
        places
          .map((p, k) => p.rightShare - published[k]!.rightShare)
          .filter(
            (_, k) => places[k]!.rightShare > 0 && places[k]!.rightShare < 1,
          )
          .map((d) => d.toFixed(9)),
      );
      expect(shifts.size, `${where}: ${stateKey}'s shifts`).toBeLessThanOrEqual(
        1,
      );
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
