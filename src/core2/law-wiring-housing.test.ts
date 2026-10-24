/**
 * Housing and credit laws, wired end to end in one played world: each law is
 * read by the engine that applies it (lease renewal, the builders' monthly
 * decision, the eviction hearing, the loan quote, the monthly housing line),
 * records whom it reached, full and counted, with the money it moved, and a
 * repeal ends it. One case per law names its `lawApplied` record id, the
 * journal entry of its money and the person or household it reached; the rent
 * help cases keep what the deleted rent-help test asserted. Places are drawn
 * from all 56 by a random seed (GOLDEN_PATH_SEED names one); a drawn place
 * with no subject for a law is redrawn and every place tried is named.
 */
import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../tests/golden-path/place";
import { placeReferencePopulation } from "./gov-rules/place-population";
import { corePlaceByKey } from "./place-lookup";
import { townFigures } from "./modules/housing";
import { tenants, type Tenant } from "./housing-occupancy";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { setJournalTrace } from "./journal-state";
import { govReport } from "./gov-test-report";
import { addDays, makeIsoDate } from "./kernel/dates";
import { enactLaw, lawChain, lawInForce, LAWS_MODULE_ID } from "./modules/laws";
import {
  amendBudget,
  baseBudget,
  budgetsOf,
  governments,
} from "./modules/budgets";
import {
  appliedOn,
  LAW_APPLIED_TABLE,
  type LawAppliedRow,
} from "./law-reach/applied";
import { LAW_REACH_HOST_ID } from "./law-reach/host";
import type { LawRowInput } from "./laws-starting";
import type { CoreAPI, CoreState } from "./types";
import parameters from "./data/laws/reach-group-a-parameters.json" with { type: "json" };
import construction from "./data/housing/construction.json" with { type: "json" };
import housingParameters from "./data/housing/parameters.json" with { type: "json" };

const P = "us-policy-positions:";
const KEYS = {
  rent: `${P}housing-land-use.rent-stabilization`,
  inclusionary: `${P}housing-land-use.inclusionary-requirement`,
  multifamily: `${P}housing-land-use.allow-multifamily-in-single-family-zones`,
  counsel: `${P}housing-land-use.right-to-counsel-in-eviction`,
  gas: `${P}environment-energy.ban-new-gas-hookups`,
  farmland: `${P}agriculture-natural-resources.protect-farmland-from-development`,
  cap: `${P}business-commerce.cap-consumer-loan-rates`,
  housing: "budget-line:housing",
} as const;
const QUESTIONS = [
  KEYS.rent,
  KEYS.inclusionary,
  KEYS.multifamily,
  KEYS.counsel,
  KEYS.gas,
  KEYS.farmland,
  KEYS.cap,
];
/** A place with fewer renters than this has too few leases, evictions and loans to follow in a year. */
const MIN_RENTERS = 1500;
/** Long enough for a first lease anniversary, a hearing, a loan's first payments and the first apartments built under the zoning laws (nineteen months to build) to be let. */
const DAYS = Number(process.env.HOUSING_DAYS ?? 700);
/** Days the housing line stays raised before it is cut: past the first monthly payment. */
const HELPED_DAYS = 45;

/**
 * The apartments a place of this size would start in the days played, at its
 * state's permit rate. The zoning laws act on apartment buildings, so a place
 * that would start fewer than two buildings has none to follow.
 */
function apartmentsPermitted(usps: string, people: number): number {
  const rates =
    (construction.byState as Record<string, { multiPerThousand: number }>)[
      usps
    ] ?? construction.national;
  return (rates.multiPerThousand * (people / 1000) * DAYS) / 365;
}
const UNITS_PER_BUILDING = housingParameters.housingUnitsPerBuilding.value;

type Law = keyof typeof KEYS;

/** What a case names: the law's applied record, who it reached, and the journal entry of the money. */
interface Trail {
  readonly appliedId: string;
  readonly lawId: string;
  /** The person or household (or the organization or government) the row names. */
  readonly reached: string;
  /** A living person in the reached household, when it is one. */
  readonly person?: string;
  readonly journalId: string;
  readonly amountMinor: number;
}

interface Post {
  readonly id: string;
  readonly ref: string;
  readonly date: string;
  readonly gross: number;
  readonly accounts: readonly string[];
}

interface Played {
  readonly where: string;
  readonly trails: Partial<Record<Law, Trail>>;
  /** Failures by case name; a case passes when its list is empty. */
  readonly failures: Map<string, string[]>;
}

const step = (core: CoreState, days: number) =>
  advanceCore(core, addDays(makeIsoDate(core.date), days));

/** Put a question in force (or out of it everywhere it is yes) at the town's lowest level, effective tomorrow. */
function setQuestion(api: CoreAPI, key: string, value: 0 | 1): void {
  const laws = api.moduleState(LAWS_MODULE_ID).table("laws");
  const effectiveDate = addDays(makeIsoDate(api.state.date), 1);
  const chain = lawChain(api).levels;
  const enact = (level: string, jurisdiction: string) =>
    enactLaw(api, {
      jurisdiction,
      level: level as LawRowInput["level"],
      series: key,
      value,
      effectiveDate,
      measureId: `law-wiring-housing-${value}`,
      citation: "Law-wiring test",
    });
  if (value === 1) {
    const now = lawInForce(api, key);
    if (now.value === 1) return;
    // Where a row says no, a yes at the same level replaces it.
    if (now.governing)
      return void enact(now.governing.level, now.governing.jurisdiction);
    for (const level of ["city", "county", "state", "federal"]) {
      const at = chain.find((l) => l.level === level);
      if (at) return void enact(at.level, at.jurisdiction);
    }
    return;
  }
  for (const { level, jurisdiction } of chain) {
    const latest = (
      laws.query("bySeries", [jurisdiction, key]) as unknown as LawRowInput[]
    )
      .filter((r) => r.effectiveDate <= api.state.date)
      .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))[0];
    if (latest?.value === 1) enact(level, jurisdiction);
  }
}

/** Every row an engine recorded for the key, current or ended by a later law row taking effect (the engine records the new one at its next read). */
const rowsOn = (api: CoreAPI, key: string): readonly LawAppliedRow[] =>
  (
    api
      .moduleState(LAW_REACH_HOST_ID)
      .table(LAW_APPLIED_TABLE)
      .rows() as unknown as LawAppliedRow[]
  ).filter((r) => r.key === key);

/** A person living in the household (the first by id), for a trail that names a household. */
function personIn(core: CoreState, householdId: string): string | undefined {
  return core.households
    .get(householdId)
    ?.memberIds.filter((id) => core.people.get(id)?.alive)
    .sort()[0];
}

/** The drawn place's year, played once; a message when the place has no subject for these laws. */
function play(
  place: ReturnType<typeof drawPlace>,
  people: number,
): Played | string {
  const failures = new Map<string, string[]>();
  const trails: Partial<Record<Law, Trail>> = {};
  const check = (name: string, ok: boolean, message: string) => {
    if (ok) return;
    failures.set(name, [...(failures.get(name) ?? []), message]);
  };
  const where = `${place.name} (${place.key}, seed ${place.seed})`;
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const core = world.core;
  const api = coreAPI(core);
  // The housing records open on the first day.
  step(core, 1);
  // A place needs renters, a landlord and borrowers to be a subject of these laws.
  const town = lawChain(api).townPlaceId;
  const figures = townFigures(api, town);
  const landlords = [...core.organizations.values()].filter(
    (o) => o.id.startsWith("organization:landlord:") && o.placeId === town,
  ).length;
  if (
    figures.renters < MIN_RENTERS ||
    landlords < 1 ||
    !figures.homeValueMinor ||
    !figures.rentMinor
  )
    return `no subject: ${figures.renters} renters, ${landlords} landlords, home value ${figures.homeValueMinor}, rent ${figures.rentMinor}`;
  const apartments = apartmentsPermitted(
    core.placeMetadata?.housingState ?? "",
    people,
  );
  if (apartments < 2 * UNITS_PER_BUILDING)
    return `no subject: about ${Math.round(apartments)} apartments permitted in ${DAYS} days (${people} people)`;

  // The journal posts these cases cite, by the id of the payment that made them; for a lease, the latest settlement.
  const posts: Post[] = [];
  const leasePosts = new Map<string, Post>();
  setJournalTrace((input) => {
    const ref = input.sourceRef.id;
    // A full household's lease settles as a finance contract; a counted household's rent is paid by its groups.
    const lease =
      /^finance:\d{4}-\d{2}-\d{2}:(lease:.+)$/.exec(ref)?.[1] ??
      /^(rent:[^@]+)@\d{4}-\d{2}-\d{2}/.exec(ref)?.[1];
    if (!lease && !/^(counsel|rent-assistance|construction|loan):/.test(ref))
      return;
    let gross = 0;
    for (const p of input.postings) if (p.deltaMinor > 0) gross += p.deltaMinor;
    const post = {
      id: input.id,
      ref,
      date: input.date,
      gross,
      accounts: input.postings.map((p) => p.accountId),
    };
    if (lease) leasePosts.set(lease, post);
    else posts.push(post);
  });
  /** The journal entry a lease was last paid under, when that was on or after a date, and what it paid. */
  const lastSettlement = (
    leaseId: string,
    since: string,
  ): { journalId: string; paidMinor: number } | undefined => {
    const post = leasePosts.get(leaseId);
    return post && post.gross > 0 && post.date >= since
      ? { journalId: post.id, paidMinor: post.gross }
      : undefined;
  };

  // A body in play may repeal one of these laws before an engine reads it (a council undoing rent
  // stabilization before any lease's anniversary); the test puts it back each month so every read happens under it.
  for (let day = 0; day < DAYS; day += 30) {
    for (const key of QUESTIONS) setQuestion(api, key, 1);
    step(core, Math.min(30, DAYS - day));
  }

  // Rent stabilization: every renewed lease under the law, full and counted.
  {
    const renewals = (
      api.moduleState("housing").table("renewals").rows() as unknown as {
        id: string;
        householdId?: string;
        tier?: string;
        lawId?: string | null;
        savedMinor?: number;
        rentMinor: number;
        marketRentMinor?: number;
        renewedAt: string;
      }[]
    ).filter((r) => r.lawId);
    const rent = rowsOn(api, KEYS.rent);
    check("rent", renewals.length > 0, "no lease was renewed under the law");
    check(
      "rent",
      rent.length > 0 && rent.every((r) => r.engine === "housing"),
      "the law reached nobody",
    );
    for (const r of renewals.slice(0, 5))
      check(
        "rent",
        rent.some((row) => row.targetId === r.householdId),
        `renewal ${r.id} has no applied row`,
      );
    check(
      "rent",
      rent.some((r) => r.target === "household") &&
        (renewals.every((r) => r.tier !== "counted") ||
          rent.some((r) => r.target === "group")),
      "no household, or no counted group, was recorded",
    );
    check(
      "rent",
      rent.reduce((s, r) => s + r.amountMinor, 0) >=
        renewals.reduce((s, r) => s + Math.max(0, r.savedMinor ?? 0), 0),
      "rent held below market is not in the applied rows",
    );
    // The chain: a household's lease, held below the market, paid at the held rent (its journal entry); a full household first, a counted one (the rent its groups pay) where the place has none.
    for (const tier of ["full", "counted"]) {
      if (trails.rent) break;
      for (const r of renewals) {
        if ((r.tier === "counted") !== (tier === "counted") || !r.householdId)
          continue;
        const row = rent.find(
          (x) => x.targetId === r.householdId && !x.endedOn,
        );
        const paid = lastSettlement(r.id, r.renewedAt);
        if (!row || !paid) continue;
        if (tier === "full" && paid.paidMinor !== r.rentMinor) continue;
        if (!((r.marketRentMinor ?? 0) > r.rentMinor)) continue;
        trails.rent = {
          appliedId: row.id,
          lawId: row.lawId,
          reached: r.householdId,
          person: personIn(core, r.householdId),
          journalId: paid.journalId,
          amountMinor: row.amountMinor,
        };
        break;
      }
    }
    check(
      "rent",
      Boolean(trails.rent),
      "no household's lease was held below the market and paid at the held rent",
    );
  }

  // Construction decision: the builders' organization carries each law.
  const projects = api
    .moduleState("housing")
    .table("projects")
    .rows() as unknown as {
    id: string;
    payerId: string;
    lawIds?: Record<string, string>;
    affordableUnits: number;
    askingRentMinor: number;
    medianPayMinor: number;
  }[];
  for (const [name, key, what] of [
    ["multifamily", KEYS.multifamily, "apartments-permitted"],
    ["inclusionary", KEYS.inclusionary, "set-aside-required"],
    ["gas", KEYS.gas, "all-electric-required"],
    ["farmland", KEYS.farmland, "land-restricted"],
  ] as const) {
    const rows = rowsOn(api, key);
    check(
      name === "gas" || name === "farmland" ? "construction" : name,
      rows.some((r) => r.target === "organization" && r.what === what),
      `${name}: no builder organization recorded`,
    );
  }
  // Multifamily: the landlord's row, and the construction payment of an apartment building started under the law.
  {
    const row = rowsOn(api, KEYS.multifamily).find(
      (r) => r.target === "organization" && r.what === "apartments-permitted",
    );
    const project = projects.find(
      (p) => p.lawIds?.multifamily && p.lawIds.multifamily === row?.lawId,
    );
    const paid = project
      ? posts.find(
          (p) => p.ref.startsWith(`construction:${project.id}:`) && p.gross > 0,
        )
      : undefined;
    check(
      "multifamily",
      Boolean(project),
      "no apartment building was started under the law",
    );
    check(
      "multifamily",
      Boolean(paid),
      "no construction payment cites a building started under the law",
    );
    if (row && paid)
      trails.multifamily = {
        appliedId: row.id,
        lawId: row.lawId,
        reached: row.targetId,
        journalId: paid.id,
        amountMinor: row.amountMinor,
      };
    // A household that moved into one of those buildings, and the rent it pays there.
    for (const tenant of rowsOn(api, KEYS.multifamily)) {
      if (tenant.what !== "moved-into-by-right-building") continue;
      if (tenant.target !== "household") continue;
      const rentPaid = lastSettlement(`lease:${tenant.targetId}`, tenant.since);
      if (!rentPaid) continue;
      trails.multifamily = {
        appliedId: tenant.id,
        lawId: tenant.lawId,
        reached: tenant.targetId,
        person: personIn(core, tenant.targetId),
        journalId: rentPaid.journalId,
        amountMinor: tenant.amountMinor,
      };
      break;
    }
  }
  // Inclusionary: forgone rent, and the set-aside tenant's rent paid below the asking rent.
  {
    check(
      "inclusionary",
      projects.some((p) => p.lawIds?.inclusionary && p.affordableUnits > 0),
      "no project started with set-aside units under the law",
    );
    // The set-aside rent is a share of the median pay; where that is at or above the asking rent, the unit gives up nothing.
    // Only projects started under the law row each landlord's record cites now: where a body
    // repealed the law and it was enacted again, the record follows the new row.
    const cited = new Map(
      rowsOn(api, KEYS.inclusionary).map((r) => [r.targetId, r.lawId]),
    );
    const binding = projects.filter(
      (p) =>
        p.lawIds?.inclusionary &&
        cited.get(p.payerId) === p.lawIds.inclusionary &&
        p.affordableUnits > 0 &&
        p.askingRentMinor >
          construction.inclusionary.rentShareOfIncome *
            construction.inclusionary.amiShare *
            p.medianPayMinor,
    );
    if (binding.length)
      check(
        "inclusionary",
        rowsOn(api, KEYS.inclusionary).some((r) => r.amountMinor > 0),
        `moved no money (forgone rent) though ${binding[0]!.id} rents above its set-aside rent`,
      );
    const setAside = (
      api.moduleState("housing").table("affordable").rows() as unknown as {
        householdId: string;
        projectId: string;
      }[]
    ).filter((a) =>
      projects.some((p) => p.id === a.projectId && p.lawIds?.inclusionary),
    );
    for (const a of setAside)
      check(
        "inclusionary",
        rowsOn(api, KEYS.inclusionary).some(
          (r) => r.targetId === a.householdId,
        ),
        `set-aside tenant ${a.householdId} has no applied row`,
      );
    for (const a of setAside) {
      const project = projects.find((p) => p.id === a.projectId)!;
      const row = rowsOn(api, KEYS.inclusionary).find(
        (r) => r.targetId === a.householdId && r.what === "set-aside-tenant",
      );
      const paid = lastSettlement(`lease:${a.householdId}`, "0000-00-00");
      if (!row || !paid || row.amountMinor <= 0) continue;
      if (!(paid.paidMinor < project.askingRentMinor)) continue;
      trails.inclusionary = {
        appliedId: row.id,
        lawId: row.lawId,
        reached: a.householdId,
        person: personIn(core, a.householdId),
        journalId: paid.journalId,
        amountMinor: row.amountMinor,
      };
      break;
    }
    // Before a building under the law is let (apartments take over a year and a half to build), the law's reach is the landlord that must set the units aside and the construction payment for them.
    if (!trails.inclusionary) {
      const row = rowsOn(api, KEYS.inclusionary).find(
        (r) => r.target === "organization" && r.what === "set-aside-required",
      );
      const project = projects.find(
        (p) =>
          p.lawIds?.inclusionary &&
          p.lawIds.inclusionary === row?.lawId &&
          p.affordableUnits > 0,
      );
      const paid = project
        ? posts.find(
            (p) =>
              p.ref.startsWith(`construction:${project.id}:`) && p.gross > 0,
          )
        : undefined;
      if (row && paid)
        trails.inclusionary = {
          appliedId: row.id,
          lawId: row.lawId,
          reached: row.targetId,
          journalId: paid.id,
          amountMinor: row.amountMinor,
        };
    }
    check(
      "inclusionary",
      Boolean(trails.inclusionary),
      "no set-aside tenant paying the lower rent, and no building under the law with a construction payment, has an applied row",
    );
  }

  // Right to counsel: a hearing paid by the government.
  {
    const cases = (
      api.moduleState("housing").table("cases").rows() as unknown as {
        id: string;
        householdId: string;
        counselLawId?: string | null;
        counselPaidMinor?: number;
        counselPayerId?: string;
      }[]
    ).filter((r) => r.counselLawId);
    check("counsel", cases.length > 0, "no eviction hearing had a lawyer");
    const counsel = rowsOn(api, KEYS.counsel);
    for (const row of cases.slice(0, 5)) {
      check(
        "counsel",
        counsel.some(
          (r) => r.targetId === row.householdId && r.amountMinor > 0,
        ),
        `case ${row.id}: household has no applied row with money`,
      );
      check(
        "counsel",
        counsel.some(
          (r) => r.target === "government" && r.targetId === row.counselPayerId,
        ),
        `case ${row.id}: paying government has no applied row`,
      );
      // The household's row adds up the lawyers paid for each of its cases.
      const paidForHousehold = cases
        .filter((x) => x.householdId === row.householdId)
        .reduce((sum, x) => sum + (x.counselPaidMinor ?? 0), 0);
      check(
        "counsel",
        (row.counselPaidMinor ?? 0) > 0 &&
          counsel.some(
            (r) =>
              r.targetId === row.householdId &&
              r.amountMinor === paidForHousehold,
          ),
        `case ${row.id}: the counsel payment was not paid, or the household's row does not add up its cases (paid ${paidForHousehold})`,
      );
    }
    for (const row of cases) {
      const applied = counsel.find(
        (r) => r.targetId === row.householdId && r.target !== "government",
      );
      const paid = posts.find(
        (p) => p.ref === `counsel:${row.id}` && p.gross > 0,
      );
      if (!applied || !paid) continue;
      trails.counsel = {
        appliedId: applied.id,
        lawId: applied.lawId,
        reached: row.householdId,
        person: personIn(core, row.householdId),
        journalId: paid.id,
        amountMinor: applied.amountMinor,
      };
      break;
    }
    check(
      "counsel",
      Boolean(trails.counsel),
      "no hearing's lawyer was paid through the journal with an applied row for its household",
    );
  }

  // Loan quote: each household whose quote was capped, and the interest it did not owe.
  {
    const cap = rowsOn(api, KEYS.cap);
    check(
      "cap",
      cap.some((r) => r.target === "household" || r.target === "group"),
      "the rate cap recorded no borrower",
    );
    // Interest is moved only where the market rate is above the ceiling (a cap at 36 percent binds no prime-based quote).
    check(
      "cap",
      cap.every((r) => r.amountMinor >= 0) &&
        cap.every((r) => r.what !== "interest-capped" || r.amountMinor > 0),
      "the rate cap recorded interest that was not capped",
    );
    for (const row of cap) {
      if (row.target !== "household") continue;
      const loan = posts.find(
        (p) => p.ref.startsWith(`loan:${row.targetId}:`) && p.gross > 0,
      );
      if (!loan) continue;
      trails.cap = {
        appliedId: row.id,
        lawId: row.lawId,
        reached: row.targetId,
        person: personIn(core, row.targetId),
        journalId: loan.id,
        amountMinor: row.amountMinor,
      };
      break;
    }
    check(
      "cap",
      Boolean(trails.cap),
      "no household quoted under the cap was lent to through the journal",
    );
  }

  // The housing line, raised after the year above: enough extra to cover a hundred vouchers.
  const gov =
    governments(api).find((g) => g.level === "city") ??
    governments(api).find((g) => g.level === "county") ??
    governments(api).find((g) => g.level === "state");
  check("housing", Boolean(gov), "no government to fund the housing line");
  if (gov) {
    const delta =
      parameters.parameters.housingAssistanceAnnualMinor.value * 100;
    check(
      "housing",
      budgetsOf(api, gov.id).length > 0,
      `${gov.id} has no budget this year`,
    );
    const rentAtRaise = new Map<string, Tenant>(
      tenants(api).map((t) => [t.id, t]),
    );
    const raisedOn = core.date;
    // A passed budget bill: the change joins the government's enacted lines, which every later year's budget starts from.
    amendBudget(api, {
      governmentId: gov.id,
      line: "housing",
      deltaMinor: delta,
      measureId: "law-wiring-housing-line",
      carry: true,
    });
    step(core, HELPED_DAYS);
    const help = rowsOn(api, KEYS.housing);
    check("housing", help.length > 0, "the line reached no household");
    check(
      "housing",
      help.some((r) => r.amountMinor > 0) &&
        help.some((r) => r.engine === "housing" && r.amountMinor > 0),
      "the line paid no assistance",
    );
    const paid = posts.filter(
      (p) => p.ref.startsWith("rent-assistance:") && p.date >= raisedOn,
    );
    const owner = (p: Post) =>
      /^rent-assistance:(.+):\d{4}-\d{2}-\d{2}$/.exec(p.ref)?.[1] ?? "";
    // The helped head rents: the household holds a lease (a full household) or a rent flow (a counted one).
    check(
      "rentHelp.lease",
      paid.length > 0 &&
        paid.every((p) => Boolean(rentAtRaise.get(owner(p))?.leaseId)),
      "a payment went to a household with no lease at the raise",
    );
    // No more than the rent: a full household's payment is at most its rent; a counted group's, at most the rent of the households it stands for.
    check(
      "rentHelp.atMostRent",
      paid.length > 0 &&
        paid.every((p) => {
          const t = rentAtRaise.get(owner(p));
          return t
            ? p.gross <= Math.ceil(t.rentMinor * t.weight) + t.weight
            : false;
        }),
      "a payment was more than the rent",
    );
    // A counted renter's help goes into its group's fund, the place's pooled money for it.
    const counted = paid.filter(
      (p) => rentAtRaise.get(owner(p))?.tier === "counted",
    );
    check(
      "rentHelp.counted",
      counted.length > 0 &&
        counted.every((p) => p.accounts.some((a) => a.includes("fund:"))),
      counted.length
        ? "a counted renter's help did not go into its group's fund"
        : "no counted renter was helped",
    );
    // A month later the treasury has paid.
    check(
      "rentHelp.paid",
      paid.some((p) => p.date <= addDays(makeIsoDate(raisedOn), 40)),
      "the treasury paid nothing within forty days",
    );
    const full = help.find(
      (r) => r.target === "household" && r.amountMinor > 0,
    );
    const post = full
      ? paid.find((p) => owner(p) === full.targetId && p.gross > 0)
      : undefined;
    if (full && post)
      trails.housing = {
        appliedId: full.id,
        lawId: full.lawId,
        reached: full.targetId,
        person: personIn(core, full.targetId),
        journalId: post.id,
        amountMinor: full.amountMinor,
      };
    check(
      "housing",
      Boolean(trails.housing),
      "no full household's assistance was paid through the journal with an applied row",
    );

    // Cutting the line ends every payment: no new payment after the cut, and no row left open.
    const budget = budgetsOf(api, gov.id)
      .filter((b) => b.startsOn <= core.date)
      .sort((a, b) => b.startsOn.localeCompare(a.startsOn))[0]!;
    const above =
      (budget.spendingMinor.housing ?? 0) -
      (baseBudget(api, gov, budget.fiscalYear).spendingMinor.housing ?? 0);
    check("rentHelp.cut", above > 0, "the line is not above its base to cut");
    const cutOn = core.date;
    amendBudget(api, {
      governmentId: gov.id,
      line: "housing",
      deltaMinor: -above,
      measureId: "law-wiring-housing-line-cut",
      carry: true,
    });
    step(core, 40);
    check(
      "rentHelp.cut",
      !posts.some(
        (p) => p.ref.startsWith("rent-assistance:") && p.date > cutOn,
      ),
      "assistance was paid after the line was cut",
    );
    check(
      "rentHelp.cut",
      appliedOn(api, KEYS.housing).length === 0,
      `${appliedOn(api, KEYS.housing).length} housing rows are still open after the cut`,
    );
  }

  // Repeal ends every row.
  for (const key of QUESTIONS) setQuestion(api, key, 0);
  step(core, 40);
  for (const [name, key] of Object.entries(KEYS)) {
    if (key === KEYS.housing) continue;
    const open = appliedOn(api, key);
    check(
      "repeal",
      open.length === 0,
      `${name}: ${open.length} rows still open after repeal (${open[0]?.id})`,
    );
  }
  return { where, trails, failures };
}

const base = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
let played: Played | undefined;
let notPlayed: string | undefined;

describe(`housing and credit laws reach people and move money (seed ${base})`, () => {
  beforeAll(() => {
    const bookkeepingBefore = setBookkeeping(false);
    const tried: string[] = [];
    try {
      let built = 0;
      for (let attempt = 0; built < 14 && attempt < 400; attempt++) {
        const place = drawPlace(`${base}:${attempt}`, "law-wiring-housing");
        // A town with fewer people than MIN_RENTERS cannot hold that many renting
        // households, so it is redrawn before a world is built for it.
        const people = placeReferencePopulation(
          corePlaceByKey(place.key)?.sourceGeoid ?? place.key,
        )?.value;
        if (
          people !== undefined &&
          (people < MIN_RENTERS ||
            apartmentsPermitted(place.state.replace(/^US-/, ""), people) <
              2 * UNITS_PER_BUILDING)
        )
          continue;
        built += 1;
        let result: Played | string;
        try {
          result = play(place, people ?? 0);
        } catch (error) {
          throw new Error(
            `${place.name} (${place.key}, seed ${place.seed}): ${(error as Error).message}`,
            { cause: error },
          );
        } finally {
          setJournalTrace(null);
        }
        // Each attempt builds a whole world; collect the last one before the next (the run needs --expose-gc to do so, and is otherwise only slower).
        (globalThis as { gc?: () => void }).gc?.();
        if (typeof result !== "string") {
          played = result;
          return;
        }
        tried.push(
          `${place.name} (${place.key}, seed ${place.seed}): ${result}`,
        );
      }
      notPlayed = `seed ${base}\n${tried.join("\n")}`;
    } finally {
      setBookkeeping(bookkeepingBefore);
    }
  }, 1_800_000);

  afterAll(() => setJournalTrace(null));

  /** The case passes when its list of failures is empty; a trail is printed for the law it follows. */
  function passes(name: string, law?: Law): void {
    expect(played, notPlayed).toBeDefined();
    const failed = played!.failures.get(name) ?? [];
    expect(failed, `${played!.where}: ${name}`).toEqual([]);
    if (law) {
      const trail = played!.trails[law];
      expect(trail, `${played!.where}: ${name} trail`).toBeDefined();
      govReport(
        "law-wiring-housing",
        JSON.stringify({ law: KEYS[law], where: played!.where, ...trail }),
      );
    }
  }

  it("rent stabilization: a renewed lease is held below the market, with its applied row and the rent paid", () =>
    passes("rent", "rent"));
  it("inclusionary requirement: builders set units aside and a set-aside tenant pays the lower rent", () =>
    passes("inclusionary", "inclusionary"));
  it("allow multifamily in single-family zones: the landlord's apartment buildings are started under the law and paid for", () =>
    passes("multifamily", "multifamily"));
  it("right to counsel in eviction: a hearing's lawyer is paid by the government for the household", () =>
    passes("counsel", "counsel"));
  it("cap consumer loan rates: each quoted household is recorded and lent to under the ceiling", () =>
    passes("cap", "cap"));
  it("the housing line: raising it pays a household's rent assistance through the journal", () =>
    passes("housing", "housing"));
  it("the all-electric and farmland rules reach the builders the same way", () =>
    passes("construction"));
  it("rent help: the helped head rents (a lease exists)", () =>
    passes("rentHelp.lease"));
  it("rent help: the payment is at most the rent", () =>
    passes("rentHelp.atMostRent"));
  it("rent help: a counted renter's help goes into its group's fund", () =>
    passes("rentHelp.counted"));
  it("rent help: the treasury has paid after a month", () =>
    passes("rentHelp.paid"));
  it("rent help: cutting the housing line ends every payment", () =>
    passes("rentHelp.cut"));
  it("repeal ends every row", () => passes("repeal"));
});
