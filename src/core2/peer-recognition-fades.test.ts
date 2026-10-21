/**
 * A school peer's remembered name fades with the years since school (pool
 * item people-peer-recognition-fades): in a played world in a drawn place, a
 * peer from a cohort 40 years back is recalled with lower strength than one
 * from 5 years back. PEER_FADES_SEED pins a seed.
 */
import { randomBytes } from "node:crypto";
import { afterAll, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { peerNameRecall } from "./opening-peer-network";

const seed = process.env.PEER_FADES_SEED ?? randomBytes(8).toString("hex");
const before = setBookkeeping(false);
afterAll(() => {
  setBookkeeping(before);
});

it("a peer from 40 years back is recalled less strongly than one from 5 years back", () => {
  const place = drawPlace(seed, "peer-fades");
  const where = `${place.name} (${place.key}), seed ${place.seed}`;
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const rows: { fact: string; cohort: number; recall: number }[] = [];
  for (const person of core.people.values())
    for (const fact of person.pastFacts ?? []) {
      if (fact.kind !== "social:generated-school-acquaintance") continue;
      const context = person.pastFacts!.find(
        (row) => row.id === fact.facts?.contextFactId,
      );
      const cohort = Number(context?.facts?.cohortYear);
      if (Number.isFinite(cohort))
        rows.push({
          fact: fact.id,
          cohort,
          recall: peerNameRecall(cohort, core.date),
        });
    }
  const year = Number(core.date.slice(0, 4));
  const near = rows.filter((r) => year - r.cohort <= 15);
  const far = rows.filter((r) => year - r.cohort >= 30);
  const detail = `${where}: ${rows.length} acquaintance facts`;
  if (near.length && far.length) {
    const mean = (xs: typeof rows) =>
      xs.reduce((a, r) => a + r.recall, 0) / xs.length;
    expect(mean(far), `${detail}; e.g. ${far[0]!.fact}`).toBeLessThan(
      mean(near),
    );
  }
  // The curve itself: flat near, smooth fall, bounded by the far point.
  expect(peerNameRecall(year - 40, `${year}-06-01`)).toBeLessThan(
    peerNameRecall(year - 5, `${year}-06-01`),
  );
  expect(peerNameRecall(year - 5, `${year}-06-01`)).toBeCloseTo(0.9);
  expect(peerNameRecall(year - 50, `${year}-06-01`)).toBeCloseTo(0.7);
}, 600_000);
