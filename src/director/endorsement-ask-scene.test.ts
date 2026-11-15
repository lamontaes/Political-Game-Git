import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
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
import type { ScheduleEntry } from "./director";

// A candidate's campaign asks the people closest to them for an endorsement
// each turn; the player was skipped. Now the player is asked in a scene
// (endorsement-ask), the endorsement row says "asked" until their reply, and
// the reply writes the yes or the no.
// Pinned (owner ruling: a test names its place and world seed from data, and
// never draws at run time): Loving, New Mexico (3544420), the seed the
// carried donor-ask test names.
const PLACE = {
  key: "3544420",
  name: "Loving, New Mexico",
  seed: "d1ef254b96157871fa107765d9300048c2d5d9e252b59d2ae19b810ed8cc83be",
};
const where = `${PLACE.name} (${PLACE.key}), seed ${PLACE.seed}`;

function world() {
  setBookkeeping(false);
  const { core, director } = buildBenchWorld(PLACE.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: PLACE.key,
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
  const race = open()[0] as ContestRow | undefined;
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
  return { core, director, api, race, filing, candidate, playerId };
}

function asked(ctx: ReturnType<typeof world>) {
  const { core, api, filing, candidate, playerId } = ctx;
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
): { entry: ScheduleEntry; replies: string[]; text: string } {
  const { core, director, playerId } = ctx;
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
  return { entry: entry!, replies, text: result.scene.talk.state.text };
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

const endorsed = (ctx: ReturnType<typeof world>, rowId: string) =>
  [...ctx.core.durableLog.values()].some(
    (r) => r.kind === "campaign-endorsed" && r.facts?.endorsementId === rowId,
  );

const answerOf = (ctx: ReturnType<typeof world>) =>
  endorsementsOf(ctx.api, ctx.filing.id).find(
    (r) => r.speakerId === ctx.playerId,
  )!.answer;

it(`the player is asked and a yes endorses, in public (${PLACE.name})`, () => {
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

it(`a no is kept as the row's answer and nothing is said in public (${PLACE.name})`, () => {
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

it(`a put-off comes back as a second asking, with no put-off offered (${PLACE.name})`, () => {
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
  expect(back, `${where}: the put-off never came back`).toBeTruthy();
  expect(back!.facts?.again).toBe("yes");
  const two = scene(ctx, back!.id);
  expect(two.text).toContain("You said a few days");
  expect(two.replies).not.toContain("stall");
  expect(say(ctx, two.entry, two.replies, "agree")).toBeTruthy();
  expect(answerOf(ctx)).toBe("yes");
}, 900_000);
