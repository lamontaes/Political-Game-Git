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
import { inForceHere, reachedBy } from "./law-reach/host";
import { REACH_B_MODULE_ID } from "./law-reach/group-b-store";
import { ownerOf } from "./modules/business";
import { enactLaw, lawChain } from "./modules/laws";
import { amendBudget, governments } from "./modules/budgets";
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

/** A generated world that has every subject the laws bind, or null (the place is named in `tried`). */
function subjectWorld(placeKey: string, tried: string[]) {
  const { core } = buildBenchWorld(seed, gameStartDate(), {
    twoLevel: true,
    placeKey,
  });
  const api = coreAPI(core);
  tried.push(placeKey);
  const town = lawChain(api).townPlaceId;
  const orgs = [...core.organizations.values()].filter(
    (o) => o.placeId === town,
  );
  const has = (c: string) => orgs.some((o) => o.classification === c);
  step(core, 5);
  const emitters = orgs.filter((o) =>
    ["enterprise:manufacturing", "enterprise:mining"].includes(
      o.classification ?? "",
    ),
  );
  // Age verification binds an online platform with a cost base (business.ts readBusinessDuty).
  const platform = orgs.some(
    (o) =>
      o.classification === "enterprise:telecommunications" &&
      (core.finance.businesses.get(o.id)?.annualOtherCostsMinor ?? 0) > 0,
  );
  const gov = governments(api).find((g) => g.level === "city");
  if (!emitters.length || !has("enterprise:agriculture") || !platform || !gov)
    return null;
  return {
    core,
    api,
    gov,
    town,
    where: `seed ${seed}, ${core.placeMetadata.placeName} [${placeKey}]`,
  };
}
type World = NonNullable<ReturnType<typeof subjectWorld>>;

/** Repeal what stood (setting 0 over any starting yes), so every law is then enacted as new. */
function repealAll(w: World) {
  const lawKeys = Object.values(KEYS);
  const startedYes = new Map(
    lawKeys.map((key) => [key, inForceHere(w.api, key)]),
  );
  for (const key of lawKeys) setLaw(w.core, w.api, key, 0);
  step(w.core, 3);
  return { lawKeys, startedYes };
}

function fixtureLines(w: World) {
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
    for (const placeKey of candidates().slice(0, 6)) {
      posts.length = 0;
      const w = subjectWorld(placeKey, tried);
      if (!w) continue;
      const { api, core, gov, where } = w;
      const { lawKeys } = repealAll(w);
      // The first weeks are kept whole; after them only the entries that name a person the ban put in work.
      let recordAll = true;
      const watch = new Set<string>();
      setJournalTrace((input) => {
        if (
          recordAll ||
          [...watch].some((id) => input.sourceRef.id.includes(id))
        )
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
          personOf(key, rowsOn(key)) ?? ownerOf(api, row?.targetId ?? "");
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
        `${ownerOf(api, farm?.targetId ?? "") ?? "no person"} / ${farm?.targetId}`,
      );

      // A law that adds to a budget line: the treasury pays the line; the government and its residents are reached.
      const line = (
        label: string,
        key: string,
        budgetLine: string,
        what: string,
      ) => {
        const govRow = rowsOn(key, what).find((r) => r.target === "government");
        const group = rowsOn(key, what).find((r) => r.target === "group");
        expect(
          group?.count ?? 0,
          `${where}: ${label} residents`,
        ).toBeGreaterThan(0);
        expect(
          govRow?.amountMinor ?? 0,
          `${where}: ${label} money`,
        ).toBeGreaterThan(0);
        note(
          label,
          govRow?.id,
          govRow && postWith(`:${govRow.targetId}:${budgetLine}:`)?.id,
          `${personOf(key, rowsOn(key)) ?? "no person"} / ${govRow?.targetId} / ${group?.targetId}`,
        );
      };
      line(
        "dedicated parks funding",
        KEYS.parksFunding,
        "parks",
        "parks-line-funded",
      );
      line(
        "facial recognition limit",
        KEYS.facial,
        "police",
        "police-oversight-funded",
      );
      line(
        "shift highway funds to transit",
        KEYS.shift,
        "transit",
        "highway-money-moved-to-transit",
      );

      // A budget line a measure changed: the people it reached by name, and the money on the line.
      const reachB = api.moduleState(REACH_B_MODULE_ID).table("people");
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
          )?.id ?? postWith(`:${gov.id}:${budgetLine}:`)?.id,
          reached?.personId,
        );
      }

      // Counted women of childbearing age: the law moves births; no entry cites it, so the money named is the woman's own.
      const women = rowsOn(KEYS.abortion).find((r) => r.target === "group");
      expect(women?.count ?? 0, `${where}: women`).toBeGreaterThan(0);
      const woman = personOf(KEYS.abortion, rowsOn(KEYS.abortion));
      note(
        "restriction on abortion",
        women?.id,
        woman && postWith(woman)?.id,
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
      if (!hire || !land) continue;
      expect(
        rowsOn(KEYS.discrimination, "hiring-bound-by-ban").length,
        `${where}: small employers bound`,
      ).toBeGreaterThan(0);
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
      govReport("law-wiring-rights-env", JSON.stringify({ where, chains }));
      return;
    }
    throw new Error(
      `no place with every subject; tried ${tried.join(", ")} (seed ${seed})`,
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
    for (const placeKey of candidates().slice(0, 6)) {
      const w = subjectWorld(placeKey, tried);
      if (!w) continue;
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
        ["groundwater-limits-to-irrigation-pumping", KEYS.groundwater],
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
      return;
    }
    throw new Error(
      `no place with every subject; tried ${tried.join(", ")} (seed ${seed})`,
    );
  } finally {
    setBookkeeping(true);
  }
  // A played world run 13 months so the 12-month web links can move: well over five minutes under load.
}, 1_200_000);
