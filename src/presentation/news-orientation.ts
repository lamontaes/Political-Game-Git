import {
  activeWorkRelationshipsAt,
  currentLifeCutoff,
  lifePlaceByJurisdictionId,
  organizationProfileAt,
  organizationsAt,
  personName,
  type EntityId,
  type HistoricalEvent,
  type IsoDate,
  type World,
} from "../simulation";
import { supportedCivicOfficesFor } from "../simulation/civic-office-definitions";
import {
  municipalGovernmentForLifePlace,
  primaryReading,
} from "../simulation/municipal-government";
import { resolvePublicationSource } from "../simulation/public-information-integrity";
import {
  projectPublicInformationDigest,
  type PublicInformationDigestItem,
} from "../simulation/public-information";
import { openingOfficeholders } from "./opening-officeholders";
import { proseDate, proseMonthYear } from "./prose-dates";

/**
 * News orientation is a read-only assembly of public World facts the player
 * can already inspect: institutions, people holding public office, public
 * events, and actual publications. It never calls a publication writer, never
 * invents a war, an election or an officeholder, and never surfaces private
 * or limited records.
 *
 * The sentences it emits are what a resident could say about the place. They
 * are not descriptions of the save: "recorded", "in this save" and reading
 * guarantees stay in this comment and in the system document, never in the
 * text a player reads.
 */

const SKIP_PUBLIC_EVENT_PREFIXES = [
  "evidence.",
  "information.",
  "setup.",
  "simulation.",
  "publication.",
  "world.",
] as const;

export type NewsOrientationKind =
  "institution" | "incumbent" | "public-event" | "publication";

export type NewsRecordLinkKind =
  "publication" | "event" | "person" | "organization" | "office" | "government";

export interface NewsRecordLink {
  readonly kind: NewsRecordLinkKind;
  readonly id: string;
  readonly label: string;
}

export interface NewsOrientationItem {
  readonly key: string;
  readonly kind: NewsOrientationKind;
  readonly headline: string;
  readonly recap: string;
  readonly asOf: IsoDate;
  readonly links: readonly NewsRecordLink[];
  /** True when this character has an EventKnowledgeRecord of the public source. */
  readonly knownToViewer: boolean;
}

export interface NewsOrientationLane {
  readonly items: readonly NewsOrientationItem[];
  readonly emptyReason: string | null;
}

/**
 * An office the accepted authority records support for this place that the
 * World has not given a holder. It is exposed for diagnostics and producers,
 * never narrated: the World has not said the office is vacant, so News must
 * neither name a holder nor announce a vacancy.
 */
export interface NewsUnfilledOffice {
  readonly officeKey: string;
  readonly displayName: string;
}

export const NEWS_ORIENTATION_PUBLIC_TITLE = "Around here";
export const NEWS_ORIENTATION_RECENT_TITLE = "Lately";
export const NEWS_ORIENTATION_KNOWN_TITLE = "What has reached you";

export function newsOrientationPlaceTitle(placeName: string | null): string {
  return placeName ? `Around ${placeName}` : NEWS_ORIENTATION_PUBLIC_TITLE;
}

/** Standing public facts about the place: who governs it and what serves it. */
export function isStandingNewsItem(item: NewsOrientationItem): boolean {
  return item.kind === "institution" || item.kind === "incumbent";
}

export interface NewsOrientation {
  readonly asOf: IsoDate;
  readonly placeName: string | null;
  /** Dateline the News reader shows. Reading it writes nothing. */
  readonly assembledLine: string;
  /** Every public item: standing facts first by date, then dated events. */
  readonly publicWorld: NewsOrientationLane;
  /** Dated public events and stories this character already knows of. */
  readonly viewerAccessible: NewsOrientationLane;
  readonly publications: readonly PublicInformationDigestItem[];
  readonly unfilledOffices: readonly NewsUnfilledOffice[];
}

export function projectNewsOrientation(
  world: World,
  viewerPersonId?: EntityId | null,
  jurisdictionId?: EntityId | null,
): NewsOrientation {
  const person =
    viewerPersonId && world.people[viewerPersonId]
      ? world.people[viewerPersonId]
      : null;
  const focusJurisdictionId =
    jurisdictionId === undefined
      ? (person?.homeJurisdictionId ?? null)
      : jurisdictionId;
  const place = focusJurisdictionId
    ? lifePlaceByJurisdictionId(focusJurisdictionId)
    : null;
  const knownEventIds = new Set(
    person
      ? world.history.knowledge
          .filter((record) => record.personId === person.id)
          .map((record) => record.eventId)
      : [],
  );

  const institutions = projectInstitutions(world, place, focusJurisdictionId);
  const officeholders = projectOfficeholders(world, place, focusJurisdictionId);
  const publicEvents = projectPublicEvents(
    world,
    focusJurisdictionId,
    knownEventIds,
  );
  const digest = projectPublicInformationDigest(
    world,
    jurisdictionId === undefined ? undefined : jurisdictionId,
  );
  const publications = digest.items.map((item) =>
    toPublicationItem(item, knownEventIds.has(item.sourceEventId)),
  );

  const publicWorldItems = [
    ...institutions,
    ...officeholders.items,
    ...publicEvents,
    ...publications,
  ].sort(byDateThenKey);

  const datedItems = publicWorldItems.filter(
    (item) => !isStandingNewsItem(item),
  );
  const viewerAccessibleItems = datedItems.filter((item) => item.knownToViewer);
  const placeName = place?.displayName ?? null;

  return {
    asOf: world.currentDate,
    placeName,
    assembledLine: datelineFor(placeName, world.currentDate),
    publicWorld: {
      items: publicWorldItems,
      emptyReason:
        publicWorldItems.length === 0 ? emptyPlaceReason(placeName) : null,
    },
    viewerAccessible: {
      items: viewerAccessibleItems,
      emptyReason:
        viewerAccessibleItems.length === 0
          ? emptyViewerReason(person !== null, datedItems.length > 0)
          : null,
    },
    publications: digest.items,
    unfilledOffices: officeholders.unfilled,
  };
}

function datelineFor(placeName: string | null, asOf: IsoDate): string {
  return placeName
    ? `${placeName}, as of ${proseDate(asOf)}.`
    : `As of ${proseDate(asOf)}.`;
}

function emptyPlaceReason(placeName: string | null): string {
  return placeName
    ? `There is nothing to report from ${placeName} yet.`
    : "There is nothing to report yet.";
}

function emptyViewerReason(hasViewer: boolean, hasDatedItems: boolean): string {
  if (!hasViewer) return "No character is selected.";
  return hasDatedItems
    ? "None of this has reached you directly yet."
    : "Nothing has happened in public here lately.";
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

function projectInstitutions(
  world: World,
  place: ReturnType<typeof lifePlaceByJurisdictionId>,
  jurisdictionId: EntityId | null,
): readonly NewsOrientationItem[] {
  const items: NewsOrientationItem[] = [];
  if (place) {
    const government = municipalGovernmentForLifePlace(place);
    if (government) {
      const reading = primaryReading(government);
      items.push({
        key: `institution:government:${government.key}`,
        kind: "institution",
        headline: governmentHeadline(place.displayName, government.displayName),
        recap: governmentRecap(
          place.displayName,
          government.displayName,
          reading.bodyName,
          reading.form ? (FORM_PHRASES[reading.form] ?? null) : null,
        ),
        asOf: reading.asOf as IsoDate,
        knownToViewer: false,
        links: [
          {
            kind: "government",
            id: government.key,
            label: government.displayName,
          },
        ],
      });
    }
  }

  const cutoff = currentLifeCutoff(world);
  // An office's own organization is told through its holder, not twice.
  const officeOrganizationIds = new Set(
    openingOfficeholders(world).map((holder) => holder.organizationId),
  );
  for (const organization of organizationsAt(world, cutoff)) {
    if (officeOrganizationIds.has(organization.id)) continue;
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
      key: `institution:org:${organization.id}`,
      kind: "institution",
      headline: profile.name,
      recap: institutionSentence(
        profile.name,
        institutionNoun(profile.classification),
        locatedIn,
      ),
      asOf: profile.effectiveAt,
      knownToViewer: false,
      links: [
        { kind: "organization", id: organization.id, label: profile.name },
      ],
    });
  }
  return items;
}

function governmentHeadline(placeName: string, governmentName: string): string {
  return `${placeName} is governed by ${governmentName}`;
}

function governmentRecap(
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

function isPublicInstitutionClassification(classification: string): boolean {
  return (
    classification.startsWith("service:") ||
    classification.startsWith("sector:government") ||
    classification.startsWith("sector:public") ||
    classification.startsWith("community:civic")
  );
}

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

function institutionNoun(classification: string): string {
  return INSTITUTION_NOUNS[classification] ?? "a public institution";
}

function projectOfficeholders(
  world: World,
  place: ReturnType<typeof lifePlaceByJurisdictionId>,
  jurisdictionId: EntityId | null,
): {
  readonly items: readonly NewsOrientationItem[];
  readonly unfilled: readonly NewsUnfilledOffice[];
} {
  const items: NewsOrientationItem[] = [];
  const heldClassifications = new Set<string>();
  const cutoff = currentLifeCutoff(world);

  for (const person of Object.values(world.people)) {
    for (const active of activeWorkRelationshipsAt(world, person.id, cutoff)) {
      if (
        !isPublicOfficeWork(
          active.relationship.kind,
          active.role.occupationClassification,
        )
      ) {
        continue;
      }
      if (
        jurisdictionId &&
        active.role.locationJurisdictionId !== null &&
        active.role.locationJurisdictionId !== jurisdictionId &&
        !sameStateJurisdiction(
          world,
          jurisdictionId,
          active.role.locationJurisdictionId,
        )
      ) {
        continue;
      }
      const orgName = active.relationship.organizationId
        ? (organizationProfileAt(
            world,
            active.relationship.organizationId,
            cutoff,
          )?.name ?? null)
        : null;
      const title = active.role.title;
      const name = personName(person);
      const holdsOffice = isElectedOrAppointedOffice(active.relationship.kind);
      const where = atOrganization(orgName);
      items.push({
        key: `incumbent:${person.id}:${active.relationship.id}`,
        kind: "incumbent",
        headline: officeholderHeadline(name, title, holdsOffice),
        recap: officeholderRecap(
          name,
          title,
          where,
          active.relationship.startedAt,
          holdsOffice,
        ),
        asOf: active.role.effectiveAt,
        knownToViewer: false,
        links: [
          { kind: "person", id: person.id, label: name },
          { kind: "office", id: active.role.id, label: title },
          ...(orgName && active.relationship.organizationId
            ? [
                {
                  kind: "organization" as const,
                  id: active.relationship.organizationId,
                  label: orgName,
                },
              ]
            : []),
        ],
      });
      const classification = active.role.occupationClassification;
      if (classification) heldClassifications.add(classification);
    }
  }

  // National tenures the opening establishes are public World events, not
  // work relationships. They are the same kind of fact: someone holds the
  // office now, since a date the World wrote down.
  // The opening keys its offices ("us-president") differently from the
  // executive authority packs ("us-federal-president"); the office title is
  // the shared identity.
  const heldOfficeKeys = new Set<string>();
  const heldOfficeTitles = new Set<string>();
  for (const holder of openingOfficeholders(world)) {
    heldOfficeKeys.add(holder.officeKey);
    heldOfficeTitles.add(holder.title);
    const orgName =
      organizationProfileAt(world, holder.organizationId, cutoff)?.name ?? null;
    items.push({
      key: `incumbent:tenure:${holder.termId}`,
      kind: "incumbent",
      headline: officeholderHeadline(holder.personName, holder.title, true),
      recap: officeholderRecap(
        holder.personName,
        holder.title,
        atOrganization(orgName),
        holder.startedAt,
        true,
      ),
      asOf: holder.startedAt,
      knownToViewer: false,
      links: [
        { kind: "person", id: holder.personId, label: holder.personName },
        { kind: "office", id: holder.officeKey, label: holder.title },
        ...(orgName
          ? [
              {
                kind: "organization" as const,
                id: holder.organizationId,
                label: orgName,
              },
            ]
          : []),
      ],
    });
  }

  const unfilled: NewsUnfilledOffice[] = [];
  if (place) {
    for (const office of supportedCivicOfficesFor(place)) {
      if (heldClassifications.has(`service:${office.officeKey}`)) continue;
      if (heldOfficeKeys.has(office.officeKey)) continue;
      if (heldOfficeTitles.has(office.displayName)) continue;
      unfilled.push({
        officeKey: office.officeKey,
        displayName: office.displayName,
      });
    }
  }
  return { items, unfilled };
}

function atOrganization(orgName: string | null): string {
  return orgName ? ` at ${orgName}` : "";
}

function officeholderHeadline(
  name: string,
  title: string,
  holdsOffice: boolean,
): string {
  return holdsOffice
    ? `${name} serves as ${title}`
    : `${name} works as ${title}`;
}

function officeholderRecap(
  name: string,
  title: string,
  where: string,
  startedAt: IsoDate,
  holdsOffice: boolean,
): string {
  const since = proseMonthYear(startedAt);
  return holdsOffice
    ? `${name} has served as ${title}${where} since ${since}.`
    : `${name} has worked as ${title}${where} since ${since}.`;
}

function sameStateJurisdiction(
  world: World,
  leftId: EntityId,
  rightId: EntityId,
): boolean {
  if (leftId === rightId) return true;
  const left = world.jurisdictions[leftId];
  const right = world.jurisdictions[rightId];
  if (!left || !right) return false;
  const leftPlace = lifePlaceByJurisdictionId(leftId);
  const rightPlace = lifePlaceByJurisdictionId(rightId);
  if (
    leftPlace?.stateJurisdictionKey &&
    rightPlace?.stateJurisdictionKey &&
    leftPlace.stateJurisdictionKey === rightPlace.stateJurisdictionKey
  ) {
    return true;
  }
  return (
    left.parentName === right.name ||
    right.parentName === left.name ||
    (left.parentName !== null && left.parentName === right.parentName)
  );
}

function isElectedOrAppointedOffice(kind: string): boolean {
  return (
    kind === "employment:executive-office" ||
    kind === "employment:legislative-member" ||
    kind === "employment:judicial-office-practice"
  );
}

function isPublicOfficeWork(
  kind: string,
  classification: string | null,
): boolean {
  return (
    isElectedOrAppointedOffice(kind) ||
    kind === "employment:legislative-staff" ||
    kind === "employment:executive-staff" ||
    (classification?.startsWith("service:us-") ?? false) ||
    classification === "occupation:legislative-staff"
  );
}

function projectPublicEvents(
  world: World,
  jurisdictionId: EntityId | null,
  knownEventIds: ReadonlySet<EntityId>,
): readonly NewsOrientationItem[] {
  const publishedSources = new Set(
    (world.history.publications ?? []).map(
      (publication) => publication.sourceEventId,
    ),
  );
  const items: NewsOrientationItem[] = [];
  for (const event of world.history.events) {
    if (!isOrientablePublicEvent(world, event, jurisdictionId)) continue;
    if (publishedSources.has(event.id)) continue;
    const people = event.participants
      .map((participant) => world.people[participant.personId])
      .filter((person): person is NonNullable<typeof person> =>
        Boolean(person),
      );
    const summary = event.summary.trim();
    items.push({
      key: `public-event:${event.id}`,
      kind: "public-event",
      headline: headlineFromSummary(summary),
      recap: summary,
      asOf: event.occurredAt,
      knownToViewer: knownEventIds.has(event.id),
      links: [
        { kind: "event", id: event.id, label: proseDate(event.occurredAt) },
        ...people.map((person) => ({
          kind: "person" as const,
          id: person.id,
          label: personName(person),
        })),
      ],
    });
  }
  return items;
}

function isOrientablePublicEvent(
  world: World,
  event: HistoricalEvent,
  jurisdictionId: EntityId | null,
): boolean {
  if (event.visibility !== "public") return false;
  if (event.occurredAt > world.currentDate) return false;
  if (
    SKIP_PUBLIC_EVENT_PREFIXES.some((prefix) => event.type.startsWith(prefix))
  ) {
    return false;
  }
  if (
    event.type.startsWith("press.") &&
    event.type !== "press.story-published"
  ) {
    return false;
  }
  if (jurisdictionId && event.jurisdictionId !== jurisdictionId) return false;
  if (!resolvePublicationSource(world, event)) return false;
  return event.summary.trim().length > 0;
}

function toPublicationItem(
  item: PublicInformationDigestItem,
  knownToViewer: boolean,
): NewsOrientationItem {
  return {
    key: `publication:${item.publicationId}`,
    kind: "publication",
    headline: item.headline,
    recap: item.body,
    asOf: item.publicationTime,
    knownToViewer,
    links: [
      {
        kind: "publication",
        id: item.publicationId,
        label: item.outletName,
      },
      {
        kind: "event",
        id: item.sourceEventId,
        label: proseDate(item.eventTime),
      },
      ...item.people.map((person) => ({
        kind: "person" as const,
        id: person.personId,
        label: person.label,
      })),
    ],
  };
}

function headlineFromSummary(summary: string): string {
  const first = summary.split(/(?<=[.?!])\s+/)[0] ?? summary;
  return first.length > 140 ? `${first.slice(0, 137).trimEnd()}…` : first;
}

function byDateThenKey(
  left: NewsOrientationItem,
  right: NewsOrientationItem,
): number {
  const byDate = right.asOf.localeCompare(left.asOf);
  if (byDate !== 0) return byDate;
  return left.key.localeCompare(right.key);
}
