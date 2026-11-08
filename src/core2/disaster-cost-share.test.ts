// @vitest-environment node
/** A law having states share disaster costs lowers the federal public assistance a declaration pays the town's governments. */
import { createHash, randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import corpus from "../../data/source/places/corpus.json" with { type: "json" };
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import assistance from "./data/disasters/assistance.json" with { type: "json" };
import declarations from "./data/disasters/declarations.json" with { type: "json" };
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { disasterAssistancePaid } from "./modules/disasters";
import { enactLaw, lawChain } from "./modules/laws";
import {
  countyGeoidsForPlace,
  governmentUnitsForPlace,
} from "./reference/government-units";
import { coreAPI } from "./state";

const QUESTION = "us-federal-positions:emergencies.states-share-disaster-costs";
const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const TRIES = 4;

interface Candidate {
  key: string;
  name: string;
  state: string;
  disaster: number;
}

/** Towns whose county has FEMA public assistance obligated for a disaster declared in the world's first year, read from the records. */
function candidates(): Candidate[] {
  const byCounty = declarations.byCounty as unknown as Record<
    string,
    [string, string, number, number, number][]
  >;
  const pa = assistance.byCountyDisaster as Record<string, { county: number }>;
  const counties = new Map<string, number>();
  for (const [county, rows] of Object.entries(byCounty))
    for (const [, declared, , , number] of rows)
      if (
        declared >= "2025-01-25" &&
        declared <= "2025-12-31" &&
        (pa[`${county}|${number}`]?.county ?? 0) > 0
      )
        counties.set(county, number);
  const places = ((corpus as unknown as { places?: unknown }).places ??
    corpus) as { geoid: string; sourceName: string; stateUsps: string }[];
  const out: Candidate[] = [];
  for (const p of places) {
    if (!p.geoid) continue;
    const county = countyGeoidsForPlace(p.geoid);
    if (county.length !== 1 || !counties.has(county[0]!)) continue;
    if (
      !governmentUnitsForPlace(p.geoid).some(
        (u) => u.unitType === "municipality",
      )
    )
      continue;
    out.push({
      key: p.geoid,
      name: p.sourceName,
      state: p.stateUsps,
      disaster: counties.get(county[0]!)!,
    });
  }
  return out;
}

it(
  `states sharing disaster costs cuts the federal assistance a declaration pays (replay ${replay})`,
  { timeout: 3_000_000 },
  () => {
    const bookkeeping = setBookkeeping(false);
    try {
      const pool = candidates();
      expect(pool.length).toBeGreaterThan(0);
      const tried: string[] = [];
      for (let draw = 0; draw < TRIES; draw += 1) {
        const index =
          Number.parseInt(
            createHash("sha256")
              .update(`${replay}:${draw}`)
              .digest("hex")
              .slice(0, 8),
            16,
          ) % pool.length;
        const picked = pool[index]!;
        const seed = createHash("sha256")
          .update(`${replay}:world:${picked.key}`)
          .digest("hex");
        const build = () =>
          buildBenchWorld(seed, gameStartDate(), {
            placeKey: picked.key,
            twoLevel: true,
          }).core;
        const lawWorld = build();
        const control = build();
        const api = coreAPI(lawWorld);
        const federal = lawChain(api).levels.find(
          (l) => l.level === "federal",
        )!;
        enactLaw(api, {
          jurisdiction: federal.jurisdiction,
          level: "federal",
          series: QUESTION,
          value: 1,
          effectiveDate: lawWorld.date,
          measureId: "disaster-cost-share-test",
          citation: "Test: states share disaster costs",
        });
        const end = addDays(makeIsoDate(lawWorld.date), 365);
        advanceCore(lawWorld, end);
        advanceCore(control, end);
        const sum = (core: typeof control) =>
          disasterAssistancePaid(coreAPI(core)).reduce(
            (n, r) => n + r.cents,
            0,
          );
        const withLaw = sum(lawWorld),
          without = sum(control);
        if (!without) {
          tried.push(
            `${picked.name}, ${picked.state} (${picked.key}): no assistance paid`,
          );
          continue;
        }
        process.stdout.write(
          `DISASTER-SHARE ${picked.name}, ${picked.state} (${picked.key}, seed ${seed}): federal public assistance ${without} cents without the law, ${withLaw} with it (${((100 * withLaw) / without).toFixed(1)}%), disaster ${picked.disaster}\n`,
        );
        expect(withLaw / without).toBeCloseTo(0.5 / 0.75, 2);
        return;
      }
      throw new Error(
        `No candidate town paid public assistance: ${tried.join("; ")}`,
      );
    } finally {
      setBookkeeping(bookkeeping);
    }
  },
);
