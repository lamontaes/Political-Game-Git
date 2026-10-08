/**
 * The journal as a story (owner, via CTO 2:14 p.m. Oct 8; the owner's verdict
 * on the first version, CTO 4:30 p.m. Oct 8: "That's just a summary"). A story
 * needs what a summary does not: a narrator looking back, the connection
 * between one event and the next, the people who raised them, what a moment
 * was like, and turning points told as such.
 *
 * Each chapter is told from its chapter packet (`story-chapter-packet.ts`),
 * the facts the story director hands the English engine. Every clause is a
 * part of the life-story bank, mined from how Americans tell their own lives
 * in federal oral histories and testimony, with its particulars filled from
 * the packet. That includes the turns between events ("then", "after that,",
 * "eventually,", "that's when"), what a moment was like ("it was hard") and
 * the look back ("looking back, I was lucky"). Nothing here words a clause;
 * the composer only chooses which fact comes next and joins the clauses.
 *
 * - The turn between two events is "that's when" only when the packet names
 *   the earlier one as the later one's cause; otherwise the events follow by
 *   date, "eventually," after five years or more.
 * - A moment is weighed only where the packet carries a recorded feeling.
 * - A chapter the narrator has lived past closes by looking back only when
 *   their recorded temperament fits (`data/english/story-reflections.json`).
 *
 * A part the owner graded down is not chosen. Pure: reads the world, never
 * writes or advances time.
 */
import lifeStoryBank from "../../data/english/parts/life-story.json" with { type: "json" };
import storyReflections from "../../data/english/story-reflections.json" with { type: "json" };
import type { EntityId, World } from "../simulation";
import { spelledCount } from "../simulation/press/story-voice";
import { composeFromBank, type EnglishBank } from "./bank-english";
import { PART_GRADES, type PartGradeLedger } from "./english-grades";
import { buildStoryChapterPackets } from "./story-chapter-adapter";
import type { StoryChapterPacket, StoryMoment } from "./story-chapter-packet";

const BANK = lifeStoryBank as EnglishBank;

/** Years between events after which the next one comes "eventually". */
const EVENTUALLY_AFTER_YEARS = 5;

export interface StoryChapter {
  readonly key: string;
  /** The years the chapter covers, from the records ("1997–2015"). */
  readonly heading: string;
  readonly text: string;
  /** The bank parts the chapter was told with, for the owner's grades. */
  readonly parts: readonly string[];
  readonly sourceRecordIds: readonly EntityId[];
}

interface Clause {
  readonly text: string;
  readonly partKey: string;
}

function capitalized(text: string): string {
  return text.charAt(0).toLocaleUpperCase("en-US") + text.slice(1);
}

/** A clause with its tail, when both are told: "we moved to Y when I was 12". */
function withTail(clause: Clause | null, tail: Clause | null): Clause | null {
  if (!clause || !tail) return clause;
  return {
    text: `${clause.text} ${tail.text}`,
    partKey: `${clause.partKey},${tail.partKey}`,
  };
}

/** One sentence from one or two clauses: "I was born in X, and we moved to Y." */
function sentence(...clauses: readonly (Clause | null)[]): Clause | null {
  const kept = clauses.filter((clause): clause is Clause => clause !== null);
  if (kept.length === 0) return null;
  return {
    text: `${capitalized(kept.map((clause) => clause.text).join(", and "))}.`,
    partKey: kept.map((clause) => clause.partKey).join(","),
  };
}

/** Only the bank part with this key: every other wording is excluded. */
function onlyPart(key: string): RegExp {
  const text = BANK.parts.find((part) => part.key === key)?.text ?? "";
  return new RegExp(`^(?!${text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$)`);
}

export function composeStoryChapter(
  packet: StoryChapterPacket,
  grades: PartGradeLedger = PART_GRADES,
): StoryChapter | null {
  const say = (
    move: string,
    facts: Record<string, string>,
    pick: string,
    excludes?: RegExp,
  ): Clause | null =>
    composeFromBank(
      BANK,
      move,
      facts,
      `life-story:${packet.personId}:${pick}`,
      excludes,
      grades,
    );
  const when = (age: number, pick: string): Clause | null =>
    say("when", { age: spelledCount(age, false) }, pick);
  const told: (Clause | null)[] = [];

  // Where it starts.
  if (packet.bornHere)
    told.push(
      sentence(
        say(
          "birth",
          { place: packet.place.name },
          "born",
          packet.raisedHere ? undefined : /raised/,
        ),
      ),
    );

  // Who raised them, by relationship first, and what they did.
  for (const raiser of packet.raisedBy) {
    if (!raiser.occupation) continue;
    told.push(
      sentence(
        say(
          "family",
          { occupation: raiser.occupation },
          `parent:${raiser.personId}`,
          raiser.relation === "mother"
            ? /\b(?:father|dad)\b|only child/
            : /\b(?:mother|mom)\b|only child/,
        ),
      ),
    );
  }
  // Brothers and sisters are on record only when a parent is.
  const siblings = packet.siblings;
  if (siblings) {
    const { brothers, sisters } = siblings;
    if (brothers + sisters === 0)
      told.push(sentence(say("family", {}, "only-child")));
    else if (brothers >= 2 && sisters === 0)
      told.push(
        sentence(
          say(
            "family",
            { number: spelledCount(brothers, false) },
            "brothers",
            /sisters/,
          ),
        ),
      );
    else if (sisters >= 2 && brothers === 0)
      told.push(
        sentence(
          say(
            "family",
            { number: spelledCount(sisters, false) },
            "sisters",
            /brothers/,
          ),
        ),
      );
  }

  // What happened, in order, each event turned to from the one before.
  const momentClause = (moment: StoryMoment): Clause | null => {
    const pick = moment.key;
    switch (moment.kind) {
      case "moved":
        return withTail(
          say("move", { place: moment.facts.place ?? "" }, pick, /lived/),
          when(moment.age, `${pick}:when`),
        );
      case "loss":
        return withTail(
          say("loss", { parent: moment.facts.parent ?? "" }, pick),
          when(moment.age, `${pick}:when`),
        );
      case "school-finished":
        return moment.facts.school
          ? say("school", { school: moment.facts.school }, pick, /high school$/)
          : say("school", {}, pick);
      case "work-started":
        return say("work", { employer: moment.facts.employer ?? "" }, pick);
      case "married":
        return say(
          "people",
          { relation: moment.facts.relation ?? "" },
          pick,
          /married/,
        );
    }
  };
  const turnedTo = (
    clause: Clause,
    moment: StoryMoment,
    before: StoryMoment | null,
  ): Clause => {
    // The mined turns open on "I" or "we".
    if (!before || !/^(?:I|we)\b/.test(clause.text)) return clause;
    const years =
      Number(moment.date.slice(0, 4)) - Number(before.date.slice(0, 4));
    const turn =
      moment.causeKey === before.key
        ? say("cause", { clause: clause.text }, `turn:${moment.key}`)
        : say(
            "connect",
            { clause: clause.text },
            `turn:${moment.key}`,
            years >= EVENTUALLY_AFTER_YEARS
              ? /^(?:then|after that)\b/
              : /^eventually\b/,
          );
    return turn
      ? { text: turn.text, partKey: `${turn.partKey},${clause.partKey}` }
      : clause;
  };
  let before: StoryMoment | null = null;
  for (const moment of packet.moments) {
    const clause = momentClause(moment);
    if (!clause) continue;
    const opened = turnedTo(clause, moment, before);
    told.push(
      moment.kind === "married"
        ? sentence(
            opened,
            withTail(
              say("people", {}, `${moment.key}:married`, /\{relation\}|met/),
              when(moment.age, `${moment.key}:when`),
            ),
          )
        : sentence(opened),
    );
    // What it was like, where the records say.
    if (moment.feeling === "hard")
      told.push(
        sentence(say("weigh", {}, `${moment.key}:weigh`, /fun|loved|big deal/)),
      );
    if (moment.feeling === "good")
      told.push(
        sentence(
          say("weigh", {}, `${moment.key}:weigh`, /hard|tough|difficult/),
        ),
      );
    before = moment;
  }

  // Looking back on a stretch the narrator has lived past.
  if (!packet.current) {
    const fit = storyReflections.lookBack.find((row) =>
      packet.texture.temperament.includes(row.temperament),
    );
    const reflect = fit
      ? say("reflect", {}, "reflect", onlyPart(fit.reflect))
      : null;
    const lookBack = reflect
      ? say("look-back", { clause: reflect.text }, "look-back")
      : null;
    if (reflect && lookBack)
      told.push(
        sentence({
          text: lookBack.text,
          partKey: `${lookBack.partKey},${reflect.partKey}`,
        }),
      );
  }

  const kept = told.filter((clause): clause is Clause => clause !== null);
  if (kept.length === 0) return null;
  return {
    key: packet.key,
    heading: `${packet.from.slice(0, 4)}–${packet.through.slice(0, 4)}`,
    text: kept.map((clause) => clause.text).join(" "),
    parts: kept.flatMap((clause) =>
      clause.partKey.split(",").map((part) => `bank:${part}`),
    ),
    sourceRecordIds: [...new Set(packet.sourceRecordIds)],
  };
}

export function composeLifeStory(
  world: World,
  personId: EntityId,
  grades: PartGradeLedger = PART_GRADES,
): readonly StoryChapter[] {
  return buildStoryChapterPackets(world, personId).flatMap((packet) => {
    const chapter = composeStoryChapter(packet, grades);
    return chapter ? [chapter] : [];
  });
}
