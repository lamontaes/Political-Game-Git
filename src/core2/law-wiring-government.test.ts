/**
 * Law wiring, government operations and elections: in one played world (a
 * random place from all 56, the bench's world with every module installed),
 * each law is enacted, and the engine that decides under it is shown reading
 * it: the voting engine applies the four election laws to the roll (named
 * voters and counted groups) and the government that runs the election pays
 * for it from its administration line; term limits and the lobbying ban are
 * applied where a filing or a lobbyist is chosen; home rule is applied where
 * a body drafts a bill; ward lines are drawn by a commission; the
 * administration line hires and lays off real staff; and the public pay floor
 * raises every public job under it, named and counted. A repeal ends each.
 */
import { createHash, randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import { setJournalTrace } from "./journal-state";
import type { CoreAPI, CoreState, Source } from "./types";
import { enactLaw, lawChain, LAWS_MODULE_ID } from "./modules/laws";
import type { LawRowInput } from "./laws-starting";
import { amendBudget, budgetsOf, governments } from "./modules/budgets";
import { ELECTIONS_MODULE_ID, type ContestRow } from "./modules/elections";
import { OUTCOME_WEB_MODULE_ID } from "./modules/outcome-web";
import { appliedOn, type LawAppliedRow } from "./law-reach/applied";
import { localOfficesForPlace } from "./offices-local";
import { councilElectionMethod } from "./gov-rules/council-election-method";
import { allGovernmentUnits } from "./reference/government-units";
import { holdElection } from "./modules/voting";
import { policyAuthority } from "./policy-authority";
import { POLICY_QUESTIONS } from "./policy-answers";
import { checkEligibility } from "./modules/elections";
import {
  OFFICES_MODULE_ID,
  townSeats,
  vacateSeat,
  type TermRow,
} from "./modules/offices";
import { lobbyingBarredUntil } from "./law-reach/group-a-voting";
import { decideToRun } from "./modules/candidacy";
import { govReport } from "./gov-test-report";
import {
  currentStaff,
  mechanicRow,
  townOrganizations,
} from "./law-reach/group-a-records";
import { outsideAccountOf } from "./budgets-treasury";
import { drawPlace } from "../../tests/golden-path/place";
import { jobsAt } from "./law-reach/group-b-money";
import { countedJob, residentsRuntime } from "./modules/residents";
import { PUBLIC_EMPLOYER_CLASSES, PUBLIC_PAY_FLOOR } from "./public-pay-floor";

const P = "us-policy-positions:government-operations.";
const ALL_MAIL = `${P}all-mail-voting`;
const AUTO = `${P}automatic-voter-registration`;
const PHOTO = `${P}require-photo-id-to-vote`;
const SAME_DAY = `${P}same-day-voter-registration`;
const REDISTRICT = `${P}independent-redistricting`;
const TERM = `${P}legislative-term-limits`;
const LOBBY = `${P}ban-lobbying-after-office`;
const HOME_RULE = `${P}broaden-local-authority`;
const ADMIN = "budget-line:administration";
const VOTING_LAWS = [ALL_MAIL, AUTO, PHOTO, SAME_DAY];

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
// Cheap draws: a place is only built once its council elects by ward.
const DRAWS = 12;

/**
 * Wards are the only lines a commission draws in play, and few councils
 * elect by ward. The first draws are from all 56 places; the later ones are
 * from the councils whose own charter sets ward seats.
 */
function wardPlace(attempt: number) {
  const keys = allGovernmentUnits()
    .filter((unit) => {
      if (unit.unitType !== "municipality" || !unit.functionalActive)
        return false;
      const method = councilElectionMethod(unit);
      return method?.basis === "charter" && method.wardSeats > 0;
    })
    .map((unit) => unit.placeGeoid)
    .filter((key): key is string => !!key)
    .sort();
  const hash = createHash("sha256")
    .update(`${seed}:ward-place:${attempt}`)
    .digest("hex");
  const key = keys[parseInt(hash.slice(0, 8), 16) % keys.length]!;
  return { seed: hash, key, name: `ward charter ${key}`, state: "" };
}

const next = (api: CoreAPI, days = 1) =>
  addDays(makeIsoDate(api.state.date), days);

function setQuestion(api: CoreAPI, key: string, value: 0 | 1, tag: string) {
  const laws = api.moduleState(LAWS_MODULE_ID).table("laws");
  const date = next(api);
  const ids: string[] = [];
  for (const { level, jurisdiction } of lawChain(api).levels) {
    const latest = (
      laws.query("bySeries", [jurisdiction, key]) as unknown as LawRowInput[]
    )
      .filter((r) => r.effectiveDate <= api.state.date)
      .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))[0];
    if (value === 0 && latest?.value !== 1) continue;
    // A yes goes in at the state's level, which is where election law lives.
    if (value === 1 && level !== "state") continue;
    ids.push(
      enactLaw(api, {
        jurisdiction,
        level,
        series: key,
        value,
        effectiveDate: date,
        measureId: `law-wiring-government-${tag}`,
        citation: "Law-wiring test",
      }).id,
    );
  }
  return ids;
}

const contestsOf = (api: CoreAPI) =>
  api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("contests")
    .rows() as unknown as ContestRow[];

const open = (api: CoreAPI, key: string) =>
  appliedOn(api, key).filter((r) => !r.endedOn);

describe(`government operations laws are applied by their engines (seed ${seed})`, () => {
  it("applies each law, moves the money, moves the outcome, and a repeal ends it", () => {
    const tried: string[] = [];
    const posts: { id: string; gross: number }[] = [];
    setJournalTrace((input) => {
      let gross = 0;
      for (const p of input.postings)
        if (p.deltaMinor > 0) gross += p.deltaMinor;
      posts.push({ id: `${input.id} ${input.sourceRef.id}`, gross });
    });
    const priorBookkeeping = setBookkeeping(false);
    try {
      for (let attempt = 0; attempt < DRAWS; attempt++) {
        const drawn =
          attempt < 4
            ? drawPlace(seed, `law-wiring-government-${attempt}`)
            : wardPlace(attempt);
        // Wards are the only lines a commission draws in play: a place whose
        // council elects no seat by ward is redrawn without being built.
        if (!localOfficesForPlace(drawn.key).some((o) => o.wardSeats)) {
          tried.push(`${drawn.name} (${drawn.key}): council elects at large`);
          continue;
        }
        const where = `seed ${seed}, ${drawn.name} (${drawn.key}), attempt ${attempt}`;
        const core = buildBenchWorld(drawn.seed, gameStartDate(), {
          twoLevel: true,
          placeKey: drawn.key,
        }).core as CoreState;
        const api = coreAPI(core);
        const admin = governments(api).find(
          (g) => g.level === "county" || g.level === "city",
        );
        if (!admin || core.people.size === 0) {
          tried.push(
            `${drawn.name} (${drawn.key}): no administering government or no people`,
          );
          continue;
        }

        // The town must elect a council seat by ward, or no commission has
        // lines to draw: redraw the place when it does not.
        const election =
          contestsOf(api)
            .filter(
              (c) =>
                c.electionDate > api.state.date &&
                c.family === "municipalOffice" &&
                c.district !== null,
            )
            .sort((a, b) => a.electionDate.localeCompare(b.electionDate))[0] ??
          null;
        if (!election) {
          tried.push(
            `${drawn.name} (${drawn.key}): no council ward contest ahead`,
          );
          continue;
        }

        // Start from no election law in force, then enact all four.
        for (const key of [...VOTING_LAWS, REDISTRICT, TERM, LOBBY, HOME_RULE])
          setQuestion(api, key, 0, "clear");
        advanceCore(core, next(api, 2));
        const lawIds = new Map<string, string[]>();
        for (const key of [...VOTING_LAWS, REDISTRICT, TERM, LOBBY, HOME_RULE])
          lawIds.set(key, setQuestion(api, key, 1, "enact"));
        const enactedOn = api.state.date;
        // The law the test enacted, or a later yes a body in play passed over it.
        const inForce = (key: string) => [
          ...(lawIds.get(key) ?? []),
          ...(
            api
              .moduleState(LAWS_MODULE_ID)
              .table("laws")
              .rows() as unknown as LawRowInput[]
          )
            .filter(
              (row) =>
                row.series === key &&
                row.value === 1 &&
                row.effectiveDate >= enactedOn,
            )
            .map((row) => row.id),
        ];
        for (const [key, ids] of lawIds)
          expect(ids.length, `${where}: ${key} enacted`).toBeGreaterThan(0);

        // The administration line: raise it.
        const gov = governments(api).find((g) => g.level === "city") ?? admin;
        const budget = [...budgetsOf(api, gov.id)].sort(
          (a, b) => b.fiscalYear - a.fiscalYear,
        )[0];
        const base = budget?.spendingMinor.administration ?? 0;
        // Staffing follows the line in whole positions: the raise funds at least one more at the town's largest employer.
        const staff = Math.max(
          1,
          ...townOrganizations(api, "cityGovernment").map(
            (o) => currentStaff(api, o.id).length,
          ),
        );
        const delta = Math.max(
          10_000_000,
          Math.round(base * 0.3),
          Math.ceil(base / staff),
        );
        amendBudget(api, {
          governmentId: gov.id,
          line: "administration",
          deltaMinor: delta,
          measureId: "law-wiring-government-admin",
        });
        // The government that runs the election, as the voting engine picks
        // it: it pays what it holds and owes the rest until cash arrives.
        const electionAdmin = ["county", "city", "state"]
          .map((level) => governments(api).find((g) => g.level === level))
          .find((g) => g !== undefined)!;
        const owedOf = (key: string) =>
          Number(
            mechanicRow(api, `election-cost-owed:${key}:${electionAdmin.id}`)
              ?.facts.owedMinor ?? 0,
          );
        const owedAtStart = new Map(VOTING_LAWS.map((k) => [k, owedOf(k)]));
        const start = posts.length;
        advanceCore(core, next(api, 35));

        // Registration: photo ID and automatic registration reach named
        // voters and counted groups, and the administering government paid.
        for (const key of [PHOTO, AUTO, SAME_DAY, ALL_MAIL]) {
          const rows = open(api, key);
          expect(rows.length, `${where}: ${key} applied rows`).toBeGreaterThan(
            0,
          );
          const named = rows.filter((r) => r.target === "person");
          const groups = rows.filter((r) => r.target === "group");
          expect(named.length, `${where}: ${key} named voters`).toBeGreaterThan(
            0,
          );
          expect(
            groups.length,
            `${where}: ${key} counted voter groups reached`,
          ).toBeGreaterThan(0);
          if (key === PHOTO || key === AUTO)
            expect(
              groups.some((g) => g.amountMinor > 0),
              `${where}: ${key} costs a counted group something`,
            ).toBe(true);
          for (const r of rows) {
            expect(r.engine, r.id).toBe("core2-voting-v1");
            expect(
              inForce(key),
              `${where}: ${r.id} cites the enacted law`,
            ).toContain(r.lawId);
          }
          for (const g of groups)
            expect(
              g.count,
              `${where}: ${g.id} stands for people`,
            ).toBeGreaterThanOrEqual(1);
        }
        const paid = (key: string) =>
          posts
            .slice(start)
            .filter((p) => p.id.includes(`election-admin:${key}:`))
            .reduce((n, p) => n + p.gross, 0);
        // What the laws cost reached the treasury's books: paid, or owed where
        // its cash ran short (what it paid plus what it now owes beyond the
        // debt it started with).
        const charged = (key: string) =>
          paid(key) + owedOf(key) - (owedAtStart.get(key) ?? 0);
        expect(
          charged(PHOTO),
          `${where}: photo ID issuance paid or owed by ${electionAdmin.id}`,
        ).toBeGreaterThan(0);
        expect(
          charged(AUTO),
          `${where}: automatic registration paid or owed by ${electionAdmin.id}`,
        ).toBeGreaterThan(0);

        // The administration line pays real staff: the employer is funded,
        // and the jobs engine fills the openings it posts from named and
        // counted seekers alike, each hire recorded.
        const staffRows = open(api, ADMIN);
        expect(
          staffRows.filter((r) => r.target === "organization").length,
          `${where}: administration staffing applied to an employer`,
        ).toBeGreaterThan(0);
        const lineHires = staffRows.filter(
          (r) => r.what === "hired-on-budget-line",
        );
        expect(
          lineHires.length,
          `${where}: someone hired on the raised administration line`,
        ).toBeGreaterThan(0);
        for (const r of lineHires)
          expect(r.engine, `${where}: ${r.id}`).toBe("jobs");

        // The state's redistricting commission is paid at the month's close
        // out of the state's administration line.
        const commission = open(api, REDISTRICT).filter(
          (r) => r.what === "redistricting-commission-funded",
        );
        expect(
          commission.length,
          `${where}: the state's commission funded`,
        ).toBeGreaterThan(0);
        expect(
          posts
            .slice(start)
            .filter((p) => p.id.includes("redistricting-commission:"))
            .reduce((n, p) => n + p.gross, 0),
          `${where}: the commission's pay on the journal`,
        ).toBeGreaterThan(0);

        // The revolving-door law: a council seat is worth less to someone
        // who does not hold it, read when they weigh running.
        const weigher = [...core.people.values()].find(
          (p) =>
            p.alive &&
            p.placeId === lawChain(api).townPlaceId &&
            !townSeats(api).some((s) => s.holder?.personId === p.id),
        );
        expect(weigher, `${where}: a resident to weigh the seat`).toBeDefined();
        const weighed = decideToRun(
          api,
          weigher!.id,
          {
            contestId: election.id,
            officeName: election.title,
            filingDeadline: election.filingDeadline,
            sourceIds: [election.id],
          },
          true,
        );
        expect(
          weighed?.reasons.afterOffice,
          `${where}: ${weigher!.id} weighed the revolving-door law`,
        ).toBeLessThan(0);

        // Home rule: a body drafting a bill under a question the state's
        // grant decides (a power cell the catalog marks unknown) reads it.
        let homeRuleQuestion = "";
        for (const question of Object.keys(POLICY_QUESTIONS)) {
          policyAuthority(api, question, "city");
          if (open(api, HOME_RULE).length) {
            homeRuleQuestion = question;
            break;
          }
        }
        if (!homeRuleQuestion) {
          tried.push(
            `${drawn.name} (${drawn.key}): no question's power cell is decided by home rule`,
          );
          continue;
        }
        // Term limits: the filing check on each legislative seat's incumbent.
        for (const contest of contestsOf(api).filter(
          (c) => c.incumbentTermId !== null,
        )) {
          const term = api
            .moduleState(OFFICES_MODULE_ID)
            .table("terms")
            .get(contest.incumbentTermId!) as unknown as TermRow | undefined;
          if (term?.personId) checkEligibility(api, term.personId, contest.id);
        }
        // Election day: ballots mailed, registrations at the polls, wards.
        const before = posts.length;
        const owedBeforeDay = new Map(VOTING_LAWS.map((k) => [k, owedOf(k)]));
        // The election day itself is a year of simulation away, more memory
        // than a played world allows a test: the voting engine's own
        // election-day function runs on the ward contest today.
        holdElection(api, election.id);
        const day = posts.slice(before);
        const dayPaid = (key: string) =>
          day
            .filter((p) => p.id.includes(`election-admin:${key}:`))
            .reduce((n, p) => n + p.gross, 0);
        const dayCharged = (key: string) =>
          dayPaid(key) + owedOf(key) - (owedBeforeDay.get(key) ?? 0);
        expect(
          dayCharged(ALL_MAIL),
          `${where}: ballots mailed, paid or owed by ${electionAdmin.id}`,
        ).toBeGreaterThan(0);
        expect(
          dayCharged(SAME_DAY),
          `${where}: polls registrations, paid or owed by ${electionAdmin.id}`,
        ).toBeGreaterThan(0);

        // The outcome web read the laws.
        const months = (
          api
            .moduleState(OUTCOME_WEB_MODULE_ID)
            .table("months")
            .rows() as unknown as {
            effects: Record<string, number>;
          }[]
        ).filter((m) => m.effects);
        const fired = (link: string) =>
          months.some((m) => (m.effects[link] ?? 0) !== 0);
        // A link moves its measure only where the law differs from the one
        // the place really had: the research's base levels include that law.
        const startedYes = (key: string) =>
          (
            api
              .moduleState(LAWS_MODULE_ID)
              .table("laws")
              .rows() as unknown as LawRowInput[]
          ).some(
            (row) =>
              row.series === key &&
              row.value === 1 &&
              row.id.endsWith(":starting"),
          );
        for (const [link, key] of [
          ["all-mail-voting-to-turnout", ALL_MAIL],
          ["same-day-registration-to-youth-turnout", SAME_DAY],
        ] as const)
          if (!startedYes(key))
            expect(fired(link), `${where}: ${link} (law began as no)`).toBe(
              true,
            );

        // The lobbying ban: a council member resigns through the offices
        // engine, and the interest-groups engine's own question is asked.
        const held = townSeats(api).find((s) => s.holder?.personId);
        expect(held, `${where}: a seated official`).toBeDefined();
        const former = held!.holder!.personId!;
        vacateSeat(api, held!.seat.id, "resigned");
        const barredUntil = lobbyingBarredUntil(api, former);
        expect(
          barredUntil,
          `${where}: ${former} barred from lobbying`,
        ).not.toBe(null);

        // The other laws were applied by their engines, citing the enacted law.
        for (const [key, what] of [
          [TERM, ["kept-off-ballot", "term-count-checked"]],
          [LOBBY, ["barred-from-lobbying"]],
          [HOME_RULE, ["home-rule-lets-body-legislate"]],
          [
            REDISTRICT,
            [
              "ward-lines-drawn-by-commission",
              "redistricting-commission-funded",
            ],
          ],
        ] as const) {
          const rows = open(api, key);
          expect(rows.length, `${where}: ${key} applied rows`).toBeGreaterThan(
            0,
          );
          for (const r of rows) {
            expect(what, `${where}: ${r.id}`).toContain(r.what);
            expect(inForce(key), `${where}: ${r.id} cites the law`).toContain(
              r.lawId,
            );
          }
        }

        // The record of each law: an applied row, the money on the journal
        // and the person, group or government reached, by id.
        const moneyOf = (needle: string) =>
          posts.find((p) => p.gross > 0 && p.id.includes(needle))?.id ?? null;
        // A named hire's payroll cites the line (its job is the funded
        // position's); a counted hire is paid in its employer's wage post.
        const hire =
          lineHires.find((r) => r.target === "person") ?? lineHires[0];
        // A line hire's pay: a named hire's payroll under their commitment
        // (its job is the funded position's, so the post cites the line); a
        // counted hire's in the wage flow that pays their job.
        const rt = residentsRuntime(core);
        const countedHireJob = hire
          ? [...(rt?.jobs.values() ?? [])].find(
              (j) => j.personId === hire.targetId && j.endsAt === undefined,
            )
          : undefined;
        const hireFlow = countedHireJob
          ? rt?.wageFlowByJob.get(countedHireJob.id)
          : undefined;
        const hirePay =
          moneyOf(ADMIN) ??
          (hireFlow
            ? (posts.find((p) => p.gross > 0 && p.id.includes(hireFlow.id))
                ?.id ?? null)
            : null);
        const reached = Object.fromEntries(
          [...VOTING_LAWS, REDISTRICT, TERM, LOBBY, HOME_RULE, ADMIN].map(
            (key) => {
              const rows = open(api, key);
              const row =
                rows.find((r) => r.target === "person") ??
                rows.find((r) => r.target === "group") ??
                rows[0];
              const money =
                key === REDISTRICT
                  ? moneyOf("redistricting-commission:")
                  : key === ADMIN
                    ? hirePay
                    : VOTING_LAWS.includes(key)
                      ? moneyOf(`election-admin:${key}:`)
                      : null;
              return [
                key,
                {
                  applied: row?.id ?? null,
                  reached: row ? `${row.target} ${row.targetId}` : null,
                  money,
                },
              ];
            },
          ),
        );
        // The line's money reached a hire: a named hire's payroll citing the
        // line, or the wage flow that pays a counted hire.
        expect(
          hirePay,
          `${where}: the administration line's hire was paid (${hire?.id})`,
        ).not.toBeNull();
        govReport(
          "law-wiring-government",
          JSON.stringify({
            seed,
            place: where,
            election: election.id,
            adminHire: hire
              ? {
                  row: hire.id,
                  job: countedHireJob?.id ?? null,
                  flow: hireFlow?.id ?? null,
                  payerId: hireFlow?.payerId ?? null,
                  lastPaidMinor:
                    (hireFlow as { lastPaidMinor?: number } | undefined)
                      ?.lastPaidMinor ?? null,
                }
              : null,
            reached,
          }),
        );

        // Repeal every law: each engine's rows end.
        for (const key of [...VOTING_LAWS, REDISTRICT, TERM, LOBBY, HOME_RULE])
          setQuestion(api, key, 0, "repeal");
        amendBudget(api, {
          governmentId: gov.id,
          line: "administration",
          deltaMinor: -delta,
          measureId: "law-wiring-government-admin-undo",
        });
        advanceCore(core, next(api, 3));
        for (const key of [...VOTING_LAWS, REDISTRICT, TERM, LOBBY, HOME_RULE])
          expect(
            open(api, key).map((r: LawAppliedRow) => r.id),
            `${where}: ${key} ended after repeal`,
          ).toEqual([]);
        expect(
          open(api, ADMIN).filter((r) => r.target === "organization"),
          `${where}: staffing ended when the line returned to base`,
        ).toEqual([]);
        return;
      }
      throw new Error(
        `No drawn place had a subject for the government operations laws (seed ${seed}); tried ${tried.join("; ")}`,
      );
    } finally {
      setJournalTrace(null);
      setBookkeeping(priorBookkeeping);
    }
  }, 300_000);

  it("a cost owed by a treasury short of cash is still paid after the law is repealed", () => {
    const tried: string[] = [];
    const posts: { id: string; gross: number }[] = [];
    setJournalTrace((input) => {
      let gross = 0;
      for (const p of input.postings)
        if (p.deltaMinor > 0) gross += p.deltaMinor;
      posts.push({ id: `${input.id} ${input.sourceRef.id}`, gross });
    });
    const priorBookkeeping = setBookkeeping(false);
    const testSource: Source = {
      tag: "SOURCED",
      asOf: gameStartDate(),
      citation: "Law-wiring test: the treasury is emptied and refilled",
    };
    try {
      for (let attempt = 0; attempt < 4; attempt++) {
        const drawn = drawPlace(seed, `law-wiring-government-owed-${attempt}`);
        const where = `seed ${seed}, ${drawn.name} (${drawn.key}), attempt ${attempt}`;
        const core = buildBenchWorld(drawn.seed, gameStartDate(), {
          twoLevel: true,
          placeKey: drawn.key,
        }).core as CoreState;
        const api = coreAPI(core);
        // The government that runs the election, as the voting engine picks it.
        const govs = governments(api);
        const gov = ["county", "city", "state"]
          .map((level) => govs.find((g) => g.level === level))
          .find((g) => g !== undefined);
        const outside = outsideAccountOf(api);
        if (!gov || !outside || core.people.size === 0) {
          tried.push(
            `${drawn.name} (${drawn.key}): no administering government, outside account or people`,
          );
          continue;
        }
        const accounts = api.accounts();
        const treasury = accounts.main(gov.organizationId);
        const move = (id: string, from: string, to: string, amount: number) =>
          amount >= 1
            ? accounts.transfer({
                id,
                from,
                to,
                amountMinor: amount,
                reasonKey: "law-wiring-test",
                source: testSource,
                partial: true,
              }).paidMinor
            : 0;

        // No photo ID law, then the treasury is emptied the day before the
        // law takes effect, so the ID issuance it brings is owed.
        setQuestion(api, PHOTO, 0, "owed-clear");
        advanceCore(core, next(api, 2));
        let drained = move(
          `law-wiring-government-drain:${attempt}`,
          treasury,
          accounts.main(outside),
          accounts.balance(treasury),
        );
        expect(
          setQuestion(api, PHOTO, 1, "owed-enact").length,
          `${where}: photo ID enacted`,
        ).toBeGreaterThan(0);
        advanceCore(core, next(api, 2));
        const owedId = `election-cost-owed:${PHOTO}:${gov.id}`;
        const owedBefore = Number(
          mechanicRow(api, owedId)?.facts.owedMinor ?? 0,
        );
        if (owedBefore < 1) {
          tried.push(
            `${drawn.name} (${drawn.key}): the photo ID issuance was paid in full, nothing owed`,
          );
          continue;
        }

        // Repeal the law while the treasury is still empty: the debt stands.
        drained += move(
          `law-wiring-government-drain-again:${attempt}`,
          treasury,
          accounts.main(outside),
          accounts.balance(treasury),
        );
        setQuestion(api, PHOTO, 0, "owed-repeal");
        advanceCore(core, next(api, 1));
        const atRepeal = mechanicRow(api, owedId);
        const owedAtRepeal = Number(atRepeal?.facts.owedMinor ?? 0);
        if (owedAtRepeal < 1) {
          tried.push(
            `${drawn.name} (${drawn.key}): the cash that came in paid the photo ID cost before the repeal`,
          );
          continue;
        }
        expect(
          atRepeal?.active,
          `${where}: the ${owedAtRepeal} owed is still collectible after the repeal`,
        ).toBe(true);

        // The cash comes back, and the debt is paid in full.
        const repealedAt = posts.length;
        const refilled = move(
          `law-wiring-government-refill:${attempt}`,
          accounts.main(outside),
          treasury,
          drained + owedAtRepeal,
        );
        expect(refilled, `${where}: the treasury refilled`).toBeGreaterThan(0);
        // The treasury's other spending draws on the same cash, so the debt is
        // paid down day by day: a month, or until it is paid.
        for (
          let day = 0;
          day < 30 && Number(mechanicRow(api, owedId)?.facts.owedMinor) >= 1;
          day++
        )
          advanceCore(core, next(api, 1));
        const after = mechanicRow(api, owedId);
        const owedAfter = Number(after?.facts.owedMinor);
        const repaid = posts
          .slice(repealedAt)
          .filter((p) =>
            p.id.includes(`election-admin:${PHOTO}:${gov.id}:owed:`),
          )
          .reduce((n, p) => n + p.gross, 0);
        expect(repaid, `${where}: repaid after the repeal`).toBeGreaterThan(0);
        expect(
          owedAtRepeal - owedAfter,
          `${where}: the debt fell by what was repaid`,
        ).toBe(repaid);
        expect(
          after?.active,
          `${where}: ${owedId} stays collectible until it is paid`,
        ).toBe(owedAfter >= 1);
        console.info(
          `law-wiring-government owed ${where}: ${owedId} owed ${owedAtRepeal} at the repeal, repaid ${repaid}, still owed ${owedAfter}`,
        );
        // The repeal still ended the law's rows; paying the old cost reopens none.
        expect(
          open(api, PHOTO).map((r: LawAppliedRow) => r.id),
          `${where}: photo ID rows ended after repeal`,
        ).toEqual([]);
        return;
      }
      throw new Error(
        `No drawn place owed a photo ID cost (seed ${seed}); tried ${tried.join("; ")}`,
      );
    } finally {
      setJournalTrace(null);
      setBookkeeping(priorBookkeeping);
    }
  }, 300_000);

  it("the public pay floor raises every public job under it, named and counted, and its repeal ends their rows", () => {
    const tried: string[] = [];
    const posts: { id: string; date: string; gross: number }[] = [];
    setJournalTrace((input) => {
      let gross = 0;
      for (const p of input.postings)
        if (p.deltaMinor > 0) gross += p.deltaMinor;
      posts.push({
        id: `${input.id} ${input.sourceRef.id}`,
        date: input.date,
        gross,
      });
    });
    const priorBookkeeping = setBookkeeping(false);
    try {
      for (let attempt = 0; attempt < 4; attempt++) {
        const drawn = drawPlace(seed, `law-wiring-government-pay-${attempt}`);
        const where = `seed ${seed}, ${drawn.name} (${drawn.key}), attempt ${attempt}`;
        const core = buildBenchWorld(drawn.seed, gameStartDate(), {
          twoLevel: true,
          placeKey: drawn.key,
        }).core as CoreState;
        const api = coreAPI(core);
        const jobs = jobsAt(api, PUBLIC_EMPLOYER_CLASSES).filter(
          (j) => (j.hourlyMinor ?? 0) > 0 && j.wageDailyMinor > 0,
        );
        const federal = lawChain(api).levels.find((l) => l.level === "federal");
        if (!jobs.some((j) => core.jobs.has(j.id)) || !federal) {
          tried.push(`${drawn.name} (${drawn.key}): no named public job`);
          continue;
        }
        // A floor a thousand dollars over the best-paid public job in town,
        // so it binds every one of them.
        const top = Math.max(...jobs.map((j) => j.wageDailyMinor));
        const floor = Math.ceil((top * 365) / 100 / 1000) * 1000 + 1000;
        const before = new Map(jobs.map((j) => [j.id, j.hourlyMinor ?? 0]));
        const lawId = enactLaw(api, {
          jurisdiction: federal.jurisdiction,
          level: "federal",
          series: PUBLIC_PAY_FLOOR,
          value: floor,
          effectiveDate: next(api),
          measureId: "law-wiring-government-pay-floor",
          citation: "Law-wiring test: a public pay floor",
        }).id;
        advanceCore(core, next(api, 2));
        const raisedOn = api.state.date;
        const rows = open(api, PUBLIC_PAY_FLOOR);
        // Every named public job is raised and recorded by name; the counted
        // ones are raised and recorded as their employer's group.
        for (const job of jobs) {
          const now = core.jobs.get(job.id) ?? countedJob(core, job.id);
          expect(
            now?.hourlyMinor ?? 0,
            `${where}: ${job.id} raised to the floor`,
          ).toBeGreaterThan(before.get(job.id)!);
        }
        const named = jobs.filter((j) => core.jobs.has(j.id));
        for (const job of named)
          expect(
            rows.some(
              (r) =>
                r.target === "person" &&
                r.targetId === job.personId &&
                r.lawId === lawId,
            ),
            `${where}: ${job.personId} reached`,
          ).toBe(true);
        const counted = jobs.length - named.length;
        expect(
          rows
            .filter((r) => r.target === "group")
            .reduce((n, r) => n + r.count, 0),
          `${where}: counted public workers reached`,
        ).toBe(counted);
        // The raised pay is what payroll pays: a pay post for a raised named
        // job after the raise, on the journal (payroll posts each period
        // under the worker's commitment to the job; a public employer's
        // period can run a month).
        advanceCore(core, next(api, 40));
        const commitmentOf = new Map(
          named.flatMap((j) =>
            [...(core.work.commitmentsByPerson.get(j.personId) ?? [])]
              .filter((id) => core.work.commitments.get(id)?.jobId === j.id)
              .map((id) => [id, j] as const),
          ),
        );
        const paid = posts.find(
          (p) =>
            p.date > raisedOn &&
            p.gross > 0 &&
            p.id.includes(" work-payroll:") &&
            [...commitmentOf.keys()].some((id) => p.id.includes(`${id}:`)),
        );
        expect(
          paid,
          `${where}: a raised public worker paid after the raise`,
        ).toBeDefined();
        const job = [...commitmentOf].find(([id]) =>
          paid!.id.includes(`${id}:`),
        )![1];
        const person = rows.find(
          (r) => r.target === "person" && r.targetId === job.personId,
        )!;
        const pay = paid!.id;
        const group = rows.find((r) => r.target === "group");
        govReport(
          "law-wiring-government",
          JSON.stringify({
            seed,
            place: where,
            [PUBLIC_PAY_FLOOR]: {
              floor,
              applied: person.id,
              reached: `person ${person.targetId}`,
              group: group ? `${group.id} (${group.count})` : null,
              money: pay,
            },
          }),
        );
        // Putting the old amount back ends every row; the raises stay.
        enactLaw(api, {
          jurisdiction: federal.jurisdiction,
          level: "federal",
          series: PUBLIC_PAY_FLOOR,
          value: 0,
          effectiveDate: next(api),
          measureId: "law-wiring-government-pay-floor-repeal",
          citation: "Law-wiring test: the floor repealed",
        });
        advanceCore(core, next(api, 2));
        expect(
          open(api, PUBLIC_PAY_FLOOR).map((r) => r.id),
          `${where}: pay floor rows ended after repeal`,
        ).toEqual([]);
        expect(
          core.jobs.get(job.id)?.hourlyMinor ?? 0,
          `${where}: ${job.id} keeps its raise`,
        ).toBeGreaterThan(before.get(job.id)!);
        return;
      }
      throw new Error(
        `No drawn place had a named public job (seed ${seed}); tried ${tried.join("; ")}`,
      );
    } finally {
      setJournalTrace(null);
      setBookkeeping(priorBookkeeping);
    }
  }, 300_000);
});
