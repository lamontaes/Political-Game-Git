import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "./game-start";
import { resolveLawInForce } from "./laws-in-force";
import type { LawChain, LawRowInput } from "./laws-starting";
import { LAWS_MODULE_ID, enactLaw, lawInForce } from "./modules/laws";
import { coreAPI } from "./state";

// An act enacted in play stands against a rate the data scheduled for a later
// date (decision register, "the seed is not a prewritten future that ignores
// actions"): the later-in-time statute wins, so the scheduled row never
// replaces it. A later enactment still replaces an earlier one.
const chain = {
  placeKey: "x",
  placeName: "X",
  townPlaceId: "x",
  stateKey: "US-ZZ",
  countyGeoids: [],
  incorporated: true,
  levels: [{ level: "state", jurisdiction: "US-ZZ" }],
} as unknown as LawChain;
const row = (
  id: string,
  value: number,
  effectiveDate: string,
  enactedBy?: string,
): LawRowInput => ({
  id,
  jurisdiction: "US-ZZ",
  level: "state",
  series: "property-tax",
  tier: "general",
  value,
  effectiveDate,
  endDate: null,
  source: "fixture",
  retrieved: "2026-10-12",
  estimate: false,
  ...(enactedBy ? { terms: { enactedBy } } : {}),
});
const valueOn = (rows: LawRowInput[], date: string) =>
  resolveLawInForce({ series: "property-tax", chain, date, rows }).levels.find(
    (l) => l.row,
  )?.row?.value;

describe("an act enacted in play and a rate scheduled in data", () => {
  const data = row("data-now", 1, "2026-01-01");
  const scheduled = row("data-2027", 3, "2027-01-01");
  const act = row("act", 2, "2026-12-01", "bill-1");

  it("edge fixture: the act holds after the scheduled date passes", () => {
    const rows = [data, scheduled, act];
    expect(valueOn(rows, "2026-11-01")).toBe(1);
    expect(valueOn(rows, "2026-12-15")).toBe(2);
    expect(valueOn(rows, "2027-02-01")).toBe(2);
  });

  it("edge fixture: without an act the scheduled rate takes over on its date", () => {
    expect(valueOn([data, scheduled], "2027-02-01")).toBe(3);
  });

  it("edge fixture: a later act replaces an earlier one", () => {
    const later = row("act-2", 4, "2027-03-01", "bill-2");
    expect(valueOn([data, scheduled, act, later], "2027-02-01")).toBe(2);
    expect(valueOn([data, scheduled, act, later], "2027-04-01")).toBe(4);
  });
});

describe("in the played world", () => {
  const seed = process.env.LAW_SCHEDULED_SEED ?? randomBytes(8).toString("hex");
  const opening = gameStartDate();

  it(`a state act passed in play outlasts the data's later rows (seed ${seed})`, () => {
    for (let i = 0; i < 12; i += 1) {
      const place = drawPlace(i ? `${seed}:${i}` : seed, "law-scheduled");
      const world = buildBenchWorld(place.seed, opening, {
        twoLevel: true,
        placeKey: place.key,
      });
      const api = coreAPI(world.core);
      const rows = api
        .moduleState(LAWS_MODULE_ID)
        .table("laws")
        .rows() as unknown as LawRowInput[];
      const scheduled = rows
        .filter(
          (r) =>
            r.effectiveDate > opening &&
            r.level === "state" &&
            !r.terms?.enactedBy &&
            r.value !== null &&
            !r.id.endsWith(":from-start"),
        )
        .sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate))[0];
      if (!scheduled) continue;
      const act = enactLaw(api, {
        jurisdiction: scheduled.jurisdiction,
        level: "state",
        series: scheduled.series,
        value: (scheduled.value ?? 0) + 7,
        effectiveDate: opening,
        measureId: "fixture-act",
        citation: "fixture act",
      });
      const answer = lawInForce(api, scheduled.series, scheduled.effectiveDate);
      const level = answer.levels.find(
        (l) => l.level === "state" && l.row,
      )?.row;
      expect(
        level?.id,
        `${place.name} (${place.key}): ${scheduled.id} is scheduled ${scheduled.effectiveDate}, ${act.id} is the act`,
      ).toBe(act.id);
      return;
    }
    throw new Error("No drawn place had a later-dated state row.");
  }, 600_000);
});
