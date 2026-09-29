import { daysBetween } from "../simulation";
import type { EntityId, World } from "../simulation";
import {
  composeGroundedLine,
  type ComposedLineBank,
  type LinePartVariant,
} from "./english-composition";
import type {
  GroundedEnglishFact,
  GroundedEnglishPacket,
} from "./grounded-english";

/**
 * The line that opens an ordinary day, written by the English engine from
 * the world's own facts: the day of the week and the month from the clock,
 * the town the person lives in, how many things are waiting on them, and who
 * they live with.
 *
 * It never reads the same two days running in the same place. Each part of
 * the line (the day, what is waiting, who is home) turns through its own
 * short list one step a day, and the lists are of different lengths, so the
 * same words come back in the same place only when the day of the week, the
 * list and the household all line up again. A different town, a different
 * household or a longer list reads differently on the same day. Nothing here
 * is drawn at random: the turn is the count of days since the world began.
 */

const VERSION = "1";

function variants(
  prefix: string,
  texts: readonly string[],
): readonly LinePartVariant[] {
  return texts.map((text, index) => ({
    key: `${prefix}-${index + 1}`,
    kind: "template" as const,
    text,
  }));
}

/** When and where. Four lines, so the week and this list rarely line up. */
const DAY = variants("day", [
  "{{weekday}} in {{place-name}}.",
  "A {{weekday}} in {{place-name}}, in {{month}}.",
  "It is {{weekday}} in {{place-name}}.",
  "{{month}} in {{place-name}}, and it is {{weekday}}.",
]);

/** Without a recorded town, the clock alone. */
const DAY_NO_PLACE = variants("day-no-place", [
  "{{weekday}}.",
  "A {{weekday}} in {{month}}.",
  "It is {{weekday}}.",
  "{{month}}, and it is {{weekday}}.",
]);

/** Nothing waiting. Five lines. */
const NOTHING_WAITING = variants("nothing-waiting", [
  "Nothing on the list is waiting on you.",
  "Nobody is waiting on you for anything today.",
  "The list is empty.",
  "Nothing is waiting on you.",
  "There is nothing on the list today.",
]);

/** Something waiting. Five lines. */
const SOMETHING_WAITING = variants("something-waiting", [
  "{{waiting}} on the list.",
  "The list has {{waiting}} on it.",
  "{{waiting}} waiting on you.",
  "{{waiting}} to see to.",
  "{{waiting}} nobody else is going to do.",
]);

/** Who is home. Three lines. */
const HOUSEMATE = variants("housemate", [
  "{{housemate}} is in the next room.",
  "{{housemate}} is home.",
  "{{housemate}} is around somewhere.",
]);

function bankOf(variant: LinePartVariant): ComposedLineBank {
  return {
    key: "day-opening",
    version: VERSION,
    surface: "scene",
    act: "tell",
    parts: { core: { variants: [variant] } },
  };
}

/** One step a day through a list, starting where this town starts. */
function turn<T>(list: readonly T[], day: number, offset: number): T {
  return list[(((day + offset) % list.length) + list.length) % list.length]!;
}

function numberWord(count: number): string {
  const words = ["no", "one", "two", "three", "four", "five", "six", "seven"];
  return words[count] ?? String(count);
}

export interface DayOpeningFacts {
  readonly placeName: string | null;
  readonly placeJurisdictionId: EntityId | null;
  /** The ids of the things on the person's list. */
  readonly waitingIds: readonly EntityId[];
  readonly housemateName: string | null;
  /** The housemate and the household record that puts them there. */
  readonly housemateSourceIds: readonly EntityId[];
}

/**
 * The opening line of an ordinary day, from the facts given. Each fact
 * carries the record that establishes it; a part whose fact is missing is
 * left out rather than filled in.
 */
export function dayOpeningLine(
  world: World,
  personId: EntityId,
  facts: DayOpeningFacts,
): string {
  const date = new Date(`${world.currentDate}T12:00:00Z`);
  const clock = [world.id];
  const factRows: Record<string, GroundedEnglishFact> = {
    weekday: {
      text: date.toLocaleDateString("en-US", {
        weekday: "long",
        timeZone: "UTC",
      }),
      sourceRecordIds: clock,
    },
    month: {
      text: date.toLocaleDateString("en-US", {
        month: "long",
        timeZone: "UTC",
      }),
      sourceRecordIds: clock,
    },
  };
  if (facts.placeName && facts.placeJurisdictionId)
    factRows["place-name"] = {
      text: facts.placeName,
      sourceRecordIds: [facts.placeJurisdictionId],
    };
  if (facts.waitingIds.length > 0)
    factRows.waiting = {
      text: `${numberWord(facts.waitingIds.length)} ${
        facts.waitingIds.length === 1 ? "thing" : "things"
      }`,
      sourceRecordIds: [...facts.waitingIds],
    };
  if (facts.housemateName && facts.housemateSourceIds.length > 0)
    factRows.housemate = {
      text: facts.housemateName,
      sourceRecordIds: [...facts.housemateSourceIds],
    };

  const packet: GroundedEnglishPacket = {
    surface: "scene",
    momentKey: `day-opening:${personId}:${world.currentDate}`,
    worldSeed: world.seed,
    bankVersion: VERSION,
    stage: "adult",
    sourceRecordIds: [personId],
    facts: factRows,
    // Every fact here is the viewer's own: their clock, their town, their
    // list and their household. They know each from the record it came from.
    viewer: { personId, traits: {} },
    knowledge: Object.entries(factRows).map(([factKey, fact]) => ({
      personId,
      factKey,
      sourceRecordIds: fact.sourceRecordIds,
    })),
  };

  // The count of days since the world began is the turn. Each town starts
  // its lists at its own place, so two towns on the same day read apart.
  const day = daysBetween(world.startedAt, world.currentDate);
  const offset = [...(facts.placeJurisdictionId ?? personId)].reduce(
    (total, character) => total + character.charCodeAt(0),
    0,
  );
  const chosen = [
    turn(factRows["place-name"] ? DAY : DAY_NO_PLACE, day, offset),
    turn(
      factRows.waiting ? SOMETHING_WAITING : NOTHING_WAITING,
      day,
      offset * 3,
    ),
    ...(factRows.housemate ? [turn(HOUSEMATE, day, offset * 7)] : []),
  ];
  const sentences = chosen.flatMap((variant) => {
    const line = composeGroundedLine(packet, bankOf(variant));
    return line.kind === "rendered" ? [line.text] : [];
  });
  return sentences.join(" ");
}
