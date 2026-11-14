/**
 * A founded cause group's name. The simulation keeps the group by a structured
 * key; the name a player reads is made here from the group's topic and one
 * authored form (`data/english/group-names.json`), the form chosen by a fixed
 * reading of the key so the same group always carries the same name.
 */
import data from "../../data/english/group-names.json" with { type: "json" };
import causes from "../../data/english/group-causes.json" with { type: "json" };
import { topicInSentence } from "./policy-names";

const FORMS = data.forms as readonly { text: string; plural: boolean }[];

/** The group's name, or null where its topic has no name to say. */
export function causeGroupName(key: string, topic: string): string | null {
  const said = topicInSentence(topic);
  if (!said) return null;
  let sum = 0;
  for (let i = 0; i < key.length; i++)
    sum = (sum * 31 + key.charCodeAt(i)) >>> 0;
  return FORMS[sum % FORMS.length]!.text.replace("{topic}", titled(said));
}

/** Words a name keeps small inside it ("Friends of the Clean Water Rule"). */
const SMALL = new Set([
  "a",
  "an",
  "and",
  "for",
  "in",
  "of",
  "on",
  "or",
  "the",
  "to",
]);

/**
 * The topic as it stands in a group's name, cased whole like any name (Fable
 * A, Nov 13: "Friends of Transportation", never "Friends of transportation").
 */
function titled(topic: string): string {
  return topic
    .split(" ")
    .map((word) =>
      SMALL.has(word)
        ? word
        : `${word.charAt(0).toUpperCase()}${word.slice(1)}`,
    )
    .join(" ");
}

/**
 * The form a cause group's name was made from, when it was made from one: a
 * proper name that keeps its capitals ("Neighbors Concerned About rental
 * rules") and takes the verb its number needs ("Friends of policing back").
 */
export function causeGroupForm(name: string): { plural: boolean } | null {
  for (const form of FORMS) {
    const [head, tail] = form.text.split("{topic}");
    if (name.startsWith(head!) && name.endsWith(tail!))
      return { plural: form.plural };
  }
  return null;
}

const STANCE_FORMS = data.stanceForms as readonly {
  text: string;
  plural: boolean;
}[];
const CAUSES = causes.questions as Readonly<
  Record<string, { for: readonly string[]; against: readonly string[] }>
>;

/** The bank's key for a platform question ("us-policy-positions:justice.civilian-oversight-of-police" -> "civilian-oversight-of-police"). */
const questionKey = (question: string): string =>
  question.slice(question.lastIndexOf(".") + 1).replace(/^.*:/, "");

const readId = (key: string): number => {
  let sum = 0;
  for (let i = 0; i < key.length; i++)
    sum = (sum * 31 + key.charCodeAt(i)) >>> 0;
  return sum;
};

const fill = (form: string, cause: string, town: string | null): string =>
  form.replace("{cause}", cause).replace("{Town}", town ?? "");

/**
 * The name of a group formed over a stance (Words lead, Nov 14): the cause
 * its side would put on a sign (`data/english/group-causes.json`) in one of
 * the forms (`stanceForms`), both fixed for the group by a reading of its own
 * id; a name another group of its town already holds goes to the next form,
 * then the next cause. The side comes from the id's end (":for" or
 * ":against"). Null where the bank holds no cause for the question or every
 * name is taken, and the story then says what the group wants in a plain
 * clause. `taken` is the names the town's earlier groups hold.
 */
export function stanceGroupName(
  id: string,
  question: string,
  town: string | null,
  taken: ReadonlySet<string> = new Set(),
): { name: string; plural: boolean } | null {
  const row = CAUSES[questionKey(question)];
  if (!row) return null;
  const list = id.endsWith(":against") ? row.against : row.for;
  const seed = readId(id);
  for (let c = 0; c < list.length; c += 1) {
    const cause = list[(seed + c) % list.length]!;
    for (let f = 0; f < STANCE_FORMS.length; f += 1) {
      const form = STANCE_FORMS[(seed + f) % STANCE_FORMS.length]!;
      if (form.text.includes("{Town}") && !town) continue;
      const name = fill(form.text, cause, town);
      if (!taken.has(name)) return { name, plural: form.plural };
    }
  }
  return null;
}

/** The number a stance group's name takes, read from the form it was made in. */
export function stanceGroupForm(name: string): { plural: boolean } | null {
  for (const form of [...STANCE_FORMS].sort(
    // The more literal forms first, so "Neighbors for X" is never read as a town.
    (a, b) =>
      Number(a.text.includes("{Town}")) - Number(b.text.includes("{Town}")) ||
      b.text.length - a.text.length,
  )) {
    const pattern = new RegExp(
      `^${form.text
        .replace(/[.*+?^$()|[\]\\]/g, "\\$&")
        .replace("{Town}", ".+?")
        .replace("{cause}", ".+")}$`,
    );
    if (pattern.test(name)) return { plural: form.plural };
  }
  return null;
}
