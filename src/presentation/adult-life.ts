import {
  createCampaignElectionTransitionRegistry,
  adaptiveSelectionSeed,
  applyCharacterHistoryPlan,
  addDays,
  adultSituation,
  advanceWorld,
  ageOnDate,
  availableAdultSituations,
  buildAdultLifeContext,
  createStableId,
  isAdultSituationKey,
  lifePlaceByJurisdictionId,
  personName,
  playerModelFor,
  resolveAdultCompanion,
  resolveLifeSituation,
  scheduleAftermath,
  selectSituation,
  situationProfile,
  situationRelevance,
} from "../simulation";
import type {
  AdultLifeContext,
  AdultSituationOption,
  CharacterHistoryTransition,
  EntityId,
  LifeSituationKey,
  LifeStakesTier,
  SituationCandidate,
  SituationSelectionReason,
  World,
} from "../simulation";

/**
 * Adult life, played.
 *
 * The reading surface over the adult provider and the adaptive selector, in the
 * same relationship to them that `formative-play.ts` has to the formative
 * engine: it decides nothing the engine decides, and adds the scene, the order
 * and the time that passes between moments.
 *
 * Two things are deliberately kept off this surface, and tests pin both. The
 * stakes tier the selector rationed by never appears in anything projected
 * here; neither does the reason the situation was chosen. A player who could
 * see either would be able to read importance off the presentation, and every
 * hard-looking decision would become a promise the world had not made.
 */

export interface AdultSceneOption {
  readonly key: string;
  readonly label: string;
  readonly description: string;
}

export interface AdultScene {
  readonly personName: string;
  readonly age: number;
  readonly placeName: string | null;
  readonly situationKey: LifeSituationKey;
  readonly prose: string;
  readonly options: readonly AdultSceneOption[];
  readonly withPersonId: EntityId | null;
  readonly withPersonName: string | null;
}

export interface AdultMoment {
  readonly occurredAt: string;
  readonly ageAtTime: number;
  readonly summary: string;
}

export interface AdultLife {
  readonly personName: string;
  readonly age: number;
  readonly placeName: string | null;
  readonly dateLabel: string;
  readonly scene: AdultScene | null;
  readonly moments: readonly AdultMoment[];
  /** Said when there is nothing in particular to decide, which is often. */
  readonly quietNote: string | null;
}

/**
 * How far the clock moves between adult moments.
 *
 * Authored presentation pacing. It is not a claim that anything happens to
 * anybody this often: the research classifies almost every one of these
 * families as having no defensible arrival rate, so the game does not sample
 * one. What this decides is how much of a life passes between the moments the
 * player is shown, which is a design question and is labelled as one.
 */
const STEP_DAYS: Readonly<Record<LifeStakesTier, number>> = {
  ordinary: 12,
  notable: 26,
  pressing: 41,
};

/** A quiet stretch, when the player asks for one. */
export const QUIET_STEP_DAYS = 21;

/**
 * How long before an ordinary situation may come round again.
 *
 * Ordinary life is repetitive and a bank that never repeats anything runs dry,
 * so repeats are allowed — but far enough apart that the remembered sentence
 * does not read as the record stuttering.
 */
const ORDINARY_REPEAT_GAP = 9;

const PROVENANCE = {
  kind: "generated" as const,
  generatorKey: "adult-life-v1",
};

/* -------------------------------------------------------------------------- */
/* Reading                                                                     */
/* -------------------------------------------------------------------------- */

export function projectAdultLife(world: World, personId: EntityId): AdultLife {
  const person = world.people[personId];
  if (!person) throw new Error("This character is not in the world.");
  const name = personName(person);
  const age = ageOnDate(person.birthDate, world.currentDate);
  const placeName =
    lifePlaceByJurisdictionId(person.homeJurisdictionId)?.displayName ?? null;
  const moments = adultMoments(world, personId);
  const selected = selectAdultSituation(world, personId);

  if (!selected) {
    return {
      personName: name,
      age,
      placeName,
      dateLabel: longDate(world.currentDate),
      scene: null,
      moments,
      quietNote:
        "Nothing this week that needs deciding. Most weeks are like this, and the record is allowed to say so.",
    };
  }

  const context = buildAdultLifeContext(world, personId);
  const situation = adultSituation(selected.key);
  const companionId = situation
    ? resolveAdultCompanion(context, situation.companion)
    : null;
  const companion = companionId ? world.people[companionId] : undefined;

  return {
    personName: name,
    age,
    placeName,
    dateLabel: longDate(world.currentDate),
    scene: {
      personName: name,
      age,
      placeName,
      situationKey: selected.key,
      prose: situation?.prose ?? "",
      options: (situation?.options ?? []).map((option) => ({
        key: option.key,
        label: option.label,
        description: option.description,
      })),
      withPersonId: companion?.id ?? null,
      withPersonName: companion ? personName(companion) : null,
    },
    moments,
    quietNote: null,
  };
}

/**
 * The selector's own account of what it chose and why.
 *
 * Exported for tests and audits, and used by nothing that renders and nothing
 * that schedules. Keeping it out of `projectAdultLife`'s return type is the
 * mechanism rather than a convention: a surface that never receives the reason
 * cannot leak it.
 */
export interface AdultSelectionTrace {
  readonly key: LifeSituationKey;
  readonly reason: SituationSelectionReason;
  readonly stakes: LifeStakesTier;
  readonly crossPressure: number;
  readonly candidateCount: number;
}

export function selectAdultSituation(
  world: World,
  personId: EntityId,
): AdultSelectionTrace | null {
  const context = buildAdultLifeContext(world, personId);
  const history = playedAdultKeys(world, personId);
  const candidates = eligibleCandidates(context, history);
  if (candidates.length === 0) return null;

  const selection = selectSituation({
    selectionSeed: adaptiveSelectionSeed(world),
    personKey: personId,
    ordinal: history.length,
    model: playerModelFor(world, personId),
    candidates,
    recentKeys: history.slice(-6),
    recentStakes: history.slice(-6).map((key) => situationProfile(key).stakes),
  });
  if (!selection) return null;
  // Every candidate this surface offered came from the adult bank, so the
  // winner is one of those keys. The selector's key type is wider because it
  // also ranks composed episode beats for `life-story.ts`; narrowing here is
  // reading back what this call site put in, and the guard says so rather
  // than asserting it.
  const chosenKey = selection.chosen.candidate.key;
  if (!isAdultSituationKey(chosenKey)) {
    throw new Error("The adult selector returned a key it was not offered.");
  }
  return {
    key: chosenKey,
    reason: selection.reason,
    stakes: selection.chosen.candidate.stakes,
    crossPressure: selection.chosen.pressure.strength,
    candidateCount: candidates.length,
  };
}

function eligibleCandidates(
  context: AdultLifeContext,
  history: readonly LifeSituationKey[],
): readonly SituationCandidate[] {
  const lastIndex = new Map<LifeSituationKey, number>();
  history.forEach((key, index) => lastIndex.set(key, index));
  return availableAdultSituations(context)
    .filter((situation) => {
      const seenAt = lastIndex.get(situation.key);
      if (seenAt === undefined) return true;
      // A hard moment happens once. An ordinary one may come round again,
      // eventually, because ordinary life is repetitive and pretending
      // otherwise is what leaves an adult with nothing to do after a month.
      if (situation.stakes !== "ordinary") return false;
      return history.length - seenAt >= ORDINARY_REPEAT_GAP;
    })
    .map((situation) => ({
      key: situation.key,
      band: "adulthood" as const,
      stakes: situation.stakes,
      tensions: situation.tensions,
      relevance: situationRelevance(situation.key, context),
      followsFromHistory: FOLLOWS_FROM_HISTORY.has(situation.key),
    }));
}

/**
 * Situations that exist only because of something the player already did.
 *
 * Named rather than inferred, because "this needed history" and "this happened
 * to require a household" are different claims and only the first should earn
 * the selector's continuity credit.
 */
const FOLLOWS_FROM_HISTORY: ReadonlySet<LifeSituationKey> = new Set([
  "adult.old-favour-returns",
  "adult.promise-comes-due",
  "adult.community-building",
  "adult.petition-ask",
  "adult.candidacy-approach",
]);

function playedAdultKeys(
  world: World,
  personId: EntityId,
): readonly LifeSituationKey[] {
  return world.history.events
    .filter(
      (event) =>
        event.involvedEntityIds.includes(personId) &&
        event.tags.some((tag) => tag.startsWith("adult.")),
    )
    .sort((left, right) => left.sequence - right.sequence)
    .flatMap((event) => {
      const key = event.tags.find((tag) => tag.startsWith("adult."));
      return key ? [key as LifeSituationKey] : [];
    });
}

function adultMoments(
  world: World,
  personId: EntityId,
): readonly AdultMoment[] {
  const person = world.people[personId];
  if (!person) return [];
  return world.history.memories
    .filter(
      (memory) =>
        memory.personId === personId &&
        memory.relevanceTags.some(
          (tag) => tag.startsWith("adult.") || tag === "life.callback",
        ),
    )
    .map((memory) => ({
      occurredAt: memory.formedAt,
      ageAtTime: ageOnDate(person.birthDate, memory.formedAt),
      summary: memory.rememberedSummary,
    }));
}

/* -------------------------------------------------------------------------- */
/* Acting                                                                      */
/* -------------------------------------------------------------------------- */

export interface ChooseAdultOptionInput {
  readonly personId: EntityId;
  readonly situationKey: LifeSituationKey;
  readonly optionKey: string;
}

/**
 * Records the choice, lets whatever follows be decided from the world, and
 * moves the clock on.
 *
 * The order matters and is the architecture. The choice is written first, by
 * the ordinary situation writer that the formative years already use. Only
 * then is the aftermath question asked — of world state, with no knowledge of
 * why this situation was offered — and only then does time pass, which is when
 * anything already scheduled gets its chance to come round or to be cancelled.
 */
export function chooseAdultOption(
  world: World,
  input: ChooseAdultOptionInput,
): World {
  if (!isAdultSituationKey(input.situationKey)) {
    throw new Error("That is not an adult situation.");
  }
  const situation = adultSituation(input.situationKey);
  const option = situation?.options.find(
    (candidate) => candidate.key === input.optionKey,
  );
  if (!situation || !option) {
    throw new Error("That option is not part of this situation.");
  }
  const person = world.people[input.personId];
  if (!person) throw new Error("This character is not in the world.");

  const place = lifePlaceByJurisdictionId(person.homeJurisdictionId);
  const jurisdictionId = place?.context.jurisdiction.id ?? null;
  const context = buildAdultLifeContext(world, input.personId);
  const companionId = resolveAdultCompanion(context, situation.companion);
  const played = playedAdultKeys(world, input.personId).length;
  const stableKey = `adult-life:${input.personId}:${played}:${input.situationKey}`;

  const staged = applyOptionWrites(world, input.personId, option, stableKey);
  const result = resolveLifeSituation(staged, {
    stableKey,
    mode: "played",
    personId: input.personId,
    situationKey: input.situationKey,
    optionKey: input.optionKey,
    occurredAt: world.currentDate,
    jurisdictionId,
    otherPersonId: companionId,
  });
  if (result.status === "blocked") return result.world;

  // What follows, decided here and from the world. Nothing about how the
  // situation was selected is in scope — `scheduleAftermath` cannot see the
  // selector's reason or the stakes tier, because they are not in its input
  // type and are not passed.
  const withAftermath = scheduleAftermath({
    world: result.world,
    personId: input.personId,
    situationKey: input.situationKey,
    optionKey: input.optionKey,
    aftermath: option.aftermath,
    counterpartPersonId: companionId,
    occurredAt: world.currentDate,
    eventId: result.eventId,
    stableKey,
  });

  return advanceWorld(
    withAftermath,
    STEP_DAYS[situation.stakes],
    createCampaignElectionTransitionRegistry(),
  );
}

/** Lets a stretch of ordinary time go by without manufacturing an event for it. */
export function letAdultTimePass(world: World, days = QUIET_STEP_DAYS): World {
  return advanceWorld(
    world,
    Math.max(1, Math.trunc(days)),
    createCampaignElectionTransitionRegistry(),
  );
}

/**
 * The world state an option asks for beyond the record of the choice itself.
 *
 * This is how a life opens up: volunteering writes a participation, and the
 * participation is what makes a community situation possible later. Nothing
 * here is a flag; each write is an ordinary canonical record that every other
 * query can already read.
 */
function applyOptionWrites(
  world: World,
  personId: EntityId,
  option: AdultSituationOption,
  stableKey: string,
): World {
  const write = option.writes ?? null;
  if (write === null) return world;
  const person = world.people[personId];
  if (!person) return world;
  const place = lifePlaceByJurisdictionId(person.homeJurisdictionId);
  const jurisdictionId = place?.context.jurisdiction.id ?? null;

  if (write.kind === "join-community-organization") {
    const organizationKey = `${stableKey}:organization`;
    const organizationId = createStableId(
      "organization",
      `${world.id}:${organizationKey}`,
    );
    const transitions: CharacterHistoryTransition[] = [
      {
        kind: "organization",
        input: {
          stableKey: organizationKey,
          formedAt: world.currentDate,
          provenance: PROVENANCE,
          initialProfile: {
            name: write.organizationLabel,
            classification: "community:voluntary",
            locationJurisdictionId: jurisdictionId,
          },
        },
      },
      {
        kind: "participation",
        input: {
          stableKey: `${stableKey}:participation`,
          personId,
          organizationId,
          startedAt: world.currentDate,
          kind: write.participationKind,
          roleKind: write.roleKind,
          context: null,
          provenance: PROVENANCE,
        },
      },
    ];
    return applyPlan(world, personId, `${stableKey}:writes`, transitions);
  }

  return applyPlan(world, personId, `${stableKey}:writes`, [
    {
      kind: "commitment",
      input: {
        stableKey: `${stableKey}:commitment`,
        personId,
        startsAt: world.currentDate,
        endsAt: null,
        kind: write.commitmentKind,
        label: write.label,
        timeDemand: {
          expectedWeekly: {
            minimumHours: write.weeklyHours[0],
            maximumHours: write.weeklyHours[1],
          },
          attention: "moderate",
          concurrency: "partly-concurrent",
          scheduleRigidity: "mixed",
          interruptibility: "interruptible",
          locationJurisdictionId: jurisdictionId,
        },
        provenance: PROVENANCE,
      },
    },
  ]);
}

function applyPlan(
  world: World,
  personId: EntityId,
  stableKey: string,
  transitions: readonly CharacterHistoryTransition[],
): World {
  return applyCharacterHistoryPlan(world, {
    stableKey,
    mode: "played",
    personId,
    transitions,
  }).world;
}

function longDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

/** The next date an adult moment could fall on, for tests that need it. */
export function nextAdultMomentDate(
  world: World,
  stakes: LifeStakesTier,
): string {
  return addDays(world.currentDate, STEP_DAYS[stakes]);
}
