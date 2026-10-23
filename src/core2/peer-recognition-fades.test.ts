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
  const tried: string[] = [];
  for (let draw = 0; draw < 12; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "peer-fades");
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const year = Number(core.date.slice(0, 4));
    const rows: { fact: string; ago: number; recall: number }[] = [];
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
            ago: year - cohort,
            recall: peerNameRecall(cohort, core.date),
          });
      }
    const near = rows.find((r) => r.ago <= 10);
    const far = rows.find((r) => r.ago >= 35);
    if (!near || !far) {
      tried.push(`${where}: ${rows.length} facts, no near/far pair`);
      continue;
    }
    expect(
      far.recall,
      `${where}: ${far.fact} (${far.ago} years) vs ${near.fact} (${near.ago} years)`,
    ).toBeLessThan(near.recall);
    expect(peerNameRecall(year - 5, `${year}-06-01`)).toBeCloseTo(0.9);
    expect(peerNameRecall(year - 50, `${year}-06-01`)).toBeCloseTo(0.7);
    return;
  }
  throw new Error(
    `no drawn place had a near and a far peer: ${tried.join("; ")}`,
  );
}, 1_800_000);
