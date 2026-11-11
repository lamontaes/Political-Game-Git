/**
 * Batch 4 capture kit (owner, Nov 9, 2026): scenes as the game plays them, not
 * snippets. Development tooling; nothing here words anything. It turns what the
 * director's own functions return (`purposeScene`, `composeScene`, the speech
 * builder) into a numbered tree: the narrator, each speaker's line with the bank
 * piece that said it, and at each choice every option, followed to a depth.
 */
import { composeScene } from "../../src/director/scene";
import { purposeScene } from "../../src/director/purpose-scene";
import type {
  PurposeScene,
  PurposeSceneResult,
} from "../../src/director/purpose-scene";
import type { SceneTalkLine, TreeNode } from "../../src/director/scene-talk";
import { dateSaid } from "../../src/english/day-words";
import type { CoreState, PersonId } from "../../src/core2/types";
import type { Director } from "../../src/director/ledger";
import type { ScheduleEntry } from "../../src/director/types";

export interface Choice {
  id: string;
  label: string;
  tests: string;
  key: string;
  text: string;
  next: string | null;
  /** The tree was cut here at the depth limit. */
  cut?: true;
}
export interface Node {
  id: string;
  speaker: string;
  key: string;
  /** The text as shown, every placeholder filled. */
  text: string;
  /** The bank piece's text before filling, where it had a placeholder. */
  template?: string;
  /** The line's move, from the arc (what it does in the exchange). */
  move?: string;
  /** The next line when this one hands on without a choice. */
  next?: string;
  choices: Choice[];
  /** Where the tree ends: the outcome the scene reaches. */
  end?: string;
}
export interface BatchScene {
  id: string;
  kind: string;
  /** The director's situation type and variant, with the record that fired it. */
  source: {
    typeKey: string;
    purpose?: string;
    variant?: string;
    causeId: string;
    date: string;
  };
  setup: {
    narration: string[];
    /** The bank pieces that said each narration line, in order. */
    narrationKeys: string[];
    when: string;
    where: string;
    who: string[];
  };
  nodes: Node[];
}

/** What a move tests, in a few words a listener can say aloud. */
const MOVE_WORDS: Readonly<Record<string, string>> = {
  accept: "going along with it",
  thank: "gratitude",
  press: "pressing the point",
  ask: "asking a question",
  answer: "a plain answer",
  leave: "ending the talk",
  confront: "confronting them",
  refuse: "a flat no",
  tell: "telling them something",
  promise: "making a promise",
  agree: "agreeing",
  request: "making a request",
  warn: "a warning",
  deflect: "dodging it",
  plea: "pleading",
  decline: "turning it down politely",
  bargain: "trading for it",
  stall: "buying time",
  offer: "making an offer",
  lie: "a lie",
  comfort: "comforting them",
  threaten: "a threat",
  apologize: "an apology",
  relent: "giving way",
  disagree: "disagreeing",
  boast: "boasting",
  confess: "owning up",
  congratulate: "congratulating them",
  blame: "blaming someone",
  deny: "denying it",
  withdraw: "stepping back",
};

const testsOf = (line: SceneTalkLine): string => {
  const move = MOVE_WORDS[line.move] ?? line.move;
  const parts = [`move: ${move}`];
  if (line.bearing) parts.push(`tone: ${line.bearing}`);
  if (line.tag) parts.push(`drawn from your life: ${line.tag}`);
  if (line.chosen) parts.push("personality: the reply your traits lean toward");
  return parts.join("; ");
};

export type Templates = ReadonlyMap<string, string>;

/** One line as a node (the bank piece key is the piece or pieces that said it). */
const nodeOf = (
  id: string,
  line: SceneTalkLine,
  templates: Templates,
): Node => {
  const template = line.parts.length === 1 ? templates.get(line.parts[0]!) : "";
  return {
    id,
    speaker: line.speaker,
    key: line.parts.join(" + "),
    text: line.text,
    ...(template && template !== line.text ? { template } : {}),
    move: line.move,
    choices: [],
  };
};

/**
 * Flattens a scene's exchange into numbered nodes. A node is one line; the
 * last line before the player's turn carries the choices, and each choice
 * leads to the first line of its branch. Every option is followed to
 * `depthLimit` player turns; beyond it a choice is marked cut.
 */
export function flattenTalk(
  scene: PurposeScene,
  templates: Templates,
  depthLimit: number,
  nodeLimit = 60,
): Node[] {
  const nodes: Node[] = [];
  const talk = scene.talk;
  let counter = 0;
  const nextId = () => `${(counter += 1)}`;
  const add = (line: SceneTalkLine, extra?: Partial<Node>) => {
    const node = nodeOf(nextId(), line, templates);
    Object.assign(node, extra);
    nodes.push(node);
    return node;
  };
  const chain = (lines: SceneTalkLine[]): Node[] => {
    const made = lines.map((line) => add(line));
    made.forEach((node, at) => {
      if (made[at + 1] && !node.choices.length) node.next = made[at + 1]!.id;
    });
    return made;
  };
  /** The branch after a reply: returns the id of its first node, or null when cut. */
  const branch = (
    node: TreeNode,
    depth: number,
    host?: Node,
  ): string | null => {
    const lines = [...node.lines];
    if (!lines.length && !node.replies.length && node.end?.close)
      lines.push(node.end.close);
    const made = chain(lines);
    if (!made.length && host) {
      // The choices follow the line before them: the asker's statement.
      made.push(host);
    } else if (!made.length) {
      const beat = add({
        n: 0,
        step: "narrate",
        role: "narrator",
        speaker: "Narrator",
        text: node.branches?.length
          ? "(what happens next depends on whether they already know the truth)"
          : node.end && !node.replies.length
            ? "(nothing more is said)"
            : "(the other person waits for your answer)",
        move: "narrate",
        register: "scene-talk",
        key: "",
        purpose: scene.purpose,
        round: depth,
        parts: [],
        slotRecordIds: [],
        asks: false,
        invites: false,
      } as unknown as SceneTalkLine);
      made.push(beat);
    }
    const tail = made[made.length - 1]!;
    if (node.replies.length) {
      tail.choices = node.replies.map((reply, at) => {
        const letter = String.fromCharCode(97 + at);
        const choice: Choice = {
          id: `${tail.id}.${letter}`,
          label: reply.line.text,
          tests: testsOf(reply.line),
          key: reply.line.parts.join(" + "),
          text: reply.line.text,
          next: null,
        };
        if (reply.next && depth < depthLimit && nodes.length < nodeLimit)
          choice.next = branch(reply.next, depth + 1);
        else if (reply.next) choice.cut = true;
        return choice;
      });
    } else if (node.branches?.length) {
      // After a lie the world decides: they know the truth or they do not.
      tail.choices = node.branches.map((row, at) => ({
        id: `${tail.id}.${String.fromCharCode(97 + at)}`,
        label: row.label,
        tests: `the world decides: ${row.knows ? "they already know" : "they do not know"}`,
        key: "",
        text: "",
        next: branch(row.node, depth),
      }));
    } else if (node.end) {
      if (node.end.close && lines[lines.length - 1] !== node.end.close) {
        const close = add(node.end.close);
        tail.next = close.id;
        close.end = node.end.ending?.label ?? node.end.outcome;
      } else
        tail.end = node.end.ending?.label
          ? `${node.end.outcome}: ${node.end.ending.label}`
          : node.end.outcome;
    }
    return made[0]!.id;
  };
  // The opening: the asker's open and statement, then the tree's first lines.
  const opening = [...(talk.open ? [talk.open] : []), talk.state];
  const root = chain(opening);
  const rootTail = root[root.length - 1]!;
  const first = branch(talk.tree, 1, rootTail);
  if (first && first !== rootTail.id) rootTail.next = first;
  // Renumber: nodes were created in walk order, which is reading order.
  return nodes;
}

/** The scene's setup as the game shows it: the arrival line, then the purpose's own narration. */
export function setupOf(
  core: CoreState,
  director: Director,
  personId: PersonId,
  entry: ScheduleEntry,
  scene: PurposeScene,
  minuteOfDay: number,
): BatchScene["setup"] {
  const lead = entry.bindings.find((row) => row.typeKey === scene.typeKey);
  const composed = composeScene(
    core,
    director,
    personId,
    lead
      ? {
          ...entry,
          bindings: [lead, ...entry.bindings.filter((row) => row !== lead)],
        }
      : entry,
    undefined,
    minuteOfDay,
  );
  const lines = [
    ...(composed?.arrival &&
    !scene.talk.narration.some((line) =>
      line.text.includes(dateSaid(core.date)),
    )
      ? [{ text: composed.arrival.text, parts: composed.arrival.parts ?? [] }]
      : []),
    ...scene.talk.narration.map((line) => ({
      text: line.text,
      parts: line.parts,
    })),
  ];
  const narration = lines.map((line) => line.text);
  const narrationKeys = lines.map((line) => line.parts.join(" + "));
  const names = (ids: readonly string[]) =>
    ids.flatMap((id) => {
      const row = core.people.get(id as PersonId);
      return row ? [`${row.givenName} ${row.familyName}`] : [];
    });
  return {
    narration,
    narrationKeys,
    when: `${dateSaid(core.date)}, ${core.date.slice(0, 4)}, ${clock(minuteOfDay)}`,
    where: composed
      ? `${composed.setting.kind.replace(/-/g, " ")} (${composed.occasion ?? "ordinary"})`
      : "not staged",
    who: names([
      scene.askerId,
      scene.askedId,
      ...(composed?.presentIds ?? []),
    ]).filter((name, at, all) => all.indexOf(name) === at),
  };
}

const clock = (minute: number) => {
  const hour = Math.floor(minute / 60);
  const twelve = hour % 12 === 0 ? 12 : hour % 12;
  return `${twelve}:${String(minute % 60).padStart(2, "0")} ${hour < 12 ? "a.m." : "p.m."}`;
};

/** Every scene with a purpose a schedule entry stages (a unit for each bill a sitting took in). */
export function unitsOf(entry: ScheduleEntry): string[] {
  return entry.bindings.flatMap((binding) => [
    binding.typeKey,
    ...(binding.joined ?? []).map((row) => `${binding.typeKey}|${row.causeId}`),
  ]);
}

export function composeUnit(
  core: CoreState,
  director: Director,
  personId: PersonId,
  entry: ScheduleEntry,
  unit: string,
): PurposeScene | null {
  const result: PurposeSceneResult | null = purposeScene(
    core,
    director,
    personId,
    entry,
    { typeKey: unit },
  );
  return result?.kind === "composed" ? result.scene : null;
}

/** Placeholders and oddities in a filled line, found by reading it, not by the bank. */
export function oddities(text: string, placeName: string): string[] {
  const found: string[] = [];
  if (/[{}]/.test(text)) found.push("an unfilled placeholder is shown");
  if (/\b(undefined|null|NaN)\b/.test(text)) found.push("a missing value");
  if (/\s{2,}/.test(text)) found.push("a double space (an empty slot)");
  if (/\s[,.;!?]/.test(text)) found.push("a space before punctuation");
  if (/\b(\w+) \1\b/i.test(text)) found.push("a word said twice");
  const generic = /\b(this|the|our) town\b/i.exec(text);
  if (generic && placeName)
    found.push(`"${generic[0]}" where the place has a name (${placeName})`);
  if (/\$0\b|\b0 (people|residents|votes)\b/.test(text))
    found.push("a zero where a count belongs");
  if (/[a-z]+[-.:][a-z-]+:|_[0-9a-f]{8}/.test(text))
    found.push("a record id shows");
  return found;
}

// ---- Scenes with no exchange of their own: the narrator, a speech heard, a talk.
import {
  openConversation,
  say,
  type Conversation,
  type ConversationChoice,
  type ConversationLine,
} from "../../src/director/conversation";

const nameOfPerson = (core: CoreState, id: string) => {
  const row = core.people.get(id as PersonId);
  return row ? `${row.givenName} ${row.familyName}` : "Narrator";
};

/** The scene's narration, any speech heard in its parts, and the talk it hands to. */
export function composeNarrated(
  core: CoreState,
  director: Director,
  personId: PersonId,
  entry: ScheduleEntry,
  minuteOfDay: number,
  depthLimit: number,
  templates: Templates,
): { scene: BatchScene; talked: boolean } | null {
  const composed = composeScene(
    core,
    director,
    personId,
    entry,
    undefined,
    minuteOfDay,
  );
  if (!composed) return null;
  const nodes: Node[] = [];
  const add = (speaker: string, key: string, text: string): Node => {
    const node: Node = {
      id: `${nodes.length + 1}`,
      speaker,
      key,
      text,
      choices: [],
    };
    const template = templates.get(key);
    if (template && template !== text) node.template = template;
    const last = nodes[nodes.length - 1];
    if (last && !last.choices.length && !last.next) last.next = node.id;
    nodes.push(node);
    return node;
  };
  const narration = composed.narration.map((line) => line.text);
  const narrationKeys = composed.narration.map((line) =>
    (line.parts ?? []).join(" + "),
  );
  if (composed.speech) {
    const who = nameOfPerson(core, composed.speech.speakerId);
    for (const part of composed.speech.parts) add(who, "address", part);
  }
  let talked = false;
  if (composed.talkToId) {
    const attach = nodes[nodes.length - 1];
    const walked = walkConversation(
      core,
      director,
      personId,
      composed.talkToId,
      [...composed.presentIds],
      entry.momentId,
      depthLimit,
      nodes.length,
    );
    if (walked.length) {
      if (attach) attach.next = walked[0]!.id;
      nodes.push(...walked);
      talked = true;
    }
  }
  const scene: BatchScene = {
    id: "",
    kind: "",
    source: {
      typeKey: composed.typeKey,
      causeId: entry.momentId,
      date: core.date,
    },
    setup: {
      narration,
      narrationKeys,
      when: `${dateSaid(core.date)}, ${core.date.slice(0, 4)}, ${clock(minuteOfDay)}`,
      where: `${composed.setting.kind.replace(/-/g, " ")} (${composed.occasion ?? "ordinary"})`,
      who: [
        ...new Set(
          [personId, ...composed.presentIds].map((id) =>
            nameOfPerson(core, id),
          ),
        ),
      ],
    },
    nodes,
  };
  return { scene, talked };
}

/** Plays a talk's opening and follows every option to the depth, reopening it for each path. */
function walkConversation(
  core: CoreState,
  director: Director,
  me: PersonId,
  other: PersonId,
  present: PersonId[],
  momentId: string,
  depthLimit: number,
  offset: number,
): Node[] {
  const nodes: Node[] = [];
  const open = (path: string[]): Conversation => {
    let talk = openConversation(core, me, other, {
      presentIds: present,
      director,
      occasionId: momentId,
    });
    for (const key of path) talk = say(core, talk, key);
    return talk;
  };
  const lineNode = (line: ConversationLine): Node => ({
    id: "",
    speaker: nameOfPerson(core, line.speakerId),
    key: (line.wording?.parts ?? []).join(" + ") || line.kind,
    text: line.text,
    choices: [],
  });
  const grow = (path: string[], seen: number, depth: number): string | null => {
    let talk: Conversation;
    try {
      talk = open(path);
    } catch {
      // Saying an option writes a record, so a reopened talk can offer other
      // lines: this branch cannot be replayed and is marked cut.
      return null;
    }
    const fresh = talk.lines.slice(seen).map(lineNode);
    if (!fresh.length && !talk.choices.length) return null;
    const made = fresh.length
      ? fresh
      : [
          {
            id: "",
            speaker: "Narrator",
            key: "",
            text: "(your turn)",
            choices: [],
          } as Node,
        ];
    for (const node of made) {
      node.id = `${offset + nodes.length + 1}`;
      nodes.push(node);
    }
    const tail = made[made.length - 1]!;
    tail.choices = talk.choices.map((choice: ConversationChoice, at) => ({
      id: `${tail.id}.${String.fromCharCode(97 + at)}`,
      label: choice.text,
      tests: `move: ${choice.move}${choice.lie ? "; a lie" : ""}${choice.raises ? `; raises ${choice.raises.split(":")[0]}` : ""}`,
      key: (choice.wording?.parts ?? []).join(" + ") || choice.move,
      text: choice.text,
      next: null,
    }));
    if (depth < depthLimit)
      tail.choices.forEach((choice, at) => {
        const key = talk.choices[at]!.key;
        choice.next = grow([...path, key], talk.lines.length, depth + 1);
        if (!choice.next) choice.cut = true;
      });
    else tail.choices.forEach((choice) => (choice.cut = true));
    // Chain the lines of this step in order.
    made.forEach((node, index) => {
      const following = made[index + 1];
      if (following) node.next = following.id;
    });
    return made[0]!.id;
  };
  grow([], 0, 1);
  return nodes;
}

/** The deepest walk (up to `most` player turns) that keeps a scene to `cap` lines. */
export function flattenAdaptive(
  scene: PurposeScene,
  templates: Templates,
  most: number,
  cap: number,
): { nodes: Node[]; depth: number } {
  for (let depth = most; depth >= 1; depth -= 1) {
    const nodes = flattenTalk(scene, templates, depth, 10_000);
    if (nodes.length <= cap || depth === 1) return { nodes, depth };
  }
  return { nodes: [], depth: 0 };
}
