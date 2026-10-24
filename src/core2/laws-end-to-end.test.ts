/**
 * A law from negotiation to a named person and back, in one played world
 * (laws-end-to-end-proof). The town's member of the state house, played,
 * drafts a bill for a state price law (a bottle deposit, a carbon price and
 * the like: the first the state has not enacted and the house may pass);
 * learns two colleagues' stakes, one in conversation and one from the record;
 * offers the persuadable one a trade on the record; and the bill goes
 * through committee, both chambers and the governor on each member's own
 * recorded reasons. Where it passes, the law in force changes, the price
 * engine settles households' bills under it and records whom it reached, a
 * reached person who heard the story ties the change to the law citing that
 * story, their view moves with it as the cited cause, and the director gives
 * them the moment and their journal says so. A second drawn place where the
 * same kind of bill fails shows each member's reasons. Places are drawn from
 * all 56 on a seed nobody chose (LAWS_E2E_SEED pins one); every place passed
 * over is named.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { composeJournal } from "../director/journal";
import { composeScene } from "../director/scene";
import { SCENE_BANK, sceneWordsFromBank } from "../director/mined/scene-bank";
import {
  JOURNAL_BANK,
  journalDataFromBank,
} from "../director/mined/journal-bank";
import { billCatalog, provisionFor } from "./bill-catalog";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { appliedOn } from "./law-reach/applied";
import { advanceCore } from "./life";
import {
  billOf,
  committeeRecords,
  draftBill,
  holdVote,
  learnStake,
  members,
  obligationsOf,
  offerDeal,
  votesOn,
  type MemberPosition,
} from "./modules/legislature";
import { lawChain, LAWS_MODULE_ID } from "./modules/laws";
import { onStoryHeard, storiesHeard } from "./modules/news";
import { PLACE_PRICES_MODULE_ID } from "./modules/place-prices";
import { townSeats } from "./modules/offices";
import { stancesOf } from "./modules/views";
import { coreAPI } from "./state";
import type { LawRowInput } from "./laws-starting";
import type { CoreAPI, CoreState } from "./types";

const seed = process.env.LAWS_E2E_SEED ?? randomBytes(12).toString("hex");
/** State price laws the price engine settles households' bills under. */
const KEYS = [
  "us-policy-positions:environment-energy.bottle-deposit",
  "us-policy-positions:environment-energy.price-carbon",
  "us-policy-positions:environment-energy.clean-electricity-standard",
  "us-policy-positions:transportation-infrastructure.mileage-fee-replaces-fuel-tax",
  "us-policy-positions:transportation-infrastructure.public-broadband",
];
const PASSED = new Set(["enacted", "signed", "overridden"]);
const FAILED = new Set(["failed", "vetoed", "dropped", "blocked"]);

interface Played {
  readonly where: string;
  readonly core: CoreState;
  readonly api: CoreAPI;
  readonly director: ReturnType<typeof buildBenchWorld>["director"];
  readonly playerId: string;
  readonly key: string;
  readonly billId: string;
  readonly billNumber: string;
  readonly status: string;
}

/**
 * Every recorded reason a member's position sums (legislature.ts
 * `positionOn`, and the executive's own part at signing), by name.
 */
function reasonsOf(position: MemberPosition): Record<string, number> {
  return {
    views: position.views,
    constituents: position.constituents,
    sponsor: position.sponsor,
    deal: position.deal,
    lobby: position.lobby,
    consistency: position.consistency,
    bribe: position.bribe,
    party: position.party ?? 0,
    wing: position.wing ?? 0,
    ambition: position.ambition ?? 0,
    press: position.press ?? 0,
    trait: position.trait,
    executive:
      (position as MemberPosition & { executive?: number }).executive ?? 0,
  };
}

/** Whether a policy question is law at any level of the town's chain today. */
function inForce(api: CoreAPI, key: string): boolean {
  const rows = api
    .moduleState(LAWS_MODULE_ID)
    .table("laws")
    .query("bySeriesOnly", [key]) as unknown as LawRowInput[];
  return lawChain(api).levels.some((level) => {
    const latest = rows
      .filter(
        (r) =>
          r.jurisdiction === level.jurisdiction &&
          r.effectiveDate <= api.state.date,
      )
      .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))[0];
    return latest?.value === 1;
  });
}

/**
 * Draw a place, play the town's state house member through drafting a state
 * price law, negotiating for it and the vote.
 */
function play(attempt: number, tried: string[]): Played | null {
  const drawn = drawPlace(seed, `laws-end-to-end:${attempt}`);
  const where = `${drawn.name} (${drawn.key}), seed ${seed}, draw ${attempt}`;
  const { core, director } = buildBenchWorld(drawn.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: drawn.key,
  });
  const api = coreAPI(core);
  // The town's seat in the state's lawmaking chamber: the lower house, or the
  // one chamber where the legislature has only one.
  const seat =
    townSeats(api).find(
      (row) => row.office.kind === "legislature-lower" && row.holder,
    ) ??
    townSeats(api).find(
      (row) => row.office.kind === "legislature-unicameral" && row.holder,
    );
  if (!seat) {
    tried.push(`${where}: no seat in the state legislature`);
    return null;
  }
  const playerId = seat.holder!.personId ?? `official:${seat.holder!.id}`;
  if (!core.people.get(playerId)?.alive) {
    tried.push(`${where}: the house member ${playerId} is not on record`);
    return null;
  }
  const catalog = billCatalog(api, "state").flatMap((subject) =>
    subject.topics.flatMap((topic) => topic.policies),
  );
  const key = KEYS.find(
    (k) =>
      !inForce(api, k) &&
      catalog.find((row) => row.id === `question:${k}`)?.authority.allowed,
  );
  if (!key) {
    tried.push(
      `${where}: every state price law is in force or not the house's`,
    );
    return null;
  }
  director.watch(core, playerId);
  const officeId = seat.office.id;
  // 1. The player's bill.
  const bill = draftBill(api, {
    bodyOfficeId: officeId,
    sponsorId: playerId,
    provisions: [
      provisionFor({ policyId: `question:${key}`, operation: "enact" }),
    ],
  });
  // 2. Negotiation: learn two colleagues' stakes, then offer the persuadable
  // one a trade, which goes on the record taken or declined.
  const colleagues = members(api, officeId)
    .map((term) => term.personId ?? `official:${term.id}`)
    .filter((id) => id !== playerId && core.people.get(id)?.alive)
    .sort();
  const stakes = colleagues
    .slice(0, 2)
    .map((id, i) =>
      learnStake(api, bill.id, id, i === 0 ? "conversation" : "record"),
    );
  // The persuadable one: against the bill or undecided and nearest to for
  // it (a trade wins a vote only where it tips the member's own sum).
  const target =
    [...stakes]
      .filter((s) => s.total <= 0)
      .sort((a, b) => b.total - a.total)[0] ??
    [...stakes].sort((a, b) => a.total - b.total)[0];
  expect(target, `${where}: two colleagues to negotiate with`).toBeDefined();
  const deal = offerDeal(api, {
    billId: bill.id,
    memberId: target!.memberId,
    kind: "back-their-item",
  });
  const offer = billOf(api, bill.id).deals.at(-1);
  expect(offer, `${where}: the offer is on the record`).toBeDefined();
  if (deal.accepted)
    expect(
      obligationsOf(api, playerId).some((o) => o.owedTo === target!.memberId),
      `${where}: the player owes the trade`,
    ).toBe(true);
  console.info(
    `laws-e2e ${where}: ${key} bill ${bill.number}; stakes ${stakes.map((s) => `${s.memberId} ${s.total.toFixed(3)}`).join(", ")}; offered ${target!.memberId} back-their-item, ${deal.accepted ? "taken" : "declined"} (${JSON.stringify(offer)})`,
  );
  // 3. Committee, both chambers and the governor, on members' reasons.
  const status = holdVote(api, bill.id).status;
  const votes = votesOn(api, bill.id);
  const tradedVote = votes
    .filter((v) => v.memberId === target!.memberId)
    .at(-1);
  // No dice: each vote is the sum of the member's recorded reasons.
  for (const v of votes)
    if (v.position)
      expect(v.position.total, `${where}: ${v.id}`).toBeCloseTo(
        Object.values(reasonsOf(v.position)).reduce((a, b) => a + b, 0),
        6,
      );
  console.info(
    `laws-e2e ${where}: bill ${bill.number} ${status}; ${votes.length} votes (${[
      ...votes.reduce(
        (by, v) =>
          by.set(
            v.memberId.split(":")[4] ?? "?",
            (by.get(v.memberId.split(":")[4] ?? "?") ?? 0) + 1,
          ),
        new Map<string, number>(),
      ),
    ]
      .map(([body, n]) => `${body} ${n}`)
      .join(
        ", ",
      )}; ${new Set(votes.map((v) => v.memberId)).size} members; yes ${votes.filter((v) => v.vote === "yes").length}, no ${votes.filter((v) => v.vote === "no").length}; the traded member's last vote ${tradedVote ? `${tradedVote.vote} (deal ${(tradedVote.position?.deal ?? 0).toFixed(3)}, total ${(tradedVote.position?.total ?? 0).toFixed(3)})` : "none"}), e.g. ${votes
      .slice(0, 4)
      .map(
        (v) =>
          `${v.id} ${v.vote}${
            v.position
              ? ` (${Object.entries(reasonsOf(v.position))
                  .filter(([, n]) => n !== 0)
                  .map(([reason, n]) => `${reason} ${n.toFixed(3)}`)
                  .join(", ")})`
              : ""
          }`,
      )
      .join("; ")}`,
  );
  return {
    where,
    core,
    api,
    director,
    playerId,
    key,
    billId: bill.id,
    billNumber: bill.number,
    status,
  };
}

/** The law rows the bill wrote (each names the bill that enacted it). */
function lawRowsOf(api: CoreAPI, played: Played): LawRowInput[] {
  return (
    api
      .moduleState(LAWS_MODULE_ID)
      .table("laws")
      .query("bySeriesOnly", [played.key]) as unknown as (LawRowInput & {
      terms?: { enactedBy?: string; enactedByBill?: string };
    })[]
  ).filter(
    (row) =>
      row.terms?.enactedBy === played.billNumber ||
      row.terms?.enactedByBill === played.billId,
  );
}

it(`a player's bill is followed from negotiation to a named person and back, and fails elsewhere on members' reasons (seed ${seed})`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  let passed: Played | null = null;
  let failed: Played | null = null;
  for (let attempt = 0; attempt < 16 && (!passed || !failed); attempt += 1) {
    const run = play(attempt, tried);
    if (!run) continue;
    if (PASSED.has(run.status) && !passed) passed = run;
    else if (FAILED.has(run.status) && !failed) failed = run;
    else tried.push(`${run.where}: bill ${run.status}`);
  }
  console.info(`laws-e2e passed over: ${tried.join("; ") || "none"}`);
  expect(
    passed,
    `no drawn place passed it: ${tried.join("; ")}`,
  ).not.toBeNull();
  expect(
    failed,
    `no drawn place failed it: ${tried.join("; ")}`,
  ).not.toBeNull();

  // The failed bill: where it died, the reasons that killed it are on the
  // record: each floor vote's, each committee member's, or, for a bill its
  // committee's chair held without a hearing, the chair's own.
  const lost = votesOn(failed!.api, failed!.billId);
  const committees = committeeRecords(failed!.api, failed!.billId);
  const held = committees.find((c) => !c.reported);
  const reasons = [
    ...lost.flatMap((v) => (v.position ? [`${v.id} ${v.vote}`] : [])),
    ...committees.flatMap((c) =>
      c.votes.map((v) => `${c.id} ${v.memberId} ${v.vote}`),
    ),
  ];
  for (const c of committees)
    for (const v of c.votes)
      expect(v.position.total, `${failed!.where}: ${c.id}`).toBeCloseTo(
        Object.values(reasonsOf(v.position)).reduce((a, b) => a + b, 0),
        6,
      );
  if (held && !held.heard) {
    // Held without a hearing: the chair's position plus their temperament's
    // pull toward a hearing came out below zero.
    const chair = held.chairReasons;
    expect(
      chair.position.total + chair.hearingTrait,
      `${failed!.where}: ${held.id}`,
    ).toBeLessThan(0);
    console.info(
      `laws-e2e ${failed!.where}: FAILED bill ${failed!.billNumber} held in committee ${held.committee} (${held.id}); chair ${held.chairId}: ${Object.entries(
        reasonsOf(chair.position),
      )
        .filter(([, n]) => n !== 0)
        .map(([reason, n]) => `${reason} ${n.toFixed(3)}`)
        .join(", ")}, hearing temperament ${chair.hearingTrait.toFixed(3)}`,
    );
  } else {
    expect(reasons.length, failed!.where).toBeGreaterThan(2);
    console.info(
      `laws-e2e ${failed!.where}: FAILED bill ${failed!.billNumber} ${failed!.status}; ${reasons.length} recorded votes, e.g. ${reasons.slice(0, 4).join("; ")}`,
    );
  }

  // The passed bill: the law in force changes on its day.
  const { core, api, director, where, key } = passed!;
  const rows = lawRowsOf(api, passed!);
  expect(rows.length, `${where}: the bill wrote the law`).toBeGreaterThan(0);
  const effective = rows.map((r) => r.effectiveDate).sort()[0]!;
  // Before the law takes effect, the director watches the town's named
  // residents, so what one of them learns of it reaches the director as it
  // happens.
  const town = lawChain(api).townPlaceId;
  const residents = [...core.people.values()]
    .filter(
      (p) => p.alive && core.households.get(p.householdId)?.placeId === town,
    )
    .map((p) => p.id);
  expect(residents.length, `${where}: named residents in town`).toBeGreaterThan(
    0,
  );
  for (const id of residents) director.watch(core, id);
  // Every first hearing of a story about the law, by person, for the year's
  // account of who heard it and who tied a bill to it.
  const lawRowIds = rows.map((r) => r.id);
  const heardOn = new Map<string, string>();
  onStoryHeard((hearApi, id, story) => {
    if (
      hearApi.state === core &&
      lawRowIds.includes(String(story.facts?.lawId ?? "")) &&
      !heardOn.has(id)
    )
      heardOn.set(id, String(hearApi.state.date));
  });
  if (effective > core.date)
    advanceCore(core, addDays(makeIsoDate(effective), 1));
  expect(inForce(api, key), `${where}: ${key} is law after ${effective}`).toBe(
    true,
  );
  const lawIds = rows.map((r) => r.id);
  // Each week: whoever the law has reached is watched, until one of them
  // ties a changed bill to the law from a story they heard.
  // A learned cost becomes a director's moment only when it is large enough
  // to matter to that person (the director's moment floor, `ledger.ts`): the
  // chain follows the first learner whose moment the director staged, and
  // counts the learners whose cost fell below the floor.
  const belowFloor = new Set<string>();
  const learned = () => {
    for (const row of core.durableLog.values()) {
      if (
        row.kind !== "law.effect-learned" ||
        !lawIds.some((id) => String(row.facts?.lawId ?? "") === id)
      )
        continue;
      const book = director.ledger.people.get(row.personIds?.[0] ?? "");
      // Learned after the director began watching them.
      if (!book || String(row.date) <= book.watchedSince) continue;
      if (![...book.momentsById.values()].some((m) => m.causeId === row.id)) {
        belowFloor.add(row.id);
        continue;
      }
      return {
        id: row.id,
        personId: row.personIds![0]!,
        facts: (row.facts ?? {}) as Record<string, unknown>,
      };
    }
    return undefined;
  };
  const everHeard = new Set<string>();
  let found = learned();
  for (let week = 0; week < 40 && !found; week += 1) {
    advanceCore(core, addDays(makeIsoDate(core.date), 7));
    for (const row of appliedOn(api, key)) {
      const ids =
        row.target === "person"
          ? [row.targetId]
          : row.target === "household"
            ? [...(core.households.get(row.targetId)?.memberIds ?? [])]
            : [];
      for (const id of ids) {
        if (core.people.get(id)?.alive && !director.ledger.people.has(id))
          director.watch(core, id);
        // The news engine forgets old stories' listeners, so who heard one
        // is noted each week.
        if (
          storiesHeard(api, id).some((story) =>
            lawIds.includes(String(story.facts?.lawId ?? "")),
          )
        )
          everHeard.add(id);
      }
    }
    found = learned();
  }
  const reached = appliedOn(api, key);
  expect(reached.length, `${where}: the law reached no one`).toBeGreaterThan(0);
  if (!found) {
    // Why no one learned it: who the law reached by name, the stories about
    // it, and which reached people heard one.
    const named = reached.flatMap((r) =>
      r.target === "person"
        ? [r.targetId]
        : r.target === "household"
          ? [...(core.households.get(r.targetId)?.memberIds ?? [])]
          : [],
    );
    const heardIt = named.filter((id) => everHeard.has(id));
    const paid = reached.reduce((n, r) => n + (r.amountMinor ?? 0), 0);
    // Only the household's payer, its member with the most cash, can learn
    // (place-prices.ts), and only from a story naming the price rule's law.
    const payersHeard = reached.filter((r) => {
      const members = [...(core.households.get(r.targetId)?.memberIds ?? [])]
        .map((id) => core.people.get(id))
        .filter((p) => p?.alive)
        .sort((a, b) => b!.liquidMinor - a!.liquidMinor);
      return members[0] && everHeard.has(members[0].id);
    }).length;
    const anyLearned = [...core.durableLog.values()]
      .filter(
        (row) =>
          row.kind === "law.effect-learned" &&
          String(row.facts?.lawId ?? "").includes(key),
      )
      .map((row) => String(row.facts?.lawId));
    const paying = reached.filter((r) => (r.amountMinor ?? 0) !== 0).length;
    const stories = (
      api.moduleState("news").table("stories").rows() as unknown as {
        id: string;
        facts?: Record<string, string>;
      }[]
    ).filter((s) => lawIds.includes(String(s.facts?.lawId ?? "")));
    expect(
      found,
      `${where}: no reached person learned it from a story: ${reached.length} applied rows, ${named.length} named people reached, ${stories.length} stories about the law (${stories
        .slice(0, 3)
        .map((s) => s.id)
        .join(
          ", ",
        )}), ${heardIt.length} reached people heard one (${heardIt.slice(0, 3).join(", ")}), ${paying} applied rows moved money, ${paid} minor in all, ${payersHeard} households whose payer heard one, ${belowFloor.size} learners whose cost fell below the director's moment floor, ${anyLearned.length} learned events for the law's key under ids ${[...new Set(anyLearned)].join(", ")}`,
    ).toBeDefined();
  }
  const personId = found!.personId;
  const applied = reached.find(
    (r) =>
      r.targetId === personId ||
      core.households.get(r.targetId)?.memberIds.includes(personId),
  );
  expect(applied, `${where}: ${personId} has an applied row`).toBeDefined();
  // The story they heard, which the learned event cites.
  // The story stays on the news record after the news stops carrying it,
  // and the person heard it (a hearing the proof saw as it happened).
  const story = (
    api.moduleState("news").table("stories").rows() as unknown as {
      id: string;
      facts?: Record<string, string>;
    }[]
  ).find((s) => String(found!.facts.learnedFrom ?? "").endsWith(s.id));
  expect(story, `${where}: ${found!.id} cites a story on record`).toBeDefined();
  expect(
    heardOn.has(personId),
    `${where}: ${personId} heard a story about the law`,
  ).toBe(true);
  // Their view moved, citing the event and the story.
  const stance = stancesOf(api, personId).find((s) =>
    s.causes.some((c) => c.eventId === found!.id),
  );
  expect(
    stance,
    `${where}: ${personId}'s view cites ${found!.id}`,
  ).toBeDefined();
  const cause = stance!.causes.find((c) => c.eventId === found!.id)!;
  expect(cause.learnedFrom, `${where}: the cause names how they learned`).toBe(
    found!.facts.learnedFrom,
  );
  // The director's moment from the learned effect, and the journal line.
  const book = director.ledger.people.get(personId)!;
  // The moment the learned event caused; its label names the strongest
  // channel it moved (a feeling, a cause, a tie), so it is found by its cause.
  const moment = book.schedule
    .map((row) => book.momentsById.get(row.momentId))
    .find((m) => m?.causeId === found!.id);
  expect(moment, `${where}: the director scheduled the moment`).toBeDefined();
  // The scene the director stages from that moment. Play narrates only
  // graded scene words, and the bank's day and home sentences wait on the
  // owner's grade (shippable: false), so the proof words the scene with them
  // admitted, to show the moment's records composing into the narration.
  const entry = book.schedule.find((row) => row.momentId === moment!.id)!;
  const scene = composeScene(core, director, personId, entry);
  expect(scene, `${where}: the moment's scene`).not.toBeNull();
  const worded = composeScene(
    core,
    director,
    personId,
    entry,
    sceneWordsFromBank({
      parts: SCENE_BANK.parts.map((part) => ({ ...part, shippable: true })),
    }),
  )!;
  const sceneText = worded.narration.map((l) => l.text).join(" ");
  expect(
    sceneText.trim().length,
    `${where}: ${worded.momentId}`,
  ).toBeGreaterThan(0);
  expect(sceneText, `${where}: ${sceneText}`).not.toMatch(
    /\{\{|\}\}|undefined/,
  );
  expect(
    worded.narration.flatMap((l) => l.sourceRecordIds),
    `${where}: the narration cites the moment's cause`,
  ).toContain(moment!.causeId);
  // The journal's lines for a learned law effect are authored and wait on
  // the owner's grade (shippable: false): play's journal leaves them out, and
  // the proof words the journal with them admitted, to show the records
  // composing into the line.
  const played = composeJournal(core, director, personId).flatMap(
    (chapter) => chapter.lines,
  );
  expect(
    played.some((l) => l.sourceRecordIds.includes(found!.id)),
    `${where}: an ungraded line reached play`,
  ).toBe(false);
  const admitted = journalDataFromBank({
    parts: JOURNAL_BANK.parts.map((part) =>
      part.key.startsWith("journal.law-effect-learned.")
        ? { ...part, shippable: true }
        : part,
    ),
  });
  const lines = composeJournal(core, director, personId, {
    data: admitted,
  }).flatMap((chapter) => chapter.lines);
  const line = lines.find((l) => l.sourceRecordIds.includes(found!.id));
  console.info(
    `laws-e2e ${where}: ${belowFloor.size} learners before this one fell below the director's moment floor; CHAIN bill ${passed!.billNumber} -> law ${lawIds.join(",")} -> applied ${applied!.id} (${applied!.amountMinor} minor; ${core.households.get(applied!.targetId)?.memberIds.length ?? 0} people in the household) -> price ${String(found!.facts.priceRuleId)} moved ${String(found!.facts.movedMinor)} -> story ${story!.id} -> learned ${found!.id} -> stance ${stance!.id} -> moment ${moment!.id} (${moment!.label}) -> scene ${scene!.typeKey} at ${scene!.setting.kind} citing ${moment!.causeId} ("${sceneText}") -> journal ${line ? `"${line.text}"` : "none"}`,
  );
  expect(
    line,
    `${where}: ${personId}'s journal names the learned effect: ${lines.map((l) => l.text).join(" | ")}`,
  ).toBeDefined();

  // The world runs on to a year from the opening: the record holds, and
  // others the law reached learn of it the same way.
  const yearEnd = addDays(makeIsoDate(gameStartDate()), 365);
  if (yearEnd > core.date) advanceCore(core, yearEnd);
  const learners = [...core.durableLog.values()].filter(
    (row) =>
      row.kind === "law.effect-learned" &&
      lawIds.includes(String(row.facts?.lawId ?? "")),
  );
  expect(
    learners.some((row) => row.id === found!.id),
    `${where}: ${found!.id} stays on the record a year on`,
  ).toBe(true);
  const yearLines = composeJournal(core, director, personId, {
    data: admitted,
  }).flatMap((chapter) => chapter.lines);
  expect(
    yearLines.some((l) => l.sourceRecordIds.includes(found!.id)),
    `${where}: ${personId}'s journal line holds a year on`,
  ).toBe(true);
  const reachedAtYear = appliedOn(api, key).filter((row) => !row.endedOn);
  // Who heard, who paid and who tied the two together. The durable log keeps
  // only the player's circle's events, so the price engine's own records
  // count: what each household last paid under the law and who paid it, and
  // everyone who learned the law changed it.
  const felt = (
    api.moduleState(PLACE_PRICES_MODULE_ID).table("felt").rows() as unknown as {
      householdId: string;
      payerId: string;
      lawId: string;
      movedMinor: number;
      date: string;
    }[]
  ).filter((row) => lawIds.includes(row.lawId));
  const learnedBy = new Set(
    (
      api
        .moduleState(PLACE_PRICES_MODULE_ID)
        .table("learned")
        .rows() as unknown as { personId: string; lawId: string }[]
    )
      .filter((row) => lawIds.includes(row.lawId))
      .map((row) => row.personId),
  );
  const payersHeard = felt.filter((row) => heardOn.has(row.payerId));
  const missed = payersHeard.filter((row) => !learnedBy.has(row.payerId));
  console.info(
    `laws-e2e ${where}: KNOWING of the town's ${new Set(residents.map((id) => core.people.get(id)?.householdId)).size} named households and ${residents.length} named residents at the law's start, ${felt.length} named households paid under it; ${heardOn.size} people heard a story about it; ${payersHeard.length} of those households' payers heard one; ${learnedBy.size} people tied a bill to it (${[...learnedBy].filter((id) => payersHeard.some((row) => row.payerId === id)).length} of them those payers); payers who heard and did not: ${
      missed
        .slice(0, 5)
        .map(
          (row) =>
            `${row.payerId} heard ${heardOn.get(row.payerId)}, last paid ${row.date} (${row.movedMinor})`,
        )
        .join("; ") || "none"
    }`,
  );
  // Where the law is gone a year on, the row that ended it.
  const ended = inForce(api, key)
    ? undefined
    : (
        api
          .moduleState(LAWS_MODULE_ID)
          .table("laws")
          .query("bySeriesOnly", [key]) as unknown as LawRowInput[]
      )
        .filter((row) => row.effectiveDate <= api.state.date)
        .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))[0];
  console.info(
    `laws-e2e ${where}: YEAR to ${core.date}: ${key} ${ended ? `no longer law (ended by ${ended.id}, value ${String(ended.value)}, effective ${ended.effectiveDate})` : "still law"}; ${reachedAtYear.length} open applied rows; ${learners.length} learned events kept in the circle's log`,
  );
}, 3_600_000);
