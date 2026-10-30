/**
 * The second crime and justice family of the outcome web, in a played world.
 *
 * - parent-incarceration-to-household-income is carried by the justice
 *   engine, not the web: a prison term ends the jobs the sentenced person
 *   holds (imprison and endCustodyJobs, run by justiceWork, in
 *   src/core2/modules/justice.ts), so their household's income in the jobs
 *   records loses that earner's pay. The played case: a place drawn from all
 *   56 on a seed nobody chose (CRIME_JUSTICE_2_SEED names one), the bench
 *   world with every module installed, built twice from the same seed (one
 *   after the other, so only one is in memory). A working parent of a child
 *   (by the parent-child family record), one in each household, is charged
 *   in one world and not the other; the court convicts and imprisons them,
 *   their job ends on the custody record (the parent's own record of the
 *   job's end, job:<id>:status, names that custody as its source), and their
 *   household's yearly income (fullHouseholdIncomes, the reading the crime
 *   and school engines take of a household's income) falls by their pay
 *   against the twin's, every other income record of the household being the
 *   same in both.
 * - The case names no bribe, so the court's months are the least of the
 *   state's bribery range (convict). About half the places' statutes start
 *   that range at 0 months, probation only (for example Fla. Stat.
 *   775.082(3)(d), ORS 161.605(2)); such a place cannot show a prison term
 *   and is passed over with its statute, after its build and before its run.
 * - A conviction vacates the parent's seats (convictionForfeitsOffice), and
 *   the office day then ends a full-time seat's payroll job (reviewOfficeJobs)
 *   whether or not the parent is imprisoned. A term whose ended jobs include
 *   such a job cannot show the prison term's own reach, so it is passed over
 *   with the seat named.
 * - The other six links stay unread, each on SG-WEB-crime-justice-links-unread
 *   with the reason its row gives: no recorded cause, no size the game can
 *   apply, or no engine that decides the outcome.
 */
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../tests/golden-path/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { fullHouseholdIncomes } from "./counted-income-fifth";
import stopgaps from "./data/stopgaps.json" with { type: "json" };
import unwired from "./data/outcome-web/unwired.json" with { type: "json" };
import { gameStartDate } from "./game-start";
import { briberyRange, dispositionDays } from "./justice-law";
import { addDays, ageOnDate, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import {
  chargeDecision,
  JUSTICE_MODULE_ID,
  type CaseRow,
  type CustodyRow,
  type InvestigationRow,
  type SentenceRow,
} from "./modules/justice";
import { lawChain } from "./modules/laws";
import { OFFICE_DAY_MODULE_ID, type OfficeJobRow } from "./modules/office-day";
import { linkCoverage, WEB_LINKS, WIRED_INTO } from "./outcome-web-model";
import { coreAPI } from "./state";
import type { CoreState } from "./types";

const seed =
  process.env.CRIME_JUSTICE_2_SEED || randomBytes(20).toString("hex");
const LINK = "parent-incarceration-to-household-income";
const UNREAD = [
  "summer-jobs-to-youth-violence",
  "release-lower-level-to-larceny",
  "graduation-to-incarceration",
  "mandatory-minimums-to-incarceration",
  "mandatory-minimum-cut-to-federal-prisoners",
  "housing-vouchers-to-crime",
] as const;
const FAMILY_STOPGAP = "SG-WEB-crime-justice-links-unread";
/**
 * Places drawn before giving up. 30 of the 56 places' bribery statutes start
 * at 0 months, so a draw reaches a prison minimum at 26 in 56, and 24 draws
 * all miss at about 3 in 10 million. A probation-only place costs only its
 * build.
 */
const TRIES = 24;
/**
 * Working parents charged in the one world, each from a different household,
 * so at least one is imprisoned and no charged parent's household also loses
 * another charged member's pay.
 */
const CHARGED = 6;
const DAYS_PER_YEAR = 365;
const MONTHS_PER_YEAR = 12;

const linkOf = (key: string) => WEB_LINKS.find((row) => row.key === key)!;
const openStopgap = (id: string) =>
  (
    stopgaps as unknown as {
      id: string;
      status: string;
      whatItFakes: string;
    }[]
  ).find((row) => row.id === id && row.status === "open");

const build = (drawn: ReturnType<typeof drawPlace>) =>
  buildBenchWorld(drawn.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: drawn.key,
  }).core as CoreState;

/** A person's jobs that have not ended. */
const liveJobs = (core: CoreState, personId: string) =>
  [...core.jobs.values()].filter(
    (job) => job.personId === personId && job.endsAt === undefined,
  );
/** What a person's live jobs pay in a year, as fullHouseholdIncomes counts it. */
const yearly = (core: CoreState, personId: string) =>
  liveJobs(core, personId).reduce(
    (n, job) => n + job.wageDailyMinor * DAYS_PER_YEAR,
    0,
  );
/**
 * A household's income records, each with what it brings in a year, by the
 * rule fullHouseholdIncomes counts them: every live job of a person who lives
 * in the household, and every income award recorded to it.
 */
const incomeRecords = (core: CoreState, home: string) => {
  const records = new Map<string, number>();
  for (const job of core.jobs.values())
    if (
      job.endsAt === undefined &&
      core.people.get(job.personId)?.householdId === home
    )
      records.set(job.id, job.wageDailyMinor * DAYS_PER_YEAR);
  for (const c of core.finance.contracts.values())
    if (c.recipientIncome?.householdId === home && !c.endedAt)
      records.set(c.id, (c.amountMinor * MONTHS_PER_YEAR) / c.periodMonths);
  return records;
};

/** A parent the court imprisoned in the charged world, as that world left them. */
interface Term {
  readonly personId: string;
  readonly name: string;
  readonly home: string;
  readonly caseId: string;
  readonly sentence: SentenceRow;
  readonly custody: CustodyRow;
  /** Each ended job's end record, as the parent's own record of it names its source. */
  readonly endedBy: readonly string[];
  /** The household's yearly income, and each of its income records, with the term. */
  readonly income: number;
  readonly records: ReadonlyMap<string, number>;
}

/**
 * The charged world: named working parents of a child in the town, one in
 * each household, are charged on the first day, and the world runs past their
 * hearing and the morning their jobs end. Returns who the court imprisoned,
 * or why none was.
 */
function chargedWorld(
  drawn: ReturnType<typeof drawPlace>,
): { through: string; terms: Term[]; skipped: string[] } | string {
  const core = build(drawn);
  const api = coreAPI(core);
  const chain = lawChain(api);
  // The case names no bribe, so the court sets the least term of the state's
  // bribery range (convict); where that is 0 months, it sentences probation.
  const range = briberyRange(api, chain.stateKey);
  if (range.minMonths <= 0)
    return `the case names no bribe, so the court sets the least term of ${chain.stateKey}'s bribery range, ${range.minMonths} of ${range.maxMonths} months (${range.source.citation}): probation, no prison term`;
  const adult = api.parameter("votingAge");
  // Each person's children, by the parent-child family records.
  const children = new Map<string, string[]>();
  for (const link of core.familyLinks.values())
    if (link.kind === "parent-child")
      children.set(link.personIds[0], [
        ...(children.get(link.personIds[0]) ?? []),
        link.personIds[1],
      ]);
  const working = [...core.people.values()]
    .filter((p) => {
      if (
        !p.alive ||
        p.tier === "husk" ||
        p.id === core.playerId ||
        p.placeId !== chain.townPlaceId ||
        ageOnDate(p.birthDate, core.date) < adult ||
        !liveJobs(core, p.id).length
      )
        return false;
      // A child of theirs, under age, who lives with them.
      return (children.get(p.id) ?? []).some((id) => {
        const child = core.people.get(id);
        return (
          child?.alive &&
          child.householdId === p.householdId &&
          ageOnDate(child.birthDate, core.date) < adult
        );
      });
    })
    .sort((a, b) => a.id.localeCompare(b.id));
  // One parent a household, so the rest of each charged parent's household
  // is the same in both worlds.
  const homes = new Set<string>();
  const parents = working.filter((p) => {
    if (homes.has(p.householdId)) return false;
    homes.add(p.householdId);
    return true;
  });
  if (!parents.length) return "no named working parent in the town";
  // The prosecutor's case, opened in this world only: the justice engine
  // charges, holds or bails, hears and sentences it itself.
  const table = (name: string) =>
    api.moduleState(JUSTICE_MODULE_ID).table(name);
  const cases: CaseRow[] = [];
  for (const parent of parents.slice(0, CHARGED)) {
    const row: InvestigationRow = {
      id: `investigation:crime-justice-2:${parent.id}`,
      complaintIds: [],
      crimeId: `crime:crime-justice-2:${parent.id}`,
      prosecutorOfficeId: `office:crime-justice-2:${parent.id}`,
      prosecutorPersonId: null,
      opened: true,
      date: core.date,
      reasons: {},
      targets: [
        { personId: parent.id, crimeIds: [], evidence: [], strength: 1 },
      ],
      status: "open",
    };
    table("investigations").put(row as never);
    chargeDecision(api, row.id);
    const c = table("cases").get(`case:${row.id}:${parent.id}`) as
      CaseRow | undefined;
    if (c?.status === "charged") cases.push(c);
  }
  if (!cases.length) return "no parent was charged";
  // Past the hearing, and the morning the jobs end.
  const through = addDays(
    makeIsoDate(core.date),
    dispositionDays(api, chain.stateKey).days + 3,
  );
  advanceCore(core, through);
  const incomes = fullHouseholdIncomes(core);
  const terms: Term[] = [];
  const skipped: string[] = [];
  for (const c of cases) {
    const sentence = table("sentences").get(`sentence:${c.id}`) as
      SentenceRow | undefined;
    const custody = table("custody").get(`custody:sentence:${c.id}`) as
      CustodyRow | undefined;
    if (!sentence || !custody || custody.status !== "serving") {
      skipped.push(
        `${c.defendantId} not serving a term (${sentence ? `${sentence.id}: ${sentence.custodyMonths} custody months and ${sentence.probationMonths} on probation, the court's ${sentence.reasons.courtMonths} months against the range's least ${sentence.reasons.rangeMinMonths}` : `${c.id} ${(table("cases").get(c.id) as unknown as CaseRow | undefined)?.status}`})`,
      );
      continue;
    }
    if (!sentence.jobsEnded.length) {
      skipped.push(
        `${c.defendantId} held no job when sentenced (${sentence.id})`,
      );
      continue;
    }
    // A seat the conviction vacated ends its payroll job in the office day
    // (convictionForfeitsOffice, then reviewOfficeJobs), prison term or not,
    // so such a term cannot show what the prison term alone ends.
    const seatJobs = core.modules.has(OFFICE_DAY_MODULE_ID)
      ? api
          .moduleState(OFFICE_DAY_MODULE_ID)
          .table("officeJobs")
          .rows()
          .map((raw) => raw as unknown as OfficeJobRow)
          .filter(
            (row) =>
              row.jobId !== null &&
              sentence.seatsVacated.includes(row.seatId) &&
              sentence.jobsEnded.includes(row.jobId),
          )
      : [];
    if (seatJobs.length) {
      skipped.push(
        `${c.defendantId}'s ${seatJobs.map((row) => `${row.jobId} (the payroll job of ${row.seatId}, ${row.title})`).join(", ")} ended with the seat the conviction vacated (${sentence.id}), prison term or not`,
      );
      continue;
    }
    // Every job the term ended has ended, on the custody's own record (the
    // parent's record of the job's end names the custody), and the parent
    // holds none.
    const endedBy = sentence.jobsEnded.map((id) => {
      expect(core.jobs.get(id)?.endsAt, `${id} ended`).not.toBe(undefined);
      const source = core.knowledgeByPerson
        .get(c.defendantId)
        ?.get(`job:${id}:status`)?.sourceId;
      expect(
        source?.startsWith(`${custody.id}:`),
        `${id}'s end record names ${custody.id}, not ${source ?? "nothing"}`,
      ).toBe(true);
      return source!;
    });
    expect(yearly(core, c.defendantId), c.defendantId).toBe(0);
    const person = core.people.get(c.defendantId)!;
    terms.push({
      personId: c.defendantId,
      name: `${person.givenName} ${person.familyName}`,
      home: person.householdId,
      caseId: c.id,
      sentence,
      custody,
      endedBy,
      income: incomes.get(person.householdId) ?? 0,
      records: incomeRecords(core, person.householdId),
    });
  }
  return { through, terms, skipped };
}

describe("the crime and justice links left unread", () => {
  it("each waits on the family's stopgap with its own reason", () => {
    const rows = unwired.links as {
      link: string;
      reason: string;
      stopgapId: string;
    }[];
    const stopgap = openStopgap(FAMILY_STOPGAP);
    expect(stopgap, FAMILY_STOPGAP).toBeDefined();
    for (const key of UNREAD) {
      const link = linkOf(key);
      const coverage = linkCoverage(link);
      // No engine carries it. The web runs only the federal cut, into its
      // own ledger, which no engine reads.
      expect("carriedBy" in coverage, key).toBe(false);
      expect(coverage.wired, key).toBe(
        key === "mandatory-minimum-cut-to-federal-prisoners",
      );
      const listed = rows.find((row) => row.link === key);
      expect(listed?.stopgapId, key).toBe(FAMILY_STOPGAP);
      if (coverage.wired)
        expect(listed!.reason, key).toMatch(/^engine doesn't read the factor/);
      // The stopgap names the link and why it waits.
      expect(stopgap!.whatItFakes, key).toContain(key);
    }
  });
});

describe("a parent's prison term reaches their household's income", () => {
  it("is carried by the justice engine's prison term, not the web", () => {
    const link = linkOf(LINK);
    expect(link.carriedBy, "the justice engine carries it").toContain(
      "endCustodyJobs",
    );
    expect(link.size, "the researched check").toBeLessThan(0);
    // The engine's own path: imprisonment schedules the end of each job, and
    // the calendar work ends it.
    const justice = readFileSync("src/core2/modules/justice.ts", "utf8");
    expect(justice).toMatch(/function endCustodyJobs\(/);
    expect(justice).toMatch(/if \(jobIds\.length\) endCustodyJobs\(/);
    expect(justice).toMatch(/api\.endJob\(jobId, `\$\{custody\.id\}/);
    // So the web does not also run it, and it is off the unwired list.
    expect(linkCoverage(link).wired).toBe(false);
    expect((WIRED_INTO.get(link.to) ?? []).map((r) => r.key)).not.toContain(
      LINK,
    );
    expect(
      (unwired.links as { link: string }[]).some((row) => row.link === LINK),
    ).toBe(false);
  });

  it(
    `a working parent imprisoned in one world takes their pay out of the household's income against the twin (seed ${seed})`,
    { timeout: 3_600_000 },
    () => {
      const bookkeeping = setBookkeeping(false);
      const passed: string[] = [];
      try {
        for (let attempt = 0; attempt < TRIES; attempt += 1) {
          const drawn = drawPlace(seed, `crime-justice-2-parent:${attempt}`);
          const where = `${drawn.name}, ${drawn.state} (${drawn.key}, seed ${drawn.seed})`;
          const seen = chargedWorld(drawn);
          if (typeof seen === "string") {
            passed.push(`${where}: ${seen}`);
            continue;
          }
          passed.push(...seen.skipped.map((why) => `${where}: ${why}`));
          if (!seen.terms.length) continue;
          // The twin: the same seed, nobody charged, run to the same day.
          const twin = build(drawn);
          advanceCore(twin, seen.through);
          const incomes = fullHouseholdIncomes(twin);
          for (const term of seen.terms) {
            // The twin's parent still holds every job the term ended.
            const alsoEnded = term.sentence.jobsEnded.filter(
              (id) => twin.jobs.get(id)?.endsAt !== undefined,
            );
            if (alsoEnded.length) {
              passed.push(
                `${where}: ${term.personId}'s ${alsoEnded.join(", ")} also ended in the twin`,
              );
              continue;
            }
            // Every other income record of the household is the same in both
            // worlds, so the gap between them is the parent's pay alone.
            const twinRecords = incomeRecords(twin, term.home);
            const differ = [
              ...new Set([...twinRecords.keys(), ...term.records.keys()]),
            ]
              .filter(
                (id) =>
                  !term.sentence.jobsEnded.includes(id) &&
                  twinRecords.get(id) !== term.records.get(id),
              )
              .sort()
              .map(
                (id) =>
                  `${id} (${twinRecords.get(id) ?? "none"} a year in the twin, ${term.records.get(id) ?? "none"} with the term)`,
              );
            if (differ.length) {
              passed.push(
                `${where}: the rest of ${term.home}'s income differs between the worlds: ${differ.join(", ")}`,
              );
              continue;
            }
            const pay = term.sentence.jobsEnded.reduce(
              (n, id) => n + (twinRecords.get(id) ?? 0),
              0,
            );
            expect(pay, term.personId).toBeGreaterThan(0);
            expect(yearly(twin, term.personId), term.personId).toBe(pay);
            const without = incomes.get(term.home) ?? 0;
            expect(without - term.income, `${where}: ${term.home}`).toBeCloseTo(
              pay,
              6,
            );
            const link = linkOf(LINK);
            process.stdout.write(
              `PARENT-INCARCERATION (CRIME_JUSTICE_2_SEED=${seed}) ${where}: ${term.name} (${term.personId}), a parent in ${term.home}, was charged in one world (${term.caseId}), sentenced to ${term.sentence.custodyMonths} months (${term.sentence.id}) and imprisoned on ${term.custody.from} (${term.custody.id}); the justice engine ended ${term.sentence.jobsEnded.join(", ")} (the end records: ${term.endedBy.join(", ")}), which the twin's parent still holds; on ${seen.through} the household's yearly income ran ${without} in the twin and ${term.income} with the term (minor units), down ${pay}, the parent's own pay (${((100 * pay) / without).toFixed(1)}%; the research's average family drop is ${(-link.size! * 100).toFixed(0)}%), its other ${twinRecords.size - term.sentence.jobsEnded.length} income records the same in both worlds. Passed over: ${passed.join("; ") || "none"}\n`,
            );
            return;
          }
        }
        throw new Error(
          `No drawn place showed a parent's prison term: ${passed.join("; ")}`,
        );
      } finally {
        setBookkeeping(bookkeeping);
      }
    },
  );
});
