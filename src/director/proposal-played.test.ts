import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { meetInTalk } from "../core2/encounters";
import { gameStartDate } from "../core2/game-start";
import { advanceCore } from "../core2/life";
import { moduleState } from "../core2/module-state";
import { addDays, ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import {
  askOut,
  FAMILY_MOVE_IN_ASKED,
  FAMILY_PROPOSAL_ANSWERED,
  propose,
} from "../core2/modules/partnerships";
import { partnerAgeLikelihood } from "../core2/opening-partnership";
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import { purposeScene, replyInScene } from "./purpose-scene";
import type { TreeNode } from "./scene-talk";

// A proposal answered yes, reached the way a player reaches it: asked out,
// dating, asked by the partner to live together and saying yes in that
// scene, then proposing once the couple has lived together a while. No stage
// or progress is written by hand; the partnerships engine's own monthly climb
// moves the couple. Place and seed pinned: Pulaski, Ohio, family-a, a first
// proposal the partner answers yes. The premise is the scene, not one
// wording: at 0bf3e4f5 the yes read "Yes. I thought you'd never ask."; with
// Train 29ef4685 merged the pick among the yes lines that fit (both need
// only said-yes on a first proposal) gives "Yes! Come here." (re-pinned
// Nov 15, the change named in #9256's body).
//
// Played days: this test plays the months a couple takes to move in and then
// to be ready for a yes (here, asked out in May 2025, asked to move in on
// January 1, 2026, and a first proposal answered yes in February), a week at
// a time. That is the game's own
// clock, so it runs longer than a minute (Account lead, Nov 15: a yes reached
// through the game's own path, played days, the reason in the comment).
setBookkeeping(false);

const adult = (core: CoreState, born: string) =>
  ageOnDate(makeIsoDate(born), makeIsoDate(core.date)) >= 18;

/** The reply path whose talk ends on this named ending. */
function pathTo(node: TreeNode, ending: string): number[] | null {
  for (const [at, reply] of node.replies.entries()) {
    if (reply.next?.end?.ending?.id === ending) return [at];
    const deeper = reply.next ? pathTo(reply.next, ending) : null;
    if (deeper) return [at, ...deeper];
  }
  return null;
}

it("dated, moved in at the partner's ask, then proposed: the yes plays as a scene (Pulaski, Ohio)", () => {
  const place = drawPlace("family-a", "family-life");
  const where = `${place.name} (${place.key}), seed family-a`;
  const { core, director, playerId } = buildBenchWorld(
    place.seed,
    gameStartDate(),
    { twoLevel: true, placeKey: place.key },
  );
  const me = playerId! as PersonId;
  director.watch(core, me);
  while (!adult(core, core.people.get(me)!.birthDate))
    advanceCore(core, addDays(makeIsoDate(core.date), 7));
  const api = coreAPI(core);
  const player = core.people.get(me)!;
  const today = makeIsoDate(core.date);
  const ageOf = (born: string) => ageOnDate(makeIsoDate(born), today);
  const gender = (row: { looks?: { gender?: string } }) =>
    row.looks?.gender === "female" || row.looks?.gender === "male"
      ? row.looks.gender
      : undefined;
  const partnered = new Set<string>();
  for (const link of core.familyLinks.values())
    if (link.kind === "partner")
      for (const id of link.personIds) partnered.add(id);
  // The single whose age fits the player best, as the courtship test finds
  // them, met as a talk meets them and asked out after evenings together.
  const other = [...core.people.values()]
    .filter(
      (row) =>
        row.alive &&
        row.tier !== "husk" &&
        row.id !== me &&
        row.placeId === player.placeId &&
        row.householdId !== player.householdId &&
        !partnered.has(row.id) &&
        !player.familyIds.has(row.id) &&
        adult(core, row.birthDate),
    )
    .map((row) => ({
      row,
      fit: partnerAgeLikelihood(
        ageOf(row.birthDate),
        gender(row),
        ageOf(player.birthDate),
        gender(player),
      ),
    }))
    .sort((a, b) => b.fit - a.fit || a.row.id.localeCompare(b.row.id))[0]!.row;
  meetInTalk(
    api,
    me,
    other.id,
    player.placeId,
    1,
    `talk:${core.date}:${me}:${other.id}`,
  );
  const kind = () =>
    core.relationships.get(
      me < other.id ? `${me}:${other.id}` : `${other.id}:${me}`,
    )?.kind ?? ("friend" as never);
  // An evening's visit, through the writer the player's Visit uses.
  const visit = () =>
    api.relationship(me, other.id, kind(), 3, undefined, { cause: "visit" });
  for (let evening = 0; evening < 20; evening += 1) visit();
  expect(askOut(api, me, other.id), where).toMatchObject({ answer: "yes" });

  const couples = moduleState(core, "partnerships").table("couples");
  const link = [...core.familyLinks.values()].find(
    (row) => row.kind === "partner" && row.personIds.includes(me),
  )!;
  const stage = () => (couples.get(link.id) as { stage: string }).stage;
  const book = director.ledger.people.get(me)!;
  let movedIn: string | undefined;
  let yes: ReturnType<typeof propose> | undefined;
  const asks: string[] = [];
  // Month by month: a weekly evening together, the engine's monthly climb,
  // the partner's ask to live together answered yes in its scene, then a
  // proposal each month until the answer is yes.
  for (let month = 0; month < 40 && !yes; month += 1) {
    for (let week = 0; week < 4; week += 1) {
      visit();
      advanceCore(core, addDays(makeIsoDate(core.date), 7));
    }
    if (stage() === "move-in-asked") {
      const entry = book.schedule.find(
        (row) =>
          book.momentsById
            .get(row.momentId)
            ?.causeId.startsWith(`${FAMILY_MOVE_IN_ASKED}:`) &&
          row.bindings.some((bound) => bound.typeKey === "move-in"),
      );
      expect(entry, `${where}: the move-in ask is a scene`).toBeTruthy();
      const scene = purposeScene(core, director, me, entry!, {
        typeKey: "move-in",
      });
      expect(scene?.kind, where).toBe("composed");
      if (scene?.kind !== "composed") return;
      const path = pathTo(scene.scene.talk.tree, "said-yes");
      expect(path, `${where}: a reply says yes`).not.toBeNull();
      replyInScene(core, director, me, entry!, path!, { typeKey: "move-in" });
      expect(stage(), where).toBe("living-together");
      movedIn = core.date;
      continue;
    }
    if (stage() !== "living-together") continue;
    const answer = propose(api, me, other.id, { room: player.householdId });
    if (!answer.asked) continue;
    asks.push(`${core.date} ${answer.answer} ${answer.reason ?? ""}`);
    if (answer.answer === "yes") yes = answer;
  }
  expect(movedIn, `${where}: they moved in`).toBeDefined();
  expect(yes, `${where}: asks ${asks.join(", ")}`).toBeDefined();
  // Asked without the bench's controls, the answer reaches the player's
  // schedule on the next day the director reads.
  advanceCore(core, addDays(makeIsoDate(core.date), 1));
  const entry = book.schedule.find(
    (row) =>
      book.momentsById
        .get(row.momentId)
        ?.causeId.startsWith(`${FAMILY_PROPOSAL_ANSWERED}:`) &&
      book.momentsById.get(row.momentId)?.causeId === yes!.recordId,
  );
  expect(entry?.outcome, `${where}: the yes plays now`).toBe("scene-now");
  const scene = purposeScene(core, director, me, entry!, {
    typeKey: "proposal-answered",
  });
  expect(scene?.kind, `${where}: ${JSON.stringify(scene)}`).toBe("composed");
  if (scene?.kind !== "composed") return;
  const keys = scene.scene.facts.map((row) => row.key);
  expect(keys, where).toContain("said-yes");
  const lines = scene.scene.talk.lines.map((line) => line.text);
  expect(lines, where).toEqual([
    "You asked Isaiah to marry you.",
    "Yes! Come here.",
    "We're getting married.",
    "You're sure?",
    "I've never been more sure.",
  ]);
}, 130_000);
