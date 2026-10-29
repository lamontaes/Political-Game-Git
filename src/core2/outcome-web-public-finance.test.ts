/**
 * The household-money, debt and public-finance links of the outcome web
 * (web-reach-public-finance). A link is read by the engine that owns its
 * outcome, or it is carried (the engine already decides the cause from the
 * same law, so a web number on top would count it twice), or it stays
 * unwired because no engine owns the outcome. This file holds all three:
 *
 * - the SNAP work-requirement link, carried by the SNAP benefit: played in a
 *   drawn place against a twin where the law is not in force;
 * - the parent-incarceration link, which waits on the unwired list: the
 *   justice engine's prison term ends the prisoner's jobs, but no ordinary
 *   played year reaches a parent's prison term yet;
 * - the links with no owning engine, each held to the one thing that keeps it
 *   unwired: no engine names its outcome, so none can multiply its own rate
 *   by the web's factor. When one does, the test fails and the link is wired.
 */
import { townFacts, selectResidents } from "./law-reach/group-b-people";
import { groupBPolicy } from "./law-reach/group-b";
import { randomBytes } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import stopgaps from "./data/stopgaps.json" with { type: "json" };
import unwired from "./data/outcome-web/unwired.json" with { type: "json" };
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { appliedOn } from "./law-reach/applied";
import { rowsOf } from "./law-reach/group-b-store";
import { advanceCore } from "./life";
import { governments } from "./modules/budgets";
import { enactLaw, lawChain, lawInForce, LAWS_MODULE_ID } from "./modules/laws";
import { OUTCOME_WEB_MODULE_ID, type WebMonth } from "./modules/outcome-web";
import type { LawRowInput } from "./laws-starting";
import { linkCoverage, WEB_LINKS, WIRED_INTO } from "./outcome-web-model";
import { coreAPI } from "./state";
import type { CoreAPI } from "./types";

const link = (key: string) => WEB_LINKS.find((row) => row.key === key)!;
const read = (path: string) => readFileSync(path, "utf8");

/** Every non-test source file of the new core, by path. */
function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory())
      return name === "data" ? [] : sources(path);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

describe("carried links: the engine decides the cause from the same law", () => {
  it("carries the SNAP work requirement by the SNAP benefit, which reads the same law", () => {
    const row = link("snap-work-requirement-to-participation");
    const series = row.from.slice("law:".length);
    expect(row.carriedBy).toContain("runFoodAid");
    expect(row.carriedBy).toContain("timeLimitedNow");
    // The benefit reads the link's own law, and passes what it reaches to the payment.
    const group = read("src/core2/law-reach/group-b.ts");
    expect(group).toContain(`"${series}"`);
    expect(group).toMatch(/function assistanceTimeLimit\(/);
    expect(group).toMatch(/runFoodAid\(\s*api,\s*assistanceTimeLimit\(/);
    const aid = read("src/core2/law-reach/group-b-food-aid.ts");
    expect(aid).toMatch(/export function runFoodAid\(/);
    expect(aid).toContain("timeLimitedNow(api, gov.id, FOOD_AID_KEY");
    expect(read("src/core2/law-reach/group-b-money.ts")).toMatch(
      /export function timeLimitedNow\(/,
    );
    // So the web does not also run it.
    const coverage = linkCoverage(row);
    expect(coverage.wired).toBe(false);
    expect("carriedBy" in coverage && coverage.carriedBy).toBe(row.carriedBy);
    expect((WIRED_INTO.get(row.to) ?? []).map((r) => r.key)).not.toContain(
      row.key,
    );
  });

  it("keeps the parent-incarceration link unwired until a played year shows a parent's prison term", () => {
    const row = link("parent-incarceration-to-household-income");
    // The justice engine ends a prisoner's jobs, but it imprisons only those
    // sentenced for bribery today, so no ordinary year shows a parent's prison
    // term. The link waits on the unwired list with an open stopgap rather
    // than claim the engine carries it.
    expect(row.carriedBy).toBeUndefined();
    expect(linkCoverage(row).wired).toBe(false);
    expect((WIRED_INTO.get(row.to) ?? []).map((r) => r.key)).not.toContain(
      row.key,
    );
    const listed = (
      unwired.links as { link: string; stopgapId: string }[]
    ).find((r) => r.link === row.key);
    expect(listed, row.key).toBeDefined();
    const stopgap = (
      stopgaps as unknown as { id: string; status: string }[]
    ).find((r) => r.id === listed!.stopgapId);
    expect(stopgap?.status, listed!.stopgapId).toBe("open");
  });
});

// ---------------------------------------------------------------------------
// The SNAP work requirement, played: the benefit stops the heads the law
// reaches, the web does not move SNAP receipt for it.

const seed = process.env.PUBLIC_FINANCE_SEED || randomBytes(8).toString("hex");
const ASSIST_WORK =
  "us-policy-positions:health-human-services.work-requirement-for-assistance";
const FOOD_AID = "snap-baseline";
const LINK = "snap-work-requirement-to-participation";
/** The time limit is three months of benefit; five months of reviews show who it stopped. */
const PLAYED_DAYS = Number(process.env.PUBLIC_FINANCE_DAYS || 150);
const DRAWS = Number(process.env.PUBLIC_FINANCE_DRAWS || 6);

interface Taken {
  readonly id: string;
  readonly key: string;
  readonly governmentId: string;
  readonly recipientId: string;
  readonly obligationId: string;
  readonly lawId?: string;
  readonly stoppedOn?: string;
  readonly months?: readonly string[];
}

const tomorrow = (api: CoreAPI) => addDays(makeIsoDate(api.state.date), 1);

/** The levels of the town's chain whose latest row on a question says yes. */
function levelsSayingYes(api: CoreAPI, key: string) {
  const laws = api.moduleState(LAWS_MODULE_ID).table("laws");
  return lawChain(api).levels.filter(({ jurisdiction }) => {
    const latest = (
      laws.query("bySeries", [jurisdiction, key]) as unknown as LawRowInput[]
    )
      .filter((r) => r.effectiveDate <= api.state.date)
      .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))[0];
    return latest?.value === 1;
  });
}

function setWorkRequirement(api: CoreAPI, value: 0 | 1, tag: string): void {
  if (value === 0) {
    for (const { level, jurisdiction } of levelsSayingYes(api, ASSIST_WORK))
      enactLaw(api, {
        jurisdiction,
        level,
        series: ASSIST_WORK,
        value: 0,
        effectiveDate: tomorrow(api),
        measureId: `public-finance-${tag}`,
        citation: "Public finance test: the work requirement off",
      });
    return;
  }
  const at = lawChain(api).levels.find((l) => l.level === "state")!;
  enactLaw(api, {
    jurisdiction: at.jurisdiction,
    level: "state",
    series: ASSIST_WORK,
    value: 1,
    effectiveDate: tomorrow(api),
    measureId: `public-finance-${tag}`,
    citation: "Public finance test: the work requirement on",
  });
}

/** One played world: the work requirement off (the twin) or on, SNAP paid, five months of reviews. */
function play(place: ReturnType<typeof drawPlace>, requirement: boolean) {
  setBookkeeping(false);
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  if (!lawInForce(api, "snap-maximum").value) return null;
  // The starting answer is repealed first, so the requirement is a change from no law.
  setWorkRequirement(api, 0, "open");
  advanceCore(core, addDays(makeIsoDate(core.date), 2));
  if (requirement) setWorkRequirement(api, 1, "on");
  advanceCore(core, addDays(makeIsoDate(core.date), PLAYED_DAYS));
  const accounts = api.accounts();
  const taken = rowsOf<Taken>(api, "taken");
  const drawing = new Set(
    taken
      .filter(
        (r) =>
          r.key === `benefit|${FOOD_AID}` &&
          !accounts.obligation(r.obligationId)?.endedAt,
      )
      .map((r) => r.recipientId),
  );
  const stopped = taken.filter((r) => r.key === `limit|${FOOD_AID}`);
  const draws = new Map(
    taken
      .filter((r) => r.id.startsWith("draw|"))
      .map((r) => [r.id.slice("draw|".length), r.months ?? []]),
  );
  // Who the requirement reaches on the last day: a head who aged out of it,
  // took work, or gained a child is no longer under it and may draw again.
  const reachedNow = new Set(
    selectResidents(
      townFacts(api, lawChain(api).townPlaceId),
      groupBPolicy(ASSIST_WORK)!.people!,
      lawChain(api).stateKey,
    ).map((r) => r.id),
  );
  const web = (
    api
      .moduleState(OUTCOME_WEB_MODULE_ID)
      .table("months")
      .query("byPlace", [lawChain(api).townPlaceId]) as unknown as WebMonth[]
  )
    .slice()
    .sort((a, b) => b.month.localeCompare(a.month))[0];
  const counted = appliedOn(api, ASSIST_WORK).filter(
    (r) => r.what === "assistance-stopped" && r.target === "group",
  );
  const named = appliedOn(api, ASSIST_WORK).filter(
    (r) => r.what === "assistance-stopped" && r.target === "person",
  );
  return {
    api,
    drawing,
    reachedNow,
    stopped,
    draws,
    web,
    counted,
    named,
    federal: governments(api).find((g) => g.level === "federal")!.id,
  };
}

describe(`the SNAP work requirement is the benefit's, not the web's (seed ${seed})`, () => {
  it("stops the heads the law reaches after their own months, in a drawn place, against a twin without the law", () => {
    const tried: string[] = [];
    for (let draw = 0; draw < DRAWS; draw += 1) {
      const place = drawPlace(seed, `snap-work-requirement-${draw}`);
      const where = `${place.name} (${place.key}, ${place.state}), seed ${place.seed}`;
      const shifted = play(place, true);
      if (!shifted) {
        tried.push(`${where}: no SNAP law in force`);
        continue;
      }
      if (!shifted.stopped.length) {
        tried.push(`${where}: nobody reached the time limit`);
        continue;
      }
      const twin = play(place, false)!;
      // The twin's law is not in force: nobody is stopped and no record of a stop exists.
      expect(twin.stopped, `${where}: the twin stopped heads`).toEqual([]);
      expect(twin.named, where).toEqual([]);
      expect(twin.counted, where).toEqual([]);
      // The shifted world's stops cite a work-requirement law row and the head's own months.
      const lawsTable = shifted.api.moduleState(LAWS_MODULE_ID).table("laws");
      const limit = 3;
      let held = 0;
      for (const stop of shifted.stopped) {
        expect(
          (lawsTable.get(stop.lawId!) as unknown as LawRowInput).series,
          `${where}: ${stop.id} cites ${stop.lawId}`,
        ).toBe(ASSIST_WORK);
        expect(
          shifted.draws.get(stop.recipientId)?.length,
        ).toBeGreaterThanOrEqual(limit);
        // A head the benefit stopped draws nothing from the federal treasury
        // while the requirement still reaches them. One it no longer reaches
        // (Washington, DC: a newspaper owner stopped at 64 who turned 65, past
        // the requirement's age) draws again, by the law's own terms.
        if (shifted.reachedNow.has(stop.recipientId)) {
          expect(
            shifted.drawing.has(stop.recipientId),
            `${where}: ${stop.recipientId} is stopped, still reached and still paid`,
          ).toBe(false);
          held += 1;
        }
      }
      expect(
        held,
        `${where}: a stopped head the law still reaches`,
      ).toBeGreaterThan(0);
      // The same heads still draw in the twin: the law is what stopped them.
      const stillDrawingInTwin = shifted.stopped.filter((stop) =>
        twin.drawing.has(stop.recipientId),
      );
      expect(
        stillDrawingInTwin.length,
        `${where}: no stopped head draws in the twin`,
      ).toBeGreaterThan(0);
      // The web did not also cut SNAP receipt for the law: no effect for the link, receipt at its base.
      for (const world of [shifted, twin]) {
        expect(world.web, where).toBeDefined();
        expect(world.web!.effects[LINK], `${where}: ${world.web!.id}`).toBe(
          undefined,
        );
        expect(
          world.web!.values["program.snap-receipt"],
          `${where}: ${world.web!.id}`,
        ).toBeCloseTo(world.web!.bases["program.snap-receipt"]!, 9);
      }
      console.log(
        `snap work requirement: ${where}; stopped ${shifted.stopped.length} named heads (${shifted.stopped
          .slice(0, 3)
          .map((s) => s.id)
          .join(", ")}) citing ${shifted.stopped[0]!.lawId}, ${
          stillDrawingInTwin.length
        } of them still drawing in the twin; counted groups stopped ${
          shifted.counted.map((r) => `${r.targetId}x${r.count}`).join(", ") ||
          "none"
        }; web month ${shifted.web!.id} (twin ${
          twin.web!.id
        }): ${LINK} effect ${shifted.web!.effects[LINK]}, SNAP receipt ${shifted.web!.values["program.snap-receipt"]} at base ${shifted.web!.bases["program.snap-receipt"]}`,
      );
      return;
    }
    throw new Error(
      `no drawn place had SNAP in force and heads at the time limit in ${DRAWS} draws (seed ${seed}): ${tried.join("; ")}`,
    );
  }, 3_600_000);
});

// ---------------------------------------------------------------------------
// The links no engine owns. Each stays unwired for one reason: no engine
// names its outcome, so none can multiply its own rate (or a cost or price it
// computes) by the web's factor. The stopgap row for each is open.

const UNWIRED: ReadonlyArray<{
  readonly outcome: string;
  readonly links: readonly string[];
  /** The registered stopgap that carries the reason, or null where the capstone's generated row will. */
  readonly stopgap: string | null;
  readonly reason: string;
}> = [
  {
    outcome: "finance.medical-debt-in-collections",
    links: ["coverage-to-medical-debt", "medicaid-expansion-to-medical-debt"],
    stopgap: "SG-EW-HEALTH-medical-debt-reader",
    reason:
      "no engine bills medical care or sends a bill to collections; coverage.ts says an unpaid premium is never a debt",
  },
  {
    outcome: "gov.nondisaster-transfers",
    links: ["disaster-to-public-transfers"],
    stopgap: "SG-EFFECT-WEB-prices-nondisaster-transfers",
    reason: "transfers are not kept by kind, so no series exists to scale",
  },
  {
    outcome: "household.child-poverty",
    links: ["child-benefit-to-child-poverty"],
    stopgap: null,
    reason:
      "no child benefit is paid and no engine counts child poverty apart from the poverty measure",
  },
  {
    outcome: "finance.past-due-debt",
    links: [
      "abortion-denied-to-financial-distress",
      "student-debt-relief-to-finances",
    ],
    stopgap: "SG-EFFECT-WEB-prices-past-due-debt",
    reason:
      "no denial event or student-loan balance is recorded on a household for credit's past-due loans to read",
  },
];

describe("links no engine owns stay unwired, each for one reason", () => {
  const open = new Map(
    (stopgaps as unknown as { id: string; status: string }[]).map((row) => [
      row.id,
      row.status,
    ]),
  );
  it("names every unwired link, its open stopgap and the missing engine", () => {
    for (const row of UNWIRED) {
      for (const key of row.links) {
        const found = link(key);
        expect(found, key).toBeDefined();
        expect(found.to, key).toBe(row.outcome);
        // Not carried: no engine decides the outcome from the cause.
        expect(found.carriedBy, key).toBeUndefined();
      }
      expect(row.reason.length).toBeGreaterThan(20);
    }
  });

  it("finds no engine that names these outcomes, so none multiplies a rate by the web's factor", () => {
    const files = sources("src/core2");
    for (const row of UNWIRED) {
      const naming = files.filter((path) => read(path).includes(row.outcome));
      expect(
        naming,
        `${row.outcome} is now named by an engine: wire ${row.links.join(", ")} through webReach and take it off this list`,
      ).toEqual([]);
    }
    // The stopgap rows that carry each reason are open.
    for (const row of UNWIRED)
      if (row.stopgap) expect(open.get(row.stopgap), row.stopgap).toBe("open");
  });

  it("finds only the federal treasury borrowing", () => {
    const borrowing = sources("src/core2")
      .filter((path) => /reasonKey: "federal-borrowing"/.test(read(path)))
      .sort();
    expect(borrowing).toEqual(["src/core2/budgets-treasury.ts"]);
    expect(read("src/core2/budgets-treasury.ts")).toContain(
      'gov.level === "federal" && have < need',
    );
  });
});
