/**
 * What a person says when a scene asks them about their own record: the true
 * thing, or a false one (the owner's lie ruling, Oct 5: lies are recorded and
 * found out by anyone with contradicting facts; OWNER-DECISIONS line 108: a
 * wrong is chosen from traits, need and risk as known from records, through
 * the shared chooser, never rolled). This is the teller's side; the hearer's
 * side is `heard-claims.ts`, and the player's own lie is the conversation
 * engine's scales.
 *
 * Decided only at the moment a scene puts the claim in their mouth, and only
 * where the player is told, so the unattended world is unchanged. Two offers
 * go to the core's one chooser, each weighed as the closeness it would cost
 * the speaker's tie with the one asking, from the hours the scene's own
 * endings already strain a tie by (the caller passes them; no weight here):
 * - the true answer, refusing them to their face tonight;
 * - the false answer, a word the roll call will show was not kept, times how
 *   public that is (1: a public record will settle it).
 * Temperament is the chooser's trait term over truthfulness and the sincere
 * and manipulative facets (`claims.tell`), at the general trait weight; the
 * truth-default lives in that scale. Truth that costs nothing is told
 * without weighing.
 *
 * A lie (said yes meaning no) is kept apart from a word changed later (meant
 * yes, then voted no; OWNER-DECISIONS, "I know I told you yes, but I can't
 * this time"): only a lie has a `lies` row, from the moment it was said. The
 * player cannot tell them apart; the roll call shows only that the vote did
 * not match the word.
 *
 * A claim is offered as a lie only where a record can show it false later
 * (`claimRecord`): a vote, which the roll call shows; a run, which the filing
 * shows. A promise of a secret ballot has no such record and is never a lie.
 * The lie is kept (`lies`) by its event id; when the roll call settles it,
 * the one told learns the truth from that record and the tie strains
 * (`exposeVoteLies`). No screen calls it a lie.
 */
import {
  closenessBetween,
  closenessBetweenAfter,
  tieHoursBetween,
} from "./closeness";
import { decisionFromScores, scoreOffers } from "./choice";
import { decisionKinds } from "./trait-decision-table";
import { ELECTIONS_MODULE_ID, type FilingRow } from "./modules/elections";
import { decisionOf } from "./modules/candidacy";
import {
  LEGISLATURE_MODULE_ID,
  chambersOf,
  memberKey,
  memberPosition,
  members,
  registerLegislatureHooks,
  type BillRow,
} from "./modules/legislature";
import type {
  ActionDefinition,
  ActOffer,
  CoreAPI,
  CoreModule,
  PersonId,
} from "./types";

export const TOLD_CLAIMS_MODULE_ID = "told-claims";
/** The record of a false claim told to someone, by the same kind as the player's lie. */
export const CLAIM_LIE_EVENT = "conversation.lie";
/** The record that someone told a false claim learned the truth from a record. */
export const CLAIM_FOUND_OUT_EVENT = "claim.found-out";

const c = (api: CoreAPI, key: string): number => api.parameter(key);

/** What a scene asks a person about: how they will vote on a bill, or whether they run in a contest. */
export type Claim =
  | { readonly kind: "vote"; readonly billId: string }
  | { readonly kind: "running"; readonly contestId: string };

/** The fact a person's record holds for a claim, and how a false answer would stand against it. */
export interface ClaimFact {
  /** The knowledge key the claim is told under. */
  readonly key: string;
  /** The answer the record holds. */
  readonly truth: "yes" | "no";
  /** The false answer: the other one. */
  readonly claimed: "yes" | "no";
  /** 1: a public record holds it now, or will settle it (a roll call, a filing). */
  readonly publicity: number;
  /** The records the fact was read from. */
  readonly sourceIds: readonly string[];
}

/**
 * The fact a claim is about, from the speaker's own record, or null where no
 * record holds it or none could ever show a false answer false. One lookup
 * for every scene that offers a claim, the player's own or another's.
 */
export function claimRecord(
  api: CoreAPI,
  personId: PersonId,
  claim: Claim,
): ClaimFact | null {
  const fact = (
    key: string,
    truth: boolean,
    publicity: number,
    sourceIds: readonly string[],
  ): ClaimFact => ({
    key,
    truth: truth ? "yes" : "no",
    claimed: truth ? "no" : "yes",
    publicity,
    sourceIds,
  });
  if (claim.kind === "vote") {
    if (!api.state.modules.has(LEGISLATURE_MODULE_ID)) return null;
    const bill = api
      .moduleState(LEGISLATURE_MODULE_ID)
      .table("bills")
      .get(claim.billId) as unknown as BillRow | undefined;
    if (!bill) return null;
    const key = `vote:${bill.id}`;
    const cast = api
      .moduleState(LEGISLATURE_MODULE_ID)
      .table("votes")
      .get(`vote:${bill.id}:${personId}`) as unknown as
      { id: string; vote: string } | undefined;
    // An abstention or an absence is neither answer: nothing to lie about.
    if (cast)
      return cast.vote === "yes" || cast.vote === "no"
        ? fact(key, cast.vote === "yes", c(api, "one"), [cast.id])
        : null;
    // Before the roll: only a member who will cast a vote has one to state,
    // and the roll call will settle it.
    const seated = chambersOf(api, bill).some((chamber) =>
      members(api, chamber).some((term) => memberKey(term) === personId),
    );
    if (!seated) return null;
    return fact(
      key,
      memberPosition(api, bill.id, personId).total > c(api, "zero"),
      c(api, "one"),
      [bill.id],
    );
  }
  if (!api.state.modules.has(ELECTIONS_MODULE_ID)) return null;
  const key = `running:${claim.contestId}`;
  const filed = (
    api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("filings")
      .query("byPerson", [personId]) as unknown as FilingRow[]
  ).find(
    (row) => row.contestId === claim.contestId && row.status !== "withdrawn",
  );
  if (filed) return fact(key, true, c(api, "one"), [filed.id]);
  // Not filed: what they decided, which the filing list will show.
  const decided = decisionOf(api, claim.contestId, personId);
  if (!decided) return null;
  return fact(key, decided.run, c(api, "one"), [decided.id]);
}

/**
 * How much closeness `hours` of strain would take off the tie between two
 * people today: their tie's own hours and the hours another engine says they
 * shared (sittings, work), read as `closenessBetween` reads them.
 */
function strainCost(
  api: CoreAPI,
  a: PersonId,
  b: PersonId,
  hours: number,
): number {
  return (
    closenessBetween(api.state, a, b) -
    closenessBetweenAfter(api.state, a, b, -hours)
  );
}

/**
 * Hours a word found out not kept takes off a tie: a share of the hours the
 * tie stands on today, so a close tie loses more than a slight one
 * (scene-talk-rules endingStrain trust-lost).
 */
function foundOutHours(
  api: CoreAPI,
  a: PersonId,
  b: PersonId,
  share: number,
): number {
  return share * Math.max(tieHoursBetween(api.state, a, b), 0);
}

/** What a speaker said to a claim, and the record of a false one. */
export interface ToldClaim {
  readonly fact: ClaimFact;
  readonly truthful: boolean;
  /** The answer said. */
  readonly said: "yes" | "no";
  /** The two offers' scores (truth, false), for dev mode; absent when the truth cost nothing. */
  readonly scores?: { readonly truth: number; readonly false: number };
}

const weighing = new WeakMap<
  object,
  { readonly truth: number; readonly false: number }
>();
const action = (id: "claim-truth" | "claim-false"): ActionDefinition => ({
  id,
  actKinds: decisionKinds("claims.tell", id),
  goalKinds: [],
  need: "social",
  effortParameter: "zero",
  effectParameter: "one",
  targetKind: "claim",
  effect: "claim",
  reasonBindings: [
    {
      id: "circumstances",
      provider: "claim-circumstances",
      weightParameter: "one",
      arguments: { option: id },
    },
  ],
});
const OFFERS = [action("claim-truth"), action("claim-false")];

/**
 * Whether a person says the true thing to a claim a scene asks of them, from
 * their record: the chooser weighs what the truth would forfeit against the
 * risk of being found out, with their temperament. Pure: it keeps nothing, so a scene composed
 * twice says the same; `keepToldClaim` keeps a false one once it is said.
 * Null where no record holds the fact.
 */
export function tellsTruth(
  api: CoreAPI,
  speakerId: PersonId,
  hearerId: PersonId,
  claim: Claim,
  stakes: {
    /** The answer the hearer asked for. */
    readonly wanted: "yes" | "no";
    /** Hours a refusal to their face strains the tie by (the scene's strained ending). */
    readonly refusedHours: number;
    /** Share of the tie a word shown not kept takes off (the scene's trust lost). */
    readonly foundOutShare: number;
  },
): ToldClaim | null {
  const fact = claimRecord(api, speakerId, claim);
  if (!fact) return null;
  const truthful = { fact, truthful: true, said: fact.truth } as const;
  // Only a vote the one asking will not get is a refusal; a run's denial
  // waits on the scene that asks it.
  if (
    claim.kind !== "vote" ||
    stakes.wanted === fact.truth ||
    !api.state.people.get(speakerId)?.alive
  )
    return truthful;
  // The truth costs the tie a refusal now; the false yes, a broken word at
  // the roll, as public as the record that settles it.
  const circumstances = {
    truth: -strainCost(api, speakerId, hearerId, stakes.refusedHours),
    false:
      -fact.publicity *
      strainCost(
        api,
        speakerId,
        hearerId,
        foundOutHours(api, speakerId, hearerId, stakes.foundOutShare),
      ),
  };
  const offers: ActOffer[] = OFFERS.map((definition) => ({
    definition,
    targetId: fact.key,
    availableHours: api.parameter("hoursPerDay"),
  }));
  weighing.set(api.state, circumstances);
  const scored = scoreOffers(api.state, speakerId, offers);
  weighing.delete(api.state);
  const decision = decisionFromScores(
    api.state,
    speakerId,
    scored,
    false,
    false,
  );
  const scoreOf = (id: string) =>
    scored.find((row) => row.offer.definition.id === id)?.score ??
    c(api, "zero");
  const scores = {
    truth: scoreOf("claim-truth"),
    false: scoreOf("claim-false"),
  };
  return decision.selected?.definition.id === "claim-false"
    ? { fact, truthful: false, said: fact.claimed, scores }
    : { ...truthful, scores };
}

/** A false claim told to someone, kept until the record that settles it is made. */
export interface LieRow {
  readonly id: string;
  readonly speakerId: PersonId;
  readonly hearerId: PersonId;
  /** The bill or contest the claim is about. */
  readonly subjectId: string;
  readonly kind: Claim["kind"];
  readonly key: string;
  readonly claimed: string;
  readonly truth: string;
  readonly date: string;
  /** The record the claim was said in (a scene reply). */
  readonly saidIn: string;
  /** Share of the tie taken off when the record shows the word was not kept. */
  readonly foundOutShare: number;
}

const lies = (api: CoreAPI) =>
  api.moduleState(TOLD_CLAIMS_MODULE_ID).table("lies");

/**
 * Keeps a false claim once it is said: the lie's record (who told whom, the
 * claim and the truth) and the row the settling record is checked against.
 * Returns the lie's record id, which the hearer's belief cites. Said again
 * (a page reloaded), the same record stands.
 */
export function keepToldClaim(
  api: CoreAPI,
  speakerId: PersonId,
  hearerId: PersonId,
  claim: Claim,
  told: ToldClaim,
  saidIn: string,
  /** Share of the tie taken off when the record shows the word was not kept. */
  foundOutShare: number,
): string | null {
  if (told.truthful || !api.state.modules.has(TOLD_CLAIMS_MODULE_ID))
    return null;
  const id = `${CLAIM_LIE_EVENT}:${speakerId}:${hearerId}:${told.fact.key}`;
  if (lies(api).get(id)) return id;
  const speaker = api.state.people.get(speakerId)!;
  api.emit({
    id,
    date: api.state.date,
    kind: CLAIM_LIE_EVENT,
    personIds: [speakerId, hearerId],
    placeId: speaker.placeId,
    publicRecord: false,
    topic: told.fact.key,
    facts: {
      [`claim:${told.fact.key}`]: told.said,
      truth: told.fact.truth,
      saidIn,
    },
    source: {
      tag: "SOURCED",
      citation:
        "Recorded scene: what the speaker said against their own record.",
      asOf: api.state.date,
    },
  });
  lies(api).put({
    id,
    speakerId,
    hearerId,
    subjectId: claim.kind === "vote" ? claim.billId : claim.contestId,
    kind: claim.kind,
    key: told.fact.key,
    claimed: told.said,
    truth: told.fact.truth,
    date: api.state.date,
    saidIn,
    foundOutShare,
  } satisfies LieRow);
  return id;
}

/** The false claims a person has been told that no record has settled yet. */
export function liesTo(api: CoreAPI, hearerId: PersonId): readonly LieRow[] {
  if (!api.state.modules.has(TOLD_CLAIMS_MODULE_ID)) return [];
  return lies(api).query("byHearer", [hearerId]) as unknown as LieRow[];
}

/**
 * The record that settles a lie is made: the one told learns the truth from
 * it (a public fact), the tie strains by the share of it a word not kept
 * costs (kept on the row from the scene that heard it), and the lie's row is
 * done.
 */
function expose(api: CoreAPI, lie: LieRow, recordId: string, truth: string) {
  const hearer = api.state.people.get(lie.hearerId);
  lies(api).remove(lie.id);
  if (!hearer?.alive) return;
  const id = `${lie.id}:found-out:${recordId}`;
  api.emit({
    id,
    date: api.state.date,
    kind: CLAIM_FOUND_OUT_EVENT,
    personIds: [lie.hearerId, lie.speakerId],
    placeId: hearer.placeId,
    publicRecord: false,
    topic: lie.key,
    facts: {
      key: lie.key,
      claimed: lie.claimed,
      truth,
      lieId: lie.id,
      recordId,
    },
    source: {
      tag: "SOURCED",
      citation: "A public record showed what someone had said to be false.",
      asOf: api.state.date,
    },
  });
  api.observe(lie.hearerId, {
    key: lie.key,
    value: truth,
    learnedAt: api.state.date,
    sourceId: recordId,
    access: "public",
  });
  if (!api.state.people.get(lie.speakerId)?.alive) return;
  api.relationship(
    lie.hearerId,
    lie.speakerId,
    "contact",
    -foundOutHours(api, lie.hearerId, lie.speakerId, lie.foundOutShare),
    undefined,
    { cause: "found-out", sourceId: id },
  );
}

/** After a bill's roll call: each vote someone lied about is on record now. */
export function exposeVoteLies(api: CoreAPI, billId: string): void {
  if (!api.state.modules.has(TOLD_CLAIMS_MODULE_ID)) return;
  for (const lie of lies(api).query("bySubject", [
    billId,
  ]) as unknown as LieRow[]) {
    const cast = api
      .moduleState(LEGISLATURE_MODULE_ID)
      .table("votes")
      .get(`vote:${billId}:${lie.speakerId}`) as unknown as
      { id: string; vote: string } | undefined;
    if (!cast) continue;
    // They voted as they said after all: nothing was false.
    if (cast.vote === lie.claimed) lies(api).remove(lie.id);
    else expose(api, lie, cast.id, cast.vote);
  }
}

registerLegislatureHooks({ afterVote: exposeVoteLies });

/** The told-claims engine: its lies table and the chooser's reason for a claim. */
export const toldClaimsModule: CoreModule = {
  id: TOLD_CLAIMS_MODULE_ID,
  state: {
    schemaVersion: 1,
    tables: {
      lies: {
        indexes: {
          byHearer: { fields: ["hearerId"] },
          bySubject: { fields: ["subjectId"] },
        },
      },
    },
  },
  reasonProviders: {
    "claim-circumstances": (api, actor, _offer, binding) => {
      const held = weighing.get(api.state);
      if (!held) return undefined;
      return {
        value:
          binding.arguments?.option === "claim-false" ? held.false : held.truth,
        sourceIds: [actor.id],
      };
    },
  },
};
