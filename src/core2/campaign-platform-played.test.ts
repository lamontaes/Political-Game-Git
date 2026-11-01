/**
 * Candidates run on the questions where the town agrees with them, in a
 * played year (pool item campaign-platform-follows-agreement; research
 * docs/research/platform-emphasis-2026-10-30.md). Worlds in places drawn
 * from all 56 (PLATFORM_PLAYED_SEED pins the run) each play a year a day at
 * a time. Each platform a world records (a runner's filing, or the campaign
 * of a filing that stated none) is read back on the day it was recorded, by
 * record, against the rule's scores at the moment the platform was chosen
 * (the test watches each call of candidatePlatform and, in that instant,
 * scores the same candidate and questions by platformScores and counts the
 * electorate on each question itself by the readers the vote scores a
 * platform by, campaign-platform-test-kit.ts, since what reaches people later that day
 * can move their views): the candidate, every question the seat takes up
 * with their conviction, the electorate's support for their side (which
 * must be the count by the vote's readers) and the score, and the platform
 * must be the top scores, at the candidate's own positions. The first year
 * with a contested local race is the proof by record.
 *
 * Over the pooled years (MIN_PLACES drawn places' years or more):
 * - a candidate whose strongest view is the electorate's minority side
 *   leaves it off for a question that scores higher, read by record;
 * - the electorate agrees more, by the vote's readers, with the platforms
 *   the rule chose than with the strongest views the candidates would have
 *   run on by the old rule, in total;
 * - the research's C1 total (Druckman, Jacobs and Ostermeier 2004, as the
 *   research's quote verification restates it: +15% to +86% emphasis per 10
 *   points of support, exp(10 x (.028 - .013)) to exp(10 x (.043 + .019))),
 *   over every (candidate, question) pair of the candidates with a choice,
 *   silences included: each candidate's emphasis on a question is its
 *   score's share of their platform's scores, none for a question left off,
 *   and a log-linear count model of emphasis on support at fixed conviction
 *   must rise inside the band. The pairs are those of contested local races
 *   where they hold MIN_CANDIDATES candidates with a choice (their seat takes
 *   up more questions they hold a view on than they run on), and every
 *   platform the years' filings hold where they do not, and the test says
 *   which. The same total with each candidate's platform chosen again from
 *   the recorded scores at the spread's ends is printed, as is the emphasis
 *   among the questions run on alone (which reads the slope back by
 *   construction and is not held to anything).
 */
import { randomBytes } from "node:crypto";
import { expect, it, vi } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import type { CoreAPI, CoreState } from "./types";
import type * as Stances from "./campaign-stances";
import type { PlatformScore } from "./campaign-stances";
import { campaignParameter } from "./campaign-views";
import campaignParameters from "./data/campaigns/parameters.json" with { type: "json" };
import { contestPositions } from "./contest-positions";
import { CAMPAIGNS_MODULE_ID, type CampaignRow } from "./modules/campaigns";
import {
  ELECTIONS_MODULE_ID,
  type ContestRow,
  type FilingRow,
} from "./modules/elections";
import { OFFICES_MODULE_ID } from "./modules/offices";
import { residentsRuntime } from "./modules/residents";
import {
  electorateAgreement,
  sidesByAgreement,
  type AgreementSides,
} from "./campaign-platform-test-kit";
import {
  agreementWith,
  countedStanceProfile,
  VIEWS_MODULE_ID,
} from "./modules/views";

/** Each platform chosen in play: the rule's scores, and the electorate by the vote's readers, in the same instant. */
interface Chosen {
  readonly date: string;
  readonly personId: string;
  readonly positions: readonly string[];
  readonly scores: readonly PlatformScore[];
  /** Each seat question's electorate, counted by the vote's agreement readers. */
  readonly sides: ReadonlyMap<string, AgreementSides>;
}
const chosen = new Map<string, Chosen>();
/**
 * The electorate on each question by the vote's readers, kept as the
 * platform engine keeps its own count: for the day, until someone is filled
 * in or the people change, each question counted the first time it is asked.
 */
const sidesKept = new Map<string, AgreementSides>();
const chosenKey = (
  date: string,
  personId: string,
  positions: readonly string[],
) => `${date}|${personId}|${positions.join(",")}`;
vi.mock("./campaign-stances", async (importOriginal) => {
  const real = await importOriginal<typeof Stances>();
  return {
    ...real,
    candidatePlatform: (
      ...args: Parameters<typeof real.candidatePlatform>
    ): ReturnType<typeof real.candidatePlatform> => {
      const [api, personId, party, positions] = args;
      const core = api.state as CoreState;
      const day = `${core.date}|${core.people.size}|${residentsRuntime(core)?.store.membersVersion ?? 0}`;
      const sides = new Map<string, AgreementSides>();
      for (const question of positions) {
        const key = `${day}|${question}`;
        let held = sidesKept.get(key);
        if (!held)
          sidesKept.set(
            key,
            (held = sidesByAgreement(api, question, {
              agreementWith,
              countedStanceProfile,
              moduleId: VIEWS_MODULE_ID,
            })),
          );
        sides.set(question, held);
      }
      const scores = real.platformScores(api, personId, party, positions);
      chosen.set(chosenKey(api.state.date, personId, positions), {
        date: api.state.date,
        personId,
        positions: [...positions],
        scores,
        sides,
      });
      return real.candidatePlatform(...args);
    },
  };
});

const seed = process.env.PLATFORM_PLAYED_SEED ?? randomBytes(8).toString("hex");
/** Most drawn places' years: many small towns hold no contested local race in a year. */
const MAX_DRAWS = 12;
const DAYS = 365;
/** The fewest drawn places' years the totals pool. */
const MIN_PLACES = 3;
/** The fewest candidates with a choice the totals take. */
const MIN_CANDIDATES = 40;
/** The measure's unit, in points of support. */
const SPAN = 10;
/**
 * The research band per 10 points of support, as its quote verification
 * restates C1: exp(10 x (.028 - .013)) = +16% (Table 4 domestic, less one
 * standard error) to exp(10 x (.043 + .019)) = +86% (Table 2 domestic, plus
 * one).
 */
const BAND = { low: Math.exp(0.15) - 1, high: Math.exp(0.62) - 1 };

/** A campaign parameter's spread, from its row. */
const campaignSpread = (key: string) =>
  (
    campaignParameters as unknown as {
      parameters: Record<string, { spread: [number, number] }>;
    }
  ).parameters[key]!.spread;

/** One platform the world recorded, read back on its day. */
interface Read {
  readonly where: string;
  readonly date: string;
  readonly filingId: string;
  readonly contestId: string;
  readonly candidateId: string;
  readonly local: boolean;
  /** Where it was recorded: the filing, or its campaign. */
  readonly record: "filing" | "campaign";
  readonly platform: readonly { question: string; position: number }[];
  /** The rule's scores on the seat's questions when the platform was chosen. */
  readonly scores: readonly PlatformScore[];
  /** The electorate on each seat question by the vote's readers, at that moment. */
  readonly sides: ReadonlyMap<string, AgreementSides>;
}

const parse = (rows: readonly string[]) =>
  rows.map((row) => {
    const at = row.lastIndexOf("=");
    return { question: row.slice(0, at), position: Number(row.slice(at + 1)) };
  });

/** A candidate whose questions' support spans SPAN points or more. */
const spans = (r: Read) => {
  const supports = r.scores.map((s) => s.support);
  return (
    supports.length > 0 && Math.max(...supports) - Math.min(...supports) >= SPAN
  );
};

/** A candidate who left a question they hold a view on off their platform. */
const chose = (r: Read) => r.scores.length > r.platform.length;

/** The rule's scores of the questions a candidate runs on. */
const onPlatform = (r: Read) => {
  const on = new Set(r.platform.map((s) => s.question));
  return r.scores.filter((s) => on.has(s.question));
};

/** A candidate whose platform's questions differ in support by a point or more. */
const varied = (r: Read) => {
  const supports = onPlatform(r).map((s) => s.support);
  return (
    supports.length > 1 && Math.max(...supports) - Math.min(...supports) >= 1
  );
};

/** The questions a candidate would have run on by the old rule: their strongest views, whatever the town thinks. */
const strongestViews = (r: Read) =>
  [...r.scores]
    .sort(
      (a, b) =>
        b.conviction - a.conviction || a.question.localeCompare(b.question),
    )
    .slice(0, r.platform.length);

/** The platform the rule would choose from the recorded scores at another slope. */
function rechoose(r: Read, slope: number): Read {
  const scores = r.scores.map((s) => ({
    ...s,
    score: s.conviction * Math.exp(slope * s.support),
  }));
  const platform = [...scores]
    .sort((a, b) => b.score - a.score || a.question.localeCompare(b.question))
    .slice(0, r.platform.length)
    .map((s) => ({ question: s.question, position: s.position }));
  return { ...r, scores, platform };
}

function levelOf(api: CoreAPI, contest: ContestRow): string {
  return (
    (
      api
        .moduleState(OFFICES_MODULE_ID)
        .table("offices")
        .get(contest.officeId) as unknown as { level: string } | undefined
    )?.level ?? ""
  );
}

/** A world's year, a day at a time, and every platform it recorded, read back on its day. */
function playYear(draw: number) {
  const place = drawPlace(`${seed}:${draw}`, "campaign-platform-played");
  const where = `${place.name} (${place.key}), run seed ${seed}, draw ${draw}, place seed ${place.seed}`;
  console.log(`campaign-platform-played: ${where}`);
  try {
    return playYearIn(where, place);
  } catch (error) {
    throw new Error(
      `${where}: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }
}

function playYearIn(
  where: string,
  place: ReturnType<typeof drawPlace>,
): { where: string; reads: Read[]; contested: Read[] } {
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  // Officials of other places share ids between worlds; each year starts clean.
  chosen.clear();
  sidesKept.clear();
  const elections = api.moduleState(ELECTIONS_MODULE_ID);
  const filingsTable = elections.table("filings");
  const seenFilings = new Set<string>();
  const seenCampaigns = new Set<string>();
  const reads: Read[] = [];
  const read = (
    filing: FilingRow,
    record: Read["record"],
    platform: Read["platform"],
  ) => {
    const contest = elections
      .table("contests")
      .get(filing.contestId) as unknown as ContestRow;
    const level = levelOf(api, contest);
    // The choice the rule made for this record: the same candidate, day and
    // seat questions.
    const positions = contestPositions(api, contest);
    const choice = chosen.get(chosenKey(core.date, filing.personId, positions));
    if (!choice)
      throw new Error(
        `${where}: ${record} of ${filing.id} (candidate ${filing.personId}, filed ${filing.filedOn}) on ${core.date} holds a platform no choice by the rule made that day on the seat's questions (${positions.join(", ")})`,
      );
    reads.push({
      where,
      date: core.date,
      filingId: filing.id,
      contestId: contest.id,
      candidateId: filing.personId,
      local: level !== "state" && level !== "federal",
      record,
      platform,
      scores: choice.scores,
      sides: choice.sides,
    });
  };
  const end = addDays(makeIsoDate(core.date), DAYS);
  while (core.date < end) {
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    for (const filing of filingsTable.rows() as unknown as FilingRow[]) {
      if (seenFilings.has(filing.id)) continue;
      seenFilings.add(filing.id);
      if (filing.platform.length)
        read(filing, "filing", parse(filing.platform));
    }
    if (!api.state.modules.has(CAMPAIGNS_MODULE_ID)) continue;
    for (const campaign of api
      .moduleState(CAMPAIGNS_MODULE_ID)
      .table("campaigns")
      .rows() as unknown as CampaignRow[]) {
      if (seenCampaigns.has(campaign.id)) continue;
      seenCampaigns.add(campaign.id);
      const filing = filingsTable.get(campaign.filingId) as unknown as
        FilingRow | undefined;
      // A filing with a stated platform campaigns on it, read above.
      if (filing && !filing.platform.length)
        read(filing, "campaign", campaign.platform);
    }
  }
  // Contested local races: a local seat two or more candidates filed for.
  const filed = new Map<string, number>();
  for (const filing of filingsTable.rows() as unknown as FilingRow[])
    filed.set(filing.contestId, (filed.get(filing.contestId) ?? 0) + 1);
  const contested = reads.filter(
    (r) => r.local && (filed.get(r.contestId) ?? 0) >= 2,
  );
  return { where, reads, contested };
}

const row = (s: PlatformScore) =>
  `${s.question} conviction ${s.conviction.toFixed(3)} support ${s.support.toFixed(1)}% score ${s.score.toFixed(3)}`;

const recordOf = (r: Read) =>
  `${r.where}: ${r.record} of ${r.filingId} (candidate ${r.candidateId}) on ${r.date}`;

/**
 * Each read platform is its candidate's top scores by the rule, at their own
 * positions, and each question's support is the electorate on the
 * candidate's side as the vote's readers count it.
 */
function proveByRecord(reads: readonly Read[]): string[] {
  const slope = campaignParameter("platformSupportSlope");
  const lines: string[] = [];
  for (const r of reads) {
    const label = recordOf(r);
    for (const s of r.scores) {
      // Every score is the rule's, from the conviction and support it records.
      expect(s.conviction, `${label}: ${s.question}`).toBe(
        Math.abs(s.position),
      );
      expect(s.score, `${label}: ${s.question}`).toBeCloseTo(
        s.conviction * Math.exp(slope * s.support),
        12,
      );
      // The support is the share the vote's readers put on their side.
      const sides = r.sides.get(s.question)!;
      expect(s.support, `${label}: ${s.question} support`).toBeCloseTo(
        100 * (s.position > 0 ? sides.yes : sides.no),
        9,
      );
    }
    const ranked = [...r.scores].sort(
      (a, b) => b.score - a.score || a.question.localeCompare(b.question),
    );
    const top = ranked.slice(0, r.platform.length);
    expect(
      r.platform.map((s) => s.question),
      `${label}: the platform is the top scores`,
    ).toEqual(top.map((s) => s.question));
    expect(
      r.platform.map((s) => s.position),
      `${label}: at the candidate's own positions`,
    ).toEqual(top.map((s) => Math.round(s.position * 1000) / 1000));
    if (lines.length < 4) {
      const off = ranked[r.platform.length];
      lines.push(
        `  ${r.record} ${r.filingId} candidate ${r.candidateId} on ${r.date}: ${top.map(row).join("; ")}; highest left off ${off ? row(off) : "none"}; the strongest views alone would have been ${strongestViews(
          r,
        )
          .map((s) => s.question)
          .join(", ")}`,
      );
    }
  }
  return lines;
}

/** A candidate whose strongest view is the electorate's minority side, left off for a question that scores higher. */
function minorityLeftOff(r: Read): string | null {
  const strongest = strongestViews(r)[0];
  if (!strongest || strongest.support >= 50) return null;
  if (r.platform.some((s) => s.question === strongest.question)) return null;
  const on = onPlatform(r).sort((a, b) => b.score - a.score);
  const instead = on[0];
  if (!instead || instead.score <= strongest.score) return null;
  return `${recordOf(r)}: strongest view ${row(strongest)} left off; runs on ${on.map(row).join("; ")}`;
}

/** The electorate's agreement (by the vote's readers) with each candidate's platform and with their strongest views. */
function agreementTotals(reads: readonly Read[]) {
  let rule = 0,
    strongest = 0,
    rose = 0,
    fell = 0,
    same = 0;
  for (const r of reads) {
    const sides = (q: string) => r.sides.get(q)!;
    const a = electorateAgreement(r.platform, sides);
    const b = electorateAgreement(
      strongestViews(r).map((s) => ({
        question: s.question,
        position: Math.round(s.position * 1000) / 1000,
      })),
      sides,
    );
    rule += a;
    strongest += b;
    if (a > b + 1e-12) rose += 1;
    else if (a < b - 1e-12) fell += 1;
    else same += 1;
  }
  return { rule, strongest, rose, fell, same };
}

/**
 * Emphasis on support, per 10 points, holding conviction fixed: a Poisson
 * log-linear fit (iteratively reweighted least squares) of each pair's
 * emphasis share on its support and the log of its conviction.
 */
function emphasisPer10(reads: readonly Read[]): {
  per10: number;
  pairs: number;
} {
  const rows: { y: number; x: readonly number[] }[] = [];
  for (const r of reads) {
    const on = new Set(r.platform.map((s) => s.question));
    const sum = r.scores
      .filter((s) => on.has(s.question))
      .reduce((t, s) => t + s.score, 0);
    for (const s of r.scores)
      rows.push({
        y: on.has(s.question) ? s.score / sum : 0,
        x: [1, (s.support - 50) / 10, Math.log(s.conviction)],
      });
  }
  const k = 3;
  const b = [Math.log(rows.reduce((t, r) => t + r.y, 0) / rows.length), 0, 0];
  for (let step = 0; step < 100; step += 1) {
    const a = Array.from({ length: k }, () => new Array<number>(k + 1).fill(0));
    for (const r of rows) {
      const mu = Math.exp(r.x.reduce((t, x, i) => t + x * b[i]!, 0));
      for (let i = 0; i < k; i += 1) {
        a[i]![k]! += (r.y - mu) * r.x[i]!;
        for (let j = 0; j < k; j += 1) a[i]![j]! += mu * r.x[i]! * r.x[j]!;
      }
    }
    // Solve for the step by elimination.
    for (let i = 0; i < k; i += 1)
      for (let j = i + 1; j < k; j += 1) {
        const f = a[j]![i]! / a[i]![i]!;
        for (let l = i; l <= k; l += 1) a[j]![l]! -= f * a[i]![l]!;
      }
    const d = new Array<number>(k).fill(0);
    for (let i = k - 1; i >= 0; i -= 1) {
      let s = a[i]![k]!;
      for (let j = i + 1; j < k; j += 1) s -= a[i]![j]! * d[j]!;
      d[i] = s / a[i]![i]!;
    }
    let moved = 0;
    for (let i = 0; i < k; i += 1) {
      b[i]! += d[i]!;
      moved += Math.abs(d[i]!);
    }
    if (moved < 1e-10) break;
  }
  return { per10: Math.exp(b[1]!) - 1, pairs: rows.length };
}

/** One candidate's questions, each its emphasis share and its support (per 10 points) and log conviction. */
type Group = readonly { y: number; x: readonly [number, number] }[];

/**
 * Emphasis on support, per 10 points, holding conviction fixed and comparing
 * each candidate's questions with each other only: a Poisson log-linear fit
 * with a term for each candidate (the conditional fit, a multinomial logit
 * of each candidate's emphasis shares on support and the log of conviction),
 * by Newton's method. A candidate whose questions all have the same support
 * adds nothing to the support term.
 */
function conditionalPer10(groups: readonly Group[]): {
  per10: number;
  converged: boolean;
} {
  const b = [0, 0];
  for (let step = 0; step < 200; step += 1) {
    const g = [0, 0];
    const h = [
      [0, 0],
      [0, 0],
    ];
    for (const pairs of groups) {
      const w = pairs.map((p) => Math.exp(b[0]! * p.x[0] + b[1]! * p.x[1]));
      const total = w.reduce((t, v) => t + v, 0);
      const pr = w.map((v) => v / total);
      const y = pairs.reduce((t, p) => t + p.y, 0);
      const mean = [0, 1].map((i) =>
        pairs.reduce((t, p, j) => t + pr[j]! * p.x[i]!, 0),
      );
      pairs.forEach((p, j) => {
        for (let i = 0; i < 2; i += 1) {
          g[i]! += (p.y - y * pr[j]!) * p.x[i]!;
          for (let k = 0; k < 2; k += 1)
            h[i]![k]! +=
              y * pr[j]! * (p.x[i]! - mean[i]!) * (p.x[k]! - mean[k]!);
        }
      });
    }
    const det = h[0]![0]! * h[1]![1]! - h[0]![1]! * h[1]![0]!;
    if (!(Math.abs(det) > 1e-15)) return { per10: NaN, converged: false };
    const d0 = (h[1]![1]! * g[0]! - h[0]![1]! * g[1]!) / det;
    const d1 = (h[0]![0]! * g[1]! - h[1]![0]! * g[0]!) / det;
    b[0]! += d0;
    b[1]! += d1;
    if (Math.abs(d0) + Math.abs(d1) < 1e-10)
      return { per10: Math.exp(b[0]!) - 1, converged: true };
  }
  return { per10: Math.exp(b[0]!) - 1, converged: false };
}

/** Each candidate's questions with their emphasis: a platform question's score share, none for one left off. */
function groupOf(r: Read, onlyPlatform: boolean): Group {
  const on = new Set(r.platform.map((s) => s.question));
  const sum = onPlatform(r).reduce((t, s) => t + s.score, 0);
  return r.scores
    .filter((s) => !onlyPlatform || on.has(s.question))
    .map((s) => ({
      y: on.has(s.question) ? s.score / sum : 0,
      x: [s.support / 10, Math.log(s.conviction)] as const,
    }));
}

/**
 * Among the questions each candidate runs on only: the rule's own weighting,
 * so it reads the slope back (exp(10 x slope) - 1) and is printed, not held.
 */
function withinPlatformPer10(reads: readonly Read[]) {
  const varying = reads.filter(varied);
  return {
    ...conditionalPer10(varying.map((r) => groupOf(r, true))),
    candidates: varying.length,
  };
}

/** Over every question each candidate holds a view on, silences included, each candidate's compared with each other. */
function withinCandidatePer10(reads: readonly Read[]) {
  return conditionalPer10(reads.map((r) => groupOf(r, false)));
}

it("every contested local race's candidates run on their top questions by the rule, and emphasis rises with support inside the research band", () => {
  const tried: string[] = [];
  let proof: string[] | null = null;
  const contestedPool: Read[] = [];
  const everyPool: Read[] = [];
  const places: string[] = [];
  const minority: string[] = [];
  const enough = () =>
    contestedPool.filter(chose).length >= MIN_CANDIDATES ||
    everyPool.filter(chose).length >= MIN_CANDIDATES;
  for (let draw = 0; draw < MAX_DRAWS; draw += 1) {
    const year = playYear(draw);
    places.push(year.where);
    // Every platform read is the rule's, contested or not.
    const lines = proveByRecord(year.reads);
    contestedPool.push(...year.contested);
    everyPool.push(...year.reads);
    for (const r of year.reads) {
      const found = minorityLeftOff(r);
      if (found) minority.push(found);
    }
    if (!proof) {
      if (!year.contested.length)
        tried.push(
          `${year.where}: no contested local race recorded a platform in ${DAYS} days (${year.reads.length} platforms read)`,
        );
      else
        proof = [
          `${year.where}: ${year.contested.length} platforms of contested local races (${year.reads.length} platforms in all) read by record, each its candidate's top scores at their own positions, each support the vote's readers' count`,
          ...lines,
        ];
    }
    if (proof && minority.length && places.length >= MIN_PLACES && enough())
      break;
  }
  const useContested = contestedPool.filter(chose).length >= MIN_CANDIDATES;
  const pool = (useContested ? contestedPool : everyPool).filter(chose);
  const how = useContested
    ? `the contested local races of ${places.length} places' years`
    : `every platform the filings of ${places.length} places' years hold (their contested local races held ${contestedPool.filter(chose).length} candidates with a choice, fewer than ${MIN_CANDIDATES})`;
  const slope = campaignParameter("platformSupportSlope");
  const [lowest, highest] = campaignSpread("platformSupportSlope");
  const all = emphasisPer10(pool);
  const at = (s: number) => emphasisPer10(pool.map((r) => rechoose(r, s)));
  const within = withinPlatformPer10(pool);
  const byCandidate = withinCandidatePer10(pool);
  const byCandidateAt = (s: number) =>
    withinCandidatePer10(pool.map((r) => rechoose(r, s)));
  const agree = agreementTotals(pool);
  const pct = (x: number) => `${x >= 0 ? "+" : ""}${(100 * x).toFixed(0)}%`;
  const slopeOf = (per10: number) => (Math.log(1 + per10) / 10).toFixed(4);
  const supports = pool.flatMap((r) => r.scores.map((s) => s.support));
  const total = [
    `places: ${places.join("; ")}`,
    `minority-side strongest views left off: ${minority.length}; first: ${minority[0] ?? "none"}`,
    `calibration over ${how}: ${pool.length} candidates with a choice (${pool.filter(spans).length} whose questions' support spans ${SPAN} points), support ${Math.min(...supports).toFixed(1)}% to ${Math.max(...supports).toFixed(1)}%; platformSupportSlope ${slope}, band ${pct(BAND.low)} to ${pct(BAND.high)} per 10 points`,
    `  over every (candidate, question) pair, silences included (${all.pairs} pairs): emphasis ${pct(all.per10)} per 10 points of support at fixed conviction, slope measured ${slopeOf(all.per10)} per point`,
    `  the same pairs with each platform chosen again from the recorded scores: at ${lowest} ${pct(at(lowest).per10)}, at ${highest} ${pct(at(highest).per10)}`,
    `  over every pair, silences included, each candidate's questions compared with each other only (the one-campaign design of the study): ${pct(byCandidate.per10)}${byCandidate.converged ? "" : " (the fit did not converge)"}; at ${lowest} ${pct(byCandidateAt(lowest).per10)}, at ${highest} ${pct(byCandidateAt(highest).per10)}`,
    `  among the questions each candidate runs on (${within.candidates} candidates whose platform's questions differ in support; the rule's own weighting, read back): ${pct(within.per10)}`,
    `electorate agreement by the vote's readers, summed over the ${pool.length} candidates: the rule's platforms ${agree.rule.toFixed(4)}, the strongest views ${agree.strongest.toFixed(4)} (rose for ${agree.rose}, fell for ${agree.fell}, the same for ${agree.same})`,
  ].join("\n");
  console.log([...(proof ?? tried), total].join("\n"));
  if (!proof)
    expect.fail(
      `no draw of ${MAX_DRAWS} held a contested local race:\n${tried.join("\n")}`,
    );
  expect(
    minority.length,
    `no candidate in ${places.join("; ")} left off a strongest view on the electorate's minority side for a question that scores higher`,
  ).toBeGreaterThan(0);
  expect(
    pool.length,
    `the total over ${how} holds too few candidates with a choice`,
  ).toBeGreaterThanOrEqual(MIN_CANDIDATES);
  // The town agrees more with what the rule runs on than with the strongest views.
  expect(agree.rule, total).toBeGreaterThan(agree.strongest);
  // C1: emphasis rises with support inside the research band. Measured
  // outside it at every slope in the spread (SG-GOV-platform-slope-c1-out-of-band),
  // for the governing lead's ruling on which total C1 holds; the band is not
  // widened.
  expect(all.per10, total).toBeGreaterThanOrEqual(BAND.low);
  expect(all.per10, total).toBeLessThanOrEqual(BAND.high);
}, 7_200_000);
