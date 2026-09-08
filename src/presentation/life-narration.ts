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
 * The time between the moments, said out loud — or nothing at all.
 *
 * The playtest's sharpest complaint was structural rather than cosmetic: two
 * decisions at ten produced "you are eleven" and a card about something else.
 * The years were passing and the game was not saying so, which is what made a
 * life read as a stack of unrelated prompts.
 *
 * This module composes that missing connective tissue, and it composes it from
 * the record. Every sentence it emits is derived from a canonical fact — a
 * date, an enrollment, a household membership, an obligation, a thread that
 * moved — and every sentence carries the records it came from in `sources`, so
 * the claim "this is composition, not invention" is checkable rather than
 * asserted.
 *
 * Two rules follow from that and are worth stating plainly.
 *
 * *A quiet stretch is allowed to be silent.* When nothing on the record moved
 * and no birthday fell inside the gap, the composer says nothing, and the next
 * scene simply arrives. The earlier version filled such gaps with steady-state
 * atmosphere — "Work stayed work", "Most weeks were built around school",
 * "{place} went on the way it does" — and at corpus scale those lines
 * contaminated every life with the same connective filler. Silence carries no
 * false information; the filler carried none of any kind.
 *
 * *Age is not a beat.* A birthday is mentioned only as a clause on the elapsed
 * opener, and never as the whole of what happened. Turning eleven is not an
 * event; it is a fact about the date the events happened on.
 *
 * A third rule governs everything that names a subject: when the record cannot
 * name it — an organization without a recorded profile name, an incident known
 * only by a machine key, a follow-up with no nameable counterpart — the line is
 * suppressed rather than rendered around a placeholder. "You and X have
 * something unfinished" tells a player nothing; the record either supports a
 * real subject or the sentence does not exist.
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

/**
 * How long it was, in the words a person would use.
 *
 * Deliberately vague at the long end: "the better part of two years" is how
 * somebody describes a stretch they were living through, and a precise day
 * count would read as a log line. No season is named — "By the spring" was the
 * corpus's single most copied bridge, and the season added no state.
 */
function elapsedPhrase(days: number): string {
  if (days <= 1) return "The next day";
  if (days <= 10) return "Within the week";
  if (days <= 24) return "A couple of weeks on";
  if (days <= 45) return "A month later";
  if (days <= 100) return "A couple of months on";
  if (days <= 200) return "Half a year on";
  if (days <= 400) return "A year on";
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
 * What happened between the last moment and this one.
 *
 * Ordering is by what a person would actually lead with: how long it was,
 * then what changed. A gap in which nothing moved and no birthday fell says
 * nothing at all — the next scene arrives without a bridge, because a bridge
 * whose whole payload is "time passed" is filler, and the date on the scene
 * already carries the time.
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

  if (opening) {
    // The first thing said about a life introduces it. Where, how old, and
    // the standing facts the record can actually name — no gap measured,
    // because there is nothing yet to measure a gap from.
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
    for (const line of openingFacts(world, person.id)) {
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

  const threads = narrativeThreads(world, personId, until);
  const changed = threads.filter((thread) =>
    thread.anchors.some(
      (anchor) =>
        anchor.role !== "context" && anchor.at > since && anchor.at <= until,
    ),
  );

  // What moved, where the record can name it. A thread whose subject cannot
  // be named produces no sentence — the record still holds it, and the scene
  // surfaces still act on it, but a line built around a placeholder tells the
  // player nothing and is not written.
  const movements: {
    readonly sentence: string;
    readonly anchors: readonly ThreadAnchor[];
    readonly note: string;
  }[] = [];
  for (const thread of changed) {
    if (movements.length >= 2) break;
    const moving = thread.anchors.filter(
      (anchor) =>
        anchor.role !== "context" && anchor.at > since && anchor.at <= until,
    );
    const sentence = threadMovementSentence(world, thread, moving.length);
    if (sentence === null) continue;
    movements.push({
      sentence,
      anchors: moving,
      note: `${moving.length} record(s) on the ${thread.family} thread "${thread.title}" fall inside the interval.`,
    });
  }

  const crossed = toAge > fromAge;

  // The elapsed opener exists to situate what follows. When nothing follows —
  // no nameable movement, no birthday — it would be a sentence whose whole
  // payload is that time passed, and the composer stays silent instead.
  if (days > 0 && (movements.length > 0 || crossed)) {
    const opener = elapsedPhrase(days);
    say(
      crossed ? `${opener}, and you're ${toAge} now.` : `${opener}.`,
      "elapsed",
      [],
      crossed
        ? `${days} day(s) between ${since} and ${until}; a birthday falls inside it.`
        : `${days} day(s) between ${since} and ${until}.`,
    );
  }

  for (const movement of movements) {
    say(movement.sentence, "thread", movement.anchors, movement.note);
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
 * What one moved thread contributes to the bridge, or null.
 *
 * Every sentence states only what the anchors support: that records naming
 * this subject fall inside the interval, and how many. Null where the subject
 * cannot be named from the record — an unnamed organization, an incident, a
 * single unelaborated event at a workplace — because "something happened" is
 * not information.
 */
function threadMovementSentence(
  world: World,
  thread: NarrativeThread,
  moved: number,
): string | null {
  const subject = thread.title;
  switch (thread.family) {
    case "household":
      return moved > 1
        ? `Things came up at home with ${subject} more than once in that time.`
        : `You saw ${subject}.`;
    case "kin":
    case "companionship":
      return moved > 1
        ? `You and ${subject} were in and out of each other's business more than once.`
        : `You saw ${subject}.`;
    case "work":
      if (!namedOrganization(world, thread)) return null;
      return moved > 1 ? `Work at ${subject} came up more than once.` : null;
    case "school":
      if (!namedOrganization(world, thread)) return null;
      return moved > 1 ? `${subject} kept coming up.` : null;
    case "money": {
      const payment = obligationNoun(world, thread);
      if (payment === null) return null;
      return moved > 1
        ? `${capitalize(payment)} came up more than once.`
        : `${capitalize(payment)} came up.`;
    }
    case "care":
      return moved > 1
        ? `Looking after ${subject} came up again and again.`
        : `Looking after ${subject} came up.`;
    case "civic":
    case "political":
      if (!namedOrganization(world, thread)) return null;
      return moved > 1 ? `${subject} came back around more than once.` : null;
    case "promise":
      if (promiseSubject(thread) === null) return null;
      return moved > 1
        ? `What you said you'd do about ${subject} came back around.`
        : `What you said you'd do about ${subject} came up.`;
    case "incident":
      // The incident record names its subject only by machine key; there is
      // no sentence to build that a player could act on.
      return null;
  }
}

interface SteadyLine {
  readonly sentence: string;
  readonly kind: NarrationSourceKind;
  readonly anchors: readonly ThreadAnchor[];
  readonly note: string;
}

/**
 * The standing facts an opening can introduce, read off the record.
 *
 * Only for the life's first told moment. Each line exists only when the
 * record can name its subject: a school or workplace without a recorded
 * profile name contributes nothing rather than a generic line about weeks
 * being built around school.
 */
function openingFacts(world: World, personId: EntityId): readonly SteadyLine[] {
  const person = world.people[personId];
  if (!person) return [];
  const cutoff = currentLifeCutoff(world);
  const lines: SteadyLine[] = [];

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
      sentence: `You live with ${listOf(others)}.`,
      kind: "household",
      anchors: [
        {
          store: "householdMemberships",
          recordId: entry.membership.id,
          stableKey: entry.membership.stableKey,
          at: entry.membership.startedAt,
          sequence: entry.membership.sequence,
          role: "context",
          note: "The household membership that is in force.",
        },
      ],
      note: `${others.length} other resident(s) on the household record.`,
    });
    break;
  }

  const enrollments = activeEducationEnrollmentsAt(world, personId, cutoff);
  for (const entry of enrollments.slice(0, 1)) {
    const name = organizationName(world, entry.enrollment.organizationId);
    if (name === null) continue;
    lines.push({
      sentence: `You're enrolled at ${name}.`,
      kind: "school",
      anchors: [
        {
          store: "educationEnrollments",
          recordId: entry.enrollment.id,
          stableKey: entry.enrollment.stableKey,
          at: entry.enrollment.startedAt,
          sequence: entry.enrollment.sequence,
          role: "context",
          note: "An active enrollment at a named school.",
        },
      ],
      note: "An education enrollment active at the opening.",
    });
  }

  const work = activeWorkRelationshipsAt(world, personId, cutoff);
  for (const entry of work.slice(0, 1)) {
    const organizationId = entry.relationship.organizationId;
    const name =
      organizationId === null ? null : organizationName(world, organizationId);
    if (name === null) continue;
    lines.push({
      sentence: `You work at ${name}.`,
      kind: "work",
      anchors: [
        {
          store: "workRelationships",
          recordId: entry.relationship.id,
          stableKey: entry.relationship.stableKey,
          at: entry.relationship.startedAt,
          sequence: entry.relationship.sequence,
          role: "context",
          note: "An active work relationship at a named organization.",
        },
      ],
      note: "A work relationship active at the opening.",
    });
  }

  const participations = activeOrganizationParticipationsAt(
    world,
    personId,
    cutoff,
  );
  for (const entry of participations.slice(0, 1)) {
    const name = organizationName(world, entry.participation.organizationId);
    if (name === null) continue;
    lines.push({
      sentence: `You belong to ${name}.`,
      kind: "civic",
      anchors: [
        {
          store: "organizationParticipations",
          recordId: entry.participation.id,
          stableKey: entry.participation.stableKey,
          at: entry.participation.startedAt,
          sequence: entry.participation.sequence,
          role: "context",
          note: "An active participation in a named organization.",
        },
      ],
      note: "An organization participation active at the opening.",
    });
  }

  const commitments = activeLifeCommitmentsAt(world, personId, cutoff);
  for (const commitment of commitments.slice(0, 1)) {
    lines.push({
      sentence: `${commitment.label} is part of your week.`,
      kind: "commitment",
      anchors: [
        {
          store: "lifeCommitments",
          recordId: commitment.id,
          stableKey: commitment.stableKey,
          at: commitment.startsAt,
          sequence: commitment.sequence,
          role: "context",
          note: "A commitment in force.",
        },
      ],
      note: "A life commitment active at the opening.",
    });
  }

  return lines;
}

function listOf(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  const head = names.slice(0, -1).join(", ");
  return `${head} and ${names.at(-1)}`;
}

function capitalize(text: string): string {
  return text.length === 0 ? text : text[0]!.toUpperCase() + text.slice(1);
}

/* -------------------------------------------------------------------------- */
/* Subject support                                                             */
/* -------------------------------------------------------------------------- */

/**
 * The organization's recorded profile name, or null.
 *
 * Read from the same store `narrative-threads` titles from, so a thread whose
 * title fell back to "Work" or "Something in the neighbourhood" is detected by
 * the absence of the record rather than by matching the fallback string.
 */
function organizationName(
  world: World,
  organizationId: EntityId,
): string | null {
  const profiles = world.history.organizationProfiles
    .filter((profile) => profile.organizationId === organizationId)
    .sort((left, right) => left.sequence - right.sequence);
  return profiles.at(-1)?.name ?? null;
}

function namedOrganization(world: World, thread: NarrativeThread): boolean {
  return (
    thread.organizationId !== null &&
    organizationName(world, thread.organizationId) !== null
  );
}

/**
 * What a money thread's payment is, in ordinary words, or null.
 *
 * The obligation record's own basis namespace supplies the noun. A `custom:`
 * basis names nothing a player would recognize, so the thread contributes no
 * sentence rather than a line about unspecified money.
 */
function obligationNoun(world: World, thread: NarrativeThread): string | null {
  const origin = thread.anchors.find(
    (anchor) => anchor.store === "resourceObligations",
  );
  if (!origin) return null;
  const obligation = world.history.resourceObligations.find(
    (record) => record.id === origin.recordId,
  );
  if (!obligation) return null;
  const namespace = obligation.basisKind.split(":")[0];
  switch (namespace) {
    case "housing":
      return "the housing payment";
    case "debt":
      return "the loan payment";
    case "support":
      return "the support payment";
    case "care":
      return "the care payment";
    default:
      return null;
  }
}

/**
 * Whether a promise thread's subject can be said to a player.
 *
 * A commitment thread carries the commitment's own label as its title. A
 * scheduled callback carries its counterparts' names — and when it has none,
 * its title is a placeholder and the thread is unspeakable.
 */
function promiseSubject(thread: NarrativeThread): string | null {
  if (thread.linkBasis.kind === "shared-stable-key") return thread.title;
  return thread.withPersonIds.length > 0 ? thread.title : null;
}

/**
 * Whether this thread's actual subject can be named from the record.
 *
 * The gate every recap passes before a sentence is composed. Person threads
 * always can — their titles are canonical names. Organization threads need a
 * recorded profile name; money threads a recognizable basis; promise threads a
 * label or a counterpart; incidents never can.
 */
function nameableSubject(world: World, thread: NarrativeThread): boolean {
  switch (thread.family) {
    case "household":
    case "kin":
    case "companionship":
    case "care":
      return true;
    case "school":
    case "work":
    case "civic":
    case "political":
      return namedOrganization(world, thread);
    case "money":
      return obligationNoun(world, thread) !== null;
    case "promise":
      return promiseSubject(thread) !== null;
    case "incident":
      return false;
  }
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
 * families. One sentence per thing, only for the things the record says are
 * actually unfinished, and only where the record can name what the thing is.
 * A thread whose subject cannot be named — an incident, an organization with
 * no recorded name, a follow-up with no nameable counterpart — is withheld
 * rather than recapped as "something": the generic sentence tells the player
 * nothing and reads as the machine it came from.
 */
export function openThreadRecaps(
  world: World,
  personId: EntityId,
  limit = 3,
  asOfDate: IsoDate = world.currentDate,
): readonly ThreadRecap[] {
  const named = narrativeThreads(world, personId, asOfDate).filter(
    (thread) =>
      thread.anchors.some((anchor) => anchor.role !== "context") &&
      nameableSubject(world, thread),
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
  return chosen.flatMap((thread) => {
    const sentence =
      thread.standing === "dormant"
        ? quietSentence(world, thread)
        : recapSentence(world, thread);
    if (sentence === null) return [];
    return [
      {
        threadKey: thread.key,
        sentence,
        anchors: thread.anchors
          .filter((anchor) => anchor.role !== "context")
          .slice(-2),
        stillMoving: thread.standing !== "dormant",
      },
    ];
  });
}

/**
 * Something that has gone quiet, said the way a person would say it.
 *
 * Never "dormant". The engine's word for this is a fact about an index; what a
 * player needs to know is that they have not heard anything for a long time,
 * which is a different sentence and the only one that belongs on a screen.
 */
function quietSentence(world: World, thread: NarrativeThread): string | null {
  switch (thread.family) {
    case "household":
      return `It has been quiet at home with ${thread.title} for a long time.`;
    case "kin":
      return `You have not heard from ${thread.title} in a long while.`;
    case "companionship":
      return `You and ${thread.title} have not spoken in a long time.`;
    case "school":
      return `${thread.title} stopped coming up a long time ago.`;
    case "work":
      return `Nothing new has come from ${thread.title} in a long time.`;
    case "money": {
      const payment = obligationNoun(world, thread);
      if (payment === null) return null;
      return `Nobody has pressed you about ${payment} in a long time.`;
    }
    case "care":
      return `Looking after ${thread.title} has not needed anything from you in a long while.`;
    case "civic":
      return `You have not been near ${thread.title} in a long time.`;
    case "political":
      return `Nothing has come out of ${thread.title} in a long time.`;
    case "promise":
      return `Nobody has mentioned what you said about ${thread.title} in a long time.`;
    case "incident":
      return null;
  }
}

/**
 * A thread that is still moving, said concretely or not at all.
 *
 * "Pressing" is canonical: it means a scheduled item on this thread has come
 * due and is unanswered, so the sentence may say something has come due.
 * "Running" means recent records name the subject, so the sentence may say it
 * is still open. Neither licenses a motive, a promise, or an event the record
 * does not hold.
 */
function recapSentence(world: World, thread: NarrativeThread): string | null {
  const pressing = thread.standing === "pressing";
  switch (thread.family) {
    case "household":
      return pressing
        ? `What you left open at home with ${thread.title} has come back around.`
        : `Things at home with ${thread.title} are not settled.`;
    case "kin":
      return `Things with ${thread.title} are not settled.`;
    case "companionship":
      return pressing
        ? `${thread.title} is waiting to hear from you.`
        : `You and ${thread.title} still have unfinished business.`;
    case "school":
      return `You're still at ${thread.title}.`;
    case "work":
      return pressing
        ? `${thread.title} is waiting on an answer from you.`
        : `There is still open business at ${thread.title}.`;
    case "money": {
      const payment = obligationNoun(world, thread);
      if (payment === null) return null;
      return pressing
        ? `${capitalize(payment)} is overdue.`
        : `${capitalize(payment)} is still going out.`;
    }
    case "care":
      return `Looking after ${thread.title} is still yours.`;
    case "civic":
      return `${thread.title} still meets, and you are still in it.`;
    case "political":
      return `You're still signed up with ${thread.title}.`;
    case "promise": {
      const subject = promiseSubject(thread);
      if (subject === null) return null;
      return pressing
        ? `What you said you'd do about ${subject} has come due.`
        : `What you said you'd do about ${subject} is still open.`;
    }
    case "incident":
      return null;
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
