/**
 * What a person says when a scene asks them about their own record: the true
 * thing, or a false one (the owner's lie ruling, Oct 5: lies are recorded and
 * found out by anyone with contradicting facts; OWNER-DECISIONS line 108: a
 * wrong is chosen from traits, need and risk as known from records, through
 * the shared chooser, never rolled). This is the teller's side; the hearer's
 * side is `heard-claims.ts`, and the player's own lie is the conversation
 * engine's scales.
 *
 * Decided only at the moment a scene puts the claim in their mouth, so a
 * played year is unchanged. Two offers go to the core's one chooser: the
 * truth, pulled by the truth-default and by how public the fact is, and the
 * false claim, pulled by what the truth would cost them by their record. The
 * chooser's trait term reads truthfulness and the sincere and manipulative
 * facets through the act kinds of `claims.tell`. Truth that costs nothing is
 * told without weighing.
 *
 * A claim is offered as a lie only where a record can show it false later
 * (`claimRecord`): a vote, which the roll call shows; a run, which the filing
 * shows. A promise of a secret ballot has no such record and is never a lie.
 * The lie is kept (`lies`) by its event id; when the record that settles it
 * is made, the one told learns the truth from that record and the tie
 * strains (`exposeVoteLies`, `exposeRunLies`). No screen calls it a lie.
 */
import rows from "./data/claims/parameters.json" with { type: "json" };
import { closenessBetween } from "./closeness";
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
import type { Parameter } from "./parameters";
import type {
  ActionDefinition,
  ActOffer,
  CoreAPI,
  CoreModule,
  PersonId,
} from "./types";

export const TOLD_CLAIMS_MODULE_ID = "told-claims";
export const CLAIM_PARAMETERS = rows as Readonly<Record<string, Parameter>>;
/** The record of a false claim told to someone, by the same kind as the player's lie. */
export const CLAIM_LIE_EVENT = "conversation.lie";
/** The record that someone told a false claim learned the truth from a record. */
export const CLAIM_FOUND_OUT_EVENT = "claim.found-out";

function c(api: CoreAPI, key: string): number {
  const row = CLAIM_PARAMETERS[key];
  return row ? row.value : api.parameter(key);
}

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
  /** 0 known only to the speaker, up to 1 on a public record already. */
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
      c(api, "claimSettledLaterShare"),
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
  return fact(key, decided.run, c(api, "claimSettledLaterShare"), [decided.id]);
}

/**
 * What the true answer would cost the speaker with this hearer, between 0
 * and 1, read from the record: a vote against what the hearer asks strains
 * the tie between them (their closeness); a run in a race the hearer is in
 * tells a rival early. Nothing else costs anything.
 */
export function truthCost(
  api: CoreAPI,
  speakerId: PersonId,
  hearerId: PersonId,
  claim: Claim,
  fact: ClaimFact,
  wanted?: "yes" | "no",
): number {
  const zero = c(api, "zero");
  if (claim.kind === "vote")
    return wanted && wanted !== fact.truth
      ? closenessBetween(api.state, speakerId, hearerId)
      : zero;
  if (fact.truth !== "yes") return zero;
  const rival = claimRecord(api, hearerId, claim);
  return rival?.truth === "yes" ? c(api, "one") : zero;
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
 * their record: the chooser weighs the truth-default and how public the fact
 * is (and who present already knows it) against what the truth would cost
 * them, with their temperament. Pure: it keeps nothing, so a scene composed
 * twice says the same; `keepToldClaim` keeps a false one once it is said.
 * Null where no record holds the fact.
 */
export function tellsTruth(
  api: CoreAPI,
  speakerId: PersonId,
  hearerId: PersonId,
  claim: Claim,
  options: {
    /** The answer the hearer asked for, where they asked for one. */
    readonly wanted?: "yes" | "no";
    /** Others in the room. */
    readonly presentIds?: readonly PersonId[];
  } = {},
): ToldClaim | null {
  const fact = claimRecord(api, speakerId, claim);
  if (!fact) return null;
  const truthful = { fact, truthful: true, said: fact.truth } as const;
  const cost = truthCost(api, speakerId, hearerId, claim, fact, options.wanted);
  if (!(cost > c(api, "zero")) || !api.state.people.get(speakerId)?.alive)
    return truthful;
  // Others present who already know the truth, as the speaker would expect.
  let holders = c(api, "zero");
  for (const id of options.presentIds ?? [])
    if (
      id !== speakerId &&
      id !== hearerId &&
      api.state.knowledgeByPerson.get(id)?.get(fact.key)?.value === fact.truth
    )
      holders += c(api, "one");
  const circumstances = {
    truth:
      c(api, "claimTruthPull") +
      c(api, "claimPublicityWeight") * fact.publicity +
      c(api, "claimHolderWeight") * holders,
    false: c(api, "claimCostWeight") * cost,
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
 * it (a public fact), the tie strains by the lie's weight and the tie's
 * closeness, and the lie's row is done.
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
    -c(api, "claimFoundOutStrainHours") *
      (c(api, "one") +
        closenessBetween(api.state, lie.hearerId, lie.speakerId)),
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

/** A filing made (`candidate-filed`): a run someone denied is on the clerk's list now. */
function exposeRunLies(api: CoreAPI, filingId: string): void {
  const filing = api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("filings")
    .get(filingId) as unknown as FilingRow | undefined;
  if (!filing) return;
  for (const lie of lies(api).query("bySubject", [
    filing.contestId,
  ]) as unknown as LieRow[])
    if (lie.speakerId === filing.personId && lie.claimed === "no")
      expose(api, lie, filing.id, "yes");
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
  eventKinds: ["candidate-filed"],
  onEvent: (api, event) => {
    const filingId = event.facts?.filingId;
    if (typeof filingId === "string") exposeRunLies(api, filingId);
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
