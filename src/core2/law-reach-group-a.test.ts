/**
 * Audit item 13, law breadth, group A: every labor, business, housing,
 * justice, rights, technology and government policy, once in force in a
 * generated town (a random place from all 56, by seed), changes something
 * real for named people, organizations, officeholders or counted groups
 * through the engine that owns it; a repeal ends it.
 */
import { createHash } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { govReport } from "./gov-test-report";
import { repealStartingAnswers } from "./law-test-start";
import { buildPopulation } from "./population";
import { advanceCore, createLifeCore } from "./life";
import { coreAPI } from "./state";
import type { CoreAPI, CoreState } from "./types";
import {
  enactLaw,
  lawChain,
  lawInForce,
  LAWS_MODULE_ID,
  openLaws,
} from "./modules/laws";
import { openOffices, townSeats } from "./modules/offices";
import { openElections } from "./modules/elections";
import { openCampaigns } from "./modules/campaigns";
import { openRecord } from "./modules/record";
import { authorityFor, openLegislature } from "./modules/legislature";
import { POLICY_QUESTIONS } from "./policy-answers";
import powerCatalog from "../../data/research/powers-catalog/catalog.json" with { type: "json" };
import powerMapping from "../../data/research/powers-catalog/question-powers.json" with { type: "json" };
import {
  adoptedLine,
  BUDGETS_MODULE_ID,
  governments,
  openBudgets,
  type GovernmentRow,
} from "./modules/budgets";
import { appliedOn } from "./law-reach/applied";
import { outsideAccountOf } from "./budgets-treasury";
import { openLawReach } from "./law-reach/host";
import { selectorGroup } from "./law-reach/group-a-records";
import {
  openReach,
  POLICIES,
  reachOn,
  reachParameter,
  targetsOf,
  townPeople,
} from "./law-reach/group-a-records";
import { budgetToday, leavePremiumsOf } from "./law-reach/group-a-money";
import {
  ALL_MAIL,
  AUTO_REGISTRATION,
  electionLawTurnoutCost,
  felonyDisenfranchisedShare,
  PHOTO_ID,
  RESTORE_VOTE,
  SAME_DAY,
  termLimitReached,
} from "./law-reach/group-a-voting";
// After the engines: the outcome web reads this module while it loads.
import { govMeasure } from "./gov-measures";
import { governmentUnitsForPlace } from "./reference/government-units";
import { searchCorePlaces, corePlaceStateIdentities } from "./place-lookup";

const START = "2026-01-05";
const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`reach-a:${Date.now()}`).digest("hex");
const states = [...corePlaceStateIdentities()]
  .map((s) => s.jurisdictionKey)
  .sort();
function pick<T>(list: readonly T[], salt: string): T {
  const hash = createHash("sha256").update(`${seed}:${salt}`).digest("hex");
  return list[parseInt(hash.slice(0, 8), 16) % list.length]!;
}
const after = (date: string, days: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000)
    .toISOString()
    .slice(0, 10);

let core: CoreState;
let api: CoreAPI;
let where = "";
const report: Record<string, unknown> = {};

/** A seat held by a sitting legislator: the council, or the board a town of that form elects in its place. */
const legislative = (s: ReturnType<typeof townSeats>[number]) =>
  selectorGroup("legislators").some((k) => s.office.kind.startsWith(k)) &&
  s.holder?.personId;

function openTown(): void {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const state = pick(states, `state:${attempt}`);
    const places = [
      ...searchCorePlaces("", Number.MAX_SAFE_INTEGER, {
        stateJurisdictionKey: state,
        scope: "locality",
      }),
    ]
      // A town with its own government: a council, a city budget.
      .filter((p) =>
        governmentUnitsForPlace(p.sourceGeoid ?? p.key).some(
          (u) => u.unitType === "municipality",
        ),
      )
      .sort((a, b) => a.key.localeCompare(b.key));
    if (!places.length) continue;
    const key = pick(places, `place:${attempt}`).key;
    const c = createLifeCore(
      buildPopulation({
        seed,
        placeKey: key,
        startedAt: START,
        minimumPeople: 200,
      }),
    );
    openLaws(c);
    openOffices(c, seed);
    openElections(c);
    openCampaigns(c);
    openRecord(c);
    openLegislature(c);
    openBudgets(c);
    openLawReach(c);
    repealStartingAnswers(c);
    const a = coreAPI(c);
    if (!lawChain(a).levels.some((l) => l.level === "city")) continue;
    if (!governments(a).some((g) => g.level === "city")) continue;
    // The term-limit test needs a sitting legislator: a town without one is redrawn.
    if (!townSeats(a).some(legislative)) continue;
    core = c;
    api = a;
    where = `seed ${seed}, ${state} place ${key}`;
    report.seed = seed;
    report.state = state;
    report.place = key;
    return;
  }
  throw new Error(
    `no incorporated town with a sitting legislator in thirty tries (seed ${seed})`,
  );
}

function jurisdictionOf(level: string): string {
  const row = lawChain(api).levels.find((l) => l.level === level);
  if (!row) throw new Error(`${where}: no ${level} level`);
  return row.jurisdiction;
}

/** Enact a law row that takes effect today and return its id. */
function enactLawId(key: string, level: string, value: number): string {
  return enactLaw(api, {
    jurisdiction: jurisdictionOf(level),
    level: level as "federal" | "state" | "county" | "city",
    series: key,
    value,
    effectiveDate: api.state.date,
    measureId: `test:${key}:${value}:${api.state.date}`,
    citation: `Test measure ${key} ${value}`,
  }).id;
}

/** Enact a yes (1) or a repeal (0) at a level from tomorrow, and live through it. */
function enact(key: string, level: string, value: number, days = 2): string {
  const measureId = `test:${key}:${value}:${api.state.date}`;
  enactLaw(api, {
    jurisdiction: jurisdictionOf(level),
    level: level as "federal" | "state" | "county" | "city",
    series: key,
    value,
    effectiveDate: after(api.state.date, 1),
    measureId,
    citation: `Test measure ${measureId}`,
  });
  advanceCore(core, after(api.state.date, days));
  return measureId;
}

function levelFor(key: string): string {
  if (key.startsWith("us-federal-positions:")) return "federal";
  if (
    key.endsWith("local-minimum-wage-authority") ||
    key.endsWith("broaden-local-authority") ||
    key.endsWith("paid-family-leave")
  )
    return "state";
  return "city";
}

function cityGov(): GovernmentRow {
  return governments(api).find((g) => g.level === "city")!;
}

/** The record half every question policy shares: rows on, known, then ended on repeal. */
function recordRoundTrip(
  key: string,
  between?: () => void,
  afterRepeal?: () => void,
  /** An estimated group can round to no one in a small town; its mechanic is checked instead. */
  mayBeEmpty = false,
): void {
  const level = levelFor(key);
  // The engine's own selection: a town with no one and nothing a law selects
  // (no teenager and no online business for the age check) is reached by no one.
  const selected = (POLICIES[key]?.reaches ?? []).map((spec) => ({
    spec,
    found: targetsOf(api, spec).length,
  }));
  const subject = selected.some((s) => s.found > 0);
  enact(key, level, 1);
  const open = openReach(api, key);
  if (!subject && !open.length)
    console.log(
      `${where}: ${key} selects no one here, so its mechanic is checked instead; ${
        selected.length
          ? `selectors that found nobody: ${selected
              .map(
                ({ spec }) =>
                  `${spec.id} (${spec.target}${spec.select ? ` ${JSON.stringify(spec.select)}` : ""})`,
              )
              .join("; ")}`
          : "it has no group A reach selector"
      }`,
    );
  if ((mayBeEmpty || !subject) && !open.length) {
    between?.();
    enact(key, level, 0);
    afterRepeal?.();
    return;
  }
  report[key] = {
    level,
    rows: open.length,
    people: open.filter((r) => api.state.people.has(r.targetId)).length,
    organizations: open.filter((r) => api.state.organizations.has(r.targetId))
      .length,
    groups: open
      .filter((r) => r.count !== null)
      .map((r) => `${r.spec}:${r.count}`),
  };
  expect(open.length, `${where}: ${key} reached no one`).toBeGreaterThan(0);
  for (const row of open) {
    expect(row.what.length, `${where}: ${key}`).toBeGreaterThan(0);
    expect(row.enforcer.length, `${where}: ${key}`).toBeGreaterThan(0);
    if (api.state.people.has(row.targetId))
      expect(
        api.knows(row.targetId, `law-reach:${key}`)?.value,
        `${where}: ${key} ${row.targetId}`,
      ).toBeUndefined();
  }
  between?.();
  enact(key, level, 0);
  expect(openReach(api, key), `${where}: ${key} repeal`).toHaveLength(0);
  const one = open.find((r) => api.state.people.has(r.targetId));
  if (one)
    expect(
      api.knows(one.targetId, `law-reach:${key}`)?.value,
      `${where}: ${key} repeal is not a delivered notice`,
    ).toBeUndefined();
  afterRepeal?.();
}

const questions = Object.entries(POLICIES)
  .filter(([key]) => key.includes(":") && !key.startsWith("budget-line:"))
  .map(([key, policy]) => ({ key, mechanic: policy.mechanic }));
const recordOnly = questions.filter((q) => q.mechanic === "none");

describe("audit 13, law breadth group A: every policy reaches people", () => {
  beforeAll(() => {
    openTown();
  });

  it("the minimum wage as an amount raises every in-town job under the new floor", () => {
    const before = lawInForce(api, "minimum-wage").value ?? 0;
    const floor = before + 200;
    const measureId = `test:minimum-wage:${api.state.date}`;
    enactLaw(api, {
      jurisdiction: jurisdictionOf("state"),
      level: "state",
      series: "minimum-wage",
      value: floor,
      unit: "minor/hour",
      effectiveDate: after(api.state.date, 1),
      measureId,
      citation: measureId,
    });
    advanceCore(core, after(api.state.date, 2));
    expect(lawInForce(api, "minimum-wage").value, where).toBeGreaterThanOrEqual(
      floor,
    );
    const town = new Set([lawChain(api).townPlaceId, ...core.visiblePlaceIds]);
    const under = [...core.work.commitments.values()].filter(
      (c) =>
        (c.endsAt === undefined || c.endsAt > core.date) &&
        town.has(core.organizations.get(c.organizationId)?.placeId ?? "") &&
        c.hourlyMinor < floor,
    );
    expect(
      under.map((c) => c.id),
      where,
    ).toEqual([]);
    const raises = api.moduleState(LAWS_MODULE_ID).table("raises").rows();
    report["minimum-wage"] = { before, floor, raises: raises.length };
  });

  it("raising the federal minimum wage writes the new federal floor, and a repeal restores it", () => {
    const key =
      "us-federal-positions:labor-commerce.raise-federal-minimum-wage";
    const federal = () =>
      lawInForce(api, "minimum-wage").levels.find((l) => l.level === "federal")
        ?.row?.value ?? null;
    const prior = federal();
    recordRoundTrip(
      key,
      () => {
        expect(federal(), where).toBe(
          reachParameter("federalMinimumWageTargetMinor"),
        );
        expect(
          lawInForce(api, "minimum-wage").value!,
          where,
        ).toBeGreaterThanOrEqual(
          reachParameter("federalMinimumWageTargetMinor"),
        );
      },
      () => expect(federal(), where).toBe(prior),
    );
  });

  it("raising the minimum wage writes the city's new wage, and a repeal restores it", () => {
    const key = "us-policy-positions:labor-workforce.raise-minimum-wage";
    const city = () =>
      lawInForce(api, "minimum-wage").levels.find((l) => l.level === "city")
        ?.row?.value ?? null;
    const prior = city();
    // The wage that governs before: a raise always raises it, to the $15
    // standard or the next step above a floor already there.
    const governing = lawInForce(api, "minimum-wage").value ?? 0;
    recordRoundTrip(
      key,
      () => {
        expect(city()!, where).toBeGreaterThanOrEqual(
          reachParameter("stateMinimumWageTargetMinor"),
        );
        expect(city()!, where).toBeGreaterThan(governing);
      },
      () => {
        if (prior !== null) expect(city(), where).toBe(prior);
      },
    );
  });

  it("local minimum wage authority is the state's enacted answer the laws engine reads", () => {
    const key =
      "us-policy-positions:labor-workforce.local-minimum-wage-authority";
    const answer = () =>
      (
        api
          .moduleState(LAWS_MODULE_ID)
          .table("enactments")
          .query("bySeries", ["local-minimum-wage-authority"]) as unknown as {
          answer: string;
          sequence: number;
        }[]
      )
        .slice()
        .sort((a, b) => b.sequence - a.sequence)[0]?.answer ?? null;
    recordRoundTrip(
      key,
      () => expect(answer(), where).toBe("yes"),
      () => expect(answer(), where).toBe("no"),
    );
  });

  it("paid family leave takes the premium from workers' paychecks into the state treasury", () => {
    const key = "us-policy-positions:labor-workforce.paid-family-leave";
    const state = governments(api).find((g) => g.level === "state")!;
    const share = reachParameter("paidLeavePremiumShare");
    const flows = () => {
      const t = core.cashJournal.totalsByAccount.get(
        `cash:${state.organizationId}:residual`,
      );
      return Number(t?.grossCreditMinor ?? 0) + Number(t?.grossDebitMinor ?? 0);
    };
    recordRoundTrip(
      key,
      () => {
        const before = flows();
        const since = api.state.date;
        advanceCore(core, after(api.state.date, 35));
        const paid = townPeople(api).flatMap((p) => leavePremiumsOf(api, p.id));
        const total = paid.reduce((n, r) => n + r.premiumMinor, 0);
        (report[key] as Record<string, unknown>).premiums = paid.length;
        (report[key] as Record<string, unknown>).premiumMinor = total;
        expect(paid.length, `${where}: no leave premium paid`).toBeGreaterThan(
          0,
        );
        for (const premium of paid) {
          expect(premium.governmentId, where).toBe(state.id);
          expect(premium.premiumMinor, where).toBeLessThanOrEqual(
            Math.round(premium.paidMinor * share),
          );
        }
        // The premiums reached the treasury's account through the journal.
        const later = paid
          .filter((p) => p.date > since)
          .reduce((n, r) => n + r.premiumMinor, 0);
        expect(later, where).toBeGreaterThan(0);
        expect(flows() - before, where).toBeGreaterThanOrEqual(later);
      },
      () => {
        const count = () =>
          townPeople(api).flatMap((p) => leavePremiumsOf(api, p.id)).length;
        const before = count();
        advanceCore(core, after(api.state.date, 35));
        expect(count(), `${where}: premiums after repeal`).toBe(before);
      },
    );
  });

  it("dedicated parks funding raises the city's parks line, and a repeal takes it back", () => {
    const key =
      "us-policy-positions:civil-family-community.dedicated-parks-funding";
    const parks = () => budgetToday(api, cityGov())!.spendingMinor.parks ?? 0;
    const before = parks();
    recordRoundTrip(
      key,
      () =>
        expect(parks(), where).toBe(
          before + Math.round(before * reachParameter("parksDedicatedShare")),
        ),
      () => expect(parks(), where).toBe(before),
    );
  });

  it("election laws change named voters' turnout costs, and repeals put them back", () => {
    const adult = reachParameter("votingAge");
    const workers = townPeople(api)
      .filter((p) => p.jobId)
      .map((p) => ({
        person: p,
        minutes: [...(core.work.commitmentsByPerson.get(p.id) ?? [])].reduce(
          (n, id) =>
            n + (core.work.commitments.get(id)?.expectedWeeklyMinutes ?? 0),
          0,
        ),
      }))
      .filter((w) => w.minutes > 0);
    const idle = townPeople(api).find(
      (p) =>
        !p.jobId &&
        Number(api.state.date.slice(0, 4)) - Number(p.birthDate.slice(0, 4)) >
          adult,
    );
    expect(workers.length, where).toBeGreaterThan(0);
    const worker = workers[0]!;
    const young = [...townPeople(api)]
      .filter(
        (p) =>
          Number(api.state.date.slice(0, 4)) - Number(p.birthDate.slice(0, 4)) >
          adult,
      )
      .sort((a, b) => b.birthDate.localeCompare(a.birthDate))[0]!;
    const costs: Record<string, unknown> = {};
    const check = (
      key: string,
      who: { id: string; traits: Record<string, number>; birthDate: string },
      minutes: number,
      sign: 1 | -1,
    ) => {
      expect(electionLawTurnoutCost(api, who, minutes), where).toBe(0);
      // The election laws' reach rows are the voting engine's applied rows,
      // written on registration and election day and asserted in
      // law-wiring-government.test.ts; here the cost is read at enactment.
      recordRoundTrip(
        key,
        () => {
          const cost = electionLawTurnoutCost(api, who, minutes);
          costs[key] = cost;
          expect(Math.sign(cost), `${where}: ${key} cost ${cost}`).toBe(sign);
        },
        undefined,
        true,
      );
      expect(electionLawTurnoutCost(api, who, minutes), where).toBe(0);
    };
    check(PHOTO_ID, idle ?? worker.person, idle ? 0 : worker.minutes, 1);
    check(AUTO_REGISTRATION, worker.person, worker.minutes, -1);
    check(SAME_DAY, young, 0, -1);
    check(ALL_MAIL, worker.person, worker.minutes, -1);
    report.turnoutCosts = costs;
  });

  it("restoring the vote after a sentence returns counted adults to the rolls", () => {
    const before = felonyDisenfranchisedShare(api);
    recordRoundTrip(
      RESTORE_VOTE,
      () =>
        before > 0
          ? expect(felonyDisenfranchisedShare(api), where).toBeLessThan(before)
          : expect(felonyDisenfranchisedShare(api), where).toBe(before),
      undefined,
      true,
    );
    expect(felonyDisenfranchisedShare(api), where).toBe(before);
  });

  it("legislative term limits bind the council's members, read by the filing check", () => {
    const key =
      "us-policy-positions:government-operations.legislative-term-limits";
    const council =
      townSeats(api).find(
        (s) => s.office.kind === "council" && s.holder?.personId,
      ) ?? townSeats(api).find(legislative);
    expect(council, `${where} no sitting legislator`).toBeDefined();
    recordRoundTrip(key, () => {
      const reached = reachOn(api, council!.holder!.personId!).some(
        (r) => r.key === key && r.endedOn === null,
      );
      expect(reached, where).toBe(true);
      expect(
        typeof termLimitReached(
          api,
          council!.holder!.personId!,
          council!.office.id,
        ),
      ).toBe("boolean");
    });
    expect(
      termLimitReached(api, council!.holder!.personId!, council!.office.id),
    ).toBe(false);
  });

  for (const { key } of recordOnly)
    it(`${key.split(":").pop()} reaches named people, organizations or groups, and a repeal ends it`, () => {
      recordRoundTrip(key);
    });

  it("broader local authority: the council's authority check reads the state's home-rule law, and a repeal takes it back", () => {
    const homeRule =
      "us-policy-positions:government-operations.broaden-local-authority";
    const state = lawChain(api).stateKey;
    const questions = powerMapping.questions as Record<
      string,
      { dial: string; levels: string[]; gate?: unknown }
    >;
    // A question the state has not settled and the powers catalog leaves open for a city.
    const question = Object.entries(questions).find(
      ([key, row]) =>
        row.levels.includes("city") &&
        !row.gate &&
        !POLICY_QUESTIONS[key]?.answers[state]?.preempts &&
        powerCatalog.dials.some(
          (d) => d.id === row.dial && d.levels.city.may === "UNKNOWN",
        ),
    )?.[0];
    expect(question, where).toBeDefined();
    const provision = {
      kind: "policy-question" as const,
      question: question!,
      value: 1,
    };
    const grantId = enactLawId(homeRule, "state", 1);
    const granted = authorityFor(api, provision);
    // The federal district's combined powers are explicit grants, not home rule.
    if (granted.source !== grantId) {
      report.homeRule = "powers read from the catalog in this place";
      return;
    }
    expect(granted.allowed, where).toBe(true);
    const repealId = enactLawId(homeRule, "state", 0);
    const taken = authorityFor(api, provision);
    expect(taken, where).toMatchObject({ allowed: false, source: repealId });
    // Home rule is read at the decision, so no second record of the law stands.
    expect(openReach(api, homeRule), where).toEqual([]);
    report.homeRule = { question, grantId, repealId };
  });

  it("a dedicated parks law at the state moves the town's parks measure the outcome web reads, and a repeal puts it back", () => {
    const key =
      "us-policy-positions:civil-family-community.dedicated-parks-funding";
    const before = govMeasure(api, "budget.parks-added-pct") ?? 0;
    enact(key, "state", 1);
    expect(
      govMeasure(api, "budget.parks-added-pct") ?? 0,
      where,
    ).toBeGreaterThan(before);
    enact(key, "state", 0);
    expect(govMeasure(api, "budget.parks-added-pct") ?? 0, where).toBeCloseTo(
      before,
      6,
    );
  });

  // Last in the file: it lives a year, which the tests above (they share this town) must not.
  it("the treasury reads a dedicated parks levy again when a new fiscal year's budget is adopted, and a repeal ends it", () => {
    const key =
      "us-policy-positions:civil-family-community.dedicated-parks-funding";
    const gov = cityGov();
    const share = reachParameter("parksDedicatedShare");
    enact(key, "city", 1);
    const first = budgetToday(api, gov)!;
    // A treasury that cannot pay a month of its lines pays none at its first close, and then nothing is paid under the law (governments open with no cash). Read as the law is set, before it acts: the town's treasury is given a year of its lines, an edge fixture, so the first close pays.
    const accounts = api.accounts();
    const lines = Object.values(first.spendingMinor).reduce(
      (sum, minor) => sum + minor,
      0,
    );
    const cash = accounts.balance(accounts.main(gov.organizationId));
    if (cash < lines / 12) {
      // stopgapId: SG-WORLD-government-opening-fund-balance
      accounts.transfer({
        id: `fixture:parks-levy-cash:${api.state.date}`,
        from: accounts.main(outsideAccountOf(api)!),
        to: accounts.main(gov.organizationId),
        amountMinor: lines,
        reasonKey: "fixture",
        source: {
          tag: "SOURCED",
          citation: "Test fixture: cash for the treasury's first close.",
          asOf: api.state.date,
        },
      });
      process.stdout.write(
        `FIXTURE treasury cash: ${where}: the treasury held ${cash} against ${Math.round(lines / 12)} a month of its lines; given ${lines}\n`,
      );
    }
    // The treasury's first close pays the levy's share of the line under the law's own payment, and records whom it reached.
    advanceCore(core, after(api.state.date, 35));
    const paid = appliedOn(api, key).filter(
      (r) => r.what === "parks-line-paid",
    );
    expect(
      paid.length,
      `${where}: the levy's share is recorded`,
    ).toBeGreaterThan(0);
    expect(
      paid.every((r) => r.amountMinor > 0),
      where,
    ).toBe(true);
    expect(
      (
        api
          .moduleState(BUDGETS_MODULE_ID)
          .table("spendingPayments")
          .rows() as unknown as {
          id: string;
          amountMinor: number;
        }[]
      ).some((p) => p.id.includes(paid[0]!.lawId) && p.amountMinor > 0),
      `${where}: a payment names the law row ${paid[0]?.lawId}`,
    ).toBe(true);
    // Live to the next fiscal year's start: its budget begins without the levy.
    for (
      let i = 0;
      i < 14 && budgetToday(api, gov)!.fiscalYear === first.fiscalYear;
      i += 1
    )
      advanceCore(core, after(api.state.date, 30));
    const next = budgetToday(api, gov)!;
    expect(next.fiscalYear, where).toBeGreaterThan(first.fiscalYear);
    // The law is still in force, so the new year's line carries the levy on the line as the council adopted it
    // (a budget bill the council passed that year may have moved the line itself).
    const adopted = adoptedLine(api, gov, next.fiscalYear, "parks");
    expect(next.spendingMinor.parks, where).toBe(
      adopted + Math.round(adopted * share),
    );
    enact(key, "city", 0);
    expect(budgetToday(api, gov)!.spendingMinor.parks ?? 0, where).toBe(
      adopted,
    );
    // A repeal ends the treasury's records of it.
    expect(
      appliedOn(api, key).filter((r) => r.what === "parks-line-paid"),
      where,
    ).toHaveLength(0);
    // It lives a year and a month of a town's days: over the default 30 seconds on a loaded machine.
  }, 180_000);

  it("reports", () => {
    govReport("law-reach-group-a", JSON.stringify(report));
  });
});
