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
 * - by the owner's grades: a sentence graded down is not chosen.
 * A sentence with a blank the records cannot fill is not chosen either. When
 * no sentence is left, there is no line, and the screen keeps what it shows.
 *
 * Pure: reads the world, never writes or advances time.
 */
import talkChoiceBank from "../../data/english/parts/talk-choice.json" with { type: "json" };
import type { EntityId, World } from "../simulation";
import { describePersonContext } from "../simulation/person-context";
import { composeFromBank, type EnglishBank } from "./bank-english";
import { PART_GRADES, type PartGradeLedger } from "./english-grades";

const BANK = talkChoiceBank as EnglishBank;

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
  for (const [slot, value] of Object.entries(facts))
    if (typeof value === "string") filled[slot] = value;
  const line = composeFromBank(
    BANK,
    choice,
    filled,
    `talk-choice:${world.id}:${playerPersonId}:${personId}:${choice}:${world.currentDate}`,
    wrongHour(world.currentMoment.minuteOfDay),
    grades,
  );
  return line ? { text: line.text, parts: [`bank:${line.partKey}`] } : null;
}
