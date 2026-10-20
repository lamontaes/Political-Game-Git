/**
 * Speeches composed one part at a time (owner, Oct 14, 2026). The player builds
 * a speech in steps: an opening, a few body parts, a close. At each step the
 * record offers exactly four parts the candidate could say next, taken from
 * their own platform and votes, their kept promises and a rival's record;
 * each part names the move it makes (the English engine's address moves), the
 * question it is about, the position and the record ids it rests on. A part
 * carries no words: the English engine words it from its move key and facts.
 *
 * Which four are offered is ranked, never rolled. Each candidate part has a
 * salience in [0, 1] (how firmly the position is held, how far a rival's vote
 * sits from the candidate's own, a broken promise at full weight). The best
 * part of each kind comes first, kinds ordered by their best salience, then
 * the next best of each kind, until four are offered. Parts already in the
 * draft, and questions already spoken to, are not offered again.
 *
 * A finished speech is one record. Its statements go through `makeStatements`
 * (so promises and causes are recorded as for any speech, and the speech
 * engine delivers each statement's question to the audience), and the finished
 * composition is kept in the `speech-compositions` table for the press and
 * the director to read.
 */
import {
  campaignParameter,
  PLATFORM_QUESTIONS,
  type Stance,
} from "./campaign-views";
import { candidatePlatform, candidateStance } from "./campaign-stances";
import { registerModule } from "./state";
import type { ModuleRow } from "./module-data";
import type { CoreAPI, CoreModule, CoreState } from "./types";
import {
  campaignFor,
  makeStatements,
  statementSpeechId,
} from "./modules/campaigns";
import {
  ballot,
  ELECTIONS_MODULE_ID,
  type FilingRow,
} from "./modules/elections";
import { promisesOf, votesOf } from "./modules/record";

export const SPEECH_COMPOSITION_MODULE_ID = "core2-speech-composition-v1";

/** The English engine's address moves a part can make. */
export type SpeechMove =
  "open" | "stance" | "record" | "contrast" | "town" | "close";

export type SpeechStep = "opening" | "body" | "closing";

/** One part the candidate could say next. No words: the English engine words it. */
export interface SpeechPartOffer {
  /** Stable id: filing, move, variant, question and subject. */
  readonly id: string;
  readonly step: SpeechStep;
  readonly move: SpeechMove;
  /** The move's variant (what kind of record it rests on, or which opening or close). */
  readonly variant: string;
  /** The key the English engine's `AddressMove` is built from: `move.variant`. */
  readonly moveKey: string;
  /** The policy question it is about, or null for a part about the room or the town. */
  readonly question: string | null;
  /** The candidate's position on that question in [-1, 1], or null. */
  readonly position: number | null;
  /** A rival filing it is about (a contrast), or null. */
  readonly rivalFilingId: string | null;
  /** Record ids it rests on: filing, votes, promises, rival's filing. */
  readonly factIds: readonly string[];
  /** How strongly the record supports it, in [0, 1]. */
  readonly salience: number;
}

/** A speech in the making: a plain value the caller keeps. */
export interface SpeechDraft {
  readonly filingId: string;
  readonly parts: readonly SpeechPartOffer[];
}

export interface ComposedSpeechRow {
  readonly id: string;
  readonly filingId: string;
  readonly candidateId: string;
  readonly venue: string;
  readonly date: string;
  readonly parts: readonly SpeechPartOffer[];
  /** What the speech says, in order, leading question first. */
  readonly statements: readonly Stance[];
  readonly leadingQuestion: string | null;
  readonly speechIds: readonly string[];
  readonly promiseIds: readonly string[];
  readonly audience: number;
}

export const speechCompositionModule: CoreModule = {
  id: SPEECH_COMPOSITION_MODULE_ID,
  state: {
    schemaVersion: 1,
    tables: {
      compositions: { indexes: { byFiling: { fields: ["filingId"] } } },
    },
  },
};

export function openSpeechComposition(core: CoreState): void {
  if (!core.modules.has(SPEECH_COMPOSITION_MODULE_ID))
    registerModule(core, speechCompositionModule);
}

const round3 = (x: number) => Math.round(x * 1000) / 1000;
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

function filingOf(api: CoreAPI, filingId: string): FilingRow {
  const filing = api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("filings")
    .get(filingId) as unknown as FilingRow | undefined;
  if (!filing) throw new Error(`No filing ${filingId}`);
  return filing;
}

/** How many parts a speech has: opening, body, closing. */
export function speechLength(): number {
  return (
    campaignParameter("speechOpeningParts") +
    campaignParameter("speechBodyParts") +
    campaignParameter("speechClosingParts")
  );
}

/** Which step the draft is at, or null when it is complete. */
export function speechStepOf(draft: SpeechDraft): SpeechStep | null {
  const opening = campaignParameter("speechOpeningParts");
  const body = campaignParameter("speechBodyParts");
  const n = draft.parts.length;
  if (n < opening) return "opening";
  if (n < opening + body) return "body";
  if (n < speechLength()) return "closing";
  return null;
}

export function startSpeech(filingId: string): SpeechDraft {
  return { filingId, parts: [] };
}

const OPENINGS = ["greeting", "thanks", "place", "why-running"] as const;
const CLOSINGS = [
  "pledge",
  "ask-for-vote",
  "thank",
  "invite",
  "unity",
] as const;
const TOWN = ["neighbors", "work", "future", "history"] as const;

function part(
  filingId: string,
  step: SpeechStep,
  move: SpeechMove,
  variant: string,
  fields: {
    readonly question?: string | null;
    readonly position?: number | null;
    readonly rivalFilingId?: string | null;
    readonly factIds: readonly string[];
    readonly salience: number;
    readonly subject?: string;
  },
): SpeechPartOffer {
  const question = fields.question ?? null;
  return {
    id: [filingId, move, variant, question ?? "", fields.subject ?? ""].join(
      "|",
    ),
    step,
    move,
    variant,
    moveKey: `${move}.${variant}`,
    question,
    position: fields.position === undefined ? null : fields.position,
    rivalFilingId: fields.rivalFilingId ?? null,
    factIds: fields.factIds,
    salience: round3(clamp01(fields.salience)),
  };
}

/** Best first: higher salience, then id. */
const bySalience = (a: SpeechPartOffer, b: SpeechPartOffer) =>
  b.salience - a.salience || a.id.localeCompare(b.id);

/**
 * Take `count` parts: the best of each kind first (kinds ordered by their
 * best salience, then name), then the next best of each, and so on.
 */
function pick(
  pool: readonly SpeechPartOffer[],
  count: number,
): SpeechPartOffer[] {
  const groups = new Map<string, SpeechPartOffer[]>();
  for (const p of [...pool].sort(bySalience)) {
    const key = `${p.move}.${p.variant.split(":")[0]}`;
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }
  const order = [...groups.entries()].sort(
    (a, b) => bySalience(a[1][0]!, b[1][0]!) || a[0].localeCompare(b[0]),
  );
  const out: SpeechPartOffer[] = [];
  for (let round = 0; out.length < count; round += 1) {
    let any = false;
    for (const [, list] of order) {
      const next = list[round];
      if (!next) continue;
      any = true;
      out.push(next);
      if (out.length >= count) break;
    }
    if (!any) break;
  }
  return out;
}

/** The body parts the record supports, before the draft's used parts and questions are removed. */
function bodyPool(
  api: CoreAPI,
  filing: FilingRow,
  campaignCandidateId: string,
): SpeechPartOffer[] {
  const f = filing.id;
  const pool: SpeechPartOffer[] = [];
  const mine = new Map<string, number>();
  for (const s of candidatePlatform(
    api,
    campaignCandidateId,
    filing.party,
    PLATFORM_QUESTIONS.length,
  )) {
    mine.set(s.question, s.position);
    pool.push(
      part(f, "body", "stance", s.position > 0 ? "enact" : "repeal", {
        question: s.question,
        position: s.position,
        factIds: [f],
        salience: Math.abs(s.position),
      }),
    );
  }
  const ownPosition = (question: string): number | null =>
    mine.get(question) ??
    candidateStance(api, campaignCandidateId, filing.party, question);
  // Their own votes, and promises kept.
  for (const vote of votesOf(api, campaignCandidateId))
    pool.push(
      part(f, "body", "record", "vote", {
        question: vote.stance.question,
        position: round3(vote.stance.position),
        factIds: [f, vote.id],
        salience: Math.abs(vote.stance.position),
        subject: vote.id,
      }),
    );
  for (const status of promisesOf(api, campaignCandidateId))
    if (status.status === "kept")
      pool.push(
        part(f, "body", "record", "kept-promise", {
          question: status.promise.stance.question,
          position: round3(status.promise.stance.position),
          factIds: [
            f,
            status.promise.id,
            ...(status.voteId ? [status.voteId] : []),
          ],
          salience: 1,
          subject: status.promise.id,
        }),
      );
  // A rival's weakest points: promises broken, votes against the candidate's
  // own position, and the widest gaps between their platforms.
  for (const other of ballot(api, filing.contestId)) {
    if (other.id === f) continue;
    const rival = other.personId;
    for (const status of promisesOf(api, rival)) {
      if (status.status !== "broken") continue;
      const position = ownPosition(status.promise.stance.question);
      if (position === null) continue;
      pool.push(
        part(f, "body", "contrast", "broken-promise", {
          question: status.promise.stance.question,
          position: round3(position),
          rivalFilingId: other.id,
          factIds: [
            f,
            other.id,
            status.promise.id,
            ...(status.voteId ? [status.voteId] : []),
          ],
          salience: 1,
          subject: status.promise.id,
        }),
      );
    }
    for (const vote of votesOf(api, rival)) {
      const position = ownPosition(vote.stance.question);
      if (position === null) continue;
      pool.push(
        part(f, "body", "contrast", "vote", {
          question: vote.stance.question,
          position: round3(position),
          rivalFilingId: other.id,
          factIds: [f, other.id, vote.id],
          salience: Math.abs(position - vote.stance.position) / 2,
          subject: vote.id,
        }),
      );
    }
    for (const question of PLATFORM_QUESTIONS) {
      const position = ownPosition(question);
      const theirs = candidateStance(api, rival, other.party, question);
      if (position === null || theirs === null) continue;
      pool.push(
        part(f, "body", "contrast", "platform", {
          question,
          position: round3(position),
          rivalFilingId: other.id,
          factIds: [f, other.id],
          salience: Math.abs(position - theirs) / 2,
          subject: other.id,
        }),
      );
    }
  }
  return pool;
}

/**
 * The four parts the candidate could say next, best supported by the record
 * first. Empty once the draft is complete.
 */
export function speechPartOffers(
  api: CoreAPI,
  draft: SpeechDraft,
): readonly SpeechPartOffer[] {
  const step = speechStepOf(draft);
  if (!step) return [];
  const count = campaignParameter("speechOffersPerStep");
  const filing = filingOf(api, draft.filingId);
  const campaign = campaignFor(api, draft.filingId);
  const f = filing.id;
  const used = new Set(draft.parts.map((p) => p.id));
  const usedQuestions = new Set(
    draft.parts.flatMap((p) => (p.question ? [p.question] : [])),
  );
  const place = api.state.people.get(campaign.candidateId)?.placeId;
  const hasRecord =
    votesOf(api, campaign.candidateId).length > 0 ||
    promisesOf(api, campaign.candidateId).length > 0;
  const fresh = (list: readonly SpeechPartOffer[]) =>
    list.filter((p) => !used.has(p.id));

  if (step === "opening") {
    // A candidate with a record opens on why they are running; a newcomer on the room.
    const order = hasRecord
      ? ["why-running", "thanks", "greeting", "place"]
      : [...OPENINGS];
    return fresh(
      order.map((variant, i) =>
        part(f, "opening", "open", variant, {
          factIds: [f, filing.contestId, ...(place ? [place] : [])],
          salience: 1 - i / order.length,
        }),
      ),
    ).slice(0, count);
  }

  if (step === "closing") {
    const platform = candidatePlatform(
      api,
      campaign.candidateId,
      filing.party,
      PLATFORM_QUESTIONS.length,
    ).filter((s) => !usedQuestions.has(s.question));
    const order = CLOSINGS.filter((v) => v !== "pledge" || platform.length > 0);
    return fresh(
      order.map((variant, i) =>
        variant === "pledge"
          ? part(f, "closing", "close", variant, {
              question: platform[0]!.question,
              position: platform[0]!.position,
              factIds: [f],
              salience: 1,
            })
          : part(f, "closing", "close", variant, {
              factIds: [f, filing.contestId],
              salience: 1 - (i + 1) / (order.length + 1),
            }),
      ),
    ).slice(0, count);
  }

  const pool = fresh(bodyPool(api, filing, campaign.candidateId)).filter(
    (p) => p.question === null || !usedQuestions.has(p.question),
  );
  const chosen = pick(pool, count);
  // A candidate with few stands still gets four: parts about the town.
  for (const variant of TOWN) {
    if (chosen.length >= count) break;
    const extra = part(f, "body", "town", variant, {
      factIds: [f, ...(place ? [place] : [])],
      salience: 0,
    });
    if (!used.has(extra.id)) chosen.push(extra);
  }
  return chosen;
}

/** Add the chosen offer (by its index among the current offers) to the draft. */
export function choosePart(
  api: CoreAPI,
  draft: SpeechDraft,
  offerIndex: number,
): SpeechDraft {
  const offers = speechPartOffers(api, draft);
  const offer = offers[offerIndex];
  if (!offer)
    throw new Error(
      `No offer ${offerIndex} for speech ${draft.filingId} (${offers.length} offered)`,
    );
  return { ...draft, parts: [...draft.parts, offer] };
}

export interface ComposedSpeechInput {
  readonly filingId: string;
  readonly venue: string;
  readonly draft: SpeechDraft;
  readonly audienceIds: readonly string[];
}

export interface ComposedSpeechResult {
  /** The finished composition's record id (in `speech-compositions`). */
  readonly id: string;
  /** The speech engine's records, one per statement, leading question first. */
  readonly speechIds: readonly string[];
  /** The promises recorded, one per question. */
  readonly promiseIds: readonly string[];
  readonly leadingQuestion: string | null;
  readonly causeIds: readonly string[];
}

/**
 * Give the finished speech: its statements are made to the audience as for
 * any speech (promises, causes, the speech engine's reception of each
 * question), and the composition is kept as one record.
 */
export function deliverComposedSpeech(
  api: CoreAPI,
  input: ComposedSpeechInput,
): ComposedSpeechResult {
  if (speechStepOf(input.draft) !== null)
    throw new Error(`Speech ${input.filingId} is not finished.`);
  if (input.draft.filingId !== input.filingId)
    throw new Error("The draft belongs to another filing.");
  const campaign = campaignFor(api, input.filingId);
  const statements: Stance[] = [];
  for (const p of input.draft.parts)
    if (
      p.question !== null &&
      p.position !== null &&
      !statements.some((s) => s.question === p.question)
    )
      statements.push({ question: p.question, position: p.position });
  const causes = makeStatements(api, {
    filingId: input.filingId,
    venue: input.venue,
    statements,
    audienceIds: input.audienceIds,
    act: "speech",
    weight: campaignParameter("speechWeight"),
    faceToFace: true,
  });
  const base = statementSpeechId(campaign.candidateId, api.state.date, {
    act: "speech",
    venue: input.venue,
  });
  const speaker = api.state.people.get(campaign.candidateId);
  const speechIds = speaker
    ? statements.map((_, i) => base + (i ? `:${i}` : ""))
    : [];
  const promiseIds = statements.map(
    (s) =>
      `promise:${campaign.candidateId}:${api.state.date}:speech:${input.venue}:${s.question}`,
  );
  if (!api.state.modules.has(SPEECH_COMPOSITION_MODULE_ID))
    openSpeechComposition(api.state as CoreState);
  const id = `composed-speech:${campaign.candidateId}:${api.state.date}:${input.venue}`;
  const row: ComposedSpeechRow = {
    id,
    filingId: input.filingId,
    candidateId: campaign.candidateId,
    venue: input.venue,
    date: api.state.date,
    parts: input.draft.parts,
    statements,
    leadingQuestion: statements[0]?.question ?? null,
    speechIds,
    promiseIds,
    audience: causes.length,
  };
  api
    .moduleState(SPEECH_COMPOSITION_MODULE_ID)
    .table("compositions")
    .put(row as unknown as ModuleRow);
  return {
    id,
    speechIds,
    promiseIds,
    leadingQuestion: row.leadingQuestion,
    causeIds: causes.map((c) => c.id),
  };
}

/** The finished speeches a filing's candidate has composed. */
export function composedSpeechesOf(
  api: CoreAPI,
  filingId: string,
): readonly ComposedSpeechRow[] {
  if (!api.state.modules.has(SPEECH_COMPOSITION_MODULE_ID)) return [];
  return api
    .moduleState(SPEECH_COMPOSITION_MODULE_ID)
    .table("compositions")
    .query("byFiling", [filingId]) as unknown as ComposedSpeechRow[];
}
