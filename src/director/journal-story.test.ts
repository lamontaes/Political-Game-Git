import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { preStartHistory } from "../core2/pre-start";
import { composeJournal } from "./journal";
import type { PersonId } from "../core2/types";

// The Journal is a story from birth (owner, Oct 27: "this journal needs to be
// written like a story, not individual sections, but written like a story
// from birth"): its first moment is the player's own birth, told from the
// run's birth record in the bank's own words ("I was born in {place}."),
// then the years in the order they happened. A place drawn from all 56.
const seed = process.env.JOURNAL_STORY_SEED ?? randomBytes(8).toString("hex");

describe("the journal as a story from birth", () => {
  it("opens on the player's birth, from the run's record, and keeps the years in order", () => {
    const place = drawPlace(seed, "journal-story");
    const where = `seed ${seed}, ${place.name} (${place.key})`;
    const { core, director, playerId } = buildBenchWorld(
      place.seed,
      gameStartDate(),
      {
        twoLevel: true,
        placeKey: place.key,
        playerBirthDate: `${Number(gameStartDate().slice(0, 4)) - 35}-06-15`,
      },
    );
    const id = playerId as PersonId;
    const [birth] = preStartHistory(core, {
      kind: "person.birth",
      personId: id,
    });
    expect(birth?.id, `${where}: the player's birth record`).toBe(
      `person-history:${id}:birth`,
    );
    director.watch(core, id);
    const lines = composeJournal(core, director, id).flatMap(
      (chapter) => chapter.lines,
    );
    expect(lines.length, where).toBeGreaterThan(0);
    // The birth is told, citing its record, wherever the run put the family
    // that day (a town, a county, or elsewhere in the state); nothing told
    // before it happened after it (the family as it stood that day may be).
    const told = lines.findIndex(
      (line) =>
        line.sourceRecordIds.includes(birth!.id) && /born in/.test(line.text),
    );
    expect(
      told,
      `${where}: no line tells the birth; first is "${lines[0]!.text}"`,
    ).toBeGreaterThanOrEqual(0);
    for (const line of lines.slice(0, told))
      expect(line.date <= birth!.date, `${where}: "${line.text}"`).toBe(true);
    // Then the years in the order they happened.
    const dates = lines.map((line) => line.date);
    expect(dates, where).toEqual([...dates].sort());
    // A district or a plural name takes its article: "born in the District of
    // Columbia", never "born in District of Columbia".
    for (const line of lines)
      expect(line.text, where).not.toMatch(
        /\b(?:in|from) (?:District of|U\.S\. Virgin Islands|Northern Mariana Islands)/,
      );
    process.stdout.write(
      `JOURNAL ${where}: line ${told + 1} of ${lines.length} tells the birth from ${birth!.id}: "${lines[told]!.text}"; the first is "${lines[0]!.text}"\n`,
    );
  }, 300_000);

  /**
   * Whether the Journal of a person drawn from this seed names every job
   * before the start only by its own employer; a reason it holds no such case
   * otherwise (no such person, or no line told).
   */
  const ownEmployersOnly = (drawSeed: string): string | null => {
    const place = drawPlace(drawSeed, "journal-story");
    const where = `seed ${drawSeed}, ${place.name} (${place.key})`;
    const { core, director, playerId } = buildBenchWorld(
      place.seed,
      gameStartDate(),
      {
        twoLevel: true,
        placeKey: place.key,
        playerBirthDate: `${Number(gameStartDate().slice(0, 4)) - 35}-06-15`,
      },
    );
    // The player first, then anyone else the run gave a working life: one
    // who worked elsewhere before moving to town (a spell with no employer
    // on record) and holds a job today, which such a spell must not borrow.
    const spellsOf = (personId: PersonId) =>
      preStartHistory(core, { kind: "person.work-spell", personId }).sort(
        (a, b) =>
          String(a.facts.startedAt).localeCompare(String(b.facts.startedAt)),
      );
    const people = [
      playerId as PersonId,
      ...[...core.people.values()]
        .filter(
          (row) => row.id !== playerId && row.alive && row.tier !== "husk",
        )
        .map((row) => row.id as PersonId)
        .sort(),
    ];
    const id = people.find(
      (personId) =>
        core.people.get(personId)?.jobId &&
        spellsOf(personId).some((row) => !row.facts.organizationId),
    );
    if (!id)
      return `${where}: no one worked elsewhere before a move and holds a job today`;
    const spells = spellsOf(id);
    director.watch(core, id);
    const lines = composeJournal(core, director, id).flatMap(
      (chapter) => chapter.lines,
    );
    let checked = 0;
    for (const line of lines) {
      const told = spells.filter((row) =>
        line.sourceRecordIds.includes(row.id),
      );
      if (!told.length) continue;
      checked += 1;
      // Its own employer, and the next one's only where it tells the move
      // to another job.
      const allowed = new Set(
        told.flatMap((row) => {
          const next = line.momentIds.includes(`${row.id}:job-ended:moved-on`)
            ? spells[spells.indexOf(row) + 1]
            : undefined;
          return [
            row.facts.organizationId,
            row.facts.jobId,
            next?.facts.organizationId,
            next?.facts.jobId,
          ]
            .filter(Boolean)
            .map(String);
        }),
      );
      for (const cited of line.sourceRecordIds)
        if (core.organizations.has(cited) || core.jobs.has(cited))
          expect(
            allowed.has(cited),
            `${where}: "${line.text}" cites ${cited}`,
          ).toBe(true);
    }
    if (!checked) return `${where}: no line told a job before the start`;
    process.stdout.write(
      `journal-story: ${where}, ${id === playerId ? "the player" : id}; ${checked} lines of jobs before the start checked\n`,
    );
    return null;
  };

  it("names a job before the start only by its own employer, and none where none is on record", () => {
    // Draw places (bounded) until someone worked somewhere before moving to
    // town (a spell of the run with no employer on record) and holds a job
    // today.
    const passed: string[] = [];
    for (let draw = 0; draw < 12; draw += 1) {
      const skipped = ownEmployersOnly(`${seed}:elsewhere:${draw}`);
      if (!skipped) {
        process.stdout.write(
          `journal-story: passed over ${passed.join("; ") || "none"}\n`,
        );
        return;
      }
      passed.push(skipped);
    }
    throw new Error(
      `No drawn place had a job before a move (seed ${seed}): ${passed.join("; ")}`,
    );
  }, 1_500_000);

  // Named regression: Haugan, Montana, where the player's first job, in
  // another place before the move, was told as "I started working for Haugan
  // Police Department", the employer of the job held today.
  it("names no employer for the Haugan, Montana player's first job before the move", () => {
    expect(ownEmployersOnly("final-a:elsewhere:1")).toBeNull();
  }, 300_000);

  /**
   * Whether, over a played year in the place drawn from this seed, the
   * player's Journal opens no chapter on someone else's filing or oath; a
   * reason it holds no such case otherwise (nobody the player follows filed
   * or took office).
   */
  const ownChaptersOnly = (drawSeed: string): string | null => {
    const place = drawPlace(drawSeed, "journal-story");
    const where = `seed ${drawSeed}, ${place.name} (${place.key})`;
    const { core, director, playerId } = buildBenchWorld(
      place.seed,
      gameStartDate(),
      { twoLevel: true, placeKey: place.key },
    );
    const id = playerId as PersonId;
    director.watch(core, id);
    advanceCore(core, addDays(makeIsoDate(core.date), 730));
    const moments = director.ledger.people.get(id)?.moments ?? [];
    const governing = (kind: string) =>
      kind.startsWith("event:candidate-filed") ||
      kind.startsWith("event:took-office");
    const others = moments.filter(
      (moment) => governing(moment.causeKind) && moment.selfNamed !== true,
    );
    if (!others.length)
      return `${where}: no one else's filing or oath reached the player`;
    const journal = composeJournal(core, director, id);
    const told = others.filter((moment) =>
      journal.some((chapter) =>
        chapter.lines.some((line) => line.momentIds.includes(moment.id)),
      ),
    );
    if (!told.length)
      return `${where}: ${others.length} filings or oaths of others, none told`;
    // Every chapter after the first opens on one of the player's own turns;
    // another's filing or oath is told inside the chapter being lived.
    const byId = new Map(moments.map((moment) => [moment.id, moment]));
    for (const chapter of journal.slice(1)) {
      const opened = byId.get(chapter.key);
      if (!opened || !governing(opened.causeKind)) continue;
      expect(
        opened.selfNamed,
        `${where}: chapter "${chapter.title}" opens on ${opened.causeId}`,
      ).toBe(true);
    }
    // No chapter is titled with another person's name.
    for (const chapter of journal) {
      const named = [...core.people.values()].find(
        (row) =>
          row.id !== id &&
          (chapter.title === `${row.givenName} ${row.familyName}` ||
            chapter.title === row.givenName),
      );
      expect(
        named?.id,
        `${where}: chapter "${chapter.title}" opens on ${chapter.key}`,
      ).toBeUndefined();
    }
    // Every line after the first follows the line before it by cause,
    // feeling or time, citing the records that join them.
    const lines = journal.flatMap((chapter) => chapter.lines);
    const links = { cause: 0, feeling: 0, time: 0 };
    lines.forEach((line, at) => {
      if (at === 0) {
        expect(
          line.link,
          `${where}: the first line links back`,
        ).toBeUndefined();
        return;
      }
      const earlier = lines[at - 1]!;
      expect(line.link?.earlierId, `${where}: ${line.id}`).toBe(earlier.id);
      expect(
        line.link!.recordIds.length,
        `${where}: ${line.id}`,
      ).toBeGreaterThan(0);
      if (line.link!.by === "cause")
        // A cause names records of both lines.
        expect(
          line.link!.recordIds.some((rid) =>
            earlier.sourceRecordIds.includes(rid),
          ) &&
            line.link!.recordIds.some((rid) =>
              line.sourceRecordIds.includes(rid),
            ),
          `${where}: ${line.id} after ${earlier.id}, ${line.link!.recordIds.join(", ")}`,
        ).toBe(true);
      links[line.link!.by] += 1;
    });
    const caused = lines
      .filter((line) => line.link?.by === "cause")
      .slice(0, 3);
    process.stdout.write(
      `journal-story links: ${where}; ${lines.length} lines, ${links.cause} by cause, ${links.feeling} by feeling, ${links.time} by time; ${caused.map((line) => `"${line.text}" follows ${line.link!.earlierId} by ${line.link!.recordIds.join(" + ")}`).join("; ")}\n`,
    );
    process.stdout.write(
      `journal-story: ${where}; ${told.length} filings or oaths of others told inside chapters (${told.map((moment) => moment.causeId).join(", ")}): ${journal.map((chapter) => chapter.title).join(" | ")}\n`,
    );
    return null;
  };

  it("opens no chapter on someone else's filing or oath over two played years", () => {
    const passed: string[] = [];
    for (let draw = 0; draw < 3; draw += 1) {
      const skipped = ownChaptersOnly(`${seed}:others:${draw}`);
      if (!skipped) return;
      passed.push(skipped);
    }
    throw new Error(
      `No drawn place had another's filing or oath (seed ${seed}): ${passed.join("; ")}`,
    );
  }, 1_800_000);
});
