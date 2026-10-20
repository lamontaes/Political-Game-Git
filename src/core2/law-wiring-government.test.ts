/**
 * Law wiring, government operations and elections: in one played world (a
 * random place from all 56, the bench's world with every module installed),
 * each law is enacted, and the engine that decides under it is shown reading
 * it: the voting engine applies the four election laws to the roll (named
 * voters and counted groups) and the government that runs the election pays
 * for it from its administration line; term limits and the lobbying ban are
 * applied where a filing or a lobbyist is chosen; home rule is applied where
 * a body drafts a bill; ward lines are drawn by a commission; and the
 * administration line hires and lays off real staff. A repeal ends each.
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
import type { CoreAPI, CoreState } from "./types";
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
import { currentStaff, townOrganizations } from "./law-reach/group-a-records";
import { drawPlace } from "../../tests/golden-path/place";

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
              lawIds.get(key),
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
        expect(paid(PHOTO), `${where}: photo ID issuance paid`).toBeGreaterThan(
          0,
        );
        expect(
          paid(AUTO),
          `${where}: automatic registration paid`,
        ).toBeGreaterThan(0);

        // The administration line pays real staff.
        const staffRows = open(api, ADMIN);
        expect(
          staffRows.filter((r) => r.target === "organization").length,
          `${where}: administration staffing applied to an employer`,
        ).toBeGreaterThan(0);

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
        // The election day itself is a year of simulation away, more memory
        // than a played world allows a test: the voting engine's own
        // election-day function runs on the ward contest today.
        holdElection(api, election.id);
        const day = posts.slice(before);
        const dayPaid = (key: string) =>
          day
            .filter((p) => p.id.includes(`election-admin:${key}:`))
            .reduce((n, p) => n + p.gross, 0);
        expect(
          dayPaid(ALL_MAIL),
          `${where}: ballots mailed, paid`,
        ).toBeGreaterThan(0);
        expect(
          dayPaid(SAME_DAY),
          `${where}: polls registrations, paid`,
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
        expect(
          fired("all-mail-voting-to-turnout"),
          `${where}: all-mail web link`,
        ).toBe(true);
        expect(
          fired("same-day-registration-to-youth-turnout"),
          `${where}: same-day web link`,
        ).toBe(true);

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
          [REDISTRICT, ["ward-lines-drawn-by-commission"]],
        ] as const) {
          const rows = open(api, key);
          expect(rows.length, `${where}: ${key} applied rows`).toBeGreaterThan(
            0,
          );
          for (const r of rows) {
            expect(what, `${where}: ${r.id}`).toContain(r.what);
            expect(
              lawIds.get(key),
              `${where}: ${r.id} cites the law`,
            ).toContain(r.lawId);
          }
        }

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
});
