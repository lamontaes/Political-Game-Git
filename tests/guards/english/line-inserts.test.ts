import { readdirSync, readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import conversationRules from "../../../src/director/data/conversation-rules.json" with { type: "json" };
import situationTypes from "../../../src/director/data/situation-types.json" with { type: "json" };
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
 *    names come out."). The Words lead ruled how
 *    a fact chooses the moment (same day): a `bearing` alone does not, since
 *    nearly every part has one. A place a part is said (`uses`) is placed
 *    when it carries a non-empty `requiresFacts`, `onlyWhen` or
 *    `excludesFacts` (naming a fact the packet does not set in every world,
 *    ALWAYS_TRUE_FACTS), or its scene `purpose` belongs to situation types
 *    that each name a cause record (src/director/data/situation-types.json;
 *    none awaiting a producer), or its conversation `subject` is raised only
 *    from a record (RECORD_RAISED_SUBJECTS, read from conversation-rules.json,
 *    never greetings, goodbyes or filler small talk). A part is `placed` when
 *    every place it is said is. A line with no condition at all is counted as
 *    before.
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
 * Facts that only say a name or a place is there to be spoken. Where a packet
 * builder has the person or place, it sets them (and where it has none, the
 * line cannot be worded at all), so a condition on one of them places nothing:
 * it is the old name-padding moved from the text into `requiresFacts` (Words
 * lead, Nov 14, 2026). Hyphens and underscores are one spelling.
 *  - `name`: the person or thing the line is about, set whenever the subject
 *    has its person: src/director/conversation.ts (the subject builders for
 *    mutual, family, kin and news talk, the address point `facts.name =
 *    calledBy(...)`) and src/director/purpose-scene.ts (the scene's `facts`
 *    object, `name:` of the asker).
 *  - `first`: the listener's given name: conversation.ts (mutual `first:`,
 *    `facts.first = calledBy(...)`) and purpose-scene.ts (`first:` of the
 *    asked).
 *  - `self`: the asked person's given name in a door scene (purpose-scene.ts,
 *    `facts.self`).
 *  - `player-first`, `their-first`: the player's and the other person's given
 *    names in a talk (conversation.ts, `facts["player-first"]`, `"their-first"`).
 *  - `place`, `my-place`: where the person lives, set from their record
 *    (conversation.ts `place:` in the subject builders, `facts.place`;
 *    purpose-scene.ts `facts.place`).
 * `excludesFacts` is not given the same treatment: excluding a fact the
 * packet never sets cannot be computed from the banks, so it still counts.
 */
export const ALWAYS_TRUE_FACTS: ReadonlySet<string> = new Set([
  "name",
  "first",
  "self",
  "player-first",
  "their-first",
  "place",
  "my-place",
]);

/** A fact as a bank spells it, with underscores read as hyphens. */
function factKey(fact: string): string {
  return fact.replace(/_/g, "-");
}

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
  /** The scene purpose the part is said under. */
  readonly purpose?: string;
  /** The conversation subject the part is said about. */
  readonly subject?: string;
}

export interface BankPart {
  readonly key?: string;
  readonly text?: string;
  /** The speaker's bearing; it places nothing. */
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

/** Whether a cause names the record that makes its scene (not a producer still to come). */
function namesARecord(cause: {
  awaitingProducer?: unknown;
  causeRecord?: string;
  match?: { label?: string; labelPrefix?: string };
}): boolean {
  return (
    !cause.awaitingProducer &&
    !!(cause.causeRecord ?? cause.match?.label ?? cause.match?.labelPrefix)
  );
}

/** The scene purposes whose every situation type names a cause record. */
export function causedPurposes(
  types: readonly {
    purpose?: string;
    causes?: readonly Parameters<typeof namesARecord>[0][];
  }[],
): ReadonlySet<string> {
  const caused = new Map<string, boolean>();
  for (const type of types) {
    if (!type.purpose) continue;
    const every = (type.causes ?? []).every(namesARecord);
    caused.set(type.purpose, (caused.get(type.purpose) ?? true) && every);
  }
  return new Set([...caused].filter(([, yes]) => yes).map(([name]) => name));
}

/**
 * The conversation subjects raised only from a record: a moment's own topic
 * (`topicOfLabel`), a subject another's line raises (`otherRaises`, but never
 * the filler `quiet`), and what a person tells (`tells`).
 */
export function recordRaisedSubjects(rules: {
  topicOfLabel?: Record<string, unknown>;
  otherRaises?: Record<string, unknown>;
  tells?: Record<string, Record<string, string>>;
}): ReadonlySet<string> {
  const out = new Set<string>();
  for (const [key, value] of Object.entries(rules.topicOfLabel ?? {}))
    if (key !== "about" && typeof value === "string") out.add(value);
  for (const key of Object.keys(rules.otherRaises ?? {}))
    if (key !== "quiet") out.add(key);
  for (const [key, row] of Object.entries(rules.tells ?? {}))
    if (key !== "about" && typeof row === "object")
      for (const subject of Object.values(row)) out.add(subject);
  return out;
}

/** What decides whether a record chose the moment a part plays in. */
export interface Placement {
  readonly alwaysTrue: ReadonlySet<string>;
  readonly causedPurposes: ReadonlySet<string>;
  readonly raisedSubjects: ReadonlySet<string>;
}

export const PLACEMENT: Placement = {
  alwaysTrue: ALWAYS_TRUE_FACTS,
  causedPurposes: causedPurposes(
    (situationTypes as { types: Parameters<typeof causedPurposes>[0] }).types,
  ),
  raisedSubjects: recordRaisedSubjects(
    conversationRules as Parameters<typeof recordRaisedSubjects>[0],
  ),
};

/**
 * Whether a record chose the moment this part plays in: every place it is
 * said is conditioned on a fact that is not true in every world, or sits
 * under a caused purpose or a record-raised subject. One place with none of
 * these lets it play anywhere. A bearing alone places nothing.
 */
export function isPlaced(
  part: BankPart,
  placement: Partial<Placement> = PLACEMENT,
): boolean {
  const alwaysTrue = placement.alwaysTrue ?? PLACEMENT.alwaysTrue;
  const caused = placement.causedPurposes ?? PLACEMENT.causedPurposes;
  const raised = placement.raisedSubjects ?? PLACEMENT.raisedSubjects;
  const uses = part.uses ?? [];
  return (
    uses.length > 0 &&
    uses.every(
      (use) =>
        (use.requiresFacts ?? []).some(
          (fact) => !alwaysTrue.has(factKey(fact)),
        ) ||
        (use.onlyWhen ?? []).some((fact) => !alwaysTrue.has(factKey(fact))) ||
        (use.excludesFacts ?? []).length > 0 ||
        (use.purpose !== undefined && caused.has(use.purpose.split(".")[0]!)) ||
        (use.subject !== undefined && raised.has(use.subject)),
    )
  );
}

/** Why a line with no insert may stay fixed under the owner's ruling, or null when it may not. */
export function excusedAs(
  bank: string,
  part: BankPart,
  composed: ReadonlySet<string>,
  placement: Partial<Placement> = PLACEMENT,
): "short" | "action-name" | "joined" | "placed" | null {
  if (ACTION_NAME_BANKS.includes(bank)) return "action-name";
  if (wordsIn(part.text ?? "") <= SHORT_WORDS) return "short";
  if (part.piece && composed.has(part.piece.of)) return "joined";
  if (isPlaced(part, placement)) return "placed";
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
    // A condition on a fact places the line.
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
    // A bearing alone places nothing: it is still counted.
    expect(
      excusedAs(
        "conversation",
        { text, bearing: "guarded", uses: [{ subject: "greet" }] },
        none,
      ),
    ).toBeNull();
    // A scene under a caused purpose is placed; one under no cause is not.
    const placement = {
      alwaysTrue: new Set<string>(),
      causedPurposes: new Set(["housemate-arrives"]),
      raisedSubjects: new Set(["job-lost"]),
    };
    expect(
      excusedAs(
        "scene-talk",
        {
          text,
          uses: [{ purpose: "housemate-arrives.ask", subject: "scene" }],
        },
        none,
        placement,
      ),
    ).toBe("placed");
    expect(
      excusedAs(
        "scene-talk",
        { text, uses: [{ purpose: "filing-clerk", subject: "scene" }] },
        none,
        placement,
      ),
    ).toBeNull();
    // A conversation subject raised only from a record is placed; a greeting is not.
    expect(
      excusedAs(
        "conversation",
        { text, uses: [{ subject: "job-lost" }] },
        none,
        placement,
      ),
    ).toBe("placed");
    expect(
      excusedAs(
        "conversation",
        { text, uses: [{ subject: "greet" }] },
        none,
        placement,
      ),
    ).toBeNull();
    // The real tables: a move-in scene is caused, a greeting is not raised by a record.
    expect(PLACEMENT.causedPurposes.has("housemate-arrives")).toBe(true);
    expect(PLACEMENT.raisedSubjects.has("greet")).toBe(false);
    expect(PLACEMENT.raisedSubjects.has("quiet")).toBe(false);
    expect(PLACEMENT.raisedSubjects.has("job-lost")).toBe(true);
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
        { alwaysTrue: new Set(["always"]) },
      ),
    ).toBeNull();
    // A use conditioned only on a name or place being there places nothing.
    for (const fact of [
      "name",
      "first",
      "player-first",
      "their_first",
      "place",
      "my_place",
    ])
      expect(
        excusedAs(
          "conversation",
          { text, uses: [{ requiresFacts: [fact] }] },
          none,
        ),
      ).toBeNull();
    expect(
      excusedAs(
        "conversation",
        { text, uses: [{ requiresFacts: ["name", "stranger"] }] },
        none,
      ),
    ).toBe("placed");
    // A fixed line of one to three words stays "short", before "placed" is asked.
    expect(
      excusedAs("conversation", { text: "Not yet.", bearing: "calm" }, none),
    ).toBe("short");
  });
});

/**
 * A listener's name tacked onto a line (owner, Nov 14, 2026, 06:38Z: "Lines
 * keep saying the listener's name ('Thanks, Alice.' 'Not yet, Eva.') only to
 * pass a rule... The padded names come out."). The check above counts a line
 * as carrying an insert the moment it names any slot, and excuses a line the
 * world places, so a line with a gate on a fact AND a name on its end passed
 * both: eighteen such lines came in on Nov 12 to 14 (Words lead's reader,
 * Nov 14). The name is read here by itself: the listener's given name
 * (`{first}`, `{their-first}`, `{player-first}`) at the head of a sentence or
 * before its closing punctuation, and the player's name as the speaker calls
 * them (`{you}`), which 112 home-talk answers carried on Nov 17 (Story lead;
 * the owner's Nov 14 card holds for every slot that names the listener). The
 * Words lead's rulings let it stay for a
 * thank-you, an apology, a plea (a line with thank, thanks, sorry, apolog or
 * please in it) and for a call across a room (a part of a greeting, an
 * `open-greet` move). A speaker's own name (`{self}`, "I'm {self}") is an
 * introduction, never read as padding. Every other line with the name is
 * counted by bank in ./line-inserts-baseline.json (`vocativeNames`); a count
 * may only go down, and a bank the baseline does not name may hold none.
 */
const VOCATIVE =
  /(^\{(?:first|their-first|player-first|you)\}[,.!?] )|(, \{(?:first|their-first|player-first|you)\}(?=[,.!?]))/;
const NAME_MAY_STAY = /\b(thank|thanks|sorry|apolog\w*|please|dear)\b/i;

/** Whether a spoken line carries the listener's name as padding. */
export function padsTheListenersName(part: BankPart): boolean {
  const text = part.text ?? "";
  if (!VOCATIVE.test(text) || NAME_MAY_STAY.test(text)) return false;
  // A greeting across a room and a first meeting (here-back: the name was just given) may say it.
  return !/\.(?:open-greet|here-back)(?:-\w+)?\./.test(part.key ?? "");
}

/** For each bank, the keys of its lines that carry the listener's name as padding. */
export function linesWithPaddedNames(dir: string): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const file of readdirSync(dir).sort()) {
    if (!file.endsWith(".json")) continue;
    const parts =
      (
        JSON.parse(readFileSync(path.join(dir, file), "utf8")) as {
          parts?: readonly BankPart[];
        }
      ).parts ?? [];
    const keys = parts
      .filter(padsTheListenersName)
      .map((part) => part.key ?? part.text ?? "");
    if (keys.length) out[file.slice(0, -".json".length)] = keys;
  }
  return out;
}

describe("a listener's name is not tacked onto a line", () => {
  const found = linesWithPaddedNames(path.join(ROOT, BANK_DIR));
  const known =
    (baseline as { vocativeNames?: Record<string, number> }).vocativeNames ??
    {};

  it("adds no padded name to any bank", () => {
    const over = Object.entries(found)
      .filter(([bank, keys]) => keys.length > (known[bank] ?? 0))
      .map(
        ([bank, keys]) =>
          `${bank}: ${keys.length} lines carry the listener's name as padding, more than the ${known[bank] ?? 0} known. Leave the name off, or keep it only for a thank-you, an apology, a plea or a call across a room. First lines: ${keys.slice(0, 3).join(", ")}`,
      );
    expect(over).toEqual([]);
  });

  it("lowers a bank's known count as soon as its names come out", () => {
    const stale = Object.entries(known)
      .filter(([bank, count]) => (found[bank]?.length ?? 0) < count)
      .map(
        ([bank, count]) =>
          `${bank}: ${found[bank]?.length ?? 0} lines carry the name now, below the ${count} in line-inserts-baseline.json; lower it.`,
      );
    expect(stale).toEqual([]);
  });

  it("reads the name where a line says it, and nothing else", () => {
    const pads = (text: string, key = "x.y.z") =>
      padsTheListenersName({ text, key });
    expect(pads("I'm for it, {first}.")).toBe(true);
    expect(pads("{first}, you know how these go.")).toBe(true);
    expect(pads("Thanks, {first}. That means a lot.")).toBe(false);
    expect(pads("Please, {first}. I have nothing else.")).toBe(false);
    expect(pads("Hey, {first}.", "scene-talk.open-greet.hey-first")).toBe(
      false,
    );
    expect(pads("{self}. Good to meet you.")).toBe(false);
    expect(pads("I'm {self}, from {place}.")).toBe(false);
    expect(pads("I'm for it.")).toBe(false);
    expect(pads("Just be here, {you}.")).toBe(true);
    expect(
      pads("{you}. Glad to know you.", "conversation.here-back-core.x"),
    ).toBe(false);
  });
});
