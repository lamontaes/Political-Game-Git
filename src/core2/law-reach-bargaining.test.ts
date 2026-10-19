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
import { drawPlace } from "../../scripts/core2-year/place";
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
      const place = drawPlace(seed, `bargaining:${attempt}`);
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const core: CoreState = world.core;
      const api = coreAPI(core);
      setLaw(api, "state", 1, `yes:${attempt}`);
      advanceCore(core, addDays(makeIsoDate(core.date), 2));
      expect(yesLevels(api, KEY).length).toBeGreaterThan(0);
      advanceCore(core, addDays(makeIsoDate(core.date), 400));
      const raised = contracts(api).filter(
        (c) => Number(c.facts.raised) > 0 && c.facts.sampleJobId !== undefined,
      );
      tried.push(`${place.key}: ${contracts(api).length} contracts`);
      if (!raised.length) continue;
      const contract = raised[0]!;
      const f = contract.facts;
      // The raise is the line's growth, no more: the pay change cites the line.
      const growth = Number(f.lineNowMinor) / Number(f.lineBeforeMinor) - 1;
      expect(Number(f.raisePct)).toBeCloseTo(growth * 100, 1);
      const change = core.work.payChanges
        .get(String(f.sampleJobId))
        ?.find((c) => c.source.citation.includes(String(f.line)));
      expect(
        change,
        `${place.key}: pay change on ${f.sampleJobId}`,
      ).toBeDefined();
      expect(change!.hourlyMinor).toBe(Number(f.sampleToMinor));
      expect(Number(f.sampleToMinor)).toBe(
        Math.round(Number(f.sampleFromMinor) * (1 + growth)),
      );
      // The people and the payroll read it: an event names the contract.
      expect(
        [...core.events.values()].some((e) => e.id === `event:${contract.id}`),
      ).toBe(true);
      // A repeal at every level in force stops the next contract.
      for (const l of yesLevels(api, KEY))
        setLaw(api, l.level, 0, `no:${attempt}:${l.level}`);
      advanceCore(core, addDays(makeIsoDate(core.date), 2));
      expect(yesLevels(api, KEY)).toHaveLength(0);
      const count = contracts(api).length;
      advanceCore(core, addDays(makeIsoDate(core.date), 400));
      expect(contracts(api)).toHaveLength(count);
      return;
    }
    throw new Error(
      `no place raised a unit's pay in six tries (seed ${seed}): ${tried.join("; ")}`,
    );
  }, 1_800_000);
});
