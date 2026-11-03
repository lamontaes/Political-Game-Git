/**
 * Which questions a candidate runs on (pool item
 * campaign-platform-follows-agreement; docs/research/platform-emphasis-2026-10-30.md):
 * of the questions the seat takes up, a candidate runs on those whose
 * score, how strongly they hold it times exp(platformSupportSlope × the
 * percent of the town's electorate on their side), is highest, at their own
 * positions. In a place drawn from all 56 (PLATFORM_SEED pins the run), the
 * test works out every share itself from the electorate by the readers the
 * ballot scores a platform by (each named adult by `agreementWith` at
 * `voterLean`, each counted record by `groupAgreement` times the people it
 * stands for, on the platform "yes on this question";
 * campaign-platform-test-kit.ts), scores every question by the rule, checks
 * that where the town stands on each question (`townStand`, what an
 * interview answer is shaded toward) is the same electorate's mean, and
 * finds a candidate whose strongest view is the town's minority side (its
 * share below the other side's) and is left off for a question that scores
 * higher.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { ageOnDate } from "./kernel/dates";
import { coreAPI } from "./state";
import {
  candidatePlatform,
  candidateStance,
  platformScores,
} from "./campaign-stances";
import { campaignParameter } from "./campaign-views";
import { contestPositions } from "./contest-positions";
import { lawChain } from "./modules/laws";
import { ELECTIONS_MODULE_ID, type ContestRow } from "./modules/elections";
import { OFFICES_MODULE_ID } from "./modules/offices";
import { townStand } from "./modules/press";
import { sidesByAgreement } from "./campaign-platform-test-kit";
import { agreementWith, countedStanceProfile } from "./modules/views";

/** The views engine's readers the shares are counted by. */
const VIEWS = {
  agreementWith,
  countedStanceProfile,
};

const seed = process.env.PLATFORM_SEED ?? randomBytes(8).toString("hex");
const MAX_DRAWS = 8;
/** Adults living in the town scored as candidates in each draw, in id order. */
const CANDIDATES = 120;

interface Scored {
  question: string;
  position: number;
  conviction: number;
  support: number;
  /** The percent of the electorate on the other side. */
  against: number;
  score: number;
}

function attempt(draw: number): { proven: string } | { tried: string } {
  const place = drawPlace(`${seed}:${draw}`, "campaign-platform");
  const where = `${place.name} (${place.key}), run seed ${seed}, draw ${draw}, place seed ${place.seed}`;
  console.log(`campaign-platform: ${where}`);
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  const slope = campaignParameter("platformSupportSlope");
  const count = campaignParameter("candidatePlatformQuestions");
  // Every seat the town's adults vote for, local seats first (a state or
  // federal seat takes up many more questions, which a candidate there
  // chooses among by the same rule), each with the questions it takes up.
  // Every seat is scored against the town's electorate, which stands in for
  // a ward's, county's, state's or nation's own until the platform rule
  // reads the seat's (SG-GOV-platform-support-true-share).
  const levelOf = (c: ContestRow) =>
    (
      api
        .moduleState(OFFICES_MODULE_ID)
        .table("offices")
        .get(c.officeId) as unknown as { level: string } | undefined
    )?.level;
  const local = (c: ContestRow) =>
    levelOf(c) !== "state" && levelOf(c) !== "federal" ? 0 : 1;
  const contests = (
    api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("contests")
      .rows() as unknown as ContestRow[]
  )
    .filter((c) => levelOf(c) !== undefined)
    .sort((a, b) => local(a) - local(b) || a.id.localeCompare(b.id));
  // The town's own adults, who could file for its seats (officials of other
  // places, whose ids sort first, are not).
  const town = lawChain(api).townPlaceId;
  const adults = [...core.people.values()]
    .filter(
      (p) =>
        p.alive &&
        p.placeId === town &&
        ageOnDate(p.birthDate, core.date) >= api.parameter("votingAge"),
    )
    .sort((a, b) => a.id.localeCompare(b.id))
    .slice(0, CANDIDATES);
  const supportOf = new Map<string, ReturnType<typeof sidesByAgreement>>();
  const seen = new Set<string>();
  for (const contest of contests) {
    const positions = contestPositions(api, contest);
    const key = positions.join("|");
    if (seen.has(key) || positions.length <= count) continue;
    seen.add(key);
    for (const adult of adults) {
      const platform = candidatePlatform(api, adult.id, null, positions);
      // Every question the candidate holds a view on, scored by the rule
      // from the conviction and the share worked out here.
      const scored: Scored[] = [];
      for (const question of positions) {
        const position = candidateStance(api, adult.id, null, question);
        if (position === null || position === 0) continue;
        let s = supportOf.get(question);
        if (!s)
          supportOf.set(question, (s = sidesByAgreement(api, question, VIEWS)));
        const support = 100 * (position > 0 ? s.yes : s.no);
        const conviction = Math.abs(position);
        scored.push({
          question,
          position,
          conviction,
          support,
          against: 100 * (position > 0 ? s.no : s.yes),
          score: conviction * Math.exp(slope * support),
        });
      }
      const on = new Set(platform.map((s) => s.question));
      const label = `${where}: ${adult.id} in ${contest.id}`;
      // The engine's own count of each share agrees with the vote's readers.
      const engine = platformScores(api, adult.id, null, positions);
      expect(
        engine.map((s) => s.question),
        label,
      ).toEqual(scored.map((s) => s.question));
      for (const [i, s] of engine.entries())
        expect(s.support, `${label}: ${s.question} support`).toBeCloseTo(
          scored[i]!.support,
          9,
        );
      expect(platform.length, label).toBe(Math.min(count, scored.length));
      // The platform's questions outscore every question left off.
      const onScores = scored.filter((s) => on.has(s.question));
      const offScores = scored.filter((s) => !on.has(s.question));
      const lowestOn = Math.min(...onScores.map((s) => s.score));
      for (const off of offScores)
        expect(
          off.score,
          `${label}: ${off.question} left off scores ${off.score} above a platform question (${lowestOn})`,
        ).toBeLessThanOrEqual(lowestOn + 1e-12);
      // Positions are the candidate's own.
      for (const stance of platform) {
        const own = scored.find((s) => s.question === stance.question)!;
        expect(stance.position, `${label}: ${stance.question}`).toBe(
          Math.round(own.position * 1000) / 1000,
        );
      }
      // The strongest view, on the town's minority side, left off for a
      // question that scores higher.
      const strongest = [...scored].sort(
        (a, b) =>
          b.conviction - a.conviction || a.question.localeCompare(b.question),
      )[0];
      if (
        !strongest ||
        strongest.support >= strongest.against ||
        on.has(strongest.question)
      )
        continue;
      const instead = [...onScores].sort((a, b) => b.score - a.score)[0]!;
      expect(instead.score, label).toBeGreaterThan(strongest.score);
      const before = [...scored]
        .sort(
          (a, b) =>
            b.conviction - a.conviction || a.question.localeCompare(b.question),
        )
        .slice(0, count);
      const row = (s: Scored) =>
        `${s.question} position ${s.position.toFixed(3)} conviction ${s.conviction.toFixed(3)} support ${s.support.toFixed(1)}% score ${s.score.toFixed(3)}`;
      // Where the town stands on each question, as an interview answer is
      // shaded toward, is the same electorate's mean.
      for (const [question, sides] of supportOf)
        expect(townStand(api, question), `${where}: ${question}`).toBeCloseTo(
          sides.mean,
          9,
        );
      return {
        proven: [
          `${label}: strongest view ${row(strongest)} (against ${strongest.against.toFixed(1)}%) left off; ${instead.question} scores ${instead.score.toFixed(3)}`,
          `  before (strongest views): ${before.map(row).join("; ")}`,
          `  after (the rule): ${[...onScores]
            .sort((a, b) => b.score - a.score)
            .map(row)
            .join("; ")}`,
          `  ${scored.length} questions scored, ${supportOf.size} shares worked out, each town stand the electorate's mean, slope ${slope}`,
        ].join("\n"),
      };
    }
  }
  return {
    tried: `${where}: no candidate of ${adults.length} in ${seen.size} seat question sets whose strongest view is the minority side and left off`,
  };
}

it("a candidate runs on the questions that score highest by the rule, at their own positions", () => {
  const tried: string[] = [];
  for (let draw = 0; draw < MAX_DRAWS; draw += 1) {
    const result = attempt(draw);
    if ("proven" in result) {
      console.log(result.proven);
      return;
    }
    tried.push(result.tried);
  }
  expect.fail(`no draw of ${MAX_DRAWS} held the case:\n${tried.join("\n")}`);
}, 1_800_000);
