import staging from "../../art/backdrops/staging.json" with { type: "json" };
import surfaceData from "../../art/backdrops/surfaces.json" with { type: "json" };
import { electionContestStatus } from "../simulation/election-contests";
import { homeLocalGovernmentUnits } from "../simulation/nationwide-world/local-governments";
import { stateOfJurisdiction } from "../simulation/press/outlets";
import { personName } from "../simulation/people";
import type {
  ElectionContestRecord,
  EntityId,
  LegislativeMeasureRecord,
  LegislativeVoteRecord,
  World,
} from "../simulation/types";
import { addDays } from "../simulation";
import type { PlaceBackdrop } from "./place-backdrops";
import {
  calendarEntryHorizon,
  formatMinute,
  projectPlayerCalendar,
} from "./player-calendar";
import { proseDate, proseWeekdayDate } from "./prose-dates";
import { projectPublicServiceConditions } from "./public-service-conditions";
import type { RoomBroadcast, RoomFrontPage, RoomMedia } from "./room-media";

/**
 * THE PAINTED SURFACES IN A PLACE PICTURE, AND WHAT IS ON THEM TODAY.
 *
 * The place pictures (place-backdrops.ts) are painted with screens, boards,
 * posters and papers that say nothing. `art/backdrops/surfaces.json` marks
 * each one that faces the viewer and is large enough to read: its kind, the
 * four corners of its face in the picture's own pixels, and what it is for.
 * The corners were measured on every light and weather version of the
 * picture; a surface that sits differently in one version carries that
 * version's own corners, and one that is not there says so.
 *
 * What a surface shows comes only from the world's records, read here and
 * nowhere else:
 *
 *   votes      the latest recorded votes in the place's legislature
 *   news       the room's own station or paper (room-media.ts)
 *   candidates the people standing in the player's races
 *   results    the count in a race the player could vote in, just decided
 *   plans      the player's own appointments this week
 *   bills      the latest bills filed in the place's legislature
 *   programs   how the place's public services are doing
 *
 * A slot lists what it is for in order, and the first that has something
 * wins. When none has anything, the surface is left out and the picture
 * shows what it was painted with. There is no empty frame, no placeholder
 * and no invented bill, name or tally.
 */

export type BackdropSurfaceKind =
  "screen" | "poster" | "note" | "paper" | "brochure" | "board";

/**
 * What the painted face is: a board of cork takes pinned cards with the cork
 * showing between them, a whiteboard takes marker writing, and a blank panel,
 * sign or screen takes content across its whole face.
 */
export type BackdropSurfaceFinish = "cork" | "whiteboard" | "panel";

export type BackdropSurfaceShows =
  "votes" | "news" | "candidates" | "results" | "plans" | "bills" | "programs";

type Point = readonly [number, number];
export type SurfaceQuad = readonly [Point, Point, Point, Point];

export interface BackdropSurfaceSlot {
  readonly id: string;
  readonly kind: BackdropSurfaceKind;
  readonly finish: BackdropSurfaceFinish;
  readonly what: string;
  /** Top-left, top-right, bottom-right, bottom-left, in picture pixels. */
  readonly quad: SurfaceQuad;
  readonly perspective: boolean;
  readonly shows: readonly BackdropSurfaceShows[];
}

interface SurfaceRecord {
  readonly id: string;
  readonly kind: BackdropSurfaceKind;
  readonly finish: BackdropSurfaceFinish;
  readonly what: string;
  readonly quad: SurfaceQuad;
  readonly perspective: boolean;
  readonly shows: readonly BackdropSurfaceShows[];
  readonly variants?: Readonly<Record<string, SurfaceQuad>>;
  readonly absentIn?: readonly string[];
}

interface PlaceSurfaces {
  readonly checked: readonly string[];
  readonly surfaces: readonly SurfaceRecord[];
  readonly skipped: readonly string[];
}

export const PLACE_SURFACES = surfaceData.places as unknown as Readonly<
  Record<string, PlaceSurfaces>
>;

/** Every surface of `place` as it sits in this version of the picture. */
export function backdropSurfaceSlots(
  place: string,
  variant: string,
): readonly BackdropSurfaceSlot[] {
  const record = PLACE_SURFACES[place];
  if (!record || !record.checked.includes(`${place}__${variant}.jpg`))
    return [];
  const staged = (
    staging.places as Readonly<
      Record<
        string,
        { readonly surfaceSlots: readonly { readonly surfaceId: string }[] }
      >
    >
  )[place];
  const tagged = new Set(
    staged?.surfaceSlots.map((slot) => slot.surfaceId) ?? [],
  );
  return record.surfaces
    .filter(
      (surface) =>
        tagged.has(surface.id) && !(surface.absentIn ?? []).includes(variant),
    )
    .map((surface) => ({
      id: surface.id,
      kind: surface.kind,
      finish: surface.finish,
      what: surface.what,
      quad: surface.variants?.[variant] ?? surface.quad,
      perspective: surface.perspective,
      shows: surface.shows,
    }));
}

/* -------------------------------------------------------------------------- */
/* What a surface can carry                                                    */
/* -------------------------------------------------------------------------- */

export interface VoteBoardLine {
  /** The recorded vote. */
  readonly id: EntityId;
  readonly designation: string;
  readonly title: string;
  /** "Passed 61–35" or "Failed 12–40". */
  readonly result: string;
  readonly passed: boolean;
  /** "Final vote", "Committee vote", ... */
  readonly question: string;
}

export interface VoteBoardContent {
  readonly kind: "votes";
  /** "Votes today" or "Votes, Feb. 24". */
  readonly heading: string;
  readonly body: string;
  readonly lines: readonly VoteBoardLine[];
}

export interface BroadcastContent {
  readonly kind: "broadcast";
  readonly broadcast: RoomBroadcast;
}

export interface FrontPageContent {
  readonly kind: "front-page";
  readonly frontPage: RoomFrontPage;
}

export interface CandidatePoster {
  readonly personId: EntityId;
  readonly name: string;
  /** "for Mayor". */
  readonly office: string;
  /** "Election Day is November 3, 2026". */
  readonly dateLine: string;
  /** 0 to 3, from the person's identity: two posters of one person match. */
  readonly look: number;
}

export interface CandidatesContent {
  readonly kind: "candidates";
  readonly posters: readonly CandidatePoster[];
}

export interface ResultsContent {
  readonly kind: "results";
  /** "Mayor". */
  readonly office: string;
  /** "Decided November 3, 2026". */
  readonly dateLine: string;
  readonly rows: readonly {
    readonly personId: EntityId;
    readonly name: string;
    /** "54%". */
    readonly share: string;
    readonly won: boolean;
  }[];
}

export interface PlanNote {
  readonly activityId: EntityId;
  /** "Tue. 7:00 p.m." */
  readonly when: string;
  readonly title: string;
}

export interface PlansContent {
  readonly kind: "plans";
  readonly notes: readonly PlanNote[];
}

export interface BillLine {
  readonly id: EntityId;
  readonly designation: string;
  readonly title: string;
}

export interface BillsContent {
  readonly kind: "bills";
  readonly heading: string;
  /** The place the bills were filed in: "Bloomington, Indiana". */
  readonly place: string | null;
  readonly bills: readonly BillLine[];
}

export interface ProgramsContent {
  readonly kind: "programs";
  readonly place: string;
  readonly services: readonly {
    readonly programKey: string;
    readonly title: string;
    readonly summary: string;
  }[];
}

export type BackdropSurfaceContent =
  | VoteBoardContent
  | BroadcastContent
  | FrontPageContent
  | CandidatesContent
  | ResultsContent
  | PlansContent
  | BillsContent
  | ProgramsContent;

export interface BackdropSurface {
  readonly slot: BackdropSurfaceSlot;
  readonly content: BackdropSurfaceContent;
}

/* -------------------------------------------------------------------------- */
/* Whose legislature a place belongs to                                        */
/* -------------------------------------------------------------------------- */

/**
 * The government a place is part of. A federal room reads Congress, a state
 * room the player's state, a county room the player's county, and every
 * other place the player's own town.
 */
type PlaceScope = "federal" | "state" | "county" | "local";

const FEDERAL_PLACES: ReadonlySet<string> = new Set([
  "us-senate-floor",
  "us-house-floor",
  "us-capitol-exterior",
  "oval-office",
  "supreme-courtroom",
]);

const STATE_PLACES: ReadonlySet<string> = new Set([
  "state-legislative-chamber-bicameral",
  "state-legislative-chamber-unicameral",
  "governor-office",
  "appellate-courtroom",
]);

const COUNTY_PLACES: ReadonlySet<string> = new Set([
  "county-commission",
  "county-courthouse",
  "county-courtroom",
]);

function placeScope(place: string): PlaceScope {
  if (FEDERAL_PLACES.has(place)) return "federal";
  if (COUNTY_PLACES.has(place)) return "county";
  if (STATE_PLACES.has(place) || place.startsWith("state-capitol-"))
    return "state";
  return "local";
}

/** A room that is one chamber shows only that chamber's votes. */
const CHAMBER_OF_PLACE: Readonly<Record<string, string>> = {
  "us-senate-floor": "senate",
  "us-house-floor": "house",
};

function federalJurisdiction(world: World): EntityId | null {
  return (
    world.jurisdictionOrder.find(
      (id) => world.jurisdictions[id]?.kind === "federal",
    ) ?? null
  );
}

/**
 * The player's county governments as this world records them: the county
 * jurisdiction for each county the player's home lies in, where the world
 * has one. A county the world never seated has no records to show.
 */
function homeCountyJurisdictions(
  world: World,
  personId: EntityId,
): readonly EntityId[] {
  const slugs = new Set(
    homeLocalGovernmentUnits(world, personId)
      .counties.map((county) => county.countyGeoid)
      .filter((geoid): geoid is string => geoid !== null)
      .map((geoid) => `us-county-${geoid}`),
  );
  return world.jurisdictionOrder.filter((id) =>
    slugs.has(world.jurisdictions[id]?.slug ?? ""),
  );
}

/** The jurisdictions whose records a place's surfaces may show, nearest first. */
export function placeJurisdictions(
  world: World,
  personId: EntityId,
  place: string,
): readonly EntityId[] {
  const home = world.people[personId]?.homeJurisdictionId ?? null;
  const state = stateOfJurisdiction(world, home);
  const scope = placeScope(place);
  if (scope === "county") return homeCountyJurisdictions(world, personId);
  const ids =
    scope === "federal"
      ? [federalJurisdiction(world)]
      : scope === "state"
        ? [state]
        : [home];
  return ids.filter((id): id is EntityId => id !== null);
}

/* -------------------------------------------------------------------------- */
/* Readers, one per kind of content                                            */
/* -------------------------------------------------------------------------- */

/** How far back a vote board still shows a day's votes. */
const VOTE_BOARD_DAYS = 14;
const VOTE_BOARD_LINES = 4;

const SHORT_MONTHS = [
  "Jan.",
  "Feb.",
  "March",
  "April",
  "May",
  "June",
  "July",
  "Aug.",
  "Sept.",
  "Oct.",
  "Nov.",
  "Dec.",
];

/** "Feb. 24": a date on a board, where a whole one does not fit. */
function shortDate(iso: string): string {
  const month = SHORT_MONTHS[Number(iso.slice(5, 7)) - 1];
  return month ? `${month} ${Number(iso.slice(8, 10))}` : iso;
}

const QUESTION_LABEL: Readonly<
  Record<LegislativeVoteRecord["purpose"], string>
> = {
  "floor-stage": "Final vote",
  "committee-report": "Committee vote",
  amendment: "Amendment",
  concurrence: "Other chamber's changes",
  "veto-override": "Veto override",
  "procedural-motion": "Procedural motion",
};

function measuresById(
  world: World,
): ReadonlyMap<EntityId, LegislativeMeasureRecord> {
  return new Map(
    (world.history.legislativeMeasures ?? []).map((measure) => [
      measure.id,
      measure,
    ]),
  );
}

function voteChamberKey(vote: LegislativeVoteRecord): string | null {
  const forum = vote.forum as { readonly chamberKey?: string };
  return forum.chamberKey ?? null;
}

export function readVoteBoard(
  world: World,
  jurisdictions: readonly EntityId[],
  chamberKey: string | null = null,
): VoteBoardContent | null {
  const today = world.currentDate;
  const since = addDays(today, -VOTE_BOARD_DAYS);
  const measures = measuresById(world);
  const wanted = new Set(jurisdictions);
  const votes = (world.history.legislativeVotes ?? []).filter((vote) => {
    if (vote.takenAt > today || vote.takenAt <= since) return false;
    const measure = measures.get(vote.measureId);
    if (!measure || !wanted.has(measure.jurisdictionId)) return false;
    return chamberKey === null || voteChamberKey(vote) === chamberKey;
  });
  if (votes.length === 0) return null;
  const day = votes.reduce(
    (latest, vote) => (vote.takenAt > latest ? vote.takenAt : latest),
    votes[0]!.takenAt,
  );
  const lines = votes
    .filter((vote) => vote.takenAt === day)
    .sort((a, b) => b.sequence - a.sequence)
    .slice(0, VOTE_BOARD_LINES)
    .map((vote): VoteBoardLine => {
      const measure = measures.get(vote.measureId)!;
      const passed = vote.outcome === "passed";
      return {
        id: vote.id,
        designation: measure.designation,
        title: measure.shortTitle,
        result: `${passed ? "Passed" : "Failed"} ${vote.tally.yea}–${vote.tally.nay}`,
        passed,
        question: QUESTION_LABEL[vote.purpose],
      };
    });
  const heading = day === today ? "Votes today" : `Votes, ${shortDate(day)}`;
  return {
    kind: "votes",
    heading,
    body: lines
      .map((line) => `${line.designation}: ${line.result}`)
      .join(" · "),
    lines,
  };
}

const BILLS_ON_A_SHEET = 3;

export function readBills(
  world: World,
  jurisdictions: readonly EntityId[],
): BillsContent | null {
  const wanted = new Set(jurisdictions);
  // A bill is filed when it is introduced; a draft nobody introduced is an
  // office's own paper, not a public one. One pass over the recorded actions
  // gives each filed bill its filing date.
  const filedOn = new Map<EntityId, string>();
  for (const action of world.history.legislativeActions ?? []) {
    if (action.kind !== "introduced" || action.occurredAt > world.currentDate)
      continue;
    const earlier = filedOn.get(action.measureId);
    if (earlier === undefined || action.occurredAt < earlier)
      filedOn.set(action.measureId, action.occurredAt);
  }
  const filed = (world.history.legislativeMeasures ?? [])
    .filter(
      (measure) =>
        wanted.has(measure.jurisdictionId) && filedOn.has(measure.id),
    )
    .sort(
      (a, b) =>
        filedOn.get(b.id)!.localeCompare(filedOn.get(a.id)!) ||
        b.sequence - a.sequence,
    )
    .slice(0, BILLS_ON_A_SHEET);
  if (filed.length === 0) return null;
  const place = world.jurisdictions[filed[0]!.jurisdictionId]?.name ?? null;
  return {
    kind: "bills",
    heading: "Bills filed",
    place,
    bills: filed.map((measure) => ({
      id: measure.id,
      designation: measure.designation,
      title: measure.shortTitle,
    })),
  };
}

const POSTERS_ON_A_WALL = 3;
const POSTER_LOOKS = 4;

function lookOf(stableKey: string): number {
  let hash = 0;
  for (const char of stableKey) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash % POSTER_LOOKS;
}

/** Where the player's ballot comes from: town, state and nation. */
function ballotJurisdictions(
  world: World,
  personId: EntityId,
): ReadonlySet<EntityId> {
  const home = world.people[personId]?.homeJurisdictionId ?? null;
  return new Set(
    [home, stateOfJurisdiction(world, home), federalJurisdiction(world)].filter(
      (id): id is EntityId => id !== null,
    ),
  );
}

/**
 * Whether the player votes in this contest's seat. A seat bound to a district
 * counts only when the player's recorded residence is in that district; a
 * district seat with no binding cannot be placed, and unknown is not a vote.
 */
function playerVotesForSeat(
  world: World,
  personId: EntityId,
  contest: ElectionContestRecord,
): boolean {
  const binding = contest.office.districtBinding ?? null;
  if (binding === null) return contest.office.seatKey === null;
  const today = world.currentDate;
  return (world.history.districtResidenceIntervals ?? []).some(
    (interval) =>
      interval.personId === personId &&
      interval.startedOn <= today &&
      (interval.endedOn === null || interval.endedOn > today) &&
      interval.binding.chamber === binding.chamber &&
      interval.binding.geoid === binding.geoid,
  );
}

/**
 * The candidates in the player's races: the contests the player is standing
 * in first, then the races still to be decided where the player lives.
 */
export function readCandidates(
  world: World,
  personId: EntityId,
): CandidatesContent | null {
  const ballot = ballotJurisdictions(world, personId);
  const today = world.currentDate;
  const contests = (world.history.electionContests ?? [])
    .filter(
      (contest) =>
        contest.scheduledAt <= today &&
        contest.electionDate >= today &&
        electionContestStatus(world, contest.id) === "pending" &&
        (contest.candidatePersonIds.includes(personId) ||
          (ballot.has(contest.jurisdictionId) &&
            playerVotesForSeat(world, personId, contest))),
    )
    .sort(
      (a, b) =>
        Number(b.candidatePersonIds.includes(personId)) -
          Number(a.candidatePersonIds.includes(personId)) ||
        a.electionDate.localeCompare(b.electionDate) ||
        a.sequence - b.sequence,
    );
  const posters: CandidatePoster[] = [];
  const seen = new Set<EntityId>();
  for (const contest of contests) {
    for (const candidateId of contest.candidatePersonIds) {
      if (seen.has(candidateId) || posters.length >= POSTERS_ON_A_WALL)
        continue;
      const person = world.people[candidateId];
      if (!person) continue;
      seen.add(candidateId);
      posters.push({
        personId: candidateId,
        name: personName(person),
        office: `for ${contest.office.title}`,
        dateLine: `Election Day is ${proseDate(contest.electionDate)}`,
        look: lookOf(candidateId),
      });
    }
  }
  return posters.length > 0 ? { kind: "candidates", posters } : null;
}

/** How long an election-night screen keeps a count up. */
const RESULTS_DAYS = 3;
const RESULT_ROWS = 4;

/**
 * The count in the latest race decided on the player's ballot, or one the
 * player stood in, within the last few days.
 */
export function readResults(
  world: World,
  personId: EntityId,
): ResultsContent | null {
  const ballot = ballotJurisdictions(world, personId);
  const today = world.currentDate;
  const since = addDays(today, -RESULTS_DAYS);
  const contests = new Map(
    (world.history.electionContests ?? []).map((contest) => [
      contest.id,
      contest,
    ]),
  );
  const result = (world.history.electionContestResults ?? [])
    .filter((record) => {
      const contest = contests.get(record.contestId);
      return (
        contest !== undefined &&
        record.resolvedAt <= today &&
        record.resolvedAt > since &&
        ((ballot.has(contest.jurisdictionId) &&
          playerVotesForSeat(world, personId, contest)) ||
          contest.candidatePersonIds.includes(personId))
      );
    })
    .sort(
      (a, b) =>
        b.resolvedAt.localeCompare(a.resolvedAt) || b.sequence - a.sequence,
    )[0];
  if (!result) return null;
  const contest = contests.get(result.contestId)!;
  const rows = [...result.tallies]
    .sort((a, b) => b.votes - a.votes)
    .slice(0, RESULT_ROWS)
    .flatMap((tally) => {
      const person = world.people[tally.candidatePersonId];
      if (!person) return [];
      return [
        {
          personId: tally.candidatePersonId,
          name: personName(person),
          share: `${Math.round(tally.voteShare * 100)}%`,
          won: tally.candidatePersonId === result.winnerPersonId,
        },
      ];
    });
  if (rows.length === 0) return null;
  return {
    kind: "results",
    office: contest.office.title,
    dateLine: `Decided ${proseDate(result.resolvedAt)}`,
    rows,
  };
}

const NOTES_ON_A_BOARD = 3;
const PLAN_DAYS = 7;

/** "Tue." from "Tuesday, January 20, 2026". */
function shortWeekday(iso: string): string {
  return `${proseWeekdayDate(iso).slice(0, 3)}.`;
}

/** The player's own appointments from now through the coming week. */
export function readPlans(
  world: World,
  personId: EntityId,
): PlansContent | null {
  const now = world.currentMoment;
  const until = addDays(world.currentDate, PLAN_DAYS);
  const notes = projectPlayerCalendar(world, personId)
    .days.flatMap((day) => day.entries)
    .filter(
      (entry) =>
        entry.group === "yours" &&
        entry.status !== "cancelled" &&
        entry.start.date <= until &&
        calendarEntryHorizon(entry, now) !== "history",
    )
    .slice(0, NOTES_ON_A_BOARD)
    .map((entry): PlanNote => ({
      activityId: entry.activityId,
      when:
        entry.start.date === world.currentDate
          ? `Today ${formatMinute(entry.start.minuteOfDay)}`
          : `${shortWeekday(entry.start.date)} ${formatMinute(entry.start.minuteOfDay)}`,
      title: entry.title,
    }));
  return notes.length > 0 ? { kind: "plans", notes } : null;
}

const SERVICES_ON_A_RACK = 6;

export function readPrograms(
  world: World,
  jurisdictions: readonly EntityId[],
): ProgramsContent | null {
  for (const jurisdictionId of jurisdictions) {
    const services = projectPublicServiceConditions(world, jurisdictionId);
    if (services.length === 0) continue;
    return {
      kind: "programs",
      place: world.jurisdictions[jurisdictionId]?.name ?? "",
      services: services.slice(0, SERVICES_ON_A_RACK).map((service) => ({
        programKey: service.programKey,
        title: service.serviceLabel,
        summary: service.summary,
      })),
    };
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/* The place's surfaces                                                        */
/* -------------------------------------------------------------------------- */

/**
 * What each painted surface in this picture shows now. A surface with nothing
 * to show is not in the list, so the picture keeps its painted face there.
 */
export function projectBackdropSurfaces(
  world: World,
  personId: EntityId,
  backdrop: Pick<PlaceBackdrop, "place" | "variant">,
  roomMedia: RoomMedia,
): readonly BackdropSurface[] {
  const slots = backdropSurfaceSlots(backdrop.place, backdrop.variant);
  if (slots.length === 0) return [];
  const jurisdictions = placeJurisdictions(world, personId, backdrop.place);
  const chamber = CHAMBER_OF_PLACE[backdrop.place] ?? null;
  // Each reader runs at most once per picture.
  const cache = new Map<string, BackdropSurfaceContent | null>();
  const read = (
    key: string,
    reader: () => BackdropSurfaceContent | null,
  ): BackdropSurfaceContent | null => {
    if (!cache.has(key)) cache.set(key, reader());
    return cache.get(key)!;
  };
  const contentFor = (
    slot: BackdropSurfaceSlot,
    shows: BackdropSurfaceShows,
  ): BackdropSurfaceContent | null => {
    switch (shows) {
      case "votes":
        return read("votes", () =>
          readVoteBoard(world, jurisdictions, chamber),
        );
      case "news":
        // A screen carries the station; anything printed carries the paper.
        return slot.kind === "screen"
          ? roomMedia.broadcast
            ? { kind: "broadcast", broadcast: roomMedia.broadcast }
            : null
          : roomMedia.frontPage
            ? { kind: "front-page", frontPage: roomMedia.frontPage }
            : null;
      case "candidates":
        return read("candidates", () => readCandidates(world, personId));
      case "results":
        return read("results", () => readResults(world, personId));
      case "plans":
        return read("plans", () => readPlans(world, personId));
      case "bills":
        return read("bills", () => readBills(world, jurisdictions));
      case "programs":
        return read("programs", () => readPrograms(world, jurisdictions));
    }
  };
  // A blank panel holds one poster and a brochure pocket one leaflet, so a
  // row of them hands the posters or services out in order; a board with
  // room pins up several.
  const handedOut = new Map<string, number>();
  const single = (
    slot: BackdropSurfaceSlot,
    content: BackdropSurfaceContent,
  ): BackdropSurfaceContent | null => {
    if (content.kind === "candidates" && slot.finish === "panel") {
      const index = handedOut.get("candidates") ?? 0;
      const poster = content.posters[index];
      if (!poster) return null;
      handedOut.set("candidates", index + 1);
      return { kind: "candidates", posters: [poster] };
    }
    if (content.kind === "programs" && slot.kind === "brochure") {
      const index = handedOut.get("programs") ?? 0;
      const service = content.services[index];
      if (!service) return null;
      handedOut.set("programs", index + 1);
      return { ...content, services: [service] };
    }
    return content;
  };
  // Two boards in one room do not repeat each other: a later one moves on to
  // the next thing it is for. Screens may carry the same channel, as a row of
  // televisions does, and posters and leaflets were already handed out.
  const repeated = new Set<BackdropSurfaceShows>();
  const surfaces: BackdropSurface[] = [];
  for (const slot of slots) {
    for (const shows of slot.shows) {
      const handsOut =
        (shows === "candidates" && slot.finish === "panel") ||
        (shows === "programs" && slot.kind === "brochure");
      const once = slot.kind !== "screen" && !handsOut;
      if (once && repeated.has(shows)) continue;
      const found = contentFor(slot, shows);
      const content = found ? single(slot, found) : null;
      if (content) {
        if (once) repeated.add(shows);
        surfaces.push({ slot, content });
        break;
      }
    }
  }
  return surfaces;
}

/* -------------------------------------------------------------------------- */
/* Drawing a flat card onto a painted face                                     */
/* -------------------------------------------------------------------------- */

/**
 * The size of the face itself, from its edges: the mean of its top and bottom
 * for width and of its sides for height. For a face seen at an angle this is
 * nearer its own proportions than the box around it, so type set in it is
 * sized for the surface rather than for the empty corners of that box.
 */
export function quadFaceSize(quad: SurfaceQuad): {
  readonly width: number;
  readonly height: number;
} {
  const length = (a: Point, b: Point) => Math.hypot(b[0] - a[0], b[1] - a[1]);
  const [topLeft, topRight, bottomRight, bottomLeft] = quad;
  return {
    width: (length(topLeft, topRight) + length(bottomLeft, bottomRight)) / 2,
    height: (length(topLeft, bottomLeft) + length(topRight, bottomRight)) / 2,
  };
}

/**
 * The CSS `matrix3d` that carries a `width` x `height` box, with its origin at
 * its top-left corner, onto `quad` (already in the layer's pixels).
 *
 * The projective map from the unit square to four points (Heckbert, 1989),
 * scaled to the box and laid out column by column as CSS wants it. A plain
 * rectangle comes out as a plain scale and translation.
 */
export function quadMatrix3d(
  quad: SurfaceQuad,
  width: number,
  height: number,
): string {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = quad;
  const dx1 = x1 - x2;
  const dx2 = x3 - x2;
  const dy1 = y1 - y2;
  const dy2 = y3 - y2;
  const sx = x0 - x1 + x2 - x3;
  const sy = y0 - y1 + y2 - y3;
  const det = dx1 * dy2 - dx2 * dy1;
  const g = det === 0 ? 0 : (sx * dy2 - dx2 * sy) / det;
  const h = det === 0 ? 0 : (dx1 * sy - sx * dy1) / det;
  const a = x1 - x0 + g * x1;
  const b = x3 - x0 + h * x3;
  const c = x0;
  const d = y1 - y0 + g * y1;
  const e = y3 - y0 + h * y3;
  const f = y0;
  // Unit square to quad, then box to unit square.
  const m = [
    a / width,
    d / width,
    0,
    g / width,
    b / height,
    e / height,
    0,
    h / height,
    0,
    0,
    1,
    0,
    c,
    f,
    0,
    1,
  ];
  return `matrix3d(${m.map((value) => Number(value.toFixed(8))).join(", ")})`;
}
