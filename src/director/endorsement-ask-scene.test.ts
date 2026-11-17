import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import { billCatalog, provisionFor } from "../core2/bill-catalog";
import { closenessBetween } from "../core2/closeness";
import { advanceCore } from "../core2/life";
import {
  LEGISLATURE_MODULE_ID,
  draftBill,
  memberKey,
  members,
  obligationsOwedTo,
} from "../core2/modules/legislature";
import { townSeats } from "../core2/modules/offices";
import {
  ENDORSEMENT_ASKED_EVENT,
  endorsementsOf,
} from "../core2/modules/campaigns";
import {
  ELECTIONS_MODULE_ID,
  fileCandidacy,
  openContests,
  type ContestRow,
  type FilingRow,
} from "../core2/modules/elections";
import { filingClerkFor } from "../core2/modules/filing-clerk";
import { lawChain } from "../core2/modules/laws";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { purposeScene, replyInScene } from "./purpose-scene";
import type { ScheduleEntry } from "./scheduling";
import type { TreeNode } from "./scene-talk";

// A candidate's campaign asks the people closest to them for an endorsement
// each turn; the player was skipped. Now the player is asked in a scene
// (endorsement-ask), the endorsement row says "asked" until their reply, and
// the reply writes the yes or the no.
// Places are drawn from all 56 on a seed nobody chose, one after another, until
// one has someone the player knows who files for a race; each place passed over
// is named, and the test fails by name if none has.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const DRAWS = 12;

function world(favor = false) {
  const passed: string[] = [];
  for (let draw = 0; draw < DRAWS; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "endorsement-ask");
    const where = `${place.name} (${place.key}), seed ${seed}:${draw}`;
    try {
      return playedWorld(place, where, favor);
    } catch (error) {
      if (!String(error).includes("no one the player knows filed")) throw error;
      passed.push(where);
    }
  }
  throw new Error(
    `No drawn place had a candidate the player knows: ${passed.join("; ")}`,
  );
}

function playedWorld(
  place: ReturnType<typeof drawPlace>,
  where: string,
  favor: boolean,
) {
  setBookkeeping(false);
  const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  const playerId = core.playerId as PersonId;
  const player = core.people.get(playerId)!;
  director.watch(core, playerId);
  const open = () =>
    [...openContests(api)].sort(
      (a, b) =>
        a.electionDate.localeCompare(b.electionDate) ||
        a.id.localeCompare(b.id),
    );
  for (let day = 0; !open().length && day < 365; day += 7)
    advanceCore(core, addDays(makeIsoDate(core.date), 7));
  // A favor is owed over a bill before the race's own body: a body with
  // members to sponsor one.
  const race = (
    favor
      ? open().find((row) =>
          townSeats(api).some(
            (seat) =>
              seat.office.id === row.officeId &&
              members(api, row.officeId).length > 1,
          ),
        )
      : open()[0]
  ) as ContestRow | undefined;
  const clerkId = race ? filingClerkFor(api, race.id)?.personId : undefined;
  const town = lawChain(api).townPlaceId;
  // The first adult the player knows (their circle, by id) who files.
  const circle = [...new Set([...player.familyIds, ...player.knownIds])]
    .sort()
    .map((id) => core.people.get(id))
    .filter(
      (p) =>
        p &&
        p.alive &&
        p.id !== clerkId &&
        p.placeId === town &&
        ageOnDate(p.birthDate, core.date) >= 18,
    );
  const candidate = race
    ? circle.find((p) =>
        ["petitioning", "on-ballot"].includes(
          fileCandidacy(api, {
            personId: p!.id,
            contestId: race.id,
            platform: [],
          }).status ?? "",
        ),
      )
    : undefined;
  if (!race || !candidate)
    throw new Error(`${where}: no one the player knows filed for a race`);
  const filing = (
    api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("filings")
      .rows() as unknown as FilingRow[]
  ).find((row) => row.personId === candidate.id)!;
  // Edge case by hand (a fixture, not a played deal): the player owes the
  // candidate a favor from a deal over a bill the body has before it.
  let obligationId: string | undefined;
  if (favor) {
    const sponsor = members(api, race.officeId)[0]!;
    const policy = billCatalog(api, race.level as "city" | "county" | "state")
      .flatMap((subject) => subject.topics.flatMap((t) => t.policies))
      .find((row) => row.kind === "policy-question" && row.authority.allowed)!;
    const bill = draftBill(api, {
      bodyOfficeId: race.officeId,
      sponsorId: memberKey(sponsor),
      provisions: [provisionFor({ policyId: policy.id, operation: "enact" })],
    });
    obligationId = `obligation:${bill.id}:${candidate.id}:fixture`;
    api
      .moduleState(LEGISLATURE_MODULE_ID)
      .table("obligations")
      .put({
        id: obligationId,
        owedBy: playerId,
        owedTo: candidate.id,
        kind: "trade",
        billId: bill.id,
        measure: bill.number,
        date: core.date,
        settled: false,
      } as never);
  }
  return {
    where,
    core,
    director,
    api,
    race,
    filing,
    candidate,
    playerId,
    obligationId,
  };
}

function asked(ctx: ReturnType<typeof world>) {
  const { core, api, filing, candidate, playerId, where } = ctx;
  const rowId = `endorsement:${filing.id}:${playerId}`;
  for (
    let day = 0;
    day < 60 &&
    !endorsementsOf(api, filing.id).some((row) => row.speakerId === playerId);
    day += 1
  )
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
  const row = endorsementsOf(api, filing.id).find(
    (r) => r.speakerId === playerId,
  );
  expect(
    row,
    `${where}: the player was never asked (${filing.id})`,
  ).toBeTruthy();
  expect(row!.id).toBe(rowId);
  expect(row!.answer).toBe("asked");
  expect(row!.askerId).toBe(candidate.id);
  const record = [...core.durableLog.values()]
    .filter(
      (r) =>
        r.kind === ENDORSEMENT_ASKED_EVENT && r.facts?.endorsementId === rowId,
    )
    .sort((a, b) => a.date.localeCompare(b.date))
    .at(-1);
  expect(record, `${where}: no endorsement-asked record`).toBeTruthy();
  expect(record!.personIds).toEqual([candidate.id, playerId]);
  return { row: row!, record: record!, rowId };
}

function scene(
  ctx: ReturnType<typeof world>,
  recordId: string,
): {
  entry: ScheduleEntry;
  replies: string[];
  text: string;
  tree: TreeNode;
} {
  const { core, director, playerId, where } = ctx;
  const book = director.ledger.people.get(playerId)!;
  const entry = book.schedule.find(
    (e) => book.momentsById.get(e.momentId)?.causeId === recordId,
  );
  expect(entry, `${where}: no scene staged from ${recordId}`).toBeTruthy();
  expect(entry!.bindings.some((b) => b.typeKey === "endorsement-ask")).toBe(
    true,
  );
  const result = purposeScene(core, director, playerId, entry!, {
    typeKey: "endorsement-ask",
  });
  expect(result?.kind, JSON.stringify(result)).toBe("composed");
  if (result?.kind !== "composed") throw new Error("not composed");
  const replies = result.scene.talk.tree.replies.map((r) => r.line.move);
  console.log(
    `ENDORSEMENT ASK ${where}: "${result.scene.talk.state.text}" replies ${replies.join(", ")}`,
  );
  return {
    entry: entry!,
    replies,
    text: result.scene.talk.state.text,
    tree: result.scene.talk.tree,
  };
}

const say = (
  ctx: ReturnType<typeof world>,
  entry: ScheduleEntry,
  replies: string[],
  move: string,
) =>
  replyInScene(
    ctx.core,
    ctx.director,
    ctx.playerId,
    entry,
    [replies.indexOf(move)],
    { typeKey: "endorsement-ask" },
  );

/** The player says each move in turn as far as the talk goes, to the end of the exchange. */
function sayThrough(
  ctx: ReturnType<typeof world>,
  shown: { entry: ScheduleEntry; tree: TreeNode },
  moves: string[],
) {
  const path: number[] = [];
  let node: TreeNode | null = shown.tree;
  for (const move of moves) {
    const at = node?.replies.findIndex((r) => r.line.move === move) ?? -1;
    if (at < 0) break;
    path.push(at);
    node = node!.replies[at]!.next;
  }
  return replyInScene(ctx.core, ctx.director, ctx.playerId, shown.entry, path, {
    typeKey: "endorsement-ask",
  });
}

const endorsed = (ctx: ReturnType<typeof world>, rowId: string) =>
  [...ctx.core.durableLog.values()].some(
    (r) => r.kind === "campaign-endorsed" && r.facts?.endorsementId === rowId,
  );

const answerOf = (ctx: ReturnType<typeof world>) =>
  endorsementsOf(ctx.api, ctx.filing.id).find(
    (r) => r.speakerId === ctx.playerId,
  )!.answer;

it(`the player is asked and a yes endorses, in public`, () => {
  const ctx = world();
  const { rowId, record } = asked(ctx);
  expect(endorsed(ctx, rowId)).toBe(false);
  const { entry, replies } = scene(ctx, record.id);
  expect(replies).toEqual(
    expect.arrayContaining(["agree", "decline", "stall"]),
  );
  expect(
    say(ctx, entry, replies, "agree"),
    "the yes wrote no reply",
  ).toBeTruthy();
  expect(answerOf(ctx)).toBe("yes");
  expect(endorsed(ctx, rowId)).toBe(true);
}, 600_000);

it(`a no is kept as the row's answer and nothing is said in public `, () => {
  const ctx = world();
  const { rowId, record } = asked(ctx);
  const { entry, replies } = scene(ctx, record.id);
  expect(say(ctx, entry, replies, "decline")).toBeTruthy();
  expect(answerOf(ctx)).toBe("no");
  expect(endorsed(ctx, rowId)).toBe(false);
  // It is not asked again: the days pass and the one row stands.
  advanceCore(ctx.core, addDays(makeIsoDate(ctx.core.date), 40));
  expect(answerOf(ctx)).toBe("no");
}, 600_000);

it(`a put-off comes back as a second asking, with no put-off offered `, () => {
  const ctx = world();
  const first = asked(ctx);
  const one = scene(ctx, first.record.id);
  expect(say(ctx, one.entry, one.replies, "stall")).toBeTruthy();
  expect(answerOf(ctx)).toBe("asked");
  for (
    let day = 0;
    day < 60 &&
    ![...ctx.core.durableLog.values()].some(
      (r) =>
        r.kind === ENDORSEMENT_ASKED_EVENT &&
        r.facts?.endorsementId === first.rowId &&
        r.id !== first.record.id,
    );
    day += 1
  )
    advanceCore(ctx.core, addDays(makeIsoDate(ctx.core.date), 1));
  const back = [...ctx.core.durableLog.values()].find(
    (r) =>
      r.kind === ENDORSEMENT_ASKED_EVENT &&
      r.facts?.endorsementId === first.rowId &&
      r.id !== first.record.id,
  );
  expect(back, `${ctx.where}: the put-off never came back`).toBeTruthy();
  expect(back!.facts?.again).toBe("yes");
  const two = scene(ctx, back!.id);
  expect(two.text).toContain("You said a few days");
  expect(two.replies).not.toContain("stall");
  expect(say(ctx, two.entry, two.replies, "agree")).toBeTruthy();
  expect(answerOf(ctx)).toBe("yes");
}, 900_000);

it(`a favor the player owes is asked by name, a no is final, and a yes settles it `, () => {
  const no = world(true);
  const ask = asked(no);
  expect(ask.record.facts?.obligationId).toBe(no.obligationId);
  expect(ask.record.facts?.billId).toBeTruthy();
  const one = scene(no, ask.record.id);
  const before = closenessBetween(no.core, no.playerId, no.candidate.id);
  expect(sayThrough(no, one, ["decline", "refuse"])).toBeTruthy();
  expect(answerOf(no)).toBe("no");
  // The no is final: the favor is not owed any more, and no later
  // campaign of the candidate's calls it in again.
  expect(
    obligationsOwedTo(no.api, no.candidate.id).map((o) => o.id),
  ).not.toContain(no.obligationId);
  // The scene's ending strains the tie, as a refusal does for anyone.
  expect(closenessBetween(no.core, no.playerId, no.candidate.id)).toBeLessThan(
    before,
  );
  advanceCore(no.core, addDays(makeIsoDate(no.core.date), 40));
  expect(answerOf(no)).toBe("no");

  const yes = world(true);
  const ask2 = asked(yes);
  const two = scene(yes, ask2.record.id);
  expect(say(yes, two.entry, two.replies, "agree")).toBeTruthy();
  expect(answerOf(yes)).toBe("yes");
  expect(
    obligationsOwedTo(yes.api, yes.candidate.id).map((o) => o.id),
  ).not.toContain(yes.obligationId);
}, 900_000);
