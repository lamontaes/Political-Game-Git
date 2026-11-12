/**
 * The Journal reads the one shared life list (docs/design/journal-on-the-life-list.md): in a
 * drawn place played 200 days, with the player (35) and two members of their household watched,
 * every record the Journal's one planner reads (words composer, unit 6) is told once, in
 * one entry, and every entry about a life story (a job, a move, a birth, a partner, a death, an
 * illness, a home) stands on an event of the person's life list, or on one of the named gaps
 * the list does not hold yet, in two labeled seeds (Drummond, Montana; Columbia Furnace,
 * Virginia) and any JL_SEED. A job lost, a move and a death in
 * the household, made by the records the engines write, reach the Journal through the list.
 * Opening the Journal reads the list once. Replay with JL_SEED and JL_PLACE_KEY; JL_OUT names a
 * file the entries of JL_SEED are written to.
 */
import { randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { expect, it, vi } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { traceNode } from "../bench/dev-trace";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { coreAPI } from "../core2/state";
import type * as PersonLife from "../core2/person-life";
import type { CoreEventInput, IsoDate, PersonId } from "../core2/types";

const counter = vi.hoisted(() => ({ lifeOf: 0 }));
vi.mock("../core2/person-life", async (original) => {
  const real = await original<PersonLife>();
  return {
    ...real,
    lifeOf: (...args: Parameters<typeof real.lifeOf>) => {
      counter.lifeOf += 1;
      return real.lifeOf(...args);
    },
  };
});
const { composeJournal } = await import("./journal");
const { lifeOf } = await import("../core2/person-life");

/** The cause kinds of a life story: the journal's rows about what happened in a person's own life. */
const LIFE_STORY = [
  "person.birth",
  "event:person-birth",
  "event:school.finished",
  "job-",
  "family:child",
  "moved",
  "event:person.moved-away",
  "event:life.death",
  "event:housing.eviction",
  "event:housing.purchase",
  "event:organization.founded",
  "event:health.serious-illness",
  "event:candidate-filed",
  "event:election-result",
  "event:took-office",
  "household:",
];
/** The kinds the list has no pair for: they stay on their own readers (SG-DIRECTOR-journal-life-gaps). */
const GAPS = [
  "person.birth",
  "household:raised-by",
  "household:parent-apart",
  "household:sibling",
  "household:parents-met",
  "household:moment:parent-new-job",
  "household:livelihood",
  "event:school.finished",
];
/** Kinds the director also tells of someone else (a relative's move, a stranger's death): not on the player's list. */
const OTHERS_TOO = [
  "event:person.moved-away",
  "event:life.death",
  "event:person-birth",
  "job-ended",
  "event:housing.eviction",
  "event:housing.purchase",
  "event:health.serious-illness",
  "event:organization.founded",
  "event:candidate-filed",
  "event:election-result",
  "event:took-office",
  "family:child",
];

interface StoryEntry {
  person: string;
  kinds: string[];
  recordIds: string[];
  date: string;
  text: string;
}
/**
 * The two labeled seeds of the life list's first proof, by the place each
 * draws (Drummond, Montana and Columbia Furnace, Virginia): the Journal's
 * one planner (words composer, unit 6) is held to its rule there. The old
 * writer's entries per record (journal-life-list.before.json) are gone with
 * the writer.
 */
const PLACES: Readonly<Record<string, string>> = {
  aa11bb22cc33dd44: "3021850",
  "9f8e7d6c5b4a3921": "5118656",
};

type Played = ReturnType<typeof buildBenchWorld>;

function lifeStoryLines(world: Played, ids: readonly PersonId[]) {
  const out: (StoryEntry & { momentIds: readonly string[] })[] = [];
  for (const id of ids)
    for (const chapter of composeJournal(world.core, world.director, id))
      for (const line of chapter.lines) {
        const kinds = (line.kinds ?? []).filter((kind) =>
          LIFE_STORY.some((prefix) => kind.startsWith(prefix)),
        );
        if (!kinds.length) continue;
        out.push({
          person: id,
          kinds,
          recordIds: [...line.sourceRecordIds],
          date: line.date,
          text: line.text,
          momentIds: line.momentIds,
        });
      }
  return out;
}

/** A drawn place with a player of 35, played `days`, with the player and two household members watched. */
function playedPlace(seed: string, days: number, label: string) {
  const drawn = drawPlace(seed, label);
  const placeKey = process.env.JL_PLACE_KEY ?? drawn.key;
  const world = buildBenchWorld(drawn.seed, gameStartDate(), {
    twoLevel: true,
    placeKey,
    playerBirthDate: `${Number(gameStartDate().slice(0, 4)) - 35}-06-15`,
  });
  const { core, director, playerId } = world;
  const player = core.people.get(playerId!)!;
  const members = [
    ...(core.households.get(player.householdId)?.memberIds ?? []),
  ]
    .filter((id) => id !== playerId && core.people.get(id)?.alive)
    .slice(0, 2);
  const ids = [playerId as PersonId, ...members];
  for (const id of ids) {
    core.focusPersonIds.add(id);
    director.watch(core, id);
  }
  advanceCore(core, addDays(makeIsoDate(core.date), days));
  return {
    world,
    ids,
    where: `${drawn.name} (${placeKey}), seed ${seed}`,
    placeKey,
  };
}

const SEEDS = [
  ...Object.keys(PLACES),
  ...(process.env.JL_SEED && !PLACES[process.env.JL_SEED]
    ? [process.env.JL_SEED]
    : []),
];

it.each(SEEDS)(
  "every record the Journal's planner reads is told once, and nothing is told that is not on the life list or its named gaps (seed %s)",
  (seed) => {
    setBookkeeping(false);
    try {
      const { world, ids, where, placeKey } = playedPlace(
        seed,
        200,
        "journal-life-list",
      );
      const { core, director } = world;
      const after = lifeStoryLines(world, ids);
      if (PLACES[seed])
        expect(placeKey, `${where}: the place the seed draws`).toBe(
          PLACES[seed],
        );
      // No fact twice: a moment is told in one line.
      const seen = new Set<string>();
      for (const entry of after)
        for (const momentId of entry.momentIds) {
          const key = `${entry.person}|${momentId}`;
          expect(seen.has(key), `${where}: ${momentId} told twice`).toBe(false);
          seen.add(key);
        }
      // Every record an entry cites resolves.
      for (const entry of after)
        for (const id of entry.recordIds)
          expect(
            traceNode(core, director, id).answer,
            `${where}: ${id} in ${entry.text}`,
          ).not.toBe("not-a-record");
      // An entry of a moved kind stands on an event of the person's list; only the gaps,
      // and a relative's event the list does not hold, do not.
      for (const entry of after) {
        const moved = entry.kinds.filter(
          (kind) => !GAPS.some((gap) => kind.startsWith(gap)),
        );
        if (!moved.length) continue;
        const listed = new Set(
          lifeOf(core, entry.person as PersonId).map((event) => event.id),
        );
        if (entry.recordIds.some((id) => listed.has(id))) continue;
        expect(
          moved.every((kind) => OTHERS_TOO.includes(kind)),
          `${where}: ${entry.kinds.join()} stands on no event of the list: ${entry.text}`,
        ).toBe(true);
      }
      process.stdout.write(
        `JOURNAL LIFE LIST ${where}: ${after.length} entries, each once on its records\n`,
      );
      if (process.env.JL_OUT && seed === process.env.JL_SEED) {
        mkdirSync(dirname(process.env.JL_OUT), { recursive: true });
        writeFileSync(
          process.env.JL_OUT,
          JSON.stringify(
            after.map((entry) => ({
              person: entry.person,
              kinds: entry.kinds,
              recordIds: entry.recordIds,
              date: entry.date,
              text: entry.text,
            })),
            null,
            1,
          ),
        );
      }
    } finally {
      setBookkeeping(true);
    }
  },
  3_600_000,
);

it("a job lost, a move and a death in the household reach the Journal through the list, and opening it reads the list once", () => {
  setBookkeeping(false);
  try {
    const seed = process.env.JL_SEED ?? randomBytes(8).toString("hex");
    // A place whose player has a living relative in their household.
    let found: ReturnType<typeof playedPlace> | undefined;
    let kinId: PersonId | undefined;
    for (let attempt = 0; attempt < 6 && !kinId; attempt += 1) {
      found = playedPlace(seed, 60, `journal-life-played:${attempt}`);
      const { core, playerId } = found.world;
      const player = core.people.get(playerId!)!;
      kinId = [...core.households.get(player.householdId)!.memberIds].find(
        (member) =>
          member !== playerId &&
          core.people.get(member)?.alive &&
          core.people.get(member)!.familyIds.has(playerId!),
      ) as PersonId | undefined;
    }
    expect(
      kinId,
      `seed ${seed}: a place with a relative at home`,
    ).toBeDefined();
    const { world, where } = found!;
    const { core, director, playerId } = world;
    const id = playerId as PersonId;
    const player = core.people.get(id)!;
    const api = coreAPI(core);
    const orgId = [...core.organizations.values()].find(
      (row) => row.name && row.kind !== "government",
    )!.id;
    const source = {
      tag: "ESTIMATED" as const,
      asOf: core.date as IsoDate,
      citation: "A test of the Journal.",
      estimatedFrom: "journal-life-list.test.ts",
    };
    const common = {
      date: core.date as IsoDate,
      placeId: player.placeId,
      source,
    };
    // The records the engines write: a layoff (jobs), a move (moves), a death (health).
    const lost = `event:work.job-lost:${core.date}:journal-${id}`;
    const moved = `person.moved-away:${id}:${core.date}`;
    const died = `life.death:${kinId}:${core.date}`;
    api.emit({
      ...common,
      id: lost,
      kind: "work.job-lost",
      personIds: [id],
      publicRecord: false,
      topic: orgId,
      facts: { decidedBy: orgId, organizationId: orgId },
    } as CoreEventInput);
    api.emit({
      ...common,
      id: moved,
      kind: "person.moved-away",
      personIds: [id],
      publicRecord: true,
    } as CoreEventInput);
    api.updatePerson(kinId!, { alive: false });
    api.emit({
      ...common,
      id: died,
      kind: "life.death",
      personIds: [kinId!],
      publicRecord: true,
      news: true,
      topic: "health:serious-illness",
      facts: { [`event:${died}:causeOfDeath`]: "heart-disease" },
    } as CoreEventInput);
    const listed = lifeOf(core, id);
    for (const record of [lost, moved, died])
      expect(
        listed.some((event) => event.id === record),
        `${where}: ${record} on the player's list`,
      ).toBe(true);

    counter.lifeOf = 0;
    const lines = composeJournal(core, director, id).flatMap(
      (chapter) => chapter.lines,
    );
    expect(counter.lifeOf, `${where}: lifeOf calls for one open`).toBe(1);
    for (const [record, kind] of [
      [lost, "job-ended"],
      [moved, "moved"],
      [died, "event:life.death"],
    ] as const) {
      const told = lines.filter((line) =>
        line.sourceRecordIds.includes(record),
      );
      expect(
        told.map((line) => line.kinds),
        `${where}: ${record} told once, as ${kind}`,
      ).toEqual([expect.arrayContaining([kind])]);
      expect(told[0]!.text, where).not.toMatch(/\{|\}|undefined/);
      process.stdout.write(
        `JOURNAL LIFE PLAYED ${where}: ${kind} ${told[0]!.date} ${told[0]!.text}\n`,
      );
    }
  } finally {
    setBookkeeping(true);
  }
}, 3_600_000);

it("the Journal keeps no assembly of a life's past of its own beyond the registered gaps", () => {
  const source = readFileSync("src/director/journal.ts", "utf8");
  expect(source).not.toMatch(/function pastWorkMoments/);
  expect(source.match(/\blifeOf\(/g)?.length, "one read of the list").toBe(1);
  expect(source).toMatch(/stopgapId: SG-DIRECTOR-journal-life-gaps/);
});
