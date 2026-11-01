/**
 * Candidates run on the questions where the town agrees with them, in a
 * played year (pool item campaign-platform-follows-agreement; research
 * docs/research/platform-emphasis-2026-10-30.md). A world in a place drawn
 * from all 56 (PLATFORM_PLAYED_SEED pins the run) plays a year a day at a
 * time. Each platform the world records (a runner's filing, or the campaign
 * of a filing that stated none) is read back on the day it was recorded, by
 * record, against the rule's scores at the moment the platform was chosen
 * (the test watches each call of candidatePlatform and scores the same
 * candidate and questions by platformScores in that instant, since what
 * reaches the candidate later that day can move their own view): the
 * candidate, every question the seat takes up with their conviction, the
 * electorate's support for their side and the score, and the platform must
 * be the top scores, at the candidate's own positions. The first world whose
 * year holds a contested local race is the proof.
 *
 * The calibration totals (the research's C1, Druckman, Jacobs and Ostermeier
 * 2004: +27% to +86% space per 10 points of support). Each candidate's
 * emphasis on a question is its score's share of their platform's scores,
 * none for a question left off. Over the questions each candidate runs on, a
 * log-linear count model of emphasis on support, holding conviction fixed
 * and comparing each candidate's questions with each other (the study
 * followed one candidate's issues), must give +27% to +86% per 10 points.
 * Over every (candidate, question) pair, the silences included, the same
 * model without the comparison within a candidate must show emphasis rising
 * with support; its size is printed, not held to the band, because silence
 * on all but the top questions sharpens it by how many questions each seat
 * takes up: +26% in one drawn town's sixteen platforms, +42% in another's
 * twenty-six, +104% over four places' fifty-four (the governing lead rules
 * which measure C1 holds). The totals count the candidates who had a choice
 * to make (their seat takes up more questions they hold a view on than they
 * run on; one who runs on every view they hold, as a state or federal runner
 * on the seat's one question does, chose nothing) and need MIN_CANDIDATES of
 * them whose questions differ in support by 10 points or more, and
 * MIN_VARIED whose platform's questions differ in support. Where the
 * contested races hold fewer, the totals take every platform the year's
 * filings hold, and where those are still too few, the filings of the next
 * drawn places' years too, and the test says so.
 */
import { randomBytes } from "node:crypto";
import { expect, it, vi } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import type { CoreAPI } from "./types";
import type * as Stances from "./campaign-stances";
import type { PlatformScore } from "./campaign-stances";
import { campaignParameter } from "./campaign-views";
import { contestPositions } from "./contest-positions";
import { CAMPAIGNS_MODULE_ID, type CampaignRow } from "./modules/campaigns";
import {
  ELECTIONS_MODULE_ID,
  type ContestRow,
  type FilingRow,
} from "./modules/elections";
import { OFFICES_MODULE_ID } from "./modules/offices";

/** Each platform chosen in play: the rule's scores in the same instant. */
interface Chosen {
  readonly date: string;
  readonly personId: string;
  readonly positions: readonly string[];
  readonly scores: readonly PlatformScore[];
}
const chosen = new Map<string, Chosen>();
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
      const scores = real.platformScores(api, personId, party, positions);
      const key = chosenKey(api.state.date, personId, positions);
      chosen.set(key, {
        date: api.state.date,
        personId,
        positions: [...positions],
        scores,
      });
      return real.candidatePlatform(...args);
    },
  };
});

const seed = process.env.PLATFORM_PLAYED_SEED ?? randomBytes(8).toString("hex");
const MAX_DRAWS = 8;
const DAYS = 365;
/** Fewest candidates with a choice whose questions' support spans SPAN points for a total. */
const MIN_CANDIDATES = 20;
/** Fewest candidates whose platform's own questions differ in support, for the within-candidate total. */
const MIN_VARIED = 5;
/** The measure's unit: a candidate whose questions differ by less cannot show a 10-point difference. */
const SPAN = 10;
/** The research band per 10 points of support: exp(10 × 0.024) to exp(10 × 0.062). */
const BAND = { low: 0.27, high: 0.86 };

/** One platform the world recorded, read back on its day. */
interface Read {
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
}

const parse = (rows: readonly string[]) =>
  rows.map((row) => {
    const at = row.lastIndexOf("=");
    return { question: row.slice(0, at), position: Number(row.slice(at + 1)) };
  });

const spans = (r: Read) => {
  const supports = r.scores.map((s) => s.support);
  return (
    supports.length > 0 && Math.max(...supports) - Math.min(...supports) >= SPAN
  );
};

/** A candidate who left a question they hold a view on off their platform. */
const chose = (r: Read) => r.scores.length > r.platform.length;

/** A candidate the total can measure by: they chose, among questions 10 points apart or more. */
const measures = (r: Read) => chose(r) && spans(r);

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
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  // Officials of other places share ids between worlds; each year starts clean.
  chosen.clear();
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
      date: core.date,
      filingId: filing.id,
      contestId: contest.id,
      candidateId: filing.personId,
      local: level !== "state" && level !== "federal",
      record,
      platform,
      scores: choice.scores,
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

/** Each read platform is its candidate's top scores by the rule, at their own positions. */
function proveByRecord(where: string, reads: readonly Read[]): string[] {
  const slope = campaignParameter("platformSupportSlope");
  const lines: string[] = [];
  for (const r of reads) {
    const label = `${where}: ${r.record} of ${r.filingId} (candidate ${r.candidateId}) on ${r.date}`;
    // Every score is the rule's, from the conviction and support it records.
    for (const s of r.scores) {
      expect(s.conviction, `${label}: ${s.question}`).toBe(
        Math.abs(s.position),
      );
      expect(s.score, `${label}: ${s.question}`).toBeCloseTo(
        s.conviction * Math.exp(slope * s.support),
        12,
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
      // What the old rule (the strongest views, whatever the town thinks) ran on.
      const strongest = [...r.scores]
        .sort(
          (a, b) =>
            b.conviction - a.conviction || a.question.localeCompare(b.question),
        )
        .slice(0, r.platform.length);
      lines.push(
        `  ${r.record} ${r.filingId} candidate ${r.candidateId} on ${r.date}: ${top.map(row).join("; ")}; highest left off ${off ? row(off) : "none"}; the strongest views alone would have been ${strongest.map((s) => s.question).join(", ")}`,
      );
    }
  }
  return lines;
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

/**
 * Emphasis on support, per 10 points, among the questions each candidate
 * runs on, holding conviction fixed and comparing each candidate's questions
 * with each other: a Poisson log-linear fit with a term for each candidate
 * (the conditional fit, a multinomial logit of each platform's emphasis
 * shares on support and the log of conviction), by Newton's method.
 */
function withinPlatformPer10(reads: readonly Read[]): {
  per10: number;
  candidates: number;
} {
  const groups = reads.filter(varied).map((r) => {
    const on = onPlatform(r);
    const sum = on.reduce((t, s) => t + s.score, 0);
    return on.map((s) => ({
      y: s.score / sum,
      x: [s.support / 10, Math.log(s.conviction)] as const,
    }));
  });
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
    const d0 = (h[1]![1]! * g[0]! - h[0]![1]! * g[1]!) / det;
    const d1 = (h[0]![0]! * g[1]! - h[1]![0]! * g[0]!) / det;
    b[0]! += d0;
    b[1]! += d1;
    if (Math.abs(d0) + Math.abs(d1) < 1e-12) break;
  }
  return { per10: Math.exp(b[0]!) - 1, candidates: groups.length };
}

it("every contested local race's candidates run on their top questions by the rule, and emphasis rises with support inside the research band", () => {
  const tried: string[] = [];
  let proof: string[] | null = null;
  let pool: Read[] = [];
  let how = "";
  for (let draw = 0; draw < MAX_DRAWS; draw += 1) {
    const year = playYear(draw);
    // Every platform read is the rule's, contested or not.
    const lines = proveByRecord(year.where, year.reads);
    if (!proof) {
      if (!year.contested.length) {
        tried.push(
          `${year.where}: no contested local race recorded a platform in ${DAYS} days (${year.reads.length} platforms read)`,
        );
        continue;
      }
      proof = [
        `${year.where}: ${year.contested.length} platforms of contested local races (${year.reads.length} platforms in all) read by record, each its candidate's top scores at their own positions`,
        ...lines,
      ];
      if (year.contested.filter(measures).length >= MIN_CANDIDATES) {
        pool = year.contested;
        how = `the year's contested local races`;
        break;
      }
      pool = [...year.reads];
      how = `every platform the year's filings hold (its contested local races held ${year.contested.filter(measures).length} candidates with a choice whose questions' support spans ${SPAN} points, fewer than ${MIN_CANDIDATES})`;
    } else {
      pool.push(...year.reads);
      how += `, and ${year.where}'s year`;
    }
    if (
      pool.filter(measures).length >= MIN_CANDIDATES &&
      pool.filter(varied).length >= MIN_VARIED
    )
      break;
  }
  if (!proof)
    expect.fail(
      `no draw of ${MAX_DRAWS} held a contested local race:\n${tried.join("\n")}`,
    );
  const informative = pool.filter(measures).length;
  expect(
    informative,
    `the total over ${how} holds too few candidates with a choice whose questions' support spans ${SPAN} points`,
  ).toBeGreaterThanOrEqual(MIN_CANDIDATES);
  const counted = pool.filter(chose);
  const all = emphasisPer10(counted);
  const within = withinPlatformPer10(pool);
  expect(
    within.candidates,
    `the total over ${how} holds too few candidates whose platform's questions differ in support`,
  ).toBeGreaterThanOrEqual(MIN_VARIED);
  const slopeOf = (per10: number) => (Math.log(1 + per10) / 10).toFixed(4);
  const total = [
    `calibration over ${how}: ${pool.length} candidates, ${counted.length} with a choice (${informative} of them spanning ${SPAN} points); platformSupportSlope ${campaignParameter("platformSupportSlope")}, band +${100 * BAND.low}% to +${100 * BAND.high}% per 10 points`,
    `  among the questions each candidate runs on (${within.candidates} candidates whose platform's questions differ in support): emphasis +${(100 * within.per10).toFixed(0)}% per 10 points of support at fixed conviction, slope measured ${slopeOf(within.per10)} per point`,
    `  over every (candidate, question) pair of the candidates with a choice, silences included (${all.pairs} pairs): emphasis +${(100 * all.per10).toFixed(0)}% per 10 points of support at fixed conviction, slope measured ${slopeOf(all.per10)} per point`,
  ].join("\n");
  console.log([...proof, total].join("\n"));
  expect(within.per10, total).toBeGreaterThanOrEqual(BAND.low);
  expect(within.per10, total).toBeLessThanOrEqual(BAND.high);
  // Silence falls on the questions with less support.
  expect(all.per10, total).toBeGreaterThan(0);
}, 3_600_000);
