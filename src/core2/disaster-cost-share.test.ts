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
import { causeDisaster, disasterAssistancePaid } from "./modules/disasters";
import { hazardOfIncident, RECORD_END, type Hazard } from "./modules/climate";
import { enactLaw, lawChain } from "./modules/laws";
import {
  countyGeoidsForPlace,
  governmentUnitsForPlace,
} from "./reference/government-units";
import { appliedOn } from "./law-reach/applied";
import { coreAPI } from "./state";

const QUESTION = "us-federal-positions:emergencies.states-share-disaster-costs";
const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const TRIES = 12;

interface Candidate {
  key: string;
  name: string;
  state: string;
  disaster: number;
  hazard: Hazard;
  /** Days from the disaster's start to its declaration. */
  lag: number;
}

/** A town's name as the FEMA records key it: "Iaeger town" is "iaeger". */
const recordName = (sourceName: string) =>
  sourceName
    .toLowerCase()
    .replace(/ (city|town|village|borough|township|municipality)$/, "");

/** Towns the FEMA records show public assistance obligated to, for a disaster declared in the world's first year: the town's own government is paid on the declaration date. */
function candidates(): Candidate[] {
  const byCounty = declarations.byCounty as unknown as Record<
    string,
    [string, string, number, number, number][]
  >;
  const pa = assistance.byCountyDisaster as Record<
    string,
    { county: number; towns: Record<string, number> }
  >;
  const places = ((corpus as unknown as { places?: unknown }).places ??
    corpus) as { geoid: string; sourceName: string; stateUsps: string }[];
  const out: Candidate[] = [];
  for (const p of places) {
    if (!p.geoid) continue;
    const county = countyGeoidsForPlace(p.geoid);
    if (county.length !== 1) continue;
    if (
      !governmentUnitsForPlace(p.geoid).some(
        (u) => u.unitType === "municipality",
      )
    )
      continue;
    for (const [begins, declared, type, , number] of byCounty[county[0]!] ?? [])
      if (
        begins >= "2000-01-01" &&
        begins <= RECORD_END &&
        hazardOfIncident(declarations.types[type] ?? "") &&
        (pa[`${county[0]}|${number}`]?.towns[recordName(p.sourceName)] ?? 0) > 0
      )
        out.push({
          key: p.geoid,
          name: p.sourceName,
          state: p.stateUsps,
          disaster: number,
          hazard: hazardOfIncident(declarations.types[type] ?? "")!,
          lag: Math.round(
            (Date.parse(declared) - Date.parse(begins)) / 86_400_000,
          ),
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
          effectiveDate: addDays(makeIsoDate(lawWorld.date), 1),
          measureId: "disaster-cost-share-test",
          citation: "Test: states share disaster costs",
        });
        // The county's exposure makes the recorded disaster in each world; public assistance is
        // paid on its declaration date, so stop the day after.
        const made = causeDisaster(api, picked.hazard, picked.disaster);
        const same = causeDisaster(
          coreAPI(control),
          picked.hazard,
          picked.disaster,
        );
        if (!made || !same || made.number !== same.number) {
          tried.push(
            `${picked.name}, ${picked.state} (${picked.key}): no ${picked.hazard} disaster ${picked.disaster} to cause`,
          );
          continue;
        }
        const end = addDays(makeIsoDate(made.declared), 1);
        advanceCore(lawWorld, end);
        advanceCore(control, end);
        const sum = (core: typeof control) =>
          disasterAssistancePaid(coreAPI(core))
            // Public assistance goes to governments; household aid (paid to the residents' account) is individual assistance the law does not touch.
            .filter(
              (r) =>
                r.disaster === made.number &&
                !r.orgId.startsWith("cash:residents:"),
            )
            .reduce((n, r) => n + r.cents, 0);
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
        // The law reached the governments: a law-reach row names each one
        // and the federal money its share cost it.
        const reached = appliedOn(coreAPI(lawWorld), QUESTION);
        expect(reached.length, "governments the law reached").toBeGreaterThan(
          0,
        );
        expect(reached.every((r) => r.amountMinor < 0)).toBe(true);
        expect(appliedOn(coreAPI(control), QUESTION)).toHaveLength(0);
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
