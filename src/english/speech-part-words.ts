/**
 * Words for the parts of a composed campaign speech (owner, Oct 14, 2026: the
 * player builds a speech one part at a time). `src/core2/speech-composition.ts`
 * offers parts that carry a move, a question, a position and the record ids
 * they rest on, and no words. This gives each part to the English engine's
 * address register (`rally`) for its move, with the slots filled from the
 * part's facts, and puts a finished draft together as one speech.
 *
 * The sentences are the mined campaign moves in `data/english/parts/address.json`
 * (thanks, an issue, an ask, a close, a rival's vote) and, for the moves the
 * mined bank has no sentence for, the authored pieces in
 * `data/english/parts/speech-parts.json`. Nothing is typed here. A part whose
 * facts the world does not hold (no rival, no spoken name for the question) is
 * not worded, and says why.
 *
 * Every part cites the records it rests on: the part's own fact ids.
 */
import addressJson from "../../data/english/parts/address.json" with { type: "json" };
import authoredJson from "../../data/english/parts/speech-parts.json" with { type: "json" };
import { heldByGrades } from "./english-grades";
import {
  composeGroundedLine,
  type ComposedLineBank,
  type LinePartVariant,
  type SpeechAct,
} from "./english-composition";
import type {
  GroundedEnglishFact,
  GroundedEnglishPacket,
} from "./grounded-english";
import { questionAbout, questionTo } from "./question-names";
import type { SpeechDraft, SpeechPartOffer } from "../core2/speech-composition";
import { candidateStance } from "../core2/campaign-stances";
import { corePlaceByJurisdictionId } from "../core2/place-lookup";
import {
  ELECTIONS_MODULE_ID,
  type FilingRow,
} from "../core2/modules/elections";
import { votesOf, type VoteRecordRow } from "../core2/modules/record";
import { billOf, votesOn, type BillRow } from "../core2/modules/legislature";
import { campaignFor } from "../core2/modules/campaigns";
import type { EntityId } from "../core2/kernel/brands";
import type { CoreAPI } from "../core2/types";
import { spoken } from "../director/words";

interface BankPart {
  key: string;
  text: string;
  uses: { subject: string; role: string; requiresFacts?: string[] }[];
  shippable: boolean;
}
interface AuthoredPart {
  key: string;
  move: string;
  text: string;
  shippable: boolean;
}
const MINED = (addressJson as unknown as { parts: BankPart[] }).parts;
const AUTHORED = (authoredJson as unknown as { parts: AuthoredPart[] }).parts;
const VERSION = "words-speech-part-v1";

/** What a part is made of: mined sentences of a move, and/or authored ones of a role. */
interface MoveSource {
  readonly act: SpeechAct;
  readonly mined?: { readonly role: string; readonly only?: RegExp };
  readonly authored?: string;
}

/** `{pronoun_obj}` becomes the renderer's `{{pronoun-obj}}`. */
const engineText = (text: string): string =>
  text.replace(
    /\{(\w+)\}/g,
    (_all, slot: string) => `{{${slot.replace(/_/g, "-")}}}`,
  );

function variantsOf(source: MoveSource): LinePartVariant[] {
  const variants: LinePartVariant[] = [];
  if (source.mined) {
    const { role, only } = source.mined;
    for (const part of MINED) {
      if (!part.shippable || heldByGrades(part.key)) continue;
      const use = part.uses.find(
        (u) => u.subject === "campaign" && u.role === role,
      );
      if (!use || (only && !only.test(part.text))) continue;
      variants.push({
        key: part.key,
        kind: "template",
        text: engineText(part.text),
        ...(use.requiresFacts?.length
          ? { requiresFacts: use.requiresFacts }
          : {}),
      });
    }
  }
  if (source.authored)
    for (const part of AUTHORED)
      if (
        part.shippable &&
        part.move === source.authored &&
        !heldByGrades(part.key)
      )
        variants.push({
          key: part.key,
          kind: "template",
          text: engineText(part.text),
        });
  return variants;
}

/** The mined campaign move (and authored role) each kind of part is worded from. */
function sourceOf(
  offer: SpeechPartOffer,
  rivalVote: "for" | "against" | null,
  rivalPosition: number | null,
  tally: VoteTally | null,
): MoveSource | null {
  const sign = (offer.position ?? 0) >= 0 ? "enact" : "repeal";
  switch (offer.moveKey) {
    case "open.greeting":
      return {
        act: "thank",
        mined: { role: "thanks", only: /^(?:It's|I'm) (?:great|good|glad)/ },
      };
    case "open.thanks":
      return { act: "thank", mined: { role: "thanks", only: /^Thank you/ } };
    case "open.place":
      return { act: "thank", mined: { role: "thanks", only: /\{place\}/ } };
    case "open.why-running":
      return { act: "persuade", authored: "why-running" };
    case "stance.enact":
      return {
        act: "persuade",
        mined: { role: "issue", only: /\{goal\}/ },
      };
    case "stance.repeal":
      return { act: "persuade", authored: "stance-repeal" };
    case "record.vote":
      return {
        act: "tell",
        authored: `${sign === "enact" ? "record-vote-for" : "record-vote-against"}${tally ? "-figures" : ""}`,
      };
    case "record.kept-promise":
      return {
        act: "tell",
        authored: sign === "enact" ? "kept-enact" : "kept-repeal",
      };
    case "contrast.broken-promise":
      return { act: "blame", authored: "broken-promise" };
    case "contrast.vote":
      if (!rivalVote) return null;
      return {
        act: "blame",
        mined: {
          role: "contrast",
          only: rivalVote === "for" ? /voted for/ : /voted against/,
        },
      };
    case "contrast.platform":
      if (rivalPosition === null) return null;
      return rivalPosition >= 0
        ? {
            act: "blame",
            mined: { role: "contrast", only: /^My opponent wants to \{goal\}/ },
          }
        : { act: "blame", authored: "rival-against" };
    case "close.pledge":
      return {
        act: "promise",
        authored: sign === "enact" ? "pledge-enact" : "pledge-repeal",
      };
    case "close.ask-for-vote":
      return { act: "request", mined: { role: "ask", only: /vote/ } };
    case "close.thank":
      return { act: "thank", mined: { role: "close" } };
    case "close.invite":
      return {
        act: "request",
        mined: {
          role: "ask",
          only: /^(?:Tell your friends|Let's get to work|We can do this)/,
        },
      };
    case "close.unity":
      return { act: "promise", authored: "unity" };
    case "town.neighbors":
    case "town.work":
    case "town.future":
    case "town.history":
      return { act: "tell", authored: `town-${offer.variant}` };
    default:
      return null;
  }
}

/** What the speaker said, in words, and the records it rests on. */
export interface WordedSpeechPart {
  readonly offerId: string;
  readonly moveKey: string;
  readonly text: string;
  /** The records the words rest on: the part's own fact ids. */
  readonly sourceRecordIds: readonly string[];
  /** The bank pieces the words came from, for the grader. */
  readonly partKeys: readonly string[];
}

export type SpeechPartWordsResult =
  | { readonly kind: "worded"; readonly part: WordedSpeechPart }
  | {
      readonly kind: "missing";
      readonly offerId: string;
      /** Internal diagnostics; never shown to a player. */
      readonly reasons: readonly string[];
    };

const nameOf = (api: CoreAPI, personId: string): string | null => {
  const person = api.state.people.get(personId as never);
  return person ? `${person.givenName} ${person.familyName}` : null;
};

/**
 * The facts a part's slots are filled from, each citing the records it rests
 * on. The rival's vote and platform are read from the record, so a contrast
 * says what the rival really did.
 */
function factsFor(
  api: CoreAPI,
  offer: SpeechPartOffer,
): {
  facts: Record<string, GroundedEnglishFact>;
  rivalVote: "for" | "against" | null;
  rivalPosition: number | null;
  tally: VoteTally | null;
} {
  const factIds = [...offer.factIds] as EntityId[];
  const facts: Record<string, GroundedEnglishFact> = {};
  const filing = api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("filings")
    .get(offer.id.split("|")[0]!) as unknown as FilingRow | undefined;
  const speakerId = filing ? campaignFor(api, filing.id).candidateId : null;
  const person = speakerId ? api.state.people.get(speakerId as never) : null;
  const place = person
    ? corePlaceByJurisdictionId(person.placeId as never)
    : null;
  if (place) facts.place = { text: spoken(place), sourceRecordIds: factIds };
  if (offer.question) {
    const goal = questionTo(offer.question);
    const issue = questionAbout(offer.question);
    if (goal && (offer.position ?? 0) >= 0)
      facts.goal = { text: goal, sourceRecordIds: factIds };
    if (issue) facts.issue = { text: issue, sourceRecordIds: factIds };
  }
  let rivalVote: "for" | "against" | null = null;
  let rivalPosition: number | null = null;
  if (offer.rivalFilingId) {
    const rivalFiling = api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("filings")
      .get(offer.rivalFilingId) as unknown as FilingRow | undefined;
    const opponent = rivalFiling ? nameOf(api, rivalFiling.personId) : null;
    if (opponent)
      facts.opponent = {
        text: opponent,
        sourceRecordIds: factIds,
      };
    if (rivalFiling && offer.question) {
      if (offer.moveKey === "contrast.vote") {
        const vote = votesOf(api, rivalFiling.personId).find((v) =>
          offer.factIds.includes(v.id),
        );
        if (vote) rivalVote = vote.stance.position >= 0 ? "for" : "against";
      }
      if (offer.moveKey === "contrast.platform") {
        const theirs = candidateStance(
          api,
          rivalFiling.personId,
          rivalFiling.party,
          offer.question,
        );
        rivalPosition = theirs;
        if (theirs !== null && theirs >= 0) {
          const goal = questionTo(offer.question);
          if (goal) facts.goal = { text: goal, sourceRecordIds: factIds };
        }
      }
    }
  }
  // A vote the candidate cast says how the chamber voted, from its vote rows.
  let tally: VoteTally | null = null;
  if (offer.moveKey === "record.vote" && speakerId) {
    const vote = votesOf(api, speakerId).find((v) =>
      offer.factIds.includes(v.id),
    );
    tally = vote ? tallyOf(api, vote) : null;
    if (tally) {
      const cited = [...factIds, tally.billId as EntityId];
      facts.yes = { text: String(tally.yes), sourceRecordIds: cited };
      facts.no = { text: String(tally.no), sourceRecordIds: cited };
    }
  }
  return { facts, rivalVote, rivalPosition, tally };
}

/** How a chamber voted on a bill, counted from its vote rows. */
interface VoteTally {
  readonly billId: string;
  readonly yes: number;
  readonly no: number;
}

/**
 * The chamber's count on the bill a recorded vote was cast on: the bill is the
 * one the record names by number in that body, and the count is its vote rows
 * for the chamber. A vote on something that is not a bill in the records (a
 * measure with no roll call) has no tally.
 */
function tallyOf(api: CoreAPI, vote: VoteRecordRow): VoteTally | null {
  if (!api.state.modules.has("core2-legislature-v1")) return null;
  const bill = (
    api
      .moduleState("core2-legislature-v1")
      .table("bills")
      .rows() as unknown as BillRow[]
  ).find(
    (row) => row.number === vote.measureId && row.bodyOfficeId === vote.body,
  );
  if (!bill) return null;
  const rows = votesOn(api, billOf(api, bill.id).id).filter(
    (row) => (row as unknown as { chamber?: string }).chamber === vote.body,
  );
  const yes = rows.filter((row) => row.vote === "yes").length;
  const no = rows.filter((row) => row.vote === "no").length;
  return yes + no > 0 ? { billId: bill.id, yes, no } : null;
}

/**
 * One offered part in words. The same part, in the same world, always comes
 * out in the same words.
 */
export function wordSpeechPart(
  api: CoreAPI,
  offer: SpeechPartOffer,
): SpeechPartWordsResult {
  const { facts, rivalVote, rivalPosition, tally } = factsFor(api, offer);
  const source = sourceOf(offer, rivalVote, rivalPosition, tally);
  if (!source)
    return {
      kind: "missing",
      offerId: offer.id,
      reasons: [`No words for ${offer.moveKey}.`],
    };
  const variants = variantsOf(source);
  if (variants.length === 0)
    return {
      kind: "missing",
      offerId: offer.id,
      reasons: [`No sentence exists for ${offer.moveKey}.`],
    };
  const bank: ComposedLineBank = {
    key: `speech-part.${offer.moveKey}`,
    version: VERSION,
    surface: "dialogue",
    act: source.act,
    parts: { core: { variants } },
  };
  const factIds = [...offer.factIds] as EntityId[];
  const speaker = "speaker";
  const packet: GroundedEnglishPacket = {
    surface: "dialogue",
    momentKey: offer.id,
    worldSeed: api.state.seed,
    bankVersion: VERSION,
    stage: "adult",
    sourceRecordIds: factIds,
    facts,
    speaker: { personId: speaker as never, traits: {} },
    knowledge: Object.entries(facts).map(([factKey, fact]) => ({
      personId: speaker as never,
      factKey,
      sourceRecordIds: fact.sourceRecordIds,
    })),
  };
  const line = composeGroundedLine(packet, bank, { register: "rally" });
  if (line.kind !== "rendered")
    return { kind: "missing", offerId: offer.id, reasons: line.reasons };
  return {
    kind: "worded",
    part: {
      offerId: offer.id,
      moveKey: offer.moveKey,
      text: line.text,
      sourceRecordIds: [...offer.factIds],
      partKeys: line.parts.map((p) => p.partKey),
    },
  };
}

/** The offered parts of one step in words; a part that cannot be worded is left out with its reason. */
export function wordSpeechOffers(
  api: CoreAPI,
  offers: readonly SpeechPartOffer[],
): readonly SpeechPartWordsResult[] {
  return offers.map((offer) => wordSpeechPart(api, offer));
}

export interface WordedSpeech {
  /** The whole speech: each part's sentence, in the order chosen. */
  readonly text: string;
  readonly parts: readonly WordedSpeechPart[];
  readonly sourceRecordIds: readonly string[];
}

/**
 * A finished (or half-built) draft read as one speech. Null when any part
 * cannot be worded: a speech with a hole in it is not read out.
 */
export function wordSpeech(
  api: CoreAPI,
  draft: SpeechDraft,
): WordedSpeech | null {
  const parts: WordedSpeechPart[] = [];
  for (const offer of draft.parts) {
    const worded = wordSpeechPart(api, offer);
    if (worded.kind !== "worded") return null;
    parts.push(worded.part);
  }
  return {
    text: parts.map((p) => p.text).join(" "),
    parts,
    sourceRecordIds: [...new Set(parts.flatMap((p) => p.sourceRecordIds))],
  };
}
