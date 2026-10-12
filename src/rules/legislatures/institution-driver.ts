import {
  admitLocalFiscalMeasure,
  type LocalFiscalFacts,
} from "./local-fiscal-admission";
import { typedTaxEnactmentDate } from "./enactment-date";
import type { SeatedBody } from "../../simulation/legislation-scenarios";
import type {
  EntityId,
  LegislativeProvisionRecord,
  FutureDueItem,
  LegislativeMeasureRecord,
  PropositionAnswerRef,
} from "../../simulation/types";
import type {
  CommitteeRule,
  ChamberRule,
  FloorStageRule,
} from "../../simulation/legislature-rules";
import type * as NativeLegislation from "../../simulation/legislation";
import type {
  MeasureStepKey,
  FloorVoteInput,
} from "../../simulation/legislation";
import type { InstitutionStepInput } from "../../simulation/governing/legislative-clock";
import type { QuorumAttendanceDecision } from "../../simulation/governing/chamber-votes";
import type { MinorityPartyProcedureRules } from "../../simulation/minority-party-procedure";
import type { governmentUnit } from "../../simulation/government-units";
import {
  applyInstitutionSessionEnd,
  effectiveOwner,
  bodiesForMeasure,
  measureSessionClosedOn,
  isSeatedChamber,
  decide,
  present,
  provenance,
  nextMeasureStableKey,
  type InstitutionFacts,
  type InstitutionStepPlan,
  type InstitutionCommand,
} from "./institution-context";
import { measurePosition, availableMeasureSteps } from "./measure-replay";
import { chamberByKey, floorStageByKey } from "./pack-queries";
import { committeeRosters } from "./committees";
import { nextSessionCalendarDate } from "./sitting-calendar";
import { addDays } from "../elections/calendar";
import { applyQuorumAttendanceToBallots } from "./quorum-attendance";
import {
  decideCouncilVote,
  type CouncilDecisionFacts,
} from "./council-decision";
import {
  amendmentAdmissible,
  type AmendmentRuleFacts,
} from "./amendment-rules";
import { takeFloorVote, type FloorVoteFacts } from "./floor-vote-admission";
export interface InstitutionDriverFacts
  extends InstitutionFacts, FloorVoteFacts {
  readonly localUnit: ReturnType<typeof governmentUnit>;
  readonly localRules: {
    readonly packId: string;
    readonly governmentKey: string | null;
  } | null;
  readonly localLawJurisdictionId: EntityId | null;
  readonly localWorkBinding: unknown | null;
  readonly localOfficers: readonly {
    readonly mayor: boolean;
    readonly personId: EntityId;
  }[];
  readonly parties: ReadonlyMap<EntityId, string | null>;
  readonly preparationDone: boolean;
  readonly dueItems: readonly FutureDueItem[];
  readonly dueStatuses: ReadonlyMap<EntityId, { readonly status: string }>;
  readonly referralCommitteeKeys: ReadonlyMap<string, string | null>;
  readonly provisions: readonly LegislativeProvisionRecord[];
  readonly localFiscalFacts: LocalFiscalFacts;
  readonly minorityProcedureRows: readonly MinorityPartyProcedureRules[];
  readonly amendmentPreparationKeys: ReadonlySet<string>;
  readonly amendmentFacts: AmendmentRuleFacts;
  readonly councilVotes: CouncilDecisionFacts | null;
  readonly localNonpartisan: boolean;
  readonly attendance: ReadonlyMap<string, readonly QuorumAttendanceDecision[]>;
  readonly taxEnactmentFacts: Parameters<typeof typedTaxEnactmentDate>[0];
}
const COUNCIL_VOTE_NOTE =
  "council-lawmaking/v1: each member decided their own ballot from their principles, their record, the ordinance's sponsor and the town's voters.";
const COMMITTEE_HEARING_TRANSITION_KEY = "legislation:committee-hearing";
function committeeRoster(
  ...[body, committees, key, seed]: [
    Parameters<typeof committeeRosters>[0],
    Parameters<typeof committeeRosters>[1],
    string,
    string,
  ]
) {
  return committeeRosters(body, committees, seed).get(key) ?? [];
}
function votePlanKeyForCommittee(key: string) {
  return `committee:${key}`;
}
function votePlanKeyForFloor(chamber: string, stage: string) {
  return `floor:${chamber}:${stage}`;
}
function votePlanKeyForOverride(key: string) {
  return `override:${key}`;
}
function votePlanKeyForConcurrence(key: string) {
  return `concurrence:${key}`;
}
function referralCommittee(
  facts: InstitutionDriverFacts,
  measureId: EntityId,
  chamberKey: string,
): CommitteeRule | null {
  const chamber = chamberByKey(facts.pack, chamberKey);
  const referredKey = facts.referralCommitteeKeys.get(chamberKey);
  return (
    chamber.committees.find((entry) => entry.committeeKey === referredKey) ??
    chamber.committees[0] ??
    null
  );
}
export function floorStageTakesAmendments(
  chamber: ChamberRule,
  stage: FloorStageRule,
): boolean {
  const chamberRule = chamber.amendments.floorAmendmentsAllowed;
  return (
    chamberRule.kind === "known" &&
    chamberRule.value &&
    stage.amendable.kind === "known" &&
    stage.amendable.value
  );
}
const referMeasure = (
  input: Parameters<typeof NativeLegislation.referMeasure>[1],
): readonly InstitutionCommand[] => [{ command: "referMeasure", input }];
const recordCommitteeDisposition = (
  input: Parameters<typeof NativeLegislation.recordCommitteeDisposition>[1],
): readonly InstitutionCommand[] => [
  { command: "recordCommitteeDisposition", input },
];
const placeMeasureOnCalendar = (
  input: Parameters<typeof NativeLegislation.placeMeasureOnCalendar>[1],
): readonly InstitutionCommand[] => [
  { command: "placeMeasureOnCalendar", input },
];
const attemptVetoOverride = (
  input: Parameters<typeof NativeLegislation.attemptVetoOverride>[1],
): readonly InstitutionCommand[] => [{ command: "attemptVetoOverride", input }];
const recordConcurrenceVote = (
  input: Parameters<typeof NativeLegislation.recordConcurrenceVote>[1],
): readonly InstitutionCommand[] => [
  { command: "recordConcurrenceVote", input },
];
const transmitMeasure = (
  input: Parameters<typeof NativeLegislation.transmitMeasure>[1],
): readonly InstitutionCommand[] => [{ command: "transmitMeasure", input }];
const enrollMeasure = (
  input: Parameters<typeof NativeLegislation.enrollMeasure>[1],
): readonly InstitutionCommand[] => [{ command: "enrollMeasure", input }];
const presentMeasureToExecutive = (
  input: Parameters<typeof NativeLegislation.presentMeasureToExecutive>[1],
): readonly InstitutionCommand[] => [
  { command: "presentMeasureToExecutive", input },
];
function applyInstitutionFloorVote(
  facts: InstitutionDriverFacts,
  input: FloorVoteInput,
  seatedMemberPersonIds: readonly EntityId[] | null,
): InstitutionStepPlan {
  if (measurePosition(facts, input.measureId).phase !== "on-floor")
    return { kind: "idle" };
  if (seatedMemberPersonIds) {
    const seats = new Set(seatedMemberPersonIds);
    if (seats.size === 0)
      return {
        kind: "blocked",
        reason: "No seated members can decide this floor question.",
      };
    const voters = new Set<EntityId>();
    for (const disposition of input.dispositions) {
      if (!disposition.personId || !seats.has(disposition.personId))
        return {
          kind: "blocked",
          reason: "This recorded decision is not a vote of the seated body.",
        };
      if (voters.has(disposition.personId))
        return {
          kind: "blocked",
          reason: "A member cannot vote twice on one floor question.",
        };
      voters.add(disposition.personId);
    }
  }
  try {
    return {
      kind: "applied",
      step: "move-floor-vote",
      commands: [
        {
          command: "appendLegislativeAction",
          input: takeFloorVote(facts, input),
        },
      ],
    };
  } catch (error) {
    return {
      kind: "blocked",
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}
export function applyInstitutionStep(
  facts: InstitutionDriverFacts,
  measureId: EntityId,
  input: InstitutionStepInput = {},
): InstitutionStepPlan {
  const measure = facts.measure;
  if (input.localCouncil && input.recordedFloorVote)
    return {
      kind: "blocked",
      reason:
        "The council's members decide this step; a supplied tally cannot replace them.",
    };
  if (
    input.recordedFloorVote &&
    input.recordedFloorVote.measureId !== measureId
  )
    return {
      kind: "blocked",
      reason: "The recorded floor vote belongs to another measure.",
    };
  const local = input.localCouncil;
  const unit = local ? facts.localUnit : null;
  if (local && (!unit || facts.localRules?.packId !== measure.rulePackId))
    return {
      kind: "blocked",
      reason:
        "This measure does not belong to the recorded local government's rule pack.",
    };
  if (local && unit && facts.localLawJurisdictionId !== measure.jurisdictionId)
    return {
      kind: "blocked",
      reason:
        "This measure does not belong to the recorded local government's law jurisdiction.",
    };
  if (local && !facts.localWorkBinding)
    return {
      kind: "blocked",
      reason:
        "The local council's rule pack has no admitted institution work binding.",
    };
  if (input.recordedFloorVote) {
    const sessionEnd = applyInstitutionSessionEnd(facts, measureId);
    if (sessionEnd) return sessionEnd;
    return applyInstitutionFloorVote(
      facts,
      input.recordedFloorVote,
      input.recordedFloorVote.seatedMemberPersonIds,
    );
  }
  const blueprint = facts.blueprint;
  const officers = unit ? facts.localOfficers : [];
  const councilMembers = officers.filter((seat) => !seat.mayor);
  const mayorPersonId = officers.find((seat) => seat.mayor)?.personId ?? null;
  const councilChamber = blueprint.pack.chambers.find(
    (chamber) => chamber.chamberKey === "council",
  );
  if (
    local &&
    (!councilChamber ||
      councilMembers.length === 0 ||
      councilMembers.some((member) => !facts.people.get(member.personId)))
  )
    return {
      kind: "blocked",
      reason: "No recorded local council members can decide this measure.",
    };
  const bodies: readonly SeatedBody[] = local
    ? [
        {
          chamberKey: councilChamber!.chamberKey,
          chamberName: councilChamber!.name,
          members: councilMembers.map((member, index) => ({
            memberKey: `council:${index + 1}`,
            personId: member.personId,
            name: facts.people.get(member.personId)!.name,
            caucusLabel: facts.parties.get(member.personId) ?? "No party",
          })),
        },
      ]
    : bodiesForMeasure(facts, measure, blueprint);
  if (!facts.preparationDone)
    return {
      kind: "prepare",
      commands: [
        {
          command: local
            ? "ensureCouncilPrinciples"
            : "ensureOfficeholderPrinciples",
          input: {
            personIds: local
              ? [
                  ...councilMembers.map((row) => row.personId),
                  ...(mayorPersonId ? [mayorPersonId] : []),
                ]
              : bodies.flatMap((body) =>
                  body.members.flatMap((member) =>
                    member.personId ? [member.personId] : [],
                  ),
                ),
          },
        },
        { command: "closeLapsedVoteNotices", input: { measureId } },
      ],
    };
  const pack = blueprint.pack;
  const owner = effectiveOwner(facts, measure);
  if (owner === null || owner === "sponsor-office") return { kind: "idle" };
  const position = measurePosition(facts, measureId);
  const sessionEnd = applyInstitutionSessionEnd(facts, measureId);
  if (sessionEnd) return sessionEnd;
  if (owner === "executive")
    return {
      kind: "executive",
      commands: [{ command: "onExecutiveDesk", input: { measureId } }],
    };
  const chamberKey = position.chamberKey ?? pack.chamberOrder[0]!;
  const chamber = chamberByKey(pack, chamberKey);
  const steps = availableMeasureSteps(facts, measureId);
  const key = (prefix: string) =>
    nextMeasureStableKey(facts, measureId, `measure:${measureId}:${prefix}`);
  const body = bodies.find((entry) => entry.chamberKey === chamberKey);
  const applied = (
    commands: readonly InstitutionCommand[],
    step: MeasureStepKey,
  ): InstitutionStepPlan => ({ kind: "applied", commands, step });
  if (
    steps.includes("await-next-legislative-day") &&
    position.earliestNextFloorDate
  )
    return { kind: "wait-until", date: position.earliestNextFloorDate };
  if (steps.includes("request-committee-hearing")) {
    const pending = facts.dueItems.find(
      (item) =>
        item.transitionKey === COMMITTEE_HEARING_TRANSITION_KEY &&
        item.entityIds.includes(measureId) &&
        facts.dueStatuses.get(item.id)?.status === "scheduled",
    );
    const hearingDate =
      pending?.dueAt ??
      nextSessionCalendarDate(
        pack.session.sittingCalendar ?? facts.defaultCalendar,
        facts.onDate,
        "hearing",
      );
    const closedOn = measureSessionClosedOn(facts, measure, pack);
    if (closedOn && hearingDate > closedOn) {
      return { kind: "wait-until", date: addDays(closedOn, 1) };
    }
    return {
      kind: "wait-until",
      date: addDays(hearingDate, 1),
      commands: pending
        ? []
        : [
            {
              command: "scheduleCommitteeHearing",
              input: {
                stableKey: key(`hearing:${chamberKey}`),
                measureId,
                hearingDate,
              },
            },
          ],
    };
  }
  if (steps.includes("request-referral")) {
    const committee = referralCommittee(facts, measureId, chamberKey);
    if (!committee)
      return {
        kind: "blocked",
        reason: `The ${chamber.name}'s committees are not compiled, so no referral is made.`,
      };
    return applied(
      referMeasure({
        stableKey: key(`refer:${chamberKey}`),
        measureId,
        committeeKey: committee.committeeKey,
      }),
      "request-referral",
    );
  }
  if (steps.includes("move-committee-report")) {
    const committee = chamber.committees.find(
      (entry) => entry.committeeKey === position.committeeKey,
    );
    const stableKey = key(`committee:${chamberKey}`);
    const decided =
      committee && body
        ? decide(
            facts,
            blueprint,
            committeeRoster(
              body,
              chamber.committees,
              committee.committeeKey,
              `${pack.packId}:${chamberKey}`,
            ),
            votePlanKeyForCommittee(committee.committeeKey),
            {
              measureId,
              purpose: "committee-report",
              forumKey: committee.committeeKey,
              floorStageKey: null,
            },
            stableKey,
          )
        : null;
    if (!committee || !decided)
      return {
        kind: "blocked",
        reason: `The ${chamber.name} committee has no recorded member decisions on this bill.`,
      };
    return applied(
      recordCommitteeDisposition({
        stableKey,
        measureId,
        recommendation: "favorable",
        dispositions: decided.dispositions,
        presentMembers: present(decided.dispositions),
        rationale:
          "The committee weighed the testimony it heard and voted on reporting the bill.",
        provenance: provenance(
          "Committee members' recorded decisions for this bill.",
          decided.method,
        ),
      }),
      "move-committee-report",
    );
  }
  if (steps.includes("request-calendar-placement"))
    return applied(
      placeMeasureOnCalendar({
        stableKey: key(`calendar:${chamberKey}`),
        measureId,
      }),
      "request-calendar-placement",
    );
  if (steps.includes("move-floor-vote")) {
    const governmentKey = unit ? facts.localRules?.governmentKey : null;
    if (local && governmentKey) {
      if (measure.subjectClass === "general-policy") {
        if (
          facts.provisions.some(
            (entry) =>
              entry.provisionKey === "tax-levy" ||
              entry.provisionKey === "amount-provided" ||
              entry.operativeEffect != null,
          )
        )
          return {
            kind: "blocked",
            reason: "A fiscal clause needs the local fiscal authority route.",
          };
      } else {
        const fiscal = admitLocalFiscalMeasure(
          facts.localFiscalFacts,
          governmentKey,
          measure.id,
        );
        if (!fiscal.ok) return { kind: "blocked", reason: fiscal.reason };
      }
    }
    const stage = floorStageByKey(chamber, position.floorStageKey ?? "");
    const procedure = facts.minorityProcedureRows.find(
      (row) => row.chamberKey === chamberKey,
    );
    const clotureAvailable =
      procedure?.unlimitedDebate.kind === "known" &&
      procedure.unlimitedDebate.value &&
      procedure.clotureBar.kind === "known";
    if (stage.stageKey === "cloture" && !clotureAvailable)
      return {
        kind: "blocked",
        reason: `The ${chamber.name} has no recorded unlimited-debate rule and cloture bar.`,
      };
    const stableKey = key(`floor:${chamberKey}:${stage.stageKey}`);
    const mayOfferAmendment =
      body &&
      body.members.length > 0 &&
      body.members.every((member) => member.personId) &&
      isSeatedChamber(facts, blueprint) &&
      floorStageTakesAmendments(chamber, stage);
    if (mayOfferAmendment && !facts.amendmentPreparationKeys.has(stableKey))
      return {
        kind: "prepare",
        commands: [
          {
            command: "offerClockAmendment",
            input: {
              measureId,
              chamber,
              stage,
              members: body.members,
              stableKey,
              nonpartisan: blueprint.nonpartisan,
              admissible: (
                bill: LegislativeMeasureRecord,
                part: PropositionAnswerRef,
              ) =>
                amendmentAdmissible(
                  facts.amendmentFacts,
                  blueprint.pack,
                  chamberKey,
                  bill,
                  part,
                ).admissible,
            },
          },
        ],
      };
    const decided =
      local && unit
        ? {
            dispositions: decideCouncilVote(facts.councilVotes!, {
              stableKey: `${measure.stableKey}:vote:${facts.onDate}`,
              measureId,
              jurisdictionId: local.townJurisdictionId,
              members: councilMembers,
              playerPersonId: local.playerPersonId,
              questionLabel: `Adopt ${measure.designation}`,
              executivePersonId: mayorPersonId,
              nonpartisan: facts.localNonpartisan,
            }),
            method: "member-decisions" as const,
          }
        : body
          ? decide(
              facts,
              blueprint,
              body.members,
              votePlanKeyForFloor(chamberKey, stage.stageKey),
              {
                measureId,
                purpose: "floor-stage",
                forumKey: chamberKey,
                floorStageKey: stage.stageKey,
              },
              stableKey,
              stage.stageKey === "cloture" ? clotureAvailable : undefined,
            )
          : null;
    if (!body || !decided)
      return {
        kind: "blocked",
        reason: `The ${chamber.name} has no recorded member decisions on this question.`,
      };
    const attendance = facts.attendance.get(`${stableKey}:attendance`)!;
    const dispositions = applyQuorumAttendanceToBallots(
      decided.dispositions,
      attendance,
    );
    return applyInstitutionFloorVote(
      facts,
      {
        stableKey,
        measureId,
        dispositions,
        presentMembers:
          decided.method === "member-decisions"
            ? present(dispositions)
            : body.members.length,
        electedMembers: body.members.length,
        provenance: local
          ? {
              method: "member-decisions",
              note: COUNCIL_VOTE_NOTE,
              sourceEntityIds: [measure.id],
            }
          : provenance(
              "Members' recorded decisions on this question.",
              decided.method,
            ),
      },
      body.members.every((member) => member.personId !== null)
        ? body.members.map((member) => member.personId!)
        : null,
    );
  }
  if (steps.includes("move-veto-override")) {
    const override = pack.executive.override;
    if (override.kind === "not-applicable" || bodies.length === 0)
      return {
        kind: "blocked",
        reason: `The legislature has no seated members to reconsider the veto.`,
      };
    const stableKey = key("override");
    const question = (forumKey: string) => ({
      measureId,
      purpose: "veto-override" as const,
      forumKey,
      floorStageKey: null,
    });
    const forums =
      override.kind === "joint-session"
        ? (() => {
            const members = bodies.flatMap((entry) => entry.members);
            const decided = decide(
              facts,
              blueprint,
              members,
              votePlanKeyForOverride("joint"),
              question("joint"),
              `${stableKey}:joint`,
            );
            return decided
              ? [
                  {
                    forumKey: "joint",
                    dispositions: decided.dispositions,
                    presentMembers: present(decided.dispositions),
                    electedMembers: members.length,
                  },
                ]
              : null;
          })()
        : pack.chamberOrder.map((forumKey) => {
            const forumBody = bodies.find(
              (entry) => entry.chamberKey === forumKey,
            );
            const decided = forumBody
              ? decide(
                  facts,
                  blueprint,
                  forumBody.members,
                  votePlanKeyForOverride(forumKey),
                  question(forumKey),
                  `${stableKey}:${forumKey}`,
                )
              : null;
            return decided && forumBody
              ? {
                  forumKey,
                  dispositions: decided.dispositions,
                  presentMembers: present(decided.dispositions),
                  electedMembers: forumBody.members.length,
                }
              : null;
          });
    if (!forums || forums.some((forum) => forum === null))
      return {
        kind: "blocked",
        reason:
          "The legislature has no recorded member decisions on the override.",
      };
    return applied(
      attemptVetoOverride({
        stableKey,
        measureId,
        forums: forums.map((forum) => forum!),
        rationale: "The legislature reconsidered the vetoed bill.",
        provenance: provenance(
          "Members' recorded decisions on overriding the veto.",
          "member-decisions",
        ),
      }),
      "move-veto-override",
    );
  }
  if (steps.includes("move-concurrence")) {
    const stableKey = key(`concurrence:${chamberKey}`);
    const decided = body
      ? decide(
          facts,
          blueprint,
          body.members,
          votePlanKeyForConcurrence(chamberKey),
          {
            measureId,
            purpose: "concurrence",
            forumKey: chamberKey,
            floorStageKey: null,
          },
          stableKey,
        )
      : null;
    if (!body || !decided)
      return {
        kind: "blocked",
        reason: `The ${chamber.name} has no recorded member decisions on the other chamber's changes.`,
      };
    return applied(
      recordConcurrenceVote({
        stableKey,
        measureId,
        dispositions: decided.dispositions,
        presentMembers:
          decided.method === "member-decisions"
            ? present(decided.dispositions)
            : body.members.length,
        electedMembers: body.members.length,
        provenance: provenance(
          "Members' recorded decisions on accepting the other chamber's changes.",
          decided.method,
        ),
      }),
      "move-concurrence",
    );
  }
  if (steps.includes("transmit-to-second-chamber"))
    return applied(
      transmitMeasure({ stableKey: key("transmit"), measureId }),
      "transmit-to-second-chamber",
    );
  if (steps.includes("request-enrollment"))
    return applied(
      enrollMeasure({ stableKey: key("enroll"), measureId }),
      "request-enrollment",
    );
  if (steps.includes("present-to-executive"))
    return applied(
      presentMeasureToExecutive({
        stableKey: key("present"),
        measureId,
      }),
      "present-to-executive",
    );
  if (steps.includes("record-enactment")) {
    const typedTaxDate = typedTaxEnactmentDate(facts.taxEnactmentFacts);
    return applied(
      [
        {
          command: "recordEnactment",
          input: {
            stableKey: key("enactment"),
            measureId,
            ...(facts.isCongress
              ? { effectiveAt: facts.onDate }
              : typedTaxDate
                ? { effectiveAt: typedTaxDate }
                : {}),
          },
        },
        { command: "applyEnactedLawEffects", input: { measureId } },
      ],
      "record-enactment",
    );
  }
  return { kind: "idle" };
}

// stopgapId: "SG-P14-legislatures-provisional-institution-preparation"
