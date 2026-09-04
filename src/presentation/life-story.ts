import {
  EPISODE_FAMILIES,
  LIFE_TRANSITION_HANDLERS,
  adaptiveSelectionSeed,
  addDays,
  advanceWorld,
  ageOnDate,
  eligibleEpisodeBeats,
  formativeIntervalAt,
  lifePlaceByJurisdictionId,
  narrativeThreads,
  personName,
  playEpisodeOption,
  playerModelFor,
  selectSituation,
  situationProfile,
  threadForEpisodeBeat,
  type EntityId,
  type EpisodeBeat,
  type EpisodeExclusion,
  type IsoDate,
  type LifeSituationKey,
  type NarrativeThread,
  type RankedSituation,
  type SelectableSituationKey,
  type SituationCandidate,
  type SituationSelectionReason,
  type World,
} from "../simulation";
import {
  chooseAdultOption,
  letAdultTimePass,
  projectAdultLife,
  selectAdultSituation,
  type AdultScene,
} from "./adult-life";
import {
  chooseFormativeOption,
  letTimePass,
  projectFormativeYears,
  type FormativeScene,
} from "./formative-play";
import {
  composeConnectiveNarration,
  openThreadRecaps,
  recurringPeople,
  type ConnectiveNarration,
  type RecurringPerson,
  type ThreadRecap,
} from "./life-narration";

/**
 * One life, told continuously.
 *
 * The three sources a moment can come from — the formative bank, the adult
 * bank and the composed episode families — used to be three surfaces, each
 * choosing independently and each rendering its own card. That is the shape
 * the playtest recognised as "a browser-like sequence of disconnected cards",
 * and no amount of better copy inside a card fixes it.
 *
 * What this module does is put them in ONE ranking and wrap the result in the
 * time that passed. Three consequences matter:
 *
 * *A continuation can beat a stranger.* An episode beat that continues
 * something already in this life is ranked against the bank's situations by
 * the same selector, carrying the continuity credit the selector already
 * knows how to award. It does not always win, and should not: a beat that
 * continues something irrelevant should lose to a situation that matters now.
 *
 * *Time is narrated, not skipped.* Every moment carries the connective
 * narration for the stretch since the last one, composed from the record by
 * `life-narration.ts`. There is no branch that emits nothing.
 *
 * *Nothing here decides consequence.* The selector picks what to offer; the
 * domain engines decide what comes of it. This module never sees an outcome.
 */

/* -------------------------------------------------------------------------- */
/* Shapes                                                                      */
/* -------------------------------------------------------------------------- */

export interface StoryOption {
  readonly key: string;
  readonly label: string;
  readonly description: string;
}

export type StoryScene =
  | {
      readonly kind: "episode";
      readonly prose: string;
      readonly options: readonly StoryOption[];
      readonly withPeople: readonly string[];
      readonly beat: EpisodeBeat;
    }
  | {
      readonly kind: "formative";
      readonly prose: string;
      readonly options: readonly StoryOption[];
      readonly withPeople: readonly string[];
      readonly situationKey: LifeSituationKey;
      readonly withPersonId: EntityId | null;
      readonly bandLabel: string;
    }
  | {
      readonly kind: "adult";
      readonly prose: string;
      readonly options: readonly StoryOption[];
      readonly withPeople: readonly string[];
      readonly situationKey: LifeSituationKey;
    }
  | {
      /** Nothing needs deciding. The narration still says what the time was. */
      readonly kind: "ordinary-stretch";
      readonly prose: string;
      readonly options: readonly StoryOption[];
      readonly withPeople: readonly string[];
    };

export interface StoryMoment {
  readonly personName: string;
  readonly age: number;
  readonly dateLabel: string;
  readonly placeName: string | null;
  /** How the life got from the last moment to this one. Never empty. */
  readonly connective: ConnectiveNarration;
  readonly scene: StoryScene;
  /** What is open, in the player's words. Never machinery. */
  readonly openThreads: readonly ThreadRecap[];
  /** People this life keeps returning to, most present first. */
  readonly people: readonly RecurringPerson[];
  /** True while the growing-up years are still being played. */
  readonly formativeYears: boolean;
}

/* -------------------------------------------------------------------------- */
/* The moment                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * The last date this life recorded something, which is where narration starts.
 *
 * Falls back to the character's own start rather than to "today", so the first
 * moment of a summarized life still gets an opening rather than a blank.
 */
export function lastRecordedMoment(
  world: World,
  personId: EntityId,
): { readonly at: IsoDate; readonly opening: boolean } {
  // Only moments the player actually lived through count. A summarized
  // earlier life leaves real events on the record — that is what makes it a
  // life rather than a blank — but the player did not watch them happen, and
  // measuring the gap from the last of them opens a thirty-four-year-old's
  // first screen with "eighteen years later", which is arithmetic rather than
  // a story. A played moment is one that recorded a choice, which is the same
  // test for a situation card and a composed beat.
  const events = world.history.events
    .filter(
      (event) =>
        event.involvedEntityIds.includes(personId) &&
        event.occurredAt <= world.currentDate &&
        event.tags.some((tag) => tag.startsWith("choice.")),
    )
    .sort((left, right) => left.sequence - right.sequence);
  const last = events.at(-1);
  if (last) return { at: last.occurredAt, opening: false };
  return { at: world.currentDate, opening: true };
}

export function projectStoryMoment(
  world: World,
  personId: EntityId,
): StoryMoment {
  const person = world.people[personId];
  if (!person) throw new Error("This character is not in the world.");
  const name = personName(person);
  const age = ageOnDate(person.birthDate, world.currentDate);
  const place = lifePlaceByJurisdictionId(person.homeJurisdictionId);
  const formativeYears = formativeIntervalAt(world, personId) !== null;

  const previous = lastRecordedMoment(world, personId);
  const connective = composeConnectiveNarration({
    world,
    personId,
    since: previous.at,
    opening: previous.opening,
  });

  const chosen = chooseStoryScene(world, personId, formativeYears);

  return {
    personName: name,
    age,
    dateLabel: longDate(world.currentDate),
    placeName: place?.displayName ?? null,
    connective,
    scene: chosen,
    openThreads: openThreadRecaps(world, personId),
    people: recurringPeople(world, personId).slice(0, 5),
    formativeYears,
  };
}

/* -------------------------------------------------------------------------- */
/* Choosing what comes next                                                    */
/* -------------------------------------------------------------------------- */

/**
 * The selector's own account, for tests, audits and the development report.
 *
 * Exported separately from the moment, and passed to nothing that renders and
 * nothing that schedules. A surface that never receives the reason cannot leak
 * it, which is the same mechanism the adult surface already uses.
 */
export interface StorySelectionTrace {
  readonly chosenKey: SelectableSituationKey | null;
  readonly reason: SituationSelectionReason | null;
  readonly candidateCount: number;
  readonly episodeCandidates: number;
  readonly bankCandidates: number;
  readonly ranked: readonly RankedSituation[];
  readonly continuedThreadKey: string | null;
  readonly episodeExclusions: readonly EpisodeExclusion[];
}

interface Candidate {
  readonly candidate: SituationCandidate;
  readonly beat: EpisodeBeat | null;
  readonly thread: NarrativeThread | null;
}

/**
 * How much an episode beat matters to this life right now.
 *
 * Read from state and from nothing the player answered: a beat that continues
 * an open thread with somebody the record already keeps returning to matters
 * more than the opening beat of a family this life has never touched. The
 * number is bounded and its parts are named, so a reader can see what it is
 * made of rather than trusting a constant.
 */
function episodeRelevance(
  beat: EpisodeBeat,
  thread: NarrativeThread | null,
): number {
  let relevance = 0.4;
  if (beat.continues) relevance += 0.25;
  if (thread) {
    relevance += 0.15;
    if (thread.standing === "pressing") relevance += 0.2;
    else if (thread.standing === "running") relevance += 0.1;
  }
  // Requirements answered by real records are the closest thing to "this is
  // actually about something", so a beat resting on several of them outranks
  // one resting on an age check.
  const grounded = beat.causalInputs.filter(
    (entry) => entry.satisfiedBy.length > 0,
  ).length;
  relevance += Math.min(0.2, grounded * 0.05);
  return Math.max(0, Math.min(1, relevance));
}

function gatherCandidates(
  world: World,
  personId: EntityId,
  formativeYears: boolean,
): {
  readonly candidates: readonly Candidate[];
  readonly exclusions: readonly EpisodeExclusion[];
} {
  const threads = narrativeThreads(world, personId);
  const eligibility = eligibleEpisodeBeats({
    world,
    personId,
    families: EPISODE_FAMILIES,
  });
  const episodes: Candidate[] = eligibility.beats.map((beat) => {
    const thread = threadForEpisodeBeat(threads, beat);
    return {
      beat,
      thread,
      candidate: {
        key: `episode:${beat.instanceKey}/${beat.stageKey}` as const,
        band: formativeYears
          ? ("adolescence" as const)
          : ("adulthood" as const),
        stakes: beat.stakes,
        tensions: beat.tensions,
        relevance: episodeRelevance(beat, thread),
        // A later stage exists only because an earlier one was played, which
        // is exactly the claim the selector's continuity credit is for.
        followsFromHistory: beat.continues,
      },
    };
  });

  // The banks stay in the ranking rather than being replaced. A composed
  // episode is a better answer when there is one; when there is not, the
  // authored situation is still the right thing to show, and dropping it would
  // trade one kind of emptiness for another.
  const bank: Candidate[] = [];
  if (!formativeYears) {
    const adult = selectAdultSituation(world, personId);
    if (adult) {
      const profile = situationProfile(adult.key);
      bank.push({
        beat: null,
        thread: null,
        candidate: {
          key: adult.key,
          band: "adulthood",
          stakes: adult.stakes,
          tensions: profile.tensions,
          relevance: 0.5,
          followsFromHistory: false,
        },
      });
    }
  }

  return {
    candidates: [...episodes, ...bank],
    exclusions: eligibility.exclusions,
  };
}

export function traceStorySelection(
  world: World,
  personId: EntityId,
): StorySelectionTrace {
  const formativeYears = formativeIntervalAt(world, personId) !== null;
  const { candidates, exclusions } = gatherCandidates(
    world,
    personId,
    formativeYears,
  );
  if (candidates.length === 0) {
    return {
      chosenKey: null,
      reason: null,
      candidateCount: 0,
      episodeCandidates: 0,
      bankCandidates: 0,
      ranked: [],
      continuedThreadKey: null,
      episodeExclusions: exclusions,
    };
  }
  const history = playedStoryKeys(world, personId);
  const selection = selectSituation({
    selectionSeed: adaptiveSelectionSeed(world),
    personKey: personId,
    ordinal: history.length,
    model: playerModelFor(world, personId),
    candidates: candidates.map((entry) => entry.candidate),
    recentKeys: history.slice(-6),
    recentStakes: history.slice(-6).map(stakesOfKey),
  });
  if (!selection) {
    return {
      chosenKey: null,
      reason: null,
      candidateCount: candidates.length,
      episodeCandidates: candidates.filter((entry) => entry.beat !== null)
        .length,
      bankCandidates: candidates.filter((entry) => entry.beat === null).length,
      ranked: [],
      continuedThreadKey: null,
      episodeExclusions: exclusions,
    };
  }
  const winner = candidates.find(
    (entry) => entry.candidate.key === selection.chosen.candidate.key,
  );
  return {
    chosenKey: selection.chosen.candidate.key,
    reason: selection.reason,
    candidateCount: candidates.length,
    episodeCandidates: candidates.filter((entry) => entry.beat !== null).length,
    bankCandidates: candidates.filter((entry) => entry.beat === null).length,
    ranked: selection.ranked,
    continuedThreadKey: winner?.thread?.key ?? null,
    episodeExclusions: exclusions,
  };
}

function chooseStoryScene(
  world: World,
  personId: EntityId,
  formativeYears: boolean,
): StoryScene {
  const { candidates } = gatherCandidates(world, personId, formativeYears);
  const history = playedStoryKeys(world, personId);

  if (candidates.length > 0) {
    const selection = selectSituation({
      selectionSeed: adaptiveSelectionSeed(world),
      personKey: personId,
      ordinal: history.length,
      model: playerModelFor(world, personId),
      candidates: candidates.map((entry) => entry.candidate),
      recentKeys: history.slice(-6),
      recentStakes: history.slice(-6).map(stakesOfKey),
    });
    const winner = selection
      ? candidates.find(
          (entry) => entry.candidate.key === selection.chosen.candidate.key,
        )
      : undefined;
    if (winner?.beat) {
      return {
        kind: "episode",
        prose: winner.beat.prose,
        options: winner.beat.options,
        withPeople: winner.beat.bindings.map((binding) => binding.personName),
        beat: winner.beat,
      };
    }
    if (winner && !formativeYears) {
      const adult = projectAdultLife(world, personId);
      const scene = adult.scene;
      if (scene) return adultScene(scene);
    }
  }

  // The formative bank is asked directly rather than through the ranking,
  // because its own surface already ranks within the band and re-ranking a
  // single winner against itself would change nothing but the code path.
  if (formativeYears) {
    const years = projectFormativeYears(world, personId);
    if (years.scene) return formativeScene(years.scene);
  } else {
    const adult = projectAdultLife(world, personId);
    if (adult.scene) return adultScene(adult.scene);
  }

  return {
    kind: "ordinary-stretch",
    prose: "",
    options: [
      {
        key: "let-it-run",
        label: formativeYears ? "Let the year run on" : "Let the weeks run on",
        description: "Pick it up again when something needs you.",
      },
    ],
    withPeople: [],
  };
}

function formativeScene(scene: FormativeScene): StoryScene {
  return {
    kind: "formative",
    prose: scene.prose,
    options: scene.options.map((option) => ({
      key: option.key,
      label: option.label,
      description: option.description,
    })),
    withPeople: scene.withPersonName ? [scene.withPersonName] : [],
    situationKey: scene.situationKey,
    withPersonId: scene.withPersonId,
    bandLabel: scene.bandLabel,
  };
}

function adultScene(scene: AdultScene): StoryScene {
  return {
    kind: "adult",
    prose: scene.prose,
    options: scene.options.map((option) => ({
      key: option.key,
      label: option.label,
      description: option.description,
    })),
    withPeople: scene.withPersonName ? [scene.withPersonName] : [],
    situationKey: scene.situationKey,
  };
}

/**
 * Everything this life has played, in one sequence.
 *
 * The novelty and pacing guards only work over one history, so situations and
 * episode beats share it. Reading it from events rather than keeping a counter
 * is what makes it survive a save.
 */
export function playedStoryKeys(
  world: World,
  personId: EntityId,
): readonly SelectableSituationKey[] {
  return world.history.events
    .filter((event) => event.involvedEntityIds.includes(personId))
    .sort((left, right) => left.sequence - right.sequence)
    .flatMap((event) => {
      const situation = event.tags.find(
        (tag) => tag.startsWith("formative.") || tag.startsWith("adult."),
      );
      if (situation) return [situation as SelectableSituationKey];
      const instance = event.tags.find((tag) =>
        tag.startsWith("episode-instance:"),
      );
      const stage = event.tags.find((tag) => tag.startsWith("episode-stage:"));
      if (!instance || !stage) return [];
      return [
        `episode:${instance.slice("episode-instance:".length)}/${stage.slice(
          "episode-stage:".length,
        )}` as SelectableSituationKey,
      ];
    });
}

/**
 * The pacing tier of a key from either source.
 *
 * Episode keys carry no profile in the situation catalog, and inventing one
 * would be a number with nothing behind it, so they contribute the neutral
 * tier to the pacing window. The tier a beat is actually offered at comes from
 * its own stage, which is what the guard sees when it matters.
 */
function stakesOfKey(key: SelectableSituationKey) {
  if (key.startsWith("episode:")) return "notable" as const;
  return situationProfile(key as LifeSituationKey).stakes;
}

/* -------------------------------------------------------------------------- */
/* Acting                                                                      */
/* -------------------------------------------------------------------------- */

export interface ChooseStoryOptionInput {
  readonly personId: EntityId;
  readonly scene: StoryScene;
  readonly optionKey: string;
}

/** How far the clock moves after a composed beat, by how much it asked. */
const EPISODE_STEP_DAYS = {
  ordinary: 34,
  notable: 71,
  pressing: 128,
} as const;

/**
 * Records the choice through whichever writer owns that kind of moment.
 *
 * Each branch delegates rather than reimplementing: the formative and adult
 * surfaces already know how to write their own situations, including the
 * eligibility re-check and the aftermath question, and duplicating either here
 * would be a second answer to a settled question.
 */
export function chooseStoryOption(
  world: World,
  input: ChooseStoryOptionInput,
): World {
  const scene = input.scene;
  switch (scene.kind) {
    case "episode": {
      const played = playEpisodeOption(world, {
        personId: input.personId,
        beat: scene.beat,
        optionKey: input.optionKey,
        families: EPISODE_FAMILIES,
      });
      return advanceWorld(
        played.world,
        EPISODE_STEP_DAYS[scene.beat.stakes],
        LIFE_TRANSITION_HANDLERS,
      );
    }
    case "formative":
      return chooseFormativeOption(world, {
        personId: input.personId,
        situationKey: scene.situationKey,
        optionKey: input.optionKey,
        withPersonId: scene.withPersonId,
      });
    case "adult":
      return chooseAdultOption(world, {
        personId: input.personId,
        situationKey: scene.situationKey,
        optionKey: input.optionKey,
      });
    case "ordinary-stretch":
      return letStoryTimePass(world, input.personId);
  }
}

/**
 * How long a quiet stretch runs before the game looks again.
 *
 * Four lengths rather than one, because time is allowed to pass unevenly and
 * because a fixed step made every quiet gap read identically: forty-five days
 * always produces "a month later", so four quiet steps in a row produced the
 * same paragraph four times. Which length a gap gets is derived from the date
 * it starts on, so it is stable under replay and different between gaps.
 *
 * These are presentation pacing and are labelled as such. Nothing here is a
 * claim about how often anything happens to anybody.
 */
export const QUIET_ADULT_STEPS: readonly number[] = [31, 47, 78, 124];

export function quietStepDays(from: IsoDate): number {
  let total = 0;
  for (const character of from) {
    total = (total * 31 + character.charCodeAt(0)) % 100_000;
  }
  return QUIET_ADULT_STEPS[total % QUIET_ADULT_STEPS.length]!;
}

/**
 * Lets a stretch of ordinary time go by.
 *
 * During the growing-up years this goes through the formative surface, which
 * knows to stop on band boundaries and on the eighteenth birthday rather than
 * stepping over either. Afterwards it is a plain advance.
 */
export function letStoryTimePass(world: World, personId: EntityId): World {
  if (formativeIntervalAt(world, personId) !== null) {
    return letTimePass(world, personId);
  }
  return letAdultTimePass(world, quietStepDays(world.currentDate));
}

/** The date a quiet adult stretch would reach, for tests that need it. */
export function nextQuietMoment(world: World): IsoDate {
  return addDays(world.currentDate, quietStepDays(world.currentDate));
}

function longDate(date: IsoDate): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}
