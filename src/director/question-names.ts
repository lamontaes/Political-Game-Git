/** What the bill catalog calls a policy question and the topic it sits under. */
import billCatalog from "../core2/data/legislature/bill-catalog.json" with { type: "json" };
import { BILL_SECTIONS, shipsAsWords } from "../english/bill-sections";

interface Policy {
  question?: string;
  name: string;
}
const subjects = (
  billCatalog as unknown as {
    subjects: { topics: { name: string; policies?: Policy[] }[] }[];
  }
).subjects;

/**
 * What a story is about: the catalog's topic for a policy question, or the
 * authored subject of a law's amount ("the minimum wage"), whose stories
 * carry the series as their topic. Null where neither names it, or where the
 * amount's words are authored and not yet graded (`shippable: false`).
 */
export function storyTopicName(topic: string): string | null {
  const row = BILL_SECTIONS.amounts[topic];
  return questionTopic(topic) ?? (shipsAsWords(row) ? row!.subject : null);
}

/** A question's name as the bill catalog records it ("raise minimum wage"). */
export function questionName(question: string): string | null {
  return questionRow(question)?.policy ?? null;
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
