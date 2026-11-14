import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import {
  PARTY_ASKED_EVENT,
  decisionOf,
  filingWindowOpens,
} from "../core2/modules/candidacy";
import {
  ELECTIONS_MODULE_ID,
  type ContestRow,
} from "../core2/modules/elections";
import { registerControlledPersonV1 } from "../core2/player-control-state-v1";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { purposeScene, replyInScene } from "./purpose-scene";

// A party's ask for a seat stops at the player, and the player's no or
// not-now sends the party on to its next member while filing is open
// (SG-P15-party-ask-after-player). A rare case, staged through the game's own
// path: in each pinned place the first member the party would ask becomes the
// player, the ask arrives the day filing opens, the player turns it down in
// the scene, and the party's next ask is a record for another member that
// the member's decision cites.
const SEED = "c29-party-ask-refused";
// Pinned drawn places (one seed, fixed tags): "a" is Floydale, South
// Carolina; "d" is Denver, Pennsylvania. Other tags drawn from this seed
// stage no scene for the ask at home that day, so they are not pinned.
const TAGS = ["a", "d"];

it.each(TAGS)(
  "the party asks its next member after the player says no (%s)",
  (tag) => {
    setBookkeeping(false);
    const place = drawPlace(SEED, `party-ask-refused:${tag}`);
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const contests = () =>
      api
        .moduleState(ELECTIONS_MODULE_ID)
        .table("contests")
        .rows() as unknown as ContestRow[];
    let player: PersonId | undefined;
    let ask: { id: string; contestId: string; partyId: string } | undefined;
    const asks: {
      id: string;
      askedId: string;
      partyId: string;
      contestId: string;
    }[] = [];
    // The first member a party asks becomes the player the moment the ask is
    // made (the party's loop stops at the player and waits on the answer).
    api.subscribeEvents(
      "c29-party-ask-refused",
      [PARTY_ASKED_EVENT],
      (_, e) => {
        const f = e.facts as Record<string, string>;
        asks.push({
          id: e.id,
          askedId: f.askedId!,
          partyId: f.partyId!,
          contestId: f.contestId!,
        });
        if (player) return;
        player = f.askedId as PersonId;
        registerControlledPersonV1(core, player);
        core.focusPersonIds.add(player);
        director.watch(core, player);
        ask = { id: e.id, contestId: f.contestId!, partyId: f.partyId! };
      },
    );
    const opens = contests()
      .map((c) => filingWindowOpens(api, c))
      .filter((date) => date > core.date)
      .sort()[0]!;
    advanceCore(core, addDays(makeIsoDate(opens), 1));
    expect(ask, `${where}: no party asked the player`).toBeDefined();
    const before = asks.length;
    // The party waits on the player: no other member of that party has been
    // asked for that seat yet.
    expect(
      asks.filter(
        (row) =>
          row.partyId === ask!.partyId &&
          row.contestId === ask!.contestId &&
          row.id !== ask!.id,
      ),
      where,
    ).toEqual([]);
    const book = director.ledger.people.get(player!)!;
    const entry = book.schedule.find(
      (row) =>
        book.momentsById.get(row.momentId)?.causeId === ask!.id &&
        row.bindings.some((binding) => binding.typeKey === "party-recruit"),
    );
    expect(entry, `${where}: no scene for the ask`).toBeDefined();
    const result = purposeScene(core, director, player!, entry!, {
      typeKey: "party-recruit",
    });
    expect(result?.kind, where).toBe("composed");
    if (result?.kind !== "composed") return;
    const no = result.scene.talk.tree.replies.findIndex(
      (reply) => reply.line.move === "decline" || reply.line.move === "stall",
    );
    expect(no, `${where}: no way to say no`).toBeGreaterThanOrEqual(0);
    const replyId = replyInScene(core, director, player!, entry!, [no], {
      typeKey: "party-recruit",
    });
    expect(replyId, where).toBeTruthy();
    // The player is not a candidate for the seat, and the party's next
    // member is asked, citing a new ask record.
    expect(decisionOf(api, ask!.contestId, player!)?.run ?? false, where).toBe(
      false,
    );
    const next = asks
      .slice(before)
      .find(
        (row) =>
          row.partyId === ask!.partyId &&
          row.contestId === ask!.contestId &&
          row.askedId !== player,
      );
    expect(next, `${where}: the party asked no one after the no`).toBeDefined();
    const decision = decisionOf(api, ask!.contestId, next!.askedId as PersonId);
    expect(decision?.sourceIds, where).toContain(next!.id);
    process.stdout.write(
      `PARTY ASK REFUSED ${where}: ${ask!.id} refused (${replyId}); next ${next!.id}\n`,
    );
  },
  600_000,
);
