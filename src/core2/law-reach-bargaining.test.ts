/**
 * Public-sector bargaining (gov-public-sector-bargaining), in the played
 * world: a random place from all 56, by seed. With the law in force, a public
 * unit's pay is re-rated at its budget date by the growth of its employer's
 * line, followed to a named worker's pay change and the contract record; a
 * repeal stops the next contract.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { governmentUnitsForPlace } from "./reference/government-units";
import { corePlaceStateIdentities, searchCorePlaces } from "./place-lookup";
import { gameStartDate } from "./game-start";
import { advanceCore } from "./life";
import { addDays, makeIsoDate } from "./kernel/dates";
import { coreAPI } from "./state";
import { enactLaw, lawChain } from "./modules/laws";
import { reachTable, yesLevels } from "./law-reach/group-a-records";
import type { CoreAPI, CoreState } from "./types";

const KEY =
  "us-policy-positions:labor-workforce.public-sector-collective-bargaining";
const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`bargaining:${Date.now()}`).digest("hex");

const states = [...corePlaceStateIdentities()]
  .map((s) => s.jurisdictionKey)
  .sort();
const pick = <T>(list: readonly T[], salt: string): T =>
  list[
    parseInt(
      createHash("sha256").update(`${seed}:${salt}`).digest("hex").slice(0, 8),
      16,
    ) % list.length
  ]!;

/** A place with its own city government: only a city budget line moves from year to year. */
function townWithCity(attempt: number): { key: string; state: string } {
  for (let tries = 0; tries < 30; tries += 1) {
    const state = pick(states, `state:${attempt}:${tries}`);
    const places = searchCorePlaces("", Number.MAX_SAFE_INTEGER, {
      stateJurisdictionKey: state,
      scope: "locality",
    })
      .filter((p) =>
        governmentUnitsForPlace(p.sourceGeoid ?? p.key).some(
          (u) => u.unitType === "municipality",
        ),
      )
      .sort((a, b) => a.key.localeCompare(b.key));
    if (places.length)
      return { key: pick(places, `place:${attempt}:${tries}`).key, state };
  }
  throw new Error(`no incorporated town in thirty tries (seed ${seed})`);
}

interface Contract {
  readonly id: string;
  readonly facts: Record<string, string | number>;
}
const contracts = (api: CoreAPI): Contract[] =>
  (reachTable(api, "mechanics").rows() as unknown as Contract[]).filter((r) =>
    r.id.startsWith("bargaining:"),
  );

function setLaw(api: CoreAPI, level: string, value: 0 | 1, tag: string): void {
  const row = lawChain(api).levels.find((l) => l.level === level)!;
  enactLaw(api, {
    jurisdiction: row.jurisdiction,
    level: level as "federal" | "state" | "county" | "city",
    series: KEY,
    value,
    effectiveDate: addDays(makeIsoDate(api.state.date), 1),
    measureId: `test:bargaining:${tag}`,
    citation: `Test measure ${tag}`,
  });
}

describe("public-sector bargaining sets a unit's pay from its employer's budget line", () => {
  it(`raises a named worker's pay by the line's growth, and a repeal stops the next contract (seed ${seed})`, () => {
    const tried: string[] = [];
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const place = townWithCity(attempt);
      const world = buildBenchWorld(seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const core: CoreState = world.core;
      const api = coreAPI(core);
      // The world's own legislature may repeal the law on any day; the test
      // re-enacts it daily so a budget date never falls in a lapse.
      for (let day = 0; day < 400; day += 1) {
        if (!yesLevels(api, KEY).length)
          setLaw(api, "state", 1, `yes:${attempt}:${day}`);
        advanceCore(core, addDays(makeIsoDate(core.date), 1));
        // Stop as soon as a contract has raised a unit's pay.
        if (
          day % 10 === 9 &&
          contracts(api).some((c) => Number(c.facts.raised) > 0)
        )
          break;
      }
      const raised = contracts(api).filter((c) => Number(c.facts.raised) > 0);
      tried.push(
        `${place.key}: ${contracts(api)
          .map((c) => `${c.facts.line} ${c.facts.raisePct}%`)
          .join(", ")}`,
      );
      if (!raised.length) continue;
      // A named worker's job is the proof; a unit of only counted workers
      // (the wider population) still shows the contract and its raise.
      const contract =
        raised.find((c) => c.facts.sampleJobId !== undefined) ?? raised[0]!;
      const f = contract.facts;
      // The raise is the line's growth, no more: the pay change cites the line.
      const growth = Number(f.lineNowMinor) / Number(f.lineBeforeMinor) - 1;
      expect(Number(f.raisePct)).toBeCloseTo(growth * 100, 1);
      if (f.sampleJobId !== undefined) {
        const change = core.work.payChanges
          .get(String(f.sampleJobId))
          ?.find(
            (c) =>
              c.source.citation.includes(String(f.line)) &&
              c.source.citation.includes("the unit's contract"),
          );
        expect(
          change,
          `${place.key}: pay change on ${f.sampleJobId}`,
        ).toBeDefined();
        expect(change!.hourlyMinor).toBe(Number(f.sampleToMinor));
        expect(Number(f.sampleToMinor)).toBe(
          Math.round(Number(f.sampleFromMinor) * (1 + growth)),
        );
      }
      // A repeal at every level in force stops the next contract.
      const repealed = new Set(yesLevels(api, KEY).map((l) => l.lawId));
      for (const l of yesLevels(api, KEY))
        setLaw(api, l.level, 0, `no:${attempt}:${l.level}`);
      advanceCore(core, addDays(makeIsoDate(core.date), 2));
      expect(yesLevels(api, KEY)).toHaveLength(0);
      const before = new Set(contracts(api).map((c) => c.id));
      advanceCore(core, addDays(makeIsoDate(core.date), 400));
      // A year on, the world's own legislature may have enacted the law again;
      // any contract since then cites that new law, never the repealed one.
      for (const c of contracts(api).filter((row) => !before.has(row.id)))
        expect(
          repealed.has(String(c.facts.lawId)),
          `${place.key}: ${c.id} was bargained under the repealed ${c.facts.lawId}`,
        ).toBe(false);
      return;
    }
    throw new Error(
      `no place raised a unit's pay in six tries (seed ${seed}): ${tried.join("; ")}`,
    );
  }, 3_600_000);
});
