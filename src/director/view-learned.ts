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
import {
  VIEWS_MODULE_ID,
  stanceRow,
  stancesOf,
  viewOf,
  viewOn,
} from "../core2/modules/views";
import { onStoryHeard } from "../core2/modules/news-listeners";
import { LETTER, printedStoryOf } from "../core2/modules/press";
import { P } from "../core2/parameters";
import { coreAPI } from "../core2/state";
import { decisionLean, hardshipStress } from "../core2/trait-decisions";
import { NAMED_QUESTIONS, questionAbout } from "../english/question-names";
import rulesFile from "./data/conversation-rules.json" with { type: "json" };
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

/** The knowledge key under which someone learns the question a person cares most about. */
export const viewQuestionKey = (personId: string) =>
  `person:${personId}:view-question`;

/**
 * The question a person holds the strongest view on: of the questions their
 * stances name (or, with none, every question with a spoken name), the one
 * whose view is farthest from zero (the views engine's `viewOn`), ties broken by the
 * question's id. Null when no view is past zero, the views engine's own rule
 * for no view. With it: the question worded, the side, and the record.
 */
export function strongestQuestion(
  api: CoreAPI,
  personId: PersonId,
  /** Only the questions this accepts (a question the person has a reason of their own for). */
  accept: (question: string) => boolean = () => true,
): {
  question: string;
  about: string;
  side: "for" | "against";
  recordId: string;
} | null {
  const lean = viewOf(api, personId)?.lean;
  if (lean === undefined) return null;
  // Their own stances first: a question they hold a stance record on is one
  // they have taken up. Only someone with none is read from their lean on
  // the named questions, where every person of one lean would say the same.
  const strongest = (questions: readonly string[]) => {
    let found: { question: string; about: string; view: number } | null = null;
    for (const question of [...new Set(questions)].sort()) {
      if (!accept(question)) continue;
      const about = questionAbout(question);
      if (!about) continue;
      const view = viewOn(api, personId, question, lean);
      if (view !== zero && (!found || Math.abs(view) > Math.abs(found.view)))
        found = { question, about, view };
    }
    return found;
  };
  const best =
    strongest(stancesOf(api, personId).map((row) => row.topic)) ??
    strongest(NAMED_QUESTIONS);
  if (!best) return null;
  return {
    question: best.question,
    about: best.about,
    side: best.view > zero ? "for" : "against",
    recordId: stanceRow(api, personId, best.question)
      ? stanceRecordId(personId, best.question)
      : viewRecordId(personId),
  };
}

/** Which reason from a person's own life fits each side of a question (conversation-rules.json stands.reasonFits). */
const FITS = (
  rulesFile as unknown as {
    stands: {
      reasonFits: {
        payNear: { value: number };
        payrollTitles: readonly string[];
        wages: Readonly<Record<string, { value: number } | string>>;
        questions: Readonly<
          Record<string, Partial<Record<"for" | "against", string>>>
        >;
      };
    };
  }
).stands.reasonFits;

/**
 * Why a person holds a view on one side of a question, from their own life,
 * only when the record supports that side (lead, Nov 12: "At about $15 an
 * hour, it's my own paycheck on the line" from someone against the raise that
 * would pay her more). The rules name, by question and side, the reason that
 * fits: their pay at or near the proposed wage (`pay-near`), a job that sets
 * pay (`payroll`), a job that does not (`worker`), or the household's
 * hardship (`hardship`). A side with no fit, or a record that does not bear
 * it, gives none: they say the principle. Each reason cites its record.
 */
function viewReason(
  core: Readonly<CoreState>,
  personId: PersonId,
  question: string,
  side: "for" | "against",
):
  | {
      reason: "work";
      employer: string;
      recordIds: readonly string[];
      /** Which fit it is: their pay against the proposal, a job that sets pay, or a job. */
      fit: string;
    }
  | { reason: "money"; recordIds: readonly string[] }
  | null {
  const person = core.people.get(personId);
  const fit = FITS.questions[question]?.[side];
  if (!person || !fit) return null;
  if (fit === "hardship")
    return hardshipStress(core, person) > zero
      ? { reason: "money", recordIds: [person.householdId] }
      : null;
  let job = person.jobId ? core.jobs.get(person.jobId) : undefined;
  // A job lost still speaks for the worker's side (pay, not payroll).
  if (!job && fit !== "payroll")
    for (const [key, row] of core.knowledgeByPerson.get(personId) ?? []) {
      const match = /^job:(.+):status$/.exec(key);
      if (match && row.value === "ended") job = core.jobs.get(match[one]!);
    }
  const employer = job ? core.organizations.get(job.organizationId) : null;
  // Never the outside account or a government's treasury as an employer
  // ("I see it every day at Town of Plymouth treasury."): no work reason.
  if (
    !job ||
    !employer ||
    employer.outsideFlow ||
    employer.kind === "government-treasury"
  )
    return null;
  const title = job.title.toLowerCase();
  const setsPay = FITS.payrollTitles.some((word) =>
    new RegExp(`\\b${word}\\b`).test(title),
  );
  const wage = FITS.wages[question];
  const hourly =
    job.hourlyMinor ??
    (job.hoursDaily > zero ? job.wageDailyMinor / job.hoursDaily : undefined);
  const fits =
    fit === "payroll"
      ? setsPay
      : fit === "worker"
        ? !setsPay
        : fit === "pay-near"
          ? !setsPay &&
            typeof wage === "object" &&
            hourly !== undefined &&
            hourly <= wage.value * FITS.payNear.value
          : false;
  return fits
    ? {
        reason: "work",
        employer: employer.name,
        recordIds: [job.id, employer.id],
        fit,
      }
    : null;
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
  /** Questions not to stand on here (one the house named today). */
  skip: (question: string) => boolean = () => false,
): {
  stage: string;
  recordId: string;
  weight: number;
  /** The question they care most about, its side and record, and why, when they have one. */
  strongest: ReturnType<typeof strongestQuestion>;
  reason: ReturnType<typeof viewReason>;
} | null {
  if (!core.modules.has(VIEWS_MODULE_ID)) return null;
  if (core.knowledgeByPerson.get(listenerId)?.has(viewKey(speakerId)))
    return null;
  const api = coreAPI(core as CoreState);
  const view = viewOf(api, speakerId);
  if (!view) return null;
  // The stand they say is the one their own life gives a reason for (their
  // work, their money), the strongest of those; only with none is it their
  // strongest view, said without a reason (words composer, Nov 12: "each
  // speaker's own why"; the strongest view alone was a question their life
  // never touched, so the has-reason path never fired in four drawn places).
  const lean = view.lean;
  const sideOf = (question: string): "for" | "against" | null => {
    const held = viewOn(api, speakerId, question, lean);
    return held > zero ? "for" : held < zero ? "against" : null;
  };
  const reasoned = strongestQuestion(api, speakerId, (question) => {
    const side = sideOf(question);
    return (
      !skip(question) && !!side && !!viewReason(core, speakerId, question, side)
    );
  });
  const strongest =
    reasoned ??
    strongestQuestion(api, speakerId, (question) => !skip(question));
  return {
    stage: view.label,
    recordId: viewRecordId(speakerId),
    weight: viewTopicWeight(viewWillingness(core, speakerId, listenerId)),
    strongest,
    reason: strongest
      ? viewReason(core, speakerId, strongest.question, strongest.side)
      : null,
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
 * The listener learns the question a person cares most about, once: the
 * card names it beside where they stand. The source is the talk that told it.
 */
export function learnViewQuestion(
  api: CoreAPI,
  learnerId: PersonId,
  aboutId: PersonId,
  question: string,
  sourceId: string,
): boolean {
  if (api.knows(learnerId, viewQuestionKey(aboutId))) return false;
  api.observe(learnerId, {
    key: viewQuestionKey(aboutId),
    value: question,
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
