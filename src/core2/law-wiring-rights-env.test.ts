/**
 * The rights, technology, environment, agriculture, parks and roads laws in
 * one played world: each reaches who it binds, an engine applies it and moves
 * money, and a repeal ends it. For every law the test names, from a generated
 * world (`buildBenchWorld`, every module installed), the `lawApplied` record,
 * the journal entry of the money and the person, household or organization
 * reached. A second test follows the outcome web's measures after their lags.
 * A place without a subject (no emitter in a nonattainment county, no farm,
 * no online platform) is redrawn; every place tried is named on failure.
 */
import { createHash, randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { countyNonattainment } from "./business-operating-rules";
import { gameStartDate } from "./game-start";
import { govReport } from "./gov-test-report";
import { setJournalTrace } from "./journal-state";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { appliedOn, type LawAppliedRow } from "./law-reach/applied";
import { reachedBy } from "./law-reach/host";
import { REACH_B_MODULE_ID } from "./law-reach/group-b-store";
import { townFacts } from "./law-reach/group-b-people";
import { ownerOf } from "./modules/business";
import { ageBiasAt } from "./jobs-age-bias";
import { reachOf } from "./counted-reach";
import {
  currentStaff,
  reachParameter,
  townPeople,
} from "./law-reach/group-a-records";
import { countedStaffOf } from "./modules/residents";
import { enactLaw, lawChain, yesLevels } from "./modules/laws";
import { amendBudget, budgetsOf, governments } from "./modules/budgets";
import { outsideAccountOf } from "./budgets-treasury";
import { corePlaceByKey } from "./place-lookup";
import { realLocalities } from "./places";
import { countyPopulationSharesForPlace } from "./reference/government-units";
import { coreAPI } from "./state";
import type { CoreAPI, CoreState } from "./types";

/** The seed named in the run: GOLDEN_PATH_SEED when set, else a fresh random one (printed on every failure). */
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const P = "us-policy-positions:";
const KEYS = {
  discrimination: `${P}civil-family-community.ban-discrimination-in-housing-and-work`,
  abortion: `${P}civil-family-community.restrict-abortion`,
  ageVerification: `${P}technology-privacy.age-verification-for-social-media`,
  facial: `${P}technology-privacy.restrict-government-facial-recognition`,
  privacy: `${P}technology-privacy.consumer-data-privacy-law`,
  cleanAir: `${P}environment-energy.clean-air-plan-for-polluted-counties`,
  groundwater: `${P}agriculture-natural-resources.limit-groundwater-withdrawal`,
  farmland: `${P}agriculture-natural-resources.protect-farmland-from-development`,
  parksFunding: `${P}civil-family-community.dedicated-parks-funding`,
  shift: `${P}transportation-infrastructure.shift-highway-funds-to-transit`,
};
const LINES = ["parks", "naturalResources", "highways"] as const;
/** How many towns are drawn, in the seeded order, before one with a subject for every law is found. */
const TRIES = 12;

function countyOf(key: string): string | undefined {
  const geoid = corePlaceByKey(key)?.sourceGeoid ?? "";
  const county =
    geoid.length === "SSPPPPP".length
      ? [...countyPopulationSharesForPlace(geoid)].sort(
          (a, b) => (b[1] ?? 0) - (a[1] ?? 0),
        )[0]?.[0]
      : geoid;
  return county && county.length === "SSCCC".length ? county : undefined;
}

/** Places in the seeded order, those whose county misses an air standard. */
function candidates(): string[] {
  const year = Number(gameStartDate().slice(0, 4));
  const rank = (key: string) =>
    createHash("sha256").update(`${seed}|rights-env|${key}`).digest("hex");
  const all = [...realLocalities()]
    .sort((a, b) => rank(a.key).localeCompare(rank(b.key)))
    .map((p) => p.key);
  return all.filter((key) => {
    const county = countyOf(key);
    return (
      county !== undefined &&
      countyNonattainment(county, year).some((row) => !row.revoked)
    );
  });
}

function setLaw(core: CoreState, api: CoreAPI, series: string, value: number) {
  for (const level of lawChain(api).levels)
    enactLaw(api, {
      jurisdiction: level.jurisdiction,
      level: level.level,
      series,
      value,
      effectiveDate: core.date,
      measureId: `fixture:rights-env:${series}:${value}:${core.date}`,
      citation: "Controlled law case after the native generated start.",
    });
}

const step = (core: CoreState, days: number) =>
  advanceCore(core, addDays(makeIsoDate(core.date), days));

/**
 * The subjects a drawn town lacks, read from its opening records before
 * anything is played: the organizations the laws bind (emitters, farms,
 * platforms, employers, builders), the residents they reach (named and
 * counted), the town's budget, and, through the engine's own rule, the
 * employers the age penalty can bind. A town lacking none plays, and a law
 * with no applied record after play then fails the test; it is never a
 * reason to redraw. A hire made over the age penalty and a builder starting a
 * project on farmland are the jobs and housing engines' own choices upstream
 * of the laws, so a town with the employers, the seekers and the builder
 * stands in for them.
 */
function lacking(core: CoreState, api: CoreAPI): string[] {
  const town = lawChain(api).townPlaceId;
  const orgs = [...core.organizations.values()].filter(
    (o) => o.placeId === town,
  );
  const has = (c: string) => orgs.some((o) => o.classification === c);
  const staffOf = (id: string) =>
    currentStaff(api, id).length + countedStaffOf(core, id);
  const facts = townFacts(api, town);
  const date = core.date;
  const born = (birthDate: string) =>
    Number(date.slice(0, 4)) -
    Number(birthDate.slice(0, 4)) -
    (date.slice(5) < birthDate.slice(5) ? 1 : 0);
  const from = reachParameter("reproductiveAgeFrom");
  const below = reachParameter("reproductiveAgeBelow");
  const women = townPeople(api).filter((p) => {
    const age = born(p.birthDate);
    return p.looks?.gender === "female" && age >= from && age < below;
  });
  const countedWomen = reachOf(core, town, {
    ageFrom: from,
    ageBelow: below,
    gender: "female",
  }).counted.people;
  const seekers = facts.residents.filter((r) => !r.employed);
  // The ages where the penalty starts and where it is whole: a younger seeker and an older one make a pick the penalty can change.
  const penaltyFrom = api.parameter("jobsAgeBiasFromAge");
  const needs: [string, boolean][] = [
    // The clean air plan binds stationary emitters (a county that misses a standard is drawn first, in candidates()).
    [
      "a stationary emitter (manufacturing or mining)",
      has("enterprise:manufacturing") || has("enterprise:mining"),
    ],
    ["a farm", has("enterprise:agriculture")],
    // Age verification binds an online platform with a cost base (business.ts readBusinessDuty).
    [
      "an online platform with a cost base",
      orgs.some(
        (o) =>
          o.classification === "enterprise:telecommunications" &&
          (core.finance.businesses.get(o.id)?.annualOtherCostsMinor ?? 0) > 0,
      ),
    ],
    [
      "an employing business",
      orgs.some(
        (o) =>
          (o.classification ?? "").startsWith("enterprise:") &&
          staffOf(o.id) > 0,
      ),
    ],
    [
      "a small employer the age penalty can bind",
      orgs.some(
        (o) =>
          (o.classification ?? "").startsWith("enterprise:") &&
          ageBiasAt(api, town, staffOf(o.id)) !== null,
      ),
    ],
    [
      "seekers of work, older and younger",
      seekers.some((r) => r.age >= api.parameter("jobsAgeBiasFullAge")) &&
        seekers.some((r) => r.age < penaltyFrom),
    ],
    ["a construction business", has("enterprise:construction")],
    ["a named woman of childbearing age", women.length > 0],
    ["counted women of childbearing age", countedWomen > 0],
    ["a named resident", facts.residents.some((r) => r.named)],
    [
      "a city government's budget",
      !!governments(api).find((g) => g.level === "city"),
    ],
  ];
  return needs.filter(([, ok]) => !ok).map(([what]) => what);
}

/** Builds a drawn town and reads what subjects it lacks from its opening records; nothing is played. */
function draw(placeKey: string, tried: string[]) {
  const { core } = buildBenchWorld(seed, gameStartDate(), {
    twoLevel: true,
    placeKey,
  });
  const api = coreAPI(core);
  const lacks = lacking(core, api);
  tried.push(`${placeKey}: lacks ${lacks.join(", ") || "nothing"}`);
  const gov = governments(api).find((g) => g.level === "city");
  return {
    core,
    api,
    gov,
    lacks,
    town: lawChain(api).townPlaceId,
    where: `seed ${seed}, ${core.placeMetadata.placeName} [${placeKey}]`,
  };
}
type World = ReturnType<typeof draw> & {
  readonly gov: NonNullable<ReturnType<typeof draw>["gov"]>;
};

/** The first town in the seeded order that has a subject for every law, by its opening records; every town tried is named when none does. */
function eligibleTown(tried: string[]): World {
  for (const placeKey of candidates().slice(0, TRIES)) {
    const d = draw(placeKey, tried);
    if (!d.lacks.length && d.gov) return d as World;
  }
  throw new Error(
    `no drawn town had a subject for every law; tried ${tried.join("; ")} (seed ${seed})`,
  );
}

/** Repeal what stood (setting 0 over any starting yes), so every law is then enacted as new. */
function repealAll(w: World) {
  const lawKeys = Object.values(KEYS);
  const startedYes = new Map(
    lawKeys.map((key) => [key, yesLevels(w.api, key).length > 0]),
  );
  for (const key of lawKeys) setLaw(w.core, w.api, key, 0);
  step(w.core, 3);
  return { lawKeys, startedYes };
}

/**
 * Sets the budget-line laws under test and, where the town's treasury cannot
 * pay a month of its lines, gives it cash (a registered stopgap).
 */
function fixtureLines(w: World) {
  const accounts = w.api.accounts();
  const budget = [...budgetsOf(w.api, w.gov.id)].sort(
    (a, b) => b.fiscalYear - a.fiscalYear,
  )[0];
  const lines = Object.values(budget?.spendingMinor ?? {}).reduce(
    (sum, minor) => sum + minor,
    0,
  );
  // Read now, as the laws are set and before any law acts: a treasury that
  // cannot pay a month of its lines pays none at its first closes, so no
  // payment can name a law. Governments open with no cash.
  const cash = accounts.balance(accounts.main(w.gov.organizationId));
  if (cash < lines / 12) {
    // stopgapId: SG-WORLD-government-opening-fund-balance
    accounts.transfer({
      id: `fixture:rights-env:treasury-cash:${w.core.date}`,
      from: accounts.main(outsideAccountOf(w.api)!),
      to: accounts.main(w.gov.organizationId),
      amountMinor: lines,
      reasonKey: "fixture",
      source: {
        tag: "SOURCED",
        citation: "Test fixture: cash for the treasury's first closes.",
        asOf: w.core.date,
      },
    });
    process.stdout.write(
      `FIXTURE treasury cash: ${w.where}: the treasury held ${cash} against ${Math.round(lines / 12)} a month of its lines; given ${lines}\n`,
    );
  }
  // The measure under test for the three budget-line laws: a line that an
  // ordinance raised is the law "budget-line:<line>" (the checker's
  // changeBudget makes the same change), so this raise is the law's own and
  // not a fixture that gives the line something to pay.
  for (const line of LINES)
    amendBudget(w.api, {
      governmentId: w.gov.id,
      line,
      deltaMinor: 10_000_00,
      measureId: `fixture:rights-env:${line}`,
    });
}

interface Post {
  readonly id: string;
  readonly ref: string;
}
interface Chain {
  readonly law: string;
  /** The `lawApplied` record (or, for a budget line, the law-reach record on a named person). */
  readonly applied: string;
  /** The journal entry of the money. */
  readonly journal: string;
  /** The person, household, organization or government reached. */
  readonly reached: string;
}

it("names, for each law, the record, the journal entry and who it reached", () => {
  setBookkeeping(false);
  const tried: string[] = [];
  const posts: Post[] = [];
  try {
    // The first town with a subject for every law, by its opening records, plays; none is redrawn after play.
    const w = eligibleTown(tried);
    const { api, core, gov, where } = w;
    const { lawKeys } = repealAll(w);
    // The first weeks are kept whole; after them only the entries that name a person the ban put in work.
    let recordAll = true;
    const watch = new Set<string>();
    setJournalTrace((input) => {
      if (recordAll || [...watch].some((id) => input.sourceRef.id.includes(id)))
        posts.push({ id: input.id, ref: input.sourceRef.id });
    });
    for (const key of lawKeys) setLaw(core, api, key, 1);
    fixtureLines(w);
    step(core, 40);

    const postWith = (...needles: string[]) =>
      posts.find((p) =>
        needles.every((n) => p.ref.includes(n) || p.id.includes(n)),
      );
    const rowsOn = (key: string, what?: string) =>
      appliedOn(api, key).filter((r) => !what || r.what === what);
    // Every law whose producer acts in the first weeks has applied it by now: the town had a subject for each, so a law with no record fails here and is never redrawn.
    const reachB = api.moduleState(REACH_B_MODULE_ID).table("people");
    const absent = [
      KEYS.cleanAir,
      KEYS.ageVerification,
      KEYS.privacy,
      KEYS.groundwater,
      KEYS.facial,
      KEYS.parksFunding,
      KEYS.shift,
      KEYS.abortion,
    ]
      .filter((key) => !rowsOn(key).length)
      .concat(
        LINES.map((line) => `budget-line:${line}`).filter(
          (key) => !reachB.query("byKey", [key, null]).length,
        ),
      );
    expect(
      absent,
      `${where}: laws with no applied record after 40 days`,
    ).toEqual([]);
    const personOf = (key: string, rows: readonly LawAppliedRow[]) =>
      [...new Set(rows.map((r) => r.lawId))]
        .flatMap((lawId) => reachedBy(api, key, lawId))
        .find((r) => api.state.people.has(r.personId))?.personId;
    const chains: Chain[] = [];
    const note = (
      law: string,
      applied: string | undefined,
      journal: string | undefined,
      reached: string | undefined,
    ) => {
      expect(applied, `${where}: ${law} record`).toBeTruthy();
      expect(journal, `${where}: ${law} journal entry`).toBeTruthy();
      expect(reached, `${where}: ${law} reached`).toBeTruthy();
      chains.push({
        law,
        applied: applied!,
        journal: journal!,
        reached: reached!,
      });
    };

    // A duty on businesses: the organization pays on the journal; the people the law protects, or its owner, are named.
    const duty = (label: string, key: string, cause: string) => {
      const row = rowsOn(key).find(
        (r) => r.target === "organization" && r.amountMinor < 0,
      );
      const post = row && postWith(`compliance:cost:${row.targetId}:`, cause);
      const person =
        personOf(key, rowsOn(key)) ??
        (row ? ownerOf(api, row.targetId) : undefined);
      note(
        label,
        row?.id,
        post?.id,
        `${person ?? "no person"} / ${row?.targetId}`,
      );
    };
    duty("clean air plan", KEYS.cleanAir, "clean-air");
    duty(
      "age verification",
      KEYS.ageVerification,
      `law:${KEYS.ageVerification}`,
    );
    duty("consumer data privacy", KEYS.privacy, `law:${KEYS.privacy}`);

    // A cap on a farm's water: the farm sells less outside the town; its own books are on the journal.
    const farm = rowsOn(KEYS.groundwater).find(
      (r) => r.target === "organization" && r.amountMinor < 0,
    );
    note(
      "groundwater limit",
      farm?.id,
      farm && postWith(farm.targetId)?.id,
      `${(farm && ownerOf(api, farm.targetId)) ?? "no person"} / ${farm?.targetId}`,
    );

    // A law that adds to a budget line: the treasury pays the line, its share under the law's own payment, to the firm that won the work and to the town's outside market; the government and its residents are reached.
    const line = (
      label: string,
      key: string,
      budgetLine: string,
      what: string,
      paidWhat?: string,
    ) => {
      // What the law added is paid on its own row (one per level that says yes); a move between lines is recorded on the government's.
      const governments = rowsOn(key, what).filter(
        (r) => r.target === "government",
      );
      const paid = paidWhat
        ? rowsOn(key, paidWhat).find((r) => r.amountMinor > 0)
        : (governments.find((r) => r.amountMinor > 0) ?? governments[0]);
      // The government whose treasury paid it is the one whose level's law row paid.
      const govRow =
        governments.find((r) => r.lawId === paid?.lawId) ?? governments[0];
      const groups = rowsOn(key, what).filter((r) => r.target === "group");
      const group = groups.find((r) => r.lawId === govRow?.lawId) ?? groups[0];
      // The counted residents a line's law serves are one group on the law's row; a move between lines records the government only (the transit line's own reach rows carry the residents).
      if (paidWhat)
        expect(
          group?.count ?? 0,
          `${where}: ${label} residents`,
        ).toBeGreaterThan(0);
      expect(
        paid?.amountMinor ?? 0,
        `${where}: ${label} money`,
      ).toBeGreaterThan(0);
      note(
        label,
        paid?.id,
        paid &&
          (paidWhat
            ? postWith(
                paid.lawId,
                `:${govRow?.targetId}:budget-line:${budgetLine}:`,
              )
            : postWith(`:${paid.targetId}:budget-line:${budgetLine}:`)
          )?.id,
        `${personOf(key, rowsOn(key)) ?? "no person"} / ${govRow?.targetId} / ${group?.targetId}${paid && paidWhat ? ` / ${paid.targetId}` : ""}`,
      );
    };
    line(
      "dedicated parks funding",
      KEYS.parksFunding,
      "parks",
      "parks-line-funded",
      "parks-line-paid",
    );
    line(
      "facial recognition limit",
      KEYS.facial,
      "police",
      "police-oversight-funded",
      "police-oversight-paid",
    );
    line(
      "shift highway funds to transit",
      KEYS.shift,
      "transit",
      "budget-lines-moved",
    );

    // A budget line a measure changed: the people it reached by name, and the money on the line.
    for (const budgetLine of LINES) {
      const key = `budget-line:${budgetLine}`;
      const reached = (
        reachB.query("byKey", [key, null]) as unknown as {
          id: string;
          personId: string;
        }[]
      ).find((r) => api.state.people.has(r.personId));
      note(
        `budget line ${budgetLine}`,
        reached?.id,
        (budgetLine === "highways"
          ? postWith("law-reach:budget-line:highways")
          : undefined
        )?.id ?? postWith(`:${gov.id}:budget-line:${budgetLine}:`)?.id,
        reached?.personId,
      );
    }

    // Counted women of childbearing age: the law moves births, and no journal entry cites it, so the money named is a reached woman's own household's.
    const women = rowsOn(KEYS.abortion).find((r) => r.target === "group");
    expect(women?.count ?? 0, `${where}: women`).toBeGreaterThan(0);
    const reachedWomen = [...new Set(rowsOn(KEYS.abortion).map((r) => r.lawId))]
      .flatMap((lawId) => reachedBy(api, KEYS.abortion, lawId))
      .map((r) => r.personId)
      .filter((id) => api.state.people.has(id));
    const homeOf = (id: string) => api.state.people.get(id)?.householdId;
    const entryOf = (id: string) =>
      postWith(id) ?? (homeOf(id) ? postWith(homeOf(id)!) : undefined);
    const woman = reachedWomen.find((id) => entryOf(id));
    note(
      "restriction on abortion",
      women?.id,
      woman && entryOf(woman)?.id,
      `${woman} / ${women?.targetId}`,
    );

    // Two chains take weeks: a hire made over the age penalty, and a builder the farmland rule restricts. Keep stepping, up to a year, until both are on the journal.
    const hired = () =>
      rowsOn(KEYS.discrimination, "hired-over-age-penalty").find((r) =>
        postWith(r.targetId.replace("hired:", ""), "work-payroll"),
      );
    const restricted = () =>
      rowsOn(KEYS.farmland).find((r) => postWith(r.targetId));
    recordAll = false;
    for (let days = 0; days < 360 && !(hired() && restricted()); days += 30) {
      for (const r of rowsOn(KEYS.discrimination, "hired-over-age-penalty"))
        watch.add(r.targetId.replace("hired:", ""));
      for (const r of rowsOn(KEYS.farmland)) watch.add(r.targetId);
      step(core, 30);
    }
    setJournalTrace(null);
    const hire = hired();
    const land = restricted();
    // The town had the employers, the seekers and the builder, so each law applied by now or the test fails.
    const lateAbsent = [
      ...(rowsOn(KEYS.discrimination, "hiring-bound-by-ban").length
        ? []
        : [`${KEYS.discrimination}: no small employer bound`]),
      ...(hire ? [] : [`${KEYS.discrimination}: no hire over the age penalty`]),
      ...(land ? [] : [`${KEYS.farmland}: no builder restricted`]),
    ];
    expect(
      lateAbsent,
      `${where}: laws with no applied record after a year`,
    ).toEqual([]);
    const hiredId = hire.targetId.replace("hired:", "");
    note(
      "ban on discrimination",
      hire.id,
      postWith(hiredId, "work-payroll")?.id,
      hiredId,
    );
    // Builders barred from farmland: the housing engine records the builder it applied the law to.
    note(
      "farmland protection",
      land.id,
      postWith(land.targetId)?.id,
      land.targetId,
    );

    expect(chains.length, `${where}: a chain for each of 13 laws`).toBe(13);
    for (const c of chains)
      expect(
        posts.some((p) => p.id === c.journal),
        `${where}: ${c.law} journal entry ${c.journal} is on the journal`,
      ).toBe(true);
    expect(core.cashJournal.totals.grossDebitMinor, where).toBe(
      core.cashJournal.totals.grossCreditMinor,
    );
    govReport(
      "law-wiring-rights-env",
      JSON.stringify({ where, tried, chains }),
    );
  } finally {
    setJournalTrace(null);
    setBookkeeping(true);
  }
}, 1_200_000);

it("moves the outcome web's measures after their lags and ends every record on repeal", () => {
  setBookkeeping(false);
  const tried: string[] = [];
  try {
    const w = eligibleTown(tried);
    const { api, core, town, where } = w;
    const { lawKeys, startedYes } = repealAll(w);
    for (const key of lawKeys) setLaw(core, api, key, 1);
    fixtureLines(w);
    step(core, 40);

    // The outcome web moves each measure after its lag.
    step(core, 365);
    const months = api
      .moduleState("core2-outcome-web-v1")
      .table("months")
      .query("byPlace", [town]) as unknown as {
      id: string;
      effects: Record<string, number>;
    }[];
    const moved = (link: string) =>
      months.find((m) => (m.effects[link] ?? 0) !== 0);
    // The web reads each law as a cause every month; a link moves its
    // measure when the law differs from the one the place really had (the
    // research's base levels already include that law).
    const lastRow = months
      .slice()
      .sort((x, y) => x.id.localeCompare(y.id))
      .at(-1)! as unknown as {
      values: Record<string, number>;
      effects: Record<string, number>;
    };
    for (const [link, key] of [
      ["abortion-ban-to-births", KEYS.abortion],
      ["emission-rules-to-particulates", KEYS.cleanAir],
      ["facial-recognition-limit-to-crime", KEYS.facial],
    ] as const) {
      expect(lastRow.values[`law:${key}`], `${where}: web reads ${key}`).toBe(
        1,
      );
      if (!startedYes.get(key))
        expect(
          moved(link),
          `${where}: web link ${link} (law began as no)`,
        ).toBeDefined();
    }
    // The groundwater link is carried by the business engine's farm limit (above), so the web does not run it.
    expect(
      months.some(
        (m) =>
          m.effects["groundwater-limits-to-irrigation-pumping"] !== undefined,
      ),
      `${where}: the web leaves the carried groundwater link alone`,
    ).toBe(false);
    // The shift's link has a two-year lag: the web reads the law this year, and moves its measure after.
    expect(
      lastRow.values[`law:${KEYS.shift}`],
      `${where}: web reads ${KEYS.shift}`,
    ).toBe(1);
    // The parks line's added percent is the measure its link reads.
    expect(
      lastRow.values["budget.parks-added-pct"],
      `${where}: the web reads the parks line`,
    ).toBeGreaterThan(0);

    // Repeal: every row ends.
    for (const key of lawKeys) setLaw(core, api, key, 0);
    step(core, 40);
    for (const key of lawKeys)
      expect(
        appliedOn(api, key).filter((r) => r.target !== "person"),
        `${where}: ${key} after repeal`,
      ).toHaveLength(0);
  } finally {
    setBookkeeping(true);
  }
  // A played world run 13 months so the 12-month web links can move: well over five minutes under load.
}, 1_200_000);
