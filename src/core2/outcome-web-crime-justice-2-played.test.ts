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
 *   is charged in one world and not the other; the court convicts and
 *   imprisons them, their job ends on the custody record, and their
 *   household's yearly income (fullHouseholdIncomes, the reading the crime
 *   and school engines take of a household's income) falls by their pay
 *   against the twin's.
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
import { dispositionDays } from "./justice-law";
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
const TRIES = 6;
/** Working parents charged in the one world, so at least one is imprisoned. */
const CHARGED = 6;
const DAYS_PER_YEAR = 365;

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
/** What the rest of a household's members earn in a year. */
const others = (core: CoreState, home: string, personId: string) =>
  (core.households.get(home)?.memberIds ?? [])
    .filter((id) => id !== personId)
    .reduce((n, id) => n + yearly(core, id), 0);

/** A parent the court imprisoned in the charged world, as that world left them. */
interface Term {
  readonly personId: string;
  readonly name: string;
  readonly home: string;
  readonly caseId: string;
  readonly sentence: SentenceRow;
  readonly custody: CustodyRow;
  /** The household's yearly income, and the rest of its members' pay, with the term. */
  readonly income: number;
  readonly others: number;
}

/**
 * The charged world: named working parents of a child in the town are charged
 * on the first day, and the world runs past their hearing and the morning
 * their jobs end. Returns who the court imprisoned, or why none was.
 */
function chargedWorld(
  drawn: ReturnType<typeof drawPlace>,
): { through: string; terms: Term[]; skipped: string[] } | string {
  const core = build(drawn);
  const api = coreAPI(core);
  const chain = lawChain(api);
  const adult = api.parameter("votingAge");
  const parents = [...core.people.values()]
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
      return (core.households.get(p.householdId)?.memberIds ?? []).some(
        (id) => {
          const member = core.people.get(id);
          return (
            member?.alive && ageOnDate(member.birthDate, core.date) < adult
          );
        },
      );
    })
    .sort((a, b) => a.id.localeCompare(b.id));
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
        `${c.defendantId} not serving a term (${sentence ? `${sentence.custodyMonths} custody months` : (table("cases").get(c.id) as CaseRow).status})`,
      );
      continue;
    }
    // Every job the term ended has ended, and the parent holds none.
    expect(sentence.jobsEnded.length, c.id).toBeGreaterThan(0);
    for (const id of sentence.jobsEnded)
      expect(
        core.jobs.get(id)?.endsAt,
        `${id} ended by ${custody.id}`,
      ).not.toBe(undefined);
    expect(yearly(core, c.defendantId), c.defendantId).toBe(0);
    const person = core.people.get(c.defendantId)!;
    terms.push({
      personId: c.defendantId,
      name: `${person.givenName} ${person.familyName}`,
      home: person.householdId,
      caseId: c.id,
      sentence,
      custody,
      income: incomes.get(person.householdId) ?? 0,
      others: others(core, person.householdId, c.defendantId),
    });
  }
  return { through, terms, skipped };
}

describe("the crime and justice links left unread", () => {
  it("each waits on the family's stopgap with its own reason", () => {
    const rows = unwired.links as { link: string; stopgapId: string }[];
    const stopgap = openStopgap(FAMILY_STOPGAP);
    expect(stopgap, FAMILY_STOPGAP).toBeDefined();
    for (const key of UNREAD) {
      const link = linkOf(key);
      const coverage = linkCoverage(link);
      // The web does not run it and no engine carries it.
      expect(coverage.wired, key).toBe(false);
      expect("carriedBy" in coverage, key).toBe(false);
      expect(rows.find((row) => row.link === key)?.stopgapId, key).toBe(
        FAMILY_STOPGAP,
      );
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
            if (
              term.sentence.jobsEnded.some(
                (id) => twin.jobs.get(id)?.endsAt !== undefined,
              )
            ) {
              passed.push(
                `${where}: ${term.personId}'s job also ended in the twin`,
              );
              continue;
            }
            const pay = yearly(twin, term.personId);
            expect(pay, term.personId).toBeGreaterThan(0);
            // The rest of the household earns the same in both worlds, so the
            // gap between them is the parent's pay alone.
            if (others(twin, term.home, term.personId) !== term.others) {
              passed.push(
                `${where}: ${term.home}'s other members' pay differs between the worlds`,
              );
              continue;
            }
            const without = incomes.get(term.home) ?? 0;
            expect(without - term.income, `${where}: ${term.home}`).toBe(pay);
            const link = linkOf(LINK);
            process.stdout.write(
              `PARENT-INCARCERATION (CRIME_JUSTICE_2_SEED=${seed}) ${where}: ${term.name} (${term.personId}), a parent in ${term.home}, was charged in one world (${term.caseId}), sentenced to ${term.sentence.custodyMonths} months (${term.sentence.id}) and imprisoned on ${term.custody.from} (${term.custody.id}); the justice engine ended ${term.sentence.jobsEnded.join(", ")}, which the twin's parent still holds; on ${seen.through} the household's yearly income ran ${without} in the twin and ${term.income} with the term (minor units), down ${pay}, the parent's own pay (${((100 * pay) / without).toFixed(1)}%; the research's average family drop is ${(-link.size! * 100).toFixed(0)}%). Passed over: ${passed.join("; ") || "none"}\n`,
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
