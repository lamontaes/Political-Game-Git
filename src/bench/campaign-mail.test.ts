/**
 * Mail and the donor meeting from the Campaigns screen (campaign-like-real-
 * races, phase A): the player's Mail act spends the amount they set on
 * mailers through the campaign engine's `sendMail`, never past what the
 * campaign holds, and the house party outing is offered by its control word
 * and runs the engine's donor meeting, in a random place drawn from all 56.
 */
import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildPopulation } from "../core2/population";
import { createLifeCore } from "../core2/life";
import { coreAPI } from "../core2/state";
import type { CoreState } from "../core2/types";
import { openLaws } from "../core2/modules/laws";
import { openOffices } from "../core2/modules/offices";
import { openRecord } from "../core2/modules/record";
import { openParties } from "../core2/modules/parties";
import { openPress } from "../core2/modules/press";
import { viewsModule } from "../core2/modules/views";
import {
  ELECTIONS_MODULE_ID,
  fileCandidacy,
  openContests,
  openElections,
  type FilingRow,
} from "../core2/modules/elections";
import {
  CAMPAIGNS_MODULE_ID,
  campaignFor,
  openCampaigns,
  unitPrice,
  type CauseRow,
} from "../core2/modules/campaigns";
import { PLATFORM_QUESTIONS } from "../core2/campaign-views";
import { takeCampaignDayChoice } from "../core2/campaign-day";
import { campaignAct, campaignDay, campaignView } from "./campaign";
import controls from "./data/controls.json" with { type: "json" };

const START = "2026-01-05";
const runSeed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`campaign-mail:${Date.now()}`).digest("hex");

function world() {
  const place = drawPlace(runSeed, "campaign-mail");
  const core = createLifeCore(
    buildPopulation({
      seed: place.seed,
      placeKey: place.key,
      startedAt: START,
      minimumPeople: 300,
    }),
    { modules: [viewsModule] },
  ) as CoreState;
  openLaws(core);
  openOffices(core, place.seed);
  openElections(core);
  openCampaigns(core);
  openParties(core);
  openRecord(core);
  openPress(core);
  const api = coreAPI(core);
  const town = (
    api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("town")
      .get("town") as unknown as { townPlaceId: string }
  ).townPlaceId;
  const where = `${place.name}, ${place.state} (${place.key}), run seed ${runSeed}, place seed ${place.seed}`;
  // A resident old enough to file, with the most cash: they can fund mail.
  const residents = [...core.people.values()]
    .filter(
      (p) =>
        p.alive &&
        p.placeId === town &&
        Number(START.slice(0, 4)) - Number(p.birthDate.slice(0, 4)) >= 35,
    )
    .sort((a, b) => b.liquidMinor - a.liquidMinor || a.id.localeCompare(b.id));
  let filing: FilingRow | null = null;
  for (const candidate of residents.slice(0, 5)) {
    core.playerId = candidate.id;
    // A local seat, or what a place with none (a territory's towns) has.
    const open = openContests(api);
    const local = open.filter(
      (c) => c.level !== "federal" && c.level !== "state",
    );
    for (const contest of local.length ? local : open) {
      const filed = fileCandidacy(api, {
        personId: candidate.id,
        contestId: contest.id,
        platform: [`${PLATFORM_QUESTIONS[0]}=1`],
      });
      if (
        filed.status !== "refused" &&
        ["petitioning", "on-ballot"].includes(filed.filing.status ?? "")
      ) {
        filing = filed.filing;
        break;
      }
    }
    if (filing) break;
  }
  return { core, api, filing, where };
}

it("mail spends what the player set on mailers and reaches the households it buys", () => {
  const { core, api, filing, where } = world();
  expect(filing, `nobody could file: ${where}`).not.toBeNull();
  const id = filing!.id;
  const personId = filing!.personId;
  const perPiece = unitPrice(api, "mailer-print") + unitPrice(api, "postage");

  // With nothing raised, mail buys nothing.
  const empty = campaignAct(core, personId, {
    filingId: id,
    kind: "mail",
    amountMinor: 50 * perPiece,
  }) as { reached: number; spentMinor: number };
  expect(empty.spentMinor, where).toBe(0);
  expect(empty.reached, where).toBe(0);

  // The player puts in their own money, then sends mail with part of it.
  const put = Math.min(
    100 * perPiece,
    Math.floor((core.people.get(personId)?.liquidMinor ?? 0) / 2),
  );
  campaignAct(core, personId, {
    filingId: id,
    kind: "contribute",
    amountMinor: put,
  });
  const held =
    campaignFor(api, id).raisedMinor - campaignFor(api, id).spentMinor;
  expect(held, `the candidate's own money is in: ${where}`).toBeGreaterThan(
    perPiece,
  );
  const amount = Math.min(held, 20 * perPiece + perPiece - 1);
  const before = campaignFor(api, id);
  const purchases = () =>
    (
      api.moduleState(CAMPAIGNS_MODULE_ID).table("money").rows() as unknown as {
        kind: string;
      }[]
    ).filter((r) => r.kind === "campaigns:purchase").length;
  const purchasesBefore = purchases();
  const sent = campaignAct(core, personId, {
    filingId: id,
    kind: "mail",
    amountMinor: amount,
  }) as { reached: number; spentMinor: number; causes: CauseRow[] };
  const after = campaignFor(api, id);
  // Whole mailers, as many as the amount buys: never more than it.
  expect(sent.spentMinor, where).toBeGreaterThan(0);
  expect(sent.spentMinor % perPiece, where).toBe(0);
  expect(sent.spentMinor, where).toBeLessThanOrEqual(amount);
  expect(amount - sent.spentMinor, where).toBeLessThan(perPiece);
  expect(after.spentMinor - before.spentMinor, where).toBe(sent.spentMinor);
  expect(
    (after.spentByKind?.mail ?? 0) - (before.spentByKind?.mail ?? 0),
    where,
  ).toBe(sent.spentMinor);
  expect(purchases() - purchasesBefore, `on the journal: ${where}`).toBe(1);
  // Each full adult it reached is a recorded mail cause; counted households
  // are counted as reached.
  expect(
    sent.reached + (after.countedReached ?? 0) - (before.countedReached ?? 0),
    `mail reached someone: ${where}`,
  ).toBeGreaterThan(0);
  for (const cause of sent.causes) {
    expect(cause.act, where).toBe("mail");
    expect(cause.candidateId, where).toBe(personId);
  }

  // Asking for more than the campaign holds spends no more than it holds.
  const left = after.raisedMinor - after.spentMinor;
  const big = campaignAct(core, personId, {
    filingId: id,
    kind: "mail",
    amountMinor: left * 10 + perPiece,
  }) as { spentMinor: number };
  expect(big.spentMinor, where).toBeLessThanOrEqual(left);
  const end = campaignFor(api, id);
  expect(end.raisedMinor - end.spentMinor, where).toBeGreaterThanOrEqual(0);
  // The screen's Mail control is worded.
  expect(controls.campaignActs.mail, where).toBeTruthy();
});

it("offers the house party by its control word and runs the engine's donor meeting", () => {
  const { core, api, filing, where } = world();
  expect(filing, `nobody could file: ${where}`).not.toBeNull();
  const id = filing!.id;
  const personId = filing!.personId;
  const view = () =>
    campaignView(core, personId).campaigns.find((c) => c.filing.id === id)!;
  const party = () => view().outings.find((o) => o.outing === "party");
  expect(party(), where).toBeDefined();
  expect(controls.campaignOutings.party, where).toBeTruthy();
  // The town hears of the candidate first: a few shifts of doors.
  for (let shift = 0; shift < 4 && !party()!.available; shift += 1)
    takeCampaignDayChoice(api, id, "canvass");
  const offered = party()!;
  if (!offered.available) {
    // Nobody close to the candidate would host: the screen says so in words.
    expect(offered.why?.key, where).toBe("noHost");
    expect(controls.campaignUnavailable.noHost, where).toBeTruthy();
    return;
  }
  const out = campaignDay(core, personId, {
    filingId: id,
    kind: "donor-meeting",
  });
  expect(out.kind, where).toBe("donor-meeting");
  // Each person in the room was asked, by name, with what they gave or why not.
  expect(out.calls.length, where).toBeGreaterThan(0);
  for (const call of out.calls) {
    expect(call.name, where).toBeTruthy();
    expect(call.line, `${call.personId} ${call.why}: ${where}`).toBeTruthy();
  }
  expect(out.callsLine, where).toBeTruthy();
  expect(out.raisedMinor, where).toBe(
    out.calls.reduce((t, c) => t + c.givenMinor, 0),
  );
  // Seen in the host's home, the people in the room around the candidate.
  expect(out.scene, where).toBeDefined();
  expect(
    out.scene!.people.length + out.scene!.unplaced.length,
    where,
  ).toBeGreaterThan(0);
});
