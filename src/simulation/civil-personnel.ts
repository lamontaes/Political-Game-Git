import sourceData from "./civil-personnel-sources.json";
import { makeIsoDate } from "./dates";
import { evaluateLifeEligibility } from "./life-eligibility";
import {
  organizationProfileAt,
  workRoleAt,
  workStatusAt,
} from "./life-queries";
import { createWorkItem, canPersonAccess, workItemState } from "./time-work";
import {
  assessMinnesotaDiscipline,
  assessMinnesotaReinstatement,
  personnelProcedure,
  procedureApplicability,
} from "./civil-personnel-actions";
import { recordWorldEvent } from "./world";
import type { EntityId, LifeEligibilityProvider, World } from "./types";
import {
  CIVIL_PERSONNEL_FIELDS,
  type CivilPersonnelField,
  type PersonnelClassContext,
  type PersonnelAction,
  type PersonnelActionAssessment,
  type PersonnelProcedureKey,
  type PersonnelSourceProjection,
} from "./civil-personnel-contract";

const sources = sourceData as unknown as PersonnelSourceProjection;
export const CIVIL_PERSONNEL_SOURCE_PIN = sources.corpusSha256;
const prefix = "civil-personnel";

/** No executable authority can be inferred from a descriptive observation. */
export function queryPersonnelProtections(
  context: PersonnelClassContext,
  dateInput: string,
) {
  const date = makeIsoDate(dateInput);
  const profile = sources.profiles.find(
    (p) => p.jurisdictionKey === context.jurisdictionKey,
  );
  return {
    corpusSha256: sources.corpusSha256,
    jurisdictionName: profile?.jurisdictionName ?? context.jurisdictionKey,
    civilService: CIVIL_PERSONNEL_FIELDS.slice(0, 5).map(read),
    laborBargaining: CIVIL_PERSONNEL_FIELDS.slice(5).map(read),
  };
  function read(field: CivilPersonnelField) {
    const observation = profile?.fields[field];
    const missing: string[] = [];
    if (!profile || !observation || observation.state === "unknown")
      missing.push(
        observation?.state === "unknown"
          ? observation.reason
          : "No source profile.",
      );
    if (profile && context.employerLevel !== profile.employerLevel)
      missing.push(
        "This profile does not establish applicability to this employer level.",
      );
    // Current publisher text answers its observation date and later dates in
    // the simulation, never an earlier one (the accepted qualification rule).
    if (observation?.state === "known" && date < observation.observedOn)
      missing.push(
        `Source observed on ${observation.observedOn}; applicability on ${date} is not established.`,
      );
    if (
      field === "classificationDistinction" &&
      context.civilClass === "unknown"
    )
      missing.push("The employee's civil-service class is not established.");
    if (
      ["appointmentProtection", "removalProtection", "appealBody"].includes(
        field,
      )
    ) {
      const expectedClass =
        context.jurisdictionKey === "US-FEDERAL" ? "competitive" : "classified";
      if (context.civilClass !== expectedClass)
        missing.push(
          `This field does not establish rights for the employee's ${context.civilClass} class.`,
        );
      if (
        context.jurisdictionKey === "US-FEDERAL" &&
        ["removalProtection", "appealBody"].includes(field)
      )
        missing.push(
          "Chapter 75 employee coverage, including § 7511 exclusions, must be established.",
        );
      if (
        context.jurisdictionKey === "US-MN" &&
        ["removalProtection", "appealBody"].includes(field) &&
        context.tenure !== "permanent"
      )
        missing.push(
          "This protection is scoped to permanent classified employees.",
        );
      if (
        field === "appealBody" &&
        context.jurisdictionKey === "US-MN" &&
        context.collectiveAgreement !== "not-covered"
      )
        missing.push(
          "This review procedure is scoped to employees not covered by a collective bargaining agreement.",
        );
      if (field === "appealBody" && context.jurisdictionKey === "US-AK")
        missing.push(
          "The adverse-action category and any promotional-probation exception must be checked.",
        );
    }
    if (
      CIVIL_PERSONNEL_FIELDS.slice(5).includes(field) &&
      context.bargainingCoverage === "unknown"
    )
      missing.push(
        "Chapter-specific bargaining coverage and exclusions are not established.",
      );
    if (
      ["bargainingScope", "impasseRule", "managementRights"].includes(field) &&
      context.bargainingCoverage === "excluded"
    )
      missing.push(
        "A bargaining rule cannot grant rights to an excluded employee.",
      );
    if (field === "strikeRestriction" || field === "impasseRule")
      missing.push(
        "The applicable service/unit class and procedural conditions require separate findings.",
      );
    return {
      field,
      observation: observation ?? {
        state: "unknown" as const,
        reason: "No source profile.",
      },
      // Matching the source's observed scope is useful information, but is
      // deliberately not a finding of operative law or individual authority.
      applicability: missing.length
        ? ("unresolved" as const)
        : ("matches-observed-scope" as const),
      missing,
    };
  }
}

const dependentFields: Record<PersonnelAction, readonly CivilPersonnelField[]> =
  {
    "prepare-recruitment": [],
    "prepare-personnel-review": [],
    appoint: ["classificationDistinction", "appointmentProtection"],
    reinstate: ["classificationDistinction"],
    "complete-probation": ["appointmentProtection"],
    discipline: ["removalProtection"],
    remove: ["removalProtection"],
    "file-review": ["appealBody"],
    "decide-settlement": ["appealBody"],
    "decide-review": ["appealBody"],
  };

/** Class-level gaps that no canonical binding can close in this build. */
function classGaps(
  context: PersonnelClassContext,
  date: string,
  action: PersonnelAction,
): string[] {
  const gaps: string[] = [];
  const procedures = (keys: readonly PersonnelProcedureKey[]) => {
    for (const key of keys) {
      const applicability = procedureApplicability(key, makeIsoDate(date));
      if (applicability.state === "UNKNOWN") gaps.push(applicability.reason);
    }
  };
  if (context.jurisdictionKey === "US-FEDERAL") {
    gaps.push(
      "Federal adverse actions need 5 U.S.C. § 7511 coverage, OPM regulations and the acting agency official, none of which is acquired.",
    );
    return gaps;
  }
  if (context.jurisdictionKey === "US-AK") {
    if (context.civilClass === "exempt")
      gaps.push(personnelProcedure("ak-exempt").statement);
    else if (context.civilClass === "partially-exempt")
      gaps.push(personnelProcedure("ak-partially-exempt").statement);
    else
      gaps.push(
        action === "appoint" || action === "reinstate"
          ? "Alaska classified appointments follow personnel rules that are not acquired."
          : `${personnelProcedure("ak-discipline-rules").statement} No qualifying dismissal can be recorded, so the hearing request cannot arise.`,
      );
    return gaps;
  }
  if (context.jurisdictionKey !== "US-MN") {
    gaps.push(
      `No personnel procedure is compiled for ${context.jurisdictionKey}.`,
    );
    return gaps;
  }
  if (context.employerLevel !== "state")
    gaps.push(
      "Chapter 43A procedures reach state civil service, not this employer level.",
    );
  if (context.civilClass !== "classified")
    gaps.push(
      context.civilClass === "unknown"
        ? "The employee's civil-service class is not established."
        : `The compiled procedures reach classified positions; this one is ${context.civilClass}.`,
    );
  switch (action) {
    case "appoint":
      gaps.push(
        "Classified selection needs the commissioner's qualifications, the finalist-pool procedure and pay plans, which are not acquired. Direct reinstatement is the supported appointment.",
      );
      break;
    case "reinstate":
      procedures(["mn-reinstatement"]);
      break;
    case "complete-probation":
      gaps.push(
        `${personnelProcedure("mn-probation").citation.citation} bounds probation between 30 days and two years of full-time-equivalent service; the length that applies is set by a plan or agreement that is not acquired.`,
      );
      break;
    case "discipline":
    case "remove":
    case "file-review":
    case "decide-settlement":
      procedures(
        action === "decide-settlement"
          ? ["mn-commissioner-settlement"]
          : ["mn-just-cause", "mn-just-cause-grounds", "mn-discipline-notice"],
      );
      if (context.tenure === "probationary")
        gaps.push(personnelProcedure("mn-probationary-grievance").statement);
      else if (context.tenure !== "permanent")
        gaps.push("The employee's permanent status is not established.");
      if (context.collectiveAgreement === "covered")
        gaps.push(personnelProcedure("mn-agreement-procedures").statement);
      else if (context.collectiveAgreement !== "not-covered")
        gaps.push(
          "Whether a collective bargaining agreement covers the employee is not established.",
        );
      break;
    case "decide-review":
      gaps.push(personnelProcedure("mn-arbitration").statement);
      break;
    default:
      break;
  }
  return gaps;
}

/**
 * Field-local, class-level assessment. `available` means a compiled procedure
 * reaches this class on this date; `requires` lists the canonical facts the
 * writer still checks. It is never permission by itself.
 */
export function assessPersonnelAction(
  context: PersonnelClassContext,
  date: string,
  action: PersonnelAction,
): PersonnelActionAssessment {
  if (!Object.hasOwn(dependentFields, action))
    return {
      action,
      status: "blocked",
      missing: ["Unsupported personnel action."],
      requires: [],
    };
  if (action === "prepare-recruitment" || action === "prepare-personnel-review")
    return { action, status: "available", missing: [], requires: [] };
  const missing = classGaps(context, date, action);
  const requires: Partial<Record<PersonnelAction, readonly string[]>> = {
    reinstate: [
      "An appointing authority designated for the employer.",
      "A vacant position in the job class.",
      "Former permanent or probationary service in the class within four years.",
      "The person's own acceptance.",
    ],
    discipline: [
      "The employer's designated appointing authority.",
      "A recorded informal resolution attempt.",
      "One of the named just-cause grounds and specific reasons.",
    ],
    remove: [
      "The employer's designated appointing authority.",
      "A recorded informal resolution attempt.",
      "One of the named just-cause grounds and specific reasons.",
    ],
    "file-review": [
      "A recorded discharge and an appeal inside 30 calendar days.",
    ],
    "decide-settlement": [
      "A filed appeal.",
      "The single holder of the commissioner's statutory office.",
    ],
  };
  return {
    action,
    status: missing.length ? "blocked" : "available",
    missing: [...new Set(missing)],
    requires: missing.length ? [] : (requires[action] ?? []),
  };
}

export interface PersonnelEmploymentContext {
  readonly employeeId: EntityId;
  readonly organizationId: EntityId;
  readonly workRelationshipId: EntityId;
  readonly jurisdictionId: EntityId | null;
  readonly title: string;
  readonly organizationName: string;
}

/** Private employment context; it deliberately does not infer a public class from a title. */
export function personnelEmploymentContexts(
  world: World,
): readonly PersonnelEmploymentContext[] {
  if (world.control.kind !== "person") return [];
  const employeeId = world.control.personId;
  return world.history.workRelationships.flatMap((work) => {
    if (
      work.personId !== employeeId ||
      !work.organizationId ||
      work.startedAt > world.currentDate
    )
      return [];
    const role = workRoleAt(world, work.id),
      status = workStatusAt(world, work.id);
    const organization = organizationProfileAt(world, work.organizationId);
    if (!role || !status || status.status === "expected" || !organization)
      return [];
    return [
      {
        employeeId,
        organizationId: work.organizationId,
        workRelationshipId: work.id,
        jurisdictionId: organization.locationJurisdictionId,
        title: role.title,
        organizationName: organization.name,
      },
    ];
  });
}

export type PersonnelWorkResult =
  | { readonly ok: true; readonly world: World; readonly workItemId: EntityId }
  | { readonly ok: false; readonly world: World; readonly reason: string };

export function personnelKnownEmployers(world: World) {
  if (world.control.kind !== "person") return [];
  const actor = world.control.personId;
  const known = new Set(
    world.history.workRelationships
      .filter(
        (work) =>
          work.personId === actor && work.recordedAt <= world.currentDate,
      )
      .map((work) => work.organizationId),
  );
  for (const event of world.history.events) {
    if (
      event.occurredAt <= world.currentDate &&
      event.participants.some((p) => p.personId === actor)
    )
      for (const id of event.involvedEntityIds) known.add(id);
  }
  return world.history.organizations
    .filter((org) => known.has(org.id))
    .flatMap((org) => {
      const profile = organizationProfileAt(world, org.id);
      return profile ? [{ id: org.id, name: profile.name }] : [];
    });
}

/** A person's private preparation is useful even when final public hiring is unresolved. */
export function preparePersonnelWork(
  world: World,
  input: {
    readonly action: "prepare-recruitment" | "prepare-personnel-review";
    readonly organizationId: EntityId;
    readonly workRelationshipId: EntityId | null;
    readonly note: string;
  },
): PersonnelWorkResult {
  const refuse = (reason: string): PersonnelWorkResult => ({
    ok: false,
    world,
    reason,
  });
  if (world.control.kind !== "person")
    return refuse("Choose a person to prepare their own work.");
  const actor = world.control.personId;
  if (
    !["prepare-recruitment", "prepare-personnel-review"].includes(input.action)
  )
    return refuse(
      "This writer only prepares private work; it cannot make a personnel decision.",
    );
  const organization = organizationProfileAt(world, input.organizationId);
  if (!organization) return refuse("The employer must already exist.");
  if (
    !personnelKnownEmployers(world).some(
      (employer) => employer.id === input.organizationId,
    )
  )
    return refuse(
      "This employer has not been established in this person's known history.",
    );
  if (input.note.trim().length === 0 || input.note.length > 4000)
    return refuse("Enter a preparation note of no more than 4,000 characters.");
  const employment = input.workRelationshipId
    ? personnelEmploymentContexts(world).find(
        (c) =>
          c.workRelationshipId === input.workRelationshipId &&
          c.organizationId === input.organizationId,
      )
    : null;
  if (input.action === "prepare-personnel-review" && !employment)
    return refuse(
      "This person has no actual employment relationship with this employer to review.",
    );
  if (
    input.action === "prepare-recruitment" &&
    input.workRelationshipId !== null
  )
    return refuse(
      "Recruitment preparation does not create or repurpose employment.",
    );
  const eligibility = evaluateLifeEligibility(world, {
    actorPersonId: actor,
    actionKey: "work:personnel-preparation",
    asOfDate: world.currentDate,
    jurisdictionId: organization.locationJurisdictionId,
    contextEntityIds: [
      input.organizationId,
      ...(employment ? [employment.workRelationshipId] : []),
    ],
  });
  if (eligibility.status === "blocked")
    return refuse(eligibility.reasons.map((r) => r.explanation).join(" "));
  const stableKey = `${prefix}:${input.action}:${actor}:${input.organizationId}:${input.workRelationshipId ?? "new"}`;
  const existing = world.history.workItems.find(
    (w) => w.stableKey === stableKey,
  );
  if (existing && existing.summary !== input.note.trim())
    return refuse(
      "A preparation already exists for this employer and purpose. Its saved questions have not been replaced.",
    );
  if (existing) return { ok: true, world, workItemId: existing.id };
  const title =
    input.action === "prepare-recruitment"
      ? "Prepare public employment questions"
      : "Prepare personnel review questions";
  let next = recordWorldEvent(world, {
    stableKey: `${stableKey}:prepared`,
    type: `${prefix}.preparation-created`,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: organization.locationJurisdictionId,
    involvedEntityIds: [
      actor,
      input.organizationId,
      ...(employment ? [employment.workRelationshipId] : []),
    ],
    participants: [
      {
        personId: actor,
        role: "agency:author",
        detail:
          "Prepared private questions; no application, allegation or decision was filed.",
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [prefix, "work.preparation"],
    summary: title,
    context: {
      location: null,
      socialContext: "Private personnel preparation",
      pressure: null,
      choice: input.note.trim(),
      motivation: null,
      immediateReaction: null,
    },
  });
  const eventId = next.history.events.at(-1)!.id;
  next = createWorkItem(next, {
    stableKey,
    title,
    summary: input.note.trim(),
    jurisdictionId: organization.locationJurisdictionId,
    // Main's Work source resolver accepts events; the event above carries the
    // actual employer/relationship references without changing LAND's resolver.
    sourceEntityIds: [eventId],
    focus: {
      kind: "other",
      targetKey: `${prefix}:${input.action}`,
      sourceEntityId: eventId,
    },
    effort: null,
    access: { kind: "private", personIds: [actor] },
    assignedPersonIds: [actor],
    playerRequirement: "action",
    waitingOnPersonIds: [],
    blocker: null,
    scheduledActivityId: null,
  });
  return {
    ok: true,
    world: next,
    workItemId: next.history.workItems.at(-1)!.id,
  };
}

export function personnelWorkItems(world: World) {
  if (world.control.kind !== "person") return [];
  const actor = world.control.personId;
  return world.history.workItems
    .filter(
      (item) =>
        item.focus.kind === "other" &&
        // Preparation only; procedure obligations are shown with their matter.
        item.focus.targetKey.startsWith(`${prefix}:prepare-`) &&
        canPersonAccess(item.access, actor),
    )
    .map((item) => ({ item, state: workItemState(world, item.id) }));
}

/**
 * Concrete LIFE/EXEC adapter over canonical records. It answers only for the
 * requesting actor's own authority on the exact record named; a class context,
 * title or relationship is never enough.
 */
export function publicEmploymentPermissionProvider(): LifeEligibilityProvider {
  return {
    evaluate(world, request) {
      const blocked = (explanation: string) => ({
        status: "blocked" as const,
        reasons: [
          { key: "context:public-personnel-evidence" as const, explanation },
        ] as const,
      });
      const [first, second] = request.contextEntityIds;
      if (request.asOfDate !== world.currentDate)
        return blocked(
          "Personnel authority is evaluated only at the current date.",
        );
      switch (request.actionKey) {
        case "work:public-discipline":
        case "work:public-remove": {
          if (!first) return blocked("Name the employee's position record.");
          const assessment = assessMinnesotaDiscipline(
            world,
            request.actorPersonId,
            first,
            "discipline",
          );
          return assessment.available
            ? { status: "allowed", reasons: [] }
            : blocked(assessment.reason);
        }
        case "work:public-reinstate": {
          if (!first || !second)
            return blocked("Name the position and the person.");
          const assessment = assessMinnesotaReinstatement(
            world,
            request.actorPersonId,
            first,
            second,
          );
          return assessment.available
            ? { status: "allowed", reasons: [] }
            : blocked(assessment.reason);
        }
        default:
          return {
            status: "blocked",
            reasons: [
              {
                key: "context:public-personnel-action",
                explanation:
                  "This personnel adapter does not authorize that action.",
              },
            ],
          };
      }
    },
  };
}
