import {
  characterHistoryContextPersonId,
  createCharacterHistoryContextPeople,
  type CharacterHistoryContextPersonInput,
} from "../character-history";
import { makeIsoDate } from "../dates";
import { birthCohortGivenName } from "../given-name-cohorts";
import type { LivingWorldMemberNameVersion } from "../living-world/opening";
import { createStableId } from "../ids";
import {
  drawCanonicalNameForGender,
  DISTINCT_GIVEN_NAME_GENERATION_VERSION,
} from "../people";
import { generatePersonIdentity } from "../person-identity";
import { SeededRng } from "../rng";
import type { EntityId, IsoDate, PersonFact, World } from "../types";
import { assertWorldIntegrity } from "../world";
import { buildOpeningCourtCatalog } from "./courts";
import { FEDERAL_COURTS_PROJECTION } from "./generated/federal-courts";
import type {
  JudicialProfessionalQualificationRecord,
  JudicialSeat,
  JudicialSeatTenure,
} from "./types";

// PLACEHOLDER(overnight): These are fictional opening biographies, not a
// calibrated distribution of judges' prior occupations.
const CAREERS = [
  { title: "Public defender", employer: "Public defense office" },
  { title: "Prosecutor", employer: "Prosecutor's office" },
  { title: "Civil rights attorney", employer: "Civil rights practice" },
  { title: "Government attorney", employer: "Government legal office" },
  { title: "Business attorney", employer: "Business law practice" },
  { title: "Legal aid attorney", employer: "Legal aid office" },
] as const;

function yearOf(date: IsoDate): number {
  return Number(date.slice(0, 4));
}

function onBirthdayYear(birthDate: IsoDate, age: number): IsoDate {
  return makeIsoDate(`${yearOf(birthDate) + age}-07-01`);
}

function yearsAfter(date: IsoDate, years: number): IsoDate {
  const monthDay = date.slice(5);
  const year = yearOf(date) + years;
  return makeIsoDate(`${year}-${monthDay === "02-29" ? "02-28" : monthDay}`);
}

function homeForSeat(
  world: World,
  seat: JudicialSeat,
  rng: SeededRng,
): EntityId {
  const court = world.judiciary!.courts[seat.courtId]!;
  if (court.jurisdictionId) return court.jurisdictionId;
  const source = FEDERAL_COURTS_PROJECTION.find(
    (item) => item.courtId === court.courtId,
  );
  const names = source?.jurisdictionName
    ? [source.jurisdictionName]
    : (source?.composition?.filter(
        (name) => name !== "All Federal judicial districts",
      ) ?? []);
  const regional = names.flatMap((name) =>
    Object.values(world.jurisdictions)
      .filter((jurisdiction) => jurisdiction.name === name)
      .map((jurisdiction) => jurisdiction.id),
  );
  const states = Object.values(world.jurisdictions)
    .filter((jurisdiction) => jurisdiction.kind === "state-placeholder")
    .map((jurisdiction) => jurisdiction.id);
  if (source?.courtKind === "district-court" && regional.length === 0)
    throw new Error(
      `Opening district judge has no recorded home for ${seat.courtId}.`,
    );
  // PLACEHOLDER(overnight): National courts without a bounded geographic
  // jurisdiction draw a fictional home state for their opening judges.
  const choices = regional.length > 0 ? regional : states;
  if (choices.length === 0)
    throw new Error("Opening judges need a recorded home jurisdiction.");
  return choices[rng.integer(0, choices.length)]!;
}

interface OpeningJudgePlan {
  readonly seat: JudicialSeat;
  readonly person: CharacterHistoryContextPersonInput;
  readonly career: (typeof CAREERS)[number];
  readonly homeJurisdictionId: EntityId;
}

/**
 * Seat fictional opening judges once through the world's person writer. Under
 * the same name policy as the opening's legislators, a judge's given name then
 * follows the year the judge was born.
 */
export function ensureOpeningJudiciary(
  world: World,
  nameVersion?: LivingWorldMemberNameVersion,
): World {
  if (world.judiciary?.seatTenures.length) return world;
  let next = buildOpeningCourtCatalog(world);
  const seats = Object.values(next.judiciary!.seats)
    .filter((seat) => seat.retiredAt === null && seat.linkedOfficeId === null)
    .sort((a, b) => a.seatId.localeCompare(b.seatId));
  const plans: OpeningJudgePlan[] = seats.map((seat) => {
    const rng = new SeededRng(next.seed).fork(
      `judicial-opening:v1:${seat.seatId}`,
    );
    const retirement =
      next.judiciary!.courts[seat.courtId]!.rules.mandatoryRetirementAge;
    const oldestExclusive =
      retirement.state === "known" && retirement.value !== null
        ? Math.min(71, retirement.value)
        : 71;
    if (oldestExclusive <= 45)
      throw new Error(`No eligible opening age for ${seat.courtId}.`);
    // PLACEHOLDER(overnight): Age 45-70 is a game-authored opening range.
    const age = rng.integer(45, oldestExclusive);
    const birthDate = makeIsoDate(
      `${yearOf(next.currentDate) - age - 1}-06-15`,
    );
    const identity = generatePersonIdentity(rng.fork("identity"));
    const name = drawCanonicalNameForGender(
      rng.fork("name"),
      identity.gender,
      undefined,
      DISTINCT_GIVEN_NAME_GENERATION_VERSION,
    );
    const homeJurisdictionId = homeForSeat(next, seat, rng.fork("home"));
    const stableKey = `judicial-opening:v1:${seat.seatId}:holder`;
    return {
      seat,
      person: {
        stableKey,
        ...name,
        ...(nameVersion === "cohort-v1"
          ? {
              givenName: birthCohortGivenName(next.seed, stableKey, {
                ...name,
                birthDate,
                gender: identity.gender,
              }),
            }
          : {}),
        birthDate,
        identity,
        homeJurisdictionId,
      },
      career: CAREERS[rng.integer(0, CAREERS.length)]!,
      homeJurisdictionId,
    };
  });
  next = createCharacterHistoryContextPeople(
    next,
    plans.map((plan) => plan.person),
  );
  const people = { ...next.people };
  const tenures: JudicialSeatTenure[] = [];
  const qualifications: JudicialProfessionalQualificationRecord[] = [];
  for (const plan of plans) {
    const personId = characterHistoryContextPersonId(
      next,
      plan.person.stableKey,
    );
    const person = people[personId]!;
    const careerStarted = onBirthdayYear(person.birthDate, 30);
    const careerFact: PersonFact = {
      id: createStableId("fact", `${personId}:judicial-opening-career`),
      stableKey: "judicial-opening-career",
      kind: "occupation",
      occurredAt: careerStarted,
      endedAt: next.currentDate,
      jurisdictionId: plan.homeJurisdictionId,
      employer: plan.career.employer,
      title: plan.career.title,
      status: "ended",
      subjectIds: [],
      summary: `${person.givenName} ${person.familyName} practiced as a ${plan.career.title.toLowerCase()} before taking the bench.`,
      provenance: {
        method: "manual",
        sourceEventId: null,
        note: "Fictional generated opening judicial background.",
      },
    };
    people[personId] = {
      ...person,
      establishedFacts: [...person.establishedFacts, careerFact],
    };
    const court = next.judiciary!.courts[plan.seat.courtId]!;
    const term = court.rules.termYears;
    tenures.push({
      tenureId: `judicial-tenure:${plan.seat.seatId}:${next.currentDate}:${personId}`,
      seatId: plan.seat.seatId,
      personId,
      startedAt: next.currentDate,
      endedAt: null,
      endReason: null,
      selection: {
        path: "initial-world",
        selectionRecordId: court.rules.selectionRecordId,
        decisionRecordId: null,
        selectingPersonId: null,
        contestId: null,
        note: "Fictional opening incumbent; earlier selection stages are not reconstructed.",
      },
      termEndsAt:
        term.state === "known" && term.value !== null
          ? yearsAfter(next.currentDate, term.value)
          : null,
      retentionDueAt: null,
    });
    qualifications.push({
      recordId: createStableId(
        "judicial-professional-qualification",
        `${personId}:${plan.homeJurisdictionId}:opening`,
      ),
      personId,
      jurisdictionId: plan.homeJurisdictionId,
      // PLACEHOLDER(overnight): These dates are fictional biography, not
      // sourced bar or elector records for a real judge.
      barAdmittedAt: onBirthdayYear(person.birthDate, 27),
      legalPracticeSince: careerStarted,
      qualifiedElectorSince: onBirthdayYear(person.birthDate, 21),
      recordedAt: next.currentDate,
      provenance: {
        kind: "generated-opening-background",
        seedKey: plan.person.stableKey,
        evidenceFactIds: [careerFact.id],
      },
    });
  }
  next = {
    ...next,
    people,
    judiciary: {
      ...next.judiciary!,
      seatTenures: tenures,
      professionalQualifications: qualifications,
    },
  };
  assertWorldIntegrity(next);
  return next;
}
