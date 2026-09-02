import {
  SeededRng,
  activeChildAuthoritiesAt,
  activeEducationEnrollmentsAt,
  activeWorkRelationshipsAt,
  ageOnDate,
  applyCharacterHistoryPlan,
  characterHistoryContextPersonId,
  drawCanonicalName,
} from "../simulation";
import type {
  CharacterHistoryTransition,
  EntityId,
  IsoDate,
  LifeEligibilityDecision,
  LifeEligibilityProvider,
  LifeEligibilityReasonKey,
  LifeSituationKey,
  World,
} from "../simulation";

/**
 * Who else is in a formative scene, and whether the scene can happen at all.
 *
 * The audit reproduced an eight-year-old sharing a lunch table with a
 * twenty-eight-year-old, because "someone else in the scene" meant the first
 * other person in the world. A companion is not a warm body: a peer has to be
 * a peer, a teacher has to be an adult in a teaching role, and the adult in
 * the doorway has to be somebody who actually has authority over this child.
 *
 * Nobody is created speculatively. A classmate exists once the child is
 * enrolled somewhere for them to be a classmate at; a teacher the same. If the
 * context is not there, the situation is not offered — which is the honest
 * outcome, and better than inventing a school so a scene can play.
 */

/** The part somebody else plays in a scene, not a description of who they are. */
export type FormativeCompanionRole =
  "household-adult" | "peer" | "teacher" | null;

/**
 * What each situation needs beside the child.
 *
 * Read from the scene, not guessed: "an adult is in the doorway" is a
 * household adult, "someone standing at the end of the table holding a tray"
 * is a peer, and "a teacher keeps you back" is a teacher.
 */
const COMPANION_ROLES: Readonly<
  Partial<Record<LifeSituationKey, FormativeCompanionRole>>
> = {
  "formative.broken-object": "household-adult",
  "formative.lunch-table": "peer",
  "formative.friend-conflict": "peer",
  "formative.teacher-mentor": "teacher",
  "formative.belief-challenge": "teacher",
};

export function companionRoleFor(
  situationKey: LifeSituationKey,
): FormativeCompanionRole {
  return COMPANION_ROLES[situationKey] ?? null;
}

/** How far apart two children can be born and still be each other's peers. */
const PEER_AGE_TOLERANCE_YEARS = 2;
/** The least a teacher can be older than the child they teach. */
const TEACHER_MINIMUM_AGE_GAP = 18;

export interface FormativeCompanion {
  readonly world: World;
  readonly personId: EntityId;
}

/**
 * Finds — or, where the context justifies one, creates — the person a scene
 * needs. Returns null when the context does not exist, and the caller then
 * does not offer the scene.
 */
export function resolveFormativeCompanion(
  world: World,
  personId: EntityId,
  role: FormativeCompanionRole,
): FormativeCompanion | null {
  if (role === null) return { world, personId };
  const person = world.people[personId];
  if (!person) return null;
  const childAge = ageOnDate(person.birthDate, world.currentDate);

  if (role === "household-adult") {
    // Never created here: an adult with authority over a child is a fact about
    // the child's life, established when the life was, not conjured for a scene.
    const authority = activeChildAuthoritiesAt(world, personId).find(
      (record) => record.authority.holder.kind === "person",
    );
    const holder = authority?.authority.holder;
    if (!holder || holder.kind !== "person") return null;
    const adult = world.people[holder.personId];
    if (!adult) return null;
    return ageOnDate(adult.birthDate, world.currentDate) >= 18
      ? { world, personId: holder.personId }
      : null;
  }

  // Both remaining roles live at school, so no school means no scene.
  const enrolments = activeEducationEnrollmentsAt(world, personId);
  const enrolment = enrolments[0];
  if (!enrolment) return null;
  const schoolId = enrolment.enrollment.organizationId;
  if (schoolId === null) return null;
  // Nobody joins a school before it has one, and a companion's record must not
  // predate the enrolment that makes them a companion.
  const joinedOn = enrolment.enrollment.startedAt as IsoDate;

  const existing = findCompanion(world, personId, role, childAge, schoolId);
  if (existing !== null) return { world, personId: existing };

  const stableKey = `formative-context:${role}:${schoolId}`;
  const companionId = characterHistoryContextPersonId(world, stableKey);
  if (world.people[companionId]) {
    // The same person every time is the point — a classmate is not a new
    // stranger each lunchtime — but only while they still hold the role. If
    // this one has left the school, they are no longer the person the scene
    // needs, and returning them anyway is how a "teacher" ends up being
    // somebody who does not teach here.
    return holdsRole(world, companionId, role, schoolId, childAge)
      ? { world, personId: companionId }
      : null;
  }

  const rng = new SeededRng(world.seed).fork(`${stableKey}:${personId}`);
  const birthDate =
    role === "peer"
      ? // Within a year either way of the child, which is what a classmate is.
        shiftYears(person.birthDate, rng.integer(-1, 2))
      : yearsBefore(person.birthDate, rng.integer(24, 46));

  // Age made them plausible; this is what makes them true. A classmate is
  // somebody enrolled at the same school, and a teacher is somebody employed
  // to teach at it — facts in the world, written down, and readable by
  // everything downstream that later says "your classmate" or "your teacher".
  const transitions: CharacterHistoryTransition[] = [
    {
      kind: "context-person",
      input: {
        stableKey,
        ...drawCanonicalName(rng),
        birthDate,
        homeJurisdictionId: person.homeJurisdictionId,
      },
    },
  ];
  if (role === "peer") {
    transitions.push({
      kind: "education",
      input: {
        stableKey: `${stableKey}:enrollment`,
        personId: companionId,
        organizationId: schoolId,
        startedAt: joinedOn,
        programKind: enrolment.enrollment.programKind,
        // Classmates are in the same stage as the child they sit with, so the
        // stage is read off the child's age when this school year began rather
        // than assumed.
        contextKind:
          ageOnDate(person.birthDate, joinedOn) >= 14
            ? "stage:secondary"
            : "stage:primary",
        provenance: CONTEXT_PROVENANCE,
      },
    });
  } else {
    transitions.push({
      kind: "work",
      input: {
        stableKey: `${stableKey}:work`,
        personId: companionId,
        organizationId: schoolId,
        startedAt: joinedOn,
        kind: "employment:school-teaching",
        compensation: "paid",
        authority: "directs-others",
        dependency: "dependent",
        economicRisk: "organization-borne",
        provenance: CONTEXT_PROVENANCE,
        initialRole: {
          title: "Teacher",
          occupationClassification: "occupation:school-teacher",
          locationJurisdictionId: person.homeJurisdictionId,
          timeDemand: {
            ...TEACHING_HOURS,
            locationJurisdictionId: person.homeJurisdictionId,
          },
        },
      },
    });
  }

  const next = applyCharacterHistoryPlan(world, {
    stableKey,
    mode: "quick-generated",
    personId,
    transitions,
  }).world;
  return { world: next, personId: companionId };
}

/** A school week, stated rather than borrowed from an office. */
const TEACHING_HOURS = {
  expectedWeekly: { minimumHours: 30, maximumHours: 45 },
  attention: "high",
  concurrency: "partly-concurrent",
  scheduleRigidity: "rigid",
  interruptibility: "non-interruptible",
} as const;

const CONTEXT_PROVENANCE = {
  kind: "generated" as const,
  generatorKey: "formative-context-v1",
};

/**
 * Whether somebody actually holds the part the scene is about to give them.
 *
 * This is the question `findCompanion` and the stable-companion shortcut both
 * have to answer, and answering it in one place is why they cannot drift: age
 * is a filter, the role is the claim.
 */
function holdsRole(
  world: World,
  candidateId: EntityId,
  role: "peer" | "teacher",
  schoolId: EntityId,
  childAge: number,
): boolean {
  const candidate = world.people[candidateId];
  if (!candidate) return false;
  const age = ageOnDate(candidate.birthDate, world.currentDate);
  if (role === "peer") {
    return (
      Math.abs(age - childAge) <= PEER_AGE_TOLERANCE_YEARS &&
      activeEducationEnrollmentsAt(world, candidateId).some(
        (entry) => entry.enrollment.organizationId === schoolId,
      )
    );
  }
  return (
    age >= 18 &&
    age - childAge >= TEACHER_MINIMUM_AGE_GAP &&
    activeWorkRelationshipsAt(world, candidateId).some(
      (entry) => entry.relationship.organizationId === schoolId,
    )
  );
}

/**
 * Somebody already in the world who can play this part.
 *
 * "Can" means holds the role, not resembles somebody who might. A similarly
 * aged stranger used to be returned as a classmate whether or not they had ever
 * been to this school — so a scene could name a peer the child had never sat
 * with, and history recorded it as though they had.
 */
function findCompanion(
  world: World,
  personId: EntityId,
  role: "peer" | "teacher",
  childAge: number,
  schoolId: EntityId,
): EntityId | null {
  for (const candidateId of world.personOrder) {
    if (candidateId === personId) continue;
    if (holdsRole(world, candidateId, role, schoolId, childAge)) {
      return candidateId;
    }
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/* Eligibility. Explicit, and answerable from the world.                       */
/* -------------------------------------------------------------------------- */

/**
 * Whether this life can actually do the thing the scene asks of it.
 *
 * The engine's default provider allows everything, which is right for a
 * developer fixture and wrong for a game: it let a teen job be taken by a
 * character with no context for one. Production passes this instead, and it
 * answers from the world rather than from an assumption.
 */
export function formativeEligibilityProvider(
  situationKey: LifeSituationKey,
): LifeEligibilityProvider {
  return {
    evaluate(world, request): LifeEligibilityDecision {
      const person = world.people[request.actorPersonId];
      if (!person) {
        return blocked(
          "context:person-missing",
          "The world has no record of this person.",
        );
      }
      const age = ageOnDate(person.birthDate, request.asOfDate as IsoDate);

      if (situationKey === "formative.teen-work-opportunity") {
        if (age < 14) {
          return blocked(
            "rule:below-working-age",
            "This character is too young for the job on offer.",
          );
        }
        if (activeEducationEnrollmentsAt(world, person.id).length === 0) {
          return blocked(
            "context:no-school",
            "This job is offered around a school week, and this character is not at school.",
          );
        }
      }

      if (SCHOOL_SITUATIONS.includes(situationKey)) {
        if (activeEducationEnrollmentsAt(world, person.id).length === 0) {
          return blocked(
            "context:no-school",
            "This happens at school, and this character is not at one.",
          );
        }
      }

      if (EMPLOYMENT_SITUATIONS.includes(situationKey)) {
        if (activeWorkRelationshipsAt(world, person.id).length === 0) {
          return blocked(
            "context:no-work",
            "This happens at work, and this character does not have a job.",
          );
        }
      }

      if (HOUSEHOLD_SITUATIONS.includes(situationKey)) {
        const inHousehold = world.history.householdMemberships.some(
          (membership) => membership.personId === person.id,
        );
        if (!inHousehold) {
          return blocked(
            "context:no-household",
            "This happens at home, and this character's household is not recorded.",
          );
        }
      }

      return { status: "allowed", reasons: [] };
    },
  };
}

const SCHOOL_SITUATIONS: readonly LifeSituationKey[] = [
  "formative.school-entry",
  "formative.lunch-table",
  "formative.teacher-mentor",
  "formative.school-rule-input",
  "formative.student-organizing",
];

const HOUSEHOLD_SITUATIONS: readonly LifeSituationKey[] = [
  "formative.household-transition",
  "formative.broken-object",
  "formative.care-conflict",
  "formative.illness-in-the-house",
  "formative.money-shortfall",
  "formative.caring-for-someone",
];

/** Situations that only exist because the character has a job. */
const EMPLOYMENT_SITUATIONS: readonly LifeSituationKey[] = [
  "formative.workplace-rule",
];

function blocked(
  key: LifeEligibilityReasonKey,
  explanation: string,
): LifeEligibilityDecision {
  return { status: "blocked", reasons: [{ key, explanation }] };
}

function shiftYears(date: IsoDate, years: number): IsoDate {
  return `${(Number(date.slice(0, 4)) + years).toString().padStart(4, "0")}${date.slice(4)}` as IsoDate;
}

function yearsBefore(date: IsoDate, years: number): IsoDate {
  return shiftYears(date, -years);
}

/* -------------------------------------------------------------------------- */
/* Pacing.                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * How far the clock moves between moments worth remembering.
 *
 * This is authored game-design pacing spending the accepted anchor budget
 * across the band it belongs to — *not* a claim about how often anything
 * happens to real children. The research classifies most of these kernels'
 * arrival frequencies as unresolved, so nothing here samples one; the previous
 * fixed 200-to-420-day cadence was an invented rate wearing a constant's
 * clothes, and it ignored the budget the contract actually specifies.
 */
export function formativeStepDays(
  world: World,
  personId: EntityId,
  interval: {
    readonly band: string;
    readonly beginsAt: IsoDate;
    readonly endsAt: IsoDate;
    readonly anchorBudget: readonly [number, number];
  },
): number {
  const rng = new SeededRng(world.seed).fork(
    `formative-pacing-v2:${personId}:${interval.band}`,
  );
  const [minimum, maximum] = interval.anchorBudget;
  const anchors = Math.max(1, rng.integer(minimum, maximum + 1));
  const bandDays = Math.max(1, daysBetween(interval.beginsAt, interval.endsAt));

  // The band's anchors are marks laid evenly across the band, and a step is the
  // distance from here to the next mark — not one fixed length repeated.
  //
  // A fixed length is what let the budget go unspent. Divide the band by its
  // anchors, repeat that length from wherever the character happens to be, and
  // the last step of the band lands somewhere in the next one; the days it ate
  // there are days that band never gets to put an anchor on. Counting from the
  // band's own start instead means a band lived from its first day gets exactly
  // the anchors it was budgeted, and one entered part-way through gets the
  // marks that are left — which is the honest answer for a character who was
  // not there for the rest.
  const elapsed = Math.min(
    Math.max(daysBetween(interval.beginsAt, world.currentDate), 0),
    bandDays,
  );
  const nextMark = Math.floor((elapsed * anchors) / bandDays) + 1;
  const nextAt = Math.min(
    Math.round((nextMark * bandDays) / anchors),
    bandDays,
  );
  return Math.max(1, nextAt - elapsed);
}

function daysBetween(from: string, to: string): number {
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
      86_400_000,
  );
}

/**
 * Whether a situation can be offered to this life at all.
 *
 * Asked before the scene is drawn rather than after it is chosen, so a child
 * with no job is never shown a shift, and a child with no school is never
 * shown a classroom. The engine's allow-everything default is fine for a
 * fixture; a game has to answer from the world.
 */
export function formativeSituationAvailable(
  world: World,
  personId: EntityId,
  situationKey: LifeSituationKey,
): boolean {
  const person = world.people[personId];
  if (!person) return false;
  const decision = formativeEligibilityProvider(situationKey).evaluate(world, {
    actorPersonId: personId,
    actionKey: "life:formative-situation",
    asOfDate: world.currentDate,
    jurisdictionId: null,
    contextEntityIds: [],
  });
  return decision.status === "allowed";
}
