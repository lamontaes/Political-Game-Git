import { readdirSync, readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import baseline from "./line-inserts-baseline.json";

/**
 * Every line goes through the English engine (owner, Nov 11, 2026: "all the
 * lines in the game need to be run through the English engine... There needs
 * to be a ton of different speech versions, a ton of different inserts for
 * it"). A bank line with no insert is a whole stock sentence picked as it
 * stands: it says the same thing in every town, to every person, about every
 * record. A line carries an insert when its text names a slot in braces
 * (`{name}`, `{place}`), which the engine fills from the world's records.
 *
 * What may stay fixed is the owner's own ruling (Nov 11, 2026, call 12 on the
 * decisions page: "Replies of one to three words and action names stay;
 * everything else is rewritten."), and it is excused here by rule, never by
 * a list of keys:
 *  - a line of one to three words ("Hello.", "You won.", "Got a second?");
 *  - the name of an action the player picks ("Go to work.", "Rest."): every
 *    line of a bank in ACTION_NAME_BANKS;
 *  - a piece the engine joins, when the sentence it makes carries an insert.
 *    A piece says so in its `piece` field: `of` names the sentence it belongs
 *    to, `part` which part of it this is (an opener, a core, a reason), and
 *    `required` whether every such sentence has that part. The pieces of a
 *    sentence are excused when one of its required parts carries an insert
 *    in every wording, since then no joined sentence can lack one;
 *  - a line the world places (owner, Nov 14, 2026, 06:38Z, a card in the
 *    project chat: "Lines keep saying the listener's name ('Thanks, Alice.'
 *    'Not yet, Eva.') only to pass a rule. Should the rule change?" He chose
 *    "Yes, change the rule": "A line counts as tied to the world when the
 *    moment it plays in was chosen by a fact about the world. The padded
 *    names come out."). A part is `placed` when it can play only where a
 *    record chose it: it carries a `bearing`, or every place it is said
 *    (`uses`) carries a non-empty `requiresFacts`, `onlyWhen` or `excludesFacts` naming a
 *    fact the packet does not set in every world (ALWAYS_TRUE_FACTS). A line
 *    with no condition at all is counted as before.
 *
 * What is read: every part of every bank under data/english/parts. Every
 * other line with no insert is counted by bank in
 * ./line-inserts-baseline.json; a count may only go down, and a bank the
 * baseline does not name may hold none. Nobody widens what is excused
 * without a ruling in docs/coordination/OWNER-DECISIONS.md.
 */

const ROOT = path.resolve(__dirname, "../../..");
const BANK_DIR = "data/english/parts";

/** A slot the engine fills, written in braces. */
const INSERT = /\{[^{}\s]+\}/;
/** The most words a fixed line may have (the owner's "one to three words"). */
const SHORT_WORDS = 3;
/** The banks that hold the names of actions the player picks. */
const ACTION_NAME_BANKS: readonly string[] = ["choice-names"];

/**
 * Facts a packet sets in every world, so a condition on them places nothing.
 * None found so far; a fact named here no longer counts toward `placed`.
 */
export const ALWAYS_TRUE_FACTS: ReadonlySet<string> = new Set<string>();

/** Whether a line's text carries at least one insert. */
export function hasInsert(text: string): boolean {
  return INSERT.test(text);
}

/** How many words a line has. */
export function wordsIn(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export interface BankPartUse {
  readonly requiresFacts?: readonly string[];
  readonly excludesFacts?: readonly string[];
  /** A second fact list (#9130): filters like requiresFacts, adds no rank. */
  readonly onlyWhen?: readonly string[];
}

export interface BankPart {
  readonly key?: string;
  readonly text?: string;
  /** The speaker's bearing the part was written for. */
  readonly bearing?: string;
  /** Where the part is said, and the facts each place needs or rules out. */
  readonly uses?: readonly BankPartUse[];
  /** A piece the engine joins into a sentence with others. */
  readonly piece?: {
    readonly of: string;
    readonly part: string;
    readonly required?: boolean;
  };
}

/**
 * The sentences whose joined form always carries an insert: those with a
 * required part every wording of which names a slot.
 */
export function sentencesWithAnInsert(
  parts: readonly BankPart[],
): ReadonlySet<string> {
  const wordings = new Map<string, { required: boolean; all: boolean }>();
  for (const part of parts) {
    if (!part.piece) continue;
    const id = `${part.piece.of}\u0000${part.piece.part}`;
    const row = wordings.get(id) ?? { required: true, all: true };
    row.required &&= part.piece.required === true;
    row.all &&= hasInsert(part.text ?? "");
    wordings.set(id, row);
  }
  const out = new Set<string>();
  for (const [id, row] of wordings)
    if (row.required && row.all) out.add(id.split("\u0000")[0]!);
  return out;
}

/**
 * Whether a record chose the moment this part plays in: it carries a bearing,
 * or every place it is said carries a condition on a fact that is not true in
 * every world. One place with no condition lets it play anywhere.
 */
export function isPlaced(
  part: BankPart,
  alwaysTrue: ReadonlySet<string> = ALWAYS_TRUE_FACTS,
): boolean {
  if (part.bearing) return true;
  const uses = part.uses ?? [];
  return (
    uses.length > 0 &&
    uses.every(
      (use) =>
        (use.requiresFacts ?? []).some((fact) => !alwaysTrue.has(fact)) ||
        (use.onlyWhen ?? []).some((fact) => !alwaysTrue.has(fact)) ||
        (use.excludesFacts ?? []).length > 0,
    )
  );
}

/** Why a line with no insert may stay fixed under the owner's ruling, or null when it may not. */
export function excusedAs(
  bank: string,
  part: BankPart,
  composed: ReadonlySet<string>,
  alwaysTrue: ReadonlySet<string> = ALWAYS_TRUE_FACTS,
): "short" | "action-name" | "joined" | "placed" | null {
  if (ACTION_NAME_BANKS.includes(bank)) return "action-name";
  if (wordsIn(part.text ?? "") <= SHORT_WORDS) return "short";
  if (part.piece && composed.has(part.piece.of)) return "joined";
  if (isPlaced(part, alwaysTrue)) return "placed";
  return null;
}

/** For each bank, the keys of its lines that carry no insert and are not excused. */
export function linesWithNoInsert(dir: string): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const file of readdirSync(dir).sort()) {
    if (!file.endsWith(".json")) continue;
    const name = file.slice(0, -".json".length);
    const parts =
      (
        JSON.parse(readFileSync(path.join(dir, file), "utf8")) as {
          parts?: readonly BankPart[];
        }
      ).parts ?? [];
    const composed = sentencesWithAnInsert(parts);
    out[name] = parts
      .filter(
        (part) =>
          !hasInsert(part.text ?? "") && !excusedAs(name, part, composed),
      )
      .map((part) => part.key ?? part.text ?? "");
  }
  return out;
}

describe("every bank line carries an insert from the world's records", () => {
  const found = linesWithNoInsert(path.join(ROOT, BANK_DIR));
  const known = baseline.banks as Record<string, number>;

  it("adds no line without an insert to any bank", () => {
    const over = Object.entries(found)
      .filter(([bank, keys]) => keys.length > (known[bank] ?? 0))
      .map(
        ([bank, keys]) =>
          `${BANK_DIR}/${bank}.json: ${keys.length} lines with no insert, ${known[bank] ?? 0} known. A new line of four words or more names at least one slot in braces that the engine fills from a record, or is a piece of a sentence that always carries one; the newest without one include ${keys.slice(-3).join(", ")}`,
      );
    expect(over).toEqual([]);
  });

  it("lowers a bank's known count as soon as its lines gain inserts or are deleted", () => {
    const stale = Object.entries(known)
      .filter(([bank, n]) => (found[bank]?.length ?? 0) < n)
      .map(
        ([bank, n]) =>
          `${bank}: lower ${n} to ${found[bank]?.length ?? 0} in tests/guards/english/line-inserts-baseline.json`,
      );
    expect(stale).toEqual([]);
  });

  it("tells a line with an insert from one without", () => {
    expect(hasInsert("I've heard those promises too many times.")).toBe(false);
    expect(
      hasInsert("Did you hear what the President said about {topic}?"),
    ).toBe(true);
    // Braces around nothing, or around words with spaces, are not a slot.
    expect(hasInsert("An empty pair {} is not a slot.")).toBe(false);
    expect(hasInsert("Nor is {two words}.")).toBe(false);
  });

  it("excuses what the owner ruled may stay fixed, and nothing else", () => {
    const none = new Set<string>();
    expect(excusedAs("conversation", { text: "Hello." }, none)).toBe("short");
    expect(excusedAs("scene-talk", { text: "Got a second?" }, none)).toBe(
      "short",
    );
    expect(
      excusedAs("choice-names", { text: "Take it easy today." }, none),
    ).toBe("action-name");
    expect(
      excusedAs(
        "conversation",
        { text: "I've heard those promises too many times." },
        none,
      ),
    ).toBeNull();
    // A sentence joined from an opener and a core: every core names a slot
    // and a core is required, so its fixed opener is excused.
    const joined: BankPart[] = [
      {
        text: "I'll tell you what I think,",
        piece: { of: "address-point", part: "opener" },
      },
      {
        text: "{about} is the part that got me.",
        piece: { of: "address-point", part: "core", required: true },
      },
      {
        text: "what he said about {about} is what I heard.",
        piece: { of: "address-point", part: "core", required: true },
      },
    ];
    const composed = sentencesWithAnInsert(joined);
    expect(excusedAs("conversation", joined[0]!, composed)).toBe("joined");
    // One core wording with no slot, and the opener is no longer excused.
    const broken = [
      ...joined,
      {
        text: "that speech went on a long while.",
        piece: { of: "address-point", part: "core", required: true },
      },
    ];
    expect(
      excusedAs("conversation", broken[0]!, sentencesWithAnInsert(broken)),
    ).toBeNull();
    // A part that is not required cannot carry the sentence.
    const optional: BankPart[] = [
      {
        text: "that's all I have to say about it.",
        piece: { of: "s", part: "closer" },
      },
      { text: "ask {name}.", piece: { of: "s", part: "reason" } },
    ];
    expect(
      excusedAs("conversation", optional[0]!, sentencesWithAnInsert(optional)),
    ).toBeNull();
  });

  it("excuses a line the world places, and not one with no condition or an always-true one", () => {
    const none = new Set<string>();
    const text = "I've heard those promises too many times.";
    // A condition on a fact, or a bearing, places the line.
    expect(
      excusedAs(
        "conversation",
        { text, uses: [{ requiresFacts: ["acquainted"] }] },
        none,
      ),
    ).toBe("placed");
    expect(
      excusedAs(
        "conversation",
        { text, uses: [{ excludesFacts: ["stranger"] }] },
        none,
      ),
    ).toBe("placed");
    expect(excusedAs("conversation", { text, bearing: "guarded" }, none)).toBe(
      "placed",
    );
    expect(
      excusedAs(
        "conversation",
        { text, uses: [{ onlyWhen: ["acquainted"] }] },
        none,
      ),
    ).toBe("placed");
    // No condition at all is counted, as is a part said anywhere in one of its places.
    expect(excusedAs("conversation", { text }, none)).toBeNull();
    expect(excusedAs("conversation", { text, uses: [] }, none)).toBeNull();
    expect(
      excusedAs(
        "conversation",
        {
          text,
          uses: [{ requiresFacts: ["acquainted"] }, {}],
        },
        none,
      ),
    ).toBeNull();
    expect(
      excusedAs(
        "conversation",
        { text, uses: [{ requiresFacts: [] }, { excludesFacts: [] }] },
        none,
      ),
    ).toBeNull();
    // A condition on a fact every packet sets places nothing.
    expect(
      excusedAs(
        "conversation",
        { text, uses: [{ requiresFacts: ["always"] }] },
        none,
        new Set(["always"]),
      ),
    ).toBeNull();
    // A fixed line of one to three words stays "short", before "placed" is asked.
    expect(
      excusedAs("conversation", { text: "Not yet.", bearing: "calm" }, none),
    ).toBe("short");
  });
});
