/**
 * Prototype content.
 *
 * DEVELOPMENT-ONLY. Every record here is placeholder material authored to give
 * the click-through something coherent to show. None of it is canonical, none of
 * it is exported into any production bank, and nothing in the simulation reads
 * it. `PROTOTYPE_CONTENT_NOTICE` is rendered on screen so the owner is never
 * looking at placeholder copy that claims to be game truth.
 *
 * Two rules shape the shape of this file:
 *
 *   - references between records are explicit ids, never names. Nothing here or
 *     above parses a display name to find a person, so two people could share a
 *     name and stay distinct; and
 *   - no record carries a numeric relationship score, success percentage, or
 *     political-capital value. What the player knows about someone is written as
 *     the qualitative sentence a dossier would actually show.
 *
 * Where the repository already had useful bounded demo labels they are reused
 * rather than reinvented: "Transit Access Pilot", "Constituent intake briefing",
 * "Community transit meeting", "East End Community Room" and "Legislative
 * Office" all come from the existing Run D-Lite demo agenda.
 */

export const PROTOTYPE_CONTENT_NOTICE =
  "Prototype content — placeholder people, meetings and measures for visual review only.";

export type EntityKind =
  "person" | "meeting" | "measure" | "office" | "organization" | "chapter";

export interface EntityRef {
  readonly kind: EntityKind;
  readonly id: string;
}

export function refKey(ref: EntityRef): string {
  return `${ref.kind}:${ref.id}`;
}

export type PersonCategory =
  "family" | "friends" | "work" | "politics" | "organizations";

/**
 * How sure the player-character is of a fact.
 *
 * The dossier styles these differently so that "you know this" and "this is
 * public record" and "you do not know" never read as the same claim. It is the
 * subjective-information rule made visible rather than asserted.
 */
export type Access = "known" | "public" | "inferred" | "unknown";

export interface KnownFact {
  readonly id: string;
  readonly access: Access;
  readonly text: string;
}

export interface PrototypePerson {
  readonly id: string;
  readonly name: string;
  readonly role: string;
  readonly categories: readonly PersonCategory[];
  /** Which prototype room they are physically in, when they are in one. */
  readonly roomId: string | null;
  /** Qualitative, never a score. */
  readonly relationship: string;
  readonly read: string;
  readonly lastInteraction: string;
  readonly unresolved: string;
  readonly facts: readonly KnownFact[];
  /** Explicit links a dossier offers, resolved by id. */
  readonly links: readonly EntityRef[];
  readonly prototypeOnly: true;
}

export type MeetingConfidence =
  "confirmed" | "tentative" | "flexible" | "travel";

export interface PrototypeMeeting {
  readonly id: string;
  readonly title: string;
  /** Day offset from the prototype's fixed "today". Reading never moves it. */
  readonly dayOffset: number;
  readonly startMinute: number;
  readonly endMinute: number;
  readonly locationLabel: string;
  readonly confidence: MeetingConfidence;
  readonly note: string;
  readonly participantIds: readonly string[];
  readonly links: readonly EntityRef[];
  readonly prototypeOnly: true;
}

export interface PrototypeMeasure {
  readonly id: string;
  readonly designation: string;
  readonly title: string;
  readonly stage: string;
  readonly summary: string;
  readonly status: string;
  readonly links: readonly EntityRef[];
  readonly prototypeOnly: true;
}

export interface PrototypeOffice {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly termNote: string;
  readonly summary: string;
  readonly pending: readonly {
    readonly id: string;
    readonly label: string;
    readonly detail: string;
    readonly ref: EntityRef;
  }[];
  readonly links: readonly EntityRef[];
  readonly prototypeOnly: true;
}

export interface PrototypeOrganization {
  readonly id: string;
  readonly name: string;
  readonly kind: string;
  readonly summary: string;
  readonly links: readonly EntityRef[];
  readonly prototypeOnly: true;
}

/**
 * One run of journal text, optionally carrying an explicit reference.
 *
 * A segment with a `ref` renders with the dotted underline the owner asked for
 * and opens the same entity route a scene person opens. A segment without one is
 * plain text. There is no name-matching pass anywhere: the affordance appears
 * only where an authored id already exists, so it can never point at the wrong
 * person.
 */
export interface JournalSegment {
  readonly text: string;
  readonly ref?: EntityRef;
}

export interface JournalEntry {
  readonly id: string;
  readonly when: string;
  readonly segments: readonly JournalSegment[];
}

export interface JournalChapter {
  readonly id: string;
  readonly title: string;
  readonly span: string;
  readonly summary: string;
  readonly entries: readonly JournalEntry[];
  readonly prototypeOnly: true;
}

export interface PrototypeRoom {
  readonly id: string;
  readonly sceneId: string;
  readonly label: string;
  readonly locationLabel: string;
  readonly prototypeOnly: true;
}

/* ------------------------------------------------------------------ rooms */

export const PROTOTYPE_ROOMS: readonly PrototypeRoom[] = [
  {
    id: "legislative-office",
    sceneId: "shared-workroom-office-production",
    label: "Legislative Office",
    locationLabel: "Lexington · Legislative Office",
    prototypeOnly: true,
  },
  {
    id: "home",
    sceneId: "residence-apartment-living-canonical-03",
    label: "Home",
    locationLabel: "Lexington · Home",
    prototypeOnly: true,
  },
  {
    id: "community-room",
    sceneId: "civic-hearing-room-production",
    label: "East End Community Room",
    locationLabel: "Lexington · East End Community Room",
    prototypeOnly: true,
  },
];

export const DEFAULT_ROOM_ID = "legislative-office";

/* ----------------------------------------------------------------- player */

export interface PrototypePlayer {
  readonly name: string;
  readonly age: string;
  readonly biography: string;
  readonly householdIds: readonly string[];
  readonly education: readonly string[];
  readonly work: readonly string[];
  readonly officeId: string;
}

export const PROTOTYPE_PLAYER: PrototypePlayer = {
  name: "Rowan Adeyemi",
  age: "38",
  biography:
    "Grew up in the East End. Worked in transit planning before running for the council seat they now hold.",
  householdIds: ["person-partner", "person-daughter"],
  education: [
    "East End High School",
    "State university — public administration",
  ],
  work: ["Transit planning analyst, six years", "Council member, first term"],
  officeId: "office-council-seat",
};

/* ---------------------------------------------------------------- finances */

/**
 * Three funds that must never read as one pot.
 *
 * Personal money, campaign money and a public budget are legally and morally
 * different things, and a UI that stacks them in one list teaches the player
 * they are interchangeable. They are separated here, labelled, and given
 * different authority lines even in a prototype.
 */
export interface PrototypeFund {
  readonly id: string;
  readonly label: string;
  readonly scope: "personal" | "campaign" | "public";
  readonly amount: string;
  readonly authority: string;
  readonly lines: readonly { readonly label: string; readonly value: string }[];
}

export const PROTOTYPE_FUNDS: readonly PrototypeFund[] = [
  {
    id: "fund-personal",
    label: "Household money",
    scope: "personal",
    amount: "$8,420",
    authority: "Yours. Spend as you like.",
    lines: [
      { label: "Checking", value: "$4,180" },
      { label: "Savings", value: "$4,240" },
      { label: "Monthly obligations", value: "$2,960" },
    ],
  },
  {
    id: "fund-campaign",
    label: "Campaign account",
    scope: "campaign",
    amount: "$16,750",
    authority: "Regulated. Campaign purposes only, and reported.",
    lines: [
      { label: "On hand", value: "$16,750" },
      { label: "Raised this period", value: "$5,300" },
      { label: "Next report due", value: "in 22 days" },
    ],
  },
  {
    id: "fund-public",
    label: "Council office budget",
    scope: "public",
    amount: "$61,000",
    authority: "Public money. Not yours, and not the campaign's.",
    lines: [
      { label: "Allocated this year", value: "$61,000" },
      { label: "Committed", value: "$38,400" },
      { label: "Staff share", value: "$31,000" },
    ],
  },
];

export interface PrototypeProperty {
  readonly id: string;
  readonly label: string;
  readonly detail: string;
}

export const PROTOTYPE_PROPERTY: readonly PrototypeProperty[] = [
  {
    id: "property-apartment",
    label: "Two-bedroom apartment, East End",
    detail: "Rented. Lease renews in the spring.",
  },
  {
    id: "property-car",
    label: "Nine-year-old hatchback",
    detail: "Owned outright.",
  },
];

/* ----------------------------------------------------------------- people */

export const PROTOTYPE_PEOPLE: readonly PrototypePerson[] = [
  {
    id: "person-aide",
    name: "Della Okonkwo",
    role: "Senior legislative aide",
    categories: ["work", "politics"],
    roomId: "legislative-office",
    relationship: "Works closely with you. You trust her judgement.",
    read: "Reading a printout and waiting for you to look up.",
    lastInteraction:
      "This morning — she flagged that the transit draft lost a co-sponsor.",
    unresolved: "You still owe her an answer on the hearing date.",
    facts: [
      {
        id: "fact-aide-tenure",
        access: "known",
        text: "Has run your office since the week you were sworn in.",
      },
      {
        id: "fact-aide-position",
        access: "public",
        text: "Publicly: testified for the transit pilot at the last hearing.",
      },
      {
        id: "fact-aide-home",
        access: "unknown",
        text: "You do not know where she grew up.",
      },
    ],
    links: [
      { kind: "measure", id: "measure-transit-pilot" },
      { kind: "meeting", id: "meeting-intake-briefing" },
    ],
    prototypeOnly: true,
  },
  {
    id: "person-colleague",
    name: "Marcus Hale",
    role: "Council member, third district",
    categories: ["work", "politics"],
    roomId: "legislative-office",
    relationship:
      "Cordial. You have voted together more often than either of you says out loud.",
    read: "Leaning in the doorway rather than sitting down. He wants something.",
    lastInteraction:
      "Last week — he asked you to hold the transit vote for two more sessions.",
    unresolved: "He has not said whether he will co-sponsor.",
    facts: [
      {
        id: "fact-colleague-term",
        access: "public",
        text: "Publicly: serving his third term.",
      },
      {
        id: "fact-colleague-pressure",
        access: "inferred",
        text: "You think his ward association is leaning on him about the pilot.",
      },
      {
        id: "fact-colleague-family",
        access: "unknown",
        text: "You do not know much about his family.",
      },
    ],
    links: [
      { kind: "measure", id: "measure-transit-pilot" },
      { kind: "organization", id: "org-ward-association" },
    ],
    prototypeOnly: true,
  },
  {
    id: "person-partner",
    name: "Sam Adeyemi",
    role: "Your partner · nurse practitioner",
    categories: ["family"],
    roomId: "home",
    relationship: "Married eleven years. The person you actually talk to.",
    read: "Home before you tonight, which is unusual.",
    lastInteraction: "This morning — about the school pickup on Thursday.",
    unresolved: "You have not told them how late the hearing is likely to run.",
    facts: [
      {
        id: "fact-partner-work",
        access: "known",
        text: "Works nights two weeks out of four.",
      },
      {
        id: "fact-partner-view",
        access: "known",
        text: "Thinks you took the council seat for the right reasons and at the wrong time.",
      },
    ],
    links: [{ kind: "person", id: "person-daughter" }],
    prototypeOnly: true,
  },
  {
    id: "person-daughter",
    name: "Nia Adeyemi",
    role: "Your daughter · age nine",
    categories: ["family"],
    roomId: "home",
    relationship: "Yours. She has opinions about the bus.",
    read: "At the table with homework she is not doing.",
    lastInteraction:
      "Yesterday — she asked why the bus stops before her school.",
    unresolved: "You said you would come to the Thursday assembly.",
    facts: [
      {
        id: "fact-daughter-school",
        access: "known",
        text: "Fourth grade at the East End elementary school.",
      },
    ],
    links: [{ kind: "person", id: "person-partner" }],
    prototypeOnly: true,
  },
  {
    id: "person-friend",
    name: "Priya Raman",
    role: "Friend since university",
    categories: ["friends"],
    roomId: null,
    relationship: "Old friend. Not political, and grateful for it.",
    read: "Not here.",
    lastInteraction: "A fortnight ago — dinner, and she asked how you were.",
    unresolved: "You have not called her back.",
    facts: [
      {
        id: "fact-friend-work",
        access: "known",
        text: "Runs the clinic pharmacy on Winslow.",
      },
      {
        id: "fact-friend-politics",
        access: "unknown",
        text: "You have never asked how she votes.",
      },
    ],
    links: [],
    prototypeOnly: true,
  },
  {
    id: "person-organizer",
    name: "Teresa Boyd",
    role: "East End Riders' Alliance",
    categories: ["politics", "organizations"],
    roomId: "community-room",
    relationship:
      "She brought you the pilot idea. She is watching whether you carry it.",
    read: "Setting out chairs, and counting who came.",
    lastInteraction:
      "At the last community meeting — she asked for a date, not a promise.",
    unresolved: "You have still not given her a date.",
    facts: [
      {
        id: "fact-organizer-role",
        access: "public",
        text: "Publicly: founded the riders' alliance four years ago.",
      },
      {
        id: "fact-organizer-reach",
        access: "inferred",
        text: "You think she can fill that room again if she wants to.",
      },
    ],
    links: [
      { kind: "organization", id: "org-riders-alliance" },
      { kind: "measure", id: "measure-transit-pilot" },
    ],
    prototypeOnly: true,
  },
  {
    id: "person-clerk",
    name: "Ellis Warner",
    role: "Council clerk",
    categories: ["work"],
    roomId: "community-room",
    relationship: "Professional. He tells you the rule, not the answer.",
    read: "Here to record the meeting, not to take part in it.",
    lastInteraction: "Two days ago — the referral question.",
    unresolved: "",
    facts: [
      {
        id: "fact-clerk-role",
        access: "public",
        text: "Publicly: clerk of the council for nineteen years.",
      },
    ],
    links: [{ kind: "measure", id: "measure-transit-pilot" }],
    prototypeOnly: true,
  },
];

export const PROTOTYPE_ORGANIZATIONS: readonly PrototypeOrganization[] = [
  {
    id: "org-riders-alliance",
    name: "East End Riders' Alliance",
    kind: "Neighbourhood organization",
    summary:
      "Formed around bus service in the East End. Brought the pilot proposal to your office.",
    links: [{ kind: "person", id: "person-organizer" }],
    prototypeOnly: true,
  },
  {
    id: "org-ward-association",
    name: "Third Ward Association",
    kind: "Neighbourhood organization",
    summary:
      "Active in the third district. You know less about its internal politics than Marcus does.",
    links: [{ kind: "person", id: "person-colleague" }],
    prototypeOnly: true,
  },
];

/* --------------------------------------------------------------- measures */

export const PROTOTYPE_MEASURES: readonly PrototypeMeasure[] = [
  {
    id: "measure-transit-pilot",
    designation: "Ordinance 41",
    title: "Transit Access Pilot",
    stage: "In committee",
    status: "Awaiting a referral verification before it can be scheduled.",
    summary:
      "A two-year pilot extending evening bus service on two East End routes.",
    links: [
      { kind: "person", id: "person-organizer" },
      { kind: "person", id: "person-colleague" },
      { kind: "meeting", id: "meeting-community" },
    ],
    prototypeOnly: true,
  },
  {
    id: "measure-sidewalk",
    designation: "Ordinance 38",
    title: "Sidewalk repair schedule",
    stage: "Passed",
    status: "Adopted last session. Work begins in the spring.",
    summary: "Sets a repair order for pavement in the four oldest wards.",
    links: [],
    prototypeOnly: true,
  },
];

/* --------------------------------------------------------------- meetings */

export const PROTOTYPE_MEETINGS: readonly PrototypeMeeting[] = [
  {
    id: "meeting-intake-briefing",
    title: "Constituent intake briefing",
    dayOffset: 0,
    startMinute: 9 * 60 + 30,
    endMinute: 10 * 60 + 15,
    locationLabel: "Legislative Office",
    confidence: "confirmed",
    note: "Della has the week's intake sorted by ward.",
    participantIds: ["person-aide"],
    links: [{ kind: "person", id: "person-aide" }],
    prototypeOnly: true,
  },
  {
    id: "meeting-transit-followup",
    title: "Transit draft follow-up",
    dayOffset: 0,
    startMinute: 13 * 60,
    endMinute: 13 * 60 + 45,
    locationLabel: "Legislative Office",
    confidence: "flexible",
    note: "Can move if the referral question is answered first.",
    participantIds: ["person-aide", "person-colleague"],
    links: [{ kind: "measure", id: "measure-transit-pilot" }],
    prototypeOnly: true,
  },
  {
    id: "meeting-travel",
    title: "Travel to community meeting",
    dayOffset: 0,
    startMinute: 17 * 60 + 30,
    endMinute: 18 * 60,
    locationLabel: "Legislative Office → East End Community Room",
    confidence: "travel",
    note: "Twenty-five minutes on a good evening.",
    participantIds: [],
    links: [],
    prototypeOnly: true,
  },
  {
    id: "meeting-community",
    title: "Community transit meeting",
    dayOffset: 0,
    startMinute: 18 * 60,
    endMinute: 19 * 60 + 30,
    locationLabel: "East End Community Room",
    confidence: "confirmed",
    note: "Teresa asked for a date. You have not given one.",
    participantIds: ["person-organizer", "person-clerk"],
    links: [
      { kind: "measure", id: "measure-transit-pilot" },
      { kind: "person", id: "person-organizer" },
    ],
    prototypeOnly: true,
  },
  {
    id: "meeting-return-call",
    title: "Tentative constituent return call",
    dayOffset: 1,
    startMinute: 11 * 60,
    endMinute: 11 * 60 + 20,
    locationLabel: "Private call",
    confidence: "tentative",
    note: "Not yet confirmed with the caller.",
    participantIds: [],
    links: [],
    prototypeOnly: true,
  },
  {
    id: "meeting-assembly",
    title: "Nia's school assembly",
    dayOffset: 2,
    startMinute: 14 * 60,
    endMinute: 15 * 60,
    locationLabel: "East End elementary school",
    confidence: "confirmed",
    note: "You said you would be there.",
    participantIds: ["person-daughter"],
    links: [{ kind: "person", id: "person-daughter" }],
    prototypeOnly: true,
  },
];

/* ---------------------------------------------------------------- offices */

export const PROTOTYPE_OFFICES: readonly PrototypeOffice[] = [
  {
    id: "office-council-seat",
    title: "Council member, first district",
    body: "Lexington City Council",
    termNote: "First term · sworn in fourteen months ago",
    summary:
      "An ordinary part-time civic office with a small staff, a ward casework load, and one measure of your own in committee.",
    pending: [
      {
        id: "pending-referral",
        label: "Third referral verification",
        detail: "The clerk needs an answer before the pilot can be scheduled.",
        ref: { kind: "measure", id: "measure-transit-pilot" },
      },
      {
        id: "pending-brief",
        label: "Prepare community meeting brief",
        detail: "For tonight, at the East End Community Room.",
        ref: { kind: "meeting", id: "meeting-community" },
      },
    ],
    links: [
      { kind: "measure", id: "measure-transit-pilot" },
      { kind: "measure", id: "measure-sidewalk" },
      { kind: "person", id: "person-aide" },
    ],
    prototypeOnly: true,
  },
];

/* ---------------------------------------------------------------- journal */

export const PROTOTYPE_CHAPTERS: readonly JournalChapter[] = [
  {
    id: "chapter-east-end",
    title: "The East End",
    span: "Childhood",
    summary:
      "Where you are from, and the bus route you are still arguing about.",
    entries: [
      {
        id: "entry-school",
        when: "Age nine",
        segments: [
          { text: "You walked to the same elementary school " },
          { text: "Nia", ref: { kind: "person", id: "person-daughter" } },
          { text: " goes to now. The bus stopped short of it then, too." },
        ],
      },
    ],
    prototypeOnly: true,
  },
  {
    id: "chapter-planning",
    title: "Transit planning",
    span: "Six years",
    summary:
      "The job before the office, and the reason people bring you routes.",
    entries: [
      {
        id: "entry-analyst",
        when: "Age 26",
        segments: [
          { text: "Six years as a planning analyst. You met " },
          { text: "Priya Raman", ref: { kind: "person", id: "person-friend" } },
          {
            text: " at university before that, and she is still the person you call when none of this is interesting.",
          },
        ],
      },
    ],
    prototypeOnly: true,
  },
  {
    id: "chapter-council",
    title: "First term",
    span: "Fourteen months",
    summary: "The seat, the staff, and one measure you have not moved yet.",
    entries: [
      {
        id: "entry-sworn",
        when: "Fourteen months ago",
        segments: [
          { text: "Sworn in. " },
          { text: "Della Okonkwo", ref: { kind: "person", id: "person-aide" } },
          { text: " has run the office since that week." },
        ],
      },
      {
        id: "entry-pilot",
        when: "Four months ago",
        segments: [
          {
            text: "Teresa Boyd",
            ref: { kind: "person", id: "person-organizer" },
          },
          {
            text: " brought you the evening-service proposal that became the ",
          },
          {
            text: "Transit Access Pilot",
            ref: { kind: "measure", id: "measure-transit-pilot" },
          },
          { text: ". It has been in committee since." },
        ],
      },
    ],
    prototypeOnly: true,
  },
];

/** Matters the journal reports as still open. */
export const PROTOTYPE_OPEN_THREADS: readonly {
  readonly id: string;
  readonly label: string;
  readonly ref: EntityRef;
}[] = [
  {
    id: "thread-date",
    label: "You have not given Teresa a date.",
    ref: { kind: "person", id: "person-organizer" },
  },
  {
    id: "thread-cosponsor",
    label: "Marcus has not said whether he will co-sponsor.",
    ref: { kind: "person", id: "person-colleague" },
  },
  {
    id: "thread-assembly",
    label: "You said you would be at the Thursday assembly.",
    ref: { kind: "meeting", id: "meeting-assembly" },
  },
];

/* --------------------------------------------------------------- lookups */

export function findPerson(id: string): PrototypePerson | null {
  return PROTOTYPE_PEOPLE.find((person) => person.id === id) ?? null;
}

export function findMeeting(id: string): PrototypeMeeting | null {
  return PROTOTYPE_MEETINGS.find((meeting) => meeting.id === id) ?? null;
}

export function findMeasure(id: string): PrototypeMeasure | null {
  return PROTOTYPE_MEASURES.find((measure) => measure.id === id) ?? null;
}

export function findOffice(id: string): PrototypeOffice | null {
  return PROTOTYPE_OFFICES.find((office) => office.id === id) ?? null;
}

export function findOrganization(id: string): PrototypeOrganization | null {
  return (
    PROTOTYPE_ORGANIZATIONS.find((organization) => organization.id === id) ??
    null
  );
}

export function findChapter(id: string): JournalChapter | null {
  return PROTOTYPE_CHAPTERS.find((chapter) => chapter.id === id) ?? null;
}

export function findRoom(id: string): PrototypeRoom | null {
  return PROTOTYPE_ROOMS.find((room) => room.id === id) ?? null;
}

/** People physically in a room. Pinning someone never puts them here. */
export function peopleInRoom(roomId: string): readonly PrototypePerson[] {
  return PROTOTYPE_PEOPLE.filter((person) => person.roomId === roomId);
}

/**
 * The display label for any reference.
 *
 * Returns null for a reference that resolves to nothing, so a caller shows an
 * unavailable state rather than falling through to the first similar record.
 */
export function labelForRef(ref: EntityRef): string | null {
  switch (ref.kind) {
    case "person":
      return findPerson(ref.id)?.name ?? null;
    case "meeting":
      return findMeeting(ref.id)?.title ?? null;
    case "measure": {
      const measure = findMeasure(ref.id);
      return measure ? `${measure.designation} — ${measure.title}` : null;
    }
    case "office":
      return findOffice(ref.id)?.title ?? null;
    case "organization":
      return findOrganization(ref.id)?.name ?? null;
    case "chapter":
      return findChapter(ref.id)?.title ?? null;
  }
}

export function kindLabel(kind: EntityKind): string {
  switch (kind) {
    case "person":
      return "Person";
    case "meeting":
      return "Commitment";
    case "measure":
      return "Measure";
    case "office":
      return "Office";
    case "organization":
      return "Organization";
    case "chapter":
      return "Life history";
  }
}

/** The prototype's fixed clock. Reading a screen never moves it. */
export const PROTOTYPE_NOW = {
  minuteOfDay: 11 * 60 + 20,
  dayLabel: "Tuesday",
  dateLabel: "14 October",
  fullDateLabel: "Tuesday 14 October",
} as const;

export function formatMinute(minuteOfDay: number): string {
  const hour24 = Math.floor(minuteOfDay / 60);
  const minute = minuteOfDay % 60;
  const suffix = hour24 >= 12 ? "PM" : "AM";
  return `${hour24 % 12 || 12}:${minute.toString().padStart(2, "0")} ${suffix}`;
}

export function dayLabelFor(dayOffset: number): string {
  const days = ["Tuesday", "Wednesday", "Thursday", "Friday"];
  return days[dayOffset] ?? `Day +${dayOffset}`;
}
