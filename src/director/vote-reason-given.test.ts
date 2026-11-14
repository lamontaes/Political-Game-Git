/**
 * A member's vote keeps the reason they gave (legislature.ts `giveReason`):
 * a seated member votes, the roll is cast, and the reason they pressed in the
 * reporter's call is on their vote row with the reply's record id. Pinned to
 * two named places and their seeds (a drawn place is a draw; these are not):
 * Doolittle, Texas (4820926), seed ends-1e48e4a3:3, and Gilbert, Iowa
 * (1930630), seed fresh-e6ba6037b388:1, both played to a vote on this head.
 */
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { seatAct, seatView } from "../bench/legislature";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import {
  castMemberVote,
  giveReason,
  votesOn,
} from "../core2/modules/legislature";
import { electorateSides } from "../core2/modules/voting";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";

const PINNED = [
  {
    seed: "ends-1e48e4a3:3",
    label: "zz-endings",
    name: "Doolittle",
    key: "4820926",
  },
  {
    seed: "fresh-e6ba6037b388:1",
    label: "press-comment-played",
    name: "Gilbert",
    key: "1930630",
  },
];

for (const pinned of PINNED)
  it(`${pinned.name}: the reason a member gave is on their vote, once`, () => {
    const place = drawPlace(pinned.seed, pinned.label);
    expect(place.key, `${pinned.seed} draws ${pinned.name}`).toBe(pinned.key);
    setBookkeeping(false);
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const member = [...core.people.values()]
      .filter((p) => p.alive && p.id.startsWith("person_"))
      .sort((a, b) => a.id.localeCompare(b.id))
      .find((p) => seatView(core, p.id).bodies.length > 0);
    expect(member, `a seated member in ${pinned.name}`).toBeTruthy();
    const me = member!.id as PersonId;
    core.playerId = me;
    const seat = seatView(core, me);
    const body = seat.bodies[0]!;
    let bill = { id: "", status: "blocked" };
    for (const question of [...seat.questions].slice(0, 4)) {
      if (bill.status !== "blocked") break;
      bill = seatAct(core, me, {
        kind: "draft",
        officeId: body.officeId,
        question,
        value: 1,
      }) as { id: string; status: string };
      if (bill.status !== "blocked") {
        const sides = electorateSides(api, question);
        castMemberVote(api, bill.id, me, sides.yes >= sides.no ? "no" : "yes");
      }
    }
    const voteId = `bill-vote:${bill.id}:${body.officeId}`;
    // Before the roll there is no vote row, so nothing is written.
    expect(giveReason(api, bill.id, me, "views", "reply:early")).toBe(false);
    for (let day = 0; day < 120 && !core.durableLog.has(voteId); day += 1)
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
    expect(core.durableLog.has(voteId), `${bill.id} voted`).toBe(true);
    const own = () => votesOn(api, bill.id).find((r) => r.memberId === me)!;
    expect(own().reasonGiven).toBeUndefined();
    expect(giveReason(api, bill.id, me, "town", "reply:1")).toBe(true);
    expect(own().reasonGiven).toBe("town");
    // The first reason said is the one on record.
    expect(giveReason(api, bill.id, me, "views", "reply:2")).toBe(false);
    expect(own().reasonGiven).toBe("town");
  }, 600_000);
