/**
 * A campaign speech the player builds as they give it, one part a click, with
 * the one planner (speech-outline.ts `planSpeech`) doing what it does for
 * every other speaker: the player's picked questions are its points, and it
 * gives them their shape, belief and ask, as it does for a candidate or a
 * mayor. A part on offer is the planner's own sentences for it, so the words
 * shown are exactly the words said when the speech is given.
 *
 * The form of a speech (which kinds of parts, in what order, how many clicks)
 * is data: `stagesOf` reads it from the speech's row in
 * `speech-outlines.json`, and nothing here fixes it. Today a stump speech's row
 * gives a greeting, one click per point the row plans, and a close.
 *
 * - The greeting is the planner's greeting block said several ways.
 * - The first point carries the planner's occasion paragraph (the one matter
 *   the speech is about), since that names the theme the first pick chose.
 *   The first pick chooses the one theme; later points are the questions the
 *   speaker argues from the same side of it.
 * - The close is the planner's close block, said several ways, written for the
 *   points picked.
 *
 * Nothing is typed here, and no bank is read here: the English engine words
 * every sentence from the speaker's records.
 */
import { decisionLean } from "../core2/trait-decisions";
import { viewOf, viewOn } from "../core2/modules/views";
import { coreAPI } from "../core2/state";
import {
  allQuestions,
  questionName,
  questionTopic,
} from "../english/policy-names";
import { P } from "../core2/parameters";
import type { CoreState, PersonId } from "../core2/types";
import { speechPartsByReach, speechWords } from "../english/speech-stage-words";
import { DEFAULT_DIRECTOR_DATA } from "./ledger";
import { campaignSpeaker as speakerFor } from "./local-speeches";
import { dayParts } from "./day-part";
import { markWordsStopgap } from "./stopgaps";
import { composeBlocks, type OpeningSentence } from "./opening-story";
import {
  outlineOf,
  planSpeech,
  pointCandidates,
  type OutlineSpeaker,
} from "./speech-outline";

export type SpeechStage = "opener" | "core" | "closer";

/** The speech kind a player's own speech is planned as. */
const KIND = "campaign";

/**
 * The form of a speech, read from its row: the greeting, a click for each
 * point its row plans, the close.
 */
export function stagesOf(kindKey: string = KIND): readonly SpeechStage[] {
  return [
    "opener",
    // A stump speech makes the one ask its row names (`asks`): a second point
    // would have to say its own ask or end without one, which waits for the
    // form to come from data (pool item words-player-speech-form-from-data).
    ...Array.from({ length: outlineOf(kindKey).asks }, () => "core" as const),
    "closer",
  ];
}

export interface SpeechChoice {
  key: string;
  stage: SpeechStage;
  /** What the part is about: the point's question id; empty for a greeting or a close. */
  subject: string;
  /** The planner's sentences for the part, as they are said. */
  text: string;
  /** The bank pieces the sentences were joined from. */
  partKey: string;
  sourceRecordIds: readonly string[];
  /** The stand the speaker takes in this part, for the speech engine. */
  stand?: { question: string; desiredChange: "enact" | "repeal" };
  /** Which wording of its block a greeting or a close is. */
  draw?: number;
}

export interface SpeechBuild {
  speakerId: PersonId;
  placeId: string;
  /** The office the speech is for, and the party the speaker runs under. */
  officeId: string;
  party: string | null;
  /** The minute of the day on the player's clock when the speech began; the hour it is said at. */
  minute: number | undefined;
  /** The date it began. */
  startedOn: string;
  /** The form of the speech, from the data. */
  stages: readonly SpeechStage[];
  picked: SpeechChoice[];
  /** The choices for the next stage; empty once the speech is whole. */
  choices: SpeechChoice[];
  done: boolean;
}

type Seed = Pick<
  SpeechBuild,
  "speakerId" | "officeId" | "party" | "minute" | "picked" | "stages"
>;

/**
 * The speaker as the planner has them: for the race, at the player's own
 * hour, so a line that says "tonight" plays only when their clock says it is
 * evening.
 */
function campaignSpeaker(
  core: CoreState,
  speakerId: PersonId,
  officeId: string,
  party: string | null,
  minute: number | undefined,
): OutlineSpeaker | null {
  const speaker = speakerFor(core, speakerId, officeId, party);
  return speaker
    ? { ...speaker, evening: dayParts(minute).includes("evening") }
    : null;
}

/** What the picked parts say of the plan: the questions, in order, and the wording chosen for each block. */
function pickedOf(picked: readonly SpeechChoice[]) {
  const draws: Record<string, number> = {};
  for (const part of picked) {
    if (part.stage === "opener") draws.salutation = part.draw ?? P.zero;
    if (part.stage === "closer") draws.close = part.draw ?? P.zero;
  }
  return {
    questions: picked
      .filter((part) => part.subject)
      .map((part) => part.subject),
    draws,
  };
}

/** The sentences the planner says for the points picked so far, said as the picks chose, grouped by the block they were said for. */
function said(
  core: Readonly<CoreState>,
  seed: Seed,
  questions: readonly string[],
  draws: Readonly<Record<string, number>>,
): {
  sentences: readonly OpeningSentence[];
  speaker: OutlineSpeaker;
  sides: ReadonlyMap<string, "for" | "against">;
} | null {
  const speaker = campaignSpeaker(
    core as CoreState,
    seed.speakerId,
    seed.officeId,
    seed.party,
    seed.minute,
  );
  if (!speaker) return null;
  const plan = planSpeech(core as CoreState, KIND, {
    ...speaker,
    chosen: questions,
  });
  const sentences = composeBlocks(
    core as CoreState,
    speaker.person,
    plan.blocks,
    {
      draws,
    },
  );
  return sentences
    ? {
        sentences,
        speaker,
        sides: new Map(plan.points.map((row) => [row.question, row.side])),
      }
    : null;
}

/** One choice out of the sentences said for some of the plan's blocks. */
function choiceOf(
  stage: SpeechStage,
  key: string,
  subject: string,
  rows: readonly OpeningSentence[],
  extra: Partial<SpeechChoice> = {},
): SpeechChoice | null {
  if (!rows.length) return null;
  return {
    key,
    stage,
    subject,
    text: rows.map((row) => row.text).join(" "),
    partKey: rows.flatMap((row) => row.pieces).join("+"),
    sourceRecordIds: [...new Set(rows.flatMap((row) => row.sourceRecordIds))],
    ...extra,
  };
}

/** A greeting or a close said several ways, the ways that read differently and differ in the pieces that say them. */
function wordings(
  core: Readonly<CoreState>,
  seed: Seed,
  stage: "opener" | "closer",
  questions: readonly string[],
  base: Readonly<Record<string, number>>,
): SpeechChoice[] {
  const block = stage === "opener" ? "salutation" : "close";
  const count = DEFAULT_DIRECTOR_DATA.parameters.directorChoicesPerTurn!.value;
  const tries = DEFAULT_DIRECTOR_DATA.parameters.speechWordingTries!.value;
  const found: SpeechChoice[] = [];
  const texts = new Set<string>();
  const pieces = new Set<string>();
  for (let draw = P.zero; draw < tries && found.length < count; draw += P.one) {
    const done = said(core, seed, questions, { ...base, [block]: draw });
    const row = choiceOf(
      stage,
      `${stage}:${draw}`,
      "",
      done?.sentences.filter((sentence) => sentence.block === block) ?? [],
      { draw },
    );
    if (!row || texts.has(row.text) || pieces.has(row.partKey)) continue;
    texts.add(row.text);
    pieces.add(row.partKey);
    found.push(row);
  }
  return found;
}

/**
 * The stage the speech is at and its choices. The form says how many points a
 * speech may make; a speaker with no further question to make a point of goes
 * on to the close, so a speech is never stuck for want of a part.
 */
function offer(
  core: Readonly<CoreState>,
  build: Seed,
): { stage: SpeechStage | null; choices: SpeechChoice[] } {
  const { questions, draws } = pickedOf(build.picked);
  const speaker = campaignSpeaker(
    core as CoreState,
    build.speakerId,
    build.officeId,
    build.party,
    build.minute,
  );
  if (!speaker) return { stage: null, choices: [] };
  const has = (stage: SpeechStage) =>
    build.picked.some((part) => part.stage === stage);
  const points = build.stages.filter((stage) => stage === "core").length;
  const stage: SpeechStage | null = !has("opener")
    ? "opener"
    : questions.length < points &&
        pointCandidates(core as CoreState, KIND, speaker, questions).length
      ? "core"
      : !has("closer")
        ? "closer"
        : null;
  if (!stage) return { stage, choices: [] };
  return {
    stage,
    choices: offerAt(core, build, stage, speaker, questions, draws),
  };
}

function offerAt(
  core: Readonly<CoreState>,
  build: Seed,
  stage: SpeechStage,
  speaker: OutlineSpeaker,
  questions: readonly string[],
  draws: Readonly<Record<string, number>>,
): SpeechChoice[] {
  const count = DEFAULT_DIRECTOR_DATA.parameters.directorChoicesPerTurn!.value;
  if (stage === "opener") {
    // The greeting does not depend on the points: it is said for the plan of
    // the first question on offer.
    const first = pointCandidates(core as CoreState, KIND, speaker, [])[P.zero];
    return first ? wordings(core, build, "opener", [first], {}) : [];
  }
  if (stage === "closer")
    return wordings(core, build, "closer", questions, draws);
  // A point: the planner's sentences for each question the speech may take
  // up next, the first carrying the paragraph that names the speech's theme.
  const first = !questions.length;
  const rows = pointCandidates(core as CoreState, KIND, speaker, questions)
    .map((question) => {
      const done = said(core, build, [...questions, question], draws);
      if (!done) return null;
      const side = done.sides.get(question);
      const blocks = first
        ? ["occasion", `point-${question}`]
        : [`point-${question}`];
      return choiceOf(
        "core",
        `core:${question}`,
        question,
        done.sentences.filter((sentence) => blocks.includes(sentence.block)),
        side
          ? {
              stand: {
                question,
                desiredChange: side === "for" ? "enact" : "repeal",
              },
            }
          : {},
      );
    })
    .filter((row): row is SpeechChoice => !!row);
  const person = core.people.get(build.speakerId);
  const reach = person
    ? decisionLean(
        core,
        person,
        "conversation.reply-reach",
        "carry-on",
        "keep-short",
      )
    : P.zero;
  return speechPartsByReach(rows, reach >= P.zero).slice(P.zero, count);
}

/**
 * Begin a speech for a race the speaker stands in: the greeting's choices.
 * Null when the speaker is not a living person or holds no stand the seat's
 * questions could make a speech of.
 */
export function beginSpeech(
  core: Readonly<CoreState>,
  speakerId: PersonId,
  race: { officeId: string; party: string | null; minute?: number },
): SpeechBuild | null {
  const person = core.people.get(speakerId);
  if (!person?.alive) return null;
  // stopgapId: SG-WORDS-floor-speech-state-chambers
  if (
    !campaignSpeaker(
      core as CoreState,
      speakerId,
      race.officeId,
      race.party,
      race.minute,
    )
  ) {
    markWordsStopgap("SG-WORDS-floor-speech-state-chambers");
    return null;
  }
  const build = {
    speakerId,
    placeId: person.placeId,
    officeId: race.officeId,
    party: race.party,
    minute: race.minute,
    startedOn: core.date,
    stages: stagesOf(),
    picked: [] as SpeechChoice[],
  };
  const { choices } = offer(core, build);
  return choices.length ? { ...build, choices, done: false } : null;
}

/** Say one of the choices; the next stage's follow. Unknown keys change nothing. */
export function chooseSpeechPart(
  core: Readonly<CoreState>,
  build: SpeechBuild,
  key: string,
): SpeechBuild {
  const choice = build.choices.find((row) => row.key === key);
  if (!choice) return build;
  const picked = [...build.picked, choice];
  const next = { ...build, picked };
  const { stage, choices } = offer(core, next);
  return { ...next, choices, done: stage === null };
}

/** The speech as given so far, parts in order: the words the player saw when they picked each. */
export function speechText(build: Pick<SpeechBuild, "picked">): string {
  return speechWords(build.picked);
}

/**
 * The speaker's stands, strongest first: their current view on each policy
 * question the catalog names (the views engine's, from their opening lean
 * and what they have heard since), one stand per catalog topic so two stands
 * are never on the same subject. A view of exactly nothing is no stand.
 */
export function standsOf(core: Readonly<CoreState>, speakerId: PersonId) {
  const api = coreAPI(core as CoreState);
  const view = viewOf(api, speakerId);
  if (!view) return [];
  const rows = allQuestions()
    .map((question) => ({
      question,
      view: viewOn(api, speakerId, question, view.lean),
    }))
    .filter((row) => row.view !== P.zero)
    .sort(
      (a, b) =>
        Math.abs(b.view) - Math.abs(a.view) ||
        a.question.localeCompare(b.question),
    );
  const topics = new Set<string>();
  return rows.filter((row) => {
    const topic = questionTopic(row.question);
    if (!topic || !questionName(row.question) || topics.has(topic))
      return false;
    topics.add(topic);
    return true;
  });
}
