// @vitest-environment node
// The world first, as the game loads it.
import {
  buildBenchWorldInStages,
  NoPlayerHereError,
  OPENING_WARMUP_DAYS,
  type BenchWorld,
} from "./world";
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import {
  historyEvent,
  historyOf,
  PAST_BILL_VOTED,
  PAST_LAW_ENACTED,
  recordOf,
  type HistoryAsk,
  type HistoryScope,
} from "../core2/past";
import type { CoreState, PersonId } from "../core2/types";
import { composeJournal } from "../director/journal";
import { COUNTED_ENGINE, findRecord, PLACE_ENGINE } from "./dev-trace";
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
// is counted apart, but only where it is kept in one of the live stores named
// below (as dev Trace finds it): a cited id that is neither fails the proof.
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
  unkept: number;
  untraced: string[];
}

/**
 * Records a system cites that no store keeps, each by its cause; any other
 * fails. The state's monthly jobs report is emitted with the state as its
 * place (src/core2/modules/regional.ts, stepRegional), and the log keeps a
 * public record only of a place the player can see, the town and its county
 * (src/core2/state.ts, the keep rule's `visiblePlaceIds`): the news prints the
 * report from the emission, and nothing keeps it for the reader to tell. A
 * magazine's profile of a person cites the item the press engine made for it
 * (src/core2/modules/press.ts, the profile pass: `profile:<outlet>:<subject>:<day>`),
 * which no store keeps; the printed story is the record.
 */
const UNKEPT = [
  /^event:economy\.state-jobs-report:[A-Z]{2}:\d{4}-\d{2}$/,
  /^profile:outlet:[^:]+:\d+:.+:\d{4}-\d{2}-\d{2}$/,
];

/**
 * The live stores a cited record of the present is kept in, by dev Trace's
 * names for them: who and what exists now (people, households, jobs,
 * organizations, places, the counted population), an office, a law in force
 * or set to take effect, a bill before a body at its stage now, and a term
 * still served (an ended one is the past, and the reader must tell it).
 * Nothing here is a record of what happened.
 */
const PRESENT_STORES = new Set([
  "core.people",
  "core.husks",
  "core.households",
  "core.jobs",
  "core.organizations",
  "core.publicOrganizations",
  "core.relationships",
  "core.familyLinks",
  "core.memberships",
  PLACE_ENGINE,
  COUNTED_ENGINE,
  "core2-laws-v1.laws",
  "core2-offices-v1.offices",
  "core2-legislature-v1.bills",
]);

/**
 * Where a cited record of the present is kept: a live store, or a catalog the
 * line reads (a policy question, a research file). Undefined for anything else.
 */
function presentStore(core: CoreState, id: string): string | undefined {
  if (/^question:[a-z-]+-positions:[a-z-]+\.[a-z0-9-]+$/.test(id))
    return "the question catalog";
  if (id.startsWith("data/research/") && existsSync(id.split("#")[0]!))
    return "a research file";
  const found = findRecord(core, id);
  if (
    found?.engine === "core2-offices-v1.terms" &&
    (found.record as { status?: string }).status === "serving"
  )
    return found.engine;
  return found && PRESENT_STORES.has(found.engine) ? found.engine : undefined;
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
    unkept: 0,
    untraced: [],
  };
  for (const { id, owner } of cited) {
    if (!isPastRecord(core, id, owner)) {
      if (presentStore(core, id)) row.present += 1;
      else if (UNKEPT.some((form) => form.test(id))) row.unkept += 1;
      else
        row.untraced.push(
          `${id} (kept ${findRecord(core, id)?.engine ?? "nowhere"}, not by the reader nor a live store)`,
        );
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
                PAST_BILL_VOTED,
                PAST_LAW_ENACTED,
              ],
            },
          ],
          // A fact a person was made with that a story cites (a birthplace):
          // what that person was made with, as the reader reads it.
          ...[
            ...new Set(
              news
                .map((row) => recordOf(core, row.id))
                .filter((found) => found?.from === "built" && found.personId)
                .map((found) => found!.personId!),
            ),
          ].map((person): [HistoryScope, HistoryAsk] => [
            { person },
            { from: "built" },
          ]),
        ]),
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
          at.unkept += row.unkept;
          at.untraced.push(...row.untraced);
        } else sum.push({ ...row, untraced: [...row.untraced] });
        return sum;
      }, [] as Tally[])
      .map(
        (row) =>
          `${row.system} ${row.past} past events traced of ${row.shown} cited (${row.present} of the present${row.unkept ? `, ${row.unkept} kept by no store` : ""})${row.untraced.length ? `, ${row.untraced.length} UNTRACED` : ""}`,
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
    it(`drawn place ${draw + 1}`, { timeout: 900_000 }, async () => {
      // A place where no adult lives in a household (all of them in group
      // quarters) has no one to play: it is passed over by name and the
      // place drawn again.
      const passed: string[] = [];
      let world: BenchWorld | undefined;
      let where = "";
      for (let again = 0; !world; again++) {
        const drawSeed =
          (draw === 0 ? seed : `${seed}:${draw}`) +
          (again ? `:again:${again}` : "");
        const place = drawPlace(drawSeed, "history-reader-proof");
        where = `${place.name} (${place.key}), seed ${drawSeed}`;
        try {
          // Built as a new life is, the opening's warm-up included, so the
          // Journal and the news hold what a player meets.
          world = await buildBenchWorldInStages(
            place.seed,
            gameStartDate(),
            {
              twoLevel: true,
              placeKey: place.key,
              warmUpDays: OPENING_WARMUP_DAYS,
            },
            () => undefined,
          );
        } catch (error) {
          if (!(error instanceof NoPlayerHereError) || again >= 4) throw error;
          passed.push(`${where}: ${error.message}`);
        }
      }
      if (passed.length)
        process.stdout.write(
          `history proof: passed over ${passed.join("; ")}\n`,
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
