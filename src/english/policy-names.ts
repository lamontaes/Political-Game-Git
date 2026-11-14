/**
 * What the bill catalog calls a policy question and the topic it sits under,
 * in the English engine: the director asks for a name, never
 * reads the catalog's words itself.
 */
import billCatalog from "../core2/data/legislature/bill-catalog.json" with { type: "json" };
import { amountWords } from "./bill-sections";
import billSections from "../../data/english/bill-sections.json" with { type: "json" };

interface Policy {
  question?: string;
  name: string;
}
const subjects = (
  billCatalog as unknown as {
    subjects: {
      id: string;
      topics: { name: string; policies?: Policy[] }[];
    }[];
  }
).subjects;

/**
 * What a story is about: the catalog's topic for a policy question, or the
 * authored subject of a law's amount ("the minimum wage"), whose stories
 * carry the series as their topic. Null where neither names it.
 */
export function storyTopicName(topic: string): string | null {
  return (
    questionTopic(topic) ??
    (
      billSections as unknown as {
        amounts: Record<string, { subject: string }>;
      }
    ).amounts[topic]?.subject ??
    amountWords(topic)?.subject ??
    null
  );
}

/**
 * A record's topic as a sentence says it mid-line ("rental rules", "the
 * minimum wage"): the story topic's name, its first letter lowered when it
 * opens with an ordinary capitalized word, kept when it opens with an acronym.
 */
export function topicInSentence(topic: string): string | null {
  const name = storyTopicName(topic);
  if (!name) return null;
  return /^[A-Z][a-z]/.test(name)
    ? name.charAt(0).toLowerCase() + name.slice(1)
    : name;
}

/**
 * A law as a sentence names it: a question's policy is an action or a title
 * ("raise minimum wage", "public broadband"), so it is said as the law's
 * name, never as a noun that took effect; a subject the authored amounts name
 * ("the minimum wage") is already a noun and is said as it stands.
 */
export function lawAsNamed(series: string): string | null {
  const policy = questionName(series);
  if (policy) return `the "${policy}" law`;
  return storyTopicName(series.slice(series.lastIndexOf(":") + 1));
}

/** A question's name as the bill catalog records it ("raise minimum wage"). */
export function questionName(question: string): string | null {
  return questionRow(question)?.policy ?? null;
}

/** The catalog's subject a question sits under, by its id ("labor"). */
export function questionSubject(question: string): string | null {
  for (const subject of subjects)
    for (const topic of subject.topics)
      if ((topic.policies ?? []).some((policy) => policy.question === question))
        return subject.id;
  return null;
}

/** The catalog's topic for a question ("Wages and working hours"). */
export function questionTopic(question: string): string | null {
  return questionRow(question)?.topic ?? null;
}

function questionRow(
  question: string,
): { policy: string; topic: string } | null {
  for (const subject of subjects)
    for (const topic of subject.topics)
      for (const policy of topic.policies ?? [])
        if (policy.question === question)
          return { policy: policy.name, topic: topic.name };
  return null;
}

/** Every policy question the catalog names. */
export function allQuestions(): string[] {
  return subjects.flatMap((subject) =>
    subject.topics.flatMap((topic) =>
      (topic.policies ?? []).flatMap((policy) =>
        policy.question ? [policy.question] : [],
      ),
    ),
  );
}
