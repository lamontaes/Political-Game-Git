/**
 * Which questions a candidate runs on (pool item
 * campaign-platform-follows-agreement; docs/research/platform-emphasis-2026-10-30.md):
 * of the questions the seat takes up, a candidate runs on those whose
 * score, how strongly they hold it times exp(platformSupportSlope × the
 * percent of the town's electorate on their side), is highest, at their own
 * positions. In a place drawn from all 56 (PLATFORM_SEED pins the run), the
 * test works out every share itself from the electorate (each named adult at
 * their own view, each counted record times the people it stands for, plus
 * the policy's national popularity), scores every question by the rule, and
 * finds a candidate whose strongest view is the town's minority side and is
 * left off for a question that scores higher.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { ageOnDate } from "./kernel/dates";
import { coreAPI } from "./state";
import type { CoreAPI, CoreState } from "./types";
import { candidatePlatform, candidateStance } from "./campaign-stances";
import {
  campaignParameter,
  groupStance,
  personLean,
  publicOffset,
} from "./campaign-views";
import { contestPositions } from "./contest-positions";
import { countedResidents } from "./electorate";
import { townLean } from "./modules/campaigns";
import { ELECTIONS_MODULE_ID, type ContestRow } from "./modules/elections";
import { OFFICES_MODULE_ID } from "./modules/offices";
import { electorateRoll } from "./modules/voting";
import { countedStanceProfile, viewOn, VIEWS_MODULE_ID } from "./modules/views";

const seed = process.env.PLATFORM_SEED ?? randomBytes(8).toString("hex");
const MAX_DRAWS = 8;
/** Adults of the town scored as candidates in each draw, in id order. */
const CANDIDATES = 60;

/** The share of the town's electorate whose own stance favors and opposes a question, worked out here from the people and records. */
function shares(api: CoreAPI, question: string): { yes: number; no: number } {
  const core = api.state as CoreState;
  const records = new Map(countedResidents(core).map((row) => [row.id, row]));
  const views = core.modules.has(VIEWS_MODULE_ID);
  const offset = publicOffset(question, core.seed);
  let yes = 0,
    no = 0,
    all = 0;
  for (const row of electorateRoll(api)) {
    const named = row.target === "person";
    const who = named ? core.people.get(row.id) : records.get(row.id);
    if (!who) continue;
    const lean = personLean(core.people, who, townLean(api));
    const stance =
      (named
        ? viewOn(api, row.id, question, lean)
        : groupStance(
            lean,
            question,
            views ? countedStanceProfile(api, records.get(row.id)!) : null,
          )) + offset;
    all += row.count;
    if (stance > 0) yes += row.count;
    if (stance < 0) no += row.count;
  }
  return all ? { yes: yes / all, no: no / all } : { yes: 0, no: 0 };
}

interface Scored {
  question: string;
  position: number;
  conviction: number;
  support: number;
  score: number;
}

function attempt(draw: number): { proven: string } | { tried: string } {
  const place = drawPlace(`${seed}:${draw}`, "campaign-platform");
  const where = `${place.name} (${place.key}), run seed ${seed}, draw ${draw}, place seed ${place.seed}`;
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  const slope = campaignParameter("platformSupportSlope");
  const count = campaignParameter("candidatePlatformQuestions");
  // The town's local seats, each with the questions it takes up.
  const contests = (
    api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("contests")
      .rows() as unknown as ContestRow[]
  )
    .filter((c) => {
      const office = api
        .moduleState(OFFICES_MODULE_ID)
        .table("offices")
        .get(c.officeId) as unknown as { level: string } | undefined;
      return office && office.level !== "state" && office.level !== "federal";
    })
    .sort((a, b) => a.id.localeCompare(b.id));
  const adults = [...core.people.values()]
    .filter(
      (p) =>
        p.alive &&
        ageOnDate(p.birthDate, core.date) >= api.parameter("votingAge"),
    )
    .sort((a, b) => a.id.localeCompare(b.id))
    .slice(0, CANDIDATES);
  const supportOf = new Map<string, { yes: number; no: number }>();
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
        if (!s) supportOf.set(question, (s = shares(api, question)));
        const support = 100 * (position > 0 ? s.yes : s.no);
        const conviction = Math.abs(position);
        scored.push({
          question,
          position,
          conviction,
          support,
          score: conviction * Math.exp(slope * support),
        });
      }
      const on = new Set(platform.map((s) => s.question));
      const label = `${where}: ${adult.id} in ${contest.id}`;
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
      if (!strongest || strongest.support >= 50 || on.has(strongest.question))
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
      return {
        proven: [
          `${label}: strongest view ${row(strongest)} left off; ${instead.question} scores ${instead.score.toFixed(3)}`,
          `  before (strongest views): ${before.map(row).join("; ")}`,
          `  after (the rule): ${[...onScores]
            .sort((a, b) => b.score - a.score)
            .map(row)
            .join("; ")}`,
          `  ${scored.length} questions scored, ${supportOf.size} shares worked out, slope ${slope}`,
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
