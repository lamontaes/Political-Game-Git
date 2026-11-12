/**
 * Personality in campaigns and candidacy: volunteering, giving, endorsing,
 * opening the door, running for office, standing again, answering a poll,
 * retelling a campaign story, holding a party's line and accepting an
 * interview. One played slice of a drawn place that holds a race in 2025
 * (built the way the game builds it, every module installed), with the
 * trait probe on. For each decision the test meets every kept reason total
 * with every kept trait lean through the shipped formula and weight, and
 * checks that people leaning most toward the option differ from those leaning
 * least at about the researched rate (data/research/trait-effect-sizes.json),
 * which fails when the trait weight is flat (zero).
 */
import { randomBytes } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import research from "../../../data/research/trait-effect-sizes.json" with { type: "json" };
import { buildBenchWorld } from "../../bench/world";
import { gameStartDate } from "../game-start";
import { addDays, makeIsoDate } from "../kernel/dates";
import { advanceCore } from "../life";
import { coreAPI } from "../state";
import {
  decisionLean,
  decisionTraitWeight,
  leanedScore,
} from "../trait-decisions";
import { setTraitProbe } from "../trait-probe";
import type { CoreState } from "../types";
import { keepsWhy } from "../why-kept";
import { drawPlace } from "../../../tests/golden-path/place";
import {
  answerPollReason,
  volunteerReason,
  reachablePeople,
  CAMPAIGNS_MODULE_ID,
  type CampaignRow,
  type CauseRow,
  type CauseSummaryRow,
  type EndorsementRow,
} from "./campaigns";
import { standAgainReason } from "./candidacy";
import { ELECTIONS_MODULE_ID, type ContestRow } from "./elections";
import { partyFirmness } from "../campaign-stances";

/** A drawn place from all 56; up to MAX_PLAYED draws are tried before the test fails. */
const BASE_SEED =
  process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
/** Played windows tried before the test fails. */
const MAX_PLAYED = 4;
/** Days the window runs past the race, so the count and the losers' scenes are in it. */
const AFTER_RACE = 10;
/** The yes share the volunteering slope is read at (see its test). */
const VOLUNTEER_SHARE = 0.05;
const DAYS = 150;

interface Row {
  bare: number;
  lean: number;
}
const formula = new Map<string, Row[]>();
const chooser: Row[] = [];
let core: CoreState;
let played: Played;
let placeName = "";

/** Every adult each campaign can reach: their reasons to volunteer and their lean toward it. */
function volunteerRows(): Row[] {
  const api = coreAPI(core);
  const campaigns = api
    .moduleState(CAMPAIGNS_MODULE_ID)
    .table("campaigns")
    .rows() as unknown as CampaignRow[];
  const year = Number(api.state.date.slice(0, 4));
  const rows: Row[] = [];
  for (const campaign of campaigns)
    for (const p of reachablePeople(api, campaign).flatMap(
      (id) => core.people.get(id) ?? [],
    )) {
      if (
        !p.alive ||
        p.id === campaign.candidateId ||
        year - Number(p.birthDate.slice(0, 4)) < 18
      )
        continue;
      rows.push({
        bare: volunteerReason(api, campaign, p),
        lean: decisionLean(
          core,
          p,
          "campaigns.volunteer",
          "volunteer",
          "decline",
        ),
      });
    }
  return rows;
}

/** An endorsement a voter heard while its race was open: the cause row the campaigns engine keeps for it, naming its endorser. */
interface HeardEndorsement {
  readonly id: string;
  readonly voterId: string;
  readonly candidateId: string;
  readonly actorId: string;
}

/** One answer to a candidate's ask for an endorsement, as the endorsement record holds it. */
type Answer = Pick<
  EndorsementRow,
  "id" | "candidateId" | "speakerId" | "answer" | "reached"
>;

/**
 * The campaigns engine's endorsement records on one day (`readDay`). A race's
 * causes fold when its count is in (`foldClosedRaceCauses`): every folded
 * cause is counted into the voter's summary for the candidate
 * (`causeSummaries`, which names no endorser), and a cause that a known fact
 * or a pledge names as its source is also copied to `foldedCauses`. So the
 * cause rows that name an endorser exist only until their race's count, and
 * this test reads them before it (CTO ruling, Oct 30 08:41, in
 * OWNER-DECISIONS: the test's checks move "to before the race closes"): on
 * the eve of the first count and on the window's last day, when races still to
 * be counted hold theirs.
 */
interface Day {
  readonly date: string;
  /** Every endorsement cause the engine holds that day. */
  readonly heard: readonly HeardEndorsement[];
  /** Everyone a candidate asked to endorse (a person's own word, not a group's), as they had answered. */
  readonly asked: readonly Answer[];
  /** The circle each endorser who said yes reached (their known people and family), by endorser. */
  readonly circles: ReadonlyMap<string, ReadonlySet<string>>;
}

/** A played window: the eve of its first race's count, its last day, and the listeners the engine kept a why for across it. */
interface Played {
  readonly eve: Day;
  readonly end: Day;
  /** The yes answers' listeners (living, and not the candidate) whose why the engine kept on the day they were asked (`keepsWhy`: the player's circle that day). */
  readonly keptWhys: number;
  /**
   * Every person a candidate asked to endorse across the window, as read on
   * the days the asks were on record: a race's close may drop its endorsement
   * rows, so nothing after the window reads the table.
   */
  readonly asked: readonly EndorsementRow[];
}

/** Who hears an endorser: their known people and family; nobody for a person no longer on record. */
function circleOf(world: CoreState, id: string): ReadonlySet<string> {
  const person = world.people.get(id);
  return new Set(person ? [...person.knownIds, ...person.familyIds] : []);
}

/**
 * The listeners of the yes answers given since `counted` whose why the
 * engine keeps today (`keepsWhy`), the way it decides when it records the
 * cause. The player's circle grows through the window, so this is read on the
 * day each answer is given, not later.
 */
function keptWhysOfNewYes(
  world: CoreState,
  counted: Set<string>,
  asked: Map<string, EndorsementRow>,
): number {
  const rows = coreAPI(world)
    .moduleState(CAMPAIGNS_MODULE_ID)
    .table("endorsements")
    .rows() as unknown as EndorsementRow[];
  let kept = 0;
  for (const row of rows) {
    if (row.organizationId !== null) continue;
    // Each person's ask as the record holds it while it is on record.
    asked.set(row.id, row);
    if (row.answer !== "yes") continue;
    if (counted.has(row.id)) continue;
    counted.add(row.id);
    for (const id of circleOf(world, row.speakerId))
      if (
        world.people.get(id)?.alive &&
        id !== row.candidateId &&
        keepsWhy(world, id, row.candidateId)
      )
        kept += 1;
  }
  return kept;
}

/** Reads the endorsement causes, answers and circles as the world holds them today. */
function readDay(world: CoreState): Day {
  const state = coreAPI(world).moduleState(CAMPAIGNS_MODULE_ID);
  const heard = (state.table("causes").rows() as unknown as CauseRow[])
    .filter((cause) => cause.act === "endorsement")
    .map(({ id, voterId, candidateId, actorId }) => ({
      id,
      voterId,
      candidateId,
      actorId,
    }));
  const asked = (
    state.table("endorsements").rows() as unknown as EndorsementRow[]
  )
    .filter((row) => row.organizationId === null)
    .map(({ id, candidateId, speakerId, answer, reached }) => ({
      id,
      candidateId,
      speakerId,
      answer,
      reached,
    }));
  const circles = new Map<string, ReadonlySet<string>>();
  for (const row of asked)
    if (row.answer === "yes")
      circles.set(row.speakerId, circleOf(world, row.speakerId));
  return { date: world.date, heard, asked, circles };
}

/** Every endorsement heard that a cause row still names, with the day it was read on (the eve's first; a cause read on both days once). */
function endorsementsHeard(
  played: Played,
): { readonly day: Day; readonly cause: HeardEndorsement }[] {
  const onEve = new Set(played.eve.heard.map((cause) => cause.id));
  return [
    ...played.eve.heard.map((cause) => ({ day: played.eve, cause })),
    ...played.end.heard
      .filter((cause) => !onEve.has(cause.id))
      .map((cause) => ({ day: played.end, cause })),
  ];
}

/** How the asks went, in words for a failure or a skipped draw. */
function describeAsks(played: Played): string {
  const asked = played.asked;
  const yes = asked.filter((row) => row.answer === "yes");
  const reached = yes.reduce((sum, row) => sum + row.reached, 0);
  return `${asked.length} asked to endorse, ${yes.length} said yes and reached listeners ${reached} times, ${played.keptWhys} of them with a kept why on the day asked`;
}

/**
 * Why a draw has no endorsement heard to read that is the draw's doing, not
 * the engine's, or null. A why is kept only for the player's circle
 * (`keepsWhy`), so a draw is passed over only when people were asked and
 * either none said yes or the yes answers reached listeners of whom none has
 * a kept why. No one asked, or yes answers that reached no one or whose
 * kept-why listeners have no cause, are the engine's defects and fail the
 * case.
 */
function noEndorsementToRead(played: Played): string | null {
  const asked = played.asked;
  if (endorsementsHeard(played).length > 0 || asked.length === 0) return null;
  const yes = asked.filter((row) => row.answer === "yes");
  if (yes.length === 0)
    return `endorsements: ${describeAsks(played)}, nobody said yes`;
  if (yes.some((row) => row.reached > 0) && played.keptWhys === 0)
    return `endorsements: ${describeAsks(played)}, none in the player's circle`;
  return null;
}

/**
 * What the played window lacks for the tests to read: enough calls of each
 * played decision, and for giving and answering the door at least one call
 * temperament turns (someone near enough to the line for it to matter).
 * Running for office is read for calls only: at the study's small size (an
 * odds ratio of 1.21 between thirds) temperament tips about one newcomer a
 * year in a town (1, 1, 2 and 0 in the four election years its weight was
 * fitted on), so half a year often holds none; its slope is read below.
 * And an endorsement heard whose why is kept, unless the engine is at fault
 * (`noEndorsementToRead`).
 */
function windowGaps(world: CoreState, slice: Played): string[] {
  const gaps: string[] = [];
  const reached = volunteerRows().length;
  if (reached <= 50) gaps.push(`campaigns reached ${reached} adults`);
  const read: [string, readonly Row[]][] = [
    ["campaigns.donate", formula.get("campaigns.donate") ?? []],
    ["campaigns.open-door", formula.get("campaigns.open-door") ?? []],
    ["candidacy.run", chooser],
  ];
  for (const [id, rows] of read) {
    const w = decisionTraitWeight(world, id);
    const turned = rows.filter(
      (r) => r.bare + w * r.lean > 0 !== r.bare > 0,
    ).length;
    if (rows.length <= 50 || (turned === 0 && id !== "candidacy.run"))
      gaps.push(`${id}: ${rows.length} calls, ${turned} turned by temperament`);
  }
  const endorsements = noEndorsementToRead(slice);
  if (endorsements) gaps.push(endorsements);
  return gaps;
}

/**
 * Plays a drawn world for the window with the probe on, keeping every formula
 * and run-for-office call. It reads the endorsement records on `eveDate`, the
 * day before the first race's count, and on `last`; a day at a time, so each
 * yes answer's kept whys are counted on the day it is given.
 */
function play(world: CoreState, eveDate: string, last: string): Played {
  formula.clear();
  chooser.length = 0;
  setTraitProbe({
    formula(row) {
      if (row.bare === undefined) return;
      const list = formula.get(row.decisionId) ?? [];
      list.push({ bare: row.bare, lean: row.lean });
      formula.set(row.decisionId, list);
    },
    chooser(row) {
      const run = row.actionIds.indexOf("candidacy-run");
      const stay = row.actionIds.indexOf("candidacy-stay-out");
      if (run < 0 || stay < 0) return;
      chooser.push({
        bare: row.bareScores[run]! - row.bareScores[stay]!,
        lean: row.leans[run]! - row.leans[stay]!,
      });
    },
  });
  try {
    const counted = new Set<string>();
    const asked = new Map<string, EndorsementRow>();
    let keptWhys = 0;
    const playTo = (through: string) => {
      while (world.date < through) {
        advanceCore(world, addDays(makeIsoDate(world.date), 1));
        keptWhys += keptWhysOfNewYes(world, counted, asked);
      }
    };
    playTo(eveDate);
    const eve = readDay(world);
    playTo(last);
    return {
      eve,
      end: readDay(world),
      keptWhys,
      asked: [...asked.values()].sort((a, b) => a.id.localeCompare(b.id)),
    };
  } finally {
    setTraitProbe(undefined);
  }
}

beforeAll(() => {
  const opening = gameStartDate();
  const tried: string[] = [];
  // A drawn place from all 56, played over the window that ends just after
  // its own next race (read from the place's election calendar), and whose
  // campaigns reach enough people to read volunteering from.
  for (let i = 0; i < MAX_PLAYED; i++) {
    const seed = `${BASE_SEED}:${i}`;
    const place = drawPlace(seed, "campaign-traits");
    const calendar = coreAPI(
      buildBenchWorld(seed, opening, { twoLevel: true, placeKey: place.key })
        .core,
    )
      .moduleState(ELECTIONS_MODULE_ID)
      .table("contests")
      .rows() as unknown as ContestRow[];
    const next = calendar
      .map((c) => c.electionDate)
      .filter((date) => date > opening)
      .sort()[0];
    const name = `${place.name} (${place.key}), seed ${seed}`;
    if (!next) {
      tried.push(`${name}: no race on its calendar`);
      continue;
    }
    const from = new Date(`${next}T00:00:00Z`);
    from.setUTCDate(from.getUTCDate() - DAYS + AFTER_RACE);
    const start = [opening, from.toISOString().slice(0, 10)].sort().at(-1)!;
    const end = new Date(`${start}T00:00:00Z`);
    end.setUTCDate(end.getUTCDate() + DAYS);
    const world = buildBenchWorld(seed, start, {
      twoLevel: true,
      placeKey: place.key,
    }).core;
    // The eve of the race is the last day its causes are still rows.
    const slice = play(
      world,
      addDays(makeIsoDate(next), -1),
      end.toISOString().slice(0, 10),
    );
    core = world;
    played = slice;
    placeName = `${name}, race ${next}, played from ${start}`;
    const missing = windowGaps(world, slice);
    if (missing.length === 0) return;
    tried.push(`${placeName}: ${missing.join(", ")}`);
    console.log(`Passed over ${placeName}: ${missing.join(", ")}`);
  }
  throw new Error(
    `No drawn place's race gave every decision enough calls (base seed ${BASE_SEED}): ${tried.join("; ")}`,
  );
  // Reason for the hook's time: each try builds its town twice (7 to 20 seconds each) and plays 150 days (20 to 60 more), up to 4 tries.
}, 900_000);

// The researched log odds between the top and bottom thirds of lean (the calibration's conversion).
const THIRDS_APART = 2.18;
const swing = (s: number) => {
  const at = (p: number) => Math.log(p / (1 - p));
  return at(0.5 + s / 2) - at(0.5 - s / 2);
};
function targetOddsRatio(id: string): number {
  let best = 0;
  for (const row of research.rows as {
    id: string;
    effect: { kind: string; value: number; traitSd?: number } | null;
  }[]) {
    if (row.id !== id || !row.effect) continue;
    const e = row.effect;
    // A trait scored over its full range converts with its own standard
    // deviation from the study's table, as the calibration script does.
    const sd = e.traitSd ?? 0;
    const log =
      e.kind === "logit-coef-full-range"
        ? e.value * sd * THIRDS_APART
        : e.kind === "pp-full-range"
          ? swing(e.value) * sd * THIRDS_APART
          : e.kind === "pp-per-iqr"
            ? (swing(e.value) / 1.35) * THIRDS_APART
            : 0;
    best = Math.max(best, Math.abs(log));
  }
  return Math.exp(best);
}

/** Odds ratio of saying yes between the thirds of lean, every reason total met with every lean at weight `w`. */
function crossOdds(rows: readonly Row[], w: number, shift = 0): number {
  const bares = rows.map((r) => r.bare).sort((a, b) => a - b);
  const leans = rows.map((r) => r.lean).sort((a, b) => a - b);
  const third = Math.floor(leans.length / 3);
  const yes = (lean: number) => {
    let lo = 0;
    let hi = bares.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (bares[mid]! + shift + w * lean > 0) hi = mid;
      else lo = mid + 1;
    }
    return (bares.length - lo) / bares.length;
  };
  const rate = (part: number[]) => {
    const p = part.reduce((a, l) => a + yes(l), 0) / part.length;
    return Math.min(0.999, Math.max(0.0005, p));
  };
  const odds = (p: number) => p / (1 - p);
  return (
    odds(rate(leans.slice(leans.length - third))) /
    odds(rate(leans.slice(0, third)))
  );
}

/** The shift of every reason total at which `share` of the calls say yes at weight `w`. */
function shiftForShare(rows: readonly Row[], w: number, share: number): number {
  const totals = rows.map((r) => r.bare + w * r.lean).sort((a, b) => b - a);
  const at = Math.min(totals.length - 1, Math.floor(totals.length * share));
  return -totals[at]!;
}

/**
 * About the researched size, in a one-place slice of a calibration made over
 * four: drawn towns so far reach up to 1.9 times the study's odds ratio
 * (South Fulton, Georgia, retelling), so the band is a factor of 2.2 either
 * way; flat personality gives exactly 1.
 */
const ONE_TOWN_SLACK = 2.2;
/** Expects the calls to show about the researched size, and none with personality flat. */
function expectAboutResearch(
  id: string,
  rows: readonly Row[],
  w: number,
  slack = ONE_TOWN_SLACK,
  share?: number,
) {
  const target = targetOddsRatio(id);
  const at = (weight: number) =>
    share === undefined ? 0 : shiftForShare(rows, weight, share);
  const reached = crossOdds(rows, w, at(w));
  expect(rows.length, `${placeName}: ${id} calls`).toBeGreaterThan(50);
  expect(
    reached,
    `${placeName}: ${id} odds ratio, target ${target.toFixed(2)}`,
  ).toBeGreaterThan(Math.max(1.05, target / slack));
  expect(
    reached,
    `${placeName}: ${id} odds ratio, target ${target.toFixed(2)}`,
  ).toBeLessThan(target * slack);
  // Personality is the cause: with the weight flat the same calls show no gap.
  expect(crossOdds(rows, 0, at(0))).toBeCloseTo(1, 5);
}

describe("personality in campaigns and candidacy (a played slice of a drawn place)", () => {
  it("volunteering leans toward the more open, read at a fixed share saying yes", () => {
    // Most people a campaign reaches share one reason total (no warmth, tie or
    // work hours yet), so where the line falls in that pile temperament alone
    // sorts them and the odds ratio swings from about 1 to over 30 by town; the
    // researched size waits on the choice reading more of each person's own
    // circumstances (trait-decision-gaps.json, campaigns.volunteer). The slope
    // is read with every reason total moved so one in twenty says yes.
    const rows = volunteerRows();
    const w = decisionTraitWeight(core, "campaigns.volunteer");
    const reached = crossOdds(rows, w, shiftForShare(rows, w, VOLUNTEER_SHARE));
    console.log(
      `${placeName}: volunteering at a ${VOLUNTEER_SHARE} yes share, ${rows.length} calls, odds ratio ${reached.toFixed(2)} against the study's ${targetOddsRatio("campaigns.volunteer").toFixed(2)}`,
    );
    expect(reached).toBeGreaterThan(1.05);
    expect(
      crossOdds(rows, 0, shiftForShare(rows, 0, VOLUNTEER_SHARE)),
    ).toBeCloseTo(1, 5);
  });

  it("giving follows openness at about the researched rate", () => {
    expectAboutResearch(
      "campaigns.donate",
      formula.get("campaigns.donate") ?? [],
      decisionTraitWeight(core, "campaigns.donate"),
    );
  });

  it("answering the door follows extraversion at about the researched rate", () => {
    expectAboutResearch(
      "campaigns.open-door",
      formula.get("campaigns.open-door") ?? [],
      decisionTraitWeight(core, "campaigns.open-door"),
    );
  });

  it("running for office follows honesty-humility at about the researched rate, among newcomers", () => {
    // A serving incumbent weighs standing again (voting.stand-again), so only
    // newcomers weigh running here, and so few of them run that the thirds'
    // rates would sit at the floor; the slope is read with every reason total
    // moved so one in twenty would run, as volunteering is read.
    expectAboutResearch(
      "candidacy.run",
      chooser,
      decisionTraitWeight(core, "candidacy.run"),
      ONE_TOWN_SLACK,
      VOLUNTEER_SHARE,
    );
  });

  it("answering a pollster follows the researched rate across the town's adults", () => {
    const api = coreAPI(core);
    const rows: Row[] = [];
    for (const p of core.people.values()) {
      if (
        !p.alive ||
        Number(api.state.date.slice(0, 4)) - Number(p.birthDate.slice(0, 4)) <
          18
      )
        continue;
      rows.push({
        bare: answerPollReason(p, api.state.date),
        lean: decisionLean(
          core,
          p,
          "campaigns.answer-poll",
          "answer",
          "no-opinion",
        ),
      });
    }
    expectAboutResearch(
      "campaigns.answer-poll",
      rows,
      decisionTraitWeight(core, "campaigns.answer-poll"),
    );
  });

  it("an incumbent's decision to stand again follows age and a small trait lean, and most stand", () => {
    const api = coreAPI(core);
    const rows: Row[] = [];
    for (const p of core.people.values()) {
      const age =
        Number(api.state.date.slice(0, 4)) - Number(p.birthDate.slice(0, 4));
      if (!p.alive || age < 30 || age > 85) continue;
      rows.push({
        bare: standAgainReason(api, p),
        lean: decisionLean(core, p, "voting.stand-again", "stand", "retire"),
      });
    }
    expectAboutResearch(
      "voting.stand-again",
      rows,
      decisionTraitWeight(core, "voting.stand-again"),
    );
    const share =
      rows.filter(
        (r) =>
          r.bare + decisionTraitWeight(core, "voting.stand-again") * r.lean > 0,
      ).length / rows.length;
    // About 81 percent of local incumbents seek reelection.
    expect(share).toBeGreaterThan(0.7);
    expect(share).toBeLessThan(0.92);
  });

  it("a retelling reaches further from the teller whose traits lean toward telling", () => {
    const people = [...core.people.values()].filter((p) => p.alive);
    const mult = (p: (typeof people)[number]) =>
      Math.max(0, leanedScore(core, p, "campaigns.retell", "tell", "keep", 1));
    const sorted = people
      .map((p) => ({
        p,
        lean: decisionLean(core, p, "campaigns.retell", "tell", "keep"),
      }))
      .sort((a, b) => a.lean - b.lean);
    const third = Math.floor(sorted.length / 3);
    const mean = (part: typeof sorted) =>
      part.reduce((a, r) => a + mult(r.p), 0) / part.length;
    const ratio =
      mean(sorted.slice(sorted.length - third)) / mean(sorted.slice(0, third));
    const target = targetOddsRatio("campaigns.retell");
    expect(
      ratio,
      `${placeName}: retell reach ratio, target ${target.toFixed(2)}`,
    ).toBeGreaterThan(Math.max(1.05, target / ONE_TOWN_SLACK));
    expect(ratio).toBeLessThan(target * ONE_TOWN_SLACK);
  });

  it("a candidate's hold on a party's line differs between opposite traits in the same tie", () => {
    const api = coreAPI(core);
    const people = [...core.people.values()].filter((p) => p.alive);
    const sorted = people
      .map((p) => ({
        p,
        lean: decisionLean(
          core,
          p,
          "campaigns.party-firmness",
          "join",
          "stay-out",
        ),
      }))
      .sort((a, b) => a.lean - b.lean);
    const third = Math.floor(sorted.length / 3);
    const mean = (part: typeof sorted) =>
      part.reduce((a, r) => a + partyFirmness(api, r.p.id), 0) / part.length;
    const firm = mean(sorted.slice(sorted.length - third));
    const loose = mean(sorted.slice(0, third));
    expect(
      firm,
      `${placeName}: firmness of the most-joining third against the least`,
    ).toBeGreaterThan(loose + 0.05);
  });

  it("candidates ask for volunteers and endorsements, and the answers are on the campaign's record", () => {
    const api = coreAPI(core);
    const campaigns = api
      .moduleState(CAMPAIGNS_MODULE_ID)
      .table("campaigns")
      .rows() as unknown as CampaignRow[];
    expect(campaigns.length, placeName).toBeGreaterThan(0);
    // The endorsement record is the one list of who was asked and who said
    // yes: a person's answer names the candidate as the one who asked. It is
    // read on the days each ask was on record (`play`), since a race's close
    // may drop its endorsement rows.
    const asked = played.asked;
    expect(
      asked.length,
      `${placeName}: people asked to endorse`,
    ).toBeGreaterThan(0);
    for (const row of asked) {
      expect(row.askerId, row.id).toBe(row.candidateId);
      expect(
        campaigns.some((c) => c.id === row.filingId),
        row.id,
      ).toBe(true);
    }
    const endorsers = asked.filter((row) => row.answer === "yes");
    expect(endorsers.length, `${placeName}: endorsers`).toBeGreaterThan(0);
    // The per-row checks read the days before a race's count, when the causes
    // that name an endorser are still rows (the eve of the first count, and
    // the last day for races still to be counted): each endorsement a voter
    // heard names an endorser who said yes for that candidate that day, and
    // the voter is in that endorser's circle.
    const heard = endorsementsHeard(played);
    expect(
      heard.length,
      `${placeName}: endorsements heard on the eve, ${played.eve.date}, and on the last day, ${played.end.date} (${describeAsks(played)})`,
    ).toBeGreaterThan(0);
    const yesOn = new Map(
      [played.eve, played.end].map((day) => [
        day,
        new Set(
          day.asked
            .filter((row) => row.answer === "yes")
            .map((row) => `${row.candidateId}|${row.speakerId}`),
        ),
      ]),
    );
    const strictChecks = { eve: 0, end: 0 };
    for (const { day, cause } of heard) {
      expect(
        yesOn.get(day)?.has(`${cause.candidateId}|${cause.actorId}`),
        `${cause.id}: its endorser said yes for the candidate`,
      ).toBe(true);
      expect(
        day.circles.get(cause.actorId)?.has(cause.voterId),
        `${cause.id}: the voter is in the endorser's circle`,
      ).toBe(true);
      strictChecks[day === played.eve ? "eve" : "end"] += 1;
    }
    expect(
      strictChecks.eve + strictChecks.end,
      `${placeName}: per-row checks run`,
    ).toBeGreaterThan(0);
    // After the count the causes are folded into summaries, which name no
    // endorser. A summary cannot hold more endorsements for a candidate and
    // voter than the candidate has yes endorsers with the voter in their
    // circle.
    const circles = new Map(
      endorsers.map((row) => [row.speakerId, circleOf(core, row.speakerId)]),
    );
    const summaries = (
      api
        .moduleState(CAMPAIGNS_MODULE_ID)
        .table("causeSummaries")
        .rows() as unknown as CauseSummaryRow[]
    ).filter((summary) => (summary.acts.endorsement?.reached ?? 0) > 0);
    for (const summary of summaries)
      expect(
        summary.acts.endorsement!.reached,
        `${summary.id}: endorsements counted, at most the candidate's yes endorsers with the voter in their circle`,
      ).toBeLessThanOrEqual(
        endorsers.filter(
          (row) =>
            row.candidateId === summary.candidateId &&
            circles.get(row.speakerId)?.has(summary.voterId),
        ).length,
      );
    console.log(
      `${placeName}: ${strictChecks.eve + strictChecks.end} strict per-row endorsement checks (${strictChecks.eve} on the eve, ${played.eve.date}; ${strictChecks.end} on the last day, ${played.end.date}; ${describeAsks(played)}), ${summaries.length} summaries cross-checked`,
    );
  });
});
