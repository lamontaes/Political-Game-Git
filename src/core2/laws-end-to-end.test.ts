/**
 * The laws lead's acceptance (laws-end-to-end-proof): one played life follows
 * a law from the player's own bill to a named person and back, in a place
 * drawn from all 56, every link by record id.
 *
 * The player takes control of a sitting member of a body in their town
 * (`BenchPlayer.select`, the play screen's own control) and drafts a price
 * law from their seat's menu. They offer each colleague a favor, and "back
 * their item" where the favor is refused; each offer is a deal row on the
 * bill with its answer. The members vote at the meeting, each from their
 * recorded position (views, constituents, the deal, traits), never a roll.
 * The test then lives out one year from the opening. When the bill passes:
 *   - the law row the bill made (`terms.enactedByBill`) governs the town;
 *   - law reach records it reaching a named person's household (`lawApplied`);
 *   - the price engine records what that household paid or got back (`felt`);
 *   - the person heard the press story about it (news `heard`);
 *   - they tie the change to the law (`law.effect-learned`, citing the story);
 *   - their stance on the question cites what they learned;
 *   - the director's scene and their journal tell it, citing the learned record.
 * A second drawn place where the bill fails shows each member's vote and the
 * position it came from.
 *
 * As in play, the scene and the journal are the player's circle's: the town's
 * residents are followed (focus and the director's watch), so their private
 * learned records are kept, as src/director/law-effect-scene.test.ts does.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { BenchPlayer } from "../bench/player";
import { seatAct, seatView } from "../bench/legislature";
import { colleagueDeal, officeView } from "../bench/office";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { coreAPI } from "./state";
import type { PersonId } from "./types";
import { lawChain, lawInForce, LAWS_MODULE_ID } from "./modules/laws";
import { LEGISLATURE_MODULE_ID, votesOn } from "./modules/legislature";
import {
  adjourn,
  deskWaiting,
  leaveDeskToCharacter,
  meetingInProgress,
  officeHost,
  takeUpItem,
} from "./modules/office-day";
import { officeActHandlers } from "./office-day-acts";
import { actOn, waitingEntries } from "./office-day-state";
import { PLACE_PRICES_MODULE_ID } from "./modules/place-prices";
import { newsKey } from "./modules/news";
import { appliedTo } from "./law-reach/applied";
import { stancesOf } from "./modules/views";
import { composeJournal } from "../director/journal";
import { composeScene } from "../director/scene";
import { questionAxis } from "./campaign-views";

const seed = process.env.LAWS_E2E_SEED ?? randomBytes(16).toString("hex");
/** Draws tried for each outcome before the test says none held it. */
const DRAWS = 12;
/** The town residents followed, as the scene test follows them. */
const FOLLOWED = 80;
/** The price laws, by question, that the price engine charges and refunds under (place-prices PRICE_LAWS). */
const PRICE_QUESTIONS = [
  "environment-energy.bottle-deposit",
  "transportation-infrastructure.fare-free-transit",
  "transportation-infrastructure.public-broadband",
  "environment-energy.clean-electricity-standard",
  "transportation-infrastructure.mileage-fee-replaces-fuel-tax",
  "environment-energy.allow-retail-electric-choice",
  "environment-energy.price-carbon",
]
  .map((q) => `us-policy-positions:${q}`)
  // A member reads a question by their own views and their district's lean,
  // each a lean times the question's axis, so a question with a measured axis
  // is drafted first. Most town bodies may enact only fare-free transit, which
  // has none yet: every member reads it as nothing, and the vote turns on the
  // deals and traits alone (laws-price-questions-without-an-axis).
  .sort(
    (a, b) => Number(questionAxis(a) === 0) - Number(questionAxis(b) === 0),
  );

interface Deal {
  memberId: string;
  kind: string;
  status: string;
  date: string;
}
interface Bill {
  id: string;
  status: string;
  agendaDate?: string;
  deals: Deal[];
}

/** One drawn place played: the player's bill drafted, negotiated and voted. */
function playBill(drawSeed: string) {
  const place = drawPlace(drawSeed, "laws-end-to-end");
  const where = `${place.name} (${place.key}), seed ${place.seed}`;
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const core = world.core;
  const api = coreAPI(core);
  const town = lawChain(api).townPlaceId;
  const start = core.date;
  const members = [...core.people.values()]
    .filter((p) => p.alive && p.tier !== "husk" && p.placeId === town)
    .map((p) => p.id)
    .filter((id) => seatView(core, id).bodies.length);
  const player = new BenchPlayer(core, world.director);
  // The first member whose seat may enact a price law drafts it.
  let drafted: { holder: string; question: string; bill: Bill } | undefined;
  for (const holder of members) {
    const seat = seatView(core, holder);
    for (const body of seat.bodies)
      for (const question of PRICE_QUESTIONS) {
        if (drafted || !seat.questions.includes(question)) continue;
        player.select(holder);
        const bill = seatAct(core, holder, {
          kind: "draft",
          officeId: body.officeId,
          question,
          value: 1,
        }) as unknown as Bill;
        if (bill.status !== "blocked") drafted = { holder, question, bill };
      }
    if (drafted) break;
  }
  if (!drafted)
    return { where, skipped: `${where}: no seat may enact a price law` };
  const { holder, question } = drafted;
  const billRow = () =>
    api
      .moduleState(LEGISLATURE_MODULE_ID)
      .table("bills")
      .get(drafted!.bill.id) as unknown as Bill;
  // Negotiation: each colleague is offered a favor, then backing for their
  // own item where they refuse; the deal rows keep each offer and its answer.
  const colleagues =
    officeView(core, holder).deals.find(
      (row: { billId: string }) => row.billId === drafted!.bill.id,
    )?.colleagues ?? [];
  for (const colleague of colleagues as { key: string }[])
    for (const kind of ["favor", "back-their-item"]) {
      colleagueDeal(core, holder, colleague.key, kind);
      officeActHandlers(officeHost)["talk-to-colleague"](api, holder, {
        targetId: colleague.key,
      } as never);
      const answer = billRow()
        .deals.filter((d) => d.memberId === colleague.key)
        .at(-1);
      if (answer && answer.status !== "declined") break;
    }
  /** Lives on a week at a time; a meeting or the desk holding the clock is the character's own to do. */
  const liveUntil = (date: string) => {
    for (let guard = 0; core.date < date && guard < 400; guard++) {
      // An election day stops at the polls; the races are the character's own to leave.
      if (player.pollingPlace) player.leavePolls();
      const packet =
        player.packet?.kind === "stop"
          ? player.packet
          : player.advance(
              "calendar",
              addDays(makeIsoDate(player.packet?.at.date ?? core.date), 7),
            ).packet;
      if (packet.kind !== "stop") continue;
      const meeting = meetingInProgress(api);
      if (meeting) {
        for (const id of meeting.agenda) takeUpItem(api, meeting.id, id, "own");
        adjourn(api, meeting.id);
      }
      for (const bill of deskWaiting(api)) leaveDeskToCharacter(api, bill.id);
      for (const entry of waitingEntries(api, holder)) actOn(api, entry);
      player.resume({ kind: "stop", pauseId: packet.pauseId });
    }
  };
  liveUntil(addDays(makeIsoDate(drafted.bill.agendaDate ?? core.date), 2));
  return {
    where,
    world,
    core,
    api,
    town,
    start,
    holder,
    question,
    bill: billRow(),
    votes: votesOn(api, drafted.bill.id),
    liveUntil,
  };
}

type Played = Exclude<ReturnType<typeof playBill>, { skipped: string }>;

/** Each vote is a member's, with the position it came from. */
function expectReasonedVotes(played: Played) {
  const { votes, where, bill } = played;
  expect(votes.length, `${where}: ${bill.id} has no votes`).toBeGreaterThan(0);
  for (const vote of votes) {
    expect(vote.position.memberId, `${where}: ${vote.memberId}`).toBe(
      vote.memberId,
    );
    for (const reason of ["views", "constituents", "deal", "trait"] as const)
      expect(
        Number.isFinite(vote.position[reason]),
        `${where}: ${vote.memberId}'s ${reason}`,
      ).toBe(true);
  }
  // The members' own reads of their lives and districts weigh on the vote
  // wherever the question has an axis (laws-price-questions-without-an-axis).
  if (questionAxis(played.question) !== 0)
    expect(
      votes.some(
        (v) => v.position.views !== 0 || v.position.constituents !== 0,
      ),
      `${where}: no member's views or district read ${bill.id}`,
    ).toBe(true);
  return votes
    .map(
      (v) =>
        `${v.memberId} ${v.vote} (views ${v.position.views.toFixed(2)}, constituents ${v.position.constituents.toFixed(2)}, deal ${v.position.deal.toFixed(2)}, trait ${v.position.trait.toFixed(2)})`,
    )
    .join("; ");
}

/** Draws places until one plays the bill to `outcome`, naming those passed over. */
function drawUntil(outcome: (bill: Bill) => boolean, label: string): Played {
  const passed: string[] = [];
  for (let draw = 0; draw < DRAWS; draw += 1) {
    const played = playBill(`${seed}:${label}:${draw}`);
    if ("skipped" in played) {
      passed.push(played.skipped!);
      continue;
    }
    if (outcome(played.bill)) {
      if (passed.length)
        process.stdout.write(`${label}: passed over ${passed.join("; ")}\n`);
      return played;
    }
    passed.push(`${played.where}: ${played.bill.status}`);
  }
  throw new Error(`No drawn place's bill was ${label}: ${passed.join("; ")}`);
}

const enacted = (bill: Bill) => bill.status === "enacted";

it(`a player's bill passes by the members' reasons and its law reaches a named person, who learns of it from the news (seed ${seed})`, () => {
  setBookkeeping(false);
  try {
    const played = drawUntil(enacted, "enacted");
    const { core, api, where, bill, question, town, world, start } = played;
    // The negotiation: every offer the player made is a deal row with its answer.
    expect(bill.deals.length, `${where}: no deal offered`).toBeGreaterThan(0);
    const reasons = expectReasonedVotes(played);
    // The law the bill made governs the town.
    const law = (
      api.moduleState(LAWS_MODULE_ID).table("laws").rows() as unknown as {
        id: string;
        effectiveDate: string;
        terms?: { enactedByBill?: string };
      }[]
    ).find((row) => row.terms?.enactedByBill === bill.id);
    expect(law, `${where}: ${bill.id} made no law`).toBeDefined();
    // The town's residents are followed, as the player's circle is in play.
    const residents = [...core.people.values()]
      .filter((p) => p.alive && p.placeId === town && p.tier !== "husk")
      .map((p) => p.id as PersonId)
      .sort()
      .slice(0, FOLLOWED);
    for (const id of residents) {
      core.focusPersonIds.add(id);
      world.director.watch(core, id);
    }
    // Live out the year, a day at a time once the law is in force, so the
    // scene of the first learned effect is read the day it is staged.
    played.liveUntil(law!.effectiveDate);
    expect(
      lawInForce(api, question, law!.effectiveDate).governing?.id,
      `${where}: ${law!.id} does not govern the town`,
    ).toBe(law!.id);
    const yearEnd = addDays(makeIsoDate(start), 365);
    let chain: string | undefined;
    while (core.date < yearEnd && !chain) {
      played.liveUntil(addDays(makeIsoDate(core.date), 1));
      chain = followLearned(played, law!.id, residents);
    }
    expect(
      chain,
      `${where}: nobody followed learned ${law!.id} by ${core.date}`,
    ).toBeDefined();
    played.liveUntil(yearEnd);
    process.stdout.write(
      `LAWS END TO END ${where}: bill ${bill.id} ${bill.status}; deals ${bill.deals.map((d) => `${d.memberId} ${d.kind} ${d.status}`).join(", ")}; votes ${reasons}; law ${law!.id} effective ${law!.effectiveDate}; ${chain}; lived to ${core.date}\n`,
    );
  } finally {
    setBookkeeping(true);
  }
}, 3_600_000);

/**
 * The chain for one followed person who learned the law's effect today: the
 * law reaching their household, what it moved, the story they heard, the
 * stance it moved and the scene and journal lines. Undefined until someone has.
 */
function followLearned(
  played: Played,
  lawId: string,
  followed: readonly PersonId[],
): string | undefined {
  const { core, api, where, question, world } = played;
  const learned = [...(core.logByKind.get("law.effect-learned") ?? [])]
    .map((id) => core.durableLog.get(id)!)
    .filter(
      (row) =>
        row.facts?.lawId === lawId &&
        followed.includes(row.personIds![0] as PersonId),
    );
  for (const event of learned) {
    const personId = event.personIds![0] as PersonId;
    const householdId = core.people.get(personId)!.householdId;
    // The law reached their household (law reach's record) ...
    const applied = appliedTo(api, householdId).find(
      (row) => row.lawId === lawId,
    );
    // ... and moved what it paid or got back (the price engine's record).
    const felt = api
      .moduleState(PLACE_PRICES_MODULE_ID)
      .table("felt")
      .get(`${householdId}|${lawId}`) as unknown as
      { movedMinor: number; ruleId: string } | undefined;
    const story = String(event.facts?.learnedFrom ?? "");
    const heard = storyHeard(api, personId, lawId, story);
    const stance = stancesOf(api, personId).find((s) => s.topic === question);
    const book = world.director.ledger.people.get(personId);
    const moment = [...(book?.momentsById.values() ?? [])].find(
      (m) => m.causeId === event.id,
    );
    if (!applied || !felt || !heard || !moment) continue;
    expect(felt.movedMinor, `${where}: ${event.id}`).not.toBe(0);
    expect(String(event.facts?.movedMinor), `${where}: ${event.id}`).toBe(
      String(felt.movedMinor),
    );
    // The stance on the law's question cites what they learned and how.
    expect(stance, `${where}: ${personId} holds no stance`).toBeDefined();
    expect(
      stance!.causes.some(
        (c) => c.learnedFrom === story || c.eventId === String(event.id),
      ),
      `${where}: ${personId}'s stance does not cite ${event.id} from ${story}`,
    ).toBe(true);
    // The director's scene and the journal tell it, citing the learned record.
    const entry = book!.schedule.find((row) => row.momentId === moment.id);
    if (!entry?.bindings.length) continue;
    const scene = composeScene(core, world.director, personId, entry);
    const sceneLine = scene?.narration.find((row) =>
      row.sourceRecordIds.includes(String(event.id)),
    );
    const journalLine = composeJournal(core, world.director, personId)
      .flatMap((chapter) => chapter.lines)
      .find((row) => row.sourceRecordIds.includes(String(event.id)));
    expect(
      journalLine,
      `${where}: no journal line cites ${event.id}`,
    ).toBeDefined();
    expect(
      sceneLine,
      `${where}: no scene line cites ${event.id}`,
    ).toBeDefined();
    return `person ${personId} (household ${householdId}): lawApplied ${applied.id}, felt ${felt.ruleId} moved ${felt.movedMinor}, heard ${heard}, learned ${event.id}, stance cites it, scene "${sceneLine!.text}", journal "${journalLine!.text}"`;
  }
  return undefined;
}

/**
 * The press story the person heard about the law: the price engine's record
 * of what they learned names it, the learned event cites its news key, and the
 * story itself is about this law.
 */
function storyHeard(
  api: ReturnType<typeof coreAPI>,
  personId: string,
  lawId: string,
  key: string,
): string | undefined {
  const row = api
    .moduleState(PLACE_PRICES_MODULE_ID)
    .table("learned")
    .get(`${personId}|${lawId}`) as unknown as { storyId: string } | undefined;
  if (!row || newsKey(row.storyId) !== key) return undefined;
  const story = api.moduleState("news").table("stories").get(row.storyId) as
    { facts?: { lawId?: string } } | undefined;
  // The news keeps a story a month; past that, the learned record holds it.
  return !story || story.facts?.lawId === lawId ? row.storyId : undefined;
}

it(`a player's bill that fails shows each member's vote and its reasons (seed ${seed})`, () => {
  setBookkeeping(false);
  try {
    const played = drawUntil((bill) => bill.status === "failed", "failed");
    const reasons = expectReasonedVotes(played);
    const yes = played.votes.filter((v) => v.vote === "yes").length;
    expect(
      yes * 2,
      `${played.where}: ${played.bill.id} failed with a majority`,
    ).toBeLessThanOrEqual(played.votes.length);
    process.stdout.write(
      `LAWS END TO END FAILED ${played.where}: bill ${played.bill.id}; deals ${played.bill.deals.map((d) => `${d.memberId} ${d.kind} ${d.status}`).join(", ")}; votes ${reasons}\n`,
    );
  } finally {
    setBookkeeping(true);
  }
}, 3_600_000);
