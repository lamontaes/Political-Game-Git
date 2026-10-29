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
import { admittedParts, directorSlots, type BankPart } from "./bank-parts";
import {
  composeGroundedLine,
  type ComposedLineBank,
  type LinePartVariant,
  type SpeechAct,
} from "./english-composition";
import type { EnglishSurface, GroundedEnglishPacket } from "./grounded-english";

type Bank = { parts: BankPart[] };
export const NEWSCAST_BANK = newscastJson as unknown as Bank;
export const HEADLINES_BANK = headlinesJson as unknown as Bank;
export const NEWS_BANK = newsJson as unknown as Bank;

/** The kinds of story the records make, and the mined roles that word each. */
export const STORY_KINDS = {
  election: {
    story: "election",
    headline: ["election"],
    lede: ["election-result"],
    context: ["election-opponent"],
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
  law: {
    story: "vote-or-law",
    headline: ["law"],
    lede: ["law"],
    context: ["law-purpose", "law-bill"],
  },
  "law-amount": {
    story: "vote-or-law",
    headline: ["law-amount"],
    lede: ["law-amount"],
    context: ["law-amount-change", "law-amount-bill"],
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
  "budget-request": { headline: ["budget-request"], lede: ["budget-request"] },
  "joint-address": { headline: ["joint-address"], lede: ["joint-address"] },
  trip: { headline: ["trip"], lede: ["trip"] },
  "ribbon-cut": { headline: ["ribbon-cut"], lede: ["ribbon-cut"] },
  emergency: { headline: ["emergency"], lede: ["emergency"] },
  succession: { headline: ["succession"], lede: ["succession"] },
  "recall-reply": { headline: ["recall-reply"], lede: ["recall-reply"] },
  "measure-result": { headline: ["measure-result"], lede: ["measure-result"] },
  presented: { headline: ["presented"], lede: ["presented"] },
  "item-veto": { headline: ["item-veto"], lede: ["item-veto"] },
  appointed: { headline: ["appointed"], lede: ["appointed"] },
  chamber: { headline: ["chamber"], lede: ["chamber"] },
  "recall-petition": {
    headline: ["recall-petition"],
    lede: ["recall-petition"],
  },
  recall: {
    headline: ["recall"],
    lede: ["recall"],
    context: ["recall-count", "recall-answer"],
  },
  "party-chair": { headline: ["party-chair"], lede: ["party-chair"] },
  charged: { headline: ["charged"], lede: ["charged"] },
  bail: { headline: ["bail"], lede: ["bail"] },
  convicted: { headline: ["convicted"], lede: ["convicted"] },
  imprisoned: { headline: ["imprisoned"], lede: ["imprisoned"] },
  "office-act": { headline: ["office-act"], lede: ["office-act"] },
  "staff-cut": { headline: ["staff-cut"], lede: ["staff-cut"] },
  "owner-changed": { headline: ["owner-changed"], lede: ["owner-changed"] },
  ad: { headline: ["ad"], lede: ["ad"] },
  "campaign-gift": { headline: ["campaign-gift"], lede: ["campaign-gift"] },
  eviction: { headline: ["eviction"], lede: ["eviction"] },
  "home-sale": { headline: ["home-sale"], lede: ["home-sale"] },
  "homes-built": { headline: ["homes-built"], lede: ["homes-built"] },
  "homeless-count": { headline: ["homeless-count"], lede: ["homeless-count"] },
  birth: { headline: ["birth"], lede: ["birth"] },
  // The President's address as a short news piece: after the lede, the
  // country's figures the address argued from and one sentence quoted from it.
  address: {
    headline: ["address"],
    lede: ["address"],
    context: ["address-unemployment", "address-wages", "address-quote"],
  },
  founded: { headline: ["founded"], lede: ["founded"] },
  amendment: { headline: ["amendment"], lede: ["amendment"] },
  estate: { headline: ["estate"], lede: ["estate"] },
  "law-rule": { headline: ["law-rule"], lede: ["law-rule"] },
  "member-vote": { headline: ["member-vote"], lede: ["member-vote"] },
  "claim-check": { headline: ["claim-check"], lede: ["claim-check"] },
} as const;
export type StoryKind = keyof typeof STORY_KINDS;

/** A mined sentence as the engine's template variant. */
type MinedVariant = Extract<LinePartVariant, { kind: "template" }>;

/** A role's sentences. */
function variants(
  bank: Bank,
  match: (use: { subject: string; role: string }) => boolean,
): MinedVariant[] {
  const parts = admittedParts(bank.parts, (part) => part.uses.some(match));
  return parts.map((part) => {
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
      text: directorSlots(part.text),
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
  /** The story as the paper prints it, for a kind with context: the lede, then each context sentence. */
  paragraphs?: string[];
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
): NewsStory {
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
      variants(HEADLINES_BANK, (use) =>
        (roles.headline as readonly string[]).includes(use.role),
      ),
    ),
  );
  const lede = keep(
    line(
      packet,
      `${kind}/lede`,
      "news",
      "tell",
      variants(NEWS_BANK, (use) =>
        (roles.lede as readonly string[]).includes(use.role),
      ),
    ),
  );
  // A kind with context says one sentence per context role whose facts the
  // record carries, in order, after the lede.
  const context: string[] = [];
  for (const name of "context" in roles ? roles.context : []) {
    const composed = line(
      packet,
      `${kind}/${name}`,
      "news",
      "tell",
      variants(NEWS_BANK, (use) => use.role === name),
    );
    if (!composed) continue;
    // A sentence that only repeats what the lede or an earlier sentence said
    // (the bill's number, the opponent) is left out. A fact counts where it
    // stands as a whole word, so a short count ("77") is a fact too.
    const said = [lede ?? "", ...context].join(" ");
    const names = (text: string, fact: string) =>
      new RegExp(
        `(?:^|\\W)${fact.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:\\W|$)`,
      ).test(text);
    const named = Object.values(packet.facts)
      .map((fact) => fact?.text ?? "")
      .filter((text) => text && names(composed.text, text));
    if (named.length && named.every((text) => names(said, text))) continue;
    const text = keep(composed);
    if (text) context.push(text);
  }
  // The anchor's and reporter's own names fill `{name}` only in their lines.
  const as = (who: "anchor" | "reporter"): GroundedEnglishPacket => {
    const own = packet.facts[who];
    return own ? { ...packet, facts: { ...packet.facts, name: own } } : packet;
  };
  const role = (subject: string, name: string) =>
    variants(
      NEWSCAST_BANK,
      (use) => use.subject === subject && use.role === name,
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
    ...("context" in roles && lede ? { paragraphs: [lede, ...context] } : {}),
    broadcast,
    sourceRecordIds: [...ids],
  };
}
