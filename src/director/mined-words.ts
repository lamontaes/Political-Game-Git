/**
 * The director's words, composed from the English engine's mined banks
 * (`data/english/parts/*.json`): sentences real people said, each with its
 * source, filled from records by the grounded renderer. The director's own
 * data files hold only structure (which moments, rules and subjects exist);
 * every sentence comes from here. A row no mined sentence words yet is left
 * empty, and the director leaves that line unsaid.
 *
 * A part the owner graded down and never up is not said (`heldByGrades`).
 * The mined slots are `{my_employer}`; the director's renderer reads
 * `{{my-employer}}`.
 */
import { P } from "../core2/parameters";
import { heldByGrades } from "../presentation/english-grades";
import conversationBank from "../../data/english/parts/conversation.json" with { type: "json" };
import journalBank from "../../data/english/parts/journal.json" with { type: "json" };
import filingBank from "../../data/english/parts/filing-visit.json" with { type: "json" };
import sceneBank from "../../data/english/parts/scene-words.json" with { type: "json" };
import bringBank from "../../data/english/parts/bring-it-up.json" with { type: "json" };
import type { ConversationData } from "./conversation";
import type { JournalData } from "./journal";
import type { Variant } from "./render";

interface MinedUse {
  subject: string;
  role: string;
  choice: string;
  stages?: string[];
  raises?: string;
  requiresFacts?: string[];
  journal?: { kindPrefix: string; field: string }[];
}
interface MinedPart {
  key: string;
  text: string;
  uses: MinedUse[];
  transcriptsUsing?: number;
  shippable: boolean;
}
interface MinedBank {
  register?: string;
  parts: MinedPart[];
}

const said = (part: MinedPart) => part.shippable && !heldByGrades(part.key);

/** `{my_employer}` becomes the renderer's `{{my-employer}}`. */
function slots(text: string, rename: (slot: string) => string | undefined) {
  return text.replace(
    /\{(\w+)\}/g,
    (_all, slot: string) => rename(slot) ?? `{{${slot.replace(/_/g, "-")}}}`,
  );
}

/** Mined parts for one subject and role (and choice), as renderer variants. */
function variantsOf(
  bank: MinedBank,
  subject: string,
  role: string,
  choice?: string,
  rename: (slot: string) => string | undefined = () => undefined,
): Variant[] {
  return bank.parts
    .filter(
      (part) =>
        said(part) &&
        part.uses.some(
          (use) =>
            use.subject === subject &&
            use.role === role &&
            (choice === undefined || use.choice === choice),
        ),
    )
    .map((part) => ({ key: part.key, text: slots(part.text, rename) }));
}

// ---------------------------------------------------------------------------
// Conversations
// ---------------------------------------------------------------------------

const ROLE_FIELD: Record<
  string,
  "ask" | "raise" | "reply" | "answers" | "lie"
> = {
  ask: "ask",
  raise: "raise",
  reply: "reply",
  answer: "answers",
  lie: "lie",
};
const SLOT = /\{\w+\}/;

interface Move {
  key: string;
  text: string;
  stages?: string[];
  raises?: string;
  requiresFacts?: string[];
}

function move(key: string, part: MinedPart, use: MinedUse): Move {
  return {
    key,
    text: slots(part.text, () => undefined),
    ...(use.stages ? { stages: use.stages } : {}),
    ...(use.raises ? { raises: use.raises } : {}),
    ...(use.requiresFacts
      ? { requiresFacts: use.requiresFacts.map((f) => f.replace(/_/g, "-")) }
      : {}),
  };
}

/**
 * Conversation subjects worded from the mined bank. Asking, raising,
 * replying and lying offer every variant to the renderer; an answer choice is
 * one choice, worded by the sentence most transcripts say.
 */
export function minedConversation(
  skeleton: Omit<ConversationData, "subjects">,
  bank: MinedBank = conversationBank as unknown as MinedBank,
): ConversationData {
  const subjects: Record<string, Record<string, Move[]>> = {};
  const answers = new Map<string, { use: MinedUse; parts: MinedPart[] }>();
  for (const part of bank.parts) {
    if (!said(part)) continue;
    for (const use of part.uses) {
      const field = ROLE_FIELD[use.role];
      if (!field) continue;
      if (field === "answers") {
        const id = `${use.subject}/${use.choice}/${(use.stages ?? []).join(",")}`;
        const entry = answers.get(id) ?? { use, parts: [] };
        entry.parts.push(part);
        answers.set(id, entry);
        continue;
      }
      ((subjects[use.subject] ??= {})[field] ??= []).push(
        move(`${use.choice}.${part.key}`, part, use),
      );
    }
  }
  // Asking or raising names its subject: "Are you still there?" says where
  // only after something named the place, so it never opens a line.
  for (const [subject, roles] of Object.entries(subjects))
    for (const field of ["ask", "raise"] as const)
      if (roles[field] && subject !== "their-tenure")
        roles[field] = roles[field].filter(
          (row) =>
            SLOT.test(row.text) || !/\b(?:there|that|it)\b/i.test(row.text),
        );
  // Each answer choice takes the sentence most transcripts say that no other
  // choice on the same subject already says, so two choices never read the
  // same; the choice with the fewest sentences picks first.
  const chosen = new Map<string, MinedPart>();
  const taken = new Map<string, Set<string>>();
  const order = [...answers].sort(
    ([a, left], [b, right]) =>
      left.parts.length - right.parts.length || a.localeCompare(b),
  );
  for (const [id, { use, parts }] of order) {
    const ranked = [...parts].sort(
      (a, b) =>
        (b.transcriptsUsing ?? P.zero) - (a.transcriptsUsing ?? P.zero) ||
        a.key.localeCompare(b.key),
    );
    let texts = taken.get(use.subject);
    if (!texts) taken.set(use.subject, (texts = new Set()));
    const part =
      ranked.find((row) => !texts.has(row.text.toLowerCase())) ??
      ranked[P.zero]!;
    texts.add(part.text.toLowerCase());
    chosen.set(id, part);
  }
  for (const [id, { use }] of answers) {
    const part = chosen.get(id)!;
    const row = move(use.choice, part, use);
    // A question turned back ("And you?") follows the plain answer, so a
    // question is never answered with a question.
    if (
      use.choice === "turn" &&
      /\?$/.test(part.text) &&
      !SLOT.test(part.text)
    ) {
      const plain = chosen.get(`${use.subject}/plain/`);
      if (plain && !/\?$/.test(plain.text))
        row.text = `${slots(plain.text, () => undefined)} ${row.text}`;
    }
    ((subjects[use.subject] ??= {}).answers ??= []).push(row);
  }
  return {
    ...skeleton,
    version: `words-${bank.register ?? "conversation"}-v1`,
    subjects,
  } as ConversationData;
}

// ---------------------------------------------------------------------------
// The journal
// ---------------------------------------------------------------------------

/**
 * The journal's lines from the mined first-person bank. Each part names the
 * journal row and field it fills; a relative or a person is one slot
 * (`{{other}}`), so `{relation}` and `{other}` both fill it. A wording that
 * names a record is said before one that doesn't.
 */
export function minedJournal(
  skeleton: JournalData,
  bank: MinedBank = journalBank as unknown as MinedBank,
): JournalData {
  const fields = new Map<string, Variant[]>();
  for (const part of bank.parts) {
    if (!said(part)) continue;
    for (const use of part.uses)
      for (const target of use.journal ?? []) {
        const id = `${target.kindPrefix}|${target.field}`;
        const rows = fields.get(id) ?? [];
        if (!rows.some((row) => row.key === part.key))
          rows.push({
            key: part.key,
            text: slots(part.text, (slot) =>
              slot === "relation" ? "{{other}}" : undefined,
            ),
          });
        fields.set(id, rows);
      }
  }
  const mined = (kindPrefix: string, field: string) => {
    const rows = fields.get(`${kindPrefix}|${field}`);
    const named = rows?.filter((row) => row.text.includes("{{"));
    return named?.length ? named : rows;
  };
  return {
    ...skeleton,
    version: "words-journal-v1",
    lines: skeleton.lines.flatMap((row) => {
      const from = row.wordsFrom ?? row.kindPrefix;
      const words = mined(from, "line");
      if (!words) return [];
      // Where the row tells a household's move as "we", the mined sentences
      // said with "we" are its group line and the rest its own line.
      const group = row.groupLine
        ? words.filter((variant) => /^we\b/i.test(variant.text))
        : [];
      const line = row.groupLine
        ? words.filter((variant) => !/^we\b/i.test(variant.text))
        : words;
      if (!line.length) return [];
      return [
        {
          ...row,
          line,
          ...(row.groupLine ? { groupLine: group } : {}),
          // An empty list (not a missing one) leaves another person's or a
          // repeated moment unsaid rather than told in the own line's words.
          ...(row.otherLine
            ? { otherLine: mined(from, "otherLine") ?? [] }
            : {}),
          ...(row.repeatLine
            ? { repeatLine: mined(from, "repeatLine") ?? [] }
            : {}),
        },
      ];
    }),
    backdropLines: (skeleton.backdropLines ?? []).flatMap((row) => {
      const line = mined(`backdrop:${row.kind}`, "line");
      if (!line) return [];
      return [
        {
          ...row,
          line: line.map((variant) => ({
            ...variant,
            ...(row.stages?.length ? { stages: row.stages } : {}),
          })),
        },
      ];
    }),
  };
}

// ---------------------------------------------------------------------------
// The filing clerk
// ---------------------------------------------------------------------------

/** The visit's rule keys, the mined choice for each, and the slot its value fills. */
const FILING_RULES: Record<string, { choice: string; slot?: string }> = {
  "filing-deadline": { choice: "late", slot: "deadline" },
  "already-filed": { choice: "filed" },
  "minimum-age": { choice: "age", slot: "age" },
  residency: { choice: "live", slot: "place" },
  "registered-voter": { choice: "register" },
};

export function minedFilingVisit<
  Words extends {
    version: string;
    greet: Variant[];
    pick: Variant[];
    terms: Variant[];
    rules: Readonly<Record<string, Variant[]>>;
    accept: Variant[];
  },
>(
  skeleton: Words,
  bank: MinedBank = filingBank as unknown as MinedBank,
): Words {
  return {
    ...skeleton,
    version: "words-filing-visit-v1",
    greet: variantsOf(bank, "clerk", "greet"),
    pick: variantsOf(bank, "player", "pick"),
    // The deadline is said in every case.
    terms: variantsOf(bank, "clerk", "terms", "deadline").map((row) => ({
      ...row,
      stages: ["none"],
    })),
    rules: Object.fromEntries(
      Object.keys(skeleton.rules).map((rule) => {
        const row = FILING_RULES[rule];
        return [
          rule,
          row
            ? variantsOf(bank, "clerk", "rule", row.choice, (slot) =>
                slot === row.slot ? "{{required}}" : undefined,
              )
            : [],
        ];
      }),
    ),
    accept: variantsOf(bank, "player", "accept"),
  };
}

// ---------------------------------------------------------------------------
// Scenes and bringing things up
// ---------------------------------------------------------------------------

/** A host's home is `{{host}}'s`; several people present are one `{{who}}`. */
const sceneSlot = (slot: string) =>
  slot === "host" ? "{{host}}'s" : slot === "who_many" ? "{{who}}" : undefined;

export function minedScene<
  Words extends {
    version: string;
    settings: Readonly<Record<string, Variant[]>>;
    present: Variant[];
    causes: readonly { labelPrefix: string; variants: Variant[] }[];
  },
>(skeleton: Words, bank: MinedBank = sceneBank as unknown as MinedBank): Words {
  return {
    ...skeleton,
    version: "words-scene-v1",
    settings: Object.fromEntries(
      Object.keys(skeleton.settings).map((kind) => [
        kind,
        variantsOf(bank, "setting", kind, undefined, sceneSlot),
      ]),
    ),
    present: ["one", "many"].flatMap((stage) =>
      variantsOf(bank, "present", stage, undefined, sceneSlot).map((row) => ({
        ...row,
        stages: [stage],
      })),
    ),
    causes: skeleton.causes.map((row) => ({
      labelPrefix: row.labelPrefix,
      variants: variantsOf(
        bank,
        "cause",
        row.labelPrefix,
        undefined,
        sceneSlot,
      ),
    })),
  };
}

export function minedBringItUp<
  Data extends {
    version: string;
    changes: readonly { eventKind: string; line: Variant[] }[];
    blame: Readonly<Record<string, Variant[]>>;
  },
>(skeleton: Data, bank: MinedBank = bringBank as unknown as MinedBank): Data {
  return {
    ...skeleton,
    version: "words-bring-it-up-v1",
    changes: skeleton.changes.map((row) => ({
      ...row,
      line: variantsOf(bank, "change", row.eventKind, undefined, sceneSlot),
    })),
    blame: Object.fromEntries(
      Object.keys(skeleton.blame).map((how) => [
        how,
        variantsOf(bank, "blame", how, undefined, sceneSlot),
      ]),
    ),
  };
}
