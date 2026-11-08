/**
 * A founded cause group's name. The simulation keeps the group by a structured
 * key; the name a player reads is made here from the group's topic and one
 * authored form (`data/english/group-names.json`), the form chosen by a fixed
 * reading of the key so the same group always carries the same name.
 */
import data from "../../data/english/group-names.json" with { type: "json" };
import { topicInSentence } from "./policy-names";

const FORMS = data.forms as readonly string[];

/** The group's name, or null where its topic has no name to say. */
export function causeGroupName(key: string, topic: string): string | null {
  const said = topicInSentence(topic);
  if (!said) return null;
  let sum = 0;
  for (let i = 0; i < key.length; i++)
    sum = (sum * 31 + key.charCodeAt(i)) >>> 0;
  return FORMS[sum % FORMS.length]!.replace("{topic}", said);
}
