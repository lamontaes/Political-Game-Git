/**
 * Prints the debate moderator's question and the asker's take on a pass, for
 * the standings the debate follow-up covers, over many moments: every
 * distinct line the bank gives for each (debate follow-up, Nov 15). Usage:
 * node --import tsx scripts/dev-tests/debate-ask-and-pass-lines.ts <out.md>
 */
import { writeFileSync } from "node:fs";
import sittings from "../../src/director/data/sittings.json" with { type: "json" };
import { CONVERSATION_DATA } from "../../src/director/conversation";
import { flagsOf } from "../../src/director/sitting";
import {
  wordConversationMove,
  type Fact,
} from "../../src/english/conversation-words";
import { questionAbout, questionTo } from "../../src/english/question-names";

const subjects = sittings.kinds.debate.subjects;
const cited = ["debate:proof", "question:proof"];
const fact = (text: string): Fact => ({ text, sourceRecordIds: cited });
const QUESTION = "budget-line:schools";

const lines: string[] = [];
const out = (text: string) => lines.push(text);
const distinct = (
  label: string,
  facts: Record<string, Fact>,
  subject: string,
  part: "ask" | "reply",
) => {
  const seen = new Map<string, number>();
  for (let i = 0; i < 400; i += 1) {
    const text = wordConversationMove({
      seed: "debate-ask-and-pass",
      subject,
      part,
      speakerId: "speaker",
      traits: {},
      facts,
      momentKey: `moment:${i}`,
      words: CONVERSATION_DATA,
    }) as unknown as { text?: string } | string | null;
    const said = typeof text === "string" ? text : (text?.text ?? "(none)");
    seen.set(said, (seen.get(said) ?? 0) + 1);
  }
  out(`### ${label}`);
  for (const [text, n] of [...seen].sort((a, b) => b[1] - a[1]))
    out(`- ${text}  (${n} of 400 moments)`);
  out("");
};

const base = (flags: readonly string[]): Record<string, Fact> => ({
  about: fact(questionAbout(QUESTION)!),
  to: fact(questionTo(QUESTION)!),
  outlet: fact("The Courier"),
  acquainted: fact("yes"),
  ...Object.fromEntries(flags.map((key) => [key, fact("yes")])),
});

out(
  "# Debate question and pass takes (flags from the record, as sitting.ts builds them)\n",
);
out("## The moderator's question\n");
distinct(
  "Stand against, rival for (the question that used to end in Why?)",
  { ...base(flagsOf(-1, 0, 1)), rival: fact("Sam Rivera") },
  subjects.question,
  "ask",
);
distinct(
  "Stand for, rival against",
  { ...base(flagsOf(1, 0, -1)), rival: fact("Sam Rivera") },
  subjects.question,
  "ask",
);
out("## The asker takes a pass (Nothing to add on that.)\n");
for (const [label, stand] of [
  ["a pass with no stand on record", null],
  ["a pass with a stand against on record", -1],
  ["a pass with a stand for on record", 1],
] as const)
  distinct(
    label,
    { ...base(flagsOf(stand, 0, null)), "said-none": fact("yes") },
    `${subjects.takePrefix}brief`,
    "reply",
  );
writeFileSync(process.argv[2] ?? "/dev/stdout", lines.join("\n") + "\n");
