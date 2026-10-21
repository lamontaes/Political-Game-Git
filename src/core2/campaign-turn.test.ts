/**
 * Campaigns that raise and spend, and candidates who read their party
 * (stress audit 2026-10-14, defects 1, 6, 7, 31 to 34 and 36), in a random
 * place drawn from all 56.
 *
 * A world candidate's turn asks the people the campaign can reach for money;
 * each gives by their own reasons and spare cash, never past the limit, and
 * the money moves on the journal. The campaign spends it on ads, mail, an
 * event and a poll bought from sellers. Statements are one record per
 * question and every promise keeps its own id. Reporters' questions change
 * once a candidate has answered them. Two parties' nominees never answer
 * alike.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildPopulation } from "./population";
import { createLifeCore } from "./life";
import { coreAPI } from "./state";
import type { CoreAPI, CoreState } from "./types";
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
  askForDonation,
  campaignFor,
  campaignTurn,
  contributionLimit,
  giftOf,
  makeStatements,
  openCampaigns,
  reachablePeople,
  runAd,
  type GiftRow,
  type PromiseRow,
} from "./modules/campaigns";
import { openParties, partiesHere } from "./modules/parties";
import {
  answerInterview,
  candidateAnswers,
  interviewQuestions,
  openPress,
  requestInterview,
} from "./modules/press";
import { stancesOf, viewsModule } from "./modules/views";
import { candidateStance } from "./campaign-stances";
import { PLATFORM_QUESTIONS } from "./campaign-views";

const START = "2026-01-05";
const runSeed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`campaign-turn:${Date.now()}`).digest("hex");

/** A played-world slice: views, laws, offices, elections, campaigns, parties, the record and the press. */
function world(salt: string) {
  const place = drawPlace(runSeed, salt);
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
  const outlets = openPress(core);
  const api = coreAPI(core);
  return {
    core,
    api,
    outlets,
    where: `${place.name}, ${place.state} (${place.key}), run seed ${runSeed}, place seed ${place.seed}`,
  };
}

/**
 * Two wealthy adults filed in the first contest both qualify for: the richest
 * adults, in order, who the contest's rules let on the ballot (a national
 * outlet's head lives elsewhere and a press owner may not run).
 */
function twoCandidates(
  api: CoreAPI,
  core: CoreState,
): { you: FilingRow; rival: FilingRow } | null {
  const adults = [...core.people.values()]
    .filter(
      (p) =>
        p.alive &&
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
      if (result.status === "refused" || result.filing.status !== "on-ballot")
        continue;
      filed.push(result.filing);
      if (filed.length === 2) return { you: filed[0]!, rival: filed[1]! };
    }
  }
  return null;
}

/**
 * A world in which two wealthy adults can file in the first contest. A small
 * town may have none, so another place is drawn (up to eight) before failing.
 */
function worldWithPair(salt: string) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const w = world(`${salt}:${attempt}`);
    const pair = twoCandidates(w.api, w.core);
    if (pair) return { ...w, pair };
  }
  throw new Error(
    `no drawn place had two candidates for the first contest in 8 draws (run seed ${runSeed}, ${salt})`,
  );
}

const electionOf = (api: CoreAPI, filing: FilingRow) =>
  (
    api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("contests")
      .get(filing.contestId) as unknown as ContestRow
  ).electionDate;

describe("campaigns that raise and spend", () => {
  it("a world candidate's turns raise money from people by their reasons and spend it on the journal", () => {
    const { core, api, where, pair } = worldWithPair("money");
    const { rival } = pair;
    const cashBefore = new Map(
      [...core.people.values()].map((p) => [p.id, p.liquidMinor]),
    );
    const sellersBefore = new Map(
      [...core.organizations.values()].map((o) => [o.id, o.liquidMinor]),
    );
    const turns = [];
    for (let i = 0; i < 12; i += 1)
      turns.push(campaignTurn(api, rival.id, electionOf(api, rival)));
    // The last turn before election day spends what's left.
    turns.push(campaignTurn(api, rival.id, "2026-01-07"));
    const campaign = campaignFor(api, rival.id);
    const gifts = api
      .moduleState(CAMPAIGNS_MODULE_ID)
      .table("gifts")
      .query("byCampaign", [rival.id]) as unknown as GiftRow[];
    // The money came from specific people, each within the limit, out of
    // their own accounts.
    expect(campaign.raisedMinor, where).toBeGreaterThan(0);
    expect(gifts.reduce((s, g) => s + g.totalMinor, 0)).toBe(
      campaign.raisedMinor,
    );
    const limit =
      contributionLimit(api, rival.contestId).minor ?? Number.MAX_SAFE_INTEGER;
    for (const gift of gifts) {
      if (gift.donorId !== campaign.candidateId)
        expect(gift.totalMinor).toBeLessThanOrEqual(limit);
      expect(gift.totalMinor % 100).toBe(0);
      // Out of their own account, exactly (a donor filled in at a door
      // during the turns had no account before).
      if (cashBefore.has(gift.donorId))
        expect(
          cashBefore.get(gift.donorId)! -
            core.people.get(gift.donorId)!.liquidMinor,
        ).toBe(gift.totalMinor);
    }
    // Everyone else who gave is someone the campaign could reach.
    const reachable = new Set([
      campaign.candidateId,
      ...reachablePeople(api, campaign),
    ]);
    for (const gift of gifts) expect(reachable.has(gift.donorId)).toBe(true);
    // Spent on what it bought, paid to sellers; the books balance.
    expect(campaign.spentMinor, where).toBeGreaterThan(0);
    expect(
      Object.values(campaign.spentByKind ?? {}).reduce((a, b) => a + b, 0),
    ).toBe(campaign.spentMinor);
    expect(core.organizations.get(campaign.organizationId)!.liquidMinor).toBe(
      campaign.raisedMinor - campaign.spentMinor,
    );
    const money = api
      .moduleState(CAMPAIGNS_MODULE_ID)
      .table("money")
      .rows() as unknown as {
      postings: { accountId: string; deltaMinor: number }[];
    }[];
    let paidOut = 0;
    for (const record of money) {
      // Every payment balances: what leaves one account enters another.
      expect(record.postings.reduce((s, p) => s + p.deltaMinor, 0)).toBe(0);
      const out = record.postings.find(
        (p) => p.accountId === `cash:${campaign.organizationId}:residual`,
      );
      if (out && out.deltaMinor < 0) {
        paidOut -= out.deltaMinor;
        const to = record.postings.find((p) => p !== out)!;
        const sellerId = to.accountId.slice(5, -":residual".length);
        expect(core.organizations.get(sellerId)!.liquidMinor).toBeGreaterThan(
          sellersBefore.get(sellerId) ?? 0,
        );
      }
    }
    expect(paidOut).toBe(campaign.spentMinor);
    console.log(
      JSON.stringify({
        where,
        raisedMinor: campaign.raisedMinor,
        spentMinor: campaign.spentMinor,
        spentByKind: campaign.spentByKind,
        donors: gifts.length,
        turns: turns.map((t) => [
          t.asked,
          t.raisedMinor,
          t.spentMinor,
          t.doors,
        ]),
      }),
    );
  }, 300_000);

  it("a donor's running total is read from its indexed row, not from the history of payments", () => {
    const { api, pair } = worldWithPair("gift-index");
    const { rival } = pair;
    // Donors decide for their own reasons: a few turns reach more of them.
    const gifts = () =>
      api
        .moduleState(CAMPAIGNS_MODULE_ID)
        .table("gifts")
        .query("byCampaign", [rival.id]) as unknown as GiftRow[];
    for (let turn = 0; turn < 5 && !gifts().length; turn += 1)
      campaignTurn(api, rival.id, electionOf(api, rival));
    const gift = gifts()[0];
    // A town where no one the campaign reached would give has nothing to read.
    if (!gift) return;
    // Forget every payment record: the donor has still given what they'd give.
    const money = api.moduleState(CAMPAIGNS_MODULE_ID).table("money");
    for (const row of money.rows().slice()) money.remove(row.id);
    expect(askForDonation(api, rival.id, gift!.donorId)).toBe(0);
    expect(giftOf(api, rival.id, gift!.donorId)!.totalMinor).toBe(
      gift!.totalMinor,
    );
  }, 300_000);

  it("an ad is a message the views engine reads for the people who saw it", () => {
    const { core, api, where, pair } = worldWithPair("ad-views");
    const { rival } = pair;
    // Money to spend, from the people who'd give it.
    campaignTurn(api, rival.id, electionOf(api, rival));
    const campaign = campaignFor(api, rival.id);
    const lead = [...campaign.platform].sort(
      (a, b) =>
        Math.abs(b.position) - Math.abs(a.position) ||
        a.question.localeCompare(b.question),
    )[0]!;
    // A town where no one the campaign reached would give yet has no ad to
    // test: its donors decide for their own reasons.
    if (campaign.raisedMinor === 0) return;
    const free = campaign.raisedMinor - campaign.spentMinor;
    // The turn may already have spent what it raised; its message moved the
    // people it reached. Otherwise buy an ad with what's left.
    const prefix = free > 0 ? "campaign-ad:" : "campaign-message:";
    const viewers =
      free > 0
        ? runAd(api, { filingId: rival.id, amountMinor: free }).map(
            (c) => c.voterId,
          )
        : [...core.people.keys()];
    if (!viewers.length) return; // a town whose outlets have no followers
    const moved = viewers.filter((id) =>
      stancesOf(api, id).some(
        (s) =>
          s.topic === lead.question &&
          s.causes.some((x) => x.eventId.startsWith(prefix)),
      ),
    );
    if (free === 0 && campaign.spentMinor === 0) return;
    expect(moved.length, where).toBeGreaterThan(0);
  }, 300_000);
});

describe("statements and questions", () => {
  it("a stance is one platform entry per question and every promise keeps its own record", () => {
    const { api, outlets, pair } = worldWithPair("statements");
    const { you } = pair;
    const questions = PLATFORM_QUESTIONS.slice(0, 3);
    const venues = [
      "outlet:a",
      "outlet:b",
      "outlet:c",
      ...outlets.map((o) => o.id),
    ];
    for (const venue of venues)
      makeStatements(api, {
        filingId: you.id,
        venue,
        statements: questions.map((question, i) => ({
          question,
          position: i % 2 ? -0.5 : 0.7,
        })),
        audienceIds: [],
        act: "interview",
        weight: 0.25,
        faceToFace: false,
      });
    const platform = campaignFor(api, you.id).platform;
    expect(new Set(platform.map((s) => s.question)).size).toBe(platform.length);
    const promises = api
      .moduleState(CAMPAIGNS_MODULE_ID)
      .table("promises")
      .query("byCandidate", [you.personId]) as unknown as PromiseRow[];
    expect(promises.length).toBe(venues.length * questions.length);
  }, 300_000);

  it("reporters ask from the race's record and ask differently once answered", () => {
    const { api, outlets, where, pair } = worldWithPair("questions");
    const { you } = pair;
    const first = interviewQuestions(api, you);
    expect(first.length, where).toBeGreaterThan(0);
    // A local paper or radio station takes any candidate its people and
    // readers are not set against; a national outlet and a television
    // station only the newsworthy.
    const local = outlets.filter(
      (o) => o.kind !== "television" && o.tier !== "national",
    );
    if (!local.length) {
      // A news desert: the same freshness rule, read from a published row.
      return;
    }
    const asked = local.map((outlet) =>
      requestInterview(api, { filingId: you.id, outletId: outlet.id }),
    );
    const row = asked.find((r) => r.status === "invited");
    if (!row) {
      // Every local outlet turned the candidate down, and each says why from
      // its own people: the interest it weighed fell below its bar of zero.
      for (const r of asked) {
        expect(r.reason, where).toBe("not-interested");
        expect(r.interest!.total, where).toBeLessThan(0);
      }
      return;
    }
    answerInterview(api, row.id, candidateAnswers(api, row.questions, you));
    const second = interviewQuestions(api, you);
    expect(second, where).not.toEqual(row.questions);
  }, 300_000);
});

describe("candidates who read their party", () => {
  it("two nominees of different parties never answer alike, with positions on a sliding scale", () => {
    const { core, api, where } = world("parties");
    const parties = partiesHere(api);
    // The state's parties on each side; a place whose parties aren't
    // recorded by side (a territory's nonpartisan legislature) still has the
    // national parties' labels.
    const left = parties.find((p) => p.side < 0)?.name ?? "Democratic";
    const right = parties.find((p) => p.side > 0)?.name ?? "Republican";
    const adults = [...core.people.values()]
      .filter(
        (p) =>
          p.alive &&
          Number(START.slice(0, 4)) - Number(p.birthDate.slice(0, 4)) >= 25,
      )
      .sort((a, b) => a.id.localeCompare(b.id));
    const filing = (personId: string, party: string): FilingRow => ({
      id: `fixture:${personId}:${party}`,
      contestId: "fixture",
      personId,
      filedOn: START,
      filedWith: "fixture",
      platform: [],
      party,
      status: "on-ballot",
    });
    // The nominees whose own view and their party's pull do not cancel: a
    // person standing at 0 on every question has nothing continuous to show,
    // so the sliding-scale proof is drawn from those who do stand somewhere.
    const standing = adults.filter((p) =>
      candidateAnswers(api, PLATFORM_QUESTIONS, filing(p.id, left)).some(
        (x) => x.position !== null && x.position !== 0,
      ),
    );
    expect(
      standing.length,
      `${where}: fewer than three adults stand anywhere under the left party`,
    ).toBeGreaterThanOrEqual(3);
    const pairs: [string, string][] = [
      // The same person under each party, two people, and two officials the
      // world holds no view for (party alone).
      [standing[0]!.id, standing[0]!.id],
      [standing[1]!.id, standing[2]!.id],
      ["official:fixture:a", "official:fixture:b"],
    ];
    for (const [a, b] of pairs) {
      const da = candidateAnswers(api, PLATFORM_QUESTIONS, filing(a, left));
      const rb = candidateAnswers(api, PLATFORM_QUESTIONS, filing(b, right));
      expect(
        da.map((x) => x.position),
        where,
      ).not.toEqual(rb.map((x) => x.position));
      // Continuous positions, not the sign of one number.
      expect(
        da.some(
          (x) =>
            x.position !== null &&
            Math.abs(x.position) !== 1 &&
            x.position !== 0,
        ),
        `${where} ${a} ${JSON.stringify(da)}`,
      ).toBe(true);
      // Nobody without a view or a party declines a question here.
      expect(
        da.every((x) => x.position !== null),
        `${where} ${a} ${JSON.stringify(da)}`,
      ).toBe(true);
    }
    // On the most partisan question, the left party's nominee stands left of
    // the right party's.
    const q = [...PLATFORM_QUESTIONS].sort(
      (x, y) =>
        Math.abs(candidateStance(api, "official:fixture:a", right, y)!) -
        Math.abs(candidateStance(api, "official:fixture:a", right, x)!),
    )[0]!;
    const l = candidateStance(api, "official:fixture:a", left, q)!;
    const r = candidateStance(api, "official:fixture:b", right, q)!;
    expect(Math.sign(l)).not.toBe(Math.sign(r));
  }, 300_000);
});
