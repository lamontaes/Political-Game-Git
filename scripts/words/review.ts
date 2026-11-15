/**
 * Planted review batches for a judged rule, so a builder never judges its
 * own lines (words-engine skill, "Keeping line-rules green").
 *
 *   npm run words:review -- --sheets <dir> --out <dir> [--sample <n>]
 *       turns the sheets `npm run words:pairs` wrote into batch files a
 *       reviewer reads (`<out>/NN.md`), with planted entries from a fixed
 *       list mixed in, and keeps the answer key apart (`<out>.key.json`).
 *   npm run words:review -- --check <dir>
 *       reads each reviewer's `NN.verdicts.json` beside its batch, refuses a
 *       batch that misses a plant or skips an entry, drops the plants and
 *       writes `<dir>/verdicts/<rule>.json` for `npm run words:verdicts`.
 *
 * A reviewer is a fresh session (Opus at medium) handed one batch file and
 * nothing else: never the builder's work, never the key.
 */
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { basename, join, relative, resolve } from "node:path";
import { hash53 } from "../../src/english/judged";
import type { LineRule } from "../../src/english/line-rules";
import { readRules } from "./run-rules";

/** A planted entry: the words a reviewer reads, and the answer it must give. */
interface Plant {
  readonly passes: boolean;
  /** A pair (the line answered, then the reply) or a set (the line answered, then the replies offered). */
  readonly before: string;
  readonly said: readonly string[];
  /** For a rule that reads later replies: the replies offered first. */
  readonly first?: readonly string[];
  /** For a rule about a slot's variants: `said` are the variants, `before` names the slot. */
  readonly slot?: true;
  /** For a rule about a whole speech: `before` names the speech, `said` are its parts in order, and `stages` the steps it was built in. */
  readonly speech?: true;
  readonly stages?: readonly SpeechStageRow[];
}

/** One step of a speech built in steps: the choices offered and the one taken. */
interface SpeechStageRow {
  readonly stage: string;
  readonly offered: readonly string[];
  readonly chosen: string;
}

/** Plants by rule, in our own words: two that pass and one that fails per batch. */
export const PLANTS: Readonly<Record<string, readonly Plant[]>> = {
  "reply-second-move-follows-the-first": [
    {
      passes: true,
      before: "Did you read the zoning plan?",
      said: ["I did. Page six worries me most."],
    },
    {
      passes: true,
      before: "Is the plant hiring again?",
      said: ["They are. My cousin starts Monday on the night shift."],
    },
    {
      passes: true,
      before: "What did the mayor say?",
      said: ["Not much. She said she'd think about it and call me."],
    },
    {
      passes: true,
      before: "Did you get my letter?",
      said: ["I did. I'm sorry it took me so long to answer."],
    },
    {
      passes: false,
      before: "How was the hearing?",
      said: ["Long. Do you know a good mechanic?"],
    },
    {
      passes: false,
      before: "Are the schools closed tomorrow?",
      said: ["Yes, for the snow. My uncle sold his boat."],
    },
    {
      passes: false,
      before: "Will you sign the petition?",
      said: ["I'll sign it. Have you tried the new bakery?"],
    },
  ],
  "no-quick-resolution": [
    {
      passes: true,
      before: "Liam McNeely says you told him you're against it.",
      said: [
        "I said I had questions. That's not the same thing.",
        "You're right. I shouldn't have said that.",
        "Who told Liam that?",
      ],
    },
    {
      passes: true,
      before: "Will you bring more people to the canvass Saturday?",
      said: [
        "You've got it.",
        "Not until you tell me where the last ten went.",
        "Maybe. I'll see who's free.",
      ],
    },
    {
      passes: false,
      before: "You promised me that vote, and you broke it.",
      said: [
        "You're right. I'm sorry.",
        "I'll make it up to you.",
        "You're right, and it won't happen again.",
      ],
    },
  ],
  "speech-has-a-core": [
    {
      passes: true,
      speech: true,
      before: "a mayor's address",
      said: [
        "Good evening, neighbors, and thank you for coming.",
        "Our water mains are older than most of us in this room. Last winter three of them broke in one week, and the people on Elm Street boiled their water for nine days. I will ask the council for the money to replace the worst of them this year, because nobody here should wonder whether the tap is safe.",
        "The other thing I hear at every door is rent. Young families are leaving because they can't find a place they can pay for. I want the empty lots by the old depot zoned for homes, and I will bring that to the council in the spring.",
        "That's the work. Thank you, and good night.",
      ],
    },
    {
      passes: true,
      speech: true,
      before: "the speech the player builds in steps",
      said: [],
      stages: [
        {
          stage: "opener",
          offered: [
            "Thanks for coming out tonight.",
            "It's good to be home.",
            "Evening, everybody.",
            "I'll keep this short.",
          ],
          chosen: "It's good to be home.",
        },
        {
          stage: "core",
          offered: [
            "I grew up two streets from the mill. When it closed, my father drove an hour each way for half the pay. I want this town to have work worth staying for, and I'll fight for the training money that brings it.",
            "Our school lost its music teacher last year. A town that can't keep a band room open is telling its kids something, and I don't like what it says.",
            "I hear about the roads at every door. Patching the same holes every spring costs more than paving them once.",
            "I'm against raising the sales tax. It falls hardest on the people who can least afford it.",
          ],
          chosen:
            "I grew up two streets from the mill. When it closed, my father drove an hour each way for half the pay. I want this town to have work worth staying for, and I'll fight for the training money that brings it.",
        },
        {
          stage: "core",
          offered: [
            "Our school lost its music teacher last year. A town that can't keep a band room open is telling its kids something, and I don't like what it says.",
            "I hear about the roads at every door. Patching the same holes every spring costs more than paving them once.",
            "I'm against raising the sales tax. It falls hardest on the people who can least afford it.",
            "My mother still lives on Pine Street. She shouldn't have to wait forty minutes for an ambulance.",
          ],
          chosen:
            "I hear about the roads at every door. Patching the same holes every spring costs more than paving them once.",
        },
        {
          stage: "closer",
          offered: [
            "Thank you. Let's get to work.",
            "That's what I'm running on.",
            "Thanks for listening.",
            "Good night, everybody.",
          ],
          chosen: "Thank you. Let's get to work.",
        },
      ],
    },
    {
      passes: false,
      speech: true,
      before: "a town member's campaign speech",
      said: [
        "Hello, everybody!",
        "Vote for me!",
        "We can do it!",
        "Thank you!",
      ],
    },
  ],
  "escalation-can-be-answered-in-kind": [
    {
      passes: true,
      before: "Cross me on this and you'll regret it.",
      said: [
        "Don't threaten me in my own office.",
        "Let's calm down.",
        "I'm leaving.",
      ],
    },
    {
      passes: true,
      before: "You're a liar, and everyone here knows it.",
      said: [
        "Say that again and I'll show them the minutes.",
        "I hear you're upset.",
        "This conversation is over.",
      ],
    },
    {
      passes: false,
      before: "Vote no and I'll make sure you never win again.",
      said: [
        "Let's both take a breath.",
        "I understand you're angry.",
        "I need to go.",
      ],
    },
  ],
  "reply-follows-the-line-before": [
    {
      passes: true,
      before: "Did you read the zoning plan?",
      said: ["I did. Page six worries me most."],
    },
    {
      passes: true,
      before: "Is the plant hiring again?",
      said: ["They are. My cousin starts Monday."],
    },
    {
      passes: true,
      before: "Will you sign the petition?",
      said: ["Not yet. Who's behind it?"],
    },
    {
      passes: false,
      before: "How was the hearing?",
      said: ["My sister got a new dog."],
    },
    {
      passes: false,
      before: "Are the schools closed tomorrow?",
      said: ["The mayor's car is red."],
    },
  ],
  "player-never-says-unchosen": [
    {
      passes: true,
      before: "Here are your forms. Sign at the bottom.",
      said: ["Thank you."],
    },
    {
      passes: true,
      before: "Have a seat. I'll be right with you.",
      said: ["Thanks."],
    },
    {
      passes: false,
      before: "Will you vote for the park bond?",
      said: ["Yes. I'm voting for it, and I'll say so at the meeting."],
    },
    {
      passes: false,
      before: "Can I count on your endorsement?",
      said: ["You can. I'll put my name on it today."],
    },
  ],
  "variants-differ-in-what-they-say": [
    {
      passes: true,
      slot: true,
      before: "a neighbor greets the player at the door",
      said: [
        "You're the one running for council? My husband said you'd come by. (needs: the partner heard of the player)",
        "Saw your sign on Elm Street. Come in out of the cold. (needs: a yard sign nearby; winter)",
        "Oh, you. You towed my truck last spring. (needs: a past quarrel with the player)",
      ],
    },
    {
      passes: true,
      slot: true,
      before: "the clerk hands back a filing",
      said: [
        "You're missing forty signatures. Come back before Friday.",
        "All set. You'll be on the ballot in November.",
        "The fee went up in July. It's fifty dollars more now.",
      ],
    },
    {
      passes: false,
      slot: true,
      before: "a neighbor greets the player at the door",
      said: [
        "Hello there. Nice to see you.",
        "Hi. Good to see you.",
        "Well, hello. Nice to see you here.",
      ],
    },
  ],
  "later-replies-move-the-talk-on": [
    {
      passes: true,
      before: "So you'll vote for the park bond?",
      first: ["Yes.", "No.", "I haven't decided."],
      said: [
        "Then help me sell it at the Rotary lunch Thursday.",
        "What happens to the old ball field if it passes?",
        "Who else on the council is with you?",
      ],
    },
    {
      passes: true,
      before: "I can't lend you the money. I'm sorry.",
      first: ["I understand.", "You promised.", "Forget it."],
      said: [
        "Could you co-sign at the credit union instead?",
        "Then I'll sell the truck. Do you know anyone who wants it?",
        "Can I at least stay here until the first?",
      ],
    },
    {
      passes: false,
      before: "So you'll vote for the park bond?",
      first: ["Yes, I'll vote for it.", "No, I won't.", "I haven't decided."],
      said: [
        "I'm voting yes on it.",
        "No. I'm against it.",
        "I still don't know yet.",
      ],
    },
  ],
  "replies-may-be-long-and-substantive": [
    {
      passes: true,
      before: "Should the town fix the pool or the library roof first?",
      said: [
        "The roof. Rain gets in every spring and the books go first.",
        "The pool.",
        "I don't know.",
      ],
    },
    {
      passes: true,
      before: "Are you voting for the new zoning plan?",
      said: [
        "No. It puts a gas station next to the grade school, and I won't do that.",
        "Yes.",
        "Not sure yet.",
      ],
    },
    {
      passes: false,
      before: "Are you voting for the new zoning plan?",
      said: ["Yes.", "No.", "Maybe.", "Okay."],
    },
  ],
};

/**
 * What each rule does not judge, said on every batch: a reviewer left to
 * guess judges fit instead (40 of 81 noes on Nov 14 were about fit, not the
 * rule; words-engine skill).
 */
export const NOT_JUDGED: Readonly<Record<string, string>> = {
  "speech-has-a-core":
    "Each entry is one whole speech as the game composed it: its parts in order, or, for a speech the player builds in steps, each step's choices and the one taken. Pass if it has a short opening and a short close around a longer core that says something of substance, and, where it is built in steps, the core's choices are on different subjects. Fail if it is a few short lines with nothing at its center (a four-line rally), one block with no parts, or a core of the same subject twice. Whether the speech has one theme, takes a stance well, keeps a real speech's order, or is well written is judged by other rules, not here.",
  "variants-differ-in-what-they-say":
    'Each entry is one slot: the lines the game can pick from for the same spot in a scene, with the facts each one needs from the world ("needs") or rules out ("not"). Pass if the variants say different things, or are tied to different facts, so the same spot plays differently in different worlds. Fail if most of them say the same thing in other words with nothing in the world to choose between them. How well each line is written, and whether it fits the scene, is not judged here.',
  "player-never-says-unchosen":
    "In every entry B is said by the player, after A, as the game's own line rather than a reply the player picked from a list. Pass if B is something anyone would say there whatever they had decided (thanks, a greeting, a goodbye, a plain acknowledgment); fail if B commits the player to a choice, a stance, a promise or a feeling they did not pick. Whether B is well written or fits A is not judged here.",
  "reply-follows-the-line-before":
    "This rule judges only whether B answers or follows from what A just said. Whether B's own two moves follow each other is a different rule and not judged here. B may speak to the scene's own subject (the bill, the vote, the loss) even when A does not repeat it; that alone is never a reason to fail it.",
  "later-replies-move-the-talk-on":
    "This rule judges only the replies offered now against the replies offered first: pass if they move the talk on, fail if most of them say the first replies again in new words. How well each reply is written, or whether it fits the line before, is not judged here.",
  "reply-second-move-follows-the-first":
    "This rule judges only B: does B's second move follow from B's own first move? Whether B is a good answer to A is a different rule and not judged here. A reply with one move passes.",
  "no-quick-resolution":
    "This rule judges only whether at least one of the replies offered pushes back, deflects or raises the stakes instead of giving in at once. One agreeable reply among them is fine. How well each reply is written, or whether it fits the line before, is not judged here.",
  "escalation-can-be-answered-in-kind":
    "This rule judges only whether one of the replies offered answers the threat or insult in kind. How well each reply is written is not judged here.",
  "replies-may-be-long-and-substantive":
    "This rule judges only whether at least one of the replies offered carries an argument or a reason, so choosing it does not kill the talk. Length alone is not substance: a longer stance, promise, thanks or exit with no reason in it does not pass. Whether the replies fit is not judged here.",
};

/** About how many entries one reviewer reads. */
const PER_BATCH = 160;

/** One entry on a batch, from a pair sheet (`lines`) or a scene sheet (`paths`). */
interface Entry {
  readonly id: string;
  readonly text: string;
}

const quote = (text: string) => `"${text}"`;

/** The entries a words:pairs sheet holds, as a reviewer reads them. */
export function entriesOf(sheet: {
  purpose?: string;
  pairs?: { id: string; beforeText: string; replyText: string }[];
  lines?: {
    line: string;
    alone?: { id: string };
    after: { id: string; line: string }[];
  }[];
  paths?: {
    id: string;
    scene: string;
    lines: { role: string; words: string }[];
    first?: { words: string }[];
    options?: { words: string }[];
    variants?: { words: string; needs: string[]; not: string[] }[];
  }[];
  speeches?: {
    id: string;
    kind: string;
    parts?: readonly string[];
    stages?: readonly SpeechStageRow[];
  }[];
}): Entry[] {
  const who = (role: string) =>
    role === "asked"
      ? "you"
      : role === "narrator"
        ? "narrator"
        : "the other person";
  const entries: Entry[] = [];
  for (const row of sheet.lines ?? []) {
    if (row.alone)
      entries.push({
        id: row.alone.id,
        text: `A: (nothing; B opens)\nB: ${quote(row.line)}`,
      });
    for (const before of row.after)
      entries.push({
        id: before.id,
        text: `A: ${quote(before.line)}\nB: ${quote(row.line)}`,
      });
  }
  for (const pair of sheet.pairs ?? [])
    entries.push({
      id: pair.id,
      text: `${sheet.purpose ? `Scene: ${sheet.purpose}\n` : ""}A: ${quote(pair.beforeText)}\nB: ${quote(pair.replyText)}`,
    });
  for (const path of sheet.paths ?? [])
    entries.push({
      id: path.id,
      text: [
        path.variants ? `Slot: ${path.scene}` : `Scene: ${path.scene}`,
        ...(path.lines.length ? ["Before:"] : []),
        ...path.lines.map(
          (line) => `  ${who(line.role)}: ${quote(line.words)}`,
        ),
        ...(path.first
          ? [
              "The replies offered first:",
              ...path.first.map((l) => `  - ${quote(l.words)}`),
            ]
          : []),
        ...(path.variants
          ? [
              "The variants of this slot (judge these):",
              ...path.variants.map(
                (v) =>
                  `  - ${quote(v.words)}${v.needs.length ? ` (needs: ${v.needs.join("; ")})` : ""}${v.not.length ? ` (not: ${v.not.join("; ")})` : ""}`,
              ),
            ]
          : []),
        ...(path.options
          ? [
              "The replies offered now (judge these):",
              ...path.options.map((l) => `  - ${quote(l.words)}`),
            ]
          : []),
      ].join("\n"),
    });
  for (const speech of sheet.speeches ?? [])
    entries.push({
      id: speech.id,
      text: speechText(speech.kind, speech.parts ?? [], speech.stages),
    });
  return entries;
}

/** A whole speech as a reviewer reads it: its parts, or its steps with the choices offered. */
function speechText(
  kind: string,
  parts: readonly string[],
  stages: readonly SpeechStageRow[] | undefined,
): string {
  if (stages?.length)
    return [
      `Speech: ${kind}`,
      ...stages.flatMap((step, i) => [
        `Step ${i + 1} (${step.stage}), the choices offered:`,
        ...step.offered.map((line) => `  - ${quote(line)}`),
        `  Taken: ${quote(step.chosen)}`,
      ]),
    ].join("\n");
  return [
    `Speech: ${kind}`,
    ...parts.map((part, i) => `Part ${i + 1}: ${quote(part)}`),
  ].join("\n");
}

const plantText = (plant: Plant) =>
  plant.speech
    ? speechText(plant.before, plant.said, plant.stages)
    : plant.slot
      ? [
          `Slot: ${plant.before}`,
          "The variants of this slot (judge these):",
          ...plant.said.map((line) => `  - ${quote(line)}`),
        ].join("\n")
      : plant.said.length === 1
        ? `A: ${quote(plant.before)}\nB: ${quote(plant.said[0]!)}`
        : [
            "Before:",
            `  the other person: ${quote(plant.before)}`,
            ...(plant.first
              ? [
                  "The replies offered first:",
                  ...plant.first.map((line) => `  - ${quote(line)}`),
                ]
              : []),
            "The replies offered now (judge these):",
            ...plant.said.map((line) => `  - ${quote(line)}`),
          ].join("\n");

/** The batches for one rule's entries, with plants placed by a hash of the batch, and their key. */
export function plantedBatches(
  rule: LineRule,
  entries: readonly Entry[],
): { files: Map<string, string>; key: Record<string, boolean> } {
  const plants = PLANTS[rule.id];
  if (!plants)
    throw new Error(
      `no plants for ${rule.id}: add two that pass and one that fails to PLANTS in scripts/words/review.ts`,
    );
  const good = plants.filter((plant) => plant.passes);
  const bad = plants.filter((plant) => !plant.passes);
  const count = Math.max(1, Math.round(entries.length / PER_BATCH));
  const size = Math.ceil(entries.length / count);
  const head = [
    `RULE ${rule.id}`,
    `The rule: ${rule.says}`,
    "The game owner's own words behind it (exact, with dates):",
    ...rule.from.map((from) => `- (${from.date}) ${from.words}`),
    "",
    ...(NOT_JUDGED[rule.id] ? [NOT_JUDGED[rule.id]!] : []),
    "Judge each entry by this rule only. Words in braces like {name} are filled in during play and count as said. Write your reasons in American English (canceling, color, theater); they are kept in the game's files.",
    "",
  ].join("\n");
  const files = new Map<string, string>();
  const key: Record<string, boolean> = {};
  for (let k = 0; k < count; k += 1) {
    const batch = entries
      .slice(k * size, (k + 1) * size)
      .map((entry) => ({ ...entry }));
    const seed = parseInt(
      hash53(batch.map((entry) => entry.id).join(",")).slice(0, 8),
      36,
    );
    const picks = [
      good[seed % good.length]!,
      good[(seed + 1) % good.length]!,
      bad[seed % bad.length]!,
    ];
    picks.forEach((plant, i) => {
      const id = hash53(`plant:${seed}:${i}`);
      key[id] = plant.passes;
      batch.splice(Math.floor(seed / 16 ** i) % (batch.length + 1), 0, {
        id,
        text: plantText(plant),
      });
    });
    files.set(
      `${String(k + 1).padStart(2, "0")}.md`,
      `${head}\n${batch.map((entry) => `### ${entry.id}\n${entry.text}\n`).join("\n")}`,
    );
  }
  return { files, key };
}

/** A reviewer's file: one verdict per entry. */
interface ReviewerFile {
  readonly rule: string;
  readonly verdicts: readonly { id: string; passes: boolean; why: string }[];
}

/** The verdicts of every batch that caught its plants, plants dropped; refuses the rest by name. */
export function checkedVerdicts(
  batches: ReadonlyMap<string, { ids: readonly string[]; file?: ReviewerFile }>,
  key: Readonly<Record<string, boolean>>,
): { verdicts: ReviewerFile["verdicts"]; refused: string[] } {
  const verdicts: ReviewerFile["verdicts"][number][] = [];
  const refused: string[] = [];
  for (const [name, { ids, file }] of batches) {
    if (!file) {
      refused.push(`${name}: no reviewer file`);
      continue;
    }
    const byId = new Map(file.verdicts.map((row) => [row.id, row]));
    const missing = ids.filter((id) => !byId.has(id));
    const missed = ids.filter(
      (id) => id in key && byId.get(id)?.passes !== key[id],
    );
    if (missing.length)
      refused.push(`${name}: ${missing.length} entries with no verdict`);
    else if (missed.length)
      refused.push(
        `${name}: missed plant ${missed.join(", ")}; judge the batch again with a new reviewer`,
      );
    else
      verdicts.push(
        ...ids.filter((id) => !(id in key)).map((id) => byId.get(id)!),
      );
  }
  return { verdicts, refused };
}

function main() {
  const argv = process.argv;
  const value = (flag: string) => {
    const at = argv.indexOf(flag);
    return at >= 0 ? argv[at + 1] : undefined;
  };
  const outside = (dir: string) =>
    relative(resolve("."), resolve(dir)).startsWith("..");
  const check = value("--check");
  if (check) {
    const keyFile = `${check.replace(/\/$/, "")}.key.json`;
    const { rule, key } = JSON.parse(readFileSync(keyFile, "utf8")) as {
      rule: string;
      key: Record<string, boolean>;
    };
    const batches = new Map<string, { ids: string[]; file?: ReviewerFile }>();
    for (const name of readdirSync(check)
      .filter((n) => n.endsWith(".md"))
      .sort()) {
      const ids = [
        ...readFileSync(join(check, name), "utf8").matchAll(/^### (\S+)$/gm),
      ].map((m) => m[1]!);
      const verdictFile = join(check, name.replace(/\.md$/, ".verdicts.json"));
      batches.set(name, {
        ids,
        ...(existsSync(verdictFile)
          ? {
              file: JSON.parse(
                readFileSync(verdictFile, "utf8"),
              ) as ReviewerFile,
            }
          : {}),
      });
    }
    const { verdicts, refused } = checkedVerdicts(batches, key);
    if (refused.length) {
      for (const line of refused) console.error(line);
      process.exitCode = 1;
      return;
    }
    mkdirSync(join(check, "verdicts"), { recursive: true });
    const out = join(check, "verdicts", `${rule}.json`);
    writeFileSync(out, `${JSON.stringify({ rule, verdicts }, null, 1)}\n`);
    console.log(
      `${verdicts.length} verdicts, ${verdicts.filter((row) => !row.passes).length} no, every plant caught. Fold them: npm run words:verdicts -- --from ${join(check, "verdicts")}`,
    );
    return;
  }
  const sheets = value("--sheets");
  const out = value("--out");
  if (!sheets || !out)
    throw new Error(
      "usage: npm run words:review -- --sheets <dir> --out <dir> [--sample <n>], or -- --check <dir>",
    );
  if (!outside(out))
    throw new Error("--out must be a directory outside the repository");
  const names = readdirSync(sheets)
    .filter((name) => name.endsWith(".json"))
    .sort();
  const ruleIds = new Set<string>();
  const entries: Entry[] = [];
  for (const name of names) {
    const sheet = JSON.parse(
      readFileSync(join(sheets, name), "utf8"),
    ) as Parameters<typeof entriesOf>[0] & { rule: string };
    ruleIds.add(sheet.rule);
    entries.push(...entriesOf(sheet));
  }
  if (ruleIds.size !== 1)
    throw new Error(
      `one rule's sheets per directory; found ${[...ruleIds].join(", ") || "none"}`,
    );
  const ruleId = [...ruleIds][0]!;
  const rule = readRules().find((row) => row.id === ruleId)!;
  const sample = Number(value("--sample") ?? 0);
  const chosen = sample
    ? [...entries]
        .sort((a, b) =>
          hash53(`sample:${a.id}`).localeCompare(hash53(`sample:${b.id}`)),
        )
        .slice(0, sample)
    : entries;
  const { files, key } = plantedBatches(rule, chosen);
  mkdirSync(out, { recursive: true });
  for (const [name, text] of files) writeFileSync(join(out, name), text);
  writeFileSync(
    `${out.replace(/\/$/, "")}.key.json`,
    `${JSON.stringify({ rule: ruleId, key }, null, 1)}\n`,
  );
  console.log(
    `${chosen.length} entries in ${files.size} batches in ${out}. Hand each batch to a fresh reviewer that reads only that file and writes ${basename(out)}/NN.verdicts.json ({ rule, verdicts: [{ id, passes, why }] }); then npm run words:review -- --check ${out}.`,
  );
}

if (import.meta.url === `file://${process.argv[1]}`) main();
