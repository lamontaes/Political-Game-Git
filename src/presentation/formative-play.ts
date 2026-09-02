import {
  SeededRng,
  advanceWorld,
  ageOnDate,
  availableLifeSituations,
  createOrganization,
  dateAtAge,
  formativeIntervalAt,
  lifePlaceByJurisdictionId,
  personName,
  resolveLifeSituation,
} from "../simulation";
import type {
  AvailableLifeSituation,
  EntityId,
  FormativePacingBand,
  LifeSituationKey,
  TeenWorkOpportunity,
  World,
} from "../simulation";

/**
 * The growing-up years, played.
 *
 * This is a reading surface over the formative engine that is already in the
 * simulation. It does not decide anything the engine decides: eligibility,
 * consequences and canonical history all stay where they are. What it adds is
 * the scene, the order situations arrive in, and the years where nothing much
 * happens — because a childhood made entirely of turning points is not a
 * childhood.
 */

export const FORMATIVE_YEARS_END_AGE = 18;

const BAND_LABELS: Readonly<Record<FormativePacingBand, string>> = {
  "early-childhood": "Early childhood",
  "middle-childhood": "Childhood",
  adolescence: "Adolescence",
};

/** How far the clock moves after one moment worth remembering. */
const BAND_STEP_DAYS: Readonly<Record<FormativePacingBand, number>> = {
  "early-childhood": 300,
  "middle-childhood": 260,
  adolescence: 200,
};

export interface FormativeSceneOption {
  readonly key: string;
  readonly label: string;
  readonly description: string;
}

export interface FormativeMemory {
  readonly formedAt: string;
  readonly ageAtTime: number;
  readonly summary: string;
}

export interface FormativeScene {
  readonly personName: string;
  readonly age: number;
  readonly band: FormativePacingBand;
  readonly bandLabel: string;
  readonly placeName: string | null;
  readonly situationKey: LifeSituationKey;
  readonly prose: string;
  readonly options: readonly FormativeSceneOption[];
  /** The other person in the scene, when the situation needs one. */
  readonly withPersonId: EntityId | null;
  readonly withPersonName: string | null;
}

export interface FormativeYears {
  readonly personName: string;
  readonly age: number;
  readonly placeName: string | null;
  readonly scene: FormativeScene | null;
  readonly memories: readonly FormativeMemory[];
  readonly finished: boolean;
  /** What the player is told when the years are over. */
  readonly closingNote: string | null;
}

export function projectFormativeYears(
  world: World,
  personId: EntityId,
): FormativeYears {
  const person = world.people[personId];
  if (!person) throw new Error("This character is not in the world.");
  const name = personName(person);
  const age = ageOnDate(person.birthDate, world.currentDate);
  const placeName =
    lifePlaceByJurisdictionId(person.homeJurisdictionId)?.displayName ?? null;
  const memories = formativeMemories(world, personId);
  const interval = formativeIntervalAt(world, personId);

  if (!interval) {
    return {
      personName: name,
      age,
      placeName,
      scene: null,
      memories,
      finished: true,
      closingNote:
        memories.length > 0
          ? `${name} is ${age}. What happened in those years happened, and stays on the record from here.`
          : `${name} is ${age}. Nothing from those years was played, so the record of them is thin.`,
    };
  }

  return {
    personName: name,
    age,
    placeName,
    scene: nextScene(world, personId, name, age, placeName),
    memories,
    finished: false,
    closingNote: null,
  };
}

/**
 * Chooses which situation comes next.
 *
 * The choice is drawn from the seeded world and the number of moments already
 * on the record, so the same world always tells the same story in the same
 * order, and two different worlds do not.
 */
function nextScene(
  world: World,
  personId: EntityId,
  name: string,
  age: number,
  placeName: string | null,
): FormativeScene | null {
  const companionId = formativeCompanion(world, personId);
  const situations = availableLifeSituations(world, {
    personId,
    asOfDate: world.currentDate,
    otherPersonId: companionId,
  });
  // A situation is offered once. Replaying one would put the same remembered
  // sentence on the record twice, which reads as a fault rather than a life.
  // When the band has nothing left, the years simply pass.
  const pool = situations.filter(
    (situation) => !hasPlayed(world, personId, situation.key),
  );
  if (pool.length === 0) return null;

  const played = playedSituationCount(world, personId);
  const rng = new SeededRng(world.seed).fork(
    `formative-scene-v1:${personId}:${played}:${world.currentDate}`,
  );
  const situation = rng.pick(pool) as AvailableLifeSituation;
  const companion =
    situation.needsCompanion && companionId
      ? world.people[companionId]
      : undefined;

  return {
    personName: name,
    age,
    band: situation.band,
    bandLabel: BAND_LABELS[situation.band],
    placeName,
    situationKey: situation.key,
    prose: situation.prose,
    options: situation.options.map((option) => ({
      key: option.key,
      label: option.label,
      description: option.description,
    })),
    withPersonId: companion?.id ?? null,
    withPersonName: companion ? personName(companion) : null,
  };
}

export interface ChooseFormativeOptionInput {
  readonly personId: EntityId;
  readonly situationKey: LifeSituationKey;
  readonly optionKey: string;
  readonly withPersonId: EntityId | null;
}

/** Records the choice, then lets the intervening time pass. */
export function chooseFormativeOption(
  world: World,
  input: ChooseFormativeOptionInput,
): World {
  const interval = formativeIntervalAt(world, input.personId);
  if (!interval) {
    throw new Error("These are no longer the formative years.");
  }
  const person = world.people[input.personId];
  if (!person) throw new Error("This character is not in the world.");
  const place = lifePlaceByJurisdictionId(person.homeJurisdictionId);
  const played = playedSituationCount(world, input.personId);
  const jurisdictionId = place?.context.jurisdiction.id ?? null;
  const takingTheJob =
    input.situationKey === "formative.teen-work-opportunity" &&
    input.optionKey === "accept";
  const staged = takingTheJob
    ? openTeenEmployer(world, jurisdictionId)
    : { world, opportunity: undefined };
  const result = resolveLifeSituation(staged.world, {
    stableKey: `formative-play:${input.personId}:${played}:${input.situationKey}`,
    mode: "played",
    personId: input.personId,
    situationKey: input.situationKey,
    optionKey: input.optionKey,
    occurredAt: world.currentDate,
    jurisdictionId,
    otherPersonId: input.withPersonId,
    teenWorkOpportunity: staged.opportunity,
  });
  if (result.status === "blocked") {
    return result.world;
  }
  return advanceToNextMoment(result.world, input.personId, interval.band);
}

/**
 * The first job.
 *
 * A teenager can only take a job if there is somewhere to take it, so the
 * employer is recorded before the choice is. It is a small local grocery
 * because that is a job the eligibility rules can actually check hours and age
 * against — not a claim about any real employer or wage.
 */
function openTeenEmployer(
  world: World,
  jurisdictionId: EntityId | null,
): { readonly world: World; readonly opportunity: TeenWorkOpportunity } {
  const stableKey = "formative-play:first-job";
  const provenance = {
    kind: "generated" as const,
    generatorKey: "formative-first-job-v1",
  };
  const existing = world.history.organizations.find(
    (organization) => organization.stableKey === stableKey,
  );
  const next = existing
    ? world
    : createOrganization(world, {
        stableKey,
        formedAt: world.currentDate,
        provenance,
        initialProfile: {
          name: "Neighborhood grocery",
          classification: "enterprise:retail",
          locationJurisdictionId: jurisdictionId,
        },
      });
  const organization =
    existing ??
    next.history.organizations.find(
      (candidate) => candidate.stableKey === stableKey,
    );
  if (!organization) {
    throw new Error("The first job has nowhere to happen.");
  }
  return {
    world: next,
    opportunity: {
      organizationId: organization.id,
      workStableKey: "formative-play:first-job:work",
      title: "Weekend stock clerk",
      workKind: "employment:part-time",
      occupationClassification: "occupation:retail-stock",
      timeDemand: {
        expectedWeekly: { minimumHours: 8, maximumHours: 14 },
        attention: "moderate",
        concurrency: "mostly-exclusive",
        scheduleRigidity: "rigid",
        interruptibility: "limited",
        locationJurisdictionId: jurisdictionId,
      },
    },
  };
}

/**
 * Lets a stretch of ordinary time go by without manufacturing an event for it.
 * Most years of a life are like this, and the record should be allowed to say so.
 */
export function letTimePass(world: World, personId: EntityId): World {
  const interval = formativeIntervalAt(world, personId);
  if (!interval) throw new Error("These are no longer the formative years.");
  return advanceToNextMoment(world, personId, interval.band);
}

function advanceToNextMoment(
  world: World,
  personId: EntityId,
  band: FormativePacingBand,
): World {
  const person = world.people[personId];
  if (!person) throw new Error("This character is not in the world.");
  const rng = new SeededRng(world.seed).fork(
    `formative-pacing-v1:${personId}:${world.currentDate}`,
  );
  // Stop on the eighteenth birthday rather than stepping over it, so the last
  // year of the formative band is still playable.
  const grownUpOn = dateAtAge(person.birthDate, FORMATIVE_YEARS_END_AGE);
  const step = BAND_STEP_DAYS[band] + rng.integer(0, 120);
  const remaining = daysBetween(world.currentDate, grownUpOn);
  const days = Math.min(step, Math.max(remaining, 1));
  return advanceWorld(world, days);
}

function daysBetween(from: string, to: string): number {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  return Math.round((end - start) / 86_400_000);
}

function formativeMemories(
  world: World,
  personId: EntityId,
): readonly FormativeMemory[] {
  const person = world.people[personId];
  if (!person) return [];
  return world.history.memories
    .filter(
      (memory) =>
        memory.personId === personId &&
        memory.relevanceTags.some((tag) => tag.startsWith("formative.")),
    )
    .map((memory) => ({
      formedAt: memory.formedAt,
      ageAtTime: ageOnDate(person.birthDate, memory.formedAt),
      summary: memory.rememberedSummary,
    }));
}

function playedSituationCount(world: World, personId: EntityId): number {
  return world.history.memories.filter(
    (memory) =>
      memory.personId === personId &&
      memory.relevanceTags.some((tag) => tag.startsWith("formative.")),
  ).length;
}

function hasPlayed(
  world: World,
  personId: EntityId,
  situationKey: LifeSituationKey,
): boolean {
  return world.history.memories.some(
    (memory) =>
      memory.personId === personId &&
      memory.relevanceTags.includes(situationKey),
  );
}

/** Someone else who is around. Used only by situations that need a second person. */
function formativeCompanion(world: World, personId: EntityId): EntityId | null {
  return world.personOrder.find((candidate) => candidate !== personId) ?? null;
}
