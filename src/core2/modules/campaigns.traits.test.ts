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
import { advanceCore } from "../life";
import { coreAPI } from "../state";
import {
  decisionLean,
  decisionTraitWeight,
  leanedScore,
} from "../trait-decisions";
import { setTraitProbe } from "../trait-probe";
import type { CoreState } from "../types";
import { drawPlace } from "../../../tests/golden-path/place";
import {
  answerPollReason,
  volunteerReason,
  reachablePeople,
  CAMPAIGNS_MODULE_ID,
  type CampaignRow,
  type CauseRow,
} from "./campaigns";
import { standAgainReason } from "./voting";
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

/**
 * What the played window lacks for the tests to read: enough calls of each
 * played decision, and at least one call temperament turns (someone near
 * enough to the line for it to matter).
 */
function windowGaps(world: CoreState): string[] {
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
    if (rows.length <= 50 || turned === 0)
      gaps.push(`${id}: ${rows.length} calls, ${turned} turned by temperament`);
  }
  return gaps;
}

/** Plays a drawn world for the window with the probe on, keeping every formula and run-for-office call. */
function play(world: CoreState, last: string) {
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
    advanceCore(world, last);
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
    play(world, end.toISOString().slice(0, 10));
    core = world;
    placeName = `${name}, race ${next}, played from ${start}`;
    const missing = windowGaps(world);
    if (missing.length === 0) return;
    tried.push(`${placeName}: ${missing.join(", ")}`);
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
    effect: { kind: string; value: number } | null;
  }[]) {
    if (row.id !== id || !row.effect) continue;
    const e = row.effect;
    const log =
      e.kind === "logit-coef-full-range"
        ? e.value * 0.2 * THIRDS_APART
        : e.kind === "pp-full-range"
          ? swing(e.value) * 0.2 * THIRDS_APART
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
) {
  const target = targetOddsRatio(id);
  const reached = crossOdds(rows, w);
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
  expect(crossOdds(rows, 0)).toBeCloseTo(1, 5);
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

  it("running for office follows honesty-humility at about the researched rate", () => {
    expectAboutResearch(
      "candidacy.run",
      chooser,
      decisionTraitWeight(core, "candidacy.run"),
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
    const asked = campaigns.flatMap((c) => c.endorsementAskedIds ?? []);
    expect(
      asked.length,
      `${placeName}: people asked to endorse`,
    ).toBeGreaterThan(0);
    const endorsers = campaigns.flatMap((c) =>
      (c.endorserIds ?? []).map((id) => ({ c, id })),
    );
    expect(endorsers.length, `${placeName}: endorsers`).toBeGreaterThan(0);
    for (const { c, id } of endorsers)
      expect(c.endorsementAskedIds, `${id} was asked`).toContain(id);
    // Each endorsement a voter heard names an endorser of that candidate who
    // was asked, and the voter is in the endorser's circle.
    const heard = (
      api
        .moduleState(CAMPAIGNS_MODULE_ID)
        .table("causes")
        .rows() as unknown as CauseRow[]
    ).filter((cause) => cause.act === "endorsement");
    expect(heard.length, `${placeName}: endorsements heard`).toBeGreaterThan(0);
    for (const cause of heard) {
      const campaign = campaigns.find(
        (c) => c.candidateId === cause.candidateId,
      );
      expect(campaign?.endorserIds, cause.id).toContain(cause.actorId);
      const endorser = core.people.get(cause.actorId)!;
      expect([...endorser.knownIds, ...endorser.familyIds], cause.id).toContain(
        cause.voterId,
      );
    }
  });
});
