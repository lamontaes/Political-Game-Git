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

/**
 * News orientation is a read-only assembly of public World facts the player
 * can already inspect: institutions, recorded incumbents, public events, and
 * actual publications. It never calls a publication writer, never invents a
 * war or election, and never surfaces private or limited records.
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

export const NEWS_ORIENTATION_PUBLIC_TITLE = "Around this place";
export const NEWS_ORIENTATION_KNOWN_TITLE =
  "Known to you from the public record";

export interface NewsOrientation {
  readonly asOf: IsoDate;
  readonly placeName: string | null;
  /** Chrome the News reader shows; reading this line does not write history. */
  readonly assembledLine: string;
  readonly publicWorld: NewsOrientationLane;
  readonly viewerAccessible: NewsOrientationLane;
  readonly publications: readonly PublicInformationDigestItem[];
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
  const incumbents = projectIncumbents(world, place, focusJurisdictionId);
  const publicEvents = projectPublicEvents(
    world,
    focusJurisdictionId,
    knownEventIds,
  );
  const publications = projectPublicInformationDigest(
    world,
    jurisdictionId === undefined ? undefined : jurisdictionId,
  ).items.map((item) =>
    toPublicationItem(item, knownEventIds.has(item.sourceEventId)),
  );

  const publicWorldItems = [
    ...institutions,
    ...incumbents,
    ...publicEvents,
    ...publications,
  ].sort(byDateThenKey);

  const viewerAccessibleItems = publicWorldItems.filter(
    (item) => item.knownToViewer,
  );

  return {
    asOf: world.currentDate,
    placeName: place?.displayName ?? null,
    assembledLine: place
      ? `Assembled ${world.currentDate} · ${place.displayName}. Reading does not publish a story or create the event it reports.`
      : `Assembled ${world.currentDate}. Reading does not publish a story or create the event it reports.`,
    publicWorld: {
      items: publicWorldItems,
      emptyReason:
        publicWorldItems.length === 0
          ? emptyPublicWorldReason(place?.displayName ?? null)
          : null,
    },
    viewerAccessible: {
      items: viewerAccessibleItems,
      emptyReason:
        viewerAccessibleItems.length === 0
          ? person
            ? "This character has no recorded knowledge of the public events, incumbents, institutions or publications assembled here."
            : "No character is selected, so no personal public-information knowledge can be listed."
          : null,
    },
    publications: projectPublicInformationDigest(
      world,
      jurisdictionId === undefined ? undefined : jurisdictionId,
    ).items,
  };
}

function emptyPublicWorldReason(placeName: string | null): string {
  return placeName
    ? `No public events, incumbents, institutions or publications are recorded for ${placeName} in this save.`
    : "No public events, incumbents, institutions or publications are recorded in this save.";
}

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
      const form = reading.form ? ` Form: ${reading.form}.` : "";
      const body = reading.bodyName
        ? ` Recorded body: ${reading.bodyName}.`
        : "";
      items.push({
        key: `institution:government:${government.key}`,
        kind: "institution",
        headline: `${government.displayName} is the recorded municipal government`,
        recap: `${government.displayName} is recorded for ${place.displayName}.${form}${body} Reading as of ${reading.asOf}.`,
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
  for (const organization of organizationsAt(world, cutoff)) {
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
    items.push({
      key: `institution:org:${organization.id}`,
      kind: "institution",
      headline: `${profile.name} is a recorded institution`,
      recap: `${profile.name} is recorded as ${profile.classification.replace(":", ", ")} from ${profile.effectiveAt}.`,
      asOf: profile.effectiveAt,
      knownToViewer: false,
      links: [
        { kind: "organization", id: organization.id, label: profile.name },
      ],
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

function projectIncumbents(
  world: World,
  place: ReturnType<typeof lifePlaceByJurisdictionId>,
  jurisdictionId: EntityId | null,
): readonly NewsOrientationItem[] {
  const items: NewsOrientationItem[] = [];
  const holdersByOffice = new Map<string, NewsOrientationItem>();
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
      const recap = orgName
        ? `${name} holds the recorded office of ${title} at ${orgName} as of ${active.role.effectiveAt}.`
        : `${name} holds the recorded office of ${title} as of ${active.role.effectiveAt}.`;
      const item: NewsOrientationItem = {
        key: `incumbent:${person.id}:${active.relationship.id}`,
        kind: "incumbent",
        headline: `${name} holds the office of ${title}`,
        recap,
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
      };
      items.push(item);
      const classification = active.role.occupationClassification;
      if (classification) holdersByOffice.set(classification, item);
    }
  }

  if (place) {
    for (const office of supportedCivicOfficesFor(place)) {
      const classification = `service:${office.officeKey}`;
      if (holdersByOffice.has(classification)) continue;
      items.push({
        key: `incumbent:vacant:${office.officeKey}`,
        kind: "incumbent",
        headline: `No incumbent is recorded for ${office.displayName}`,
        recap: `The office of ${office.displayName} is in the accepted authority records for this place. This save names no current holder.`,
        asOf: world.currentDate,
        knownToViewer: false,
        links: [
          { kind: "office", id: office.officeKey, label: office.displayName },
        ],
      });
    }
  }
  return items;
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

function isPublicOfficeWork(
  kind: string,
  classification: string | null,
): boolean {
  return (
    kind === "employment:executive-office" ||
    kind === "employment:legislative-member" ||
    kind === "employment:legislative-staff" ||
    kind === "employment:judicial-office-practice" ||
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
    const names = [...new Set(people.map(personName))].sort((left, right) =>
      left.localeCompare(right),
    );
    const summary = event.summary.trim();
    items.push({
      key: `public-event:${event.id}`,
      kind: "public-event",
      headline: headlineFromSummary(summary),
      recap: names.length ? `${summary} Named: ${names.join(", ")}.` : summary,
      asOf: event.occurredAt,
      knownToViewer: knownEventIds.has(event.id),
      links: [
        { kind: "event", id: event.id, label: `Record ${event.occurredAt}` },
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
        label: `Event ${item.eventTime}`,
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
