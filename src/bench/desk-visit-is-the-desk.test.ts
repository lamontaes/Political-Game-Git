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
import {
  deskWaiting,
  officeActsOf,
  setStops,
} from "../core2/modules/office-day";
import { townSeats } from "../core2/modules/offices";
import { coreAPI, fillInPerson, type CoreState } from "../core2/state";
import { purposeScene } from "../director/purpose-scene";
import type { TreeNode } from "../director/scene-talk";
import type { PersonId } from "../core2/types";
import { BenchPlayer } from "./player";
import { storyReply, storyScene } from "./story";
import { buildBenchWorld } from "./world";

// The visit is the desk (Words lead, desk ruling 2, Nov 14): when a sponsor
// comes in about the bill on the mayor's desk, the visit stops the day with
// the desk, and a yes said to them signs the bill through the desk's own
// decision; the desk does not hold the clock again for it. Played as the
// mayor of Bedford, Kentucky, the desk switch test's place and seed.
const PLACE = {
  key: "2104816",
  name: "Bedford, Kentucky",
  seed: "32c170e3abe9f5f7feb31111bbc126194618a4cd9a3170a4679fe58824228764",
};

type Stop = {
  kind?: string;
  pauseId?: string;
  stop?: {
    modules?: { reasonKey: string; moduleId: string; recordId?: string }[];
  };
};

it(`a yes to the visitor signs the bill on the desk: ${PLACE.name}, seed ${PLACE.seed}`, () => {
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
  )!.holder!.personId! as PersonId;
  const council = seats.find(
    (r) =>
      r.office.level === "city" &&
      r.office.kind !== "mayor" &&
      bodyOf(api, r.office.id) &&
      members(api, r.office.id).length >= 3,
  )!.office;
  fillInPerson(core, mayor);
  const player = new BenchPlayer(core, world.director);
  player.select(mayor);
  player.advance("day");
  const packet = () => player.packet as Stop | undefined;
  const resume = () => {
    const open = packet();
    if (open?.kind === "stop")
      player.resume({ kind: "stop", pauseId: open.pauseId! });
    else if (open?.kind === "choice")
      player.resume({ kind: "own-choice", pauseId: open.pauseId! });
  };
  for (let i = 0; i < 6 && packet()?.kind; i += 1) resume();

  const ids = members(api, council.id).map(memberKey);
  const sponsor = ids.find((id) => id !== mayor)!;
  const policies = billCatalog(api, "city")
    .flatMap((s) => s.topics.flatMap((t) => t.policies))
    .filter((p) => p.kind === "policy-question" && p.authority.allowed);
  const policy = policies[0]!;
  const bill = draftBill(api, {
    bodyOfficeId: council.id,
    sponsorId: sponsor,
    provisions: [provisionFor({ policyId: policy.id, operation: "enact" })],
  });
  for (const id of ids) castMemberVote(api, bill.id, id, "yes");
  expect(holdVote(api, bill.id).status).toBe("awaiting-signature");

  // Days of play until the sponsor's visit stops the day: the day the bill
  // reaches the desk, before the desk holds the clock the next morning.
  const reasons = () => (packet()?.stop?.modules ?? []).map((m) => m.reasonKey);
  const visitNow = () =>
    (packet()?.stop?.modules ?? []).find(
      (m) =>
        m.moduleId === "p13-story-director" &&
        (m.recordId ?? "").includes(`bill-presented:${bill.id}`),
    );
  let guard = 0;
  while (guard < 12 && !visitNow()) {
    expect(
      reasons(),
      `${PLACE.name}: the desk held the clock before the visit`,
    ).not.toContain("office-day.desk");
    if (packet()?.kind === "stop" || packet()?.kind === "choice") resume();
    else player.advance("day");
    guard += 1;
  }
  const visit = visitNow();
  expect(
    visit,
    `${PLACE.name}: the sponsor's visit stops the day`,
  ).toBeTruthy();

  // The visit as the player sees it, and the path where the mayor says yes.
  const story = storyScene(
    core,
    world.director,
    mayor,
    visit!.recordId!,
    10 * 60,
  );
  const talk = (story as { talk?: { typeKey: string } }).talk;
  expect(talk?.typeKey).toBe("desk-visit");
  // The path where the mayor says yes, read from the director's own tree
  // (the screen's copy leaves out what each ending keeps).
  const entry = world.director.ledger.people
    .get(mayor)!
    .schedule.find((row) => row.momentId === visit!.recordId)!;
  const composed = purposeScene(core, world.director, mayor, entry, {
    typeKey: "desk-visit",
  });
  expect(composed?.kind).toBe("composed");
  let yes: number[] | undefined;
  if (composed?.kind === "composed")
    (function walk(node: TreeNode, at: number[]) {
      node.replies.forEach((reply, index) => {
        if (yes || !reply.next) return;
        if (reply.next.end?.ending?.id === "their-way") yes = [...at, index];
        else walk(reply.next, [...at, index]);
      });
    })(composed.scene.talk.tree, []);
  expect(yes, `${PLACE.name}: no path where the mayor says yes`).toBeTruthy();
  storyReply(core, world.director, mayor, visit!.recordId!, yes!, {
    typeKey: "desk-visit",
  });

  // Signed through the desk: the act is the mayor's own, the bill is off the
  // desk, and the next stop is not the desk's.
  expect(["signed", "enacted"]).toContain(billOf(api, bill.id).status);
  expect(
    officeActsOf(api, mayor)
      .filter((a) => a.recordId === bill.id)
      .map((a) => a.kind),
  ).toEqual(["sign"]);
  expect(deskWaiting(api).map((b) => b.id)).not.toContain(bill.id);
  // Three days on, the desk never holds the clock for it.
  for (let day = 0; day < 3; day += 1) {
    if (packet()?.kind === "stop" || packet()?.kind === "choice") {
      expect(
        reasons(),
        `${PLACE.name}: the desk held a signed bill`,
      ).not.toContain("office-day.desk");
      resume();
    } else player.advance("day");
  }
  expect(reasons()).not.toContain("office-day.desk");
  process.stdout.write(
    `VISIT-IS-DESK ${PLACE.name}: ${bill.id} ${billOf(api, bill.id).status} after the yes in the visit\n`,
  );

  // The desk stop switched off: the visit does not stop the day either, and
  // nothing is signed or vetoed for the player (owner's card, Nov 14, 02:03Z;
  // Account lead, Nov 14). The bill waits on the desk for its deadline.
  setStops(api, mayor, { desk: false });
  const away = draftBill(api, {
    bodyOfficeId: council.id,
    sponsorId: sponsor,
    provisions: [
      provisionFor({ policyId: policies[1]!.id, operation: "enact" }),
    ],
  });
  for (const id of ids) castMemberVote(api, away.id, id, "yes");
  expect(holdVote(api, away.id).status).toBe("awaiting-signature");
  for (let day = 0; day < 4; day += 1) {
    const stopped = (packet()?.stop?.modules ?? []).filter(
      (m) =>
        m.reasonKey === "office-day.desk" ||
        (m.recordId ?? "").includes(`bill-presented:${away.id}`),
    );
    expect(
      stopped,
      `${PLACE.name}: stopped with the desk switched off ${JSON.stringify(stopped)}`,
    ).toEqual([]);
    if (packet()?.kind === "stop" || packet()?.kind === "choice") resume();
    else player.advance("day");
  }
  const staged = world.director.ledger.people
    .get(mayor)!
    .schedule.find((row) => row.momentId.includes(`bill-presented:${away.id}`));
  expect(
    staged?.outcome,
    `${PLACE.name}: the visit with the switch off`,
  ).not.toBe("scene-now");
  expect(
    officeActsOf(api, mayor).filter((a) => a.recordId === away.id),
    `${PLACE.name}: decided for the player with the desk switched off`,
  ).toEqual([]);
  expect(billOf(api, away.id).status).toBe("awaiting-signature");
  process.stdout.write(
    `VISIT-SWITCH-OFF ${PLACE.name}: ${away.id} still ${billOf(api, away.id).status}, visit ${staged?.outcome ?? "not staged"}\n`,
  );
  setBookkeeping(bookkeeping);
}, 120_000);
