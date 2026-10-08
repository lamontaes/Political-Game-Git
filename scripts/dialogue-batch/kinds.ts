/**
 * The kinds of text beyond conversation (owner, 6:20 p.m. Oct 6; batch
 * variety rule, CTO 7:55 p.m.): each kind is read from the game's own
 * producer on a generated world, never written here. A kind the world cannot
 * produce says why, so the batch shows the gap instead of hiding it.
 *
 * A development tool. Read-only: it never advances time or writes records.
 */
import type { EntityId, World } from "../../src/simulation";
import { ageOnDate, electionContestResult } from "../../src/simulation";
import { projectBillPaper } from "../../src/presentation/bill-paper";
import { composeLifeStory } from "../../src/presentation/journal-story";
import { projectOrdinaryMeetingScene } from "../../src/presentation/ordinary-meeting-scene";
import {
  readHearingBank,
  readLegislationBank,
  readMeetingBank,
  readMinutesBank,
  readNewsBank,
  readNoticesBank,
  readWinningLosingBank,
  type BankReading,
} from "../../src/presentation/bank-english";
import { ownElectionResultSentence } from "../../src/presentation/own-election";
import { projectOrdinaryDay } from "../../src/presentation/ordinary-life";

export interface KindText {
  readonly kind: string;
  readonly composer: string;
  /** Plain words: what record the text comes from. */
  readonly situation: string;
  readonly text: string;
  /** Points a grade at the record the text was read from. */
  readonly partKey: string;
  /** The engine parts the text was made from, when it was composed from parts. */
  readonly parts?: readonly string[];
  /** What the item calibrates, when it is not the place. */
  readonly axis?: "age";
}

export interface KindReading {
  readonly texts: readonly KindText[];
  /** Kinds this world produced nothing for, with the reason. */
  readonly absent: readonly {
    readonly kind: string;
    readonly reason: string;
  }[];
}

const PER_KIND = 10;

export function readKinds(world: World, playerId: EntityId): KindReading {
  const texts: KindText[] = [];
  const absent: { kind: string; reason: string }[] = [];
  const add = (kind: string, found: readonly KindText[], why: string) => {
    if (found.length === 0) absent.push({ kind, reason: why });
    else texts.push(...found.slice(0, PER_KIND));
  };

  // A journal item is a chapter of the life told as a story (owner, via CTO
  // 2:14 p.m. Oct 8): a period of the life in sentences from the life-story
  // bank, with the person's records filled in. What a chapter tells changes
  // with how long the person has lived, so the item calibrates age.
  const age = ageOnDate(
    world.people[playerId]?.birthDate ?? world.currentDate,
    world.currentDate,
  );
  add(
    "journal",
    composeLifeStory(world, playerId).map((chapter) => ({
      kind: "journal",
      composer: "composeLifeStory in journal-story.ts",
      situation: `The player's journal, told as a story, opens the Chapters view. This is the chapter for ${chapter.heading}; the player is ${age}. This item tests: age.`,
      text: chapter.text,
      partKey: `journal:story:${chapter.key}`,
      parts: chapter.parts,
      axis: "age" as const,
    })),
    "the player's records hold nothing the life-story bank can tell",
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
    "news",
    [],
    readNewsBank(world),
    "readNewsBank in bank-english.ts",
    "no published legislative vote or veto can be composed from linked record fields",
  );
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

  // The line that opens the player's day, as the day screen shows it. It is
  // built from engine parts, so a grade on it reaches the parts it used.
  const day = projectOrdinaryDay(world, playerId);
  const opening: KindText[] = day.opening
    ? [
        {
          kind: "notices-and-screens",
          composer: "composeDayOpening in day-opening-english.ts",
          situation: "The line that opens the player's day on the day screen.",
          text: day.opening,
          partKey: day.openingParts[0] ?? "screen:day-opening",
          parts: day.openingParts,
        },
      ]
    : [];
  texts.push(...opening);
  addBank(
    "notices-and-screens",
    [],
    readNoticesBank(world, playerId),
    "readNoticesBank in bank-english.ts",
    "no recorded hearing, local measure, or scheduled election contest is available",
  );

  return { texts, absent };
}
