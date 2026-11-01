/**
 * A speech the player builds as they give it. Four stages, four choices at each: a short opener, two
 * longer parts at the core on different subjects, and a short closer. The
 * subjects are the speaker's own: the stands they hold (the views engine's
 * stances, named as the bill catalog names them), their work, their town,
 * their children and their school. Nothing is typed here, and no bank is
 * read here: the English engine (`src/english/speech-stage-words.ts`) gives
 * the pieces for each stage, filled from the speaker's records, and a subject
 * with no record for its slots is never offered.
 */
import { heldSinceRecord, schoolsAttended } from "../core2/past";
import {
  speechPartsByReach,
  speechStagePieces,
  speechWords,
  wordSpeechPart,
  type Fact,
} from "../english/speech-stage-words";
import { decisionLean } from "../core2/trait-decisions";
import { corePlaceByJurisdictionId } from "../core2/place-lookup";
import { ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import { viewOf, viewOn } from "../core2/modules/views";
import { P } from "../core2/parameters";
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import { DEFAULT_DIRECTOR_DATA } from "./ledger";
import {
  allQuestions,
  questionName,
  questionTopic,
} from "../english/policy-names";
import { properName, spoken } from "./words";

export type SpeechStage = "opener" | "core" | "closer";
/** Opener, two parts at the core, closer. */
export const SPEECH_STAGES: readonly SpeechStage[] = [
  "opener",
  "core",
  "core",
  "closer",
];

export interface SpeechChoice {
  key: string;
  stage: SpeechStage;
  /** What the part is about: a stand's question id, or work, home, children, school; empty for an opener or closer. */
  subject: string;
  text: string;
  /** The bank piece the words came from. */
  partKey: string;
  sourceRecordIds: readonly string[];
  /** A stand the speaker takes in this part, for the speech engine. */
  stand?: { question: string; desiredChange: "enact" | "repeal" };
}

export interface SpeechBuild {
  speakerId: PersonId;
  placeId: string;
  /** The date it began; with the speaker, it keys the wording. */
  startedOn: string;
  picked: SpeechChoice[];
  /** The four choices for the next stage; empty once the speech is whole. */
  choices: SpeechChoice[];
  done: boolean;
}

/** The facts a speaker's own records give a part. */
function factsOf(
  core: Readonly<CoreState>,
  speakerId: PersonId,
): Record<string, Fact> {
  const person = core.people.get(speakerId);
  const facts: Record<string, Fact> = {};
  if (!person) return facts;
  const place = corePlaceByJurisdictionId(person.placeId as never);
  if (place)
    facts.place = {
      text: spoken(place),
      sourceRecordIds: [person.householdId],
    };
  const job = person.jobId ? core.jobs.get(person.jobId) : undefined;
  const org = job ? core.organizations.get(job.organizationId) : undefined;
  if (org)
    facts.employer = { text: properName(org.name), sourceRecordIds: [org.id] };
  // How long they have held it, from the record of their working life.
  const tenure = heldSinceRecord(core as CoreState, person.id, person.jobId);
  if (tenure) {
    const years = ageOnDate(
      makeIsoDate(String(tenure.facts.startedAt)),
      makeIsoDate(core.date),
    );
    if (years > P.zero)
      facts.years = { text: String(years), sourceRecordIds: [tenure.id] };
  }
  // The first school the person's records name, by its own record.
  const school = schoolsAttended(core, person.id).find((row) => row.name);
  if (school)
    facts.school = {
      text: properName(school.name!),
      sourceRecordIds: [school.recordId, school.schoolId],
    };
  const household = core.households.get(person.householdId);
  const children = (household?.memberIds ?? []).filter((id) => {
    const member = core.people.get(id);
    return (
      member?.alive &&
      id !== speakerId &&
      ageOnDate(makeIsoDate(member.birthDate), makeIsoDate(core.date)) <
        P.childUpperAge
    );
  });
  if (children.length >= P.two)
    facts.number = {
      text: numberWord(children.length),
      sourceRecordIds: [person.householdId, ...children],
    };
  return facts;
}

const capitalized = (text: string) =>
  text.charAt(P.zero).toUpperCase() + text.slice(P.one);

/** The records behind only the facts a line copied. */
const usedIds = (
  line: { factKeys?: readonly string[] },
  facts: Record<string, Fact>,
  speakerId: PersonId,
) => {
  const ids = [
    ...new Set(
      (line.factKeys ?? []).flatMap((key) => facts[key]?.sourceRecordIds ?? []),
    ),
  ];
  return ids.length ? ids : [speakerId];
};

const NUMBER_WORDS = [
  "no",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
];
const numberWord = (count: number) => NUMBER_WORDS[count] ?? String(count);

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

/** Core parts the speaker could give now, one per subject, each worded from their records. */
function corePool(
  core: Readonly<CoreState>,
  build: Pick<SpeechBuild, "speakerId" | "startedOn" | "picked">,
): SpeechChoice[] {
  const facts = factsOf(core, build.speakerId);
  const taken = new Set(build.picked.map((row) => row.subject));
  const pool: SpeechChoice[] = [];
  const say = (
    subject: string,
    role: string,
    extra: Record<string, Fact>,
    stand?: SpeechChoice["stand"],
  ) => {
    if (taken.has(subject)) return;
    const line = wordSpeechPart({
      seed: core.seed,
      role,
      speakerId: build.speakerId,
      facts: { ...facts, ...extra },
      momentKey: `speech:${build.speakerId}:${build.startedOn}:${subject}`,
    });
    if (!line) return;
    pool.push({
      key: `core:${subject}`,
      stage: "core",
      subject,
      text: line.text,
      partKey: line.variantKey ?? "",
      sourceRecordIds: usedIds(line, { ...facts, ...extra }, build.speakerId),
      ...(stand ? { stand } : {}),
    });
  };
  for (const stand of standsOf(core, build.speakerId)) {
    const desired = stand.view > P.zero ? "enact" : "repeal";
    say(
      stand.question,
      desired === "enact" ? "stance-enact" : "stance-repeal",
      {
        issue: {
          text: questionTopic(stand.question)!.toLowerCase(),
          sourceRecordIds: [build.speakerId],
        },
        goal: {
          text: capitalized(questionName(stand.question)!),
          sourceRecordIds: [build.speakerId],
        },
      },
      { question: stand.question, desiredChange: desired },
    );
  }
  for (const subject of ["work", "home", "children", "school"])
    say(subject, subject, {});
  return pool;
}

/**
 * Four choices, ranked by the speaker's traits: someone who carries talk on
 * sees the longer, weightier parts first, someone who keeps it short sees
 * the plainer ones. At the core, two stands and two personal parts are
 * offered side by side (a speaker with fewer of one kind sees more of the
 * other), so the choice is always between different subjects.
 */
function rank(
  core: Readonly<CoreState>,
  speakerId: PersonId,
  pool: readonly SpeechChoice[],
): SpeechChoice[] {
  const person = core.people.get(speakerId);
  const reach = person
    ? decisionLean(
        core,
        person,
        "conversation.reply-reach",
        "carry-on",
        "keep-short",
      )
    : P.zero;
  const count = DEFAULT_DIRECTOR_DATA.parameters.directorChoicesPerTurn!.value;
  const byReach = (rows: readonly SpeechChoice[]) =>
    speechPartsByReach(rows, reach >= P.zero);
  const stands = pool.filter((row) => row.stand).slice(P.zero, P.two);
  const personal = pool.filter((row) => !row.stand);
  if (!stands.length) return byReach(personal).slice(P.zero, count);
  const room = count - stands.length;
  return byReach([
    ...stands,
    ...byReach(personal).slice(P.zero, Math.max(room, P.two)),
  ]).slice(P.zero, count);
}

function edgePool(
  core: Readonly<CoreState>,
  build: Pick<SpeechBuild, "speakerId" | "startedOn">,
  role: "opener" | "closer",
): SpeechChoice[] {
  const facts = factsOf(core, build.speakerId);
  const pool: SpeechChoice[] = [];
  for (const piece of speechStagePieces(role)) {
    const line = wordSpeechPart({
      seed: core.seed,
      role,
      speakerId: build.speakerId,
      facts,
      momentKey: `speech:${build.speakerId}:${build.startedOn}:${role}`,
      pieceKey: piece,
    });
    if (line)
      pool.push({
        key: `${role}:${piece}`,
        stage: role,
        subject: "",
        text: line.text,
        partKey: piece,
        sourceRecordIds: usedIds(line, facts, build.speakerId),
      });
  }
  return pool;
}

function offer(
  core: Readonly<CoreState>,
  build: Pick<SpeechBuild, "speakerId" | "startedOn" | "picked">,
): SpeechChoice[] {
  const stage = SPEECH_STAGES[build.picked.length];
  if (!stage) return [];
  const pool =
    stage === "core" ? corePool(core, build) : edgePool(core, build, stage);
  return rank(core, build.speakerId, pool);
}

/** Begin a speech: the opener's four choices. Null when the speaker is not a living person. */
export function beginSpeech(
  core: Readonly<CoreState>,
  speakerId: PersonId,
): SpeechBuild | null {
  const person = core.people.get(speakerId);
  if (!person?.alive) return null;
  const build = {
    speakerId,
    placeId: person.placeId,
    startedOn: core.date,
    picked: [] as SpeechChoice[],
  };
  return { ...build, choices: offer(core, build), done: false };
}

/** Say one of the four; the next stage's four follow. Unknown keys change nothing. */
export function chooseSpeechPart(
  core: Readonly<CoreState>,
  build: SpeechBuild,
  key: string,
): SpeechBuild {
  const choice = build.choices.find((row) => row.key === key);
  if (!choice) return build;
  const picked = [...build.picked, choice];
  const next = { ...build, picked };
  const choices = offer(core, next);
  return { ...next, choices, done: picked.length >= SPEECH_STAGES.length };
}

/** The speech as given so far, parts in order. */
export function speechText(build: Pick<SpeechBuild, "picked">): string {
  return speechWords(build.picked);
}
