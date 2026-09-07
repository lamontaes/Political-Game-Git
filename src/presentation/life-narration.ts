import {
  ageOnDate,
  activeEducationEnrollmentsAt,
  activeLifeCommitmentsAt,
  activeOrganizationParticipationsAt,
  activeWorkRelationshipsAt,
  currentLifeCutoff,
  daysBetween,
  householdMembershipsAt,
  lifePlaceByJurisdictionId,
  narrativeThreads,
  peopleInHouseholdAt,
  personName,
  type EntityId,
  type IsoDate,
  type NarrativeThread,
  type ThreadAnchor,
  type World,
} from "../simulation";

/**
 * The time between the moments, said out loud.
 *
 * The playtest's sharpest complaint was structural rather than cosmetic: two
 * decisions at ten produced "you are eleven" and a card about something else.
 * The years were passing and the game was not saying so, which is what made a
 * life read as a stack of unrelated prompts.
 *
 * This module composes that missing connective tissue, and it composes it from
 * the record. Every sentence it emits is derived from a canonical fact — a
 * date, an enrollment, a household membership, an obligation, a thread that
 * did or did not move — and every sentence carries the records it came from in
 * `sources`, so the claim "this is composition, not invention" is checkable
 * rather than asserted.
 *
 * Two rules follow from that and are worth stating plainly.
 *
 * *A quiet stretch is not an empty one.* There is no branch here that says
 * nothing happened. A person who spent two years going to the same school and
 * living with the same people did those things, and the record contains them,
 * so that is what gets said. The banned sentences — "nothing this year that
 * anyone would tell a story about", "let the year go by, some of them do" —
 * are not merely avoided by convention: the composer has no path that produces
 * a contentless line, because it always has the household, the place and the
 * age to speak from.
 *
 * *Age is not a beat.* A birthday is mentioned only alongside something else,
 * and never as the whole of what happened. Turning eleven is not an event; it
 * is a fact about the date the events happened on.
 */

/* -------------------------------------------------------------------------- */
/* Shapes                                                                      */
/* -------------------------------------------------------------------------- */

export type NarrationSourceKind =
  | "elapsed"
  | "household"
  | "school"
  | "work"
  | "civic"
  | "commitment"
  | "thread"
  | "place";

export interface NarrationSource {
  /** Which sentence this justifies, by index into `sentences`. */
  readonly sentenceIndex: number;
  readonly kind: NarrationSourceKind;
  /** The canonical records behind it. Empty only for pure date arithmetic. */
  readonly anchors: readonly ThreadAnchor[];
  readonly note: string;
}

export interface ConnectiveNarration {
  readonly sentences: readonly string[];
  readonly sources: readonly NarrationSource[];
  readonly from: IsoDate;
  readonly to: IsoDate;
  readonly days: number;
  readonly fromAge: number;
  readonly toAge: number;
  /**
   * True when this is the first thing the player has been told about this
   * life, so the narration introduces rather than bridges. Without it the
   * first moment of a summarized life measures the gap from a birth date and
   * announces "eighteen years later", which is arithmetic rather than a story.
   */
  readonly opening: boolean;
}

/* -------------------------------------------------------------------------- */
/* Elapsed time                                                                */
/* -------------------------------------------------------------------------- */

const SEASONS: readonly string[] = [
  "winter",
  "winter",
  "spring",
  "spring",
  "spring",
  "summer",
  "summer",
  "summer",
  "autumn",
  "autumn",
  "autumn",
  "winter",
];

function seasonOf(date: IsoDate): string {
  const month = Number(date.slice(5, 7));
  return SEASONS[month - 1] ?? "winter";
}

/**
 * How long it was, in the words a person would use.
 *
 * Deliberately vague at the long end: "the better part of two years" is how
 * somebody describes a stretch they were living through, and a precise day
 * count would read as a log line.
 */
function elapsedPhrase(days: number, from: IsoDate, to: IsoDate): string {
  if (days <= 1) return "The next day";
  if (days <= 10) return "Within the week";
  if (days <= 24) return "A couple of weeks on";
  if (days <= 45) return "A month later";
  if (days <= 100) {
    const season = seasonOf(to);
    return `By the ${season}`;
  }
  if (days <= 200) return "Half a year on";
  if (days <= 400) {
    return `A year on, and into another ${seasonOf(to)}`;
  }
  if (days <= 800) return "The better part of two years later";
  const years = Math.round(days / 365);
  return `${years} years later`;
}

/* -------------------------------------------------------------------------- */
/* Composition                                                                 */
/* -------------------------------------------------------------------------- */

export interface ComposeNarrationInput {
  readonly world: World;
  readonly personId: EntityId;
  /** The moment the player last saw. Defaults to the world's current date. */
  readonly since: IsoDate;
  /** The moment being narrated up to. Defaults to the world's current date. */
  readonly until?: IsoDate;
  /** How many sentences at most. Three reads as a paragraph; more reads as a log. */
  readonly maximumSentences?: number;
  /**
   * Whether this is the life's first told moment. When true the composer
   * introduces the life instead of measuring a gap.
   */
  readonly opening?: boolean;
}

/**
 * Below this, a gap is short enough that saying what stayed the same reads as
 * padding. "A couple of weeks on" is the whole of what happened, and the
 * composer stops there rather than reciting the household again.
 */
const STEADY_STATE_MINIMUM_DAYS = 25;

/**
 * What happened between the last moment and this one.
 *
 * Ordering is by what a person would actually lead with: how long it was,
 * then what changed, then what stayed the same, then who was around. Nothing
 * is padded — a short interval with one change gets two sentences, and that is
 * the honest length for it.
 */
export function composeConnectiveNarration(
  input: ComposeNarrationInput,
): ConnectiveNarration {
  const { world, personId } = input;
  const until = input.until ?? world.currentDate;
  const since = input.since > until ? until : input.since;
  const maximum = input.maximumSentences ?? 3;
  const person = world.people[personId];
  if (!person) {
    return {
      sentences: [],
      sources: [],
      from: since,
      to: until,
      days: 0,
      fromAge: 0,
      toAge: 0,
      opening: false,
    };
  }

  const opening = input.opening ?? false;
  const days = Math.max(0, daysBetween(since, until));
  const fromAge = ageOnDate(person.birthDate, since);
  const toAge = ageOnDate(person.birthDate, until);
  const sentences: string[] = [];
  const sources: NarrationSource[] = [];

  function say(
    sentence: string,
    kind: NarrationSourceKind,
    anchors: readonly ThreadAnchor[],
    note: string,
  ): void {
    if (sentences.length >= maximum) return;
    sources.push({ sentenceIndex: sentences.length, kind, anchors, note });
    sentences.push(sentence);
  }

  const threads = narrativeThreads(world, personId, until);
  const changed = threads.filter((thread) =>
    thread.anchors.some(
      (anchor) =>
        anchor.role !== "context" && anchor.at > since && anchor.at <= until,
    ),
  );

  const steady = steadyState(world, person.id);

  if (opening) {
    // The first thing said about a life introduces it. Where, how old, and
    // what the ordinary week is made of — all read off the record, and no gap
    // measured, because there is nothing yet to measure a gap from.
    const place = lifePlaceByJurisdictionId(person.homeJurisdictionId);
    say(
      place
        ? `You're ${toAge}, and you live in ${place.displayName}.`
        : `You're ${toAge}.`,
      "place",
      [],
      place
        ? `Home jurisdiction resolves to ${place.displayName}; age on ${until}.`
        : `Age on ${until}; no place is recorded.`,
    );
    for (const line of steady) {
      if (line.kind === "place") continue;
      say(line.sentence, line.kind, line.anchors, line.note);
      if (sentences.length >= maximum) break;
    }
    return {
      sentences,
      sources,
      from: since,
      to: until,
      days,
      fromAge,
      toAge,
      opening: true,
    };
  }

  // 1. How long it was, and — only when a birthday actually fell inside it —
  //    how old that made them. The age is a clause, never a sentence.
  if (days > 0) {
    const crossed = toAge > fromAge;
    const opener = elapsedPhrase(days, since, until);
    say(
      crossed ? `${opener}, and you're ${toAge} now.` : `${opener}.`,
      "elapsed",
      [],
      crossed
        ? `${days} day(s) between ${since} and ${until}; a birthday falls inside it.`
        : `${days} day(s) between ${since} and ${until}.`,
    );
  }

  // 2. What moved, if anything did. Threads name the records themselves.
  for (const thread of changed.slice(0, 2)) {
    const moving = thread.anchors.filter(
      (anchor) =>
        anchor.role !== "context" && anchor.at > since && anchor.at <= until,
    );
    say(
      threadMovementSentence(thread, moving.length),
      "thread",
      moving,
      `${moving.length} record(s) on the ${thread.family} thread "${thread.title}" fall inside the interval.`,
    );
  }

  // 3. What stayed the same, when nothing moved and the gap was long enough to
  //    be worth describing. This is the branch that makes a quiet stretch
  //    legible: standing facts read out as the shape of the life, rather than
  //    a line saying nothing happened.
  //
  //    One line, not all of them. Reciting the household, the school and the
  //    meetings at every beat is how the connective tissue turns back into a
  //    wall of the same text, which is the defect this whole module answers.
  //    Which line is chosen rotates on the interval's own dates, so it is
  //    stable under replay and different between gaps.
  if (changed.length === 0 && days >= STEADY_STATE_MINIMUM_DAYS) {
    const line = steady[rotationIndex(since, until, steady.length)];
    if (line) say(line.sentence, line.kind, line.anchors, line.note);
  }

  return {
    sentences,
    sources,
    from: since,
    to: until,
    days,
    fromAge,
    toAge,
    opening: false,
  };
}

/**
 * Which of the steady lines this gap gets.
 *
 * Derived from the dates rather than from a counter, so the same save replays
 * to the same paragraph and two different gaps in one life do not read
 * identically. It is presentation rotation and nothing else — no record is
 * selected by it and nothing downstream sees it.
 */
function rotationIndex(from: IsoDate, to: IsoDate, length: number): number {
  if (length <= 0) return 0;
  let total = 0;
  for (const character of `${from}${to}`) {
    total = (total * 31 + character.charCodeAt(0)) % 100_000;
  }
  return total % length;
}

function threadMovementSentence(
  thread: NarrativeThread,
  moved: number,
): string {
  const subject = thread.title;
  switch (thread.family) {
    case "household":
      return moved > 1
        ? `Things with ${subject} came up more than once in that time.`
        : `There was one evening with ${subject} that stayed with you.`;
    case "kin":
    case "companionship":
      return moved > 1
        ? `You and ${subject} were in and out of each other's business more than once.`
        : `You saw ${subject}.`;
    case "work":
      return moved > 1
        ? `Work at ${subject} went through a few things.`
        : `Something at ${subject} happened worth remembering.`;
    case "school":
      return `${subject} took up most of it.`;
    case "money":
      return "The money side of it moved, and not by itself.";
    case "care":
      return `Looking after ${subject} took up more of it than you had planned for.`;
    case "civic":
      return `${subject} kept meeting, and you kept going.`;
    case "political":
      return `${subject} took up evenings you had not expected to give it.`;
    case "promise":
      return `What you said you would do about ${subject} came back around.`;
    case "incident":
      return "The aftermath of it ran on longer than the thing itself did.";
  }
}

interface SteadyLine {
  readonly sentence: string;
  readonly kind: NarrationSourceKind;
  readonly anchors: readonly ThreadAnchor[];
  readonly note: string;
}

/**
 * The shape of an ordinary stretch, read off the standing records.
 *
 * This is what stands in for "nothing happened". It cannot come back empty for
 * a person who exists: everybody has a place, and the place alone gives a
 * sentence. Everything more specific than that comes from a record.
 */
function steadyState(world: World, personId: EntityId): readonly SteadyLine[] {
  const person = world.people[personId];
  if (!person) return [];
  const cutoff = currentLifeCutoff(world);
  const lines: SteadyLine[] = [];

  const enrollments = activeEducationEnrollmentsAt(world, personId, cutoff);
  for (const entry of enrollments.slice(0, 1)) {
    lines.push({
      sentence: "Most weeks were built around school.",
      kind: "school",
      anchors: [
        {
          store: "educationEnrollments",
          recordId: entry.enrollment.id,
          stableKey: entry.enrollment.stableKey,
          at: entry.enrollment.startedAt,
          sequence: entry.enrollment.sequence,
          role: "context",
          note: "An enrollment that was active throughout.",
        },
      ],
      note: "An education enrollment active across the interval.",
    });
  }

  const work = activeWorkRelationshipsAt(world, personId, cutoff);
  for (const entry of work.slice(0, 1)) {
    lines.push({
      sentence:
        "Work stayed work — the same shifts, the same people, the same drive there.",
      kind: "work",
      anchors: [
        {
          store: "workRelationships",
          recordId: entry.relationship.id,
          stableKey: entry.relationship.stableKey,
          at: entry.relationship.startedAt,
          sequence: entry.relationship.sequence,
          role: "context",
          note: "A work relationship that was active throughout.",
        },
      ],
      note: "A work relationship active across the interval.",
    });
  }

  for (const entry of householdMembershipsAt(world, personId, cutoff)) {
    const others = peopleInHouseholdAt(
      world,
      entry.membership.householdId,
      cutoff,
    )
      .filter((id) => id !== personId)
      .flatMap((id) => {
        const other = world.people[id];
        return other ? [personName(other)] : [];
      });
    if (others.length === 0) continue;
    lines.push({
      sentence:
        others.length === 1
          ? `You spent most evenings at home with ${others[0]}, and most of them were quiet.`
          : `You spent most evenings at home with ${listOf(others)}, and most of them were quiet.`,
      kind: "household",
      anchors: [
        {
          store: "householdMemberships",
          recordId: entry.membership.id,
          stableKey: entry.membership.stableKey,
          at: entry.membership.startedAt,
          sequence: entry.membership.sequence,
          role: "context",
          note: "The household membership that was in force throughout.",
        },
      ],
      note: `${others.length} other resident(s) on the household record.`,
    });
    break;
  }

  const participations = activeOrganizationParticipationsAt(
    world,
    personId,
    cutoff,
  );
  for (const entry of participations.slice(0, 1)) {
    lines.push({
      sentence: "The meetings kept on, about once a month, and mostly dull.",
      kind: "civic",
      anchors: [
        {
          store: "organizationParticipations",
          recordId: entry.participation.id,
          stableKey: entry.participation.stableKey,
          at: entry.participation.startedAt,
          sequence: entry.participation.sequence,
          role: "context",
          note: "A participation that was active throughout.",
        },
      ],
      note: "An organization participation active across the interval.",
    });
  }

  const commitments = activeLifeCommitmentsAt(world, personId, cutoff);
  for (const commitment of commitments.slice(0, 1)) {
    lines.push({
      sentence: `${commitment.label} went on taking its hours out of the week.`,
      kind: "commitment",
      anchors: [
        {
          store: "lifeCommitments",
          recordId: commitment.id,
          stableKey: commitment.stableKey,
          at: commitment.startsAt,
          sequence: commitment.sequence,
          role: "context",
          note: "A commitment in force throughout.",
        },
      ],
      note: "A life commitment active across the interval.",
    });
  }

  // The floor. A person has a place, so there is always something truthful to
  // say about a quiet stretch, and no path here returns nothing.
  const place = lifePlaceByJurisdictionId(person.homeJurisdictionId);
  lines.push({
    sentence: place
      ? `${place.displayName} went on the way it does, and so did you.`
      : `Life went on at the same pace it had been going.`,
    kind: "place",
    anchors: [],
    note: place
      ? `The person's home jurisdiction resolves to ${place.displayName}.`
      : "No place is recorded, so the line says only that time passed.",
  });

  return lines;
}

function listOf(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  const head = names.slice(0, -1).join(", ");
  return `${head} and ${names.at(-1)}`;
}

/* -------------------------------------------------------------------------- */
/* Threads, said to a player                                                   */
/* -------------------------------------------------------------------------- */

export interface ThreadRecap {
  readonly threadKey: string;
  readonly sentence: string;
  readonly anchors: readonly ThreadAnchor[];
  /**
   * Whether this is something still moving or something that has gone quiet.
   *
   * A player can tell the two apart from the sentence itself; this is here so a
   * surface can order or group them without reading the engine's own standing
   * vocabulary, which must never reach a screen.
   */
  readonly stillMoving: boolean;
}

/**
 * What is currently open in this life, in the player's own terms.
 *
 * Never a list of thread machinery: no standing labels, no counts, no
 * families. One sentence per thing, and only for the things the record says
 * are actually unfinished.
 */
export function openThreadRecaps(
  world: World,
  personId: EntityId,
  limit = 3,
  asOfDate: IsoDate = world.currentDate,
): readonly ThreadRecap[] {
  const named = narrativeThreads(world, personId, asOfDate).filter((thread) =>
    thread.anchors.some((anchor) => anchor.role !== "context"),
  );
  const moving = named.filter(
    (thread) => thread.standing === "pressing" || thread.standing === "running",
  );
  // Threads that have gone quiet are part of what a life is carrying, and
  // leaving them out entirely meant a player could never tell the difference
  // between something settled and something nobody has mentioned in two years.
  // They come after the moving ones and never crowd them out.
  const quiet = named.filter((thread) => thread.standing === "dormant");

  const chosen = [
    ...moving.slice(0, limit),
    ...quiet.slice(0, Math.max(0, Math.min(2, limit - moving.length))),
  ];
  return chosen.map((thread) => ({
    threadKey: thread.key,
    sentence:
      thread.standing === "dormant"
        ? quietSentence(thread)
        : recapSentence(thread),
    anchors: thread.anchors
      .filter((anchor) => anchor.role !== "context")
      .slice(-2),
    stillMoving: thread.standing !== "dormant",
  }));
}

/**
 * Something that has gone quiet, said the way a person would say it.
 *
 * Never "dormant". The engine's word for this is a fact about an index; what a
 * player needs to know is that they have not heard anything for a long time,
 * which is a different sentence and the only one that belongs on a screen.
 */
function quietSentence(thread: NarrativeThread): string {
  switch (thread.family) {
    case "household":
      return `Whatever was going on at home with ${thread.title} has been quiet for a long time.`;
    case "kin":
      return `You have not heard anything from ${thread.title} in a long while.`;
    case "companionship":
      return `You and ${thread.title} have not spoken in a long time.`;
    case "school":
      return `${thread.title} stopped coming up a long time ago.`;
    case "work":
      return `Nothing has come from ${thread.title} for a long time.`;
    case "money":
      return "Nobody has said anything about what you owe for a long time.";
    case "care":
      return `Looking after ${thread.title} has not needed anything from you in a long while.`;
    case "civic":
      return `You have not been near ${thread.title} in a long time.`;
    case "political":
      return `Nothing has come of the business at ${thread.title} for a long time.`;
    case "promise":
      return `Nobody has mentioned what you said about ${thread.title} in a long time.`;
    case "incident":
      return "What happened has not come up again in a long time.";
  }
}

function recapSentence(thread: NarrativeThread): string {
  const pressing = thread.standing === "pressing";
  switch (thread.family) {
    case "household":
      return pressing
        ? `Something at home with ${thread.title} is waiting on you.`
        : `You and ${thread.title} have something unfinished.`;
    case "kin":
      return `Things with ${thread.title} are not settled.`;
    case "companionship":
      return pressing
        ? `${thread.title} is waiting to hear from you.`
        : `You and ${thread.title} are still in the middle of something.`;
    case "school":
      return `${thread.title} is still going.`;
    case "work":
      return pressing
        ? `Something at ${thread.title} needs an answer.`
        : `${thread.title} has something running.`;
    case "money":
      return pressing
        ? "Something you owe has come due."
        : "There is money going out that you are keeping an eye on.";
    case "care":
      return `Looking after ${thread.title} is still yours.`;
    case "civic":
      return `${thread.title} still meets, and you are still in it.`;
    case "political":
      return `Your name is attached to something at ${thread.title}.`;
    case "promise":
      return pressing
        ? `What you said about ${thread.title} has come round.`
        : `You said you would do something about ${thread.title}.`;
    case "incident":
      return "What happened has not finished happening.";
  }
}

/* -------------------------------------------------------------------------- */
/* Recurring people                                                            */
/* -------------------------------------------------------------------------- */

export interface RecurringPerson {
  readonly personId: EntityId;
  readonly name: string;
  /** How many records name the two of them, excluding standing facts. */
  readonly appearances: number;
  readonly lastSeenAt: IsoDate;
  readonly anchors: readonly ThreadAnchor[];
}

/**
 * The people this life keeps coming back to.
 *
 * Ordered by how much of the record they are in, then by how recently, so the
 * narrator prefers somebody the player has actually met to somebody the world
 * merely contains.
 */
export function recurringPeople(
  world: World,
  personId: EntityId,
  asOfDate: IsoDate = world.currentDate,
): readonly RecurringPerson[] {
  const byPerson = new Map<EntityId, ThreadAnchor[]>();
  for (const thread of narrativeThreads(world, personId, asOfDate)) {
    const moving = thread.anchors.filter((anchor) => anchor.role !== "context");
    if (moving.length === 0) continue;
    for (const otherId of thread.withPersonIds) {
      const existing = byPerson.get(otherId);
      if (existing) existing.push(...moving);
      else byPerson.set(otherId, [...moving]);
    }
  }
  return [...byPerson.entries()]
    .flatMap(([otherId, anchors]) => {
      const other = world.people[otherId];
      if (!other) return [];
      const sorted = [...anchors].sort((left, right) =>
        left.at.localeCompare(right.at),
      );
      return [
        {
          personId: otherId,
          name: personName(other),
          appearances: sorted.length,
          lastSeenAt: sorted.at(-1)?.at ?? asOfDate,
          anchors: sorted.slice(-3),
        },
      ];
    })
    .sort((left, right) => {
      if (right.appearances !== left.appearances) {
        return right.appearances - left.appearances;
      }
      const byDate = right.lastSeenAt.localeCompare(left.lastSeenAt);
      if (byDate !== 0) return byDate;
      return left.personId.localeCompare(right.personId);
    });
}
