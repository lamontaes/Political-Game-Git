/**
 * A founded cause group's name. The simulation keeps the group by a structured
 * key; the name a player reads is made here from the group's topic and one
 * authored form (`data/english/group-names.json`), the form chosen by a fixed
 * reading of the key so the same group always carries the same name.
 */
import data from "../../data/english/group-names.json" with { type: "json" };
import { topicInSentence } from "./policy-names";

const FORMS = data.forms as readonly {
  text: string;
  plural: boolean;
  side: "for" | "against";
}[];

/** The group's name, or null where its topic has no name to say. */
export function causeGroupName(key: string, topic: string): string | null {
  const said = topicInSentence(topic);
  if (!said) return null;
  // A group formed over a stance names its side in its key (":against"); the
  // name is made from that side's forms, so it never contradicts the group.
  const forms = FORMS.filter(
    (f) => f.side === (key.endsWith(":against") ? "against" : "for"),
  );
  let sum = 0;
  for (let i = 0; i < key.length; i++)
    sum = (sum * 31 + key.charCodeAt(i)) >>> 0;
  return forms[sum % forms.length]!.text.replace("{topic}", titled(said));
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
