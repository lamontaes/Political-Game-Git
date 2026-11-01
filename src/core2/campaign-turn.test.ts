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
import { campaignDayChoices, takeCampaignDayChoice } from "./campaign-day";
import type { CoreAPI, CoreState } from "./types";
import { openLaws } from "./modules/laws";
import { openOffices } from "./modules/offices";
import { openRecord, votesOf } from "./modules/record";
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
  campaignRecognition,
  campaignTurn,
  contributionLimit,
  giftOf,
  makeStatements,
  openCampaigns,
  reachablePeople,
  rivalDay,
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
import { stancesOf, VIEWS_MODULE_ID, viewsModule } from "./modules/views";
import { candidateStance, stanceReader } from "./campaign-stances";
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
      if (
        result.status === "refused" ||
        !["petitioning", "on-ballot"].includes(result.filing.status ?? "")
      )
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
function worldWithPair(
  salt: string,
  /** Null when the world has what the case tests, else why it has not (read from the world's own records), and the draw goes on. */
  suits?: (
    w: ReturnType<typeof world> & {
      pair: NonNullable<ReturnType<typeof twoCandidates>>;
    },
  ) => string | null,
) {
  const tried: string[] = [];
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const w = world(`${salt}:${attempt}`);
    const pair = twoCandidates(w.api, w.core);
    if (!pair) {
      tried.push(`${w.where}: no two candidates for the first contest`);
      continue;
    }
    const found = { ...w, pair };
    const lacks = suits?.(found) ?? null;
    if (lacks) {
      tried.push(`${w.where}: ${lacks}`);
      continue;
    }
    return found;
  }
  throw new Error(
    `no drawn place suited the case in 8 draws (run seed ${runSeed}, ${salt}): ${tried.join("; ")}`,
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
      // An outside place's row stands for all its donors: the limit is per
      // person, so it is read as the row's total over its donors.
      const perPerson = gift.totalMinor / (gift.donors ?? 1);
      if (gift.donorId !== campaign.candidateId)
        expect(perPerson).toBeLessThanOrEqual(limit);
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
    for (const gift of gifts)
      if (!gift.donorId.startsWith("outside:"))
        expect(reachable.has(gift.donorId)).toBe(true);
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

  it("a world candidate's turn is a campaign day taken through the player's own choices", () => {
    // A candidate whose town has someone left to ask for money (the choice's
    // own facts say so); a town where every reachable adult has given or is
    // not askable is passed over by name.
    const { api, where, pair } = worldWithPair("shared-day", (w) => {
      const raise = campaignDayChoices(w.api, w.pair.rival.id, true).find(
        (c) => c.kind === "raise-money",
      );
      return raise?.available
        ? null
        : `no one left to ask for money (${JSON.stringify(raise?.facts ?? {})})`;
    });
    const { rival } = pair;
    // The player's day is not open to a rival; the same choices are, for a world candidate.
    expect(campaignDayChoices(api, rival.id)).toEqual([]);
    const choices = campaignDayChoices(api, rival.id, true);
    expect(
      choices.map((c) => c.kind),
      where,
    ).toContain("raise-money");
    const turn = campaignTurn(api, rival.id, electionOf(api, rival));
    // The turn asked people for money through the call-time session.
    expect(turn.asked, where).toBeGreaterThan(0);
  }, 300_000);

  it("a rival chooses between calls and doors by their money and standing, sliding with each", () => {
    // The bank can only slide the day between calls and doors for a candidate
    // the records offer both: someone left to ask, and doors in their town.
    // Everyone a candidate can reach may already have given (Simsboro,
    // Louisiana), so take either of the pair, and draw again if neither.
    const offeredBoth = (api: CoreAPI, filing: FilingRow) => {
      const day = campaignDayChoices(api, filing.id, true);
      return ["raise-money", "canvass"].every(
        (kind) => day.find((c) => c.kind === kind)?.available,
      );
    };
    const tried: string[] = [];
    let found: {
      core: CoreState;
      api: CoreAPI;
      where: string;
      rival: FilingRow;
    } | null = null;
    for (let attempt = 0; attempt < 8 && !found; attempt += 1) {
      const w = world(attempt ? `rival-chooser:${attempt}` : "rival-chooser");
      const pair = twoCandidates(w.api, w.core);
      const rival =
        pair && [pair.rival, pair.you].find((f) => offeredBoth(w.api, f));
      if (rival) found = { ...w, rival };
      else
        tried.push(
          `${w.where}: ${pair ? "neither candidate is offered both calls and doors" : "no two candidates"}`,
        );
    }
    expect(found, tried.join("\n")).not.toBeNull();
    const { core, api, where, rival } = found!;
    process.stdout.write(`rival chooser: ${where}, ${rival.id}\n`);
    const campaign = campaignFor(api, rival.id);
    const candidate = core.people.get(campaign.candidateId)!;
    const town = candidate.placeId;
    const bank = core.organizations.get(campaign.organizationId)!;
    const share = () => {
      const day = rivalDay(api, rival.id, candidate, town);
      return day.callHours / (day.callHours + day.doorHours);
    };
    const poor = ((bank.liquidMinor = 0), share());
    const rich = ((bank.liquidMinor = 50_000_000_00), share());
    // Every dollar in the bank moves hours from calls to doors, with no cut-off.
    bank.liquidMinor = 20_000_00;
    const middle = share();
    expect(poor, `${where}: empty bank leans on calls`).toBeGreaterThan(rich);
    expect(middle, where).toBeLessThan(poor);
    expect(middle, where).toBeGreaterThan(rich);
  }, 300_000);

  it("a rich rival holds an event on a day it is offered and a poor one does not", () => {
    // A rival whose campaign could hold an event if it could pay the venue:
    // a platform with a stance and a live candidate, read from the choice's
    // facts with money given to it. A campaign with no platform is passed over.
    const { core, api, where, pair } = worldWithPair("rival-event", (w) => {
      const bank = w.core.organizations.get(
        campaignFor(w.api, w.pair.rival.id).organizationId,
      )!;
      const had = bank.liquidMinor;
      bank.liquidMinor = 50_000_000_00;
      const offered = campaignDayChoices(w.api, w.pair.rival.id, true).find(
        (c) => c.kind === "event",
      );
      bank.liquidMinor = had;
      return offered?.available
        ? null
        : `no event could be offered (${JSON.stringify(offered?.facts ?? {})})`;
    });
    const filing = pair.rival;
    const campaign = campaignFor(api, filing.id);
    const candidate = core.people.get(campaign.candidateId)!;
    const bank = core.organizations.get(campaign.organizationId)!;
    bank.liquidMinor = 0;
    const poor = rivalDay(api, filing.id, candidate, candidate.placeId);
    bank.liquidMinor = 50_000_000_00;
    const offered = campaignDayChoices(api, filing.id, true).find(
      (c) => c.kind === "event",
    );
    expect(offered?.available, `${where}: an event is offered`).toBe(true);
    const rich = rivalDay(api, filing.id, candidate, candidate.placeId);
    expect(poor.act, `${where}: a poor rival holds no event`).not.toBe("event");
    expect(rich.act, `${where}: a rich rival holds one`).toBe("event");
    const turn = campaignTurn(api, filing.id, electionOf(api, filing));
    expect(turn.dayAct, where).toBe("event");
  }, 300_000);

  it("an unknown rival puts more of the day into doors than a well-known one", () => {
    const { core, api, where, pair } = worldWithPair("rival-known");
    const campaign = campaignFor(api, pair.rival.id);
    const candidate = core.people.get(campaign.candidateId)!;
    const bank = core.organizations.get(campaign.organizationId)!;
    const doorShare = () => {
      const day = rivalDay(api, pair.rival.id, candidate, candidate.placeId);
      return day.doorHours / (day.callHours + day.doorHours);
    };
    bank.liquidMinor = 0;
    const knownBefore = campaignRecognition(api, pair.rival.id);
    const unknown = doorShare();
    // Weeks of canvassing make them known in town.
    takeCampaignDayChoice(api, pair.rival.id, "canvass", {
      world: true,
      hours: 400,
    });
    bank.liquidMinor = 0;
    const knownAfter = campaignRecognition(api, pair.rival.id);
    expect(knownAfter, `${where}: doors made them known`).toBeGreaterThan(
      knownBefore,
    );
    expect(doorShare(), `${where}: better known, fewer doors`).toBeLessThan(
      unknown,
    );
  }, 300_000);

  it("a donor's running total is read from its indexed row, not from the history of payments", () => {
    // Donors decide for their own reasons: draw places until a campaign
    // reaches one who gives.
    const tried: string[] = [];
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const { core, api, where } = world(`gift-index:${attempt}`);
      const pair = twoCandidates(api, core);
      if (!pair) {
        tried.push(`${where}: no two candidates for the first contest`);
        continue;
      }
      const { rival } = pair;
      const gifts = () =>
        api
          .moduleState(CAMPAIGNS_MODULE_ID)
          .table("gifts")
          .query("byCampaign", [rival.id]) as unknown as GiftRow[];
      // An outside place's row is many donors, not one indexed donor: the
      // index is read for a named donor.
      const named = () =>
        gifts().find((row) => !row.donorId.startsWith("outside:"));
      for (let turn = 0; turn < 5 && !named(); turn += 1)
        campaignTurn(api, rival.id, electionOf(api, rival));
      const gift = named();
      if (!gift) {
        tried.push(
          `${where}: no named donor the campaign reached would give (${gifts().length} outside rows)`,
        );
        continue;
      }
      // The turn went on after the gift (its doors warm the people it
      // reaches), so the donor may now give more in all: asked once more,
      // they give what they'd give now (Green Isle, Minnesota, seed
      // 3d29bb4ba93ab238770ab3570ad393b0144d225cabba0415b78f6a7fd4ccb5bc).
      askForDonation(api, rival.id, gift.donorId);
      const total = giftOf(api, rival.id, gift.donorId)!;
      // Forget every payment record: the donor has still given what they'd give.
      const money = api.moduleState(CAMPAIGNS_MODULE_ID).table("money");
      for (const row of money.rows().slice()) money.remove(row.id);
      expect(askForDonation(api, rival.id, gift.donorId), where).toBe(0);
      expect(giftOf(api, rival.id, gift.donorId)!.totalMinor, where).toBe(
        total.totalMinor,
      );
      console.info(
        `campaign-turn donor ${where}: ${gift.donorId} gave ${gift.totalMinor} to ${rival.id}, ${total.totalMinor} in all, and nothing more with the payments forgotten`,
      );
      return;
    }
    throw new Error(`no drawn town had a named donor: ${tried.join("; ")}`);
  }, 300_000);

  it("an ad is a message the views engine reads for the people who saw it", () => {
    const tried: string[] = [];
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const { core, api, where } = world(`ad-views:${attempt}`);
      const pair = twoCandidates(api, core);
      if (!pair) {
        tried.push(`${where}: no two candidates for the first contest`);
        continue;
      }
      const { rival } = pair;
      // Money to spend, from the people who'd give it.
      campaignTurn(api, rival.id, electionOf(api, rival));
      const campaign = campaignFor(api, rival.id);
      const lead = [...campaign.platform].sort(
        (a, b) =>
          Math.abs(b.position) - Math.abs(a.position) ||
          a.question.localeCompare(b.question),
      )[0]!;
      // A town where no one the campaign reached would give has no ad to
      // test: its donors decide for their own reasons.
      if (campaign.raisedMinor === 0) {
        tried.push(`${where}: nothing raised`);
        continue;
      }
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
      if (!viewers.length) {
        tried.push(`${where}: the outlets have no followers`);
        continue;
      }
      if (free === 0 && campaign.spentMinor === 0) {
        tried.push(`${where}: nothing raised or spent`);
        continue;
      }
      // The views engine moves a stance someone holds: viewers with none on
      // the ad's question have nothing for it to move.
      if (
        !viewers.some((id) =>
          stancesOf(api, id).some((s) => s.topic === lead.question),
        )
      ) {
        tried.push(
          `${where}: none of ${viewers.length} viewers holds a stance on ${lead.question}`,
        );
        continue;
      }
      const moved = viewers.filter((id) =>
        stancesOf(api, id).some(
          (s) =>
            s.topic === lead.question &&
            s.causes.some((x) => x.eventId.startsWith(prefix)),
        ),
      );
      expect(moved.length, where).toBeGreaterThan(0);
      return;
    }
    throw new Error(`no drawn town had an ad to test: ${tried.join("; ")}`);
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

  it("a stance reader asked every question twice answers as a fresh candidateStance each time, and weighs as often", () => {
    const { core, api, where } = world("reader");
    const parties = partiesHere(api);
    const labels = [
      parties.find((p) => p.side < 0)?.name ?? "Democratic",
      parties.find((p) => p.side > 0)?.name ?? "Republican",
      null,
    ];
    const adults = [...core.people.values()]
      .filter(
        (p) =>
          p.alive &&
          Number(START.slice(0, 4)) - Number(p.birthDate.slice(0, 4)) >= 25,
      )
      .sort((a, b) => a.id.localeCompare(b.id))
      .slice(0, 12);
    expect(adults.length, where).toBeGreaterThan(2);
    // Stances the views engine keeps, so a reader reads one by its id; the
    // first adult is in focus, so their weighing leaves records.
    const stances = api.moduleState(VIEWS_MODULE_ID).table("stances");
    adults.forEach((adult, i) => {
      const question = PLATFORM_QUESTIONS[i % PLATFORM_QUESTIONS.length]!;
      stances.put({
        id: `${adult.id}:${question}`,
        personId: adult.id,
        topic: question,
        desiredChange: i % 2 ? "repeal" : "enact",
        strength: 0.1 + i / 100,
        causes: [],
      } as never);
    });
    const watched = adults[0]!.id;
    core.focusPersonIds.add(watched);
    const ids = [
      ...adults.map((p) => p.id),
      "official:fixture:a",
      "official:fixture:b",
    ];
    for (const id of ids)
      for (const party of labels) {
        const reader = stanceReader(api, id, party);
        for (const round of [1, 2])
          for (const q of PLATFORM_QUESTIONS) {
            const kept = core.durableLog.size;
            const read = reader.stance(q);
            const byReader = core.durableLog.size - kept;
            const fresh = candidateStance(api, id, party, q);
            const byFresh = core.durableLog.size - kept - byReader;
            const at = `${where} ${id} ${party} ${q} round ${round}`;
            // Object.is: the same number, a -0 included.
            expect(Object.is(read, fresh), at).toBe(true);
            expect(byReader, at).toBe(byFresh);
            expect(reader.lastVote(q), at).toBe(
              votesOf(api, id)
                .filter((v) => v.stance.question === q)
                .at(-1),
            );
          }
      }
    const weighed = [...core.durableLog.values()].filter(
      (r) => r.kind === "person.weighed" && r.actorId === watched,
    );
    expect(weighed.length, where).toBeGreaterThan(0);
  }, 300_000);
});
