import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { PLATFORM_QUESTIONS } from "../core2/campaign-data";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import {
  authorityFor,
  billOf,
  draftBill,
  type Provision,
} from "../core2/modules/legislature";
import { releaseHold } from "../core2/modules/office-day";
import { townSeats } from "../core2/modules/offices";
import { advancePlayerV1, resumePlayerV1 } from "../core2/player-v1";
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import { purposeScene, replyInScene } from "../director/purpose-scene";
import { billStage } from "./bill-stage";
import { BenchPlayer } from "./player";
import { buildBenchWorld } from "./world";

// The bill the player sponsors carries the members who signed on beside them: for the bill and close to
// the sponsor, by name on the paper.
// Pinned (Nov 16). Before, the seed came at run time from COSPONSORS_SEED, GOLDEN_PATH_SEED or
// randomBytes, and the case drew up to twelve places and read the bill's names right after the draft.
// Old premise: a drafted bill already carries its cosponsors. It never does: the draft sends one ask
// to each close colleague (legislature.ts askToSignOn), the director stages each as the player's own
// ask, a bill-sign-on scene that stops play the morning after the draft, and a name goes on the bill
// only when the colleague says yes in that scene (answerSignOn). At Castle Dale, Utah six drafts sent
// 24 asks and 24 scenes were staged; read at the draft, every bill had none. So the player here lives
// to the morning the scenes stop, plays them through the director (as bill-sign-on.test does), takes
// the yes when a colleague agrees, and reads the names off the paper.
// The fixed seed draws Castle Dale, Utah (4910660) first for "cosponsors"; the player is the state
// senator who holds the town's upper-house seat.
// Limit: the case took 21 s (Nov 16, Train 6e9df72b); its limit is about twice that, 45 s.
// Seen red with the scene's reply left out: "1 colleague(s) said yes, and no bill carries a name".
const seed = "pin-bill-cosponsors";
const PLACE = {
  key: "4910660",
  name: "Castle Dale, Utah",
  seed: "81aaa5206046e0a83c9ad3165ef1c0c944d38d751017c0ac581cc6bc6b006829",
};
const TYPE = "bill-sign-on";

it("draws its pinned place from the fixed seed", () => {
  expect(drawPlace(`${seed}:0`, "cosponsors")).toMatchObject(PLACE);
});

/** The player lives their days through `through`; the office day's holds are let go, as the bench's dev route does. */
function livePlayer(core: CoreState, player: PersonId, through: string) {
  let packet: ReturnType<typeof advancePlayerV1> | undefined = advancePlayerV1(
    core,
    {
      controlledPersonId: player,
      through: { date: makeIsoDate(through), minuteOfDay: 0 },
    },
  );
  while (packet && packet.kind !== "complete") {
    if (packet.kind === "stop")
      for (const row of packet.stop.modules)
        if (row.hold) releaseHold(coreAPI(core), row.recordId);
    packet =
      packet.kind === "stop"
        ? resumePlayerV1(core, { kind: "stop", pauseId: packet.pauseId })
        : resumePlayerV1(core, {
            kind: "choice",
            pauseId: packet.pauseId,
            offerId: packet.offers[0]!.offerId,
          });
  }
}

describe(`cosponsors on the player's bill (seed ${seed})`, () => {
  it("names the members who signed on beside the player", () => {
    setBookkeeping(false);
    const world = buildBenchWorld(PLACE.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: PLACE.key,
    });
    const { core, director } = world;
    const api = coreAPI(core);
    const where = `${PLACE.name} (${PLACE.key}), seed ${PLACE.seed}`;
    const seat = townSeats(api).find((s) =>
      s.office.kind.startsWith("legislature-"),
    );
    const member = seat?.holder?.personId as PersonId | undefined;
    expect(member && core.people.has(member), `${where}: a member`).toBe(true);
    // The player takes the seat and lives their first day, as the old case did.
    const player = new BenchPlayer(core, director);
    player.select(member!);
    const first = core.date;
    for (let guard = 0; guard < 50 && core.date <= first; guard++) {
      const packet = player.packet;
      if (packet?.kind === "stop")
        player.resume({ kind: "stop", pauseId: packet.pauseId });
      else if (packet?.kind === "choice")
        player.resume({ kind: "own-choice", pauseId: packet.pauseId });
      else player.advance("day");
    }
    const drafted: string[] = [];
    for (const question of PLATFORM_QUESTIONS) {
      const provision: Provision = {
        kind: "policy-question",
        question,
        value: 1,
      };
      if (!authorityFor(api, provision).allowed) continue;
      const draft = draftBill(api, {
        bodyOfficeId: seat!.office.id,
        sponsorId: member!,
        provisions: [provision],
      });
      if (draft.status === "blocked") continue;
      // Read at the draft, the bill carries no name yet.
      expect(billStage(core, draft.id, member!).cosponsors, where).toEqual([]);
      drafted.push(draft.id);
    }
    expect(drafted.length, `${where}: bills drafted`).toBeGreaterThan(0);
    livePlayer(core, member!, addDays(makeIsoDate(core.date), 1));
    const book = director.ledger.people.get(member!)!;
    const asks = book.schedule.filter((row) =>
      row.bindings.some((b) => b.typeKey === TYPE),
    );
    expect(asks.length, `${where}: the asks are staged`).toBeGreaterThan(0);
    const signed: string[] = [];
    for (const entry of asks) {
      const result = purposeScene(core, director, member!, entry, {
        typeKey: TYPE,
      });
      if (result?.kind !== "composed") continue;
      const tree = result.scene.talk.tree;
      // A colleague who agrees is thanked; anyone else is left for another day.
      if (tree.lines[0]!.move !== "agree") continue;
      const thank = tree.replies.findIndex(
        (reply) => reply.line.move === "thank",
      );
      expect(
        replyInScene(core, director, member!, entry, [Math.max(thank, 0)], {
          typeKey: TYPE,
        }),
        `${where}: the reply is recorded`,
      ).toBeTruthy();
      signed.push(result.scene.talk.askerId);
    }
    expect(signed.length, `${where}: a colleague says yes`).toBeGreaterThan(0);
    for (const billId of drafted) {
      const stage = billStage(core, billId, member!);
      if (!stage.cosponsors.length) continue;
      expect(
        stage.cosponsors.every((c) => c.name.length > 0),
        where,
      ).toBe(true);
      expect(billOf(api, billId)!.sponsorId, where).toBe(member);
      expect(
        billOf(api, billId)!.cosponsors!.every((id) => signed.includes(id)),
        `${where}: every name said yes`,
      ).toBe(true);
      console.log(
        `cosponsors: ${where}, ${billOf(api, billId)!.number} signed by ${stage.cosponsors.map((c) => c.name).join(", ")}`,
      );
      return;
    }
    throw new Error(
      `${where}: ${signed.length} colleague(s) said yes, and no bill carries a name`,
    );
  }, 45_000);
});
