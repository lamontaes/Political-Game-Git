/**
 * Where someone stands politically, as the player learns it (the person's
 * card reads `person:<id>:view` and says "You don't know where they stand
 * yet." until it exists). Two routes write the one key:
 *
 * - a talk: the other person says where they stand, as far as their tie to
 *   the player and their temperament allow (`viewSubject`, raised by
 *   `./conversation` through its one subject engine);
 * - the news: the player hears a story in which the person took a public
 *   stand (a letter to the editor, told by the paper or by someone who read
 *   it), recorded by the news engine's hearing hook (`learnFromStory`).
 *
 * The truth stays in the views engine's records (`views:people:<id>` for the
 * lean, `views:stances:<id>:<topic>` for a question); the key holds the ids of
 * the records it was learned from, and its source is the talk or story that
 * taught it. Nothing here decides what anyone believes: it only moves what
 * the views engine already holds into what the player knows.
 */
import { closenessBetween } from "../core2/closeness";
import { VIEWS_MODULE_ID, stanceRow, viewOf } from "../core2/modules/views";
import { onStoryHeard } from "../core2/modules/news-listeners";
import { LETTER, printedStoryOf } from "../core2/modules/press";
import { P } from "../core2/parameters";
import { coreAPI } from "../core2/state";
import { decisionLean } from "../core2/trait-decisions";
import type { CoreAPI, CoreState, PersonId } from "../core2/types";
import type { Story } from "../core2/modules/news";
import { DEFAULT_DIRECTOR_DATA } from "./ledger";

const zero = P.zero;
const one = P.one;

/** The knowledge key under which someone learns where a person stands. */
export const viewKey = (personId: string) => `person:${personId}:view`;

/** The views engine's record of a person's lean, by the id the records cite. */
export const viewRecordId = (personId: string) =>
  `${VIEWS_MODULE_ID}:people:${personId}`;

/** The views engine's record of a person's stance on a question. */
export const stanceRecordId = (personId: string, topic: string) =>
  `${VIEWS_MODULE_ID}:stances:${personId}:${topic}`;

const talkParameter = (key: string): number =>
  DEFAULT_DIRECTOR_DATA.parameters[key]!.value;

/**
 * How readily someone talks politics with a listener, from zero (never) up:
 * how closely they follow politics, times how close the two are today, times
 * their temperament (the trait engine's `conversation.reply-reach`, the same
 * lean that makes a person carry a talk on or keep it short, scaled so the
 * most reserved person still gives some, and the most outgoing gives all).
 * It slides with every one of the three; a stranger gives nothing because
 * the tie is nothing.
 */
export function viewWillingness(
  core: Readonly<CoreState>,
  speakerId: PersonId,
  listenerId: PersonId,
): number {
  const speaker = core.people.get(speakerId);
  if (!speaker || !core.modules.has(VIEWS_MODULE_ID)) return zero;
  const view = viewOf(coreAPI(core as CoreState), speakerId);
  if (!view) return zero;
  const weight = talkParameter("directorTalkViewTraitWeight");
  const temperament =
    (one +
      weight *
        decisionLean(
          core,
          speaker,
          "conversation.reply-reach",
          "carry-on",
          "keep-short",
        )) /
    (one + weight);
  return (
    view.engagement *
    closenessBetween(core, speakerId, listenerId) *
    temperament
  );
}

/**
 * Whether the person's willingness beats ordinary small talk as the talk's
 * topic: the topic that weighs most leads, and small talk (work, home, the
 * day) weighs `directorTalkSmallTalkWeight`. Returns the willingness scaled
 * to a topic's weight when it does, else zero.
 */
export function viewTopicWeight(willingness: number): number {
  const weight = willingness * talkParameter("directorTalkViewImpact");
  return weight > talkParameter("directorTalkSmallTalkWeight") ? weight : zero;
}

/**
 * What a person who says where they stand cites: the views engine's record of
 * their lean, and the stage the words are said at (the view's own label:
 * very liberal to very conservative, or "not-sure" for one who would not place
 * themselves). Null when the listener already knows, or no view exists.
 */
export function viewSubjectOf(
  core: Readonly<CoreState>,
  speakerId: PersonId,
  listenerId: PersonId,
): {
  stage: string;
  recordId: string;
  weight: number;
} | null {
  if (!core.modules.has(VIEWS_MODULE_ID)) return null;
  if (core.knowledgeByPerson.get(listenerId)?.has(viewKey(speakerId)))
    return null;
  const view = viewOf(coreAPI(core as CoreState), speakerId);
  if (!view) return null;
  return {
    stage: view.label,
    recordId: viewRecordId(speakerId),
    weight: viewTopicWeight(viewWillingness(core, speakerId, listenerId)),
  };
}

/**
 * The listener learns where a person stands: one key, once. The value cites
 * the records it comes from; the source is the talk or the story that told it.
 */
export function learnView(
  api: CoreAPI,
  learnerId: PersonId,
  aboutId: PersonId,
  recordIds: readonly string[],
  sourceId: string,
): boolean {
  if (api.knows(learnerId, viewKey(aboutId))) return false;
  api.observe(learnerId, {
    key: viewKey(aboutId),
    value: recordIds.join(" "),
    learnedAt: api.state.date,
    sourceId,
    access: "told",
  });
  return true;
}

/**
 * The news route. A letter to the editor is a resident taking a public stand
 * on a question, in print; the player who reads it (or is told it by someone
 * who did) learns where that resident stands. The story's facts name the
 * writer and the question; the record cited is the writer's stance row.
 */
function learnFromStory(api: CoreAPI, personId: PersonId, story: Story): void {
  if (personId !== api.state.playerId) return;
  const writerId = story.facts.personId;
  const topic = story.facts.topic;
  // The writer may be the player: a letter the player wrote is read back to
  // them like any other, and the key says they know where its writer stands.
  if (!writerId || !topic) return;
  if (printedStoryOf(api, story.id)?.kind !== LETTER) return;
  if (!api.state.people.has(writerId)) return;
  learnView(
    api,
    personId,
    writerId as PersonId,
    [
      viewRecordId(writerId),
      ...(stanceRow(api, writerId as PersonId, topic)
        ? [stanceRecordId(writerId, topic)]
        : []),
    ],
    story.id,
  );
}
onStoryHeard(learnFromStory);
