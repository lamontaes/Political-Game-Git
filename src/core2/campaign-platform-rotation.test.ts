/**
 * A campaign's acts are about more than its lead question (pool item
 * campaign-platform-emphasis-c1; the lead-only rule it
 * replaced): each ad, mailer, night of doors, event and donor meeting is about
 * the platform question the campaign is furthest behind on, measured against
 * that question's share of the platform's scores (`nextTopic`,
 * `platformShares`). Played in three named places at a pinned run seed (the
 * same places and acts every run, so no case is red by draw): a world rival
 * takes twelve campaign turns, and by record (its `messages` rows and the
 * statements of its speeches) its acts spread over its platform in the
 * shares the platform rule scored, the same record gives the same questions
 * again, and the race's close clears the count it kept.
 */
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildPopulation } from "./population";
import { advanceToFilingOpen } from "./gov-test-clock";
import { createLifeCore } from "./life";
import { coreAPI } from "./state";
import { openLaws } from "./modules/laws";
import { openOffices } from "./modules/offices";
import { openRecord } from "./modules/record";
import {
  ELECTIONS_MODULE_ID,
  fileCandidacy,
  openContests,
  openElections,
  type ContestRow,
  type FilingRow,
} from "./modules/elections";
import {
  CAMPAIGNS_MODULE_ID,
  campaignFor,
  campaignTurn,
  closeRace,
  holdEvent,
  openCampaigns,
} from "./modules/campaigns";
import { openParties } from "./modules/parties";
import { openPress } from "./modules/press";
import { viewsModule } from "./modules/views";
import type { CoreAPI, CoreState } from "./types";

const START = "2026-01-05";
/** Pinned: the run seed and the three salts name three places, the same every run. */
const RUN_SEED = "rival-issues-pinned-1";
const SALTS = ["a", "b", "c"] as const;

function world(salt: string) {
  const place = drawPlace(RUN_SEED, salt);
  const core = createLifeCore(
    buildPopulation({
      seed: place.seed,
      placeKey: place.key,
      startedAt: START,
      minimumPeople: 300,
    }),
    { modules: [viewsModule] },
  );
  openLaws(core);
  openOffices(core, place.seed);
  openElections(core);
  openCampaigns(core);
  openParties(core);
  openRecord(core);
  openPress(core);
  return {
    core,
    api: coreAPI(core),
    where: `${place.name}, ${place.state} (${place.key}), run seed ${RUN_SEED}, salt ${salt}, place seed ${place.seed}`,
  };
}

/** The first two wealthy adults who can file in the first open race. */
function rivals(api: CoreAPI, core: CoreState): readonly FilingRow[] {
  advanceToFilingOpen(core);
  const town = (
    api
      .moduleState(CAMPAIGNS_MODULE_ID)
      .table("town")
      .get("town") as unknown as { townPlaceId: string }
  ).townPlaceId;
  const adults = [...core.people.values()]
    .filter(
      (p) =>
        p.alive &&
        p.placeId === town &&
        Number(START.slice(0, 4)) - Number(p.birthDate.slice(0, 4)) >= 35,
    )
    .sort((a, b) => b.liquidMinor - a.liquidMinor || a.id.localeCompare(b.id));
  for (const contest of openContests(api)) {
    const filed: FilingRow[] = [];
    for (const adult of adults) {
      const result = fileCandidacy(api, {
        personId: adult.id,
        contestId: contest.id,
        platform: [],
      });
      if (
        result.status === "refused" ||
        !["petitioning", "on-ballot"].includes(result.filing.status ?? "")
      )
        continue;
      filed.push(result.filing);
      if (filed.length === 2) return filed;
    }
  }
  return [];
}

/** What a filing's messages said by kind (an ad, a mailer, a night of doors), by record: each kind's topics and how often. */
function saidByKind(
  api: CoreAPI,
  filing: FilingRow,
): Map<string, Map<string, number>> {
  const kinds = new Map<string, Map<string, number>>();
  for (const m of api
    .moduleState(CAMPAIGNS_MODULE_ID)
    .table("messages")
    .rows() as unknown as {
    kind: string;
    candidateId: string;
    contestId: string;
    topic: string;
  }[]) {
    if (m.candidateId !== filing.personId || m.contestId !== filing.contestId)
      continue;
    const held = kinds.get(m.kind) ?? new Map<string, number>();
    kinds.set(m.kind, held);
    held.set(m.topic, (held.get(m.topic) ?? 0) + 1);
  }
  return kinds;
}

/** What a filing said, by record: each message's topic and each speech's question. */
function said(api: CoreAPI, filing: FilingRow): Map<string, number> {
  const counts = new Map<string, number>();
  const add = (question: string) =>
    counts.set(question, (counts.get(question) ?? 0) + 1);
  const campaigns = api.moduleState(CAMPAIGNS_MODULE_ID);
  for (const m of campaigns.table("messages").rows() as unknown as {
    candidateId: string;
    contestId: string;
    topic: string;
  }[])
    if (m.candidateId === filing.personId && m.contestId === filing.contestId)
      add(m.topic);
  for (const p of campaigns.table("promises").rows() as unknown as {
    id: string;
    candidateId: string;
    contestId: string;
    stance: { question: string };
  }[])
    if (
      p.candidateId === filing.personId &&
      p.contestId === filing.contestId &&
      p.id.includes(":speech:")
    )
      add(p.stance.question);
  return counts;
}

function play(salt: string) {
  const w = world(salt);
  const pair = rivals(w.api, w.core);
  if (pair.length < 2) throw new Error(`${w.where}: no two candidates filed`);
  const rival = pair[1]!;
  const electionDate = (
    w.api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("contests")
      .get(rival.contestId) as unknown as ContestRow
  ).electionDate;
  for (let i = 0; i < 12; i += 1) campaignTurn(w.api, rival.id, electionDate);
  holdEvent(w.api, rival.id);
  holdEvent(w.api, rival.id);
  return { ...w, rival };
}

describe("a campaign's acts spread over its platform", () => {
  for (const salt of SALTS)
    it(`a rival's acts follow the platform's shares in place ${salt}`, () => {
      const { api, where, rival } = play(salt);
      const campaign = campaignFor(api, rival.id);
      const sides = campaign.platform.filter((s) => s.position !== 0);
      const shares = campaign.platformShares ?? {};
      const counts = said(api, rival);
      const total = [...counts.values()].reduce((t, n) => t + n, 0);
      console.log(
        JSON.stringify({
          where,
          rival: rival.id,
          platform: sides.map((s) => s.question),
          shares,
          counts: Object.fromEntries(counts),
          byKind: Object.fromEntries(
            [...saidByKind(api, rival)].map(([kind, held]) => [
              kind,
              Object.fromEntries(held),
            ]),
          ),
        }),
      );
      // The shares are one in all, over the platform's questions.
      expect(
        Object.values(shares).reduce((t, v) => t + v, 0),
        where,
      ).toBeCloseTo(1, 9);
      // Every act is about a question of the platform, never off it.
      for (const question of counts.keys())
        expect(
          sides.some((s) => s.question === question),
          `${where}: ${question} is not on the platform`,
        ).toBe(true);
      // More than one question was spoken of, when the platform has more than one
      // and the campaign acted enough to share them.
      if (sides.length > 1 && total >= sides.length)
        expect(counts.size, where).toBeGreaterThan(1);
      // A kind of act that was taken as often as the platform has questions
      // is about more than one of them (the doors are not always about the
      // question the ads never reach).
      for (const [kind, held] of saidByKind(api, rival)) {
        const n = [...held.values()].reduce((t, c) => t + c, 0);
        if (sides.length > 1 && n >= sides.length)
          expect(held.size, `${where}: ${kind}`).toBeGreaterThan(1);
      }
      // The question furthest behind is the one taken: no question is more
      // than two acts off its share of what was said (one in the whole, one
      // in the act's own kind).
      for (const s of sides)
        expect(
          Math.abs(
            (counts.get(s.question) ?? 0) - total * (shares[s.question] ?? 0),
          ),
          `${where}: ${s.question}`,
        ).toBeLessThanOrEqual(2);
    }, 120_000);

  it("the same record gives the same questions again, and the race's close clears the count", () => {
    const first = play("a");
    const again = play("a");
    expect([...said(again.api, again.rival).entries()], first.where).toEqual([
      ...said(first.api, first.rival).entries(),
    ]);
    const emphasis = first.api
      .moduleState(CAMPAIGNS_MODULE_ID)
      .table("emphasis");
    expect(emphasis.get(first.rival.id), first.where).toBeDefined();
    closeRace(first.api, first.rival.contestId);
    expect(emphasis.get(first.rival.id), first.where).toBeUndefined();
  }, 240_000);
});
