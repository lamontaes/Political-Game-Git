import {
  LIFE_TRANSITION_HANDLERS,
  activeEducationEnrollmentsAt,
  adaptiveSelectionSeed,
  advanceWorld,
  ageOnDate,
  availableLifeSituations,
  createOrganization,
  currentLifeCutoff,
  dateAtAge,
  didPeopleShareEducationOrganization,
  formativeIntervalAt,
  lifePlaceByJurisdictionId,
  personName,
  playerModelFor,
  resolveLifeSituation,
  selectSituation,
  situationProfile,
} from "../simulation";
import type {
  AvailableLifeSituation,
  EntityId,
  FormativeInterval,
  LifeSituationBand,
  LifeSituationKey,
  TeenWorkOpportunity,
  World,
} from "../simulation";
import {
  companionRoleFor,
  formativeEligibilityProvider,
  formativeSituationAvailable,
  formativeStepDays,
  resolveFormativeCompanion,
} from "./formative-context";
import type { ConversationRoomContext } from "./run-b-conversation";

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

const BAND_LABELS: Readonly<Record<LifeSituationBand, string>> = {
  "early-childhood": "Early childhood",
  "middle-childhood": "Childhood",
  adolescence: "Adolescence",
  adulthood: "Adult life",
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
  readonly band: LifeSituationBand;
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
  // Offered with a companion in hand, because a situation that needs one is
  // only real if somebody who can actually play that part exists. Passing the
  // first other person in the world is how an eight-year-old ended up sharing
  // a lunch table with a twenty-eight-year-old.
  const situations = availableLifeSituations(world, {
    personId,
    asOfDate: world.currentDate,
    otherPersonId: personId,
  });
  // A situation is offered once. Replaying one would put the same remembered
  // sentence on the record twice, which reads as a fault rather than a life.
  // When the band has nothing left, the years simply pass.
  const pool = situations.filter(
    (situation) =>
      !hasPlayed(world, personId, situation.key) &&
      formativeSituationAvailable(world, personId, situation.key) &&
      canBePeopled(world, personId, situation),
  );
  if (pool.length === 0) return null;

  const played = playedSituationCount(world, personId);
  // Ranked rather than drawn. The pool is exactly what it was — hard
  // eligibility and causal availability have already had their say — and what
  // is added is the rest of the research's order: current relevance, how hard
  // the moment pulls in two directions for *this* player, a novelty guard, a
  // pacing guard, and a deterministic tie-break. Nothing here consumes the
  // simulation's randomness, which is what makes the sequence reproducible
  // from the save rather than from the order the browser happened to render in.
  const history = playedSituationKeys(world, personId);
  const selection = selectSituation({
    selectionSeed: adaptiveSelectionSeed(world),
    personKey: personId,
    ordinal: played,
    model: playerModelFor(world, personId),
    candidates: pool.map((candidate) => {
      const profile = situationProfile(candidate.key);
      return {
        key: candidate.key,
        band: candidate.band,
        stakes: profile.stakes,
        tensions: profile.tensions,
        // A formative situation is already gated by band and by context;
        // claiming a finer relevance than that would be a number with nothing
        // behind it.
        relevance: 0.5,
        followsFromHistory: candidate.key === "formative.workplace-rule",
      };
    }),
    recentKeys: history.slice(-6),
    recentStakes: history.slice(-6).map((key) => situationProfile(key).stakes),
  });
  if (!selection) return null;
  const situation = pool.find(
    (candidate) => candidate.key === selection.chosen.candidate.key,
  ) as AvailableLifeSituation;
  const resolved = resolveFormativeCompanion(
    world,
    personId,
    companionRoleFor(situation.key),
  );
  const companionId =
    resolved && resolved.personId !== personId ? resolved.personId : null;
  const companion = companionId
    ? (resolved?.world ?? world).people[companionId]
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

  // The companion is written into the world here rather than when the scene
  // was drawn, because a person only exists once something actually happened
  // with them in it.
  const role = companionRoleFor(input.situationKey);
  const companion = resolveFormativeCompanion(
    staged.world,
    input.personId,
    role,
  );
  if (role !== null && companion === null) {
    throw new Error(
      "This moment needs someone the world cannot currently put in it.",
    );
  }
  const withWorld = companion?.world ?? staged.world;
  const otherPersonId =
    role === null || companion === null || companion.personId === input.personId
      ? null
      : companion.personId;

  const result = resolveLifeSituation(withWorld, {
    stableKey: `formative-play:${input.personId}:${played}:${input.situationKey}`,
    mode: "played",
    personId: input.personId,
    situationKey: input.situationKey,
    optionKey: input.optionKey,
    occurredAt: world.currentDate,
    jurisdictionId,
    otherPersonId,
    // Explicit, and answerable from the world. The engine's default provider
    // allows everything, which is right for a fixture and wrong for a game.
    eligibilityProvider: formativeEligibilityProvider(input.situationKey),
    teenWorkOpportunity: staged.opportunity,
  });
  if (result.status === "blocked") {
    return result.world;
  }
  return advanceToNextMoment(result.world, input.personId, interval);
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
  return advanceToNextMoment(world, personId, interval);
}

function advanceToNextMoment(
  world: World,
  personId: EntityId,
  interval: FormativeInterval,
): World {
  const person = world.people[personId];
  if (!person) throw new Error("This character is not in the world.");
  // Stop on the eighteenth birthday rather than stepping over it, so the last
  // year of the formative band is still playable.
  const grownUpOn = dateAtAge(person.birthDate, FORMATIVE_YEARS_END_AGE);
  const step = formativeStepDays(world, personId, interval);
  // And stop on the band boundary for the same reason. A step that began near
  // the end of a band used to carry the character over it — spending days out
  // of the next band without spending one of its anchors — so a childhood
  // could reach adolescence having quietly skipped a third of middle
  // childhood. Each band's budget is spent inside that band or not at all.
  const untilBoundary = Math.max(
    daysBetween(world.currentDate, interval.endsAt),
    1,
  );
  const untilGrown = Math.max(daysBetween(world.currentDate, grownUpOn), 1);
  const days = Math.min(step, untilBoundary, untilGrown);
  // With the handler registry, because a life that reaches adulthood may
  // already be carrying a scheduled callback, and time refuses to step over a
  // due item it has no handler for rather than silently losing it.
  return advanceWorld(world, days, LIFE_TRANSITION_HANDLERS);
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

function playedSituationKeys(
  world: World,
  personId: EntityId,
): readonly LifeSituationKey[] {
  return world.history.events
    .filter(
      (event) =>
        event.involvedEntityIds.includes(personId) &&
        event.tags.some((tag) => tag.startsWith("formative.")),
    )
    .sort((left, right) => left.sequence - right.sequence)
    .flatMap((event) => {
      const key = event.tags.find((tag) => tag.startsWith("formative."));
      return key ? [key as LifeSituationKey] : [];
    });
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

/**
 * Whether the world can put the right person in this scene.
 *
 * Asked before the scene is offered rather than after it is chosen, so a
 * child with no school is simply not shown a classroom, instead of being shown
 * one and handed whoever happened to be nearby.
 */
function canBePeopled(
  world: World,
  personId: EntityId,
  situation: AvailableLifeSituation,
): boolean {
  const role = companionRoleFor(situation.key);
  if (role === null) return !situation.needsCompanion;
  return resolveFormativeCompanion(world, personId, role) !== null;
}

/**
 * A corridor, and somebody who is in the same class.
 *
 * The school subject has existed since it was written and no player has ever
 * been able to reach it, because nothing built it a room. It needs two facts,
 * and the world already records both: this character is enrolled somewhere
 * right now, and so is somebody else, at the same organization, over an
 * overlapping period.
 *
 * Where the world has no such person there is no conversation. A schoolmate
 * invented for the occasion would be a person the rest of the game had never
 * heard of.
 */
export function schoolConversationRoom(
  world: World,
  personId: EntityId,
): ConversationRoomContext | null {
  const person = world.people[personId];
  if (!person) return null;
  const cutoff = currentLifeCutoff(world);
  const enrollments = activeEducationEnrollmentsAt(world, personId, cutoff);
  if (enrollments.length === 0) return null;

  const classmateIds = world.personOrder.filter(
    (candidateId) =>
      candidateId !== personId &&
      world.people[candidateId] !== undefined &&
      activeEducationEnrollmentsAt(world, candidateId, cutoff).length > 0 &&
      didPeopleShareEducationOrganization(world, personId, candidateId, cutoff),
  );
  if (classmateIds.length === 0) return null;

  const place = lifePlaceByJurisdictionId(person.homeJurisdictionId);
  const jurisdictionId =
    place?.context.jurisdiction.id ?? person.homeJurisdictionId;
  if (!world.jurisdictions[jurisdictionId]) return null;

  const present = [personId, ...classmateIds];
  const others = classmateIds
    .slice(1)
    .map((id) => world.people[id]?.givenName)
    .filter((name): name is string => name !== undefined);
  return {
    sceneKey: "formative:school-corridor",
    // The part points at somebody so the subject has a name to reach for. Which
    // of them the player actually speaks to is the player's, below.
    roles: { "the-other-person": classmateIds[0]! },
    locationLabel: "School",
    jurisdictionId,
    playerPersonId: personId,
    physicallyPresentPersonIds: present,
    activeParticipantPersonIds: present,
    // Everybody in the same class, because the world does not record which of
    // them the player is working with. Choosing is more faithful than being
    // assigned a partner the record never named.
    eligibleAddresseePersonIds: classmateIds,
    normalHearingPersonIds: present,
    quietAmbientHearingPersonIds: [],
    // A corridor with the rest of the class in it is not a private place. With
    // one other pupil it is, and the reason names whoever is stopping it.
    privateAvailable: classmateIds.length === 1,
    privateUnavailableReason:
      classmateIds.length === 1
        ? null
        : `${others.join(" and ")} ${
            others.length > 1 ? "are" : "is"
          } right there in the corridor.`,
  };
}
