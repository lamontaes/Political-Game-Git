import { adultSituation, isAdultSituationKey } from "./adult-situations";
import {
  applyPlayerEvidence,
  createPlayerModel,
  type DimensionNudge,
  type PlayerEvidence,
  type PlayerModel,
  type PlayerModelDimension,
} from "./player-model";
import { modelFromSetupPriors } from "./setup-questionnaire";
import { setupPriorsOf } from "./setup-priors";
import type {
  EntityId,
  HistoricalEvent,
  LifeSituationKey,
  World,
} from "./types";

/**
 * Turning what was actually played into evidence.
 *
 * A setup answer is somebody saying what they would do. This is somebody
 * having done it, in a world that recorded it and could answer back, and it is
 * weighted accordingly — around five times a setup answer, so two or three
 * consequential choices in the opposite direction carry an estimate past
 * neutral and out the other side.
 *
 * Nothing is deleted when that happens. The questionnaire answer stays exactly
 * where it was in the trail, with its ordinal and its item; what changes is
 * which voice is loudest. "Gameplay can override a setup prior" and "the setup
 * answer is erased" are different requirements, and only the first was asked
 * for.
 *
 * The reading is done from canonical history rather than remembered anywhere,
 * which is what makes it survive a save: a world that is loaded from disk
 * yields the same model as the one that was never put down, because the model
 * is derived rather than stored.
 */

function nudge(
  dimension: PlayerModelDimension,
  magnitude: number,
): DimensionNudge {
  return { dimension, magnitude };
}

/**
 * What the formative choices say.
 *
 * Authored beside the situations they belong to rather than inferred. A child
 * who keeps saying what they think out loud, takes the help that is offered
 * and gives away the money they were given has told the game something, and it
 * should be the same something whether they did it at seven or at fifteen.
 *
 * These are readings of choices already in the bank, not new content: no
 * option was added or reworded to make a dimension come out.
 */
const FORMATIVE_EVIDENCE: Readonly<Record<string, readonly DimensionNudge[]>> =
  {
    "formative.household-transition:settle-in": [
      nudge("personal-ties", 0.4),
      nudge("security-stability", 0.25),
    ],
    "formative.household-transition:keep-your-corner": [
      nudge("privacy-preference", 0.45),
      nudge("personal-ties", -0.2),
    ],
    "formative.household-transition:make-yourself-useful": [
      nudge("care-obligation", 0.45),
      nudge("personal-ties", 0.2),
    ],
    "formative.school-entry:join-in": [
      nudge("privacy-preference", -0.3),
      nudge("risk-appetite", 0.25),
    ],
    "formative.school-entry:hang-back": [
      nudge("privacy-preference", 0.35),
      nudge("risk-appetite", -0.3),
    ],
    "formative.broken-object:say-what-happened": [
      nudge("privacy-preference", -0.5),
      nudge("institutional-trust", 0.2),
    ],
    "formative.broken-object:stay-quiet": [
      nudge("privacy-preference", 0.5),
      nudge("risk-appetite", 0.2),
    ],
    "formative.small-money:spend": [
      nudge("risk-appetite", 0.3),
      nudge("security-stability", -0.25),
    ],
    "formative.small-money:put-it-away": [
      nudge("security-stability", 0.45),
      nudge("risk-appetite", -0.3),
    ],
    "formative.small-money:share": [
      nudge("care-obligation", 0.45),
      nudge("econ-distribution", 0.2),
    ],
    "formative.lunch-table:make-room": [
      nudge("care-obligation", 0.4),
      nudge("personal-ties", 0.3),
    ],
    "formative.lunch-table:look-away": [
      nudge("privacy-preference", 0.4),
      nudge("care-obligation", -0.35),
    ],
    "formative.lunch-table:go-with-them": [
      nudge("care-obligation", 0.45),
      nudge("risk-appetite", 0.3),
      nudge("personal-ties", 0.2),
    ],
    "formative.friend-conflict:repair": [
      nudge("personal-ties", 0.45),
      nudge("privacy-preference", -0.3),
    ],
    "formative.friend-conflict:withdraw": [
      nudge("privacy-preference", 0.45),
      nudge("personal-ties", -0.3),
    ],
    "formative.friend-conflict:ask-someone": [
      nudge("decision-style", 0.4),
      nudge("privacy-preference", -0.2),
    ],
    "formative.teacher-mentor:accept-guidance": [
      nudge("institutional-trust", 0.4),
      nudge("achievement-ambition", 0.25),
    ],
    "formative.teacher-mentor:decline-guidance": [
      nudge("institutional-trust", -0.35),
      nudge("privacy-preference", 0.3),
    ],
    "formative.school-rule-input:speak-up": [
      nudge("privacy-preference", -0.5),
      nudge("institutional-trust", 0.2),
    ],
    "formative.school-rule-input:leave-it-to-others": [
      nudge("privacy-preference", 0.4),
    ],
    "formative.school-rule-input:write-it-down": [
      nudge("decision-style", 0.35),
      nudge("institutional-trust", 0.25),
    ],
    "formative.care-conflict:cover-at-home": [
      nudge("care-obligation", 0.5),
      nudge("personal-ties", 0.3),
    ],
    "formative.care-conflict:keep-the-commitment": [
      nudge("achievement-ambition", 0.4),
      nudge("care-obligation", -0.3),
    ],
    "formative.care-conflict:do-both-badly": [nudge("decision-style", 0.45)],
    "formative.activity-choice:join": [
      nudge("achievement-ambition", 0.35),
      nudge("personal-ties", 0.2),
    ],
    "formative.activity-choice:leave": [
      nudge("privacy-preference", 0.3),
      nudge("achievement-ambition", -0.25),
    ],
    "formative.activity-choice:stay-smaller": [nudge("decision-style", 0.35)],
    "formative.civic-volunteering:volunteer": [
      nudge("care-obligation", 0.4),
      nudge("institutional-trust", 0.2),
    ],
    "formative.civic-volunteering:observe": [
      nudge("risk-appetite", -0.3),
      nudge("privacy-preference", 0.25),
    ],
    "formative.civic-volunteering:send-others": [
      nudge("decision-style", 0.4),
      nudge("privacy-preference", 0.25),
    ],
    "formative.teen-work-opportunity:accept": [
      nudge("achievement-ambition", 0.45),
      nudge("security-stability", 0.25),
    ],
    "formative.teen-work-opportunity:decline": [
      nudge("achievement-ambition", -0.35),
      nudge("privacy-preference", 0.25),
    ],
    "formative.student-organizing:help-organize": [
      nudge("institutional-trust", -0.4),
      nudge("privacy-preference", -0.4),
      nudge("risk-appetite", 0.3),
    ],
    "formative.student-organizing:stay-out": [
      nudge("privacy-preference", 0.45),
      nudge("civic-order", 0.2),
    ],
    "formative.belief-challenge:say-you-disagree": [
      nudge("privacy-preference", -0.5),
      nudge("decision-style", -0.35),
    ],
    "formative.belief-challenge:let-it-pass": [
      nudge("privacy-preference", 0.45),
      nudge("decision-style", 0.25),
    ],
    "formative.future-preparation:prepare": [
      nudge("achievement-ambition", 0.4),
      nudge("security-stability", 0.3),
    ],
    "formative.future-preparation:keep-options-open": [
      nudge("risk-appetite", 0.3),
      nudge("achievement-ambition", -0.2),
    ],
    "formative.future-preparation:ask-someone-who-knows": [
      nudge("decision-style", 0.35),
      nudge("institutional-trust", 0.2),
    ],
    "formative.illness-in-the-house:keep-close": [
      nudge("care-obligation", 0.45),
      nudge("personal-ties", 0.35),
    ],
    "formative.illness-in-the-house:keep-the-routine": [
      nudge("security-stability", 0.4),
      nudge("privacy-preference", 0.25),
    ],
    "formative.money-shortfall:ask-what-happened": [
      nudge("privacy-preference", -0.4),
      nudge("institutional-trust", 0.15),
    ],
    "formative.money-shortfall:let-it-go": [
      nudge("care-obligation", 0.35),
      nudge("privacy-preference", 0.3),
    ],
    "formative.caring-for-someone:take-it-on": [
      nudge("care-obligation", 0.55),
      nudge("achievement-ambition", -0.25),
    ],
    "formative.caring-for-someone:hold-the-line": [
      nudge("care-obligation", -0.3),
      nudge("privacy-preference", -0.25),
    ],
    "formative.caring-for-someone:look-outside": [
      nudge("decision-style", 0.4),
      nudge("institutional-trust", 0.25),
    ],
    "formative.workplace-rule:follow-it": [
      nudge("institutional-trust", 0.4),
      nudge("civic-order", 0.25),
    ],
    "formative.workplace-rule:say-nobody-does": [
      nudge("institutional-trust", -0.4),
      nudge("privacy-preference", -0.35),
    ],
    "formative.workplace-rule:say-it-after": [
      nudge("decision-style", 0.4),
      nudge("privacy-preference", 0.2),
    ],
  };

export interface LifeChoice {
  readonly situationKey: LifeSituationKey;
  readonly optionKey: string;
  readonly eventStableKey: string;
  readonly occurredAt: string;
}

/** The choice an event records, when it records one. */
export function lifeChoiceFromEvent(event: HistoricalEvent): LifeChoice | null {
  const situationKey = event.tags.find(
    (tag) => tag.startsWith("formative.") || tag.startsWith("adult."),
  );
  const choiceTag = event.tags.find((tag) => tag.startsWith("choice."));
  if (!situationKey || !choiceTag) return null;
  return {
    situationKey: situationKey as LifeSituationKey,
    optionKey: choiceTag.slice("choice.".length),
    eventStableKey: event.stableKey,
    occurredAt: event.occurredAt,
  };
}

/** What this played choice tells the adaptive layer, at gameplay strength. */
export function lifeChoiceEvidence(choice: LifeChoice): PlayerEvidence | null {
  if (isAdultSituationKey(choice.situationKey)) {
    const situation = adultSituation(choice.situationKey);
    const option = situation?.options.find(
      (candidate) => candidate.key === choice.optionKey,
    );
    if (!situation || !option) return null;
    return {
      key: `life-choice:${choice.eventStableKey}`,
      strength: "enacted",
      observationWeight: 1,
      nudges: option.nudges,
      hypotheses: option.hypotheses ?? [],
      ambiguity: null,
      recordedAt: choice.occurredAt as PlayerEvidence["recordedAt"],
      source: `Played: ${choice.situationKey} → ${choice.optionKey}`,
    };
  }
  const nudges =
    FORMATIVE_EVIDENCE[`${choice.situationKey}:${choice.optionKey}`];
  if (!nudges) return null;
  return {
    key: `life-choice:${choice.eventStableKey}`,
    strength: "enacted",
    observationWeight: 1,
    nudges,
    hypotheses: [],
    ambiguity: null,
    recordedAt: choice.occurredAt as PlayerEvidence["recordedAt"],
    source: `Played: ${choice.situationKey} → ${choice.optionKey}`,
  };
}

/**
 * The model this life currently supports.
 *
 * Setup priors first, in the order they were answered, then everything the
 * player actually did, in the order the world recorded it. Derived every time
 * rather than cached, because a cache would be a second answer to a question
 * the world can already answer, and the two would eventually disagree.
 */
export function playerModelFor(world: World, personId: EntityId): PlayerModel {
  let model = modelFromSetupPriors(setupPriorsOf(world));
  const events = [...world.history.events].sort(
    (left, right) => left.sequence - right.sequence,
  );
  for (const event of events) {
    if (!event.involvedEntityIds.includes(personId)) continue;
    const choice = lifeChoiceFromEvent(event);
    if (!choice) continue;
    const evidence = lifeChoiceEvidence(choice);
    if (evidence) model = applyPlayerEvidence(model, evidence);
  }
  return model;
}

/** The model with the setup half only, for tests that need the comparison. */
export function setupOnlyPlayerModel(world: World): PlayerModel {
  return modelFromSetupPriors(setupPriorsOf(world));
}

/** An empty model, for a life that answered nothing and has played nothing. */
export function emptyPlayerModel(): PlayerModel {
  return createPlayerModel();
}
