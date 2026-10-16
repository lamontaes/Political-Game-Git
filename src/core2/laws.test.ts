/**
 * M1-01: laws in force, every level.
 *
 * A random place (the golden-path draw when the suite runs it) and a random
 * territory: every tracked series at every level matches the research file it
 * was read from; a preemption case; a phase not yet in effect; and a named
 * worker's raise on the minimum wage's effective date.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { govReport } from "./gov-test-report";
import { buildPopulation } from "./population";
import { advanceCore, createLifeCore } from "./life";
import { coreAPI } from "./state";
import {
  LAWS_MODULE_ID,
  lawChain,
  lawHere,
  lawInForce,
  openLaws,
} from "./modules/laws";
import { resolveLawInForce } from "./laws-in-force";
import { lawChainForPlace, type LawRowInput } from "./laws-starting";
import { searchCorePlaces, corePlaceStateIdentities } from "./place-lookup";

const START = "2026-01-05";
const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`laws:${Date.now()}`).digest("hex");
const json = (path: string) => JSON.parse(readFileSync(path, "utf8"));
const research = {
  matrix: json("data/research/money/minimum-wage-dated-matrix-2026.json"),
  regions: json(
    "data/research/laws/local-starting-law/minimum-wage-regions.json",
  ),
  localWage: json(
    "data/research/laws/local-starting-law/local-minimum-wage.json",
  ),
  stateIncome: json("data/research/money/state-income-tax-2026.json"),
  stateCorporate: json(
    "data/research/money/state-corporate-income-tax-2026.json",
  ),
  territoryCorporate: json(
    "data/research/laws/local-starting-law/territory-corporate-income-tax-2026.json",
  ),
  federalIncome: json("data/research/money/federal-income-tax-schedules.json"),
  sales: json("data/research/laws/local-starting-law/sales-tax.json"),
  property: json(
    "data/research/laws/local-starting-law/property-tax-effective.json",
  ),
  snap: json("data/research/laws/local-starting-law/snap-maximums.json"),
  ui: json(
    "data/research/laws/local-starting-law/unemployment-weekly-bounds.json",
  ),
  medicaid: json("data/research/laws/local-starting-law/medicaid-match.json"),
  territoryIncome: json(
    "data/research/laws/local-starting-law/territory-income-tax-2026.json",
  ),
  starting: json("data/research/laws/starting-law-2026/labor-workforce.json"),
};

function localities(stateKey: string) {
  return [
    ...searchCorePlaces("", Number.MAX_SAFE_INTEGER, {
      stateJurisdictionKey: stateKey,
      scope: "locality",
    }),
  ].sort((a, b) => a.key.localeCompare(b.key));
}
function draw(states: readonly string[], salt: string) {
  const hash = createHash("sha256").update(`${seed}:${salt}`).digest("hex");
  const state = states[parseInt(hash.slice(0, 8), 16) % states.length]!;
  const places = localities(state);
  return places[parseInt(hash.slice(8, 16), 16) % places.length]!;
}
const allStates = [...corePlaceStateIdentities()]
  .map((s) => s.jurisdictionKey)
  .sort();
const territories = ["US-AS", "US-GU", "US-MP", "US-PR", "US-VI"];

function world(placeKey: string, startedAt = START) {
  const core = createLifeCore(
    buildPopulation({ seed, placeKey, startedAt, minimumPeople: 200 }),
  );
  openLaws(core);
  return core;
}

const on = (
  row: {
    effectiveDate?: string;
    operativeAt?: string;
    endDateExclusive?: string | null;
  },
  date: string,
) =>
  (row.effectiveDate ?? row.operativeAt)! <= date &&
  (row.endDateExclusive == null || date < row.endDateExclusive);
const latest = <T extends { effectiveDate?: string; operativeAt?: string }>(
  rows: readonly T[],
  date: string,
): T | undefined =>
  rows
    .filter((r) => (r.effectiveDate ?? r.operativeAt)! <= date)
    .sort((a, b) =>
      (a.effectiveDate ?? a.operativeAt)!.localeCompare(
        (b.effectiveDate ?? b.operativeAt)!,
      ),
    )
    .at(-1);

/** What the research files say for each level, read independently of the module. */
function expectedFromResearch(placeKey: string) {
  const chain = lawChainForPlace(placeKey);
  const state = chain.stateKey;
  const county = chain.countyGeoids[0];
  const geoid = chain.levels.at(-1)!.jurisdiction.slice("place:".length);
  const stateWageRows = research.matrix.places[state].rows as {
    tier: string;
    level: string;
    value: number;
    operativeAt: string;
  }[];
  const regions = research.regions.regions[state] as
    Record<string, string[]> | undefined;
  const tier = regions
    ? (Object.entries(regions).find(([, c]) => county && c.includes(county)) ??
        Object.entries(regions).find(([, c]) => c.length === 0))![0]
    : undefined;
  const stateWage = latest(
    stateWageRows.filter((r) =>
      tier
        ? r.tier === tier
        : r.level !== "federal" &&
          r.tier === stateWageRows.find((x) => x.level !== "federal")?.tier,
    ),
    START,
  );
  const sales = research.sales.places[state];
  const sample = sales.samples.find(
    (s: { censusPlaceGeoid?: string }) => s.censusPlaceGeoid === geoid,
  );
  const stateIncome = research.stateIncome.places[state];
  const snapRows = (research.snap.places[state] ?? []) as {
    effectiveDate: string;
    endDateExclusive: string;
    maximumByHouseholdSize: Record<string, number>;
  }[];
  const uiRows = (research.ui.places[state] ?? []) as {
    effectiveDate: string;
    maximumPublished: number[];
  }[];
  const medicaidRows = (research.medicaid.places[state] ?? []) as {
    effectiveDate: string;
    endDateExclusive: string;
    value: number;
  }[];
  return {
    chain,
    tier,
    stateWage: stateWage?.value,
    stateIncomeTop: stateIncome
      ? (stateIncome.brackets.at(-1)?.ratePercent ?? 0)
      : research.territoryIncome.places[state]?.bracketsSingle.at(-1)
          .ratePercent,
    federalIncomeTop:
      research.federalIncome.records[0].schedules.single.brackets.at(-1)
        .rateBasisPoints / 100,
    salesState: sales.stateRate,
    salesLocal: sample
      ? Math.round((sample.combinedRate - sales.stateRate) * 10000) / 10000
      : sales.localAllowed
        ? sales.avgLocalRate
        : undefined,
    property:
      county && research.property.counties[county] !== undefined
        ? research.property.counties[county]
        : research.property.states[state]?.rate,
    snap: snapRows.find((r) => on(r, START))?.maximumByHouseholdSize["1"],
    ui: latest(uiRows, START)?.maximumPublished[0],
    medicaid: medicaidRows.find((r) => on(r, START))?.value,
  };
}

function checkPlace(placeKey: string) {
  const core = world(placeKey);
  const api = coreAPI(core);
  const want = expectedFromResearch(placeKey);
  const level = (series: string, name: string) =>
    lawInForce(api, series).levels.find((l) => l.level === name)?.row?.value;
  const report: Record<string, unknown> = {
    place: want.chain.placeName,
    placeKey,
    seed,
    levels: want.chain.levels.map((l) => l.jurisdiction),
  };
  // Minimum wage: the state's own rate (or region) and the governing floor.
  if (want.stateWage !== undefined)
    expect(level("minimum-wage", "state")).toBe(want.stateWage);
  const wage = lawInForce(api, "minimum-wage");
  expect(wage.value).toBeGreaterThanOrEqual(
    Math.max(
      ...wage.levels
        .filter(
          (l) =>
            l.row && !l.setAside && l.level !== "city" && l.level !== "county",
        )
        .map((l) => l.row!.value ?? 0),
    ),
  );
  // Income tax: federal and state schedules.
  expect(level("income-tax", "federal")).toBe(want.federalIncomeTop);
  if (want.stateIncomeTop !== undefined)
    expect(level("income-tax", "state")).toBe(want.stateIncomeTop);
  if (territories.includes(want.chain.stateKey)) {
    const income = lawInForce(api, "income-tax");
    expect(income.levels.find((l) => l.level === "federal")?.setAside).toMatch(
      /territory/,
    );
    expect(income.value).toBe(
      income.levels.find((l) => l.level === "state")?.row?.value,
    );
  }
  // Sales tax: the state rate and the place's local rate (sampled or the state average).
  expect(level("sales-tax", "state")).toBe(want.salesState);
  if (want.salesLocal !== undefined)
    expect(level("sales-tax", "city")).toBe(want.salesLocal);
  // Property tax: the county's effective rate, or the state's.
  if (want.property !== undefined)
    expect(lawInForce(api, "property-tax").value).toBe(want.property);
  // Benefits.
  if (want.snap !== undefined)
    expect(level("snap-maximum", "federal")).toBe(want.snap);
  if (want.ui !== undefined)
    expect(level("unemployment-weekly-maximum", "state")).toBe(want.ui);
  if (want.medicaid !== undefined)
    expect(level("medicaid-match", "federal")).toBe(want.medicaid);
  for (const answer of lawHere(api))
    report[answer.series] =
      `${answer.value ?? "none recorded"} ${answer.unit ?? ""}${answer.estimate ? " (estimate)" : ""}`;
  govReport("laws", JSON.stringify(report));
  return { core, api, want };
}

describe("M1-01 laws in force, every level", () => {
  it("a random place: every tracked series matches its source at every level", () => {
    const place =
      process.env.GOLDEN_PATH_PLACE_KEY ?? draw(allStates, "place").key;
    checkPlace(place);
  });

  it("a random territory: every tracked series matches its source", () => {
    checkPlace(draw(territories, "territory").key);
  });

  it("a random place's state corporate income tax is the researched row, added to the federal rate, or none", () => {
    const place = draw([...allStates, ...territories], "corporate");
    const core = world(place.key);
    const api = coreAPI(core);
    const stateKey = lawChain(api).stateKey;
    const answer = lawInForce(api, "corporate-income-tax");
    const federal = answer.levels.find((l) => l.level === "federal")!.row;
    const state = answer.levels.find((l) => l.level === "state")!.row;
    // The federal rate is the same everywhere (26 U.S.C. 11(b)).
    expect(federal?.value).toBe(21);
    const researched =
      research.stateCorporate.places[stateKey] ??
      research.territoryCorporate.places[stateKey];
    govReport(
      "laws",
      JSON.stringify({
        place: place.name,
        seed,
        state: stateKey,
        corporate: state ? `${state.value} ${state.unit}` : "none",
      }),
    );
    if (!researched || researched.corporateIncomeTax === "none") {
      expect(state).toBeNull();
      expect(answer.value).toBe(21);
      return;
    }
    expect(state).not.toBeNull();
    const top =
      researched.brackets?.at(-1)?.ratePercent ?? researched.ratePercent;
    expect(state!.value).toBe(top);
    expect(state!.source).toMatch(
      /taxfoundation\.org|govinfo|bir\.vi|cnmilaw|asbar|pwc/i,
    );
    // A state's tax adds to the federal; a territory's stands in its place.
    if (researched.mirrorsFederal !== undefined) {
      expect(
        answer.levels.find((l) => l.level === "federal")?.setAside,
      ).toMatch(/territory/);
      expect(answer.value).toBe(top);
    } else expect(answer.value).toBeCloseTo(21 + top, 6);
  });

  it("every place that levies a state corporate income tax has a row, and no other has", () => {
    const starting = json("src/core2/data/laws/starting-law.json")
      .jurisdictions as Record<string, { series: string; level: string }[]>;
    const levied = Object.entries({
      ...research.stateCorporate.places,
      ...research.territoryCorporate.places,
    })
      .filter(
        ([, place]) =>
          (place as { corporateIncomeTax?: string }).corporateIncomeTax !==
          "none",
      )
      .map(([key]) => key)
      .sort();
    const have = Object.entries(starting)
      .filter(([, rows]) =>
        rows.some(
          (r) => r.series === "corporate-income-tax" && r.level === "state",
        ),
      )
      .map(([key]) => key)
      .sort();
    expect(have).toEqual(levied);
    expect(levied.length).toBe(50);
  });

  it("a state that preempts local minimum wages sets a city's ordinance aside; one that allows them lets it govern", () => {
    const authority =
      research.starting.questions[
        "us-policy-positions:labor-workforce.local-minimum-wage-authority"
      ].answers;
    const preempting = allStates.filter((s) => authority[s]?.preempts === true);
    const place = draw(preempting, "preempting");
    const core = world(place.key);
    const api = coreAPI(core);
    const chain = lawChain(api);
    const rows = api
      .moduleState(LAWS_MODULE_ID)
      .table("laws")
      .query("bySeriesOnly", ["minimum-wage"]) as unknown as LawRowInput[];
    // Edge-case fixture: a city ordinance above every floor, as some preempted
    // cities passed before their state voided them.
    const ordinance: LawRowInput = {
      id: "fixture-ordinance",
      jurisdiction: chain.levels.at(-1)!.jurisdiction,
      level: "city",
      series: "minimum-wage",
      tier: "general",
      value: 2500,
      unit: "minor/hour",
      effectiveDate: "2025-01-01",
      endDate: null,
      source: "fixture",
      retrieved: START,
      estimate: false,
    };
    const answer = resolveLawInForce({
      series: "minimum-wage",
      chain,
      date: START,
      rows: [...rows, ordinance],
      authorityRows: api
        .moduleState(LAWS_MODULE_ID)
        .table("laws")
        .query("bySeriesOnly", [
          "local-minimum-wage-authority",
        ]) as unknown as LawRowInput[],
    });
    expect(answer.levels.find((l) => l.level === "city")?.setAside).toMatch(
      /preempts/,
    );
    expect(answer.value).toBeLessThan(2500);
    // A real local ordinance where the state allows it governs above the state floor.
    const local = (
      research.localWage.rows as {
        kind: string;
        stateKey: string;
        censusGeoid: string;
        rate: number;
        effectiveDate: string;
        endDateExclusive: string | null;
      }[]
    ).filter(
      (r) =>
        r.kind === "city" &&
        authority[r.stateKey]?.answer === "yes" &&
        on(r, START),
    );
    const hash = parseInt(
      createHash("sha256").update(`${seed}:local`).digest("hex").slice(0, 8),
      16,
    );
    const city = local[hash % local.length]!;
    const cityCore = world(city.censusGeoid);
    const cityWage = lawInForce(coreAPI(cityCore), "minimum-wage");
    govReport(
      "laws",
      JSON.stringify({
        preemptingPlace: place.displayName,
        localOrdinance: lawChain(coreAPI(cityCore)).placeName,
        governing: cityWage.governing?.level,
        value: cityWage.value,
      }),
    );
    expect(cityWage.value).toBe(
      Math.max(
        Math.round(city.rate * 100),
        cityWage.levels.find((l) => l.level === "state")?.row?.value ?? 0,
      ),
    );
  });

  it("a phase not yet in effect doesn't apply until its date, then takes effect and raises a named worker", () => {
    // States whose minimum wage rises after the start, with the phase's date.
    const later = new Map<string, string>();
    for (const [state, place] of Object.entries(research.matrix.places) as [
      string,
      { rows: { operativeAt: string; value: number; tier: string }[] },
    ][]) {
      const rises = place.rows.filter(
        (r) =>
          r.operativeAt > START &&
          r.operativeAt < "2027-01-01" &&
          place.rows.some(
            (p) =>
              p.tier === r.tier && p.operativeAt <= START && p.value < r.value,
          ),
      );
      if (rises.length && state !== "US-OR")
        later.set(state, rises[0]!.operativeAt);
    }
    const states = [...later.keys()].sort();
    const place = draw(states, "raise");
    const date = later.get(place.stateJurisdictionKey!)!;
    const dayBefore = new Date(Date.parse(date) - 3 * 86_400_000)
      .toISOString()
      .slice(0, 10);
    const core = world(place.key, dayBefore);
    const api = coreAPI(core);
    const before = lawInForce(api, "minimum-wage");
    expect(before.pending.some((r) => r.effectiveDate === date)).toBe(true);
    const after = lawInForce(api, "minimum-wage", date);
    expect(after.value!).toBeGreaterThan(before.value!);
    // Stand-in for the opening paying January's law (OPUS-CORE's opening pay
    // reads a later table): one generated worker starts at the floor in force.
    const commitment = [...core.work.commitments.values()].find(
      (c) =>
        c.endsAt === undefined &&
        core.visiblePlaceIds.has(
          core.organizations.get(c.organizationId)!.placeId,
        ),
    )!;
    core.work.commitments.set(commitment.id, {
      ...commitment,
      hourlyMinor: before.value!,
    });
    const person = core.people.get(commitment.personId)!;
    advanceCore(
      core,
      new Date(Date.parse(date) + 21 * 86_400_000).toISOString().slice(0, 10),
    );
    expect(core.work.commitments.get(commitment.id)!.hourlyMinor).toBe(
      after.value,
    );
    const raise = api
      .moduleState(LAWS_MODULE_ID)
      .table("raises")
      .query("byPerson", [commitment.personId]);
    expect(raise).toHaveLength(1);
    expect(raise[0]).toMatchObject({
      date,
      fromMinor: before.value,
      toMinor: after.value,
    });
    govReport(
      "laws",
      JSON.stringify({
        place: place.displayName,
        seed,
        worker: `${person.givenName} ${person.familyName}`,
        date,
        from: before.value,
        to: after.value,
      }),
    );
  });
});
