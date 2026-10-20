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
  amendBudget,
  governments,
  openBudgets,
  type GovernmentRow,
} from "./modules/budgets";
import { openLawReach } from "./law-reach/host";
import {
  currentStaff,
  openReach,
  POLICIES,
  reachOn,
  reachParameter,
  STAFFING,
  townOrganizations,
  townPeople,
} from "./law-reach/group-a-records";
import { budgetToday, leavePremiumsOf } from "./law-reach/group-a-money";
import { staffingOf } from "./law-reach/group-a-staffing";
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
import { governmentUnitsForPlace } from "./reference/government-units";
import { searchCorePlaces, corePlaceStateIdentities } from "./place-lookup";
import { isNoncitizen } from "./citizenship";
import { citizenShareOf } from "./electorate-places";
import { reachOf } from "./counted-reach";
import { ageOn } from "./counted-groups";

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
    core = c;
    api = a;
    where = `seed ${seed}, ${state} place ${key}`;
    report.seed = seed;
    report.state = state;
    report.place = key;
    return;
  }
  throw new Error(`no incorporated town in thirty tries (seed ${seed})`);
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
  enact(key, level, 1);
  const open = openReach(api, key);
  if (mayBeEmpty && !open.length) {
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
      return (t?.grossCreditMinor ?? 0) + (t?.grossDebitMinor ?? 0);
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
    const adult = reachParameter("adultAge");
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
      recordRoundTrip(key, () => {
        const cost = electionLawTurnoutCost(api, who, minutes);
        costs[key] = cost;
        expect(Math.sign(cost), `${where}: ${key} cost ${cost}`).toBe(sign);
      });
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
    // The town's sitting legislator: its council, or the board a town of that
    // form elects in its place.
    const legislative = (s: ReturnType<typeof townSeats>[number]) =>
      selectorGroup("legislators").some((k) => s.office.kind.startsWith(k)) &&
      s.holder?.personId;
    const council =
      townSeats(api).find(
        (s) => s.office.kind === "council" && s.holder?.personId,
      ) ?? townSeats(api).find(legislative);
    recordRoundTrip(key, () => {
      if (!council) {
        // No sitting legislator in the town: nobody for the law to bind.
        expect(townSeats(api).filter(legislative), where).toEqual([]);
        return;
      }
      const reached = reachOn(api, council.holder!.personId!).some(
        (r) => r.key === key && r.endedOn === null,
      );
      expect(reached, where).toBe(true);
      expect(
        typeof termLimitReached(
          api,
          council.holder!.personId!,
          council.office.id,
        ),
      ).toBe("boolean");
    });
    if (council)
      expect(
        termLimitReached(api, council.holder!.personId!, council.office.id),
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

  it("housing spending pays rent help to the lowest-cash households the extra covers", () => {
    const key = "budget-line:housing";
    const gov = cityGov();
    const delta = reachParameter("housingAssistanceAnnualMinor") * 3;
    amendBudget(api, {
      governmentId: gov.id,
      line: "housing",
      deltaMinor: delta,
      measureId: "test:housing:up",
    });
    const assisted = openReach(api, key).filter((r) => r.spec === "assisted");
    report[key] = { assisted: assisted.length };
    expect(assisted.length, `${where}: no one assisted`).toBeGreaterThan(0);
    for (const row of assisted)
      expect(api.knows(row.targetId, `law-reach:${key}`)).toBeUndefined();
    amendBudget(api, {
      governmentId: gov.id,
      line: "housing",
      deltaMinor: -delta,
      measureId: "test:housing:down",
    });
    expect(
      openReach(api, key).filter((r) => r.spec === "assisted"),
      where,
    ).toHaveLength(0);
  });

  for (const key of Object.keys(STAFFING))
    it(`${key} hires or lays off at the public employer it funds`, () => {
      const line = key.slice("budget-line:".length);
      // The town's own government that carries the line (a county runs the jail).
      const gov = STAFFING[key]!.levels.map((level) =>
        governments(api).find(
          (g) =>
            g.level === level &&
            (budgetToday(api, g)?.spendingMinor[line] ?? 0) > 0,
        ),
      ).find((g) => g)!;
      expect(gov, `${where}: no government carries ${line}`).toBeDefined();
      const amount = budgetToday(api, gov)!.spendingMinor[line] ?? 0;
      const employers = townOrganizations(api, STAFFING[key]!.employers);
      const staff = () =>
        employers.reduce((n, o) => n + currentStaff(api, o.id).length, 0);
      const before = staff();
      amendBudget(api, {
        governmentId: gov.id,
        line,
        deltaMinor: amount,
        measureId: `test:${line}:up`,
      });
      advanceCore(core, after(api.state.date, 1));
      const funded = employers.length
        ? employers.map((o) => staffingOf(api, key, o.id)!)
        : [staffingOf(api, key, gov.organizationId)!];
      expect(
        funded.every((r) => r !== null),
        where,
      ).toBe(true);
      if (!employers.length)
        expect(funded[0]!.positions, `${where}: ${key}`).toBeGreaterThan(0);
      const up = staff();
      const hired = openReach(api, key).filter((r) => r.spec === "hired");
      report[key] = {
        line: amount,
        employers: employers.map((o) => o.id),
        before,
        positions: funded.map((r) => r.positions),
        afterRaise: up,
        hired: hired.length,
      };
      if (employers.length && before > 0) {
        expect(funded[0]!.positions, where).toBeCloseTo(
          funded[0]!.baseStaff * ((2 * amount) / amount),
        );
        expect(up, `${where}: ${key} no hires`).toBeGreaterThan(before);
        for (const row of hired)
          expect(core.people.get(row.targetId)?.jobId, where).toBeDefined();
      }
      // Cut to half the base: the newest hires and then the newest staff go.
      amendBudget(api, {
        governmentId: gov.id,
        line,
        deltaMinor: -Math.round(amount * 1.5),
        measureId: `test:${line}:down`,
      });
      advanceCore(core, after(api.state.date, 1));
      const down = staff();
      (report[key] as Record<string, unknown>).afterCut = down;
      (report[key] as Record<string, unknown>).cutPositions = employers.map(
        (o) => staffingOf(api, key, o.id)?.positions,
      );
      (report[key] as Record<string, unknown>).laidOff = openReach(
        api,
        key,
      ).filter((r) => r.spec === "laid-off").length;
      if (employers.length && before > 0)
        expect(down, `${where}: ${key} no layoffs`).toBeLessThan(up);
      // Back to the base.
      amendBudget(api, {
        governmentId: gov.id,
        line,
        deltaMinor: Math.round(amount * 0.5),
        measureId: `test:${line}:base`,
      });
      advanceCore(core, after(api.state.date, 1));
    });

  it("partnering with immigration enforcement reaches named noncitizen adults and counted members by one rule", () => {
    const key =
      "us-policy-positions:justice-public-safety.partner-with-federal-immigration-enforcement";
    enact(key, levelFor(key), 1);
    const rows = openReach(api, key).filter((r) => r.spec === "noncitizens");
    const share = citizenShareOf(
      api.state.placeMetadata.placeKey as string | undefined,
      lawChain(api).stateKey.slice(3),
    );
    const adult = reachParameter("adultAge");
    const named = rows.filter((r) => api.state.people.has(r.targetId));
    // Every named person reached is an adult the shared rule calls a noncitizen.
    for (const row of named) {
      const person = api.state.people.get(row.targetId)!;
      expect(
        ageOn(person.birthDate, api.state.date),
        `${where}: ${row.targetId}`,
      ).toBeGreaterThanOrEqual(adult);
      expect(isNoncitizen(api.state.seed, person.id, share)).toBe(true);
    }
    // And every named adult the rule calls a noncitizen is reached (none missed).
    const missed = townPeople(api).filter(
      (p) =>
        ageOn(p.birthDate, api.state.date) >= adult &&
        isNoncitizen(api.state.seed, p.id, share) &&
        !named.some((r) => r.targetId === p.id),
    );
    expect(
      missed.map((p) => p.id),
      `${where}: named noncitizens missed`,
    ).toEqual([]);
    // The counted row is the counted tier's own count under the same rule.
    const counted = rows.find((r) => r.count !== null);
    const direct = Math.round(
      reachOf(core, lawChain(api).townPlaceId, {
        ageFrom: adult,
        noncitizen: { citizenShare: share },
      }).counted.people,
    );
    expect(counted?.count ?? 0, `${where}: counted noncitizens`).toBe(direct);
    // The whole reach matches the place's survey share within sampling spread.
    const adults =
      townPeople(api).filter((p) => ageOn(p.birthDate, api.state.date) >= adult)
        .length +
      Math.round(
        reachOf(core, lawChain(api).townPlaceId, { ageFrom: adult }).counted
          .people,
      );
    const reached = named.length + direct;
    const expected = adults * (1 - share);
    const spread = 4 * Math.sqrt(adults * share * (1 - share)) + 1;
    report.citizenship = {
      share,
      adults,
      named: named.length,
      counted: direct,
    };
    expect(
      Math.abs(reached - expected),
      `${where}: ${reached} reached, ${expected.toFixed(1)} expected of ${adults} adults`,
    ).toBeLessThanOrEqual(spread);
    // A repeal ends every row the same way as any other policy.
    enact(key, levelFor(key), 0);
    expect(openReach(api, key).filter((r) => r.spec === "noncitizens")).toEqual(
      [],
    );
  });

  it("reports", () => {
    govReport("law-reach-group-a", JSON.stringify(report));
  });
});
