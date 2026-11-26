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
  PAST_BUSINESS_CLOSED,
  PAST_LAW_ENACTED,
  recordOf,
  type HistoryAsk,
  type HistoryScope,
} from "../core2/past";
import type { CoreState, PersonId } from "../core2/types";
import { composeJournal } from "../director/journal";
import { coreAPI } from "../core2/state";
import {
  COUNTED_ENGINE,
  findRecord,
  PAST_FACT_ENGINE,
  PLACE_ENGINE,
} from "./dev-trace";
import { heardItems } from "./calendar";
import { knownCard } from "./card";
import { loadingStory } from "./loading";
import { nationStories } from "./nation-news";
import { BenchPlayer } from "./player";

// The owner, Nov 25: "THE JOURNAL, DIRECTOR, PERSON CARDS, ETC ALL PULL FROM
// THE SAME HISTORY". Every past event a system shows (the loading story, a
// person's card, the Journal, the news) cites records. Each cited record is
// put in exactly one bucket, in this order, and a record in none fails:
// - the past: a stored record of the past or of play (the pre-start history,
//   the log, a fact a person was made with, what a person remembers, an
//   engine's history row). It must come back from the one history reader in
//   that system's own scope;
// - the present: kept in one of the live stores named below (as dev Trace
//   finds it), or a catalog the line reads;
// - a kept series of measurements (a month of metrics), not an event;
// - kept only by its engine, not yet handed to the reader (named below);
// - the item a printed story the reader returned was made from (its
//   `sourceRecordId`: a press wire row, or an item made for the story), a
//   printed story only;
// - kept by no store, each by its cause (named below).
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

const BUCKETS = [
  "past",
  "present",
  "series",
  "engine only",
  "story item",
  "unkept",
] as const;
type Bucket = (typeof BUCKETS)[number];

interface Tally {
  system: string;
  shown: number;
  counts: Record<Bucket, number>;
  /** Engines of the records kept only by their engine, with how many. */
  engines: Map<string, number>;
  untraced: string[];
}

/**
 * Records a system cites that no store keeps, each by its cause; any other
 * fails. The state's monthly jobs report is emitted with the state as its
 * place (src/core2/modules/regional.ts, stepRegional), and the log keeps a
 * public record only of a place the player can see, the town and its county
 * (src/core2/state.ts, the keep rule's `visiblePlaceIds`): the news prints the
 * report from the emission, and nothing keeps it for the reader to tell.
 */
const UNKEPT = [/^event:economy\.state-jobs-report:[A-Z]{2}:\d{4}-\d{2}$/];

/**
 * The live stores a cited record of the present is kept in, by dev Trace's
 * names for them: who and what exists now (people, households, jobs and their
 * terms of work, organizations, places, the counted population), an office, a
 * government, a body's leadership, a law in force or set to take effect, and
 * a bill before a body at its stage now. A term still served, a race still to
 * come and a government's budget in force are the present too (below); an
 * ended term, a race held and an earlier budget are not. Nothing here is a
 * record of what happened.
 */
const PRESENT_STORES = new Set([
  "core.people",
  "core.husks",
  "core.households",
  "core.jobs",
  "core.work.commitments",
  "core.organizations",
  "core.publicOrganizations",
  "core.relationships",
  "core.familyLinks",
  "core.memberships",
  PLACE_ENGINE,
  COUNTED_ENGINE,
  "core2-laws-v1.laws",
  "core2-offices-v1.offices",
  "core2-budgets-v1.governments",
  "core2-leadership-v1.organized",
  "core2-legislature-v1.bills",
]);

/** Kept series of measurements, a month at a time: not events. */
const SERIES_STORES = new Set([
  "world-metrics.months",
  "core2-outcome-web-v1.months",
]);

/**
 * Engine tables of what happened in play that no engine hands to the reader
 * yet: a race held, an interview given, an earlier budget. Checked before a
 * printed story's item, so a story made from a race held does not hide the
 * race. The pages that read these tables are the map's rows still to wire.
 */
const ENGINE_ONLY = new Set([
  "core2-elections-v1.contests",
  "core2-press-v1.interviews",
  "core2-budgets-v1.budgets",
]);

/** Whether a record an engine keeps is of the present: a term served, a race to come, the budget in force. */
function presentRow(core: CoreState, engine: string, record: unknown): boolean {
  const row = record as {
    status?: string;
    electionDate?: string;
    governmentId?: string;
    startsOn?: string;
  };
  if (engine === "core2-offices-v1.terms") return row.status === "serving";
  if (engine === "core2-elections-v1.contests")
    return !!row.electionDate && row.electionDate > core.date;
  if (engine === "core2-budgets-v1.budgets") {
    if (!row.startsOn || row.startsOn > core.date) return false;
    // The budget in force: no later one of the same government has begun.
    return !(
      coreAPI(core)
        .moduleState("core2-budgets-v1")
        .table("budgets")
        .rows() as unknown as { governmentId: string; startsOn: string }[]
    ).some(
      (other) =>
        other.governmentId === row.governmentId &&
        other.startsOn > row.startsOn! &&
        other.startsOn <= core.date,
    );
  }
  return PRESENT_STORES.has(engine);
}

/** What a set of reads of the one reader returns: its records' ids, and the items its printed stories were made from. */
interface Scope {
  ids: Set<string>;
  items: Set<string>;
}

function scopeOf(
  core: CoreState,
  reads: readonly [HistoryScope, HistoryAsk?][],
): Scope {
  const out: Scope = { ids: new Set(), items: new Set() };
  for (const [scope, ask] of reads)
    for (const event of historyOf(core, scope, ask)) {
      out.ids.add(event.id);
      if (event.record === "press.printed" && event.facts?.sourceRecordId)
        out.items.add(event.facts.sourceRecordId);
    }
  return out;
}

/** The person a fact they were made with is kept on, where a cited id is one. */
function builtOwner(core: CoreState, id: string): PersonId | undefined {
  const found = recordOf(core, id);
  if (found?.from === "built") return found.personId;
  const traced = findRecord(core, id);
  return traced?.engine === PAST_FACT_ENGINE
    ? (traced.record as { personId?: PersonId }).personId
    : undefined;
}

function tally(
  core: CoreState,
  system: string,
  cited: readonly { id: string; owner?: PersonId }[],
  scope: Scope,
): Tally {
  const row: Tally = {
    system,
    shown: cited.length,
    counts: Object.fromEntries(BUCKETS.map((b) => [b, 0])) as Record<
      Bucket,
      number
    >,
    engines: new Map(),
    untraced: [],
  };
  for (const { id, owner } of cited) {
    // A term still served is who holds a seat now, the present, even where
    // the reader also opens it as the race that seated its holder.
    const term = findRecord(core, id);
    if (
      term?.engine === "core2-offices-v1.terms" &&
      presentRow(core, term.engine, term.record)
    ) {
      row.counts.present += 1;
      continue;
    }
    const stored = recordOf(core, id, owner ?? builtOwner(core, id));
    if (core.durableLog.has(id as never) || stored) {
      // An engine's row the reader tells under its own id (a race before day
      // one is its `prior-election:` record, not the term that holds it).
      const told = stored?.from === "source" ? stored.record.id : id;
      row.counts.past += 1;
      if (!scope.ids.has(id) && !scope.ids.has(told))
        row.untraced.push(
          `${id} (a record of the past the reader did not return here)`,
        );
      continue;
    }
    if (/^question:[a-z-]+-positions:[a-z-]+\.[a-z0-9-]+$/.test(id)) {
      row.counts.present += 1;
      continue;
    }
    if (id.startsWith("data/research/") && existsSync(id.split("#")[0]!)) {
      row.counts.present += 1;
      continue;
    }
    const found = findRecord(core, id);
    if (found && presentRow(core, found.engine, found.record)) {
      row.counts.present += 1;
      continue;
    }
    if (found && SERIES_STORES.has(found.engine)) {
      row.counts.series += 1;
      continue;
    }
    if (found && ENGINE_ONLY.has(found.engine)) {
      row.counts["engine only"] += 1;
      row.engines.set(found.engine, (row.engines.get(found.engine) ?? 0) + 1);
      continue;
    }
    if (scope.items.has(id)) {
      row.counts["story item"] += 1;
      continue;
    }
    if (UNKEPT.some((form) => form.test(id))) {
      row.counts.unkept += 1;
      continue;
    }
    row.untraced.push(`${id} (kept ${found?.engine ?? "nowhere"})`);
  }
  return row;
}

/** One world's counts by system, in plain words. */
function told(rows: readonly Tally[]): string {
  const systems = new Map<string, Tally>();
  for (const row of rows) {
    const at = systems.get(row.system);
    if (!at) {
      systems.set(row.system, {
        ...row,
        counts: { ...row.counts },
        engines: new Map(row.engines),
        untraced: [...row.untraced],
      });
      continue;
    }
    at.shown += row.shown;
    for (const bucket of BUCKETS) at.counts[bucket] += row.counts[bucket];
    for (const [engine, n] of row.engines)
      at.engines.set(engine, (at.engines.get(engine) ?? 0) + n);
    at.untraced.push(...row.untraced);
  }
  return [...systems.values()]
    .map(
      (row) =>
        `${row.system} ${row.shown} cited: ${BUCKETS.filter(
          (b) => row.counts[b],
        )
          .map((b) => `${row.counts[b]} ${b}`)
          .join(
            ", ",
          )}${row.engines.size ? ` [engine only: ${[...row.engines].map(([e, n]) => `${e} ${n}`).join(", ")}]` : ""}${row.untraced.length ? `, ${row.untraced.length} UNTRACED` : ""}`,
    )
    .join("; ");
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
      scopeOf(core, [
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
    out.push(tally(core, "person card", cited, scopeOf(core, personReads(id))));
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
        scopeOf(core, [
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
      scopeOf(core, [
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
              PAST_BUSINESS_CLOSED,
            ],
          },
        ],
        // A fact a person was made with that a story cites (a birthplace, a
        // partnership): what that person was made with, as the reader reads it.
        ...[
          ...new Set(
            news
              .map((row) => builtOwner(core, row.id))
              .filter((person): person is PersonId => !!person),
          ),
        ].map((person): [HistoryScope, HistoryAsk] => [
          { person },
          { from: "built" },
        ]),
      ]),
    ),
  );
  process.stdout.write(`history proof: ${where}: ${told(out)}\n`);
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
          rows.reduce((sum, row) => sum + row.counts.past, 0),
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
        rows.reduce((sum, row) => sum + row.counts.past, 0),
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
