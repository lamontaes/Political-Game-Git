import statePetitionData from "../../data/research/elections/state-initiative-rules.json" with { type: "json" };
import { stateKeyForJurisdiction } from "./life-places";
import { municipalRulePackFor } from "./municipal-election-rule-packs";
import { municipalValueOrNull } from "./municipal-election-rules";
import { addDays } from "./dates";
import { scheduleFutureDueItem } from "./future-transitions";
import { organizationParticipationStateHistory } from "./life-queries";
import { recordOrganizationParticipationState } from "./life";
import { municipalGovernmentByKey } from "./municipal-government";
import {
  municipalLawOfficeKey,
  ruleValueInWorld,
} from "./enacted-rule-changes";
import {
  resolveMunicipalRecallRule,
  type MunicipalBallotRuleBasis,
  type MunicipalRecallBasis,
} from "./municipal-ballot-rules";
import {
  resolveRequiredSignatures,
  type MunicipalRecallDoctrine,
  type PetitionThreshold,
} from "./municipal-election-rules";
import {
  municipalGovernmentJurisdictionId,
  municipalSeats,
} from "./municipal-public-work";
import { stateName } from "./office-qualification-rules";
import { personName } from "./people";
import { viewOfOfficial } from "./official-view-reads";
import { isEligibleVoterIn } from "./issue-record";
import { nextTownElection } from "./nationwide-world/town-election-calendar";
import type {
  EntityId,
  FutureDueItem,
  FutureTransitionHandlerResult,
  IsoDate,
  World,
} from "./types";
import { recordWorldEvent } from "./world";

/**
 * RECALL — voters removing an elected official before the term ends.
 *
 * A resident starts a petition against someone sitting on their town's
 * governing body. It circulates for the window the state's law gives; if it
 * gathers enough signatures, a recall election is held; if the voters vote to
 * remove, the official's seat ends that day. Every step is a public record,
 * dated on the ordinary clock, so a recall happens the same way whether the
 * player is watching or not.
 *
 * What is read from law: whether a state lets towns recall at all, and the
 * doctrine, signature threshold and circulation window, through the
 * authorized resolver `resolveMunicipalRecallRule` (`municipal-ballot-rules.ts`),
 * which reads the state's municipal rule pack. Where the pack is missing or
 * does not settle the doctrine or window, the owner's standing rule applies:
 * it takes the rule the most read states name (no draw), ESTIMATED FROM
 * AVERAGE and labeled `national-estimated`. It is never another state's law.
 *
 * Under the owner-approved game mechanism, recorded recall supporters count
 * as signatures and recorded registered residents supply the base. The legal
 * percentage and its original base label remain recorded separately. Election
 * counts use saved official views; no turnout is extrapolated.
 *
 * NOT MODELED, with the blanket rule applied meanwhile:
 * - Recall of state officers, legislators and judges. Refused with the reason
 *   until the research returns their rules.
 * - Grounds. Where a state requires stated grounds, the petition records that
 *   they are required; no court tests them.
 * - Who replaces the official. Every doctrine is treated as a bare
 *   keep-or-remove question, and the seat stays empty until the town's next
 *   regular election; a replacement race on the same ballot and a vacancy
 *   appointment are not modeled.
 * - A law that changes a state's recall rule mid-petition. The rule is read
 *   when a petition starts (a law enacted in play through
 *   `enacted-rule-changes.ts` included); a petition already circulating runs
 *   its course under the rule it started under.
 * - Anyone other than a resident starting a petition, and the world starting
 *   one on its own (no recorded cause exists yet).
 */

export const RECALL_VERSION = "recall/v1";
export const RECALL_PETITION_CLOSES = "civic:recall-petition-closes" as const;
export const RECALL_ELECTION = "civic:recall-election" as const;

export const RECALL_PETITION_STARTED = "civic.recall-petition-started";
export const RECALL_PETITION_CLOSED = "civic.recall-petition-closed";
export const RECALL_ELECTION_HELD = "civic.recall-election-held";

export type RecallRule =
  | {
      readonly available: true;
      readonly stateUsps: string;
      readonly doctrine: MunicipalRecallDoctrine;
      readonly doctrineBasis: MunicipalRecallBasis;
      readonly threshold: PetitionThreshold | null;
      readonly circulationDays: number;
      readonly circulationBasis: MunicipalBallotRuleBasis;
      readonly groundsRequired: boolean | null;
    }
  | { readonly available: false; readonly reason: string };

/**
 * The recall rule for a seat on one town's governing body, read through the
 * authorized municipal rule resolver: a law this World enacted on it where one
 * is in force, else the state's own reading where its pack settles it, else
 * the national modal rule, ESTIMATED FROM AVERAGE (no draw).
 *
 * Without a World only the compiled rule is read.
 */
export function municipalRecallRule(
  governmentKey: string,
  world?: World,
): RecallRule {
  const government = municipalGovernmentByKey(governmentKey);
  if (!government)
    return { available: false, reason: "This town's government is not known." };
  const state = stateName(government.state);
  const enacted = world
    ? ruleValueInWorld(
        world,
        {
          jurisdiction: government.state,
          officeKey: municipalLawOfficeKey(government.state),
          field: "municipal.recall.doctrine",
          onDate: world.currentDate,
        },
        null,
      )
    : null;
  const enactedDoctrine =
    enacted?.source === "enacted"
      ? (enacted.value as MunicipalRecallDoctrine)
      : null;
  const rule = resolveMunicipalRecallRule(government.state, enactedDoctrine);
  const since =
    enacted?.source === "enacted" ? ` since ${enacted.designation}` : "";
  if (rule.doctrine === "prohibited")
    return {
      available: false,
      reason: `Towns in ${state} cannot recall their officials${since}.`,
    };
  if (rule.doctrine === "judicial-cause-removal-trial")
    return {
      available: false,
      reason: `In ${state} a town official is removed by a court for cause, not by a recall vote${since}.`,
    };
  return {
    available: true,
    stateUsps: rule.stateUsps,
    doctrine: rule.doctrine,
    doctrineBasis: rule.doctrineBasis,
    threshold: rule.threshold,
    circulationDays: rule.circulationDays!,
    circulationBasis: rule.circulationBasis!,
    groundsRequired: rule.groundsRequired,
  };
}

/** A single legal gate for official and proposition petitions. */
export type PetitionKind =
  | "recall"
  | "local-initiative"
  | "protest-referendum"
  | "state-initiative"
  | "state-referendum"
  | "constitutional-initiative";

export interface PetitionRuleRow {
  readonly kind: PetitionKind;
  readonly stateUsps: string;
  readonly available: boolean;
  readonly reason: string;
  readonly basis: string;
  readonly threshold: Readonly<Record<string, string | number>>;
  readonly window: Readonly<Record<string, string | number | null>>;
  readonly distribution: Readonly<Record<string, string | number>>;
  readonly review: Readonly<Record<string, string>>;
  readonly source: string;
}

/** The clerk reads an actual refusal from a row; unread terms remain marked estimates. */
export function petitionRule(
  kind: PetitionKind,
  stateUsps: string,
  input: { readonly governmentKey?: string; readonly world?: World } = {},
): PetitionRuleRow {
  const usps = stateUsps.replace(/^US-/, "").toUpperCase();
  const place = (
    statePetitionData.places as Record<
      string,
      {
        readonly name: string;
        readonly kinds: Record<
          string,
          {
            readonly available: boolean;
            readonly reason: string;
            readonly basis: string;
            readonly threshold: PetitionRuleRow["threshold"];
            readonly window: PetitionRuleRow["window"];
            readonly distribution: PetitionRuleRow["distribution"];
            readonly review: PetitionRuleRow["review"];
            readonly source?: string;
          }
        >;
      }
    >
  )[`US-${usps}`];
  if (!place)
    throw new Error("A petition rule requires a canonical place identity.");
  if (
    kind === "state-initiative" ||
    kind === "state-referendum" ||
    kind === "constitutional-initiative"
  ) {
    const row = place.kinds[kind]!;
    return {
      ...row,
      kind,
      stateUsps: usps,
      source: row.source ?? statePetitionData.estimateNote,
    };
  }
  if (kind === "recall" && input.governmentKey) {
    const government = municipalGovernmentByKey(input.governmentKey);
    if (!government || government.state !== usps)
      throw new Error(
        "The petition government must belong to the rule's place.",
      );
    const rule = municipalRecallRule(input.governmentKey, input.world);
    if (!rule.available)
      return {
        kind,
        stateUsps: usps,
        available: false,
        reason: rule.reason,
        basis: "municipal-rule",
        threshold: { kind: "not-applicable", reason: rule.reason },
        window: { kind: "not-applicable", reason: rule.reason },
        distribution: { kind: "not-applicable", reason: rule.reason },
        review: { authority: "election clerk", text: rule.reason },
        source: "Canonical municipal recall resolver, including enacted rules.",
      };
    return {
      kind,
      stateUsps: usps,
      available: true,
      reason: "Residents may petition to recall this official.",
      basis: rule.doctrineBasis,
      threshold: rule.threshold
        ? { ...rule.threshold }
        : {
            percent: statePetitionData.localEstimates.initiativePercent,
            base: "registered-voters",
            basis: "estimated-from-average",
          },
      window: {
        kind: "days",
        days: rule.circulationDays,
        anchor: "petition-start",
        basis: rule.circulationBasis,
      },
      distribution: {
        requiredFraction: 0,
        unit: "none",
        basis: "estimated-from-average",
        note: "No additional geographic requirement is modeled by the municipal recall resolver.",
      },
      review: {
        authority: "election clerk",
        text: rule.groundsRequired
          ? "Stated grounds are required; the clerk checks petition records."
          : "The clerk checks petition records.",
      },
      source:
        "Canonical municipal recall resolver; original doctrine and circulation provenance retained.",
    };
  }
  const democracy = municipalRulePackFor(usps)?.directDemocracy;
  const form =
    kind === "recall"
      ? democracy?.recallDoctrine
      : kind === "local-initiative"
        ? democracy?.initiativeForm
        : democracy?.protestReferendum;
  const resolved = form ? municipalValueOrNull(form) : null;
  const available =
    resolved !== "prohibited" && resolved !== "judicial-cause-removal-trial";
  const reason = !available
    ? `${place.name}'s general municipal rule does not authorize this citizen petition form${resolved === "judicial-cause-removal-trial" ? "; removal requires a court proceeding" : ""}.`
    : resolved === null
      ? statePetitionData.estimateNote
      : "The compiled general municipal rule authorizes this petition form.";
  const thresholdField =
    kind === "recall"
      ? democracy?.recallPetitionThreshold
      : kind === "local-initiative"
        ? democracy?.initiativePetitionThreshold
        : democracy?.protestReferendumThreshold;
  const threshold = thresholdField
    ? municipalValueOrNull(thresholdField)
    : null;
  const windowField =
    kind === "recall"
      ? democracy?.recallCirculationWindowDays
      : kind === "protest-referendum"
        ? democracy?.protestReferendumWindowDays
        : null;
  const windowDays = windowField ? municipalValueOrNull(windowField) : null;
  const source =
    form && (form.kind === "known" || form.kind === "locally-selectable")
      ? `${form.source.citation}; ${form.source.verification}`
      : statePetitionData.estimateNote;
  return {
    kind,
    stateUsps: usps,
    available,
    reason,
    basis:
      resolved === null ? "estimated-from-average" : "state-law-unverified",
    threshold: !available
      ? { kind: "not-applicable", reason }
      : threshold
        ? { ...threshold }
        : {
            percent:
              kind === "protest-referendum"
                ? statePetitionData.localEstimates.referendumPercent
                : statePetitionData.localEstimates.initiativePercent,
            base: "registered-voters",
            basis: "estimated-from-average",
          },
    window: !available
      ? { kind: "not-applicable", reason }
      : {
          kind: "days",
          days:
            windowDays ??
            (kind === "protest-referendum"
              ? statePetitionData.localEstimates.referendumWindowDays
              : statePetitionData.localEstimates.circulationDays),
          anchor:
            kind === "protest-referendum"
              ? "ordinance-enacted"
              : "petition-start",
          basis:
            windowDays === null
              ? "estimated-from-average"
              : "state-law-unverified",
        },
    distribution: !available
      ? { kind: "not-applicable", reason }
      : {
          requiredFraction: 0,
          unit: "none",
          basis: "estimated-from-average",
          note: "Additional geographic requirements not compiled; no quota is an explicit estimate.",
        },
    review: {
      authority: "election clerk",
      text: !available
        ? reason
        : kind === "local-initiative" && resolved === "indirect-council-first"
          ? "The clerk certifies signatures; the council considers the proposition before ballot referral."
          : kind === "local-initiative" && resolved === "town-meeting-warrant"
            ? "The clerk places the certified proposition on the town-meeting warrant."
            : "The clerk certifies eligible signed records before ballot referral.",
    },
    source,
  };
}

/** Clerk refusal wording is exactly the row's legal reason. */
export function petitionFilingCheck(
  row: PetitionRuleRow,
):
  | { readonly allowed: true; readonly rule: PetitionRuleRow }
  | { readonly allowed: false; readonly reason: string } {
  return row.available
    ? { allowed: true, rule: row }
    : { allowed: false, reason: row.reason };
}

export const PETITION_STARTED = "civic.petition-started";

export type RecallPhase =
  | "circulating"
  | "failed-to-qualify"
  | "awaiting-election"
  | "removed"
  | "retained"
  | "lapsed";

export interface RecallPetition {
  readonly stableKey: string;
  readonly kind: "recall";
  readonly governmentKey: string;
  readonly jurisdictionId: EntityId;
  readonly petitionerPersonId: EntityId;
  readonly targetPersonId: EntityId;
  readonly startedAt: IsoDate;
  readonly closesAt: IsoDate;
  readonly threshold?: PetitionThreshold | null;
  readonly phase: RecallPhase;
  readonly electionAt: IsoDate | null;
  readonly yes: number | null;
  readonly no: number | null;
}

export interface PropositionPetition extends Omit<
  RecallPetition,
  "kind" | "targetPersonId" | "threshold"
> {
  readonly kind: Exclude<PetitionKind, "recall">;
  readonly targetPersonId: null;
  readonly propositionId: EntityId;
  readonly rule: PetitionRuleRow;
}
export type CitizenPetition = RecallPetition | PropositionPetition;

function tagValue(tags: readonly string[], prefix: string): string | null {
  return (
    tags.find((tag) => tag.startsWith(prefix))?.slice(prefix.length) ?? null
  );
}

/** Every petition kind in this World, read through the same public event stream. */
export function citizenPetitions(world: World): readonly CitizenPetition[] {
  const petitions = new Map<string, CitizenPetition>();
  for (const event of world.history.events) {
    if (!event.tags.includes(RECALL_VERSION)) continue;
    const key = tagValue(event.tags, "petition:");
    if (!key) continue;
    if (
      event.type === RECALL_PETITION_STARTED ||
      event.type === PETITION_STARTED
    ) {
      const common = {
        stableKey: key,
        governmentKey: tagValue(event.tags, "government:")!,
        jurisdictionId: event.jurisdictionId!,
        petitionerPersonId: tagValue(event.tags, "petitioner:")! as EntityId,
        startedAt: event.occurredAt,
        closesAt: tagValue(event.tags, "closes:") as IsoDate,
        threshold:
          tagValue(event.tags, "threshold-percent:") === null
            ? undefined
            : {
                percent: Number(tagValue(event.tags, "threshold-percent:")),
                base: tagValue(
                  event.tags,
                  "threshold-base:",
                ) as PetitionThreshold["base"],
              },
        phase: "circulating" as const,
        electionAt: null,
        yes: null,
        no: null,
      };
      const kind = tagValue(event.tags, "petition-kind:") ?? "recall";
      if (kind === "recall")
        petitions.set(key, {
          ...common,
          kind,
          targetPersonId: tagValue(event.tags, "target:")! as EntityId,
        });
      else {
        const serialized = tagValue(event.tags, "rule-row:");
        const propositionId = tagValue(event.tags, "proposition:");
        if (!serialized || !propositionId)
          throw new Error(
            "A proposition petition requires its filed subject and legal terms.",
          );
        petitions.set(key, {
          ...common,
          kind: kind as PropositionPetition["kind"],
          targetPersonId: null,
          propositionId: propositionId as EntityId,
          rule: JSON.parse(serialized) as PetitionRuleRow,
        });
      }
      continue;
    }
    const petition = petitions.get(key);
    if (!petition) continue;
    const outcome = tagValue(event.tags, "outcome:");
    if (event.type === RECALL_PETITION_CLOSED)
      petitions.set(key, {
        ...petition,
        phase:
          outcome === "qualified"
            ? "awaiting-election"
            : outcome === "lapsed"
              ? "lapsed"
              : "failed-to-qualify",
        electionAt: (tagValue(event.tags, "election:") as IsoDate) ?? null,
      });
    if (event.type === RECALL_ELECTION_HELD)
      petitions.set(key, {
        ...petition,
        phase:
          outcome === "removed"
            ? "removed"
            : outcome === "lapsed"
              ? "lapsed"
              : "retained",
        yes:
          tagValue(event.tags, "yes:") === null
            ? null
            : Number(tagValue(event.tags, "yes:")),
        no:
          tagValue(event.tags, "no:") === null
            ? null
            : Number(tagValue(event.tags, "no:")),
      });
  }
  return [...petitions.values()];
}

/** Compatibility projection over the same petition event reader. */
export function recallPetitions(world: World): readonly RecallPetition[] {
  return citizenPetitions(world).filter(
    (row): row is RecallPetition => row.kind === "recall",
  );
}

function openPetitionAgainst(
  world: World,
  targetPersonId: EntityId,
): RecallPetition | null {
  return (
    recallPetitions(world).find(
      (petition) =>
        petition.targetPersonId === targetPersonId &&
        (petition.phase === "circulating" ||
          petition.phase === "awaiting-election"),
    ) ?? null
  );
}

function seatOf(world: World, governmentKey: string, personId: EntityId) {
  return (
    municipalSeats(world, governmentKey).find(
      (seat) => seat.personId === personId,
    ) ?? null
  );
}

export type RecallStartCheck =
  | {
      readonly allowed: true;
      readonly rule: Extract<RecallRule, { available: true }>;
    }
  | { readonly allowed: false; readonly reason: string };

/** Whether this person may start a recall petition against this official. */
export function canStartRecallPetition(
  world: World,
  input: {
    readonly petitionerPersonId: EntityId;
    readonly governmentKey: string;
    readonly targetPersonId: EntityId;
  },
): RecallStartCheck {
  const rule = municipalRecallRule(input.governmentKey, world);
  if (!rule.available) return { allowed: false, reason: rule.reason };
  const petitioner = world.people[input.petitionerPersonId];
  if (!petitioner) return { allowed: false, reason: "No such person." };
  const jurisdictionId = municipalGovernmentJurisdictionId(
    world,
    input.governmentKey,
  );
  if (!jurisdictionId || petitioner.homeJurisdictionId !== jurisdictionId)
    return {
      allowed: false,
      reason:
        "Only someone who lives in the town can petition to recall its officials.",
    };
  if (input.petitionerPersonId === input.targetPersonId)
    return {
      allowed: false,
      reason: "An official cannot petition to recall themselves.",
    };
  if (!seatOf(world, input.governmentKey, input.targetPersonId))
    return {
      allowed: false,
      reason: "That person does not sit on the town's governing body.",
    };
  if (openPetitionAgainst(world, input.targetPersonId))
    return {
      allowed: false,
      reason: "A recall petition against this official is already under way.",
    };
  return { allowed: true, rule };
}

function eventContext() {
  return {
    location: null,
    socialContext: null,
    pressure: null,
    choice: null,
    motivation: null,
    immediateReaction: null,
  };
}

/** Starts a recall petition. Refuses with the reason when it is not allowed. */
export function startRecallPetition(
  world: World,
  input: {
    readonly petitionerPersonId: EntityId;
    readonly governmentKey: string;
    readonly targetPersonId: EntityId;
  },
): World {
  const check = canStartRecallPetition(world, input);
  if (!check.allowed) throw new Error(check.reason);
  const { rule } = check;
  const jurisdictionId = municipalGovernmentJurisdictionId(
    world,
    input.governmentKey,
  )!;
  const key = recallPetitionKey(
    input.governmentKey,
    input.targetPersonId,
    world.currentDate,
  );
  const closesAt = addDays(world.currentDate, rule.circulationDays);
  const target = world.people[input.targetPersonId]!;
  const threshold = rule.threshold
    ? ` It needs signatures from ${rule.threshold.percent}% of ${thresholdBase(rule.threshold)}.`
    : "";
  return writePetitionStart(world, {
    key,
    kind: "recall",
    jurisdictionId,
    petitionerPersonId: input.petitionerPersonId,
    subjectId: input.targetPersonId,
    governmentKey: input.governmentKey,
    closesAt,
    tags: [
      `target:${input.targetPersonId}`,
      `circulation:${rule.circulationBasis}`,
      ...(rule.threshold
        ? [
            `threshold-percent:${rule.threshold.percent}`,
            `threshold-base:${rule.threshold.base}`,
          ]
        : []),
    ],
    summary: `A petition to recall ${personName(target)} began circulating. It closes on ${closesAt}.${threshold}${rule.groundsRequired ? " The law requires stated grounds." : ""}`,
    note:
      rule.circulationBasis === "national-estimated"
        ? `The circulation window is the national modal window, ESTIMATED FROM AVERAGE; ${rule.stateUsps}'s own is not settled.`
        : `The petition circulates for ${rule.circulationDays} days under ${rule.stateUsps} law.`,
  });
}

function writePetitionStart(
  world: World,
  input: {
    readonly key: string;
    readonly kind: PetitionKind;
    readonly jurisdictionId: EntityId;
    readonly petitionerPersonId: EntityId;
    readonly subjectId: EntityId;
    readonly governmentKey: string;
    readonly closesAt: IsoDate;
    readonly tags: readonly string[];
    readonly summary: string;
    readonly note: string;
  },
): World {
  const next = recordWorldEvent(world, {
    stableKey: `${input.key}:started`,
    type: input.kind === "recall" ? RECALL_PETITION_STARTED : PETITION_STARTED,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: input.jurisdictionId,
    involvedEntityIds: [
      input.petitionerPersonId,
      input.kind === "recall" ? input.subjectId : input.jurisdictionId,
    ].sort(),
    participants: [
      {
        personId: input.petitionerPersonId,
        role: "focus:actor",
        detail:
          input.kind === "recall" ? "recall-petitioner" : "petition-circulator",
      },
      ...(input.kind === "recall"
        ? [
            {
              personId: input.subjectId,
              role: "focus:subject" as const,
              detail: "recall-target",
            },
          ]
        : []),
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      RECALL_VERSION,
      `petition-kind:${input.kind}`,
      `petition:${input.key}`,
      `government:${input.governmentKey}`,
      `petitioner:${input.petitionerPersonId}`,
      `closes:${input.closesAt}`,
      ...input.tags,
    ],
    summary: input.summary,
    context: eventContext(),
  });
  return scheduleFutureDueItem(next, {
    stableKey: `${input.key}:closes`,
    dueAt: input.closesAt,
    transitionKey: RECALL_PETITION_CLOSES,
    entityIds: [input.jurisdictionId],
    jurisdictionId: input.jurisdictionId,
    provenance: { kind: "authored", note: input.note },
  });
}

/** Official and proposition petitions share one start writer and close transition. */
export function startCitizenPetition(
  world: World,
  input:
    | {
        readonly kind: "recall";
        readonly petitionerPersonId: EntityId;
        readonly governmentKey: string;
        readonly targetPersonId: EntityId;
      }
    | {
        readonly kind: Exclude<PetitionKind, "recall">;
        readonly petitionerPersonId: EntityId;
        readonly jurisdictionId: EntityId;
        readonly stateUsps: string;
        readonly governmentKey?: string;
        readonly propositionId: EntityId;
        readonly electionDate?: IsoDate;
        readonly anchorDate?: IsoDate;
      },
): World {
  if (input.kind === "recall") return startRecallPetition(world, input);
  const rule = petitionRule(input.kind, input.stateUsps, {
    governmentKey: input.governmentKey,
    world,
  });
  const check = petitionFilingCheck(rule);
  if (!check.allowed) throw new Error(check.reason);
  if (
    !isEligibleVoterIn(
      world,
      input.petitionerPersonId,
      input.jurisdictionId,
      world.currentDate,
    )
  )
    throw new Error("Only an eligible resident may file this petition.");
  if (
    input.kind === "local-initiative" ||
    input.kind === "protest-referendum"
  ) {
    const government = input.governmentKey
      ? municipalGovernmentByKey(input.governmentKey)
      : null;
    if (
      !government ||
      government.state !== rule.stateUsps ||
      municipalGovernmentJurisdictionId(world, government.key) !==
        input.jurisdictionId
    )
      throw new Error(
        "A local petition must name its own recorded municipal government.",
      );
  } else {
    const jurisdiction = world.jurisdictions[input.jurisdictionId];
    if (
      !jurisdiction ||
      stateKeyForJurisdiction(jurisdiction) !== `US-${rule.stateUsps}`
    )
      throw new Error(
        "A state petition must name the jurisdiction governed by its rule row.",
      );
  }
  const proposition = world.policyCatalog.propositions[input.propositionId];
  if (!proposition)
    throw new Error("The petition must name a recorded proposition.");
  let closesAt: IsoDate;
  if (rule.window.kind === "election-lead") {
    if (!input.electionDate)
      throw new Error(
        "The clerk needs the lawful election date to apply this filing deadline.",
      );
    if (typeof rule.window.months === "number") {
      const date = new Date(`${input.electionDate}T00:00:00Z`);
      const day = date.getUTCDate();
      date.setUTCDate(1);
      date.setUTCMonth(date.getUTCMonth() - rule.window.months);
      const lastDay = new Date(
        Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
      ).getUTCDate();
      date.setUTCDate(Math.min(day, lastDay));
      closesAt = date.toISOString().slice(0, 10) as IsoDate;
    } else
      closesAt = addDays(input.electionDate, -Number(rule.window.days) - 1);
  } else {
    const anchor =
      rule.window.anchor === "petition-start"
        ? world.currentDate
        : input.anchorDate;
    if (!anchor)
      throw new Error(
        "The clerk needs the recorded law or session date to apply this petition window.",
      );
    closesAt = addDays(anchor, Number(rule.window.days));
  }
  if (closesAt <= world.currentDate)
    throw new Error("The petition filing window has already closed.");
  const key = `${RECALL_VERSION}:${input.kind}:${input.jurisdictionId}:${input.propositionId}:${world.currentDate}`;
  return writePetitionStart(world, {
    key,
    kind: input.kind,
    jurisdictionId: input.jurisdictionId,
    petitionerPersonId: input.petitionerPersonId,
    subjectId: input.propositionId,
    governmentKey: input.governmentKey ?? "",
    closesAt,
    tags: [
      `proposition:${input.propositionId}`,
      `rule-row:${JSON.stringify(rule)}`,
    ],
    summary: `A ${input.kind} petition on the recorded proposition began circulating. It closes on ${closesAt}. ${rule.reason}`,
    note: `${rule.source} ${rule.window.basis ?? rule.basis}`,
  });
}

/** The stable key of a petition started on this date against this official. */
export function recallPetitionKey(
  governmentKey: string,
  targetPersonId: EntityId,
  startedAt: IsoDate,
): string {
  return `${RECALL_VERSION}:${governmentKey}:${targetPersonId}:${startedAt}`;
}

/** Count only living adult residents with a dated saved view of this official. */
export function recallResidentViews(
  world: World,
  petition: Pick<RecallPetition, "jurisdictionId" | "targetPersonId">,
): {
  readonly yes: number;
  readonly no: number;
  readonly registeredVoters: number;
  readonly sourceRecordIds: readonly EntityId[];
} {
  let yes = 0;
  let no = 0;
  let registeredVoters = 0;
  const sourceRecordIds = new Set<EntityId>();
  const cutoff = {
    asOfDate: world.currentDate,
    historySequenceExclusive: world.history.nextSequence,
  };
  for (const personId of new Set(world.personOrder)) {
    const person = world.people[personId];
    if (
      !person ||
      person.homeJurisdictionId !== petition.jurisdictionId ||
      !isEligibleVoterIn(
        world,
        personId,
        petition.jurisdictionId,
        world.currentDate,
      )
    )
      continue;
    registeredVoters += 1;
    const view = viewOfOfficial(
      world,
      personId,
      petition.targetPersonId,
      cutoff,
    );
    if (view.points === 0) continue;
    if (view.points < 0) yes += 1;
    else no += 1;
    if (view.belief) sourceRecordIds.add(view.belief.id);
    else for (const row of view.rows) sourceRecordIds.add(row.id);
  }
  return { yes, no, registeredVoters, sourceRecordIds: [...sourceRecordIds] };
}

function thresholdBase(threshold: PetitionThreshold): string {
  switch (threshold.base) {
    case "registered-voters":
      return "the town's registered voters";
    case "votes-cast-for-office":
      return "the votes cast for the office";
    case "votes-cast-last-election":
      return "the votes cast at the last town election";
    case "last-gubernatorial-vote":
      return "the town's votes for governor at the last state election";
  }
}

function petitionForDue(world: World, due: FutureDueItem) {
  const key = due.stableKey.replace(/:(closes|election)$/, "");
  return citizenPetitions(world).find((p) => p.stableKey === key) ?? null;
}

function done(world: World, context: string): FutureTransitionHandlerResult {
  return {
    world,
    status: "resolved",
    reasonKey: null,
    context,
    outcomeEventId: null,
  };
}

function closingEvent(
  world: World,
  petition: RecallPetition,
  outcome: "qualified" | "failed" | "lapsed",
  electionAt: IsoDate | null,
  summary: string,
  countTags: readonly string[] = [],
): World {
  return recordWorldEvent(world, {
    stableKey: `${petition.stableKey}:closed`,
    type: RECALL_PETITION_CLOSED,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: petition.jurisdictionId,
    involvedEntityIds: [petition.targetPersonId],
    participants: [
      {
        personId: petition.targetPersonId,
        role: "focus:subject",
        detail: "recall-target",
      },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      RECALL_VERSION,
      `petition:${petition.stableKey}`,
      `outcome:${outcome}`,
      ...countTags,
      ...(electionAt ? [`election:${electionAt}`] : []),
    ],
    summary,
    context: eventContext(),
  });
}

/** The circulation window has closed: did the petition qualify? */
export function recallPetitionClosesHandler(
  world: World,
  due: FutureDueItem,
): FutureTransitionHandlerResult {
  const petition = petitionForDue(world, due);
  if (!petition || petition.phase !== "circulating")
    return done(world, "No circulating recall petition matches.");
  if (petition.kind !== "recall")
    return {
      world,
      status: "blocked",
      reasonKey: "petition:signed-record-close-pending",
      context:
        "This proposition petition is filed with its legal terms; the shared signed-record close integration is pending.",
      outcomeEventId: null,
    };
  const name = personName(world.people[petition.targetPersonId]!);
  if (!seatOf(world, petition.governmentKey, petition.targetPersonId))
    return done(
      closingEvent(
        world,
        petition,
        "lapsed",
        null,
        `The petition to recall ${name} lapsed: they no longer hold the seat.`,
      ),
      "The official left office before the petition closed.",
    );
  const startRule = municipalRecallRule(petition.governmentKey, {
    ...world,
    currentDate: petition.startedAt,
  });
  const threshold =
    petition.threshold ?? (startRule.available ? startRule.threshold : null);
  if (!threshold)
    return {
      world,
      status: "blocked",
      reasonKey: "recall:missing-legal-threshold",
      context: "The jurisdiction's recall signature threshold is not recorded.",
      outcomeEventId: null,
    };
  const counted = recallResidentViews(world, petition);
  const required = resolveRequiredSignatures(
    threshold,
    counted.registeredVoters,
  );
  const countTags = [
    `signatures:${counted.yes}`,
    `registered-voters:${counted.registeredVoters}`,
    `required-signatures:${required}`,
    `threshold-percent:${threshold.percent}`,
    `threshold-base:${threshold.base}`,
    "signature-mechanism:recorded-recall-supporters",
    "count-base:registered-voters",
    ...counted.sourceRecordIds.map((id) => `view-source:${id}`),
  ];
  if (counted.registeredVoters === 0 || counted.yes < required)
    return done(
      closingEvent(
        world,
        petition,
        "failed",
        null,
        `The petition to recall ${name} failed to qualify: ${counted.yes} recorded supporters, ${required} required from ${counted.registeredVoters} registered residents.`,
        countTags,
      ),
      "Recorded recall supporters fell short of the jurisdiction's threshold.",
    );
  const government = municipalGovernmentByKey(petition.governmentKey);
  const election =
    government?.placeGeoid && startRule.available
      ? nextTownElection(
          startRule.stateUsps,
          government.placeGeoid,
          world.currentDate,
        )
      : null;
  if (!election)
    return {
      world,
      status: "blocked",
      reasonKey: "recall:missing-election-calendar",
      context:
        "Recorded supporters meet the threshold, but the town's election date is not sourced.",
      outcomeEventId: null,
    };
  const electionAt = election.electionDate;
  const closed = closingEvent(
    world,
    petition,
    "qualified",
    electionAt,
    `The petition to recall ${name} qualified: ${counted.yes} recorded supporters, ${required} required from ${counted.registeredVoters} registered residents. The vote is scheduled for the town's sourced election date, ${electionAt}.`,
    countTags,
  );
  return done(
    scheduleFutureDueItem(closed, {
      stableKey: `${petition.stableKey}:election`,
      dueAt: electionAt,
      transitionKey: RECALL_ELECTION,
      entityIds: [petition.jurisdictionId],
      jurisdictionId: petition.jurisdictionId,
      provenance: {
        kind: "authored",
        note: `Recall scheduled through the town election calendar (${election.basis}).`,
      },
    }),
    "The recall petition qualified on recorded supporters and registered residents.",
  );
}

/** Election day: keep the official, or remove them. */
export function recallElectionHandler(
  world: World,
  due: FutureDueItem,
): FutureTransitionHandlerResult {
  const petition = petitionForDue(world, due);
  if (
    !petition ||
    petition.kind !== "recall" ||
    petition.phase !== "awaiting-election"
  )
    return done(world, "No recall election matches.");
  const name = personName(world.people[petition.targetPersonId]!);
  const seat = seatOf(world, petition.governmentKey, petition.targetPersonId);
  const counted = recallResidentViews(world, petition);
  const held = (
    next: World,
    outcome: "removed" | "retained" | "lapsed",
    summary: string,
    tally: readonly [number, number] | null,
  ) =>
    recordWorldEvent(next, {
      stableKey: `${petition.stableKey}:election-held`,
      type: RECALL_ELECTION_HELD,
      occurredAt: next.currentDate,
      recordedAt: next.currentDate,
      jurisdictionId: petition.jurisdictionId,
      involvedEntityIds: [petition.targetPersonId],
      participants: [
        {
          personId: petition.targetPersonId,
          role: "focus:subject",
          detail: "recall-target",
        },
      ],
      personFactConstraints: [],
      visibility: "public",
      tags: [
        RECALL_VERSION,
        `petition:${petition.stableKey}`,
        `outcome:${outcome}`,
        ...(tally
          ? counted.sourceRecordIds.map((id) => `view-source:${id}`)
          : []),
        ...(tally ? [`yes:${tally[0]}`, `no:${tally[1]}`] : []),
      ],
      summary,
      context: eventContext(),
    });
  if (!seat)
    return done(
      held(
        world,
        "lapsed",
        `The recall of ${name} was not held: they no longer hold the seat.`,
        null,
      ),
      "The official left office before the election.",
    );
  const { yes, no } = counted;
  if (yes + no === 0)
    return {
      world,
      status: "blocked",
      reasonKey: "recall:no-recorded-resident-views",
      context:
        "No living adult resident has a recorded support or opposition view of this official. No recall count or turnout is inferred.",
      outcomeEventId: null,
    };
  const percent = (count: number) =>
    `${((count / (yes + no)) * 100).toFixed(1)}%`;
  if (yes <= no)
    return done(
      held(
        world,
        "retained",
        `Recorded resident views favored keeping ${name}: ${no} against recall (${percent(no)}), ${yes} for it (${percent(yes)}).`,
        [yes, no],
      ),
      "The official was retained.",
    );
  let next = held(
    world,
    "removed",
    `Recorded resident views favored recalling ${name}: ${yes} for recall (${percent(yes)}), ${no} against (${percent(no)}). The seat is empty until the town's next regular election.`,
    [yes, no],
  );
  const previous = organizationParticipationStateHistory(
    next,
    seat.participationId,
  ).at(-1)!;
  next = recordOrganizationParticipationState(next, {
    stableKey: `${petition.stableKey}:seat-ended`,
    participationId: seat.participationId,
    effectiveAt: next.currentDate,
    status: "ended",
    roleKind: previous.roleKind,
    context: "Removed by recall.",
    provenance: {
      kind: "simulated-event",
      eventId: next.history.events.at(-1)!.id,
    },
    supersedesStateId: previous.id,
  });
  return done(next, "The official was removed by recall.");
}

export function recallHandlers() {
  return [
    [RECALL_PETITION_CLOSES, recallPetitionClosesHandler],
    [RECALL_ELECTION, recallElectionHandler],
  ] as const;
}
