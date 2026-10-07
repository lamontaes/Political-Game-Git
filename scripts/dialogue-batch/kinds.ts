/**
 * The kinds of text beyond conversation (owner, 6:20 p.m. Oct 6; batch
 * variety rule, CTO 7:55 p.m.): each kind is read from the game's own
 * producer on a generated world, never written here. A kind the world cannot
 * produce says why, so the batch shows the gap instead of hiding it.
 *
 * A development tool. Read-only: it never advances time or writes records.
 */
import type { EntityId, World } from "../../src/simulation";
import { spokenDate } from "../../src/simulation/dates";
import { electionContestResult } from "../../src/simulation";
import { projectBillPaper } from "../../src/presentation/bill-paper";
import { projectJournalView } from "../../src/presentation/journal-views";
import { projectNewsFrontPage } from "../../src/presentation/news-front-page";
import { projectOrdinaryMeetingScene } from "../../src/presentation/ordinary-meeting-scene";
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

/** Kinds no producer in the game writes yet. */
export const KINDS_WITHOUT_PRODUCER: Readonly<Record<string, string>> = {
  hearing: "no producer writes committee hearing text yet",
  minutes: "no producer writes meeting minutes yet",
  "notices-and-screens":
    "no producer writes notices or letters to the player from the world yet",
};

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

  const journal = projectJournalView(world, playerId, "chapters", null);
  const entries = journal.sections.flatMap((section) => section.entries);
  add(
    "journal",
    entries
      .slice(-PER_KIND)
      .reverse()
      .map((entry, index) => ({
        kind: "journal",
        composer: "projectJournalView in journal-views.ts",
        situation: `The player's journal, ${["the latest", "the one before", "the third-latest"][index] ?? "an"} entry, dated ${spokenDate(entry.at)}.`,
        text: entry.text,
        partKey: `journal:entry:${entry.sourceId}`,
      })),
    "the player's journal has no entries yet",
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
  add("legislation", bills, "no Congress measure with printed text is filed");

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
  add("winning-and-losing", results, "no race in this world is decided yet");

  const meeting = projectOrdinaryMeetingScene(world, playerId);
  add(
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
    "the player is not at a meeting",
  );

  for (const [kind, reason] of Object.entries(KINDS_WITHOUT_PRODUCER))
    absent.push({ kind, reason });
  return { texts, absent };
}
