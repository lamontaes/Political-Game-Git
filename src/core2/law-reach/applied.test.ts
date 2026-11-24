/**
 * An engine that applies a law records whom it applied it to, and a repeal
 * ends those rows: in a played world (two levels, economy on) in a place
 * drawn from all 56, a full person and a counted group the law reached are
 * named by record id, and the day the repeal takes effect both rows end.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../../bench/world";
import { drawPlace } from "../../../tests/golden-path/place";
import { setBookkeeping } from "../bookkeeping";
import { gameStartDate } from "../game-start";
import { addDays, makeIsoDate } from "../kernel/dates";
import { advanceCore } from "../life";
import { coreAPI } from "../state";
import { enactLaw, lawChain } from "../modules/laws";
import { appliedOn, lawApplied } from "./applied";
import { reachedBy, reachOn } from "./host";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const KEY = "us-policy-positions:housing-land-use.rent-stabilization";

it("records whom an engine applied a law to and ends it on repeal", () => {
  const drawn = drawPlace(seed, "law-applied");
  const where = `seed ${seed}, ${drawn.name} (${drawn.key})`;
  const before = setBookkeeping(false);
  try {
    const { core } = buildBenchWorld(drawn.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: drawn.key,
    });
    const api = coreAPI(core);
    const level = lawChain(api).levels.find((l) => l.level === "state")!;
    const tomorrow = addDays(makeIsoDate(core.date), 1);
    const law = enactLaw(api, {
      ...level,
      series: KEY,
      value: 1,
      effectiveDate: tomorrow,
      measureId: "applied-test",
      citation: "applied test",
    });
    advanceCore(core, tomorrow);
    const person = [...core.people.values()].find(
      (p) => p.placeId === lawChain(api).townPlaceId,
    );
    expect(person, `${where}: a full resident`).toBeDefined();
    lawApplied(api, {
      key: KEY,
      lawId: law.id,
      targetId: person!.id,
      target: "person",
      engine: "test",
      what: "rent-increase-capped",
    });
    lawApplied(api, {
      key: KEY,
      lawId: law.id,
      targetId: "counted-group:test",
      target: "group",
      count: 40,
      engine: "test",
      what: "rent-increase-capped",
    });
    expect(
      appliedOn(api, KEY).map((r) => r.targetId),
      where,
    ).toEqual(expect.arrayContaining([person!.id, "counted-group:test"]));
    expect(
      reachedBy(api, KEY, law.id).map((r) => r.personId),
      where,
    ).toContain(person!.id);
    expect(
      reachOn(api, person!.id).some((r) => r.key === KEY && !r.endedOn),
      where,
    ).toBe(true);

    // Repeal at every level that says yes (a starting state yes included).
    const repealOn = addDays(makeIsoDate(core.date), 1);
    const laws = api.moduleState("core2-laws-v1").table("laws");
    for (const l of lawChain(api).levels) {
      const latest = (
        laws.query("bySeries", [l.jurisdiction, KEY]) as unknown as {
          value: number;
          effectiveDate: string;
        }[]
      )
        .filter((r) => r.effectiveDate <= core.date)
        .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))[0];
      if (latest?.value === 1)
        enactLaw(api, {
          ...l,
          series: KEY,
          value: 0,
          effectiveDate: repealOn,
          measureId: "applied-test-repeal",
          citation: "applied test repeal",
        });
    }
    advanceCore(core, repealOn);
    expect(appliedOn(api, KEY), `${where}: repeal ends every row`).toEqual([]);
  } finally {
    setBookkeeping(before);
  }
}, 120_000);
