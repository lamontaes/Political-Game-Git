import { addDays, makeIsoDate } from "./dates";
import { createStableId } from "./ids";
import {
  buildLegislativeVoteRecord,
  measureEnactment,
  requireMeasure,
  tallyDispositions,
} from "./legislation";
import { fractionOf, assertThresholdRule } from "./legislature-rules";
import type { RuleSourceRef, VoteThresholdRule } from "./legislature-rules";
import { CONSTITUTIONAL_EVIDENCE } from "./constitutional-sources.generated";
import type {
  ConstitutionalMeasureRecord,
  ConstitutionalActionRecord,
  ConstitutionalActionDetail,
  ConstitutionalRuleVersionRecord,
} from "./constitutional-types";
import type {
  EntityId,
  IsoDate,
  LegislativeVoteDisposition,
  LegislativeVoteProvenance,
  World,
} from "./types";
import { recordWorldEvent } from "./world";
import { rulePackById } from "./legislature-rule-packs";
import { activeWorkRelationshipsAt } from "./life-queries";
import { stateJurisdictionForKey } from "./life-places";
import type { ConstitutionalProcessKind } from "./constitutional-types";
import { assertConstitutionalRuleFieldDelta } from "./enacted-rule-changes";
import { assertPolicyProvisionDelta } from "./policy-provisions";
import {
  legislatureForState,
  seatsForChamber,
} from "./legislature-game-profile";

export const ARTICLE_V_STATE_KEYS = Object.freeze(
  "AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY"
    .split(" ")
    .map((s) => `US-${s}`),
);
const source = (
  id: keyof typeof CONSTITUTIONAL_EVIDENCE,
  citation: string,
): RuleSourceRef => ({
  authority: "constitution",
  citation,
  sourceTitle: citation,
  sourceUrl: CONSTITUTIONAL_EVIDENCE[id].url,
  retrievedAt: CONSTITUTIONAL_EVIDENCE[id].observedOn,
  verification: "verified",
  note: "Acquired, hashed primary text; see constitutional-process source corpus.",
});
const FEDERAL_BASE = fractionOf(
  2,
  3,
  "members-present",
  "Two-thirds present, quorum required",
  source(
    "us-proposal-denominator",
    "National Prohibition Cases, 253 U.S. 350, 386 (1920); Article V",
  ),
);
const CALIFORNIA_BASE = fractionOf(
  2,
  3,
  "members-elected",
  "Two-thirds of each house's membership",
  source("ca-constitution-xviii", "Cal. Const. art. XVIII § 1"),
);

/**
 * One state's constitutional amendment route: the bodies that propose, their
 * sizes, the proposal threshold, and how long after the certified statewide
 * result an amendment takes effect.
 *
 * California's is read from its constitution. Every other state's is NOT
 * MODELED: its proposal and ratification procedure is asked in
 * `modern-state-constitutions-fully-mutable`. Blanket rule meanwhile: two
 * thirds of the membership of each chamber of the state's legislature (its
 * compiled or game-profile legislature, with the same seat counts every other
 * system seats) propose, a majority of votes cast at a statewide election
 * ratifies, and the amendment takes effect when the result is certified.
 */
export interface StateAmendmentProfile {
  readonly jurisdictionKey: `US-${string}`;
  readonly bodies: readonly {
    readonly bodyKey: string;
    readonly members: number;
  }[];
  readonly base: VoteThresholdRule;
  readonly effectiveDaysAfterStatement: number;
  readonly basis: "sourced" | "game-profile";
}

const GAME_PROFILE_AMENDMENT_SOURCE: RuleSourceRef = {
  authority: "game-profile",
  citation: "Game default for state constitutional amendment proposals",
  sourceTitle: "Our Civic Duty game profile",
  sourceUrl: null,
  retrievedAt: null,
  verification: "game-profile",
  note: "Not this state's law. Its real amendment procedure is not modeled yet; two-thirds of each chamber's membership is the game's blanket rule until it is.",
};

export function stateAmendmentProfile(
  jurisdictionKey: string,
): StateAmendmentProfile | null {
  if (jurisdictionKey === "US-CA")
    return {
      jurisdictionKey: "US-CA",
      bodies: [
        { bodyKey: "assembly", members: 80 },
        { bodyKey: "senate", members: 40 },
      ],
      base: CALIFORNIA_BASE,
      effectiveDaysAfterStatement: 5,
      basis: "sourced",
    };
  if (!/^US-[A-Z]{2}$/.test(jurisdictionKey)) return null;
  const pack = legislatureForState(jurisdictionKey);
  if (!pack) return null;
  const bodies = pack.chamberOrder.map((bodyKey) => ({
    bodyKey,
    members: seatsForChamber(pack, bodyKey)?.seats ?? 0,
  }));
  if (bodies.length === 0 || bodies.some((body) => body.members < 1))
    return null;
  return {
    jurisdictionKey: jurisdictionKey as `US-${string}`,
    bodies,
    base: fractionOf(
      2,
      3,
      "members-elected",
      "Two-thirds of each chamber's membership (game default)",
      GAME_PROFILE_AMENDMENT_SOURCE,
    ),
    effectiveDaysAfterStatement: 0,
    basis: "game-profile",
  };
}

/** The state key a jurisdiction record stands for, by canonical identity. */
function stateKeyForJurisdiction(
  world: World,
  jurisdictionId: EntityId,
): `US-${string}` | null {
  const j = world.jurisdictions[jurisdictionId];
  if (!j) return null;
  if (["california", "us-ca"].includes(j.slug)) return "US-CA";
  for (const usps of ARTICLE_V_STATE_KEYS) {
    const canonical = stateJurisdictionForKey(usps);
    if (
      canonical &&
      (canonical.id === jurisdictionId || canonical.slug === j.slug)
    )
      return usps as `US-${string}`;
  }
  return null;
}

export function constitutionalHistoryRecords(world: World) {
  return [
    ...(world.history.constitutionalMeasures ?? []),
    ...(world.history.constitutionalActions ?? []),
    ...(world.history.constitutionalRuleVersions ?? []),
  ];
}
export function constitutionalEntityExists(world: World, id: EntityId) {
  return constitutionalHistoryRecords(world).some((r) => r.id === id);
}
export function constitutionalEntityAvailableAt(
  world: World,
  id: EntityId,
  date: string,
  sequence: number,
) {
  const r = constitutionalHistoryRecords(world).find((r) => r.id === id);
  if (!r || r.sequence >= sequence) return false;
  const at =
    "introducedAt" in r
      ? r.introducedAt
      : "occurredAt" in r
        ? r.occurredAt
        : r.effectiveAt;
  return at <= date;
}
export function constitutionalProposalRuleAt(
  world: World,
  key: string,
  date: string,
  sequenceExclusive = world.history.nextSequence,
): VoteThresholdRule {
  const version = (world.history.constitutionalRuleVersions ?? [])
    .filter(
      (r) =>
        r.jurisdictionKey === key &&
        r.operativeAt <= date &&
        r.sequence < sequenceExclusive,
    )
    .sort(
      (a, b) =>
        a.operativeAt.localeCompare(b.operativeAt) || a.sequence - b.sequence,
    )
    .at(-1);
  // A caller must not mutate either a saved rule or the shared source baseline.
  return structuredClone(
    version?.threshold ??
      (key === "US" ? FEDERAL_BASE : stateAmendmentProfile(key)!.base),
  );
}

/** Current-world commitment input, distinct from a historical/future inspection. */
export function constitutionalProposalRuleForWorld(
  world: World,
  input: {
    readonly jurisdictionId: EntityId;
    readonly processKind: ConstitutionalProcessKind;
  },
):
  | {
      readonly available: true;
      readonly worldId: EntityId;
      readonly jurisdictionId: EntityId;
      readonly jurisdictionKey: "US" | `US-${string}`;
      readonly asOfDate: IsoDate;
      readonly historySequenceExclusive: number;
      readonly rule: VoteThresholdRule;
    }
  | { readonly available: false; readonly reason: string } {
  const j = world.jurisdictions[input.jurisdictionId];
  if (!j)
    return {
      available: false,
      reason: "Governing jurisdiction is absent from this World.",
    };
  const federal = input.processKind === "federal-amendment";
  const state = ["state-amendment", "state-revision"].includes(
    input.processKind,
  );
  const stateKey = state ? stateKeyForJurisdiction(world, j.id) : null;
  const profile = stateKey ? stateAmendmentProfile(stateKey) : null;
  if (
    (!federal && !state) ||
    (federal && !["united-states", "us"].includes(j.slug)) ||
    (state && !profile)
  )
    return {
      available: false,
      reason:
        "This jurisdiction/process has no supported constitutional proposal rule.",
    };
  // A sourced rule applies from its observation; a game-profile rule claims no
  // source and so no observation date.
  if (world.currentDate < "2026-09-13" && profile?.basis !== "game-profile")
    return {
      available: false,
      reason:
        "Earlier applicability of this current-source proposal rule is not established.",
    };
  const key = federal ? "US" : profile!.jurisdictionKey;
  return {
    available: true,
    worldId: world.id,
    jurisdictionId: j.id,
    jurisdictionKey: key,
    asOfDate: world.currentDate,
    historySequenceExclusive: world.history.nextSequence,
    rule: constitutionalProposalRuleAt(world, key, world.currentDate),
  };
}
/** An office-labeled job alone grants nothing. Reconcile the active election/work chain. */
export function constitutionalMemberBody(
  world: World,
  personId: EntityId,
  jurisdictionId: EntityId,
  at = world.currentDate,
): "house" | "senate" | "assembly" | null {
  const jurisdiction = world.jurisdictions[jurisdictionId];
  if (!jurisdiction) return null;
  // S30-S confirmed no admitted US/California office/candidacy pack on this base.
  // Register actual pack office identities here only after its winner/work consumer exists.
  const allowed: Record<string, "house" | "senate" | "assembly"> = {};
  const bodies = new Set<"house" | "senate" | "assembly">();
  for (const work of activeWorkRelationshipsAt(world, personId, {
    asOfDate: at,
    historySequenceExclusive: world.history.nextSequence,
  })) {
    if (
      work.relationship.kind !== "employment:legislative-member" ||
      work.relationship.provenance.kind !== "simulated-event"
    )
      continue;
    const outcomeEventId = work.relationship.provenance.eventId;
    const results = (world.history.electionContestResults ?? []).filter(
      (r) =>
        r.winnerPersonId === personId &&
        r.outcomeEventId === outcomeEventId &&
        r.resolvedAt <= at,
    );
    for (const result of results) {
      const contest = (world.history.electionContests ?? []).find(
        (c) => c.id === result.contestId,
      );
      if (
        contest?.jurisdictionId === jurisdictionId &&
        allowed[contest.office.officeKey]
      )
        bodies.add(allowed[contest.office.officeKey]!);
    }
  }
  return bodies.size === 1 ? [...bodies][0]! : null;
}
export type ProposeConstitutionalMeasureInput = Omit<
  ConstitutionalMeasureRecord,
  | "id"
  | "sequence"
  | "introducedAt"
  | "proposalRule"
  | "sourceSha256"
  | "provenance"
>;
export function proposeConstitutionalMeasure(
  world: World,
  input: ProposeConstitutionalMeasureInput,
): World {
  if (
    ![
      "federal-amendment",
      "state-amendment",
      "state-revision",
      "municipal-charter",
    ].includes(input.processKind)
  )
    throw Error("This is not a supported constitutional process kind.");
  if (
    !input.stableKey.trim() ||
    !input.text.trim() ||
    !input.textVersion.trim() ||
    !input.sponsoringAuthority.trim() ||
    !input.designation.trim()
  )
    throw Error("Proposal identity, authority, version and text are required.");
  const j = world.jurisdictions[input.jurisdictionId];
  if (!j) throw Error("Proposal jurisdiction is missing.");
  const federal = input.processKind === "federal-amendment";
  const charter = input.processKind === "municipal-charter";
  const stateKey =
    federal || charter ? null : stateKeyForJurisdiction(world, j.id);
  const profile = stateKey ? stateAmendmentProfile(stateKey) : null;
  const key = federal ? "US" : charter ? "us-nv-carson-city" : stateKey;
  if (input.jurisdictionKey !== key)
    throw Error(
      "This constitutional route is not supported in that jurisdiction.",
    );
  // Canonical slugs, not name matching or a supplied access tag.
  const slugs = federal
    ? ["united-states", "us"]
    : charter
      ? ["carson-city", "us-nv-carson-city"]
      : [];
  if (!slugs.includes(j.slug) && !profile)
    throw Error("Canonical jurisdiction identity does not match the process.");
  if (world.currentDate < "2026-09-13" && profile?.basis !== "game-profile")
    throw Error(
      "This current-source process is supported from its 2026-09-13 observation; earlier applicability is not established.",
    );
  const mode = federal
    ? ["state-legislatures", "state-conventions"]
    : charter
      ? ["nevada-enactment"]
      : ["statewide-electors"];
  if (!mode.includes(input.ratificationMode))
    throw Error("Wrong ratification mode for this constitutional process.");
  if (
    (world.history.constitutionalMeasures ?? []).some(
      (m) => m.stableKey === input.stableKey,
    )
  )
    throw Error("Proposal key already exists.");
  for (const d of [input.deadlineAt, input.delayedOperativeAt])
    if (d !== null) {
      makeIsoDate(d);
      if (d < world.currentDate)
        throw Error("Proposal date clause precedes proposal.");
    }
  if (!federal && input.deadlineAt !== null)
    throw Error(
      "No generic state or charter ratification deadline is established.",
    );
  if (input.ruleDelta.kind === "proposal-threshold") {
    if (charter)
      throw Error(
        "Carson's charter cannot change a federal or state constitutional proposal rule.",
      );
    assertThresholdRule({
      ...(federal ? FEDERAL_BASE : CALIFORNIA_BASE),
      numerator: input.ruleDelta.numerator,
      denominatorParts: input.ruleDelta.denominatorParts,
    });
  } else if (input.ruleDelta.kind === "rule-field") {
    assertConstitutionalRuleFieldDelta(input.jurisdictionKey, input.ruleDelta);
  } else if (input.ruleDelta.kind === "policy-provision") {
    assertPolicyProvisionDelta(world, input.jurisdictionKey, input.ruleDelta);
  } else if (
    input.ruleDelta.kind !== "text-only" ||
    !input.ruleDelta.unsupportedEffect.trim()
  )
    throw Error("Unsupported effects must be explicitly described.");
  if (charter) {
    if (!input.ordinaryMeasureId)
      throw Error(
        "Carson charter change needs the Nevada legislative measure; council adoption does not amend it.",
      );
    const bill = requireMeasure(world, input.ordinaryMeasureId);
    if (rulePackById(bill.rulePackId).jurisdictionKey !== "nevada")
      throw Error("Charter change must use Nevada's legislature.");
    if (bill.sponsorPersonId !== input.sponsorPersonId)
      throw Error("Charter sponsor must match the Nevada measure.");
  } else {
    if (input.ordinaryMeasureId !== null)
      throw Error("An ordinary bill is not a constitutional proposal.");
    if (
      input.sponsorPersonId &&
      !constitutionalMemberBody(
        world,
        input.sponsorPersonId,
        input.jurisdictionId,
      )
    )
      throw Error(
        "Sponsoring this proposal requires the actual legislative member's office.",
      );
  }
  // Null sponsor is an institution-authored/imported proposal, never a player authority shortcut.
  const resolved = constitutionalProposalRuleForWorld(world, input);
  if (!charter && !resolved.available) throw Error(resolved.reason);
  const proposalRule = resolved.available ? resolved.rule : null;
  const measure: ConstitutionalMeasureRecord = {
    ...structuredClone(input),
    id: createStableId(
      "constitutional-measure",
      `${world.id}:${input.stableKey}`,
    ),
    sequence: world.history.nextSequence,
    introducedAt: world.currentDate,
    proposalRule,
    // A game-profile route reads no source text, so it carries no digest.
    sourceSha256:
      profile?.basis === "game-profile"
        ? "game-profile:no-source-text"
        : CONSTITUTIONAL_EVIDENCE[
            federal
              ? "us-constitution"
              : charter
                ? "carson-charter"
                : "ca-constitution-xviii"
          ].sha256,
    provenance: "authored-game-proposal",
  };
  const next = {
    ...world,
    history: {
      ...world.history,
      nextSequence: world.history.nextSequence + 1,
      constitutionalMeasures: [
        ...(world.history.constitutionalMeasures ?? []),
        measure,
      ],
    },
  };
  return append(next, measure, { kind: "proposed" }, input.sponsorPersonId);
}

export type CaliforniaConstitutionalProposalInput = Omit<
  ProposeConstitutionalMeasureInput,
  | "jurisdictionId"
  | "jurisdictionKey"
  | "sponsoringAuthority"
  | "ordinaryMeasureId"
  | "processKind"
> & { readonly processKind: "state-amendment" | "state-revision" };

/** Institution-record ingestion; a null sponsor never grants player authority. */
export function proposeCaliforniaConstitutionalMeasure(
  world: World,
  input: CaliforniaConstitutionalProposalInput,
): World {
  if (!["state-amendment", "state-revision"].includes(input.processKind))
    throw Error(
      "This adapter accepts California constitutional proposals, not ordinary bills or charters.",
    );
  const state = stateJurisdictionForKey("US-CA");
  if (!state)
    throw Error("California's canonical state identity is unavailable.");
  // Same existing governing-identity registration used by office consumers;
  // residence, work, permissions, source registries and other lives are untouched.
  const next = world.jurisdictions[state.id]
    ? world
    : {
        ...world,
        jurisdictions: { ...world.jurisdictions, [state.id]: state },
        jurisdictionOrder: [...world.jurisdictionOrder, state.id],
      };
  return proposeConstitutionalMeasure(next, {
    ...input,
    jurisdictionId: state.id,
    jurisdictionKey: "US-CA",
    sponsoringAuthority: "California Legislature",
    ordinaryMeasureId: null,
  });
}
function requireConstitutionalMeasure(world: World, id: EntityId) {
  const m = (world.history.constitutionalMeasures ?? []).find(
    (m) => m.id === id,
  );
  if (!m)
    throw Error(
      "This is not a constitutional measure. Ordinary bill amendments do not enter this process.",
    );
  return m;
}
export function constitutionalActions(world: World, id: EntityId) {
  return (world.history.constitutionalActions ?? [])
    .filter((a) => a.measureId === id)
    .sort((a, b) => a.sequence - b.sequence);
}
export interface ConstitutionalPosition {
  readonly phase:
    | "consideration"
    | "ratification"
    | "rejected"
    | "expired"
    | "ratified"
    | "operative"
    | "awaiting-nevada";
  readonly ratifiedStates: readonly string[];
  readonly effectiveAt: IsoDate | null;
  readonly operativeAt: IsoDate | null;
  readonly modeledEffect: boolean;
}
export function constitutionalPosition(
  world: World,
  id: EntityId,
  at = world.currentDate,
): ConstitutionalPosition {
  const m = requireConstitutionalMeasure(world, id);
  const actions = constitutionalActions(world, id).filter(
    (a) => a.occurredAt <= at,
  );
  let phase: ConstitutionalPosition["phase"] =
    m.processKind === "municipal-charter" ? "awaiting-nevada" : "consideration";
  const passed = new Set<string>();
  const states = new Set<string>();
  let effectiveAt: IsoDate | null = null;
  for (const a of actions) {
    const d = a.detail;
    if (d.kind === "proposal-vote") {
      if (d.vote.outcome === "failed") phase = "rejected";
      else {
        passed.add(d.bodyKey);
        if (passed.size === proposingBodies(m).length) phase = "ratification";
      }
    }
    if (d.kind === "state-ratification" && d.approved) {
      states.add(d.stateKey);
      if (states.size === Math.ceil((ARTICLE_V_STATE_KEYS.length * 3) / 4))
        effectiveAt = a.occurredAt;
    }
    if (d.kind === "statewide-vote") {
      if (d.yes > d.no)
        effectiveAt = addDays(
          d.statementFiledAt,
          stateAmendmentProfile(m.jurisdictionKey)
            ?.effectiveDaysAfterStatement ?? 5,
        );
      else phase = "rejected";
    }
    if (d.kind === "charter-enactment") {
      const e = (world.history.legislativeEnactments ?? []).find(
        (e) => e.id === d.enactmentId,
      );
      if (e) effectiveAt = e.effectiveAt;
    }
  }
  const operativeAt = effectiveAt
    ? m.delayedOperativeAt && m.delayedOperativeAt > effectiveAt
      ? m.delayedOperativeAt
      : effectiveAt
    : null;
  if (effectiveAt) phase = operativeAt! <= at ? "operative" : "ratified";
  else if (m.deadlineAt && at > m.deadlineAt && phase === "ratification")
    phase = "expired";
  return {
    phase,
    ratifiedStates: [...states],
    effectiveAt,
    operativeAt,
    modeledEffect:
      m.ruleDelta.kind === "proposal-threshold" ||
      m.ruleDelta.kind === "rule-field",
  };
}
/** Two deltas that set the same rule, so both passing at once conflict. */
export function sameRuleChanged(
  a: ConstitutionalMeasureRecord["ruleDelta"],
  b: ConstitutionalMeasureRecord["ruleDelta"],
): boolean {
  if (a.kind === "proposal-threshold" && b.kind === "proposal-threshold")
    return true;
  if (a.kind === "policy-provision" && b.kind === "policy-provision")
    return a.propositionId === b.propositionId;
  return (
    a.kind === "rule-field" &&
    b.kind === "rule-field" &&
    a.field === b.field &&
    a.officeKey === b.officeKey
  );
}
/** The bodies that must each pass a proposal, with their sizes where fixed. */
function proposingBodies(
  m: ConstitutionalMeasureRecord,
): readonly { readonly bodyKey: string; readonly members: number | null }[] {
  if (m.processKind === "federal-amendment")
    return [
      { bodyKey: "house", members: null },
      { bodyKey: "senate", members: null },
    ];
  return stateAmendmentProfile(m.jurisdictionKey)?.bodies ?? [];
}
function assertDetail(
  world: World,
  m: ConstitutionalMeasureRecord,
  d: ConstitutionalActionDetail,
) {
  const p = constitutionalPosition(world, m.id);
  const actions = constitutionalActions(world, m.id);
  if (d.kind === "position") {
    if (
      !world.people[d.personId] ||
      !["support", "oppose", "undecided"].includes(d.position)
    )
      throw Error("Missing person or invalid recorded position.");
    return;
  }
  if (["ratified", "operative", "rejected", "expired"].includes(p.phase))
    throw Error("The constitutional process is already resolved or expired.");
  if (d.kind === "proposal-vote") {
    if (p.phase !== "consideration" || !m.proposalRule)
      throw Error("This process does not accept a proposal vote now.");
    const bodies = proposingBodies(m).map((body) => body.bodyKey);
    if (
      !bodies.includes(d.bodyKey) ||
      actions.some(
        (a) =>
          a.detail.kind === "proposal-vote" && a.detail.bodyKey === d.bodyKey,
      )
    )
      throw Error("Wrong or duplicate proposing body.");
    const v = d.vote;
    const tally = tallyDispositions(v.dispositions);
    const present = tally.yea + tally.nay + tally.presentNotVoting;
    // U.S. Article I § 5 and California Article IV § 7(a), locked in this domain.
    if (v.presentMembers !== present || present <= v.eligibleMembers / 2)
      throw Error("The rollcall must record actual presence and a quorum.");
    const eligible =
      m.processKind === "federal-amendment"
        ? v.eligibleMembers
        : (proposingBodies(m).find((body) => body.bodyKey === d.bodyKey)
            ?.members ?? -1);
    if (v.eligibleMembers !== eligible || v.dispositions.length !== eligible)
      throw Error(
        "Rollcall membership must include every eligible member, including absences.",
      );
    const expected = buildLegislativeVoteRecord(world, {
      stableKey: v.stableKey,
      measureId: m.id,
      forum: { kind: "chamber", chamberKey: d.bodyKey },
      purpose: "constitutional-proposal",
      threshold: m.proposalRule,
      eligibleMembers: eligible,
      presentMembers: present,
      dispositions: v.dispositions,
      provenance: v.provenance,
    });
    const keys = [
      "id",
      "tally",
      "thresholdLabel",
      "denominatorKind",
      "denominatorValue",
      "requiredVotes",
      "outcome",
      "forum",
      "purpose",
      "takenAt",
      "measureId",
    ] as const;
    for (const k of keys)
      if (JSON.stringify(expected[k]) !== JSON.stringify(v[k]))
        throw Error(
          `Constitutional vote ${k} disagrees with the sourced rule.`,
        );
  }
  if (d.kind === "state-ratification") {
    if (p.phase !== "ratification" || m.processKind !== "federal-amendment")
      throw Error(
        "State Article V ratification is not a statewide constitutional ballot.",
      );
    if (
      typeof d.approved !== "boolean" ||
      !ARTICLE_V_STATE_KEYS.includes(d.stateKey) ||
      !d.authenticationKey.trim()
    )
      throw Error(
        "Ratification requires an authenticated state action. DC is not a ratifying state.",
      );
    if (
      d.body !==
      (m.ratificationMode === "state-legislatures"
        ? "state-legislature"
        : "state-convention")
    )
      throw Error(
        "The ratifying body differs from Congress's designated mode.",
      );
    if (
      actions.some(
        (a) =>
          a.detail.kind === "state-ratification" &&
          a.detail.stateKey === d.stateKey,
      )
    )
      throw Error(
        "Duplicate state action; reconsideration/rescission rules remain unresolved.",
      );
  }
  if (d.kind === "statewide-vote") {
    if (
      p.phase !== "ratification" ||
      !["state-amendment", "state-revision"].includes(m.processKind)
    )
      throw Error(
        "This is not a California statewide constitutional ratification.",
      );
    for (const n of [d.yes, d.no])
      if (!Number.isSafeInteger(n) || n < 0)
        throw Error("Ballot totals must be non-negative safe integers.");
    if (d.yes + d.no === 0 || !Number.isSafeInteger(d.yes + d.no))
      throw Error("No valid votes cast on the measure.");
    makeIsoDate(d.electionAt);
    makeIsoDate(d.statementFiledAt);
    if (
      d.electionAt < m.introducedAt ||
      d.statementFiledAt < d.electionAt ||
      d.statementFiledAt !== world.currentDate
    )
      throw Error(
        "Record the statement on its actual filing date after the election and proposal.",
      );
    if (
      actions.some(
        (a) => a.detail.kind === "proposal-vote" && a.occurredAt > d.electionAt,
      )
    )
      throw Error("Ratification election precedes completion of proposal.");
    if (
      (world.history.constitutionalMeasures ?? []).some(
        (other) =>
          other.id !== m.id &&
          other.jurisdictionKey === m.jurisdictionKey &&
          sameRuleChanged(other.ruleDelta, m.ruleDelta) &&
          constitutionalActions(world, other.id).some(
            (a) =>
              a.detail.kind === "statewide-vote" &&
              a.detail.electionAt === d.electionAt &&
              a.detail.yes > a.detail.no &&
              d.yes > d.no,
          ),
      )
    )
      throw Error(
        "Conflicting same-election provisions require Article XVIII § 4 reconciliation; not yet supported.",
      );
  }
  if (d.kind === "charter-enactment") {
    if (p.phase !== "awaiting-nevada" || !m.ordinaryMeasureId)
      throw Error("This is not a Nevada charter enactment route.");
    const e = measureEnactment(world, m.ordinaryMeasureId);
    if (e && e.effectiveAt === null)
      throw Error(
        "The Nevada enactment needs its supported effective date; resolution time is not proof of the statutory passage date.",
      );
    if (!e || e.id !== d.enactmentId || e.outcome !== "enacted")
      throw Error(
        "Charter change requires actual Nevada legislative enactment, not a council vote or presidential disposition.",
      );
  }
}
function append(
  world: World,
  m: ConstitutionalMeasureRecord,
  detail: ConstitutionalActionDetail,
  personId: EntityId | null = null,
): World {
  if (detail.kind !== "proposed") assertDetail(world, m, detail);
  const stableKey = `${m.id}:constitutional-action:${constitutionalActions(world, m.id).length}`;
  let next = recordWorldEvent(world, {
    stableKey: `event:${stableKey}`,
    type: "constitution.process-action",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: m.jurisdictionId,
    involvedEntityIds: [m.id, ...(personId ? [personId] : [])],
    participants: personId
      ? [
          {
            personId,
            role: "agency:actor",
            detail: "Recorded personal constitutional position or sponsorship.",
          },
        ]
      : [],
    personFactConstraints: [],
    visibility: "public",
    context: {
      location: {
        jurisdictionId: m.jurisdictionId,
        label: world.jurisdictions[m.jurisdictionId]!.name,
        setting: null,
      },
      socialContext: "Recorded constitutional process action",
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
    summary: `${m.designation}: ${detail.kind.replaceAll("-", " ")}.`,
    tags: ["constitution.process", `constitution:${m.processKind}`],
  });
  const event = next.history.events.at(-1)!;
  const action: ConstitutionalActionRecord = {
    id: createStableId("constitutional-action", `${world.id}:${stableKey}`),
    stableKey,
    sequence: next.history.nextSequence,
    measureId: m.id,
    occurredAt: world.currentDate,
    eventId: event.id,
    detail: structuredClone(detail),
  };
  next = {
    ...next,
    history: {
      ...next.history,
      nextSequence: next.history.nextSequence + 1,
      constitutionalActions: [
        ...(next.history.constitutionalActions ?? []),
        action,
      ],
    },
  };
  const position = constitutionalPosition(next, m.id);
  if (
    position.effectiveAt &&
    position.operativeAt &&
    m.ruleDelta.kind === "proposal-threshold" &&
    !(next.history.constitutionalRuleVersions ?? []).some(
      (v) => v.measureId === m.id,
    )
  ) {
    const delta = m.ruleDelta;
    const key = m.jurisdictionKey as "US" | `US-${string}`;
    const version: ConstitutionalRuleVersionRecord = {
      id: createStableId("constitutional-rule-version", `${world.id}:${m.id}`),
      stableKey: m.id,
      sequence: next.history.nextSequence,
      jurisdictionKey: key,
      measureId: m.id,
      effectiveAt: position.effectiveAt,
      operativeAt: position.operativeAt,
      threshold: fractionOf(
        delta.numerator,
        delta.denominatorParts,
        m.proposalRule!.countedAgainst,
        `${delta.numerator}/${delta.denominatorParts} under ${m.designation}`,
        {
          ...m.proposalRule!.source,
          citation: `${m.designation}, text version ${m.textVersion}`,
          note: "Simulated constitutional change; baseline primary evidence is retained on the proposal.",
        },
      ),
    };
    next = {
      ...next,
      history: {
        ...next.history,
        nextSequence: next.history.nextSequence + 1,
        constitutionalRuleVersions: [
          ...(next.history.constitutionalRuleVersions ?? []),
          version,
        ],
      },
    };
  }
  return next;
}
/** Institutional rollcall ingestion: the player cannot choose a collective result. */
export function recordConstitutionalProposalVote(
  world: World,
  id: EntityId,
  bodyKey: string,
  dispositions: readonly LegislativeVoteDisposition[],
  eligibleMembers: number,
  provenance: LegislativeVoteProvenance,
): World {
  const m = requireConstitutionalMeasure(world, id);
  if (!m.proposalRule)
    throw Error("Use the actual Nevada measure for charter consideration.");
  const t = tallyDispositions(dispositions);
  const vote = buildLegislativeVoteRecord(world, {
    stableKey: `${id}:${bodyKey}:proposal-vote`,
    measureId: id,
    forum: { kind: "chamber", chamberKey: bodyKey },
    purpose: "constitutional-proposal",
    threshold: m.proposalRule,
    eligibleMembers,
    presentMembers: t.yea + t.nay + t.presentNotVoting,
    dispositions,
    provenance,
  });
  return append(world, m, { kind: "proposal-vote", bodyKey, vote });
}
/** Completed authenticated state action, not invented state voting procedure. */
export function recordArticleVRatification(
  world: World,
  id: EntityId,
  input: Extract<ConstitutionalActionDetail, { kind: "state-ratification" }>,
): World {
  return append(world, requireConstitutionalMeasure(world, id), input);
}
/** A certified statewide ballot result on a state amendment, in any state. */
export function recordStatewideRatification(
  world: World,
  id: EntityId,
  input: Extract<ConstitutionalActionDetail, { kind: "statewide-vote" }>,
): World {
  return append(world, requireConstitutionalMeasure(world, id), input);
}
export function recordCaliforniaRatification(
  world: World,
  id: EntityId,
  input: Extract<ConstitutionalActionDetail, { kind: "statewide-vote" }>,
): World {
  return append(world, requireConstitutionalMeasure(world, id), input);
}
export function recordCarsonCharterEnactment(
  world: World,
  id: EntityId,
): World {
  const m = requireConstitutionalMeasure(world, id);
  const e = m.ordinaryMeasureId
    ? measureEnactment(world, m.ordinaryMeasureId)
    : null;
  if (!e) throw Error("Nevada enactment remains pending.");
  return append(world, m, { kind: "charter-enactment", enactmentId: e.id });
}
export function recordConstitutionalPosition(
  world: World,
  id: EntityId,
  personId: EntityId,
  position: "support" | "oppose" | "undecided",
): World {
  if (world.control.kind !== "person" || world.control.personId !== personId)
    throw Error("Only the controlled character can record this position.");
  return append(
    world,
    requireConstitutionalMeasure(world, id),
    { kind: "position", personId, position },
    personId,
  );
}

/** Replay the writer's actual guards at the historical frontier, including source and effect checks. */
export function assertConstitutionalIntegrity(
  world: World,
  ids: Set<EntityId>,
): void {
  const records = constitutionalHistoryRecords(world).sort(
    (a, b) => a.sequence - b.sequence,
  );
  for (const r of records) {
    if (ids.has(r.id)) throw Error("Duplicate constitutional record identity.");
    ids.add(r.id);
  }
  let replay: World = {
    ...world,
    history: {
      ...world.history,
      constitutionalMeasures: [],
      constitutionalActions: [],
      constitutionalRuleVersions: [],
    },
  };
  for (const r of records) {
    if ("processKind" in r) {
      const at = {
        ...replay,
        currentDate: r.introducedAt,
        history: {
          ...replay.history,
          nextSequence: r.sequence,
          events: world.history.events.filter(
            (e) =>
              !e.stableKey.startsWith(`event:${r.id}:constitutional-action:`),
          ),
        },
      };
      const generated = proposeConstitutionalMeasure(at, r);
      const expected = generated.history.constitutionalMeasures!.at(-1)!;
      if (JSON.stringify(expected) !== JSON.stringify(r))
        throw Error(
          "Constitutional proposal identity/source/historical rule differs from replay.",
        );
      replay = {
        ...replay,
        history: {
          ...replay.history,
          constitutionalMeasures: [
            ...(replay.history.constitutionalMeasures ?? []),
            r,
          ],
        },
      };
    } else if ("detail" in r) {
      const m = requireConstitutionalMeasure(replay, r.measureId);
      const at = {
        ...replay,
        currentDate: r.occurredAt,
        history: { ...replay.history, nextSequence: r.sequence },
      };
      if (r.occurredAt < m.introducedAt || r.occurredAt > world.currentDate)
        throw Error("Constitutional action date is invalid.");
      const prior = constitutionalActions(replay, m.id).at(-1);
      if (prior && prior.occurredAt > r.occurredAt)
        throw Error("Constitutional actions are out of date order.");
      if (r.detail.kind === "proposed") {
        if (prior || r.occurredAt !== m.introducedAt)
          throw Error("Duplicate or delayed constitutional proposal.");
      } else assertDetail(at, m, r.detail);
      const key = `${m.id}:constitutional-action:${constitutionalActions(replay, m.id).length}`;
      const event = world.history.events.find((e) => e.id === r.eventId);
      if (
        r.stableKey !== key ||
        r.id !==
          createStableId("constitutional-action", `${world.id}:${key}`) ||
        !event ||
        event.stableKey !== `event:${key}` ||
        event.occurredAt !== r.occurredAt ||
        event.sequence >= r.sequence ||
        event.visibility !== "public" ||
        event.type !== "constitution.process-action" ||
        event.jurisdictionId !== m.jurisdictionId ||
        !event.involvedEntityIds.includes(m.id) ||
        (r.detail.kind === "position" &&
          (!event.involvedEntityIds.includes(r.detail.personId) ||
            !event.participants.some(
              (p) =>
                r.detail.kind === "position" &&
                p.personId === r.detail.personId &&
                p.role === "agency:actor",
            )))
      )
        throw Error("Constitutional action/event identity mismatch.");
      replay = {
        ...replay,
        history: {
          ...replay.history,
          constitutionalActions: [
            ...(replay.history.constitutionalActions ?? []),
            r,
          ],
        },
      };
    } else {
      const m = requireConstitutionalMeasure(replay, r.measureId);
      const p = constitutionalPosition(replay, m.id, world.currentDate);
      if (
        m.ruleDelta.kind !== "proposal-threshold" ||
        r.effectiveAt !== p.effectiveAt ||
        r.operativeAt !== p.operativeAt ||
        r.stableKey !== m.id ||
        JSON.stringify(r.threshold) !==
          JSON.stringify(
            fractionOf(
              m.ruleDelta.numerator,
              m.ruleDelta.denominatorParts,
              m.proposalRule!.countedAgainst,
              `${m.ruleDelta.numerator}/${m.ruleDelta.denominatorParts} under ${m.designation}`,
              {
                ...m.proposalRule!.source,
                citation: `${m.designation}, text version ${m.textVersion}`,
                note: "Simulated constitutional change; baseline primary evidence is retained on the proposal.",
              },
            ),
          ) ||
        r.threshold.numerator !== m.ruleDelta.numerator ||
        r.threshold.denominatorParts !== m.ruleDelta.denominatorParts ||
        r.threshold.countedAgainst !== m.proposalRule?.countedAgainst ||
        r.jurisdictionKey !== m.jurisdictionKey ||
        r.id !==
          createStableId(
            "constitutional-rule-version",
            `${world.id}:${m.id}`,
          ) ||
        (replay.history.constitutionalRuleVersions ?? []).some(
          (v) => v.measureId === m.id,
        )
      )
        throw Error(
          "Constitutional rule version is not an enacted supported effect.",
        );
      assertThresholdRule(r.threshold);
      replay = {
        ...replay,
        history: {
          ...replay.history,
          constitutionalRuleVersions: [
            ...(replay.history.constitutionalRuleVersions ?? []),
            r,
          ],
        },
      };
    }
  }
  for (const m of world.history.constitutionalMeasures ?? []) {
    if (
      !constitutionalActions(world, m.id).some(
        (a) => a.detail.kind === "proposed",
      )
    )
      throw Error("Constitutional measure has no proposal event.");
    const p = constitutionalPosition(world, m.id);
    if (
      p.effectiveAt &&
      m.ruleDelta.kind === "proposal-threshold" &&
      !(world.history.constitutionalRuleVersions ?? []).some(
        (v) => v.measureId === m.id,
      )
    )
      throw Error(
        "Ratified supported delta lacks its historical rule version.",
      );
  }
}
