/**
 * The kinds of text beyond conversation (owner, 6:20 p.m. Oct 6; batch
 * variety rule, CTO 7:55 p.m.): each kind is read from the game's own
 * producer on a generated world, never written here. A kind the world cannot
 * produce says why, so the batch shows the gap instead of hiding it.
 *
 * A development tool. Read-only: it never advances time or writes records.
 */
import type { EntityId, World } from "../../src/simulation";
import { electionContestResult } from "../../src/simulation";
import { projectBillPaper } from "../../src/presentation/bill-paper";
import { journalInFirstPerson } from "../../src/presentation/journal-first-person";
import { projectJournalView } from "../../src/presentation/journal-views";
import { projectNewsFrontPage } from "../../src/presentation/news-front-page";
import { projectOrdinaryMeetingScene } from "../../src/presentation/ordinary-meeting-scene";
import {
  readHearingBank,
  readLegislationBank,
  readMeetingBank,
  readMinutesBank,
  readNoticesBank,
  readWinningLosingBank,
  type BankReading,
} from "../../src/presentation/bank-english";
import { ownElectionResultSentence } from "../../src/presentation/own-election";

export interface KindText {
  readonly kind: string;
  readonly composer: string;
  /** Plain words: what record the text comes from. */
  readonly situation: string;
  readonly text: string;
  /** Points a grade at the record the text was read from. */
  readonly partKey: string;
}

export interface KindReading {
  readonly texts: readonly KindText[];
  /** Kinds this world produced nothing for, with the reason. */
  readonly absent: readonly {
    readonly kind: string;
    readonly reason: string;
  }[];
}

const PER_KIND = 3;

export function readKinds(world: World, playerId: EntityId): KindReading {
  const texts: KindText[] = [];
  const absent: { kind: string; reason: string }[] = [];
  const add = (kind: string, found: readonly KindText[], why: string) => {
    if (found.length === 0) absent.push({ kind, reason: why });
    else texts.push(...found.slice(0, PER_KIND));
  };

  // One story per wording: three copies of one template with other figures
  // are one item, not three (batch variety rule).
  const shapes = new Set<string>();
  const stories = projectNewsFrontPage(world, "front", null).stories.filter(
    (story) => {
      const shape = story.headline.replace(/[\d$,.]+/g, "#");
      if (shapes.has(shape)) return false;
      shapes.add(shape);
      return true;
    },
  );
  add(
    "news",
    stories.map((story) => ({
      kind: "news",
      composer: "projectNewsFrontPage in news-front-page.ts",
      situation: `A ${story.outletName} story from ${story.place ?? "the nation"}.`,
      text: story.body.startsWith(story.headline)
        ? story.body
        : `${story.headline} ${story.body}`.trim(),
      partKey: `news:story:${story.sourceEventId}`,
    })),
    "no newspaper has printed a story in this world yet",
  );

  // A journal item is a chapter of the life, told by the character from the
  // record (CTO 9:03 p.m. Oct 6): the section's entries in the first person.
  // A line that only states where the player is now ("You are at home.") is
  // the present, not a chapter, and is left out.
  const journal = projectJournalView(world, playerId, "chapters", null);
  add(
    "journal",
    journal.sections
      .map((section) => ({
        section,
        told: section.entries
          .filter((entry) => !/^You are\b/.test(entry.text))
          .map((entry) => journalInFirstPerson(entry.text)),
      }))
      .filter((chapter) => chapter.told.length > 0)
      .slice(-PER_KIND)
      .reverse()
      .map(({ section, told }) => ({
        kind: "journal",
        composer:
          "projectJournalView and journalInFirstPerson in journal-views.ts",
        situation: `The player's journal, the chapter "${section.heading}"${section.span ? ` (${section.span})` : ""}.`,
        text: told.join(" "),
        partKey: `journal:chapter:${section.key}`,
      })),
    "the player's journal has no chapter told from the record yet",
  );

  const bills: KindText[] = [];
  for (const measure of world.history.legislativeMeasures ?? []) {
    if (bills.length >= PER_KIND) break;
    const paper = projectBillPaper(world, measure.id);
    const section = paper?.sections.find((row) => !row.missing);
    if (!paper || !section) continue;
    bills.push({
      kind: "legislation",
      composer: "projectBillPaper in bill-paper.ts",
      situation: `The printed text of ${paper.designation}.`,
      text: `${paper.introduction} ${section.heading}. ${section.text}`,
      partKey: `legislation:measure:${measure.id}`,
    });
  }
  // When the game's own reader finds nothing, the merged English banks fill
  // the kind from real records, or say which record is missing.
  const addBank = (
    kind: string,
    found: readonly KindText[],
    reading: BankReading,
    composer: string,
    why: string,
  ) => {
    if (found.length > 0) return add(kind, found, why);
    if (typeof reading === "string")
      return absent.push({ kind, reason: `${why}; ${reading}` });
    texts.push(
      ...reading.slice(0, PER_KIND).map((line) => ({
        ...line,
        composer,
        partKey: `bank:${line.partKey}`,
      })),
    );
  };
  addBank(
    "legislation",
    bills,
    readLegislationBank(world, playerId),
    "readLegislationBank in bank-english.ts",
    "no Congress measure with printed text is filed",
  );

  const results: KindText[] = [];
  for (const contest of world.history.electionContests ?? []) {
    if (results.length >= PER_KIND) break;
    const result = electionContestResult(world, contest.id);
    const winner = result
      ? [...result.tallies].sort((a, b) => b.voteShare - a.voteShare)[0]
      : undefined;
    if (!winner?.candidatePersonId) continue;
    const sentence = ownElectionResultSentence(
      world,
      contest.id,
      winner.candidatePersonId,
    );
    if (!sentence) continue;
    results.push({
      kind: "winning-and-losing",
      composer: "ownElectionResultSentence in own-election.ts",
      situation: "A decided race, as its winner reads the result.",
      text: sentence,
      partKey: `results:contest:${contest.id}`,
    });
  }
  addBank(
    "winning-and-losing",
    results,
    readWinningLosingBank(world),
    "readWinningLosingBank in bank-english.ts",
    "no race in this world is decided yet",
  );

  const meeting = projectOrdinaryMeetingScene(world, playerId);
  addBank(
    "meeting",
    meeting?.agendaText
      ? [
          {
            kind: "meeting",
            composer:
              "projectOrdinaryMeetingScene in ordinary-meeting-scene.ts",
            situation: "The agenda at the meeting the player is attending.",
            text: meeting.agendaText,
            partKey: `meeting:event:${meeting.eventId}`,
          },
        ]
      : [],
    readMeetingBank(world, playerId),
    "readMeetingBank in bank-english.ts",
    "the player is not at a meeting",
  );
  for (const [kind, reading, composer] of [
    ["minutes", readMinutesBank(world, playerId), "readMinutesBank"],
    ["hearing", readHearingBank(world, playerId), "readHearingBank"],
  ] as const)
    addBank(
      kind,
      [],
      reading,
      `${composer} in bank-english.ts`,
      `no ${kind} producer writes in the game yet`,
    );

  addBank(
    "notices-and-screens",
    [],
    readNoticesBank(world, playerId),
    "readNoticesBank in bank-english.ts",
    "no recorded hearing, local measure, or scheduled election contest is available",
  );

  return { texts, absent };
}
