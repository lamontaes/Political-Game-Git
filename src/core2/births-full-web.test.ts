/**
 * Full couples read the outcome web's birth-rate factor as a term in their
 * plan-a-child choice, the factor a counted woman of the mother's age and home
 * is scaled by (pool item web-calibrate-choice-terms; one model, two tiers).
 *
 * Two worlds are built from one seed in a place drawn from all 56 and played
 * one game year, identical but for the web's month rows: in the twin, the
 * unemployment-to-births link's effect is shifted by its researched size
 * (0.75% of births a point of unemployment) times a number of points, and laid
 * again whenever the web rewrites the month's row. Each review of a full
 * couple records a plan, each agreed plan a pregnancy and each delivery a
 * birth, by record id; the twin's records are read against the base world's.
 *
 * A town's few dozen full couples make about one plan a year, so a real swing
 * of a point or two tips none of them and one place cannot show a response of
 * 0.75% a point in whole births; the weight (renewalWebWeight) is fitted on
 * the counts pooled over several places, and its parameter row says how. The
 * twin takes off the fewest points, in whole tens, that reach the couple
 * nearest to planning in the base world's own records, and the test follows
 * what that shift does: the web's factor moves by the researched share a
 * point, every compared plan's web term moves by the weight times that share
 * (by the mother's age), and in the first round of reviews the couples whose
 * plans tip are exactly those whose recorded scores cross. Each plan that
 * tips is read to its pregnancy and birth records.
 */
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { drawPlace, type DrawnPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { renewalParameter } from "./births-parameters";
import { gameStartDate } from "./game-start";
import { addDays, ageOnDate, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { OUTCOME_WEB_MODULE_ID, type WebMonth } from "./modules/outcome-web";
import { RENEWAL_MODULE_ID } from "./modules/renewal";
import { sizeIn, WEB_LINKS } from "./outcome-web-model";
import { subjectWeight } from "./outcome-web-reach";
import { coreAPI } from "./state";
import type { CoreState } from "./types";

const seed = process.env.WEB_FULL_SEED || randomBytes(8).toString("hex");
const LINK = "unemployment-to-births";
const OUTCOME = "births.rate";
const PLAN = "renewal-plan-child";
const WAIT = "renewal-wait";
/** Points of unemployment the twin's shift moves in whole steps of this many. */
const STEP = 10;
/** The most points a twin may take off; a place whose nearest couple is farther is drawn again. */
const MOST_POINTS = 400;
/** Places drawn, at most, until one has a couple the shift can reach. */
const DRAWS = 8;
/** How far the web term's move may stand from the weight times the link's effect times the mother's age weight (the other links' factor, near one). */
const TOLERANCE = 0.1;
/**
 * How far any other term of a plan score may drift between the twins in the
 * shift's first round of reviews. The shifted web also moves the counted
 * women's births, prices and the couples' own pay, so a couple's other terms
 * are not quite the base world's, and drift further the longer the twins run.
 */
const DRIFT = 0.05;
/** Days from the opening that count as the first round of reviews, read against the base world's records. */
const FIRST_ROUND_DAYS = 120;

const link = WEB_LINKS.find((row) => row.key === LINK)!;
/** The researched range of the link's size: a share of births a point of unemployment. */
const RANGE = (
  JSON.parse(readFileSync("data/research/outcome-web/links.json", "utf8")) as {
    links: { key: string; range?: [number, number] }[];
  }
).links.find((row) => row.key === LINK)!.range!;

interface Decision {
  scores: { actionId: string; score: number }[];
  circumstances: Record<string, number>;
}
interface PlanRow {
  id: string;
  coupleId: string;
  motherId: string;
  date: string;
  opening: boolean;
  agreed: boolean;
  decisions: Decision[];
}
interface PregnancyRow {
  id: string;
  planId: string;
  dueDate: string;
}
interface BirthRow {
  id: string;
  pregnancyId: string;
}
interface Plan {
  id: string;
  coupleId: string;
  placeId: string;
  date: string;
  agreed: boolean;
  /** How hard the link lands on the mother, by her age (zero from 40). */
  weight: number;
  /** Each partner's plan score less their wait score: the couple plans when both are above zero. */
  margins: number[];
  /** What each partner's circumstances put on the plan score. */
  terms: Record<string, number>[];
}

/** One game year from the opening, the link's effect moved up by `points` of unemployment taken off. */
function play(place: DrawnPlace, points: number) {
  const opening = gameStartDate();
  const { core } = buildBenchWorld(place.seed, opening, {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core as CoreState);
  const months = api.moduleState(OUTCOME_WEB_MODULE_ID).table("months");
  /** The effect last laid in each month row; a row that reads otherwise was rewritten by the web. */
  const laid = new Map<string, number>();
  let delta = 0;
  let day = makeIsoDate(opening);
  const end = addDays(day, 365);
  while (day < end) {
    day = addDays(day, 1);
    advanceCore(core, day);
    if (!points) continue;
    delta ||=
      sizeIn(
        link,
        (
          api
            .moduleState(OUTCOME_WEB_MODULE_ID)
            .table("state")
            .rows()[0] as unknown as { stateKey: string }
        ).stateKey,
      ) * -points;
    // The web writes its month on the 3rd, and writes it again whenever a law
    // takes effect, which drops a shift laid earlier; from the 3rd on, the
    // twin lays the shift again in any of the month's rows without it, so the
    // couples' reviews read it afterwards.
    if (Number(core.date.slice(8)) < 3) continue;
    for (const row of months.rows() as unknown as WebMonth[]) {
      const effect = row.effects[LINK];
      if (
        row.month !== core.date.slice(0, 7) ||
        effect === undefined ||
        row.values[OUTCOME] === undefined ||
        effect === laid.get(row.id)
      )
        continue;
      const next = effect + delta;
      months.put({
        ...row,
        effects: { ...row.effects, [LINK]: next },
        // The outcome is its base times each running link's (1 + effect).
        values: {
          ...row.values,
          [OUTCOME]: (row.values[OUTCOME] * (1 + next)) / (1 + effect),
        },
      } as never);
      laid.set(row.id, next);
    }
  }
  const renewal = api.moduleState(RENEWAL_MODULE_ID);
  const rows = <T>(name: string) =>
    renewal.table(name).rows() as unknown as T[];
  const score = (decision: Decision, action: string) =>
    decision.scores.find((row) => row.actionId === action)!.score;
  const plans = new Map<string, Plan>();
  for (const row of rows<PlanRow>("plans")) {
    if (row.opening) continue;
    const mother = core.people.get(row.motherId)!;
    plans.set(row.id, {
      id: row.id,
      coupleId: row.coupleId,
      placeId: mother.placeId,
      date: row.date,
      agreed: row.agreed,
      weight: subjectWeight(LINK, {
        age: ageOnDate(mother.birthDate, row.date),
        sex: "female",
      }),
      margins: row.decisions.map(
        (decision) => score(decision, PLAN) - score(decision, WAIT),
      ),
      terms: row.decisions.map((decision) => decision.circumstances),
    });
  }
  const web = new Map<string, { factor: number; effect: number }>();
  for (const row of months.rows() as unknown as WebMonth[])
    if (row.effects[LINK] !== undefined && row.values[OUTCOME] !== undefined)
      web.set(row.id, {
        factor: row.values[OUTCOME] / row.bases[OUTCOME]!,
        effect: row.effects[LINK],
      });
  return {
    plans,
    pregnancies: rows<PregnancyRow>("pregnancies"),
    births: rows<BirthRow>("births"),
    web,
    laid: [...laid.keys()],
    delta,
    weight: renewalParameter(api, "renewalWebWeight"),
    end: core.date,
  };
}

/** The web month record a review reads: the place's latest, which is last month's until the 3rd. */
function webRecordOf(plan: Plan): string {
  const [year, month, day] = plan.date.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  const read =
    day >= 3
      ? plan.date.slice(0, 7)
      : month === 1
        ? `${year - 1}-12`
        : `${year}-${String(month - 1).padStart(2, "0")}`;
  return `web:${plan.placeId}:${read}`;
}

describe(`full couples and the outcome web (seed ${seed})`, () => {
  it("a shift in the unemployment link moves the plans, pregnancies and births of full couples as their own records say", () => {
    const tried: string[] = [];
    for (let draw = 0; draw < DRAWS; draw += 1) {
      const place = drawPlace(`${seed}:${draw}`, "web-births-full");
      const where = `${place.name}, ${place.state} (${place.key}), world seed ${place.seed}, run seed ${seed}`;
      const base = play(place, 0);
      // Reviews after the opening day's, which read no shifted month row.
      const after = (plans: ReadonlyMap<string, Plan>) =>
        [...plans.values()].filter(
          (plan) => plan.date > addDays(makeIsoDate(gameStartDate()), 1),
        );
      // The couple nearest to planning: the unplanned first-round review that needs the
      // fewest points of unemployment to close its weaker partner's gap, and
      // clear it by more than the drift. A point moves the plan score by the
      // weight, the link's size and the mother's age weight (the factor stands
      // within a fifth of one).
      const needed = (plan: Plan) =>
        plan.weight > 0
          ? (-Math.min(...plan.margins) + 2 * DRIFT) /
            (base.weight * Math.abs(sizeIn(link, "")) * plan.weight * 0.8)
          : Infinity;
      const firstRound = (plan: Plan) =>
        plan.date <= addDays(makeIsoDate(gameStartDate()), FIRST_ROUND_DAYS);
      const nearest = after(base.plans)
        .filter((plan) => !plan.agreed && firstRound(plan))
        .sort((a, b) => needed(a) - needed(b))[0];
      const points = nearest
        ? Math.max(STEP, Math.ceil((needed(nearest) * 1.25) / STEP) * STEP)
        : Infinity;
      // A place with no full couple the shift can reach cannot show it, so it
      // is drawn again, a bounded number of times, and the draw says why.
      if (points > MOST_POINTS) {
        tried.push(
          `${where}: ${nearest ? `nearest plan ${nearest.id} is ${(-Math.min(...nearest.margins)).toFixed(2)} short of planning, ${points} points away` : "no unplanned review"}`,
        );
        continue;
      }
      const twin = play(place, points);
      expect(twin.laid.length, `${where}: web rows shifted`).toBeGreaterThan(0);
      // 1. The web's month rows: the place's factor moved by the researched
      // share a point of unemployment, within the link's range.
      const [low, high] = RANGE.map(Math.abs).sort((a, b) => a - b);
      const moves = twin.laid.map((id) => {
        const was = base.web.get(id)!,
          now = twin.web.get(id)!;
        expect(now.effect - was.effect, `${where}: ${id}`).toBeCloseTo(
          twin.delta,
          12,
        );
        const share = (now.factor / was.factor - 1) / points;
        expect(share, `${where}: ${id}`).toBeGreaterThanOrEqual(low!);
        expect(share, `${where}: ${id}`).toBeLessThanOrEqual(high!);
        return { id, share };
      });
      // 2. The plans: each couple's review is read against its twin's, until
      // the couple's first plan differs (after which their lives differ).
      const tipped: { base: Plan; twin: Plan }[] = [];
      const diverged = new Set<string>();
      const compared: string[] = [];
      const closeCalls: string[] = [];
      for (const plan of after(base.plans).sort((a, b) =>
        a.date.localeCompare(b.date),
      )) {
        const other = twin.plans.get(plan.id);
        if (!other || diverged.has(plan.coupleId)) continue;
        compared.push(plan.id);
        // Both partners weigh the same web term. It moved by the weight times
        // the link's shifted effect times the mother's age weight, none for a
        // mother of 40 or more; in the first round their other
        // circumstances stand within a twentieth.
        const moved = other.terms.map(
          (terms, partner) => terms.web! - plan.terms[partner]!.web!,
        );
        for (const [partner, move] of moved.entries()) {
          const expected = base.weight * twin.delta * plan.weight;
          if (plan.weight === 0)
            expect(move, `${where}: ${plan.id} partner ${partner}`).toBeCloseTo(
              0,
              9,
            );
          else {
            expect(
              move / expected,
              `${where}: ${plan.id} partner ${partner} web term`,
            ).toBeGreaterThan(1 - TOLERANCE);
            expect(
              move / expected,
              `${where}: ${plan.id} partner ${partner} web term`,
            ).toBeLessThan(1 + TOLERANCE);
          }
          if (firstRound(plan))
            for (const [key, value] of Object.entries(plan.terms[partner]!))
              if (key !== "web")
                expect(
                  Math.abs(other.terms[partner]![key]! - value),
                  `${where}: ${plan.id} partner ${partner} ${key}`,
                ).toBeLessThan(DRIFT);
        }
        // In the first round the couple plans when both partners' plan scores
        // beat waiting, so the base world's recorded scores say which couples
        // the shift tips (a couple whose weaker score lands within the drift
        // of waiting is too close to call). Later, the twins' worlds have
        // moved apart and the twin's own records stand.
        if (firstRound(plan)) {
          const slack = Math.min(
            ...plan.margins.map((margin, partner) => margin + moved[partner]!),
          );
          if (Math.abs(slack) > DRIFT) {
            expect(other.agreed, `${where}: ${plan.id}`).toBe(slack > 0);
            if (plan.agreed)
              expect(
                other.agreed,
                `${where}: ${plan.id} planned in the base world and not in the twin`,
              ).toBe(true);
          } else closeCalls.push(plan.id);
        }
        if (other.agreed !== plan.agreed)
          tipped.push({ base: plan, twin: other });
        if (other.agreed || plan.agreed) diverged.add(plan.coupleId);
      }
      expect(
        tipped.some(({ base: plan }) => plan.coupleId === nearest!.coupleId),
        `${where}: the couple nearest to planning (${nearest!.id})`,
      ).toBe(true);
      // 3. Each plan the shift tipped is a recorded pregnancy and, where the
      // due date fell inside the year, a recorded birth; the plan read a month
      // row the twin shifted.
      const ledger = tipped
        .filter(({ twin: plan }) => plan.agreed)
        .map(({ twin: plan }) => {
          expect(twin.laid, `${where}: web record of ${plan.id}`).toContain(
            webRecordOf(plan),
          );
          const pregnancy = twin.pregnancies.find(
            (row) => row.planId === plan.id,
          );
          expect(pregnancy, `${where}: pregnancy of ${plan.id}`).toBeDefined();
          const birth = twin.births.find(
            (row) => row.pregnancyId === pregnancy!.id,
          );
          if (pregnancy!.dueDate <= twin.end)
            expect(birth, `${where}: birth of ${pregnancy!.id}`).toBeDefined();
          return `${webRecordOf(plan)} -> ${plan.id} -> ${pregnancy!.id}${birth ? ` -> ${birth.id}` : ` (due ${pregnancy!.dueDate})`}`;
        });
      const agreed = (plans: ReadonlyMap<string, Plan>) =>
        after(plans).filter((plan) => plan.agreed).length;
      console.log(
        `births-full-web: ${where}: took ${points} points off unemployment (the web's factor moved ${(moves[0]!.share * 100).toFixed(3)}% a point); ${compared.length} reviews compared (${closeCalls.length} too close to call); plans that became pregnancies ${agreed(base.plans)} in the base world and ${agreed(twin.plans)} in the twin; tipped: ${ledger.join("; ")}${tried.length ? `; drawn again after ${tried.join("; ")}` : ""}`,
      );
      return;
    }
    throw new Error(
      `no drawn place in ${DRAWS} draws had a full couple within ${MOST_POINTS} points of planning: ${tried.join("; ")}`,
    );
  }, 3_600_000);
});
