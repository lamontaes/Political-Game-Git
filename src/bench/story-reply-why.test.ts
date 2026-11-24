import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { billStage, chooseOwnVote } from "./bill-stage";
import { seatView } from "./legislature";
import { storyScene } from "./story";
import { buildBenchWorld } from "./world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { LEGISLATURE_MODULE_ID } from "../core2/modules/legislature";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";

// Dev mode's "why these lines" (owner, Nov 16 00:59Z: "all this stuff that
// you're tracing, if it's not already being traced by the dev mode, it should
// be being traced by that"): the reporter's call after the player votes no on
// a colleague's bill, served as /api/story serves it with ?dev=1, says for
// each reply the use that placed it, cited to the roll's record, and the
// wordings that fit as closely. Pinned where press-comment-after-vote.test.ts
// pins the colleague's no: Island Pond, Vermont (5035725), seed pr-44:0, whose
// roll holds `top-reason-own-view`.
const SEED = "pr-44:0";
const KEY = "5035725";
const VOTE_DAYS = 120;
const BILL_DAYS = 60;

it(`dev mode says why the reporter's call offered each reply, cited to the roll (${KEY}, seed ${SEED})`, () => {
  const place = drawPlace(SEED, "press-comment-context");
  expect(place.key).toBe(KEY);
  setBookkeeping(false);
  const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const me = [...core.people.values()]
    .filter((p) => p.alive && p.id.startsWith("person_"))
    .sort((a, b) => a.id.localeCompare(b.id))
    .find((p) => seatView(core, p.id).bodies.length > 0)!.id as PersonId;
  core.playerId = me;
  director.watch(core, me);
  const body = seatView(core, me).bodies[0]!;
  const bills = () =>
    coreAPI(core)
      .moduleState(LEGISLATURE_MODULE_ID)
      .table("bills")
      .rows() as unknown as {
      id: string;
      sponsorId: string;
      bodyOfficeId: string;
    }[];
  let bill: { id: string } | undefined;
  for (let day = 0; day < BILL_DAYS && !bill; day++) {
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    bill = bills().find(
      (row) =>
        row.bodyOfficeId === body.officeId &&
        row.sponsorId !== me &&
        billStage(core, row.id, me).yours.mayChoose,
    );
  }
  expect(
    bill,
    "a colleague's bill comes up for the player's vote",
  ).toBeTruthy();
  chooseOwnVote(core, bill!.id, "no", me);
  const voteId = `bill-vote:${bill!.id}:${body.officeId}`;
  for (let day = 0; day < VOTE_DAYS && !core.durableLog.has(voteId); day++)
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
  expect(core.durableLog.has(voteId), "the vote is held").toBe(true);
  advanceCore(core, addDays(makeIsoDate(core.date), 1));
  const entry = director.ledger.people
    .get(me)
    ?.schedule.find(
      (row) =>
        row.momentId.includes(voteId) &&
        row.bindings.some((b) => b.typeKey === "press-interview"),
    );
  expect(entry, "the vote stages the reporter's call").toBeTruthy();

  const story = storyScene(core, director, me, entry!.momentId, 12 * 60, {
    dev: true,
  });
  const talk = story.talk!;
  expect(talk.typeKey).toBe("press-interview");
  const top = talk.why.facts.find((row) => row.key === "top-reason-own-view");
  expect(top?.recordIds, "the reason is cited to the roll").toContain(voteId);
  const answer = talk.tree.replies.find(
    (reply) => reply.line.text === "I voted no because I don't believe in it.",
  );
  expect(answer, "the call offers the reason as a reply").toBeTruthy();
  const placed = answer!.line.placed!;
  process.stdout.write(
    `REPLY WHY ${place.name} (${place.key}), ${voteId}\n${talk.tree.replies
      .map(
        (reply) => `  ${reply.line.text} ${JSON.stringify(reply.line.placed)}`,
      )
      .join("\n")}\n`,
  );
  // The use that placed it needs the reason, cited to the same roll.
  const need = placed.needs.find((row) => row.key === "top-reason-own-view");
  expect(need?.recordIds).toContain(voteId);
  // And to the player's own vote row, whose trace opens the position's terms
  // and their sum (dev-trace.ts, memberPosition): one click from the reply.
  expect(need?.recordIds).toContain(`vote:${bill!.id}:${me}`);
  // The wording that fit the spot as closely, in its words.
  expect(placed.ties.map((tie) => tie.text)).toContain(
    "I voted against it. It wasn't right for Island Pond.",
  );

  // Without dev mode the story serves no placing.
  const plain = storyScene(core, director, me, entry!.momentId, 12 * 60);
  expect(
    plain.talk!.tree.replies.every((reply) => !("placed" in reply.line)),
  ).toBe(true);
}, 60_000);
