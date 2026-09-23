import { readableTuitionSummary } from "../simulation/education-study-progression";
import {
  ageOnDate,
  electionContestResult,
  personName,
  organizationProfileAt,
  privateBeliefHistory,
  publicPositionHistory,
  workRoleAt,
  type EntityId,
  type IsoDate,
  type World,
} from "../simulation";
import { INTRODUCTION_EVENT } from "../simulation/social-introductions";
import { crimeJournalLine } from "../simulation/crime/journal";
import { ownElectionResultSentence } from "./own-election";
import { proseDate, proseMonthYear, proseYear } from "./prose-dates";

export interface World39BiographyEntry {
  readonly id: string;
  readonly at: IsoDate;
  readonly sequence: number;
  readonly kind: "life" | "event" | "memory" | "account" | "view";
  readonly text: string;
  readonly sourceId: EntityId;
}

/** One calendar year with something in it, oldest first. */
export interface World39BiographyChapter {
  readonly key: string;
  readonly year: string;
  readonly heading: string;
  readonly entries: readonly World39BiographyEntry[];
}

/**
 * Sentences that describe the save or the engine instead of the life, and
 * causes or feelings no record supports. They are omitted, never rewritten
 * into something the record does not say.
 */
const LEDGER_OR_CHOSE =
  /\bproof[- ]ledger\b|\bstanding for membership\b|\bnot represented in this save\b|\bsource pack\b/i;
const INVENTED_CAUSE_OR_FEELING =
  /\bbecause you (felt|were|wanted)\b|\bmade you (feel|angry|sad|happy|afraid)\b|\byou were (angry|sad|lonely|afraid|proud|ashamed)\b|\bthis (reminds|inspired|forced) you\b/i;

/**
 * The account keeps a summary's own scope; it only drops the "You chose to"
 * ledger voice and turns a first-person memory into the second person the
 * rest of the account speaks in.
 */
export function livedWorld39Sentence(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const stripped = trimmed
    .replace(/^You chose to /i, "You ")
    .replace(/^You decided to /i, "You ")
    .replace(/^I remember /, "You remember ");
  if (LEDGER_OR_CHOSE.test(stripped)) return null;
  if (INVENTED_CAUSE_OR_FEELING.test(stripped)) return null;
  return stripped;
}

/** No inferred motives or outcome classification: original words retain their scope. */
export function projectWorld39Journal(world: World, personId: EntityId) {
  const person = world.people[personId];
  const entries: World39BiographyEntry[] = [];
  if (!person) return { name: "", entries, chapters: [] };
  const frontier = { historySequenceExclusive: world.history.nextSequence };
  const ownName = personName(person);
  entries.push({
    id: `birth:${person.id}`,
    at: person.birthDate,
    sequence: -1,
    kind: "life",
    text: `You were born on ${proseDate(person.birthDate)}.`,
    sourceId: person.id,
  });
  for (const fact of person.establishedFacts) {
    if (
      fact.occurredAt > world.currentDate ||
      fact.kind === "birth-date" ||
      fact.kind === "family-relationship"
    )
      continue;
    const location = fact.jurisdictionId
      ? world.jurisdictions[fact.jurisdictionId]?.name
      : null;
    const text =
      fact.kind === "birthplace" && location
        ? `You were born in ${location}.`
        : fact.kind === "residence" && location
          ? fact.endedAt && fact.endedAt <= world.currentDate
            ? `You lived in ${location}.`
            : `You live in ${location}.`
          : fact.kind === "education"
            ? `You attended ${fact.institution}${fact.field ? `, studying ${fact.field}` : ""}.`
            : fact.kind === "occupation"
              ? `You worked as ${fact.title} at ${fact.employer}.`
              : null;
    if (text)
      entries.push({
        id: `fact:${fact.id}`,
        at: fact.occurredAt,
        sequence: 0,
        kind: "life",
        text,
        sourceId: fact.id,
      });
  }
  const enrollments = new Map(
    world.history.educationEnrollments
      .filter(
        (row) =>
          row.personId === personId && row.recordedAt <= world.currentDate,
      )
      .map((row) => [row.id, row]),
  );
  for (const state of world.history.educationEnrollmentStates) {
    const enrollment = enrollments.get(state.enrollmentId);
    if (!enrollment || state.effectiveAt > world.currentDate) continue;
    const school = organizationProfileAt(world, enrollment.organizationId, {
      asOfDate: state.effectiveAt,
      ...frontier,
    })?.name;
    if (!school) continue;
    const text =
      state.status === "expected"
        ? `You were due to start at ${school} on ${proseDate(enrollment.startedAt)}.`
        : state.status === "active"
          ? `You were enrolled at ${school}.`
          : state.status === "completed"
            ? `You finished at ${school} in ${proseMonthYear(state.effectiveAt)}.`
            : state.status === "withdrawn"
              ? `You left ${school} before finishing.`
              : state.status === "temporarily-inactive"
                ? `Your studies at ${school} were on hold.`
                : state.status === "transferred"
                  ? `You transferred out of ${school}.`
                  : `Your time at ${school} ended.`;
    entries.push({
      id: `education:${state.id}`,
      at: state.effectiveAt,
      sequence: state.sequence,
      kind: "life",
      text,
      sourceId: state.id,
    });
  }
  const work = new Map(
    world.history.workRelationships
      .filter(
        (row) =>
          row.personId === personId && row.recordedAt <= world.currentDate,
      )
      .map((row) => [row.id, row]),
  );
  for (const state of world.history.workStatuses) {
    const relationship = work.get(state.workRelationshipId);
    if (!relationship || state.effectiveAt > world.currentDate) continue;
    const employer = relationship.organizationId
      ? organizationProfileAt(world, relationship.organizationId, {
          asOfDate: state.effectiveAt,
          ...frontier,
        })?.name
      : null;
    if (!employer) continue;
    const title =
      workRoleAt(world, relationship.id, {
        asOfDate: state.effectiveAt,
        ...frontier,
      })?.title ?? null;
    const served = isElectedOrAppointedOffice(relationship.kind);
    const role = title
      ? `${served ? "serving as" : "working as"} ${title}`
      : "work";
    const asRole = title ? ` as ${title}` : "";
    // The status reason is the engine's explanation of the record, not
    // something the character would write about their own life; it is not
    // carried into the account.
    const text =
      state.status === "expected"
        ? `You were due to start${asRole} at ${employer} on ${proseDate(relationship.startedAt)}.`
        : state.status === "active"
          ? title
            ? `You began ${role} at ${employer}.`
            : `You began work at ${employer}.`
          : state.status === "temporarily-inactive"
            ? `Your work${asRole} at ${employer} was on hold.`
            : served && title
              ? `Your time as ${title} at ${employer} ended.`
              : `Your work${asRole} at ${employer} ended.`;
    entries.push({
      id: `work:${state.id}`,
      at: state.effectiveAt,
      sequence: state.sequence,
      kind: "life",
      text,
      sourceId: state.id,
    });
  }
  const covered = new Set<EntityId>();
  // Involvement can mean being a private discussion's subject. Only actual
  // agency/presence or accurate direct knowledge admits its canonical summary.
  for (const event of world.history.events) {
    if (
      event.occurredAt > world.currentDate ||
      event.recordedAt > world.currentDate ||
      event.occurredAt < person.birthDate
    )
      continue;
    const participated = event.participants.some(
      (row) =>
        row.personId === personId &&
        (row.role.startsWith("agency:") || row.role.startsWith("presence:")),
    );
    const directKnowledge = world.history.knowledge.find(
      (row) =>
        row.personId === personId &&
        row.eventId === event.id &&
        row.learnedAt <= world.currentDate &&
        row.source.kind === "direct" &&
        row.accuracy === "accurate",
    );
    if (!participated && !directKnowledge) continue;
    // Somebody something happened to (a crime's victim) knows it in their own
    // words; the event's summary is the public log's ("Police in Fairbanks
    // took a report of an assault"), which reads as a town notice.
    const affected = event.participants.some(
      (row) => row.personId === personId && row.role.startsWith("impact:"),
    );
    const ownWords =
      affected && directKnowledge?.believedSummary.trim()
        ? directKnowledge.believedSummary
        : null;
    if (/^(setup|simulation|information|evidence|world)\./.test(event.type))
      continue;
    if (STANDING_STATE_EVENT_TYPES.has(event.type)) continue;
    // A crime says what happened to its victim; nobody else's Journal has it.
    const crimeLine = crimeJournalLine(event, personId);
    if (crimeLine === null) continue;
    const text = livedWorld39Sentence(
      crimeLine ??
        (event.type === "life.conversation"
          ? conversationSentence(world, event, personId)
          : (event.type === INTRODUCTION_EVENT &&
              introductionSentence(world, event, personId)) ||
            inOwnVoice(
              ownWords ??
                (event.type.startsWith("life-paths2.tuition-")
                  ? readableTuitionSummary(event.summary)
                  : event.summary),
              ownName,
            )),
    );
    if (!text) continue;
    covered.add(event.id);
    entries.push({
      id: `event:${event.id}`,
      at: event.occurredAt,
      sequence: event.sequence,
      kind: "event",
      text,
      sourceId: event.id,
    });
  }
  for (const memory of world.history.memories) {
    if (
      memory.personId !== personId ||
      memory.formedAt > world.currentDate ||
      covered.has(memory.eventId)
    )
      continue;
    if (
      world.history.memories.some(
        (row) =>
          row.supersedesMemoryId === memory.id &&
          row.formedAt <= world.currentDate,
      )
    )
      continue;
    const text = livedWorld39Sentence(memory.rememberedSummary);
    if (!text) continue;
    covered.add(memory.eventId);
    entries.push({
      id: `memory:${memory.id}`,
      at: memory.formedAt,
      sequence: memory.sequence,
      kind: "memory",
      text,
      sourceId: memory.id,
    });
  }
  // Keep a secondhand report in the recipient's own words. Never substitute
  // private event truth or label the report accurate from the omniscient flag.
  // Only what somebody told this person, or what reached them through a
  // record, an outlet or a rumor, about something that has happened. Knowledge
  // the opportunity producer writes about a standing offer (a proposed
  // evening, an invitation, a favor asked, a confidence shared) is the state
  // of an offer, which the record's open items carry, not a lived account.
  const eventsById = new Map(
    world.history.events.map((event) => [event.id, event]),
  );
  const knowledge = world.history.knowledge.filter(
    (row) => row.personId === personId && row.learnedAt <= world.currentDate,
  );
  for (const account of knowledge) {
    if (covered.has(account.eventId)) continue;
    if (account.source.kind === "direct") continue;
    const source = eventsById.get(account.eventId);
    if (!source || source.occurredAt > world.currentDate) continue;
    if (isStandingOfferEvent(source.type)) continue;
    if (!account.believedSummary.trim()) continue;
    entries.push({
      id: `account:${account.id}`,
      at: account.learnedAt,
      sequence: account.sequence,
      kind: "account",
      text: inOwnVoice(account.believedSummary, ownName),
      sourceId: account.id,
    });
  }
  // What this person privately thinks, and what they said in public, each
  // attributed to its own record.
  const latestBelief = new Map<
    EntityId,
    (typeof world.history.privateBeliefs)[number]
  >();
  for (const belief of privateBeliefHistory(world, personId)) {
    if (belief.formedAt > world.currentDate) continue;
    latestBelief.set(belief.propositionId, belief);
  }
  for (const belief of latestBelief.values()) {
    const proposition = world.policyCatalog.propositions[belief.propositionId];
    if (!proposition) continue;
    entries.push({
      id: `belief:${belief.id}`,
      at: belief.formedAt,
      sequence: belief.sequence,
      kind: "view",
      text: beliefSentence(belief.position, proposition.name),
      sourceId: belief.id,
    });
  }
  const latestPosition = new Map<
    EntityId,
    (typeof world.history.publicPositions)[number]
  >();
  for (const position of publicPositionHistory(world, personId)) {
    if (position.audience !== "public" || position.statedAt > world.currentDate)
      continue;
    latestPosition.set(position.propositionId, position);
  }
  for (const position of latestPosition.values()) {
    entries.push({
      id: `position:${position.id}`,
      at: position.statedAt,
      sequence: position.sequence,
      kind: "view",
      text: `In public you said: ${quoted(position.statement)}`,
      sourceId: position.id,
    });
  }
  for (const commitment of world.history.campaignCommitments) {
    if (
      commitment.personId !== personId ||
      commitment.madeAt > world.currentDate
    )
      continue;
    const proposition =
      world.policyCatalog.propositions[commitment.propositionId];
    if (!proposition) continue;
    entries.push({
      id: `campaign-commitment:${commitment.id}`,
      at: commitment.madeAt,
      sequence: commitment.sequence,
      kind: "view",
      text: campaignCommitmentSentence(
        commitment.level,
        commitment.stance,
        proposition.name,
        commitment.statement,
      ),
      sourceId: commitment.id,
    });
  }
  for (const contest of world.history.electionContests ?? []) {
    if (!contest.candidatePersonIds.includes(personId)) continue;
    const result = electionContestResult(world, contest.id);
    const sentence = result
      ? ownElectionResultSentence(world, contest.id, personId)
      : null;
    if (!result || !sentence || result.resolvedAt > world.currentDate) continue;
    entries.push({
      id: `election-result:${result.id}`,
      at: result.resolvedAt,
      sequence: result.sequence,
      kind: "event",
      text: sentence,
      sourceId: result.id,
    });
  }
  const sorted = entries.sort(
    (a, b) =>
      a.at.localeCompare(b.at) ||
      a.sequence - b.sequence ||
      a.id.localeCompare(b.id),
  );
  return {
    name: personName(person),
    entries: sorted,
    chapters: groupWorld39Chapters(sorted, person.birthDate),
  };
}

/**
 * One chapter per calendar year, headed by the age this life began that year
 * at, so a year that holds a birthday still reads as the age it was mostly
 * lived at.
 */
export function groupWorld39Chapters(
  entries: readonly World39BiographyEntry[],
  birthDate: IsoDate,
): readonly World39BiographyChapter[] {
  const chapters: World39BiographyChapter[] = [];
  for (const entry of entries) {
    const year = proseYear(entry.at);
    const last = chapters[chapters.length - 1];
    if (last && last.year === year) {
      chapters[chapters.length - 1] = {
        ...last,
        entries: [...last.entries, entry],
      };
      continue;
    }
    const age = ageOnDate(birthDate, entry.at);
    chapters.push({
      key: `year:${year}`,
      year,
      heading: age > 0 ? `${year}, age ${age}` : year,
      entries: [entry],
    });
  }
  return chapters;
}

/**
 * Events that record the state of an open item rather than something that
 * happened: a posted agenda, coursework still due, a choice still open. Their
 * summaries describe the present ("is due", "You have a path"), and the
 * record's open items already carry them, so the account leaves them out.
 */
const STANDING_STATE_EVENT_TYPES = new Set([
  "civic.meeting-agenda-item",
  "school.shared-assignment",
  "work.own-shift-coverage-needed",
  "life.education-work-crossroad",
]);

/**
 * A canonical summary names people in the third person ("Selena McGuire met
 * Alice May"). The account is addressed to its subject, so their own name
 * becomes "you". Only the name is replaced, plus the verb agreement that a
 * leading "You" needs; the rest of the sentence keeps its own words.
 */
export function inOwnVoice(text: string, ownName: string): string {
  if (!ownName) return text;
  let out = text;
  if (out.startsWith(`${ownName}'s `)) {
    out = `Your ${out.slice(ownName.length + 3)}`;
  } else if (out.startsWith(`${ownName} `)) {
    const rest = out
      .slice(ownName.length + 1)
      .replace(/^(was|is|has)\b/, (verb) => AGREEMENT[verb]!);
    out = `You ${rest}`;
  }
  // Whole names only, so "Ann Lee" never matches inside "Joann Lee".
  const name = ownName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return out
    .replace(new RegExp(`(?<![\\w-])${name}'s\\b`, "g"), "your")
    .replace(new RegExp(`(?<![\\w-])${name}(?![\\w-])`, "g"), "you");
}

const AGREEMENT: Readonly<Record<string, string>> = {
  was: "were",
  is: "are",
  has: "have",
};

/** What the speaker did, in the past tense, for each fixed talk intent. */
const SPOKEN_PAST: Readonly<Record<string, (name: string) => string>> = {
  greet: (name) => `You said hello to ${name}.`,
  scene: (name) =>
    `You talked with ${name} about what was happening around you.`,
  activity: (name) => `You asked ${name} what they would like to do.`,
  explain: (name) => `You asked ${name} why.`,
  suggestGame: (name) => `You suggested playing a game with ${name}.`,
  suggestQuiet: (name) => `You suggested sitting and talking with ${name}.`,
  share: (name) => `You asked ${name} if you could tell them something.`,
  matter: (name) => `You mentioned something in the news to ${name}.`,
  remember: (name) => `You talked with ${name} about an earlier conversation.`,
  acknowledge: (name) => `You let ${name} know you had heard.`,
  leave: (name) => `You said goodbye to ${name}.`,
  date: (name) => `You asked ${name} if they would like it to be a date.`,
  spendTime: (name) => `You spent half an hour with ${name}.`,
  acceptProposal: (name) => `You agreed to ${name}'s suggestion.`,
  declineProposal: (name) => `You declined ${name}'s suggestion.`,
  cancelProposal: (name) => `You canceled your plans with ${name}.`,
  nothing: (name) => `You told ${name} it could wait.`,
};

/**
 * A conversation's canonical summary is its transcript ("Selena McGuire: Say
 * hello. Dakota Austin: Hi, Selena."), which reads as a script in a life
 * story. The account says what this person did in it, from the event's own
 * intent tag and participants.
 */
function conversationSentence(
  world: World,
  event: World["history"]["events"][number],
  personId: EntityId,
): string {
  const speakerId = event.participants.find(
    (row) => row.role === "focus:subject",
  )?.personId;
  const listenerId = event.participants.find(
    (row) => row.role === "coordination:counterpart",
  )?.personId;
  const nameOf = (id: EntityId | undefined) => {
    const somebody = id ? world.people[id] : undefined;
    return somebody ? personName(somebody) : "somebody";
  };
  if (personId === speakerId) {
    const intent =
      event.tags
        .find((tag) => tag.startsWith("life.talk:"))
        ?.slice("life.talk:".length) ?? "";
    const phrase = SPOKEN_PAST[intent];
    const listener = nameOf(listenerId);
    return phrase ? phrase(listener) : `You talked with ${listener}.`;
  }
  if (personId === listenerId) return `You talked with ${nameOf(speakerId)}.`;
  return `You heard ${nameOf(speakerId)} talking with ${nameOf(listenerId)}.`;
}

/**
 * An introduction's summary names both people in the third person. The
 * account says who this person met, and where, from the event's own
 * participants and the setting phrase its social context carries.
 */
function introductionSentence(
  world: World,
  event: World["history"]["events"][number],
  personId: EntityId,
): string | null {
  const phrase = /^Two people meeting (.+)\.$/.exec(
    event.context.socialContext ?? "",
  )?.[1];
  if (!phrase) return null;
  const nameOf = (id: EntityId) => {
    const somebody = world.people[id];
    return somebody ? personName(somebody) : null;
  };
  const met = event.participants.filter(
    (row) => row.detail === "Met somebody new",
  );
  if (met.some((row) => row.personId === personId)) {
    const other = met.find((row) => row.personId !== personId);
    const name = other ? nameOf(other.personId) : null;
    return name ? `You met ${name} ${phrase}.` : null;
  }
  if (
    event.participants.some(
      (row) => row.personId === personId && row.role === "agency:introducer",
    )
  ) {
    const [first, second] = met.map((row) => nameOf(row.personId));
    return first && second ? `You introduced ${first} to ${second}.` : null;
  }
  return null;
}

/** Offer-state events the opportunity producer records before anything happens. */
function isStandingOfferEvent(type: string): boolean {
  return (
    /^life\.[a-z-]+-(proposed|invited|requested|disclosed|approach)$/.test(
      type,
    ) || /^civic\.meeting-(notice|agenda-item)$/.test(type)
  );
}

function beliefSentence(
  position: "support" | "oppose" | "uncertain" | "conflicted",
  propositionName: string,
): string {
  switch (position) {
    case "support":
      return `Privately, you support ${propositionName}.`;
    case "oppose":
      return `Privately, you oppose ${propositionName}.`;
    case "conflicted":
      return `Privately, you are torn over ${propositionName}.`;
    case "uncertain":
    default:
      return `Privately, you are unsure about ${propositionName}.`;
  }
}

function campaignCommitmentSentence(
  level: "aspiration" | "conditional" | "pledge",
  stance: "support" | "oppose" | "seek-modification" | "defer",
  propositionName: string,
  statement: string,
): string {
  const verb =
    stance === "support"
      ? "support"
      : stance === "oppose"
        ? "oppose"
        : stance === "seek-modification"
          ? "seek changes to"
          : "hold off on";
  const words = quoted(statement);
  switch (level) {
    case "pledge":
      return `You pledged to ${verb} ${propositionName}: ${words}`;
    case "conditional":
      return `You said you would ${verb} ${propositionName} on conditions: ${words}`;
    case "aspiration":
    default:
      return `You said you hoped to ${verb} ${propositionName}: ${words}`;
  }
}

function quoted(statement: string): string {
  const trimmed = statement.trim().replace(/^["\u201C]|["\u201D]$/g, "");
  const closed = /[.?!]$/.test(trimmed) ? trimmed : `${trimmed}.`;
  return `\u201C${closed}\u201D`;
}

function isElectedOrAppointedOffice(kind: string): boolean {
  return (
    kind === "employment:executive-office" ||
    kind === "employment:legislative-member" ||
    kind === "employment:judicial-office-practice"
  );
}
