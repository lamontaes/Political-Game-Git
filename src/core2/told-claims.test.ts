/**
 * People can lie to the player (told-claims.ts; the Account lead's rule of
 * Nov 15 on OWNER-DECISIONS line 108). The player sponsors a bill on their
 * town's body that would fail by one; the evening before the floor vote the
 * legislature names the colleague the player needs (askBeforeTheRoll), and
 * the director stages the player's ask. The colleague's true answer is no
 * and costs them their tie with the player, so whether they say so is
 * weighed through the chooser with their temperament: one low in
 * truthfulness says yes, the same colleague high in it says no. The false
 * yes is kept as the player's belief and a lie record; the roll call shows
 * the no, the player learns it from the record, and the tie strains, by
 * record id.
 *
 * Staged through the game's own path at a named place and seed. The stand-in
 * (test files only): the other members' votes are chosen so the count needs
 * the colleague, the player and colleague are given time together, the
 * colleague takes the whole trait profile of the town's adult most (or
 * least) inclined to the false answer, and their no is chosen after the
 * evening so a lobby visit cannot move it.
 */
import { expect, it } from "vitest";
import { storyReply, storyScene } from "../bench/story";
import { buildBenchWorld } from "../bench/world";
import { beliefsOf } from "../director/conversation";
import { billCatalog, provisionFor } from "./bill-catalog";
import { setBookkeeping } from "./bookkeeping";
import { closenessBetween } from "./closeness";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import {
  bodyOf,
  castMemberVote,
  draftBill,
  memberKey,
  memberPosition,
  members,
  scheduleVote,
  votesOn,
} from "./modules/legislature";
import { townSeats } from "./modules/offices";
import { coreAPI, fillInPerson } from "./state";
import { CLAIM_FOUND_OUT_EVENT, CLAIM_LIE_EVENT, liesTo } from "./told-claims";
import { traitLean } from "./choice";
import { decisionKinds } from "./trait-decision-table";
import type { CoreEventInput, PersonId, PersonState } from "./types";

const PLACE = { key: "4846968", seed: "8647-mason" };

function play(honest: boolean) {
  setBookkeeping(false);
  const { core, director } = buildBenchWorld(PLACE.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: PLACE.key,
  });
  const api = coreAPI(core);
  const seat = townSeats(api).find(
    (row) =>
      row.office.level === "city" &&
      bodyOf(api, row.office.id) &&
      members(api, row.office.id).length >= 3 &&
      members(api, row.office.id).every((term) => term.personId),
  );
  if (!seat) throw new Error("no town body of three held seats");
  const body = seat.office.id;
  const ids = members(api, body).map(memberKey).sort();
  for (const id of ids) fillInPerson(core, id);
  const player = ids[0]! as PersonId;
  core.playerId = player;
  for (const id of ids) {
    core.focusPersonIds.add(id as PersonId);
    director.watch(core, id as PersonId);
  }
  // The first question the town may enact that a member stands against.
  const policies = billCatalog(api, "city")
    .flatMap((subject) => subject.topics.flatMap((topic) => topic.policies))
    .filter((row) => row.kind === "policy-question" && row.authority.allowed);
  // Of the first questions it may enact, the one a member stands against
  // most firmly: their own vote is no whatever the evening brings.
  let bill: ReturnType<typeof draftBill> | undefined;
  let colleague: PersonId | undefined;
  let firmest = 0;
  for (const policy of policies.slice(0, 6)) {
    const drafted = draftBill(api, {
      bodyOfficeId: body,
      sponsorId: player,
      provisions: [provisionFor({ policyId: policy.id, operation: "enact" })],
    });
    for (const id of ids.slice(1)) {
      const total = memberPosition(api, drafted.id, id).total;
      if (total < firmest) {
        firmest = total;
        bill = drafted;
        colleague = id as PersonId;
      }
    }
  }
  if (!bill || !colleague) throw new Error("no member against any bill");
  const sitting = scheduleVote(api, bill.id);
  const person = core.people.get(colleague)!;
  // The temperament: the whole trait profile of the town's adult most, or
  // least, inclined to say the false thing, by the chooser's own lean.
  const lean = (traits: PersonState["traits"]) =>
    traitLean(core, { traits }, decisionKinds("claims.tell", "claim-false")) -
    traitLean(core, { traits }, decisionKinds("claims.tell", "claim-truth"));
  const adults = [...core.people.values()]
    .filter((p) => p.alive && p.id !== colleague && p.id !== player)
    .sort(
      (a, b) => lean(a.traits) - lean(b.traits) || a.id.localeCompare(b.id),
    );
  const model = honest ? adults[0]! : adults[adults.length - 1]!;
  person.traits = { ...model.traits };
  api.relationship(player, colleague, "contact", 200);
  // The rest vote so the bill fails by the colleague's no: one yes.
  const others = ids.slice(1).filter((id) => id !== colleague);
  others.forEach((id, i) =>
    castMemberVote(api, bill.id, id, i === 0 ? "yes" : i % 2 ? "no" : "yes"),
  );
  const asks: CoreEventInput[] = [];
  api.subscribeEvents("told-claims-test", ["vote-ahead"], (_, e) => {
    if (e.facts?.askedId === colleague) asks.push(e);
  });
  const eve = addDays(makeIsoDate(sitting), -1);
  advanceCore(core, eve);
  expect(asks.map((e) => e.facts?.askerId)).toContain(player);
  const book = director.ledger.people.get(player)!;
  const entry = book.schedule.find(
    (row) =>
      row.outcome !== "journal-line" &&
      asks.some((ask) => row.momentId.includes(ask.id)),
  );
  expect(entry, `no stop for the ask on ${eve}`).toBeTruthy();
  const shown = storyScene(core, director, player, entry!.momentId, 20 * 60);
  // The answer's move, as its bank piece names it ("scene-talk.reply-agree.…").
  const answer = shown
    .talk!.tree.lines[0]!.parts[0]!.split(".")[1]!
    .replace(/^reply-/, "");
  const kept = storyReply(core, director, player, entry!.momentId, [0], {
    typeKey: shown.talk!.typeKey,
  });
  const reply = core.durableLog.get(kept.recordId)!;
  const lieId = reply.facts?.told as string | undefined;
  const believed = beliefsOf(api, player).find(
    (row) => row.key === `vote:${bill.id}`,
  );
  const unsettled = liesTo(api, player).length;
  const before = closenessBetween(core, player, colleague);
  // The stand-in: the colleague's own no stands at the roll (an interest
  // group's visit that night can otherwise move a member this close).
  castMemberVote(api, bill.id, colleague, "no");
  const found: CoreEventInput[] = [];
  api.subscribeEvents("told-claims-found", [CLAIM_FOUND_OUT_EVENT], (_, e) => {
    found.push(e);
  });
  advanceCore(core, sitting);
  const vote = votesOn(api, bill.id).find((v) => v.memberId === colleague);
  return {
    where: `${PLACE.key} seed ${PLACE.seed}, bill ${bill.id}, colleague ${colleague}`,
    answer,
    lieId,
    lie: lieId ? core.durableLog.get(lieId) : undefined,
    believed,
    unsettled,
    vote: vote?.vote,
    found,
    afterBelief: beliefsOf(api, player).find(
      (row) => row.key === `vote:${bill.id}`,
    ),
    knows: core.knowledgeByPerson.get(player)?.get(`vote:${bill.id}`)?.value,
    before,
    after: closenessBetween(core, player, colleague),
    kind: CLAIM_LIE_EVENT,
  };
}

it("a colleague low in truthfulness says yes and votes no; the roll call sets the player straight", () => {
  const liar = play(false);
  const honest = play(true);
  process.stdout.write(
    `TOLD CLAIMS ${liar.where}\n  low truthfulness: said ${liar.answer}, lie ${liar.lieId}, roll ${liar.vote}, found out ${liar.found.map((e) => e.id).join(",")}, closeness ${liar.before.toFixed(3)} -> ${liar.after.toFixed(3)}\n  high truthfulness: said ${honest.answer}, roll ${honest.vote}\n`,
  );
  // The same spot, two temperaments: the honest one says no.
  expect(honest.answer, honest.where).not.toBe("agree");
  expect(honest.lieId, honest.where).toBeUndefined();
  // The liar says yes, kept as a lie and as the player's belief.
  expect(liar.answer, liar.where).toBe("agree");
  expect(liar.lie?.kind, liar.where).toBe(liar.kind);
  expect(liar.believed?.claimed, liar.where).toBe("yes");
  expect(liar.unsettled, liar.where).toBe(1);
  // The roll call shows the no; the player learns it from the record, the
  // belief is gone and the tie strains.
  expect(liar.vote, liar.where).toBe("no");
  expect(
    liar.found.map((e) => e.facts?.lieId),
    liar.where,
  ).toEqual([liar.lieId]);
  expect(liar.afterBelief, liar.where).toBeUndefined();
  expect(liar.knows, liar.where).toBe("no");
  expect(liar.after, liar.where).toBeLessThan(liar.before);
}, 60_000);
