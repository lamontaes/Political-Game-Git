import {
  currentLifeCutoff,
  lifePlaceByJurisdictionId,
  organizationProfileAt,
  organizationsAt,
  type EntityId,
  type IsoDate,
  type World,
} from "../simulation";
import { supportedCivicOfficesFor } from "../simulation/civic-office-definitions";
import {
  municipalGovernmentForLifePlace,
  primaryReading,
} from "../simulation/municipal-government";
import { resolvePublicationSource } from "../simulation/public-information-integrity";
import { openingOfficeholders } from "./opening-officeholders";
import { projectPublicInformationPanel } from "./public-information-adapters";
import { proseMonthYear } from "./prose-dates";

/**
 * A standing public fact about the place: who governs it or what serves it.
 * The sentence is what a resident could say; it never describes the save.
 */
export interface World39StandingItem {
  readonly key: string;
  readonly kind: "government" | "institution";
  readonly headline: string;
  readonly sentence: string;
  readonly recordId: string;
}

/**
 * An office the accepted authority records support for this place that the
 * World has not given a holder. Exposed for producers and diagnostics, never
 * narrated: the World has not said the office is vacant, so News neither
 * names a holder nor announces a vacancy.
 */
export interface World39UnfilledOffice {
  readonly officeKey: string;
  readonly displayName: string;
}

/** Orientation is a read of the save, never an implicit publication. */
export function projectWorld39News(world: World, personId: EntityId) {
  const person = world.people[personId] ?? null;
  const jurisdictionId = person?.homeJurisdictionId ?? null;
  const place = jurisdictionId
    ? lifePlaceByJurisdictionId(jurisdictionId)
    : null;
  const placeName = place?.displayName ?? null;
  const publications = projectPublicInformationPanel(world);
  const publishedEvents = new Set(
    publications.items.map((item) => item.sourceEventId),
  );
  const officeholders = openingOfficeholders(world)
    .filter((holder) => {
      const event = world.history.events.find(
        (entry) => entry.id === holder.termId,
      );
      // National term plans are already admitted by the shared current-holder reader.
      return (
        !event ||
        (event.visibility === "public" && event.recordedAt <= world.currentDate)
      );
    })
    .map((holder) => {
      const institution =
        organizationProfileAt(world, holder.organizationId)?.name ?? null;
      return {
        ...holder,
        institution,
        headline: `${holder.personName} serves as ${holder.title}`,
        sentence: officeholderSentence(
          holder.personName,
          holder.title,
          institution,
          holder.startedAt,
        ),
      };
    });
  const officeEvents = new Set(officeholders.map((holder) => holder.termId));
  const officeOrganizations = new Set(
    officeholders.map((holder) => holder.organizationId),
  );
  const heldTitles = new Set(officeholders.map((holder) => holder.title));
  // A public item being available is not proof this person has learned it.
  const learnedEventIds = new Set(
    world.history.knowledge
      .filter(
        (entry) =>
          entry.personId === personId && entry.learnedAt <= world.currentDate,
      )
      .map((entry) => entry.eventId),
  );
  const publicEvents = world.history.events
    .filter(
      (event) =>
        event.occurredAt <= world.currentDate &&
        event.recordedAt <= world.currentDate &&
        !publishedEvents.has(event.id) &&
        !officeEvents.has(event.id) &&
        !isWorldMachineryEvent(event.type, event.tags) &&
        resolvePublicationSource(world, event) !== null,
    )
    .sort(
      (a, b) =>
        b.occurredAt.localeCompare(a.occurredAt) || b.sequence - a.sequence,
    )
    .slice(0, 8)
    .map((event) => ({
      id: event.id,
      at: event.occurredAt,
      summary: event.summary,
      jurisdiction: event.jurisdictionId
        ? (world.jurisdictions[event.jurisdictionId]?.name ?? null)
        : null,
      known: learnedEventIds.has(event.id),
    }));
  const unfilledOffices: World39UnfilledOffice[] = place
    ? supportedCivicOfficesFor(place)
        .filter((office) => !heldTitles.has(office.displayName))
        .map((office) => ({
          officeKey: office.officeKey,
          displayName: office.displayName,
        }))
    : [];
  return {
    asOf: world.currentDate,
    placeName,
    standing: projectStanding(
      world,
      place,
      jurisdictionId,
      officeOrganizations,
    ),
    publications,
    officeholders,
    publicEvents,
    learnedEventIds,
    unfilledOffices,
  };
}

/**
 * Events the engine writes about the World or the setup itself (creation,
 * the moment a life is picked up, tenures the officeholder reader already
 * tells) are not public happenings a resident would hear about.
 */
function isWorldMachineryEvent(type: string, tags: readonly string[]): boolean {
  return (
    /^(setup|simulation|information|evidence|publication|world)\./.test(type) ||
    tags.includes("world.created") ||
    tags.includes("life.started")
  );
}

const FORM_PHRASES: Readonly<Record<string, string>> = {
  MAYOR_COUNCIL: "a mayor and council",
  COUNCIL_MANAGER: "a council with an appointed manager",
  COMMISSION_MANAGER: "a commission with an appointed manager",
  CITY_MANAGER: "an appointed city manager",
  TOWN_MEETING: "town meeting",
  URBAN_COUNTY_CONSOLIDATED: "a consolidated city and county government",
  CITY_COUNTY_CONSOLIDATED: "a consolidated city and county government",
  CONSOLIDATED_CITY_COUNTY: "a consolidated city and county government",
};

const INSTITUTION_NOUNS: Readonly<Record<string, string>> = {
  "service:school": "a school",
  "service:college": "a college",
  "service:library": "a library",
  "service:state-agency": "a state agency",
  "service:municipal-government": "the municipal government",
  "service:court-workplace": "a court",
  "service:training": "a training program",
  "sector:government": "a government office",
  "sector:public": "a public body",
  "community:civic": "a civic organization",
};

function projectStanding(
  world: World,
  place: ReturnType<typeof lifePlaceByJurisdictionId>,
  jurisdictionId: EntityId | null,
  officeOrganizations: ReadonlySet<EntityId>,
): readonly World39StandingItem[] {
  const items: World39StandingItem[] = [];
  if (place) {
    const government = municipalGovernmentForLifePlace(place);
    if (government) {
      const reading = primaryReading(government);
      const formPhrase = reading.form
        ? (FORM_PHRASES[reading.form] ?? null)
        : null;
      items.push({
        key: `government:${government.key}`,
        kind: "government",
        headline: governmentHeadline(place.displayName, government.displayName),
        sentence: governmentSentence(
          place.displayName,
          government.displayName,
          reading.bodyName,
          formPhrase,
        ),
        recordId: government.key,
      });
    }
  }
  const cutoff = currentLifeCutoff(world);
  for (const organization of organizationsAt(world, cutoff)) {
    // An office's own organization is told through its holder, not twice.
    if (officeOrganizations.has(organization.id)) continue;
    const profile = organizationProfileAt(world, organization.id, cutoff);
    if (!profile) continue;
    if (
      jurisdictionId &&
      profile.locationJurisdictionId !== null &&
      profile.locationJurisdictionId !== jurisdictionId
    ) {
      continue;
    }
    if (!isPublicInstitutionClassification(profile.classification)) continue;
    // Only an organization the World actually locates is said to be "in" a
    // place; an unlocated one is described without a place.
    const locatedIn = profile.locationJurisdictionId
      ? (lifePlaceByJurisdictionId(profile.locationJurisdictionId)
          ?.displayName ?? null)
      : null;
    items.push({
      key: `institution:${organization.id}`,
      kind: "institution",
      headline: profile.name,
      sentence: institutionSentence(
        profile.name,
        INSTITUTION_NOUNS[profile.classification] ?? "a public institution",
        locatedIn,
      ),
      recordId: organization.id,
    });
  }
  return items;
}

function isPublicInstitutionClassification(classification: string): boolean {
  return (
    classification.startsWith("service:") ||
    classification.startsWith("sector:government") ||
    classification.startsWith("sector:public") ||
    classification.startsWith("community:civic")
  );
}

function governmentHeadline(placeName: string, governmentName: string): string {
  return `${placeName} is governed by ${governmentName}`;
}

function governmentSentence(
  placeName: string,
  governmentName: string,
  bodyName: string | null,
  formPhrase: string | null,
): string {
  const sentences = [
    bodyName ? `Its legislative body is the ${bodyName}.` : null,
    formPhrase ? `It runs through ${formPhrase}.` : null,
  ].filter((sentence): sentence is string => sentence !== null);
  return sentences.length > 0
    ? sentences.join(" ")
    : `${governmentName} serves ${placeName}.`;
}

function institutionSentence(
  name: string,
  noun: string,
  placeName: string | null,
): string {
  return placeName
    ? `${name} is ${noun} in ${placeName}.`
    : `${name} is ${noun}.`;
}

/**
 * Whether naming the institution after the title would only say the title
 * again (UI FINISH). "President of the United States at Presidency of the
 * United States" names one office twice: the title and the institution end
 * in the same "of …" phrase, or the institution simply contains the title.
 * A distinct employer ("Clerk at Hart County Library") is still named.
 */
export function institutionRestatesTitle(
  title: string,
  institution: string,
): boolean {
  const norm = (text: string) => text.toLowerCase().replace(/\s+/g, " ").trim();
  const t = norm(title);
  const i = norm(institution);
  if (i === t || i.includes(t)) return true;
  const tail = (text: string) => {
    const at = text.indexOf(" of ");
    return at === -1 ? null : text.slice(at + 4);
  };
  const titleTail = tail(t);
  return titleTail !== null && titleTail === tail(i);
}

/**
 * One officeholder, as a resident would say it. An unknown term start (a
 * record whose start date the game has not established) says who serves,
 * never a made-up "since".
 */
export function officeholderSentence(
  name: string,
  title: string,
  institution: string | null,
  startedAt: IsoDate | null,
): string {
  const where =
    institution && !institutionRestatesTitle(title, institution)
      ? ` at ${institution}`
      : "";
  return startedAt === null
    ? `${name} serves as ${title}${where}.`
    : `${name} has served as ${title}${where} since ${proseMonthYear(startedAt)}.`;
}
