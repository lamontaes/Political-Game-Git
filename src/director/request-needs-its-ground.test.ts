import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import {
  PARTY_ASKED_EVENT,
  filingWindowOpens,
} from "../core2/modules/candidacy";
import {
  ELECTIONS_MODULE_ID,
  type ContestRow,
} from "../core2/modules/elections";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";

// Words rule request-needs-its-ground (owner, Oct 15: "The party asks
// someone to run only with some inroads on record"): every party-asked
// record goes to a member who knows the chair or has a tie with them on
// record. Read from the records of a played world at pinned places, through
// the game's own path: the party asks once filing opens.
//
// The rule's other two cases have no line to check yet: no bank line says
// "I'll take the meeting", and a donor's lean is staged only from a gift on
// record (the donor-ask scene's causes are campaign-gift and cause.donated).
const SEED = "c29-party-ask-refused";
// Pinned drawn places (one seed, fixed tags): "a" is Floydale, South
// Carolina; "d" is Denver, Pennsylvania. Both had asks to strangers before
// the filter (Nov 14).
const TAGS = ["a", "d"];

it.each(TAGS)(
  "a party asks only members with inroads on record (%s)",
  (tag) => {
    setBookkeeping(false);
    const place = drawPlace(SEED, `party-ask-refused:${tag}`);
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const asks: { id: string; askedId: PersonId; chairId: PersonId }[] = [];
    api.subscribeEvents("request-ground", [PARTY_ASKED_EVENT], (_, e) => {
      asks.push({
        id: e.id,
        askedId: (e.facts as Record<string, string>).askedId as PersonId,
        chairId: e.personIds![1] as PersonId,
      });
    });
    const opens = (
      api
        .moduleState(ELECTIONS_MODULE_ID)
        .table("contests")
        .rows() as unknown as ContestRow[]
    )
      .map((contest) => filingWindowOpens(api, contest))
      .filter((date) => date > core.date)
      .sort()[0]!;
    advanceCore(core, addDays(makeIsoDate(opens), 20));
    expect(asks.length, `${where}: no party asked anyone`).toBeGreaterThan(0);
    const strangers = asks.filter(
      ({ askedId, chairId }) =>
        !core.people.get(askedId)?.knownIds.has(chairId) &&
        !core.relationships.has(
          askedId < chairId ? `${askedId}:${chairId}` : `${chairId}:${askedId}`,
        ),
    );
    expect(
      strangers.map((ask) => ask.id),
      `${where}: asked with no inroads`,
    ).toEqual([]);
  },
  240_000,
);
