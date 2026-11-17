import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { setBookkeeping } from "../core2/bookkeeping";
import { advanceCore } from "../core2/life";
import { preStartHistory } from "../core2/pre-start";
import { gatherSignatures } from "../core2/campaign-petition-kit";
import { fileCandidacy, openContests } from "../core2/modules/elections";
import { coreAPI } from "../core2/state";
import { composeJournal } from "./journal";
import { tieSide } from "./relation-facts";
import journalBank from "../../data/english/parts/journal.json";
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
      // The lines that tell this person's own spells. A line that only cites
      // a spell because a time or cause link joins it to the line before
      // (a partner's livelihood after "Nineteen years on,") tells another
      // person's job, whose records are its own.
      const told = spells.filter((row) =>
        line.momentIds.some((momentId) => momentId.startsWith(`${row.id}:`)),
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
          // The job found again after time out of work names the one lost
          // before it ("I hadn't had a paycheck since ...").
          const lost = line.momentIds.includes(`${row.id}:job-started:again`)
            ? spells[spells.indexOf(row) - 1]
            : undefined;
          return [
            row.facts.organizationId,
            row.facts.jobId,
            next?.facts.organizationId,
            next?.facts.jobId,
            lost?.facts.organizationId,
            lost?.facts.jobId,
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
   * Another person's filing or oath is told in the Journal only when it names
   * the Journal's subject: the subject's own, or a relative's or household
   * member's (Journal rule 87). One named place and seed hold both cases.
   *
   * The old premise (Nov 14): some drawn place's other filings were told
   * inside chapters whether or not they named the subject, over three random
   * draws. Rule 87 ended that, so the test is pinned and no longer draws. The
   * Account lead approved the re-pin on Nov 15.
   */
  it("tells none of another's filings or oaths that do not name the subject, at Stockton, Utah", () => {
    const { core, director, playerId } = buildBenchWorld(
      "cda3e540a56a374822b5213db4e3278f14ea1b3683527019cb72b0b19cb6ca7c",
      gameStartDate(),
      { twoLevel: true, placeKey: "4973050" },
    );
    const id = playerId as PersonId;
    director.watch(core, id);
    advanceCore(core, addDays(makeIsoDate(core.date), 400));
    const moments = director.ledger.people.get(id)?.moments ?? [];
    const others = moments.filter(
      (moment) =>
        (moment.causeKind.startsWith("event:candidate-filed") ||
          moment.causeKind.startsWith("event:took-office")) &&
        moment.selfNamed !== true,
    );
    const journal = composeJournal(core, director, id);
    const told = others.filter((moment) =>
      journal.some((chapter) =>
        chapter.lines.some((line) => line.momentIds.includes(moment.id)),
      ),
    );
    // The case that names the subject's circle: none at this place now. Its
    // premise before the Train's b22cd350 (Nov 15) was one oath, on council
    // seat 4 on 2026-01-01, by someone in the subject's circle, told in the
    // chapter being lived; the Train's world build gives this place no such
    // oath (seats 0 and 2 changed hands, neither to the subject's circle), so
    // nothing is told, and the told case waits on its own pinned place.
    expect(told).toEqual([]);
    // Another's turn told as what it meant, from the tie on record: a
    // friend's as the friendship (never a mood word), a rival's with doubt.
    const meant = (field: string) =>
      (
        journalBank as {
          parts: { text: string; uses: { role?: string }[] }[];
        }
      ).parts
        .filter((part) => part.uses.some((use) => use.role === field))
        .map((part) => part.text);
    for (const moment of told) {
      const line = journal
        .flatMap((chapter) => chapter.lines)
        .find((row) => row.momentIds.includes(moment.id))!;
      const otherId = moment.counterpartIds.find((pid) => pid !== id);
      const side = otherId ? tieSide(core, id, otherId) : null;
      for (const [field, want] of [
        ["meantFriend", "friend"],
        ["meantRival", "rival"],
      ] as const)
        if (meant(field).some((text) => line.text.endsWith(text)))
          expect(side?.side, `"${line.text}" on ${otherId}`).toBe(want);
    }
    // The opposite case: the other filings and oaths never name the subject
    // or anyone near them, so none is told alone, and no chapter opens on one.
    expect(others.length).toBeGreaterThan(told.length);
    const byId = new Map(moments.map((moment) => [moment.id, moment]));
    for (const chapter of journal.slice(1)) {
      const opened = byId.get(chapter.key);
      if (!opened) continue;
      expect(others.map((moment) => moment.id)).not.toContain(opened.id);
    }
  }, 600_000);

  // A race the player won and the seat it gave are one office: the chapter
  // the seat is told in carries the race's name, never a second name for the
  // same office ("Council member" after "The Hephzibah City Council"), with
  // another chapter (a parent's) between the two. Hephzibah, Georgia, seed
  // abc5c7d3..., the council race of 2025-11-04, found by a script outside
  // the test (scripts/.hunt/win.ts: seven drawn places, the first that has
  // a win and a seating); before the rule the same run printed the chapters
  // "The Hephzibah City Council", "My father", "Council member".
  it("tells taking the seat a race won under the race's chapter name", () => {
    setBookkeeping(false);
    try {
      const { core, director } = buildBenchWorld(
        "abc5c7d3da7e22c3a2c3c28ec635e6ae09c9bafe03d75273bf5b21aec300b979",
        gameStartDate(),
        { twoLevel: true, placeKey: "1338040" },
      );
      const api = coreAPI(core);
      const pid = core.playerId as PersonId;
      director.watch(core, pid);
      const contestId = "contest:seat:gus2025:225768:council:0:2025-11-04";
      let contest = openContests(api).find((row) => row.id === contestId);
      for (let week = 0; week < 104 && !contest; week += 1) {
        advanceCore(core, addDays(makeIsoDate(core.date), 7));
        contest = openContests(api).find((row) => row.id === contestId);
      }
      expect(contest, "the council race is open for filing").toBeDefined();
      fileCandidacy(api, { personId: pid, contestId, platform: [] });
      gatherSignatures(core, `filing:${contestId}:${pid}`);
      advanceCore(core, addDays(makeIsoDate(contest!.electionDate), 90));
      const chapters = composeJournal(core, director, pid);
      const took = chapters.find((chapter) =>
        chapter.lines.some((line) => /^I took office as/.test(line.text)),
      );
      const won = chapters.find((chapter) =>
        chapter.lines.some((line) => /^I won\b/.test(line.text)),
      );
      expect(took, "the seat is told").toBeDefined();
      expect(won, "the win is told").toBeDefined();
      expect(took!.title).toBe(won!.title);
      // One name for the seat, the office record's own title as the You
      // screen says it (Story lead, Nov 17): the race and the seat are one
      // chapter, and no second chapter carries another name for the office.
      expect(took!.title).toBe("Council member");
      expect(
        chapters.filter((chapter) => /council/i.test(chapter.title)),
      ).toHaveLength(1);
    } finally {
      setBookkeeping(true);
    }
  }, 300_000);
});
