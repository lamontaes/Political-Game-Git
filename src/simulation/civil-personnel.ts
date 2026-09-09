import sourceData from "./civil-personnel-sources.json";
import { makeIsoDate } from "./dates";
import { evaluateLifeEligibility } from "./life-eligibility";
import {
  organizationProfileAt,
  workRoleAt,
  workStatusAt,
} from "./life-queries";
import { createWorkItem, canPersonAccess, workItemState } from "./time-work";
import { recordWorldEvent } from "./world";
import type { EntityId, LifeEligibilityProvider, World } from "./types";
import {
  CIVIL_PERSONNEL_FIELDS,
  type CivilPersonnelField,
  type PersonnelClassContext,
  type PersonnelAction,
  type PersonnelActionAssessment,
  type PersonnelSourceProjection,
} from "./civil-personnel-contract";

const sources = sourceData as PersonnelSourceProjection;
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
    if (observation?.state === "known") {
      if (date !== observation.observedOn)
        missing.push(
          `Source observed on ${observation.observedOn}; applicability on ${date} is not established.`,
        );
    }
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
    "complete-probation": ["appointmentProtection"],
    discipline: ["removalProtection"],
    remove: ["removalProtection"],
    "file-review": ["appealBody"],
    "decide-review": ["appealBody"],
  };

/** Field-local blockers; an unrelated bargaining gap never blocks private preparation. */
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
    };
  const query = queryPersonnelProtections(context, date);
  const missing = [...query.civilService, ...query.laborBargaining]
    .filter((row) => dependentFields[action].includes(row.field))
    .flatMap((row) => row.missing);
  if (dependentFields[action].length)
    missing.push(
      "The observation date is not an operative-date instrument; legal applicability must be established for this action.",
    );
  if (action === "appoint")
    missing.push(
      "The actual appointing authority and position-specific selection, qualification and preference rules are not supplied by this corpus.",
      "A vacancy, authorized compensation terms and the person's consent are separate prerequisites.",
    );
  if (action === "complete-probation")
    missing.push(
      "The applicable appointment's probation terms, elapsed service and authorized completion decision are required.",
    );
  if (action === "discipline" || action === "remove")
    missing.push(
      "An actual decision-maker's authority, supported grounds and completed notice/response procedure are required.",
    );
  if (action === "file-review")
    missing.push(
      "A qualifying canonical notice/decision, its service date and the applicable filing procedure are required.",
    );
  if (action === "decide-review")
    missing.push(
      "A properly constituted reviewing authority, completed review and supported remedy are required.",
    );
  return {
    action,
    status: missing.length ? "blocked" : "available",
    missing: [...new Set(missing)],
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
        item.focus.targetKey.startsWith(`${prefix}:`) &&
        canPersonAccess(item.access, actor),
    )
    .map((item) => ({ item, state: workItemState(world, item.id) }));
}

/** Concrete LIFE adapter. Caller must bind real employer/class evidence; missing binding refuses. */
export function publicEmploymentPermissionProvider(
  resolveContext: (
    world: World,
    employeeId: EntityId,
    contextIds: readonly EntityId[],
  ) => PersonnelClassContext | null,
): LifeEligibilityProvider {
  return {
    evaluate(world, request) {
      const action = request.actionKey.slice(
        "work:public-".length,
      ) as PersonnelAction;
      if (
        !request.actionKey.startsWith("work:public-") ||
        !Object.hasOwn(dependentFields, action)
      )
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
      const context = resolveContext(
        world,
        request.actorPersonId,
        request.contextEntityIds,
      );
      const assessment = context
        ? assessPersonnelAction(context, request.asOfDate, action)
        : null;
      if (assessment?.status === "available")
        return { status: "allowed", reasons: [] };
      return {
        status: "blocked",
        reasons: [
          {
            key: "context:public-personnel-evidence",
            explanation:
              assessment?.missing.join(" ") ??
              "Actual employer, employee class and jurisdiction are not bound.",
          },
        ],
      };
    },
  };
}
