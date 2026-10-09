/**
 * The words of a conversation choice, as the player would say them (CTO
 * 2:46 p.m. Oct 8, from the owner's rule against hand-written player text):
 * "Hello." or "Why is that?" instead of a fixed label such as "Say hello".
 *
 * Every choice is a whole sentence from the talk-choice bank, mined from what
 * people said to each other in federal oral histories and testimony. The
 * composer only chooses among the sentences filed under the choice:
 * - by the clock: "Good morning." from 5 a.m. until noon, "Good afternoon."
 *   until 5 p.m., "Good evening." until 10 p.m., and none of them late at
 *   night;
 * - by acquaintance: a line that calls the person by name ("Hi, Ana.") only
 *   when a record says how the player knows them;
 * - by the other person's last line (owner rule R3, Oct 8): a question gets
 *   an answer ("Good, how are you?"), an invitation gets a yes or no, a
 *   greeting gets a greeting. Which sentences answer which line is data,
 *   `data/english/talk-choice-fits.json`; a choice that does not answer the
 *   last line gets no sentence;
 * - by the owner's grades: a sentence graded down is not chosen.
 * A sentence with a blank the records cannot fill is not chosen either. When
 * no sentence is left, there is no line, and the screen keeps what it shows.
 *
 * Pure: reads the world, never writes or advances time.
 */
import talkChoiceFits from "../../data/english/talk-choice-fits.json" with { type: "json" };
import talkChoiceBank from "../../data/english/parts/talk-choice.json" with { type: "json" };
import type { EntityId, World } from "../simulation";
import { describePersonContext } from "../simulation/person-context";
import { composeFromBank, stableHash, type EnglishBank } from "./bank-english";
import { PART_GRADES, type PartGradeLedger } from "./english-grades";

const BANK = talkChoiceBank as EnglishBank;

/** What the other person's last line was, which the choice must answer. */
export type LastLine = keyof typeof talkChoiceFits.fits;

const FITS = talkChoiceFits.fits as Record<
  LastLine,
  Partial<Record<string, readonly string[]>>
>;

/** What kind of line a reply is, from the choice it answers (data). */
const AFTER_CHOICE = talkChoiceFits.afterChoice as Record<
  string,
  { readonly asks: LastLine; readonly says: LastLine }
>;

/**
 * The kind of the other person's last line, from what the player chose and
 * what came back: nothing yet, a greeting with or without "How are you?", an
 * open invitation, another question, or a statement.
 */
export function lastLineOf(
  previous: { readonly intent: string; readonly reply: string } | null,
  invitationOpen: boolean,
): LastLine {
  if (!previous) return "opening";
  if (invitationOpen) return "invitation";
  const asks = /\?["”]?\s*$/.test(previous.reply);
  const answering = AFTER_CHOICE[previous.intent] ?? AFTER_CHOICE.default!;
  return asks ? answering.asks : answering.says;
}

export interface TalkChoiceLine {
  readonly text: string;
  /** The bank part, for the owner's grades. */
  readonly parts: readonly string[];
}

/** The particulars a choice can name, when the records give them. */
export interface TalkChoiceFacts {
  /** A headline or an earlier conversation's subject. */
  readonly topic?: string;
  /** An official the player could ask about, by name. */
  readonly official?: string;
  /** That official's office, in lower case. */
  readonly office?: string;
  /** The other person's last line; a conversation not yet begun by default. */
  readonly lastLine?: LastLine;
}

/**
 * The greetings that name a time of day, kept to the hour that fits: morning
 * from 5 a.m., afternoon from noon, evening from 5 p.m. until 10 p.m. Late at
 * night none of them fits.
 */
function wrongHour(minuteOfDay: number): RegExp {
  const hour = Math.floor(minuteOfDay / 60);
  const fits =
    hour >= 5 && hour < 12
      ? "morning"
      : hour >= 12 && hour < 17
        ? "afternoon"
        : hour >= 17 && hour < 22
          ? "evening"
          : null;
  const wrong = ["morning", "afternoon", "evening"].filter(
    (part) => part !== fits,
  );
  return new RegExp(`\\bGood (?:${wrong.join("|")})\\b`);
}

export function composeTalkChoice(
  world: World,
  playerPersonId: EntityId,
  personId: EntityId,
  choice: string,
  facts: TalkChoiceFacts = {},
  grades: PartGradeLedger = PART_GRADES,
): TalkChoiceLine | null {
  const person = world.people[personId];
  if (!person) return null;
  const known =
    describePersonContext(world, playerPersonId, personId)?.relationship !=
    null;
  // A blank the records cannot fill leaves its sentence out (composeFromBank).
  const filled: Record<string, string> = known
    ? { name: person.givenName }
    : {};
  const { lastLine = "opening", ...particulars } = facts;
  for (const [slot, value] of Object.entries(particulars))
    if (typeof value === "string") filled[slot] = value;
  // Only the sentences that answer the other person's last line.
  const pick = `talk-choice:${world.id}:${playerPersonId}:${personId}:${choice}:${world.currentDate}`;
  const lines = (FITS[lastLine][choice] ?? []).flatMap((move) => {
    const line = composeFromBank(
      BANK,
      move,
      filled,
      pick,
      wrongHour(world.currentMoment.minuteOfDay),
      grades,
    );
    return line ? [line] : [];
  });
  const line = lines[stableHash(`${pick}:move`) % Math.max(1, lines.length)];
  return line ? { text: line.text, parts: [`bank:${line.partKey}`] } : null;
}
