/**
 * Turns the mined news banks into the words of a news story on TV and in the
 * paper: the anchor's lines (`data/english/parts/newscast.json`), the reporter
 * in the field, the story's own lines, and the paper's headline
 * (`headlines.json`) and lede (`news.json`). Every line is a sentence said or
 * written in public-domain federal records with the story's record facts in
 * its slots; a line whose facts the story doesn't carry is left out.
 *
 * Stand-in: the engine has no register card for a newscast, so spoken lines
 * compose under press-briefing until PEOPLE adds one (listed for PEOPLE in
 * docs/coordination/words.md).
 *
 * Folded into the engine for the opening's evening news (Oct 14, 2026);
 * OPUS-WORDS still owns the banks it reads, and `scripts/english-corpus/
 * newscast-bank.ts` re-exports it for the corpus tooling and tests.
 */
import newscastJson from "../../data/english/parts/newscast.json" with { type: "json" };
import headlinesJson from "../../data/english/parts/headlines.json" with { type: "json" };
import newsJson from "../../data/english/parts/news.json" with { type: "json" };
import { heldByGrades } from "./english-grades";
import {
  composeGroundedLine,
  type ComposedLineBank,
  type LinePartVariant,
  type SpeechAct,
} from "./english-composition";
import type { EnglishSurface, GroundedEnglishPacket } from "./grounded-english";

interface MinedPart {
  key: string;
  text: string;
  uses: { subject: string; role: string; requiresFacts?: string[] }[];
  shippable: boolean;
}
type Bank = { parts: MinedPart[] };
export const NEWSCAST_BANK = newscastJson as unknown as Bank;
export const HEADLINES_BANK = headlinesJson as unknown as Bank;
export const NEWS_BANK = newsJson as unknown as Bank;

/** The kinds of story the records make, and the mined roles that word each. */
export const STORY_KINDS = {
  election: {
    story: "election",
    headline: ["election"],
    lede: ["election-result"],
  },
  filing: {
    story: "filing",
    headline: ["candidate-filed"],
    lede: ["candidate-filed"],
  },
  "vote-or-law": {
    story: "vote-or-law",
    headline: ["council", "law-took-effect"],
    lede: ["council-vote", "law-took-effect", "budget"],
  },
  closing: {
    story: "economy",
    only: /\{\{subject\}\}|plant|store/,
    headline: ["organization.closed"],
    lede: ["organization.closed"],
  },
  opening: {
    story: "economy",
    only: /\{\{subject\}\} (?:is opening|opened|is hiring|plans|is expanding)/,
    headline: ["organization.opened"],
    lede: ["organization.opened"],
  },
  "jobs-report": {
    story: "economy",
    only: /unemploy|prices|rent|gas/i,
    headline: ["jobs-report"],
    lede: ["jobs-report"],
  },
  grant: { story: "grant", headline: ["grant"], lede: ["budget"] },
  hazard: { story: "hazard", headline: ["disaster"], lede: ["disaster"] },
  death: { story: "death", headline: ["life.death"], lede: ["life.death"] },
  // The stories the press prints during play, each worded by its own
  // headline and lede pieces; one with no newscast story of its own is told
  // in the paper only.
  law: { story: "vote-or-law", headline: ["law"], lede: ["law"] },
  "law-amount": {
    story: "vote-or-law",
    headline: ["law-amount"],
    lede: ["law-amount"],
  },
  "roll-call": {
    story: "vote-or-law",
    headline: ["roll-call"],
    lede: ["roll-call"],
  },
  committee: { headline: ["committee"], lede: ["committee"] },
  override: { headline: ["override"], lede: ["override"] },
  signed: { story: "vote-or-law", headline: ["signed"], lede: ["signed"] },
  hearing: { headline: ["hearing"], lede: ["hearing"] },
  introduced: { headline: ["introduced"], lede: ["introduced"] },
  "budget-line": { headline: ["budget-line"], lede: ["budget-line"] },
  "budget-adopted": {
    story: "vote-or-law",
    headline: ["budget-adopted"],
    lede: ["budget-adopted"],
  },
  conditions: {
    story: "economy",
    headline: ["conditions"],
    lede: ["conditions"],
  },
  rate: { story: "economy", headline: ["rate"], lede: ["rate"] },
  "town-hall": { headline: ["town-hall"], lede: ["town-hall"] },
  "body-meeting": { headline: ["body-meeting"], lede: ["body-meeting"] },
  profile: { headline: ["profile"], lede: ["profile"] },
  interview: { headline: ["interview"], lede: ["interview"] },
  debate: { headline: ["debate"], lede: ["debate"] },
  primary: { headline: ["primary"], lede: ["primary"] },
  "took-office": { headline: ["took-office"], lede: ["took-office"] },
  vacancy: { headline: ["vacancy"], lede: ["vacancy"] },
  appointed: { headline: ["appointed"], lede: ["appointed"] },
  chamber: { headline: ["chamber"], lede: ["chamber"] },
  "recall-petition": {
    headline: ["recall-petition"],
    lede: ["recall-petition"],
  },
  recall: { headline: ["recall"], lede: ["recall"] },
  "party-chair": { headline: ["party-chair"], lede: ["party-chair"] },
  charged: { headline: ["charged"], lede: ["charged"] },
  bail: { headline: ["bail"], lede: ["bail"] },
  convicted: { headline: ["convicted"], lede: ["convicted"] },
  imprisoned: { headline: ["imprisoned"], lede: ["imprisoned"] },
  "office-act": { headline: ["office-act"], lede: ["office-act"] },
  "staff-cut": { headline: ["staff-cut"], lede: ["staff-cut"] },
  "owner-changed": { headline: ["owner-changed"], lede: ["owner-changed"] },
  ad: { headline: ["ad"], lede: ["ad"] },
  eviction: { headline: ["eviction"], lede: ["eviction"] },
  "home-sale": { headline: ["home-sale"], lede: ["home-sale"] },
  "homes-built": { headline: ["homes-built"], lede: ["homes-built"] },
  "homeless-count": { headline: ["homeless-count"], lede: ["homeless-count"] },
  birth: { headline: ["birth"], lede: ["birth"] },
  address: { headline: ["address"], lede: ["address"] },
  founded: { headline: ["founded"], lede: ["founded"] },
  amendment: { headline: ["amendment"], lede: ["amendment"] },
  estate: { headline: ["estate"], lede: ["estate"] },
  "law-rule": { headline: ["law-rule"], lede: ["law-rule"] },
  "member-vote": { headline: ["member-vote"], lede: ["member-vote"] },
} as const;
export type StoryKind = keyof typeof STORY_KINDS;

/** `{pronoun_sub}` becomes the renderer's `{{pronoun-sub}}`. */
function engineText(text: string): string {
  return text.replace(
    /\{(\w+)\}/g,
    (_all, slot: string) => `{{${slot.replace(/_/g, "-")}}}`,
  );
}

/** A mined sentence as the engine's template variant. */
type MinedVariant = Extract<LinePartVariant, { kind: "template" }>;

/**
 * A role's sentences. Play says only shipped parts. A grading page
 * (`heldFirst`) says the held ones wherever one fits, so the owner reads each
 * in a real story; a role no held part fits keeps its shipped parts.
 */
function variants(
  bank: Bank,
  match: (use: { subject: string; role: string }) => boolean,
  heldFirst = false,
): MinedVariant[] {
  const fits = (part: Bank["parts"][number]) =>
    !heldByGrades(part.key) && part.uses.some(match);
  const shipped = bank.parts.filter((part) => part.shippable && fits(part));
  const held = heldFirst
    ? bank.parts.filter((part) => !part.shippable && fits(part))
    : [];
  return (held.length ? held : shipped).map((part) => {
    // "Good morning" is said only in the morning, "Good evening" and
    // "tonight" only in the evening, from the broadcast's record.
    const requires = [
      ...(part.uses.find(match)?.requiresFacts ?? []),
      // An outcome is said only when the story's record has that outcome.
      ...(/\b(?:won|wins|elected|reelected|re-elected)\b/i.test(part.text)
        ? ["won"]
        : []),
      ...(/\b(?:lost|loses|conceded)\b/i.test(part.text) ? ["lost"] : []),
      ...(/\b(?:passed|passes|approved|approves|adopts)\b/i.test(part.text)
        ? ["passed"]
        : []),
      ...(/\b(?:failed|rejected|rejects|vetoed)\b/i.test(part.text)
        ? ["failed"]
        : []),
      // "The unemployment rate fell to ..." only when the record says it fell.
      ...(/\bunemployment rate fell\b/i.test(part.text)
        ? ["unemployment-down"]
        : []),
      ...(/\bmorning\b/i.test(part.text) ? ["morning"] : []),
      ...(/\b(?:evening|tonight|night)\b/i.test(part.text) ? ["evening"] : []),
    ];
    return {
      key: part.key,
      kind: "template" as const,
      text: engineText(part.text),
      ...(requires?.length ? { requiresFacts: requires } : {}),
    };
  });
}

function line(
  packet: GroundedEnglishPacket,
  key: string,
  surface: EnglishSurface,
  act: SpeechAct,
  parts: LinePartVariant[],
): { text: string; sourceRecordIds: string[] } | null {
  if (!parts.length) return null;
  const bank: ComposedLineBank = {
    key: `newscast.${key}`,
    version: "words-newscast-v1",
    surface,
    act,
    parts: { core: { variants: parts } },
  };
  // Published copy shows verbatim from its saved record, so a headline or
  // lede is composed once, when the story is recorded, as a template line;
  // the story stores the text and the news surface shows it.
  const result = composeGroundedLine(
    {
      ...packet,
      surface: "dialogue",
      momentKey: `${packet.momentKey}/${key}`,
    },
    { ...bank, surface: "dialogue" },
    surface === "news" ? {} : { register: "press-briefing" },
  );
  return result.kind === "rendered"
    ? { text: result.text, sourceRecordIds: [...result.sourceRecordIds] }
    : null;
}

export interface NewsStory {
  /** The paper's headline, when one is mined for this kind of story. */
  headline?: string;
  /** The paper's first sentence. */
  lede?: string;
  /** The broadcast, line by line, each with who says it. */
  broadcast: { speaker: "anchor" | "reporter"; text: string }[];
  sourceRecordIds: string[];
}

/**
 * One story, in the paper and on the air. The packet carries the story's
 * record facts as slots (`name`, `place`, `office`, `subject`, `count`,
 * `age`, `when`, ...) plus the anchor's and reporter's names as `anchor` and
 * `reporter` and the broadcast's name as `program`.
 */
export function composeNewsStory(
  packet: GroundedEnglishPacket,
  kind: StoryKind,
  options: { heldFirst?: boolean } = {},
): NewsStory {
  const heldFirst = options.heldFirst ?? false;
  const roles = STORY_KINDS[kind];
  const ids = new Set<string>();
  const keep = (
    composed: { text: string; sourceRecordIds: string[] } | null,
  ): string | undefined => {
    if (!composed) return undefined;
    for (const id of composed.sourceRecordIds) ids.add(id);
    return composed.text;
  };
  const headline = keep(
    line(
      packet,
      `${kind}/headline`,
      "news",
      "tell",
      variants(
        HEADLINES_BANK,
        (use) => (roles.headline as readonly string[]).includes(use.role),
        heldFirst,
      ),
    ),
  );
  const lede = keep(
    line(
      packet,
      `${kind}/lede`,
      "news",
      "tell",
      variants(
        NEWS_BANK,
        (use) => (roles.lede as readonly string[]).includes(use.role),
        heldFirst,
      ),
    ),
  );
  // The anchor's and reporter's own names fill `{name}` only in their lines.
  const as = (who: "anchor" | "reporter"): GroundedEnglishPacket => {
    const own = packet.facts[who];
    return own ? { ...packet, facts: { ...packet.facts, name: own } } : packet;
  };
  const role = (subject: string, name: string) =>
    variants(
      NEWSCAST_BANK,
      (use) => use.subject === subject && use.role === name,
      heldFirst,
    );
  const broadcast: NewsStory["broadcast"] = [];
  const say = (
    speaker: "anchor" | "reporter",
    key: string,
    act: SpeechAct,
    parts: LinePartVariant[],
    from: GroundedEnglishPacket,
  ) => {
    const text = keep(line(from, key, "dialogue", act, parts));
    if (text) broadcast.push({ speaker, text });
  };
  // The greeting opens; "Here's what we know." and "We begin with ..." are not greetings.
  const greeting = role("anchor", "open").filter((v) =>
    /^(?:Good|Thank|Thanks|Welcome|I'm)/.test(v.text),
  );
  say(
    "anchor",
    "open/greet",
    "greet",
    greeting.filter((v) => !v.text.includes("{{")),
    packet,
  );
  say(
    "anchor",
    "open/name",
    "greet",
    greeting.filter((v) => /^I'm \{\{name\}\}\.$/.test(v.text)),
    as("anchor"),
  );
  const only = "only" in roles ? roles.only : undefined;
  if ("story" in roles)
    say(
      "anchor",
      `${kind}/story`,
      "tell",
      role("story", roles.story).filter((v) => !only || only.test(v.text)),
      packet,
    );
  if (packet.facts.reporter) {
    const handOff = role("anchor", "hand-off");
    const named = (pattern: RegExp) =>
      handOff.filter((v) => pattern.test(v.text));
    say(
      "anchor",
      "hand-off",
      "request",
      named(/joins|is in|is with|go to \{\{name/),
      as("reporter"),
    );
    say("anchor", "ask", "ask", named(/\?$/), packet);
    const field = role("reporter", "field");
    say(
      "reporter",
      "field/place",
      "tell",
      field.filter((v) => v.text.includes("{{place}}")),
      packet,
    );
    say(
      "reporter",
      "field",
      "tell",
      field.filter((v) => !v.text.includes("{{")),
      packet,
    );
    say(
      "reporter",
      "back",
      "farewell",
      named(/^(?:Back|Over) to you\.$/),
      packet,
    );
    say("anchor", "thanks", "thank", named(/^Thank/), as("reporter"));
  }
  say("anchor", "close", "farewell", role("anchor", "close"), packet);
  return {
    ...(headline ? { headline } : {}),
    ...(lede ? { lede } : {}),
    broadcast,
    sourceRecordIds: [...ids],
  };
}

/**
 * The anchor's lead into a story the broadcast carries live: the greeting,
 * then "We begin with {topic}." with the story's own title in the slot. The
 * opening uses it to say what the player is watching before the address
 * plays (owner, Oct 14, 2026). Empty when the bank has no line for it.
 */
export function composeLeadIn(
  packet: GroundedEnglishPacket,
): { speaker: "anchor"; text: string; sourceRecordIds: string[] }[] {
  const open = variants(
    NEWSCAST_BANK,
    (use) => use.subject === "anchor" && use.role === "open",
  );
  const out: { speaker: "anchor"; text: string; sourceRecordIds: string[] }[] =
    [];
  for (const [key, act, parts] of [
    [
      "lead/greet",
      "greet",
      open.filter(
        (v) => /^(?:Good|Welcome)/.test(v.text) && !v.text.includes("{{"),
      ),
    ],
    [
      "lead/topic",
      "tell",
      open.filter((v) => /^We begin with \{\{topic\}\}\.$/.test(v.text)),
    ],
  ] as const) {
    const said = line(packet, key, "dialogue", act, [...parts]);
    if (said) out.push({ speaker: "anchor", ...said });
  }
  return out;
}
