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
import { CANDIDACY_MODULE_ID } from "../core2/modules/candidacy";
import { PARTIES_MODULE_ID } from "../core2/modules/parties";
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
// Old premise: Floydale and Denver, Pennsylvania, pinned inside a 600 s limit;
// Denver spends over two minutes playing its first eight days. New premise:
// two small named places, about 55 s each, limit 120 s each (Account lead,
// Nov 15).
// Pinned drawn places (one seed, fixed tags): "a" is Floydale, South
// Carolina; "f" is Fox Chase, Kentucky. Both stage the ask at home the day
// filing opens and run in under a minute. Denver, Pennsylvania (tag "d")
// passes too but spends over two minutes playing its first days, so it is
// not pinned; tags "c", "e", "g" and "h" have no ask left for the player
// on the opening day, so they are not pinned either.
const TAGS = ["a", "f"];

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
        // Only an ask written after the day's weighing waits on an answer (the
        // party has no one filed); the asks before it go to members who weigh
        // the seat that day (gov-party-ask-comes-after-the-days-weighing).
        const weighed = api
          .moduleState(CANDIDACY_MODULE_ID)
          .table("weighed")
          .get(f.contestId!) as unknown as
          { filedOn: string | null } | undefined;
        if (player || !weighed?.filedOn) return;
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
    // The day before filing opens, every party member is in the player's
    // circle, as the member the party asks is in a played game before the ask
    // is written, so the game's own rule keeps the ask's record (it keeps a
    // record that names someone in the circle, when the record is written).
    advanceCore(core, addDays(makeIsoDate(opens), -1));
    for (const tie of api
      .moduleState(PARTIES_MODULE_ID)
      .table("ties")
      .rows() as unknown as { tie: string; personId: string }[])
      if (tie.tie === "party") core.focusPersonIds.add(tie.personId);
    advanceCore(core, addDays(makeIsoDate(opens), 1));
    expect(ask, `${where}: no party asked the player`).toBeDefined();
    const before = asks.length;
    // The party waits on the player: no other member of that party has been
    // asked for that seat since (one asked before the day's weighing said no
    // or was not weighed in, which is why the party is asking the player).
    expect(
      asks
        .slice(asks.findIndex((row) => row.id === ask!.id) + 1)
        .filter(
          (row) =>
            row.partyId === ask!.partyId && row.contestId === ask!.contestId,
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
  120_000,
);
