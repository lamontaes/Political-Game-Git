import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import { LAWS_MODULE_ID, lawChain } from "../core2/modules/laws";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import {
  circumstancePicks,
  CIRCUMSTANCES,
  lawReaches,
  rowsByKind,
  type CastWeights,
  type CircumstanceRow,
  type QueuedRecord,
} from "./circumstance";

// Whose business a law is (owner, Nov 15: a law that cannot reach the player
// stays on the bench; the owner met a stop about the U.S. Virgin Islands' law
// with Texas as home). A law's story or effect calls a stop on the street
// only when the law is of the player's own town's chain (town, county, state),
// the nation's, or an office they hold: read from the law's own row by the
// record's `lawId`. A law the laws engine does not hold is not known to reach
// them. Pinned to one place and seed; the records are set by hand, since the
// check is of the cast's gate alone (the player's standing is set to anyone so
// the row's own player rule does not hide the reach rule under test).

const SEED = "pa-seed-9320";
const NAME = "Port O'Connor, Texas";

const weights: CastWeights = {
  named: 1,
  witnessed: 0.5,
  tie: 1,
  sociability: 0,
  traitScale: 1,
  newsTellerMinAge: 0,
};

it("a law outside the player's town, state and nation stays on the bench; one inside it stages the stop", () => {
  setBookkeeping(false);
  const place = drawPlace(SEED, "pa-a");
  expect(place.name).toBe(NAME);
  const { core, director, playerId } = buildBenchWorld(
    place.seed,
    gameStartDate(),
    { twoLevel: true, placeKey: place.key },
  );
  const api = coreAPI(core);
  const chain = lawChain(api);
  const laws = api.moduleState(LAWS_MODULE_ID).table("laws").rows() as {
    id: string;
    jurisdiction: string;
  }[];
  const own = laws.find((row) => row.jurisdiction === chain.stateKey);
  const federal = laws.find((row) => row.jurisdiction === "US");
  expect(own, "a law of the player's own state").toBeDefined();
  // The played world's laws engine holds only the town's chain (US and the
  // state), so another government's law is set as a row by hand: the U.S.
  // Virgin Islands' copy of the state's first law, the case the owner met.
  const elsewhere = {
    ...own!,
    id: "law:US-VI:proof:minimum-wage:general:2009-07-24",
    jurisdiction: "US-VI",
  };
  api
    .moduleState(LAWS_MODULE_ID)
    .table("laws")
    .put(elsewhere as never);
  const player = playerId as PersonId;
  const witness = [...core.people.values()].find(
    (person) =>
      person.alive &&
      person.id !== player &&
      person.placeId === core.people.get(player)!.placeId &&
      ageOnDate(person.birthDate, makeIsoDate(core.date)) >= 18,
  )!;
  director.watch(core, player);
  const book = director.ledger.people.get(player)!;
  // The law-news row as it is, but open to a player of any standing.
  const open = (row: CircumstanceRow): CircumstanceRow => ({
    ...row,
    player: "anyone",
  });
  const rows = CIRCUMSTANCES.rows.filter((row) => row.reach === "player");
  expect(rows.map((row) => row.id).sort()).toEqual([
    "law-news-street",
    "law-reached-street",
  ]);
  const where = `${place.name} (${place.key}), seed ${SEED}`;
  const picked = (kind: string, lawId: string) => {
    const record: QueuedRecord = {
      id: `proof:${kind}:${lawId}`,
      kind,
      personIds: [witness.id as PersonId],
      witnessIds: [witness.id as PersonId],
      facts: { lawId },
      direct: true,
    };
    const byKind = rowsByKind({
      ...CIRCUMSTANCES,
      rows: rows.map(open),
    });
    return circumstancePicks(core, book, [record], weights, {
      importance: () => 0,
      staged: new Set<string>(),
      due: () => true,
      byKind,
    }).map((pick) => pick.row.id);
  };
  // The check bites: the same rows without the reach rule stage the other
  // state's law (what the owner met).
  const bare = rowsByKind({
    ...CIRCUMSTANCES,
    rows: rows.map((row) => ({ ...open(row), reach: undefined })),
  });
  expect(
    circumstancePicks(
      core,
      book,
      [
        {
          id: "proof:bare",
          kind: "news.read",
          personIds: [witness.id as PersonId],
          witnessIds: [witness.id as PersonId],
          facts: { lawId: elsewhere.id },
          direct: true,
        },
      ],
      weights,
      {
        importance: () => 0,
        staged: new Set<string>(),
        due: () => true,
        byKind: bare,
      },
    ).map((pick) => pick.row.id),
    where,
  ).toContain("law-news-street");
  // Its own state's law, the nation's, and the town's own reach the player.
  expect(picked("news.read", own!.id), where).toContain("law-news-street");
  if (federal)
    expect(picked("news.read", federal.id), where).toContain("law-news-street");
  // Another state's law does not, in either row, and nor does a law no one holds.
  expect(picked("news.read", elsewhere.id), where).toEqual([]);
  expect(picked("law.effect-learned", elsewhere.id), where).toEqual([]);
  expect(picked("news.read", "law:no-such-law"), where).toEqual([]);
  // The same law of another state does reach someone who holds an office of it.
  expect(lawReaches(core, { officeIds: new Set() }, elsewhere.id)).toBe(false);
  process.stdout.write(
    `WHOSE BUSINESS ${where}: own ${own!.jurisdiction} stages; ${elsewhere.jurisdiction} stays on the bench\n`,
  );
}, 120_000);
