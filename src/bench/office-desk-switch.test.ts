import { expect, it } from "vitest";
import { billCatalog, provisionFor } from "../core2/bill-catalog";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import {
  billOf,
  bodyOf,
  castMemberVote,
  draftBill,
  holdVote,
  memberKey,
  members,
} from "../core2/modules/legislature";
import { deskWaiting, officeActsOf } from "../core2/modules/office-day";
import { townSeats } from "../core2/modules/offices";
import { coreAPI, fillInPerson, type CoreState } from "../core2/state";
import { deskDecide, officeStops, officeView } from "./office";
import { BenchPlayer } from "./player";
import { buildBenchWorld } from "./world";

// The desk switch on Your office (owner's card, Nov 14, 2026: "Stop me at every vote"), played as
// the mayor of a place whose mayor has a veto: Bedford, Kentucky, seed below (found by drawing
// "t56-desk:1"; the first draw, Wyoming, Rhode Island, has no mayor). One world, three passed
// ordinances. On, the desk holds the clock the morning after the vote and the player signs. Off, a
// passed ordinance sits on the desk with nothing signed or vetoed for the player and no stop; it
// is still there when the switch goes back On, and the player can sign it. An ordinance left until
// its deadline with the switch Off becomes law unsigned, which is the engine's rule for inaction.
const PLACE = {
  key: "2104816",
  name: "Bedford, Kentucky",
  seed: "32c170e3abe9f5f7feb31111bbc126194618a4cd9a3170a4679fe58824228764",
};

const reasons = (player: BenchPlayer): string[] =>
  (
    (player.packet as { stop?: { modules?: { reasonKey: string }[] } })?.stop
      ?.modules ?? []
  ).map((m) => m.reasonKey);

it(`the desk switch: ${PLACE.name}, seed ${PLACE.seed}`, () => {
  // Read tracing is a debug switch (AGENTS.md); a council passing an ordinance mid-day would trip it.
  const bookkeeping = setBookkeeping(false);
  const world = buildBenchWorld(PLACE.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: PLACE.key,
  });
  const core = world.core as CoreState;
  const api = coreAPI(core);
  const seats = townSeats(api);
  const mayor = seats.find(
    (r) => r.office.kind === "mayor" && r.holder?.personId,
  )!.holder!.personId!;
  const council = seats.find(
    (r) =>
      r.office.level === "city" &&
      r.office.kind !== "mayor" &&
      bodyOf(api, r.office.id) &&
      members(api, r.office.id).length >= 3,
  )!.office;
  // The mayor is the player from the first day, as the opening world's own player is.
  fillInPerson(core, mayor);
  const player = new BenchPlayer(core, world.director);
  player.select(mayor);
  // The clock is bound to the resident before anything is passed.
  player.advance("day");
  for (let i = 0; i < 6 && player.packet; i += 1) {
    const open = player.packet;
    if (open.kind === "stop")
      player.resume({ kind: "stop", pauseId: open.pauseId });
    else if (open.kind === "choice")
      player.resume({ kind: "own-choice", pauseId: open.pauseId });
    else break;
  }
  const ids = members(api, council.id).map(memberKey);
  const policies = billCatalog(api, "city")
    .flatMap((s) => s.topics.flatMap((t) => t.policies))
    .filter((p) => p.kind === "policy-question" && p.authority.allowed);
  expect(
    policies.length,
    `${PLACE.name}: policies the town may enact`,
  ).toBeGreaterThanOrEqual(3);

  /** A council ordinance the council passes; it reaches the mayor's desk. */
  const passed = (n: number) => {
    const bill = draftBill(api, {
      bodyOfficeId: council.id,
      sponsorId: ids.find((id) => id !== mayor)!,
      provisions: [
        provisionFor({ policyId: policies[n]!.id, operation: "enact" }),
      ],
    });
    for (const id of ids) castMemberVote(api, bill.id, id, "yes");
    const voted = holdVote(api, bill.id);
    expect(voted.status, `${bill.id} on the desk`).toBe("awaiting-signature");
    return voted.id;
  };
  /** One day of play, answering a stop that is not the desk's; the reasons of the packet it ended on. */
  const dayOf = () => {
    let guard = 0;
    do {
      const packet = player.packet;
      if (
        packet?.kind === "stop" &&
        !reasons(player).includes("office-day.desk")
      )
        player.resume({ kind: "stop", pauseId: packet.pauseId });
      else if (!(packet?.kind === "stop")) player.advance("day");
      guard += 1;
    } while (
      guard < 10 &&
      player.packet?.kind === "stop" &&
      !reasons(player).includes("office-day.desk")
    );
    return reasons(player);
  };
  const acts = (id: string) =>
    officeActsOf(api, mayor).filter(
      (a) => a.recordId === id && (a.kind === "sign" || a.kind === "veto"),
    );

  // The mayor's seat has the desk switch, On; a mayor sits no floor and is stopped at no meeting
  // (the mayor is not a member of the council), so there is no meetings switch for nothing.
  expect(officeView(core, mayor).stops.map((s) => s.key)).toEqual(["desk"]);
  expect(officeView(core, mayor).stops.find((s) => s.key === "desk")).toEqual({
    key: "desk",
    on: true,
  });

  // On: the desk holds the clock the morning after the vote; the player signs.
  const first = passed(0);
  expect(deskWaiting(api, true).map((b) => b.id)).toContain(first);
  let held = false;
  for (let day = 0; day < 4 && !held; day += 1)
    held = dayOf().includes("office-day.desk");
  expect(held, "the desk held the clock with the switch On").toBe(true);
  deskDecide(core, first, "sign");
  expect(["signed", "enacted"]).toContain(billOf(api, first).status);
  expect(acts(first).map((a) => a.kind)).toEqual(["sign"]);
  const stopId = player.packet?.kind === "stop" ? player.packet : null;
  if (stopId) player.resume({ kind: "stop", pauseId: stopId.pauseId });

  // Off: the next ordinance waits; nothing is signed or vetoed for the player; no stop.
  officeStops(core, mayor, "desk", false);
  expect(officeView(core, mayor).stops.find((s) => s.key === "desk")).toEqual({
    key: "desk",
    on: false,
  });
  const second = passed(1);
  const third = passed(2);
  expect(deskWaiting(api, true), "no stop token while Off").toHaveLength(0);
  const signBy = (billOf(api, second) as { signBy?: string }).signBy!;
  expect(signBy, "a signing deadline").toBeTruthy();
  let heldOff = false;
  while (core.date < signBy && !heldOff) {
    if (reasons(player).includes("office-day.desk")) heldOff = true;
    dayOf();
    if (core.date < signBy) {
      expect(billOf(api, second).status, `${second} on ${core.date}`).toBe(
        "awaiting-signature",
      );
      expect(acts(second), `${second} acts on ${core.date}`).toHaveLength(0);
    }
  }
  expect(heldOff, "the desk held the clock with the switch Off").toBe(false);

  // Back On: the waiting ordinance is still on the desk, and the player can sign it.
  officeStops(core, mayor, "desk", true);
  expect(
    deskWaiting(api).map((b) => b.id),
    "the waiting ordinance is still on the desk",
  ).toContain(second);
  deskDecide(core, second, "sign");
  expect(["signed", "enacted"]).toContain(billOf(api, second).status);
  expect(acts(second).map((a) => a.kind)).toEqual(["sign"]);

  // Left past its deadline, the third becomes law unsigned (the engine's rule for inaction).
  for (
    let day = 0;
    day < 30 && billOf(api, third).status === "awaiting-signature";
    day += 1
  )
    dayOf();
  expect(billOf(api, third).status).toBe("enacted");
  process.stdout.write(
    `DESK SWITCH ${PLACE.name}: ${third} presented ${signBy ? "" : ""}lapsed unsigned on ${core.date}; deadline of ${second} was ${signBy}\n`,
  );
  expect(acts(third), "nothing signed or vetoed for the player").toHaveLength(
    0,
  );
  setBookkeeping(bookkeeping);
}, 280_000);
