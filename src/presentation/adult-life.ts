import { refreshLifeCircumstances } from "../simulation/life-circumstances";
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
  refreshLifeOpportunities,
  resolveAdultSituationCompanion,
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
  IsoDate,
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

/**
 * How far the clock may be carried to reach something the world already owes.
 *
 * The authored steps above decide how much of a life passes between the moments
 * the player is shown. They are a pacing choice, and on their own they can park
 * a life two days short of its own election and then show it a scene about the
 * shopping — which is what the audit reproduced on the story-choice route,
 * while the longer quiet step reached the same election without trouble.
 *
 * So an adult step will not stop short of the world's next due item when that
 * item falls inside the widest step this surface already takes. Nothing is
 * resolved here and no outcome is decided here: the advance runs with the same
 * handler registry it always ran with, and all this does is decline to stop
 * just before a date the world had already written down for itself. It is the
 * rule time already follows — a due item is never stepped over — read forwards.
 */
const STEP_REACH_DAYS = 41;

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

/**
 * The other way an ordinary situation comes round again: enough life passed.
 *
 * The gap above is counted in beats the player actually played, and on its own
 * it deadlocks. A player who reaches quiet time plays no beats, so the counter
 * never moves, so the ordinary situation never returns, so there is nothing to
 * play — which is precisely the dead end the audit walked into and could not
 * walk out of with six hundred or five thousand extra minutes.
 *
 * Time is the second way out, and it is the honest one: an ordinary week is
 * allowed to look like an ordinary week again once most of a year has gone by.
 * Authored presentation pacing, like the gap and the step lengths beside it,
 * and not a claim about how often anything happens to anybody.
 */
const ORDINARY_REPEAT_DAYS = 45;

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
    ? resolveAdultSituationCompanion(context, situation)
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
  const candidates = eligibleCandidates(
    context,
    history,
    playedAdultDates(world, personId),
  );
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
  playedOn: ReadonlyMap<LifeSituationKey, IsoDate>,
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
      if (history.length - seenAt >= ORDINARY_REPEAT_GAP) return true;
      // Or because enough of the life has gone past. Beats and days are both
      // ways of saying "a while ago", and a player who waits rather than
      // chooses is still letting a while go by.
      const last = playedOn.get(situation.key);
      return (
        last !== undefined &&
        addDays(last, ORDINARY_REPEAT_DAYS) <= context.asOfDate
      );
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

/** The last date each adult key was played on, for the time-based repeat gap. */
function playedAdultDates(
  world: World,
  personId: EntityId,
): ReadonlyMap<LifeSituationKey, IsoDate> {
  const played = new Map<LifeSituationKey, IsoDate>();
  for (const event of [...world.history.events].sort(
    (left, right) => left.sequence - right.sequence,
  )) {
    if (!event.involvedEntityIds.includes(personId)) continue;
    const key = event.tags.find((tag) => tag.startsWith("adult."));
    if (key) played.set(key as LifeSituationKey, event.occurredAt);
  }
  return played;
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
  // Validate the pre-offer World before option-specific writes can create
  // records which would falsely serve as evidence for their own premise.
  if (
    !availableAdultSituations(context).some(
      (candidate) => candidate.key === situation.key,
    )
  ) {
    throw new Error(
      "This adult situation is not available in the current world.",
    );
  }
  const companionId = resolveAdultSituationCompanion(context, situation);
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

  // Time first, then whatever the world has come to owe this life. The order
  // is the point: the opportunity write happens after the clock has moved, so
  // it is a consequence of a transition the player took rather than something
  // the choice screen conjured for itself.
  return refreshLifeOpportunities(
    advanceWorld(
      withAftermath,
      stepReaching(withAftermath, STEP_DAYS[situation.stakes]),
      createCampaignElectionTransitionRegistry(),
    ),
    input.personId,
  );
}

/**
 * Lets a stretch of ordinary time go by without manufacturing an event for it.
 *
 * Nothing is invented to fill the gap, and that has not changed. What has
 * changed is that a quiet stretch is also a legitimate transition, so when the
 * caller says whose stretch it is, the world may write down what has come to be
 * true for them by the end of it — another week's errands, or one request that
 * somebody made. Without this a player who chose to wait was choosing to end
 * their own game, which is what the audit reproduced.
 */
export function letAdultTimePass(world: World, days = QUIET_STEP_DAYS): World {
  const advanced = advanceWorld(
    world,
    stepReaching(world, Math.max(1, Math.trunc(days))),
    createCampaignElectionTransitionRegistry(),
  );
  // Whose stretch it was is a fact about the world, not an argument the caller
  // has to remember to pass. An observer world has nobody waiting on anything,
  // so nothing is written for one.
  return advanced.control.kind === "person"
    ? refreshLifeCircumstances(
        refreshLifeOpportunities(advanced, advanced.control.personId),
        advanced.control.personId,
      )
    : advanced;
}

/**
 * The authored step, or the day the world's next obligation falls due.
 *
 * Only forwards, only within `STEP_REACH_DAYS`, and only to a date the world
 * had already scheduled for itself. A world with nothing due takes the authored
 * step unchanged, which is almost every step.
 */
function stepReaching(world: World, authored: number): number {
  let reach = authored;
  for (const item of world.history.futureDueItems) {
    const days = daysBetween(world.currentDate, item.dueAt);
    if (days > reach && days <= STEP_REACH_DAYS) reach = days;
  }
  return reach;
}

function daysBetween(from: string, to: string): number {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  return Math.round((end - start) / 86_400_000);
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
