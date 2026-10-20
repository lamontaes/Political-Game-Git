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
  causesFor,
  volunteerReason,
  reachablePeople,
  CAMPAIGNS_MODULE_ID,
  type CampaignRow,
} from "./campaigns";
import { standAgainReason } from "./voting";
import { partyFirmness } from "../campaign-stances";

/** Draws Newfane, Vermont: a place whose council and mayor race its filing window in January 2025. */
const SEED = "c1";
const DAYS = 150;

interface Row {
  bare: number;
  lean: number;
}
const formula = new Map<string, Row[]>();
const chooser: Row[] = [];
let core: CoreState;
let placeName = "";

beforeAll(() => {
  const place = drawPlace(SEED, "trait-wiring");
  placeName = `${place.name} (${place.key}), seed ${SEED}`;
  const start = gameStartDate();
  core = buildBenchWorld(SEED, start, {
    twoLevel: true,
    placeKey: place.key,
  }).core;
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
  const end = new Date(`${start}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + DAYS);
  try {
    advanceCore(core, end.toISOString().slice(0, 10));
  } finally {
    setTraitProbe(undefined);
  }
  // Reason for the hook's time: building a played town takes about 7 seconds and 150 days about 20 more.
}, 120_000);

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

/** About the researched size: within a factor of 1.6 of the study, in a one-place slice of a calibration made over four. */
function expectAboutResearch(
  id: string,
  rows: readonly Row[],
  w: number,
  slack = 1.6,
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
  it("volunteering follows openness at about the researched rate", () => {
    // The people each campaign can reach. About 1 in 100 say yes, so one place has a thin tail of yes answers and its odds ratio swings
    // (1.2 to 7 across slices, 2.4 over four places); the band is wide for that reason alone.

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
    expectAboutResearch(
      "campaigns.volunteer",
      rows,
      decisionTraitWeight(core, "campaigns.volunteer"),
      4,
    );
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
    ).toBeGreaterThan(Math.max(1.05, target / 1.6));
    expect(ratio).toBeLessThan(target * 1.6);
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

  it("only a candidate strongly averse to a reporter declines an interview", () => {
    const api = coreAPI(core);
    const people = [...core.people.values()].filter((p) => p.alive);
    const sorted = people
      .map((p) => ({
        p,
        lean: decisionLean(
          core,
          p,
          "press.accept-interview",
          "accept",
          "decline",
        ),
      }))
      .sort((a, b) => a.lean - b.lean);
    const most = sorted[sorted.length - 1]!.p;
    const least = sorted[0]!.p;
    // The same circumstances: no closeness or grudge with the reporter, the bar at its parameter.
    const bare = 1;
    const weight = decisionTraitWeight(api.state, "press.accept-interview");
    expect(
      bare + weight * sorted[sorted.length - 1]!.lean,
      most.id,
    ).toBeGreaterThan(0);
    expect(bare + weight * sorted[0]!.lean, least.id).toBeLessThan(
      bare + weight * sorted[sorted.length - 1]!.lean,
    );
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
    for (const { c, id } of endorsers) {
      // An endorser was asked, is a real person, and their circle heard it: an endorsement cause names them.
      expect(c.endorsementAskedIds, id).toContain(id);
      const endorser = core.people.get(id)!;
      const heard = [...endorser.knownIds, ...endorser.familyIds].some(
        (listener) =>
          causesFor(api, listener, c.candidateId).some(
            (cause) => cause.act === "endorsement" && cause.actorId === id,
          ),
      );
      expect(heard, `${id} for ${c.candidateId}`).toBe(true);
    }
  });
});
