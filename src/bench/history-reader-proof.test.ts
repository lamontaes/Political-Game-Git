// @vitest-environment node
// The world first, as the game loads it.
import {
  buildBenchWorldInStages,
  OPENING_WARMUP_DAYS,
  type BenchWorld,
} from "./world";
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import {
  historyEvent,
  historyOf,
  recordOf,
  type HistoryAsk,
  type HistoryScope,
} from "../core2/past";
import type { CoreState, PersonId } from "../core2/types";
import { composeJournal } from "../director/journal";
import { heardItems } from "./calendar";
import { knownCard } from "./card";
import { loadingStory } from "./loading";
import { nationStories } from "./nation-news";
import { BenchPlayer } from "./player";

// The owner, Nov 25: "THE JOURNAL, DIRECTOR, PERSON CARDS, ETC ALL PULL FROM
// THE SAME HISTORY". Every past event a system shows (the loading story, a
// person's card, the Journal, the news) cites records; each cited record that
// is a stored record of the past or of play (the pre-start history, the log,
// a fact a person was made with, an engine's history row) must come back from
// the one history reader in that system's own scope. A cited record of the
// present (a person, a household, a job, a law in force) is no past event and
// is counted apart.
//
// One drawn place on every run; HISTORY_PROOF=full runs the six packet seeds
// (scripts/words/first-evening-packet.ts) and twenty drawn places.
setBookkeeping(false);
const PACKET_SEEDS = [
  "aecea4",
  "66265b",
  "bd3806",
  "2d2283",
  "3c42e6",
  "d8e52e",
];
const full = process.env.HISTORY_PROOF === "full";
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const DRAWN = full ? 20 : 1;

interface Tally {
  system: string;
  shown: number;
  past: number;
  present: number;
  untraced: string[];
}

/** Whether an id is a stored record of the past or of play (the reader's stores). */
function isPastRecord(core: CoreState, id: string, owner?: PersonId): boolean {
  return core.durableLog.has(id as never) || !!recordOf(core, id, owner);
}

/** The ids a set of reads of the one reader returns. */
function idsOf(
  core: CoreState,
  reads: readonly [HistoryScope, HistoryAsk?][],
): Set<string> {
  const out = new Set<string>();
  for (const [scope, ask] of reads)
    for (const event of historyOf(core, scope, ask)) out.add(event.id);
  return out;
}

function tally(
  core: CoreState,
  system: string,
  cited: readonly { id: string; owner?: PersonId }[],
  scope: Set<string>,
): Tally {
  const row: Tally = {
    system,
    shown: cited.length,
    past: 0,
    present: 0,
    untraced: [],
  };
  for (const { id, owner } of cited) {
    if (!isPastRecord(core, id, owner)) {
      row.present += 1;
      continue;
    }
    row.past += 1;
    if (!scope.has(id)) row.untraced.push(id);
  }
  return row;
}

function proveWorld(
  core: CoreState,
  director: BenchWorld["director"] | undefined,
  playerId: PersonId,
  where: string,
): Tally[] {
  const me = playerId;
  const player = core.people.get(me)!;
  const household = core.households.get(player.householdId)!;
  const out: Tally[] = [];
  const personReads = (id: PersonId): [HistoryScope, HistoryAsk?][] => [
    [{ person: id }],
    [{ person: id }, { from: "built" }],
    [{ person: id }, { from: "past" }],
    [{ person: id }, { from: "played" }],
    [
      { person: id },
      { kinds: ["job-change:hire", "office.elected", "office.seat-reached"] },
    ],
  ];

  // The loading story: each sentence's record.
  const loading = loadingStory(core, me).years.flatMap((year) =>
    year.lines.map((line) => ({ id: line.recordId, owner: me })),
  );
  out.push(
    tally(
      core,
      "loading story",
      loading,
      idsOf(core, [
        ...personReads(me),
        [{ nation: true }, { kinds: ["century.presidency"] }],
      ]),
    ),
  );

  // Every card the player can open at home and around town: each line of
  // their story, each seat reached, by its records.
  const town = [...(core.peopleByPlace.get(player.placeId) ?? [])]
    .filter((id) => !household.memberIds.includes(id))
    .sort()
    .slice(0, 6);
  for (const id of [...household.memberIds, ...town] as PersonId[]) {
    const card = knownCard(core, me, id) as unknown as {
      history?: { recordId?: string; records?: string[] }[];
      seats?: { recordId: string }[];
    };
    const cited = [
      ...(card.history ?? []).flatMap((line) => [
        ...(line.records ?? []),
        ...(line.recordId ? [line.recordId] : []),
      ]),
      ...(card.seats ?? []).map((seat) => seat.recordId),
    ].map((recordId) => ({ id: recordId, owner: id }));
    out.push(tally(core, "person card", cited, idsOf(core, personReads(id))));
  }

  // The Journal: each line's records, as the player's session composes it.
  if (director) {
    new BenchPlayer(core, director).select(me);
    const journal = composeJournal(core, director, me, {
      through: core.date as never,
    }).flatMap((chapter) =>
      chapter.lines.flatMap((line) =>
        line.sourceRecordIds.map((id) => ({ id, owner: me })),
      ),
    );
    out.push(
      tally(
        core,
        "Journal",
        journal,
        idsOf(core, [
          ...household.memberIds.flatMap((id) => personReads(id as PersonId)),
          [{ household: household.id }],
          [{ nation: true }, { from: "played" }],
          [{ nation: true }, { from: "past" }],
        ]),
      ),
    );
  }

  // The news: every story the player has heard and the nation's laws, by
  // the records each story cites.
  const stories = [
    ...heardItems(core, me),
    ...nationStories(core, "Nation", me),
  ] as unknown as { sourceRecordIds?: readonly string[] }[];
  const news = stories.flatMap((story) =>
    (story.sourceRecordIds ?? []).map((id) => ({ id })),
  );
  out.push(
    tally(
      core,
      "news",
      news,
      new Set([
        ...idsOf(core, [
          [{ nation: true }, { from: "played" }],
          [{ nation: true }, { from: "past" }],
          [
            { nation: true },
            {
              kinds: [
                "office.elected",
                "century.presidency",
                "press.printed",
                "press.archived",
              ],
            },
          ],
        ]),
        // A fact a person was made with that a story cites (a birthplace):
        // the reader opens it by its id.
        ...news
          .map((row) => row.id)
          .filter((id) => recordOf(core, id)?.from === "built"),
      ]),
    ),
  );
  process.stdout.write(
    `history proof: ${where}: ${out
      .reduce((sum, row) => {
        const at = sum.find((s) => s.system === row.system);
        if (at) {
          at.shown += row.shown;
          at.past += row.past;
          at.present += row.present;
          at.untraced.push(...row.untraced);
        } else sum.push({ ...row, untraced: [...row.untraced] });
        return sum;
      }, [] as Tally[])
      .map(
        (row) =>
          `${row.system} ${row.past} past events traced of ${row.shown} cited (${row.present} of the present)${row.untraced.length ? `, ${row.untraced.length} UNTRACED` : ""}`,
      )
      .join("; ")}\n`,
  );
  return out;
}

describe("every past event a system shows comes from the one history reader", () => {
  if (full)
    for (const packetSeed of PACKET_SEEDS)
      it(`packet seed ${packetSeed}`, { timeout: 600_000 }, async () => {
        const world = await buildBenchWorldInStages(
          packetSeed,
          gameStartDate(),
          { twoLevel: true, warmUpDays: OPENING_WARMUP_DAYS },
          () => undefined,
        );
        const where = `${world.place.displayName}, packet seed ${packetSeed}`;
        const rows = proveWorld(
          world.core,
          world.director,
          world.playerId as PersonId,
          where,
        );
        expect(
          rows.flatMap((row) =>
            row.untraced.map((id) => `${row.system}: ${id}`),
          ),
          where,
        ).toEqual([]);
        expect(
          rows.reduce((sum, row) => sum + row.past, 0),
          where,
        ).toBeGreaterThan(0);
      });

  for (let draw = 0; draw < DRAWN; draw++)
    it(`drawn place ${draw + 1}`, { timeout: 600_000 }, async () => {
      const drawSeed = draw === 0 ? seed : `${seed}:${draw}`;
      const place = drawPlace(drawSeed, "history-reader-proof");
      const where = `${place.name} (${place.key}), seed ${drawSeed}`;
      // Built as a new life is, the opening's warm-up included, so the
      // Journal and the news hold what a player meets.
      const world = await buildBenchWorldInStages(
        place.seed,
        gameStartDate(),
        {
          twoLevel: true,
          placeKey: place.key,
          warmUpDays: OPENING_WARMUP_DAYS,
        },
        () => undefined,
      );
      const rows = proveWorld(
        world.core,
        world.director,
        world.playerId as PersonId,
        where,
      );
      expect(
        rows.flatMap((row) => row.untraced.map((id) => `${row.system}: ${id}`)),
        where,
      ).toEqual([]);
      expect(
        rows.reduce((sum, row) => sum + row.past, 0),
        where,
      ).toBeGreaterThan(0);
      // Every event the reader tells opens by its id the same way.
      for (const id of historyOf(world.core, {
        person: world.playerId as PersonId,
      })
        .filter((event) => event.from !== "built")
        .map((event) => event.id))
        expect(historyEvent(world.core, id), `${id} at ${where}`).toBeDefined();
    });
});
