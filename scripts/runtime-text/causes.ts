/**
 * Why a string could not be traced to a line of source.
 *
 * Every string the classifier cannot place carries a cause, written here as a
 * pattern over the rendered text. A string that fits no rule is reported as
 * `unexplained` and the guard refuses it, so a new untraceable string is read by
 * a person before it lands. A cause explains the shape; it is not a promise
 * that the words are good.
 */
export interface CauseRule {
  readonly id: string;
  /** A rule matches when its text pattern and its control id pattern both do. */
  readonly pattern?: RegExp;
  readonly testid?: RegExp;
  readonly cause: string;
}

const NAME = "[A-Z][\\p{L}'.-]+(?: [A-Z][\\p{L}'.-]+)*";

export const CAUSE_RULES: readonly CauseRule[] = [
  {
    id: "tv-station-initials",
    testid: /^room-tv-bug$/,
    cause:
      "the initials of the room television's station name, drawn as its corner logo (src/player/RoomMedia.tsx)",
  },
  {
    id: "condition-value",
    testid: /^place-condition-now$/,
    cause:
      "a recorded condition value written with its unit from the outcome data",
  },
  {
    id: "condition-name",
    testid: /^place-condition-/,
    cause:
      "a place condition's name read from the outcome data (data/research/outcome-web/place-outcome-bases-2024.json)",
  },
  {
    id: "appearance-option-label",
    testid: /^engine-appearance-/,
    cause:
      "an appearance option name (outfit, hair, face) read from the art pack",
  },
  {
    id: "person-and-relation",
    pattern: new RegExp(`^${NAME}, your [a-z ]+$`, "u"),
    cause: "a person's name joined with the relationship word the record holds",
  },
  {
    id: "person-and-role",
    pattern: new RegExp(`^${NAME}, [a-z]+(?: and [a-z]+)*$`, "u"),
    cause: "a person's name joined with the occupations the record holds",
  },
  {
    id: "relation-sentence",
    pattern: new RegExp(`^${NAME} is my [a-z ]+\\.$`, "u"),
    cause: "a journal sentence built from a name and a relationship word",
  },
  {
    id: "counter",
    pattern: /^\d+ of \d+$|^\d+ shown\.$/,
    cause: "counts from the record inside a fixed counter phrase",
  },
  {
    id: "inspect-place",
    pattern: /^Inspect: .+$/,
    cause: "a fixed verb and a place name from the record",
  },
  {
    id: "activity-and-kind",
    pattern: /^.+ \((?:personal|professional)\)$/,
    cause: "an activity name and its kind from the record",
  },
  {
    id: "here-place",
    pattern: /^Here: .+$/,
    cause: "a fixed word and the place name from the record",
  },
  {
    id: "initials",
    pattern: /^[A-Z]{2}$/,
    cause: "initials computed from a person's name for a portrait chip",
  },
  {
    id: "journal-sentence",
    pattern:
      /^(?:(?:In|At|On|During) [^,]+, )?.*\b(?:I|my|me)\b.*[.]$|^At \d+$/,
    cause:
      "a history line written in the second person, rewritten to the first person with the record's names and dates",
  },
  {
    id: "candidate-and-party",
    pattern: new RegExp(`^${NAME} · [A-Z][a-z]+ Party$`, "u"),
    cause: "a candidate's name and party from the record",
  },
  {
    id: "seat-counts",
    pattern: /: \d+ [A-Z][a-z]+ Party/,
    cause: "seat counts and party names from the record joined into a sentence",
  },
  {
    id: "chamber-size",
    pattern: /: \d+ seats$/,
    cause: "a chamber's name and seat count from the record",
  },
  {
    id: "officeholder",
    pattern: new RegExp(`^${NAME} is [A-Z][A-Za-z ]+\\.$`, "u"),
    cause:
      "an officeholder's name joined with the office title from the record",
  },
  {
    id: "seat-name",
    pattern: /^A seat in the .+$/,
    cause: "an office name from the record after a fixed article",
  },
  {
    id: "separator-fragment",
    pattern:
      /^· [\p{L}][\p{L}0-9.', -]*$|^[\p{L}][\p{L}0-9.', -]* ·(?: [\p{L}][\p{L}0-9.', -]*)?$/u,
    cause: "record values beside a separator the screen draws between values",
  },
  {
    id: "value-and-unit",
    pattern: /per month$|USD per month|^[\p{L}][\p{L}., -]+ · USD per month$/u,
    cause: "a figure or place from the record next to a fixed unit",
  },
  {
    id: "district-label",
    pattern: /^[A-Z]{2} \d+$/,
    cause: "a state code and district number from the record",
  },
  {
    id: "age-line",
    pattern: /^\d{4} \(age \d+\)$|^\d+ · [A-Z][a-z]+ \d+, \d{4}$/,
    cause: "a birth year, age or date from the record",
  },
];

export const UNEXPLAINED = "unexplained";

/** The rule id that explains `text`, or `unexplained`. */
export function causeOf(
  text: string,
  testid?: string | null,
): { id: string; cause: string } {
  const rule = CAUSE_RULES.find(
    (candidate) =>
      (candidate.pattern !== undefined || candidate.testid !== undefined) &&
      (candidate.pattern === undefined || candidate.pattern.test(text)) &&
      (candidate.testid === undefined || candidate.testid.test(testid ?? "")),
  );
  return rule
    ? { id: rule.id, cause: rule.cause }
    : { id: UNEXPLAINED, cause: "no rule explains this string yet" };
}
