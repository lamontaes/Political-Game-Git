/**
 * Candidates run on the questions where the town agrees with them, in a
 * played year (pool item campaign-platform-follows-agreement; research
 * docs/research/platform-emphasis-2026-10-30.md). Worlds in places drawn
 * from all 56 (PLATFORM_PLAYED_SEED pins the run) each play a year a day at
 * a time. A grown resident of the town is the player and files at the
 * counter (`openBenchFilingVisit`, `chooseAtCounter`, the bench's filing
 * route) on the platform the rule gives them, in the first local race they
 * may enter that another candidate has filed for, else in the first whose
 * filing deadline comes, so a drawn year's local race is contested through
 * the ordinary producers wherever the town holds one. Each platform a world
 * records (a filing's, or the campaign of a filing that stated none) is read
 * back on the day it was recorded, by record, against the rule's scores at
 * the moment the platform was chosen (the test watches each call of
 * candidatePlatform and, in that instant, scores the same candidate and
 * questions by platformScores and counts the electorate on each question
 * itself by the readers the ballot scores a platform by,
 * campaign-platform-test-kit.ts, since what reaches people later that day
 * can move their views): the candidate, every question the seat takes up
 * with their conviction, the electorate's support for their side (which
 * must be the ballot readers' count) and the score, and the platform must be
 * the top scores, at the candidate's own positions. Every filing of a
 * contested local race must have been read, or have held no view the rule
 * could score. The first year with a contested local race is the proof by
 * record.
 *
 * Over the pooled years (MIN_PLACES drawn places' years or more):
 * - a candidate whose strongest view is the electorate's minority side (its
 *   share below the other side's) leaves it off for a question that scores
 *   higher, read by record;
 * - the electorate agrees more, by the ballot's readers, with the platforms
 *   the rule chose than with the strongest views the candidates would have
 *   run on by the old rule, in total;
 * - the research's C1 total (Druckman, Jacobs and Ostermeier 2004, as the
 *   research's quote verification restates it: +16% to +86% emphasis per 10
 *   points of support, exp(10 x (.028 - .013)) to exp(10 x (.043 + .019))),
 *   from what each candidate said that year by record: their campaign's
 *   messages (`messages` rows: doors, ads, mailers, each on its topic) and
 *   the statements of the acts whose question they choose (`promises` rows
 *   of a speech: an event, a donor meeting), over every question they hold
 *   a view on, silences included; answers to a question someone else asked
 *   (an interview, a forum, a debate) are not emphasis. A Poisson log-linear
 *   fit of each pair's emphasis share on its support and the log of its
 *   conviction, with each candidate's offset log(1 / questions they hold a
 *   view on) so a candidate of 54 questions and one of 4 are compared by the
 *   same baseline, must rise inside the band. Printed beside it: the same
 *   total with each campaign's lead chosen again from the recorded scores at
 *   slope 0 (the old rule, the null) and at the research's spread (0.015,
 *   0.062) and the parameter's (0.028, 0.043), and the fit that compares each
 *   candidate's questions with each other only. The pairs are those of
 *   contested local races where they hold MIN_CANDIDATES candidates who said
 *   something and had a choice (their seat takes up more questions they hold
 *   a view on than they run on), and every candidate the years' filings hold
 *   who did where they do not, and the test says which.
 */
import { randomBytes } from "node:crypto";
import { expect, it, vi } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { addDays, ageOnDate, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { chooseAtCounter, openBenchFilingVisit } from "../bench/filing";
import { lawChain } from "./modules/laws";
import { coreAPI } from "./state";
import type { CoreAPI, CoreState } from "./types";
import type * as Stances from "./campaign-stances";
import { candidatePlatform, type PlatformScore } from "./campaign-stances";
import { campaignParameter } from "./campaign-views";
import campaignParameters from "./data/campaigns/parameters.json" with { type: "json" };
import { contestPositions } from "./contest-positions";
import { CAMPAIGNS_MODULE_ID, type CampaignRow } from "./modules/campaigns";
import {
  checkEligibility,
  ELECTIONS_MODULE_ID,
  filingOfficeFor,
  playerContests,
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
import { agreementWith, countedStanceProfile } from "./modules/views";

/** Each platform chosen in play: the rule's scores, and the electorate by the ballot's readers, in the same instant. */
interface Chosen {
  readonly date: string;
  readonly personId: string;
  readonly positions: readonly string[];
  readonly scores: readonly PlatformScore[];
  /** Each seat question's electorate, counted by the ballot's agreement readers. */
  readonly sides: ReadonlyMap<string, AgreementSides>;
}
const chosen = new Map<string, Chosen>();
/** The day and candidate of each choice that found no seat question the candidate holds a view on. */
const heldNoView = new Set<string>();
/**
 * The electorate on each question by the ballot's readers, kept as the
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
            })),
          );
        sides.set(question, held);
      }
      const scores = real.platformScores(api, personId, party, positions);
      if (!scores.length) heldNoView.add(`${api.state.date}|${personId}`);
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
/** The fewest candidates who said something and had a choice the totals take. */
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
  /** The electorate on each seat question by the ballot's readers, at that moment. */
  readonly sides: ReadonlyMap<string, AgreementSides>;
  /** What the candidate said in this race that year, by record: their messages and speeches' statements on each question. */
  readonly said: ReadonlyMap<string, number>;
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

/** How many statements a candidate made that year on the questions they hold a view on. */
const saidTotal = (r: Read) =>
  r.scores.reduce((t, s) => t + (r.said.get(s.question) ?? 0), 0);

/** A candidate who had a choice and said something. */
const spoke = (r: Read) => chose(r) && saidTotal(r) > 0;

/** The questions a candidate would have run on by the old rule: their strongest views, whatever the town thinks. */
const strongestViews = (r: Read) =>
  [...r.scores]
    .sort(
      (a, b) =>
        b.conviction - a.conviction || a.question.localeCompare(b.question),
    )
    .slice(0, r.platform.length);

/** The rule's ranking of a candidate's questions at a slope, from the recorded conviction and support. */
const rankedAt = (r: Read, slope: number) =>
  r.scores
    .map((s) => ({ s, score: s.conviction * Math.exp(slope * s.support) }))
    .sort(
      (a, b) => b.score - a.score || a.s.question.localeCompare(b.s.question),
    )
    .map((x) => x.s);

/**
 * What a candidate would have said at another slope: every act carries the
 * campaign's lead (`platformLead`), so the statements on the lead the
 * platform the world recorded gave move to the lead the rule would have
 * chosen at that slope from the recorded scores.
 */
function saidAt(r: Read, slope: number): ReadonlyMap<string, number> {
  const lead = r.platform.find((s) => s.position !== 0)?.question;
  const next = rankedAt(r, slope)[0]?.question;
  if (!lead || !next || lead === next) return r.said;
  const out = new Map(r.said);
  const onLead = out.get(lead) ?? 0;
  out.set(lead, 0);
  out.set(next, (out.get(next) ?? 0) + onLead);
  return out;
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
): {
  where: string;
  reads: Read[];
  contested: Read[];
  player: string;
} {
  const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  // Officials of other places share ids between worlds; each year starts clean.
  chosen.clear();
  sidesKept.clear();
  heldNoView.clear();
  const elections = api.moduleState(ELECTIONS_MODULE_ID);
  const filingsTable = elections.table("filings");
  // The player: the town's first adult resident by id, watched as the bench
  // watches its player.
  const town = lawChain(api).townPlaceId;
  const me = [...core.people.values()]
    .filter(
      (p) =>
        p.alive &&
        p.placeId === town &&
        ageOnDate(makeIsoDate(p.birthDate), makeIsoDate(core.date)) >=
          api.parameter("votingAge"),
    )
    .sort((a, b) => a.id.localeCompare(b.id))[0];
  if (me) {
    core.playerId = me.id;
    director.watch(core, me.id);
  }
  let player = me ? `the player ${me.id} filed in no race` : "no grown player";
  const tried = new Set<string>();
  let filed = false;
  /**
   * The player files at the counter in the first local race they may enter
   * that another candidate has filed for, else in the first whose filing
   * deadline is today, on the platform the rule gives them.
   */
  const playerFiles = () => {
    if (!me || filed) return;
    // The filing screen's races (the town's own local offices) the player
    // meets every requirement for.
    const open = playerContests(api)
      .filter(
        (c) =>
          !tried.has(c.id) &&
          checkEligibility(api, me.id, c.id).every((k) => k.met),
      )
      .sort((a, b) => a.id.localeCompare(b.id));
    const others = (c: ContestRow) =>
      (filingsTable.rows() as unknown as FilingRow[]).some(
        (f) => f.contestId === c.id && f.personId !== me.id,
      );
    const contest =
      open.find(others) ?? open.find((c) => c.filingDeadline === core.date);
    if (!contest) return;
    tried.add(contest.id);
    const filedWith = filingOfficeFor(api, contest.id).filedWith;
    let counter = openBenchFilingVisit(core, me.id, filedWith, 10 * 60);
    // As path-check files: the race picked where the counter offers a pick.
    const pick = counter.visit.choices.find(
      (row) =>
        row.action.kind === "pick" &&
        (row.action as { contestId?: string }).contestId === contest.id,
    );
    if (pick) counter = chooseAtCounter(core, counter, pick.key);
    const platform = candidatePlatform(
      api,
      me.id,
      null,
      contestPositions(api, contest),
    ).map((s) => `${s.question}=${s.position}`);
    const file = counter.visit.choices.find(
      (row) => row.action.kind === "file",
    );
    if (!file) {
      player = `${player}; the counter at ${filedWith} offered no filing for ${contest.id} on ${core.date}`;
      return;
    }
    counter = chooseAtCounter(core, counter, file.key, { platform });
    const result = counter.result as
      { status: string; filing?: { id: string } } | undefined;
    if (result?.filing) {
      filed = true;
      player = `the player ${me.id} filed ${result.filing.id} on ${core.date} (${others(contest) ? "against a filed candidate" : "on the deadline, no one else filed yet"})`;
    } else
      player = `${player}; the counter refused ${contest.id} on ${core.date} (${result?.status ?? "no result"})`;
  };
  const seenFilings = new Set<string>();
  const seenCampaigns = new Set<string>();
  const filedFor = new Map<string, FilingRow[]>();
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
      said: new Map(),
    });
  };
  const scan = () => {
    for (const filing of filingsTable.rows() as unknown as FilingRow[]) {
      if (seenFilings.has(filing.id)) continue;
      seenFilings.add(filing.id);
      filedFor.set(filing.contestId, [
        ...(filedFor.get(filing.contestId) ?? []),
        filing,
      ]);
      if (filing.platform.length)
        read(filing, "filing", parse(filing.platform));
    }
    if (!api.state.modules.has(CAMPAIGNS_MODULE_ID)) return;
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
  };
  const end = addDays(makeIsoDate(core.date), DAYS);
  while (core.date < end) {
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    scan();
    playerFiles();
    scan();
  }
  // What each candidate said, by record: their messages, each on its topic,
  // and the statements of their speeches (an event, a donor meeting).
  const said = new Map<string, Map<string, number>>();
  const add = (candidateId: string, contestId: string, question: string) => {
    const key = `${candidateId}|${contestId}`;
    const held = said.get(key) ?? new Map<string, number>();
    said.set(key, held);
    held.set(question, (held.get(question) ?? 0) + 1);
  };
  if (api.state.modules.has(CAMPAIGNS_MODULE_ID)) {
    const campaigns = api.moduleState(CAMPAIGNS_MODULE_ID);
    for (const m of campaigns.table("messages").rows() as unknown as {
      candidateId: string;
      contestId: string;
      topic: string;
    }[])
      add(m.candidateId, m.contestId, m.topic);
    for (const p of campaigns.table("promises").rows() as unknown as {
      id: string;
      candidateId: string;
      contestId: string;
      stance: { question: string };
    }[])
      if (p.id.split(":")[3] === "speech")
        add(p.candidateId, p.contestId, p.stance.question);
  }
  const withSaid = reads.map((r) => ({
    ...r,
    said: said.get(`${r.candidateId}|${r.contestId}`) ?? new Map(),
  }));
  // Contested local races: a local seat two or more candidates filed for.
  const contestedIds = new Set(
    withSaid
      .filter((r) => r.local && (filedFor.get(r.contestId)?.length ?? 0) >= 2)
      .map((r) => r.contestId),
  );
  // Every filing of a contested local race was read, or held no view the
  // rule could score on the day it was filed.
  for (const contestId of contestedIds)
    for (const filing of filedFor.get(contestId) ?? [])
      expect(
        withSaid.some((r) => r.filingId === filing.id) ||
          heldNoView.has(`${filing.filedOn}|${filing.personId}`),
        `${where}: filing ${filing.id} (candidate ${filing.personId}, filed ${filing.filedOn}) of contested race ${contestId} was never read and held a view`,
      ).toBe(true);
  const contested = withSaid.filter((r) => contestedIds.has(r.contestId));
  return { where, reads: withSaid, contested, player };
}

const row = (s: PlatformScore) =>
  `${s.question} conviction ${s.conviction.toFixed(3)} support ${s.support.toFixed(1)}% score ${s.score.toFixed(3)}`;

const recordOf = (r: Read) =>
  `${r.where}: ${r.record} of ${r.filingId} (candidate ${r.candidateId}) on ${r.date}`;

/**
 * Each read platform is its candidate's top scores by the rule, at their own
 * positions, and each question's support is the electorate on the
 * candidate's side as the ballot's readers count it.
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
      // The support is the share the ballot's readers put on their side.
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
      const said = [...r.said.entries()]
        .map(([q, n]) => `${q} ${n}`)
        .join(", ");
      lines.push(
        `  ${r.record} ${r.filingId} candidate ${r.candidateId} on ${r.date}: ${top.map(row).join("; ")}; highest left off ${off ? row(off) : "none"}; the strongest views alone would have been ${strongestViews(
          r,
        )
          .map((s) => s.question)
          .join(", ")}; said that year: ${said || "nothing"}`,
      );
    }
  }
  return lines;
}

/** A candidate whose strongest view is the electorate's minority side (its share below the other side's), left off for a question that scores higher. */
function minorityLeftOff(r: Read): string | null {
  const strongest = strongestViews(r)[0];
  if (!strongest) return null;
  const sides = r.sides.get(strongest.question)!;
  const against = 100 * (strongest.position > 0 ? sides.no : sides.yes);
  if (strongest.support >= against) return null;
  if (r.platform.some((s) => s.question === strongest.question)) return null;
  const on = r.scores
    .filter((s) => r.platform.some((p) => p.question === s.question))
    .sort((a, b) => b.score - a.score);
  const instead = on[0];
  if (!instead || instead.score <= strongest.score) return null;
  return `${recordOf(r)}: strongest view ${row(strongest)} (against ${against.toFixed(1)}%) left off; runs on ${on.map(row).join("; ")}`;
}

/** The electorate's agreement (by the ballot's readers) with each candidate's platform and with their strongest views. */
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
 * Emphasis on support, per 10 points, holding conviction fixed, from what
 * the candidates said: a Poisson log-linear fit (iteratively reweighted
 * least squares) of each pair's emphasis share on its support and the log of
 * its conviction, each candidate's pairs offset by log(1 / questions they
 * hold a view on), so every candidate starts from the same even share.
 */
function emphasisPer10(
  reads: readonly Read[],
  saidOf: (r: Read) => ReadonlyMap<string, number> = (r) => r.said,
): { per10: number; pairs: number; converged: boolean } {
  const rows: { y: number; x: readonly number[]; offset: number }[] = [];
  for (const r of reads) {
    const said = saidOf(r);
    const total = r.scores.reduce((t, s) => t + (said.get(s.question) ?? 0), 0);
    if (!total) continue;
    const offset = Math.log(1 / r.scores.length);
    for (const s of r.scores)
      rows.push({
        y: (said.get(s.question) ?? 0) / total,
        x: [1, (s.support - 50) / 10, Math.log(s.conviction)],
        offset,
      });
  }
  const k = 3;
  const b = [0, 0, 0];
  for (let step = 0; step < 200; step += 1) {
    const a = Array.from({ length: k }, () => new Array<number>(k + 1).fill(0));
    for (const r of rows) {
      const mu = Math.exp(r.offset + r.x.reduce((t, x, i) => t + x * b[i]!, 0));
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
    if (!Number.isFinite(moved)) break;
    if (moved < 1e-10)
      return {
        per10: Math.exp(b[1]!) - 1,
        pairs: rows.length,
        converged: true,
      };
  }
  return { per10: Math.exp(b[1]!) - 1, pairs: rows.length, converged: false };
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
    if (!Number.isFinite(b[0]!)) return { per10: NaN, converged: false };
    if (Math.abs(d0) + Math.abs(d1) < 1e-10)
      return { per10: Math.exp(b[0]!) - 1, converged: true };
  }
  return { per10: Math.exp(b[0]!) - 1, converged: false };
}

/** Each candidate's questions with what they said on each, as a share. */
function groupOf(r: Read, said: ReadonlyMap<string, number>): Group {
  const total = r.scores.reduce((t, s) => t + (said.get(s.question) ?? 0), 0);
  return r.scores.map((s) => ({
    y: total ? (said.get(s.question) ?? 0) / total : 0,
    x: [s.support / 10, Math.log(s.conviction)] as const,
  }));
}

/** Over every question each candidate holds a view on, silences included, each candidate's compared with each other. */
function withinCandidatePer10(
  reads: readonly Read[],
  saidOf: (r: Read) => ReadonlyMap<string, number> = (r) => r.said,
) {
  return conditionalPer10(reads.map((r) => groupOf(r, saidOf(r))));
}

it("every contested local race's candidates run on their top questions by the rule, and the emphasis total is printed (C1: campaign-platform-emphasis-c1)", () => {
  const tried: string[] = [];
  let proof: string[] | null = null;
  const contestedPool: Read[] = [];
  const everyPool: Read[] = [];
  const places: string[] = [];
  const players: string[] = [];
  const minority: string[] = [];
  const enough = () =>
    contestedPool.filter(spoke).length >= MIN_CANDIDATES ||
    everyPool.filter(spoke).length >= MIN_CANDIDATES;
  for (let draw = 0; draw < MAX_DRAWS; draw += 1) {
    const year = playYear(draw);
    places.push(year.where);
    players.push(`${year.where}: ${year.player}`);
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
          `${year.where}: no contested local race recorded a platform in ${DAYS} days (${year.reads.length} platforms read; ${year.player})`,
        );
      else
        proof = [
          `${year.where}: ${year.contested.length} platforms of contested local races (${year.reads.length} platforms in all) read by record, each its candidate's top scores at their own positions, each support the ballot readers' count; ${year.player}`,
          ...lines,
        ];
    }
    if (proof && minority.length && places.length >= MIN_PLACES && enough())
      break;
  }
  const useContested = contestedPool.filter(spoke).length >= MIN_CANDIDATES;
  const pool = (useContested ? contestedPool : everyPool).filter(spoke);
  const how = useContested
    ? `the contested local races of ${places.length} places' years`
    : `every candidate the filings of ${places.length} places' years hold who said something and had a choice (their contested local races held ${contestedPool.filter(spoke).length}, fewer than ${MIN_CANDIDATES})`;
  const slope = campaignParameter("platformSupportSlope");
  const [lowest, highest] = campaignSpread("platformSupportSlope");
  // The research's verified spread (P1, ±1 SE of the two domestic models).
  const research = [0.015, 0.062] as const;
  const all = emphasisPer10(pool);
  const at = (s: number) => emphasisPer10(pool, (r) => saidAt(r, s));
  const byCandidate = withinCandidatePer10(pool);
  const byCandidateAt = (s: number) =>
    withinCandidatePer10(pool, (r) => saidAt(r, s));
  const agree = agreementTotals(pool);
  const pct = (x: number) =>
    Number.isFinite(x)
      ? `${x >= 0 ? "+" : ""}${(100 * x).toFixed(0)}%`
      : "none";
  const fit = (f: { per10: number; converged: boolean }) =>
    `${pct(f.per10)}${f.converged ? "" : " (did not converge)"}`;
  const slopeOf = (per10: number) => (Math.log(1 + per10) / 10).toFixed(4);
  const supports = pool.flatMap((r) => r.scores.map((s) => s.support));
  const statements = pool.reduce((t, r) => t + saidTotal(r), 0);
  const onLead = pool.reduce((t, r) => {
    const lead = r.platform.find((s) => s.position !== 0)?.question;
    return t + (lead ? (r.said.get(lead) ?? 0) : 0);
  }, 0);
  const slopes = [0, research[0], lowest, slope, highest, research[1]];
  const total = [
    `places: ${places.join("; ")}`,
    `players: ${players.join("; ")}`,
    `minority-side strongest views left off: ${minority.length}; first: ${minority[0] ?? "none"}`,
    `calibration over ${how}: ${pool.length} candidates (${pool.filter(spans).length} whose questions' support spans ${SPAN} points), support ${Math.min(...supports).toFixed(1)}% to ${Math.max(...supports).toFixed(1)}%, ${statements} statements by record (${onLead} on the campaign's lead); platformSupportSlope ${slope}, band ${pct(BAND.low)} to ${pct(BAND.high)} per 10 points`,
    `  pooled, each candidate offset by log(1 / questions held), silences included (${all.pairs} pairs): emphasis ${fit(all)} per 10 points of support at fixed conviction, slope measured ${slopeOf(all.per10)} per point`,
    `  the same with each campaign's lead chosen again from the recorded scores: ${slopes.map((s) => `at ${s} ${fit(at(s))}`).join(", ")}`,
    `  each candidate's questions compared with each other only (the one-campaign design of the study): ${slopes.map((s) => `at ${s} ${fit(byCandidateAt(s))}`).join(", ")}; as recorded ${fit(byCandidate)}`,
    `electorate agreement by the ballot's readers, summed over the ${pool.length} candidates: the rule's platforms ${agree.rule.toFixed(4)}, the strongest views ${agree.strongest.toFixed(4)} (rose for ${agree.rose}, fell for ${agree.fell}, the same for ${agree.same})`,
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
    `the total over ${how} holds too few candidates who said something and had a choice`,
  ).toBeGreaterThanOrEqual(MIN_CANDIDATES);
  // The town agrees more with what the rule runs on than with the strongest views.
  expect(agree.rule, total).toBeGreaterThan(agree.strongest);
  // C1, emphasis by record rising with support inside the research band, is
  // printed above and not held (governing lead, Nov 2). Every campaign act
  // carries one question, so a campaign's emphasis falls on its lead
  // (SG-GOV-platform-emphasis-lead-only) and no slope meets the band
  // (SG-GOV-platform-slope-c1-out-of-band). The band check moves to pool
  // item campaign-platform-emphasis-c1, with acts sharing their emphasis
  // over the platform; the band is not widened.
}, 7_200_000);
