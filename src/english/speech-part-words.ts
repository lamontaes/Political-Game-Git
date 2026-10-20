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
import type { SpeechDevice } from "./speech-registers";
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
import {
  speechesGivenBy,
  type SpeechDraft,
  type SpeechPartOffer,
} from "../core2/speech-composition";
import { campaignParameter } from "../core2/campaign-views";
import { candidateStance } from "../core2/campaign-stances";
import { corePlaceByJurisdictionId } from "../core2/place-lookup";
import {
  ELECTIONS_MODULE_ID,
  type ContestRow,
  type FilingRow,
} from "../core2/modules/elections";
import { votesOf, type VoteRecordRow } from "../core2/modules/record";
import { billOf, votesOn, type BillRow } from "../core2/modules/legislature";
import { campaignFor } from "../core2/modules/campaigns";
import { OFFICES_MODULE_ID, type TermRow } from "../core2/modules/offices";
import type { EntityId } from "../core2/kernel/brands";
import { ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import { P } from "../core2/parameters";
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
  device?: SpeechDevice;
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
  /** The authored role whose lines make a crafted device, offered by the speaker's craft. */
  readonly devices?: string;
}

/** `{pronoun_obj}` becomes the renderer's `{{pronoun-obj}}`. */
const engineText = (text: string): string =>
  text.replace(
    /\{(\w+)\}/g,
    (_all, slot: string) => `{{${slot.replace(/_/g, "-")}}}`,
  );

function variantsOf(source: MoveSource, craft: number): LinePartVariant[] {
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
        !part.device &&
        !heldByGrades(part.key)
      )
        variants.push({
          key: part.key,
          kind: "template",
          text: engineText(part.text),
        });
  // Crafted lines are offered by what the speaker has earned: a speaker with
  // no finished speeches has none, and each line's share of the choice grows
  // with their craft until it equals a plain line's. Weights are whole
  // numbers, so plain lines weigh DEVICE_SCALE each.
  const devices: LinePartVariant[] = [];
  if (source.devices && craft > 0)
    for (const part of AUTHORED)
      if (
        part.shippable &&
        part.move === source.devices &&
        part.device &&
        !heldByGrades(part.key)
      ) {
        const weight = Math.round(craft * DEVICE_SCALE);
        if (weight >= 1)
          devices.push({
            key: part.key,
            kind: "template",
            text: engineText(part.text),
            device: part.device,
            weight,
          });
      }
  if (!devices.length) return variants;
  return [
    ...variants.map((variant) => ({ ...variant, weight: DEVICE_SCALE })),
    ...devices,
  ];
}

/** The weight of one plain line; a crafted line weighs this times the speaker's craft. */
const DEVICE_SCALE = 100;

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
        // A challenger's lines ("We can do better.") are admitted where the
        // records make the speaker one; the bank asks for the fact itself.
        mined: { role: "issue", only: /\{goal\}|better/ },
        devices: "stance-enact-device",
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
        devices: "pledge-device",
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
      // A parent says so where the records show a child at home.
      return {
        act: "tell",
        mined: { role: "self", only: /^I'm a (?:mother|father)\./ },
        authored: "town-neighbors",
      };
    case "town.work":
    case "town.future":
    case "town.history":
      return {
        act: "tell",
        authored: `town-${offer.variant}`,
        ...(offer.variant === "future"
          ? { devices: "town-future-device" }
          : {}),
      };
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
 * What kind of speaker a candidate is, from the records: a challenger when
 * someone else holds the seat the contest fills, a parent when a child lives
 * in their household (a mother or a father by their recorded gender). These
 * unlock the mined lines that ask for them ("We can do better.", "I'm a
 * mother."); each cites the records that make it so.
 */
export function speakerKind(
  api: CoreAPI,
  filing: FilingRow,
  speakerId: string,
): Record<string, GroundedEnglishFact> {
  const facts: Record<string, GroundedEnglishFact> = {};
  const person = api.state.people.get(speakerId as never);
  if (!person) return facts;
  const contest = api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("contests")
    .get(filing.contestId) as unknown as ContestRow | undefined;
  const incumbent = contest?.incumbentTermId
    ? (api
        .moduleState(OFFICES_MODULE_ID)
        .table("terms")
        .get(contest.incumbentTermId) as unknown as TermRow | undefined)
    : undefined;
  if (contest && incumbent?.personId && incumbent.personId !== speakerId)
    facts.challenger = {
      text: "a challenger",
      sourceRecordIds: [contest.id, incumbent.id] as EntityId[],
    };
  const household = api.state.households.get(person.householdId);
  const children = (household?.memberIds ?? []).filter((id) => {
    const member = api.state.people.get(id);
    return (
      member?.alive &&
      id !== speakerId &&
      ageOnDate(makeIsoDate(member.birthDate), makeIsoDate(api.state.date)) <
        P.childUpperAge
    );
  });
  if (children.length) {
    const cited = [person.householdId, ...children] as EntityId[];
    facts["has-children"] = { text: "a parent", sourceRecordIds: cited };
    const gender = person.looks?.gender;
    if (gender === "female")
      facts["is-mother"] = { text: "a mother", sourceRecordIds: cited };
    if (gender === "male")
      facts["is-father"] = { text: "a father", sourceRecordIds: cited };
  }
  return facts;
}

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
  speakerId: string | null;
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
  if (filing && speakerId)
    Object.assign(facts, speakerKind(api, filing, speakerId));
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
  return { facts, rivalVote, rivalPosition, tally, speakerId };
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
  const { facts, rivalVote, rivalPosition, tally, speakerId } = factsFor(
    api,
    offer,
  );
  const source = sourceOf(offer, rivalVote, rivalPosition, tally);
  if (!source)
    return {
      kind: "missing",
      offerId: offer.id,
      reasons: [`No words for ${offer.moveKey}.`],
    };
  // Craft is the share of a full speaker's experience: finished speeches
  // composed, over the number that makes a crafted line as likely as a plain one.
  const craft = speakerId
    ? Math.min(
        1,
        speechesGivenBy(api, speakerId) /
          campaignParameter("speechCraftSpeechesForFull"),
      )
    : 0;
  const variants = variantsOf(source, craft);
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
