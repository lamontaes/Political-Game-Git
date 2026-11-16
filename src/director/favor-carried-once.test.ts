/**
 * A favor is spent once (pool item gov-favor-owed-only-when-it-carried).
 * The evening before a floor vote the player pleads with a colleague who
 * stands against the bill and whose goodwill for the player carries them: the
 * yes is a favor, kept as a debt the player owes that colleague
 * (`obligation:<bill>:<colleague>:reply`, the same row the campaign reads when
 * it calls the debt in). While the debt stands, a second ask of the same
 * colleague on another bill gets the plain no: they have already done the
 * player the favor. Played by presses in a pinned place, a town body drafted
 * on by the player; the place and seed were found by a script outside the
 * test (a draw, 150 days, the first evening a plea carries one colleague on
 * two bills).
 */
import { expect, it } from "vitest";
import { seatAct, seatView } from "../bench/legislature";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import {
  billOf,
  favorReturnedSince,
  favorWorth,
  memberKey,
  memberPosition,
  members,
  obligationsOwedBetween,
} from "../core2/modules/legislature";
import { townSeats } from "../core2/modules/offices";
import { coreAPI } from "../core2/state";
import type { CoreEventInput, PersonId } from "../core2/types";
import { traceNode } from "../bench/dev-trace";
import { purposeScene, replyInScene } from "./purpose-scene";

const PLACE = {
  name: "South Glastonbury, Montana",
  key: "3069713",
  seed: "5e3ce505c6be1f0f5f34db9c8d806153ae0189235f6565a4e2342b65f6c38af8",
};

it(`a yes the plea carried is a debt, and the same colleague gives the plain no on the next bill (${PLACE.name} ${PLACE.key}, world seed ${PLACE.seed.slice(0, 8)})`, () => {
  setBookkeeping(false);
  const { core, director } = buildBenchWorld(PLACE.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: PLACE.key,
  });
  const api = coreAPI(core);
  const full = (officeId: string) =>
    members(api, officeId)
      .map(memberKey)
      .filter((id) => core.people.get(id)?.alive)
      .sort();
  const body = [
    ...new Map(
      townSeats(api)
        .filter(
          (row) =>
            ["city", "county", "township"].includes(row.office.level) &&
            full(row.office.id).length > 2,
        )
        .map((row) => [row.office.id, row.office] as const),
    ).values(),
  ].sort((a, b) => full(b.id).length - full(a.id).length)[0]!;
  const seated = full(body.id);
  core.playerId = seated[0]! as PersonId;
  const player = core.playerId;
  for (const id of seated) {
    core.focusPersonIds.add(id as PersonId);
    director.watch(core, id as PersonId);
  }
  const asks: CoreEventInput[] = [];
  api.subscribeEvents("favor-once", ["vote-ahead"], (_, e) => {
    if (e.facts?.askerId === player) asks.push(e);
  });
  for (const question of seatView(core, player).questions.slice(0, 6)) {
    try {
      seatAct(core, player, {
        kind: "draft",
        officeId: body.id,
        question,
        value: 1,
      });
    } catch {
      /* a question the body cannot take */
    }
  }
  const open = (ask: CoreEventInput) =>
    String(ask.facts?.floorDate) > core.date &&
    billOf(api, String(ask.facts?.billId)).status === "drafted";
  /** The moment's entry stages each bill of the evening as its own scene; a later one is named `vote-sought|<ask id>`. */
  const entryOf = (ask: CoreEventInput) =>
    director.ledger.people
      .get(player)!
      .schedule.find(
        (row) =>
          row.momentId.includes(ask.id) ||
          row.bindings.some((b) =>
            (b.joined ?? []).some((j) => j.causeId === ask.id),
          ),
      )!;
  const sceneOf = (ask: CoreEventInput, typeKey = "vote-sought") => {
    const entry = entryOf(ask);
    const composed = purposeScene(core, director, player, entry, { typeKey });
    expect(composed?.kind, `${ask.id} as ${typeKey}`).toBe("composed");
    if (composed?.kind !== "composed") throw new Error("not composed");
    return { entry, scene: composed.scene };
  };
  const colleagueOf = (ask: CoreEventInput) => ask.personIds[0] as PersonId;
  let pleaded: CoreEventInput | undefined;
  let again: CoreEventInput | undefined;
  for (let day = 1; day <= 150 && !again; day += 1) {
    if (core.date < addDays(makeIsoDate(gameStartDate()), day))
      advanceCore(core, addDays(makeIsoDate(gameStartDate()), day));
    const live = asks.filter(open);
    pleaded = live.find((ask) => {
      const lean = memberPosition(
        api,
        String(ask.facts!.billId),
        colleagueOf(ask),
      ).total;
      return (
        lean <= 0 &&
        lean + favorWorth(api, colleagueOf(ask), player) > 0 &&
        live.some(
          (other) => other !== ask && colleagueOf(other) === colleagueOf(ask),
        )
      );
    });
    if (pleaded)
      again = live.find(
        (other) =>
          other !== pleaded && colleagueOf(other) === colleagueOf(pleaded!),
      );
  }
  expect(
    pleaded,
    "no evening where a plea carries one colleague on two bills",
  ).toBeTruthy();
  const colleague = colleagueOf(pleaded!);
  const billId = String(pleaded!.facts!.billId);

  // Step 1: the colleague stands against it and stalls; the player pleads and the yes comes.
  const { entry, scene } = sceneOf(pleaded!);
  const first = scene.talk.tree.lines[0]!;
  expect(first.move).toBe("stall");
  const plea = scene.talk.tree.replies.findIndex((r) => r.line.move === "plea");
  expect(plea).toBeGreaterThanOrEqual(0);
  const answer = scene.talk.tree.replies[plea]!.next?.lines.find(
    (l) => l.speakerId === colleague,
  )?.move;
  expect(["agree", "relent"]).toContain(answer);
  const replyId = replyInScene(core, director, player, entry, [plea], {
    typeKey: "vote-sought",
  })!;
  expect(replyId).toBeTruthy();
  const debt = obligationsOwedBetween(api, player, colleague).filter(
    (o) => o.kind === "favor",
  );
  expect(
    debt.map((o) => [o.billId, o.owedBy, o.owedTo, o.replyId, o.settled]),
  ).toEqual([[billId, player, colleague, replyId, false]]);
  // The debt is the favor's cost: its worth to this colleague is spent.
  expect(favorWorth(api, colleague, player)).toBe(0);
  expect(favorReturnedSince(api, colleague, player, "2000-01-01")).toBe(true);

  // Dev mode's Trace shows the debt: the reply that wrote it, that it is still
  // owed, and what a favor to the player is now worth to the colleague.
  const trace = traceNode(core, director, debt[0]!.id);
  expect(trace.children.map((c) => [c.id, c.value])).toEqual(
    expect.arrayContaining([
      [replyId, undefined],
      [`${debt[0]!.id}#owed`, "still owed"],
      [`${debt[0]!.id}#favor-worth`, 0],
    ]),
  );

  // Step 2: asked again on another bill, the same colleague gives the plain no.
  const second = sceneOf(again!, `vote-sought|${again!.id}`);
  const lean = memberPosition(
    api,
    String(again!.facts!.billId),
    colleague,
  ).total;
  expect(lean).toBeLessThanOrEqual(0);
  expect(second.scene.talk.tree.lines[0]!.move).toBe("refuse");
  expect(
    second.scene.talk.tree.replies.some(
      (r) =>
        r.line.move === "plea" &&
        ["agree", "relent"].includes(
          r.next?.lines.find((l) => l.speakerId === colleague)?.move ?? "",
        ),
    ),
  ).toBe(false);
  expect(
    obligationsOwedBetween(api, player, colleague).filter(
      (o) => o.kind === "favor",
    ),
  ).toHaveLength(1);
}, 600_000);
