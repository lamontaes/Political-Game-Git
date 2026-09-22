import { addDays } from "../dates";
import { scheduleFutureDueItem } from "../future-transitions";
import { personName } from "../people";
import { recordEventKnowledge } from "../records";
import type {
  EntityId,
  EventParticipant,
  FutureDueItem,
  FutureTransitionHandlerResult,
  IsoDate,
  World,
} from "../types";
import { recordWorldEvent } from "../world";
import { PRESS_MATTER_TAG, sortedUnique } from "./shared";
import { applyFindingConsequences } from "./finding-consequences";
import {
  canInstitutionAct,
  type AccountableInstitution,
} from "./governing-adapter";
import {
  PRESS_CONTRACT_VERSION,
  type MatterProceedingRecord,
  type ProcedureKey,
  type ProceedingOutcome,
  type ProceedingStepRecord,
} from "./records";
import {
  appendPressRecord,
  pressRecordsOfKind,
  requirePressRecord,
} from "./store";
import {
  generatedStateOversightBody,
  type GeneratedStateOversightBody,
} from "./generated-state-oversight";
import {
  ethicsInstitutionKey,
  STATE_LEGISLATIVE_ETHICS_BODIES,
  type StateLegislativeEthicsBody,
} from "./state-ethics-bodies";

/**
 * Jurisdiction-specific procedure adapters (ALIVE44 chunk 4). There is no
 * universal scandal machine: each adapter names its own steps, deadlines and
 * confidentiality, and says which deadlines come from a rule and which are
 * authored waiting intervals. A complaint, a notice or a reason-to-believe
 * determination is never a finding of wrongdoing.
 */

export const PRESS_PROCEEDING_TRANSITION_KEY = "press:proceeding-step";
export const PROCEEDING_TAG = "press46.proceeding:";

export const SIMULATED_INQUIRY_DISCLOSURE =
  "Simulated inquiry: the game has no researched procedure or sanction power for this office. This review can request records and issue a report. It cannot convict, fine, discipline or remove anyone.";

interface StepPlan {
  readonly step: string;
  readonly summary: (context: StepContext) => string;
  readonly publicStep: boolean;
  readonly outcome: ProceedingOutcome | null;
  readonly closes: boolean;
  /** Days until the next step, and whether a rule or an author set them. */
  readonly next: {
    readonly days: number;
    readonly basis: "rule" | "authored";
  } | null;
  /** Whether respondents learn of this step directly. */
  readonly respondentsNotified: boolean;
  readonly action: Parameters<typeof canInstitutionAct>[1]["action"] | null;
}

interface StepContext {
  readonly institution: string;
  readonly respondents: string;
  readonly supported: boolean;
}

interface ProcedureDefinition {
  readonly key: ProcedureKey;
  readonly institutionLabel: string;
  /** The body's own name where it depends on the matter's state. */
  readonly institutionLabelFor?: (
    world: World,
    jurisdictionId: EntityId | null,
  ) => string;
  readonly institution: AccountableInstitution | null;
  readonly confidentialWhilePending: boolean;
  readonly sourceRefs: readonly string[];
  /** The next step after `previous`, given what the institution holds. */
  readonly after: (
    previous: ProceedingStepRecord | null,
    supported: boolean,
    world: World,
    proceeding: MatterProceedingRecord,
  ) => StepPlan | null;
}

const FEC: ProcedureDefinition = {
  key: "fec-enforcement",
  institutionLabel: "Federal Election Commission",
  institution: "fec",
  confidentialWhilePending: true,
  sourceRefs: [
    "https://www.fec.gov/legal-resources/enforcement/complaints-process/how-to-file-complaint-with-fec/",
    "https://www.fec.gov/legal-resources/enforcement/",
  ],
  after(previous, supported) {
    switch (previous?.step ?? null) {
      case null:
        return {
          step: "complaint-received",
          summary: (c) =>
            `The ${c.institution} received a sworn complaint naming ${c.respondents}. A complaint is an allegation, not a finding.`,
          publicStep: false,
          outcome: null,
          closes: false,
          next: { days: 5, basis: "authored" },
          respondentsNotified: false,
          action: "receive-complaint",
        };
      case "complaint-received":
        return {
          step: "respondent-notified",
          summary: (c) =>
            `The ${c.institution} notified ${c.respondents} of the complaint and of the opportunity to respond within 15 days.`,
          publicStep: false,
          outcome: null,
          closes: false,
          next: { days: 15, basis: "rule" },
          respondentsNotified: true,
          action: null,
        };
      case "respondent-notified":
        return {
          step: "response-period-closed",
          summary: (c) =>
            `The 15-day response period for ${c.respondents} closed.`,
          publicStep: false,
          outcome: null,
          closes: false,
          next: { days: 60, basis: "authored" },
          respondentsNotified: true,
          action: null,
        };
      case "response-period-closed":
        return supported
          ? {
              step: "reason-to-believe",
              summary: (c) =>
                `The ${c.institution} found reason to believe a violation may have occurred and opened an investigation. This is not a finding that a violation occurred.`,
              publicStep: false,
              outcome: "reason-to-believe",
              closes: false,
              next: { days: 90, basis: "authored" },
              respondentsNotified: true,
              action: "open-inquiry",
            }
          : {
              step: "no-reason-to-believe",
              summary: (c) =>
                `The ${c.institution} found no reason to believe a violation occurred.`,
              publicStep: false,
              outcome: "no-reason-to-believe",
              closes: false,
              next: { days: 30, basis: "authored" },
              respondentsNotified: true,
              action: "dismiss",
            };
      case "reason-to-believe":
        return {
          step: "conciliation",
          summary: (c) =>
            `The ${c.institution} and ${c.respondents} entered a conciliation agreement. This game does not model the civil-penalty amount.`,
          publicStep: false,
          outcome: "conciliation",
          closes: false,
          next: { days: 30, basis: "authored" },
          respondentsNotified: true,
          action: "issue-finding",
        };
      case "no-reason-to-believe":
        return {
          step: "file-released",
          summary: (c) =>
            `The ${c.institution} closed its file on the complaint against ${c.respondents} and made it public. The Commission found no reason to believe a violation occurred, and the matter was dismissed.`,
          publicStep: true,
          outcome: "dismissed",
          closes: true,
          next: null,
          respondentsNotified: true,
          action: "dismiss",
        };
      case "conciliation":
        return {
          step: "file-released",
          summary: (c) =>
            `The ${c.institution} closed its file on ${c.respondents} and made it public. The file records a conciliation agreement.`,
          publicStep: true,
          outcome: "conciliation",
          closes: true,
          next: null,
          respondentsNotified: true,
          action: "issue-finding",
        };
      default:
        return null;
    }
  },
};

const KLEC: ProcedureDefinition = {
  key: "ky-legislative-ethics",
  institutionLabel: "Kentucky Legislative Ethics Commission",
  institution: "state-legislative-ethics:ky",
  confidentialWhilePending: true,
  sourceRefs: [
    "https://klec.ky.gov/Forms/Pages/Complaints-and-Investigations.aspx",
    "https://apps.legislature.ky.gov/law/statutes/statute.aspx?id=55533",
    "https://apps.legislature.ky.gov/law/kar/titles/002/002/050/",
  ],
  after(previous, supported, world, proceeding) {
    switch (previous?.step ?? null) {
      case null:
        return {
          step: "complaint-received",
          summary: (c) =>
            `The ${c.institution} received a sworn complaint naming ${c.respondents}. A complaint is an allegation, not a finding.`,
          publicStep: false,
          outcome: null,
          closes: false,
          next: { days: 10, basis: "rule" },
          respondentsNotified: false,
          action: "receive-complaint",
        };
      case "complaint-received":
        return {
          step: "complaint-served",
          summary: (c) =>
            `The ${c.institution} served the complaint on ${c.respondents}, who may answer within 20 days.`,
          publicStep: false,
          outcome: null,
          closes: false,
          next: { days: 20, basis: "rule" },
          respondentsNotified: true,
          action: null,
        };
      case "complaint-served":
        return {
          step: "answer-period-closed",
          summary: (c) =>
            `The 20-day answer period for ${c.respondents} closed.`,
          publicStep: false,
          outcome: null,
          closes: false,
          next: { days: 45, basis: "authored" },
          respondentsNotified: true,
          action: null,
        };
      case "answer-period-closed":
        return supported
          ? {
              step: "preliminary-inquiry",
              summary: (c) =>
                `The ${c.institution} found reason to believe further inquiry is warranted and opened a confidential preliminary inquiry. This is not a finding.`,
              publicStep: false,
              outcome: "reason-to-believe",
              closes: false,
              next: { days: 60, basis: "authored" },
              respondentsNotified: true,
              action: "open-inquiry",
            }
          : {
              step: "dismissed",
              summary: (c) =>
                `The ${c.institution} dismissed the complaint against ${c.respondents}.`,
              publicStep: false,
              outcome: "dismissed",
              closes: true,
              next: null,
              respondentsNotified: true,
              action: "dismiss",
            };
      case "preliminary-inquiry": {
        if (!supported) {
          return {
            step: "dismissed",
            summary: (c) =>
              `The ${c.institution} ended its preliminary inquiry and dismissed the complaint against ${c.respondents}.`,
            publicStep: false,
            outcome: "dismissed",
            closes: true,
            next: null,
            respondentsNotified: true,
            action: "dismiss",
          };
        }
        const deliberate = proceedingOccurrenceIntentional(world, proceeding);
        return deliberate
          ? {
              step: "adjudicatory-hearing-ordered",
              summary: (c) =>
                `The ${c.institution} found probable cause and ordered an adjudicatory hearing for ${c.respondents}. Probable cause is not a final finding.`,
              publicStep: true,
              outcome: "probable-cause",
              closes: false,
              next: { days: 60, basis: "authored" },
              respondentsNotified: true,
              action: "open-inquiry",
            }
          : {
              step: "confidential-reprimand",
              summary: (c) =>
                `The ${c.institution} found probable cause and, citing mitigating circumstances, issued ${c.respondents} a confidential reprimand.`,
              publicStep: false,
              outcome: "confidential-reprimand",
              closes: true,
              next: null,
              respondentsNotified: true,
              action: "reprimand",
            };
      }
      case "adjudicatory-hearing-ordered":
        return {
          step: "final-order",
          summary: (c) =>
            `After an adjudicatory hearing, the ${c.institution} issued a final order finding that ${c.respondents} violated the ethics code.`,
          publicStep: true,
          outcome: "finding",
          closes: true,
          next: null,
          respondentsNotified: true,
          action: "issue-finding",
        };
      default:
        return null;
    }
  },
};

const SIMULATED: ProcedureDefinition = {
  key: "simulated-inquiry",
  institutionLabel: "oversight office (simulated)",
  institution: null,
  confidentialWhilePending: true,
  sourceRefs: [],
  after(previous, supported) {
    switch (previous?.step ?? null) {
      case null:
        return {
          step: "inquiry-opened",
          summary: (c) =>
            `A simulated oversight review of the account concerning ${c.respondents} began. ${SIMULATED_INQUIRY_DISCLOSURE}`,
          publicStep: false,
          outcome: null,
          closes: false,
          next: { days: 30, basis: "authored" },
          respondentsNotified: true,
          action: null,
        };
      case "inquiry-opened":
        return {
          step: "report-issued",
          summary: (c) =>
            supported
              ? `A simulated oversight review issued a report describing records that support the account concerning ${c.respondents}. The review has no power to discipline anyone.`
              : `A simulated oversight review issued a report finding no records that support the account concerning ${c.respondents}.`,
          publicStep: true,
          outcome: supported ? "report-issued" : "dismissed",
          closes: true,
          next: null,
          respondentsNotified: true,
          action: null,
        };
      default:
        return null;
    }
  },
};

/**
 * Steps for a state whose ethics body is researched but whose timeline is not.
 *
 * The 2026-09-22 routing research read each state's own sources for who hears
 * a complaint, what the state calls the proceeding and which instrument says
 * so. It deliberately did not read answer periods, inquiry deadlines or
 * sanction powers, and it warned in as many words that filing, investigation,
 * findings, publicity and sanctions are not the same event.
 *
 * So every interval below is `authored` and none is `rule`: the body is real
 * and named, the calendar is the game's. The last step stops at findings and
 * says the sanction is decided elsewhere, because for most of these states it
 * is — the chamber, not the commission, does the punishing — and nothing in
 * the research establishes how.
 *
 * Borrowing Kentucky's ten-day service and twenty-day answer period for the
 * other twenty-three would have read as researched law and been false.
 */
function stateLegislativeEthicsDefinition(
  body: StateLegislativeEthicsBody,
): ProcedureDefinition {
  const proceeding = body.proceedingTerm.split(" / ")[0]!.toLowerCase();
  return {
    key: body.procedureKey,
    institutionLabel: body.intakeBody,
    institution: ethicsInstitutionKey(body),
    confidentialWhilePending: true,
    sourceRefs: body.sourceRefs,
    after(previous, supported) {
      switch (previous?.step ?? null) {
        case null:
          return {
            step: "complaint-received",
            summary: (c) =>
              `The ${c.institution} received a ${proceeding} naming ${c.respondents}. A complaint is an allegation, not a finding.`,
            publicStep: false,
            outcome: null,
            closes: false,
            next: { days: 14, basis: "authored" },
            respondentsNotified: false,
            action: "receive-complaint",
          };
        case "complaint-received":
          return {
            step: "respondent-notified",
            summary: (c) =>
              `The ${c.institution} notified ${c.respondents} of the complaint and of the opportunity to answer it.`,
            publicStep: false,
            outcome: null,
            closes: false,
            next: { days: 21, basis: "authored" },
            respondentsNotified: true,
            action: null,
          };
        case "respondent-notified":
          return {
            step: "response-period-closed",
            summary: (c) => `The answer period for ${c.respondents} closed.`,
            publicStep: false,
            outcome: null,
            closes: false,
            next: { days: 45, basis: "authored" },
            respondentsNotified: true,
            action: null,
          };
        case "response-period-closed":
          return supported
            ? {
                step: "preliminary-inquiry",
                summary: (c) =>
                  `The ${c.institution} found reason to believe further inquiry is warranted and opened one. This is not a finding.`,
                publicStep: false,
                outcome: "reason-to-believe",
                closes: false,
                next: { days: 60, basis: "authored" },
                respondentsNotified: true,
                action: "open-inquiry",
              }
            : {
                step: "dismissed",
                summary: (c) =>
                  `The ${c.institution} dismissed the complaint against ${c.respondents}.`,
                publicStep: false,
                outcome: "dismissed",
                closes: true,
                next: null,
                respondentsNotified: true,
                action: "dismiss",
              };
        case "preliminary-inquiry":
          return supported
            ? {
                step: "findings-issued",
                summary: (c) =>
                  `The ${c.institution} completed its inquiry into ${c.respondents} and issued its findings. Whether anyone is disciplined is decided separately, and this game does not model that step.`,
                publicStep: true,
                outcome: "finding",
                closes: true,
                next: null,
                respondentsNotified: true,
                action: "issue-finding",
              }
            : {
                step: "dismissed",
                summary: (c) =>
                  `The ${c.institution} ended its inquiry and dismissed the complaint against ${c.respondents}.`,
                publicStep: false,
                outcome: "dismissed",
                closes: true,
                next: null,
                respondentsNotified: true,
                action: "dismiss",
              };
        default:
          return null;
      }
    },
  };
}

/**
 * A state oversight body generated from an UNRESEARCHED range
 * (`generated-state-oversight.ts`): a realistic name and calendar drawn once
 * per state. It can open a matter from its own review of filed reports, with
 * no complainant, and it can issue findings; `finding-consequences.ts` reads
 * the same body for the civil penalty. The intervals are authored, not rule.
 */
function generatedBodyFor(
  world: World,
  proceeding: MatterProceedingRecord,
): GeneratedStateOversightBody | null {
  return generatedStateOversightBody(
    world,
    requirePressRecord(world, "matter", proceeding.matterId).jurisdictionId,
  );
}

const GENERATED_STATE_OVERSIGHT: ProcedureDefinition = {
  key: "generated-state-oversight",
  institutionLabel: "state oversight body",
  institutionLabelFor: (world, jurisdictionId) =>
    generatedStateOversightBody(world, jurisdictionId)?.name ??
    "state oversight body",
  institution: null,
  confidentialWhilePending: true,
  sourceRefs: [],
  after(previous, supported, world, proceeding) {
    const days =
      generatedBodyFor(world, proceeding)?.intervalDays ??
      UNRESEARCHED_STATE_OVERSIGHT_FALLBACK_DAYS;
    switch (previous?.step ?? null) {
      case null:
        return proceeding.complainantPersonId
          ? {
              step: "complaint-received",
              summary: (c) =>
                `The ${c.institution} received a complaint naming ${c.respondents}. A complaint is an allegation, not a finding.`,
              publicStep: false,
              outcome: null,
              closes: false,
              next: { days: days.intake, basis: "authored" },
              respondentsNotified: false,
              action: null,
            }
          : {
              step: "review-opened",
              summary: (c) =>
                `The ${c.institution}'s review of filed campaign reports flagged payments to ${c.respondents} and opened a matter of its own. This is not a finding.`,
              publicStep: false,
              outcome: null,
              closes: false,
              next: { days: days.intake, basis: "authored" },
              respondentsNotified: false,
              action: null,
            };
      case "complaint-received":
      case "review-opened":
        return {
          step: "respondent-notified",
          summary: (c) =>
            `The ${c.institution} notified ${c.respondents} of the matter and of the opportunity to answer it.`,
          publicStep: false,
          outcome: null,
          closes: false,
          next: { days: days.notice, basis: "authored" },
          respondentsNotified: true,
          action: null,
        };
      case "respondent-notified":
        return {
          step: "response-period-closed",
          summary: (c) => `The answer period for ${c.respondents} closed.`,
          publicStep: false,
          outcome: null,
          closes: false,
          next: { days: days.answer, basis: "authored" },
          respondentsNotified: true,
          action: null,
        };
      case "response-period-closed":
        return supported
          ? {
              step: "preliminary-inquiry",
              summary: (c) =>
                `The ${c.institution} found reason to believe further inquiry is warranted and opened one. This is not a finding.`,
              publicStep: false,
              outcome: "reason-to-believe",
              closes: false,
              next: { days: days.inquiry, basis: "authored" },
              respondentsNotified: true,
              action: null,
            }
          : {
              step: "dismissed",
              summary: (c) =>
                `The ${c.institution} dismissed the matter against ${c.respondents}.`,
              publicStep: false,
              outcome: "dismissed",
              closes: true,
              next: null,
              respondentsNotified: true,
              action: null,
            };
      case "preliminary-inquiry":
        return supported
          ? {
              step: "findings-issued",
              summary: (c) =>
                `The ${c.institution} completed its inquiry and issued findings against ${c.respondents}.`,
              publicStep: true,
              outcome: "finding",
              closes: true,
              next: null,
              respondentsNotified: true,
              action: null,
            }
          : {
              step: "dismissed",
              summary: (c) =>
                `The ${c.institution} ended its inquiry and dismissed the matter against ${c.respondents}.`,
              publicStep: false,
              outcome: "dismissed",
              closes: true,
              next: null,
              respondentsNotified: true,
              action: null,
            };
      default:
        return null;
    }
  },
};

/** Only for a matter whose state the World cannot name; the range midpoints. */
const UNRESEARCHED_STATE_OVERSIGHT_FALLBACK_DAYS = {
  intake: 14,
  notice: 21,
  answer: 40,
  inquiry: 75,
} as const;

const DEFINITIONS = Object.fromEntries([
  ...[FEC, KLEC, SIMULATED, GENERATED_STATE_OVERSIGHT].map((definition) => [
    definition.key,
    definition,
  ]),
  ...STATE_LEGISLATIVE_ETHICS_BODIES.map((body) => [
    body.procedureKey,
    stateLegislativeEthicsDefinition(body),
  ]),
]) as Readonly<Record<ProcedureKey, ProcedureDefinition>>;

export function procedureDefinition(key: ProcedureKey) {
  const definition = DEFINITIONS[key];
  return {
    key: definition.key,
    institutionLabel: definition.institutionLabel,
    confidentialWhilePending: definition.confidentialWhilePending,
    sourceRefs: definition.sourceRefs,
  };
}

function proceedingOccurrenceIntentional(
  world: World,
  proceeding: MatterProceedingRecord,
): boolean {
  const matter = requirePressRecord(world, "matter", proceeding.matterId);
  if (!matter.occurrenceId) return false;
  return requirePressRecord(world, "financial-occurrence", matter.occurrenceId)
    .intentional;
}

export function proceedingSteps(
  world: World,
  proceedingId: EntityId,
): readonly ProceedingStepRecord[] {
  return pressRecordsOfKind(world, "proceeding-step").filter(
    (step) => step.proceedingId === proceedingId,
  );
}

/**
 * Whether the institution holds records supporting the allegation. Only an
 * actual occurrence of the alleged family, with its own record evidence,
 * supports it; an allegation with nothing underneath never does.
 */
export function institutionHoldsSupport(
  world: World,
  proceeding: MatterProceedingRecord,
): { readonly supported: boolean; readonly evidenceIds: readonly EntityId[] } {
  const matter = requirePressRecord(world, "matter", proceeding.matterId);
  const links = pressRecordsOfKind(world, "matter-evidence-link").filter(
    (link) => link.matterId === matter.id,
  );
  if (!matter.occurrenceId) {
    return {
      supported: false,
      evidenceIds: links
        .filter((link) => link.bearing !== "supports")
        .map((link) => link.evidenceArtifactId),
    };
  }
  const occurrence = requirePressRecord(
    world,
    "financial-occurrence",
    matter.occurrenceId,
  );
  return {
    supported: occurrence.recordEvidenceArtifactIds.length > 0,
    evidenceIds: sortedUnique([
      ...occurrence.recordEvidenceArtifactIds,
      ...links.map((link) => link.evidenceArtifactId),
    ]),
  };
}

export interface OpenProceedingInput {
  readonly stableKey: string;
  readonly matterId: EntityId;
  readonly procedureKey: ProcedureKey;
  readonly complainantPersonId: EntityId | null;
  readonly respondentPersonIds: readonly EntityId[];
  readonly openingEventId: EntityId;
}

export function openProceeding(
  world: World,
  input: OpenProceedingInput,
): { readonly world: World; readonly proceeding: MatterProceedingRecord } {
  const definition = DEFINITIONS[input.procedureKey];
  const appended = appendPressRecord(world, "matter-proceeding", {
    stableKey: input.stableKey,
    matterId: input.matterId,
    procedureKey: input.procedureKey,
    institutionLabel:
      definition.institutionLabelFor?.(
        world,
        requirePressRecord(world, "matter", input.matterId).jurisdictionId,
      ) ?? definition.institutionLabel,
    complainantPersonId: input.complainantPersonId,
    respondentPersonIds: sortedUnique(input.respondentPersonIds),
    openedAt: world.currentDate,
    openingEventId: input.openingEventId,
    confidentialWhilePending: definition.confidentialWhilePending,
    simulatedDisclosure:
      input.procedureKey === "simulated-inquiry"
        ? SIMULATED_INQUIRY_DISCLOSURE
        : null,
  });
  const next = advanceProceeding(appended.world, appended.record.id);
  return { world: next.world, proceeding: appended.record };
}

/**
 * Writes the proceeding's next step, if the adapter has one and the
 * institution has authority for it, and schedules the step after it.
 */
export function advanceProceeding(
  inputWorld: World,
  proceedingId: EntityId,
): { readonly world: World; readonly step: ProceedingStepRecord | null } {
  let world = inputWorld;
  const proceeding = requirePressRecord(
    world,
    "matter-proceeding",
    proceedingId,
  );
  const definition = DEFINITIONS[proceeding.procedureKey];
  const steps = proceedingSteps(world, proceeding.id);
  const previous = steps.at(-1) ?? null;
  if (previous?.closes) return { world, step: null };
  const support = institutionHoldsSupport(world, proceeding);
  const plan = definition.after(previous, support.supported, world, proceeding);
  if (!plan) return { world, step: null };
  if (plan.action && definition.institution) {
    const answer = canInstitutionAct(world, {
      institution: definition.institution,
      action: plan.action,
      subjectPersonId: proceeding.respondentPersonIds[0]!,
      onDate: world.currentDate,
    });
    if (answer.status !== "available") return { world, step: null };
  }
  if (
    plan.step === "response-period-closed" ||
    plan.step === "answer-period-closed"
  ) {
    world = recordDelegatedResponses(world, proceeding);
  }
  const respondents = proceeding.respondentPersonIds
    .map((id) => world.people[id])
    .filter((person) => person !== undefined)
    .map((person) => personName(person))
    .join(" and ");
  const summary = plan.summary({
    institution: proceeding.institutionLabel,
    respondents: respondents || "the respondent",
    supported: support.supported,
  });
  const participants: EventParticipant[] = [
    ...proceeding.respondentPersonIds.map((personId) => ({
      personId,
      role: "focus:respondent" as const,
      detail: "Named as respondent",
    })),
    ...(proceeding.complainantPersonId
      ? [
          {
            personId: proceeding.complainantPersonId,
            role: "observation:complainant" as const,
            detail: "Filed the complaint",
          },
        ]
      : []),
  ];
  const decisive =
    plan.outcome === "reason-to-believe" ||
    plan.outcome === "no-reason-to-believe" ||
    plan.outcome === "conciliation" ||
    plan.outcome === "finding" ||
    plan.outcome === "probable-cause" ||
    plan.outcome === "report-issued" ||
    (plan.outcome === "dismissed" &&
      proceeding.procedureKey !== "fec-enforcement");
  const evidenceIds = decisive ? support.evidenceIds : [];
  let next = recordWorldEvent(world, {
    stableKey: `${proceeding.stableKey}:step:${steps.length}`,
    type: `matter.${plan.step}`,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: requirePressRecord(world, "matter", proceeding.matterId)
      .jurisdictionId,
    involvedEntityIds: sortedUnique([
      ...proceeding.respondentPersonIds,
      ...(proceeding.complainantPersonId
        ? [proceeding.complainantPersonId]
        : []),
      ...evidenceIds,
      proceeding.id,
    ]),
    participants,
    personFactConstraints: [],
    visibility: plan.publicStep ? "public" : "limited",
    tags: [
      PRESS_CONTRACT_VERSION,
      `${PRESS_MATTER_TAG}${proceeding.matterId}`,
      `${PROCEEDING_TAG}${proceeding.id}`,
      `procedure:${proceeding.procedureKey}`,
      ...(plan.outcome ? [`procedure.outcome:${plan.outcome}`] : []),
    ],
    summary,
    context: {
      location: null,
      socialContext: proceeding.institutionLabel,
      pressure: plan.next
        ? `${plan.next.basis === "rule" ? "Rule deadline" : "Authored waiting interval"}: ${plan.next.days} days.`
        : null,
      choice: null,
      motivation:
        proceeding.simulatedDisclosure ??
        (definition.sourceRefs.join(" ") || null),
      immediateReaction: null,
    },
  });
  const event = next.history.events.at(-1)!;
  if (plan.respondentsNotified || plan.publicStep) {
    const told = [
      ...proceeding.respondentPersonIds,
      ...(proceeding.complainantPersonId
        ? [proceeding.complainantPersonId]
        : []),
    ];
    for (const personId of sortedUnique(told)) {
      if (!next.people[personId]) continue;
      next = recordEventKnowledge(next, {
        stableKey: `${event.stableKey}:notice:${personId}`,
        personId,
        eventId: event.id,
        learnedAt: next.currentDate,
        believedSummary: summary,
        accuracy: "accurate",
        confidence: "high",
        source: {
          kind: "public-record",
          reference: proceeding.institutionLabel,
        },
      });
    }
  }
  const nextDueAt: IsoDate | null = plan.next
    ? addDays(next.currentDate, plan.next.days)
    : null;
  const appended = appendPressRecord(next, "proceeding-step", {
    stableKey: `${proceeding.stableKey}:step-record:${steps.length}`,
    proceedingId: proceeding.id,
    step: plan.step,
    at: next.currentDate,
    eventId: event.id,
    nextDueAt,
    nextDueBasis: plan.next?.basis ?? null,
    outcome: plan.outcome,
    closes: plan.closes,
    publicStep: plan.publicStep,
    evidenceArtifactIds: evidenceIds,
  });
  next = appended.world;
  for (const evidenceId of evidenceIds) {
    const alreadyLinked = pressRecordsOfKind(next, "matter-evidence-link").some(
      (link) =>
        link.matterId === proceeding.matterId &&
        link.evidenceArtifactId === evidenceId,
    );
    if (alreadyLinked) continue;
    next = appendPressRecord(next, "matter-evidence-link", {
      stableKey: `${proceeding.stableKey}:evidence:${evidenceId}`,
      matterId: proceeding.matterId,
      evidenceArtifactId: evidenceId,
      bearing: support.supported ? "supports" : "contradicts",
      linkedAt: next.currentDate,
    }).world;
  }
  next = applyFindingConsequences(next, proceeding, appended.record, event);
  if (nextDueAt) {
    next = scheduleFutureDueItem(next, {
      stableKey: `press46:proceeding:${proceeding.id}:${steps.length + 1}`,
      dueAt: nextDueAt,
      transitionKey: PRESS_PROCEEDING_TRANSITION_KEY,
      entityIds: sortedUnique([
        proceeding.openingEventId,
        ...proceeding.respondentPersonIds,
      ]),
      jurisdictionId: null,
      provenance: { kind: "simulated", sourceEntityIds: [event.id] },
    });
  }
  return { world: next, step: appended.record };
}

/**
 * Investigations are mostly delegated: a respondent who made no choice has
 * counsel file a response. Nothing in it is quoted or claimed.
 */
function recordDelegatedResponses(
  world: World,
  proceeding: MatterProceedingRecord,
): World {
  let next = world;
  for (const personId of proceeding.respondentPersonIds) {
    const key = `${proceeding.stableKey}:respondent-choice:${personId}`;
    if (next.history.events.some((event) => event.stableKey === key)) continue;
    if (!next.people[personId]) continue;
    next = recordWorldEvent(next, {
      stableKey: key,
      type: "matter.response-filed",
      occurredAt: next.currentDate,
      recordedAt: next.currentDate,
      jurisdictionId: null,
      involvedEntityIds: sortedUnique([personId, proceeding.id]),
      participants: [
        {
          personId,
          role: "agency:respondent",
          detail: "Counsel filed a response on the respondent's behalf",
        },
      ],
      personFactConstraints: [],
      visibility: "limited",
      tags: [
        PRESS_CONTRACT_VERSION,
        `${PRESS_MATTER_TAG}${proceeding.matterId}`,
        "press.delegated",
      ],
      summary: `Counsel filed a response to the ${proceeding.institutionLabel} on ${personName(next.people[personId]!)}'s behalf.`,
      context: {
        location: null,
        socialContext: proceeding.institutionLabel,
        pressure: null,
        choice: "counsel-responds",
        motivation: "Delegated by default.",
        immediateReaction: null,
      },
    });
  }
  return next;
}

export function pressProceedingStepHandler(
  world: World,
  dueItem: FutureDueItem,
): FutureTransitionHandlerResult {
  if (dueItem.transitionKey !== PRESS_PROCEEDING_TRANSITION_KEY) {
    throw new Error("The proceeding handler received another transition.");
  }
  const rest = dueItem.stableKey.slice("press46:proceeding:".length);
  const proceedingId = rest.slice(0, rest.lastIndexOf(":")) as EntityId;
  const exists = pressRecordsOfKind(world, "matter-proceeding").some(
    (record) => record.id === proceedingId,
  );
  if (!exists) {
    return {
      world,
      status: "cancelled",
      reasonKey: "press:proceeding-missing",
      context: null,
      outcomeEventId: null,
    };
  }
  const advanced = advanceProceeding(world, proceedingId);
  return {
    world: advanced.world,
    status: advanced.step ? "resolved" : "cancelled",
    reasonKey: advanced.step
      ? `press:proceeding-${advanced.step.step}`
      : "press:proceeding-no-authorized-step",
    context: null,
    outcomeEventId: advanced.step?.eventId ?? null,
  };
}
