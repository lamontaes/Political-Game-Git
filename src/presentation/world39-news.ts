import {
  currentLifeCutoff,
  lifePlaceByJurisdictionId,
  organizationProfileAt,
  organizationsAt,
  personName,
  type EntityId,
  type IsoDate,
  type World,
} from "../simulation";
import { supportedCivicOfficesFor } from "../simulation/civic-office-definitions";
import { canonicalSavedPublicGovernmentAccountKey } from "../simulation/public-government-identity";
import {
  municipalGovernmentForLifePlace,
  primaryReading,
} from "../simulation/municipal-government";
import { enactedLawsWithEffects } from "../simulation/enacted-law-effects";
import { stateOfJurisdiction } from "../simulation/press/outlets";
import { resolvePublicationSource } from "../simulation/public-information-integrity";
import { currentPublicOfficeholders } from "./opening-officeholders";
import { projectPublicInformationPanel } from "./public-information-adapters";
import { lawEffectSentences } from "./law-effects-prose";
import { readNoticesBank } from "./bank-english";

/**
 * A standing public fact about the place, as record values (menu reset: no
 * sentences): the government that governs it, with its legislative body, or
 * a public institution that serves it.
 */
export interface World39StandingItem {
  readonly key: string;
  readonly kind: "government" | "institution";
  /** The government's or institution's recorded name. */
  readonly name: string;
  /** A government's legislative body, where the record names one. */
  readonly bodyName: string | null;
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
/** One enacted law that reaches a resident, and what it did in the world. */
export interface World39LawReach {
  readonly measureId: EntityId;
  readonly title: string;
  readonly designation: string;
  readonly level: "federal" | "state" | "territory" | "local";
  readonly enactedOn: IsoDate;
  /** Whether any part of the law changed a record the game acts on. */
  readonly actsInWorld: boolean;
  readonly sentences: readonly string[];
}

/**
 * The laws that apply where a resident lives: national law, their state's,
 * and their own town's, newest first. Laws with no part the game acts on are
 * listed too, and say so, so the page never claims more than the world did.
 */
export function lawsReachingResident(
  world: World,
  jurisdictionId: EntityId | null,
  limit = 8,
): readonly World39LawReach[] {
  const homeState = stateOfJurisdiction(world, jurisdictionId);
  return enactedLawsWithEffects(world)
    .filter((law) => {
      if (law.level === "federal") return true;
      const measure = (world.history.legislativeMeasures ?? []).find(
        (row) => row.id === law.measureId,
      );
      if (!measure || jurisdictionId === null) return false;
      return law.level === "local"
        ? measure.jurisdictionId === jurisdictionId
        : homeState !== null &&
            stateOfJurisdiction(world, measure.jurisdictionId) === homeState;
    })
    .slice(0, limit)
    .map((law) => ({
      measureId: law.measureId,
      title: law.shortTitle,
      designation: law.designation,
      level: law.level,
      enactedOn: law.enactedOn,
      actsInWorld: law.lines.some(
        (line) =>
          line.kind !== "not-modeled" && line.kind !== "no-operative-text",
      ),
      sentences: lawEffectSentences(world, law.measureId),
    }));
}

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
  // A resident's news is their own place, their state, the nation, and what
  // concerns them by name. A House vacancy in another state is not news in
  // Maine (Maine playthrough, 2026-09-22), and neither is another state's
  // governor.
  const homeState = stateOfJurisdiction(world, jurisdictionId);
  // Every materialized public officeholder within the reader's reach,
  // including state executives whose term dates are not established, whose
  // start stays empty rather than invented.
  const officeholders = currentPublicOfficeholders(world)
    .filter((holder) => {
      const event = world.history.events.find(
        (entry) => entry.id === holder.termId,
      );
      // National term plans are already admitted by the shared current-holder reader.
      if (!event) return true;
      const holderState = event.jurisdictionId
        ? stateOfJurisdiction(world, event.jurisdictionId)
        : null;
      return (
        event.visibility === "public" &&
        event.recordedAt <= world.currentDate &&
        (holderState === null || holderState === homeState)
      );
    })
    .map((holder) => {
      const institution =
        organizationProfileAt(world, holder.organizationId)?.name ?? null;
      return { ...holder, institution };
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
  const closeToHome = (event: (typeof world.history.events)[number]) =>
    event.jurisdictionId === null ||
    event.jurisdictionId === jurisdictionId ||
    (homeState !== null &&
      stateOfJurisdiction(world, event.jurisdictionId) === homeState) ||
    event.involvedEntityIds.includes(personId);
  const nearness = (event: (typeof world.history.events)[number]) =>
    event.jurisdictionId === jurisdictionId ||
    event.involvedEntityIds.includes(personId)
      ? 0
      : 1;
  const publicEvents = world.history.events
    .filter(
      (event) =>
        event.occurredAt <= world.currentDate &&
        event.recordedAt <= world.currentDate &&
        !publishedEvents.has(event.id) &&
        !officeEvents.has(event.id) &&
        !isWorldMachineryEvent(event.type, event.tags) &&
        // A police report is news only in its own town.
        (!event.type.startsWith("crime.") ||
          event.jurisdictionId === jurisdictionId) &&
        closeToHome(event) &&
        resolvePublicationSource(world, event) !== null,
    )
    // Newest first; on the same day, the player's own town and what names
    // them come before the rest of the state, so a filing day across Texas
    // does not push the town's own election result off the list.
    .sort(
      (a, b) =>
        b.occurredAt.localeCompare(a.occurredAt) ||
        nearness(a) - nearness(b) ||
        b.sequence - a.sequence,
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
      ...eventParties(world, event),
    }));
  const notices = projectWorld39Notices(world, personId);
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
    notices,
    learnedEventIds,
    unfilledOffices,
    laws: lawsReachingResident(world, jurisdictionId),
  };
}

/** One posted notice: the English engine's wording and the part that wrote it. */
export interface World39Notice {
  readonly key: string;
  readonly text: string;
}

/**
 * Public notices are the English engine's wording of recorded hearings, local
 * measures and scheduled elections for the reader's own place. The notice bank
 * gives a reason, not a line, when none is recorded, so no notice is posted.
 */
export function projectWorld39Notices(
  world: World,
  personId: EntityId,
): readonly World39Notice[] {
  const lines = readNoticesBank(world, personId);
  return typeof lines === "string"
    ? []
    : lines.map((line) => ({ key: line.partKey, text: line.text }));
}

/**
 * Who and what a public event names, by name: the people who took part in it
 * or are named in it, and the organizations it involves. Record names only; the event's saved
 * summary is not printed because some events save a key as their summary.
 */
function eventParties(
  world: World,
  event: (typeof world.history.events)[number],
): {
  readonly people: readonly {
    readonly personId: EntityId;
    readonly name: string;
  }[];
  readonly organizations: readonly string[];
} {
  const seen = new Set<EntityId>();
  const people = [
    ...event.participants.map((row) => row.personId),
    ...event.involvedEntityIds,
  ].flatMap((id) => {
    const person = world.people[id];
    if (!person || seen.has(id)) return [];
    seen.add(id);
    return [{ personId: id, name: personName(person) }];
  });
  const organizations = event.involvedEntityIds.flatMap((id) => {
    const name = organizationProfileAt(world, id)?.name;
    return name ? [name] : [];
  });
  return { people, organizations: [...new Set(organizations)] };
}

/**
 * Events the engine writes about the World or the setup itself (creation,
 * the moment a life is picked up, tenures the officeholder reader already
 * tells) are not public happenings a resident would hear about.
 */
export function isWorldMachineryEvent(
  type: string,
  tags: readonly string[],
): boolean {
  return (
    /^(setup|simulation|information|evidence|publication|world|public-program)\./.test(
      type,
    ) ||
    tags.includes("world.created") ||
    tags.includes("life.started")
  );
}

function projectStanding(
  world: World,
  place: ReturnType<typeof lifePlaceByJurisdictionId>,
  jurisdictionId: EntityId | null,
  officeOrganizations: ReadonlySet<EntityId>,
): readonly World39StandingItem[] {
  const items: World39StandingItem[] = [];
  const government = place ? municipalGovernmentForLifePlace(place) : null;
  let governmentRecordId = government?.key ?? null;
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
    // A government's own accounts and its organization are the government,
    // told once above the institutions, never listed beside it.
    if (
      canonicalSavedPublicGovernmentAccountKey(organization.stableKey) !== null
    )
      continue;
    if (government && profile.name === government.displayName) {
      governmentRecordId = organization.id;
      continue;
    }
    // Two records under one name read as one line, not the same line twice.
    if (items.some((item) => item.name === profile.name)) continue;
    items.push({
      key: `institution:${organization.id}`,
      kind: "institution",
      name: profile.name,
      bodyName: null,
      recordId: organization.id,
    });
  }
  return government && governmentRecordId
    ? [
        {
          key: `government:${government.key}`,
          kind: "government",
          name: government.displayName,
          bodyName: primaryReading(government).bodyName ?? null,
          recordId: governmentRecordId,
        },
        ...items,
      ]
    : items;
}

function isPublicInstitutionClassification(classification: string): boolean {
  return (
    classification.startsWith("service:") ||
    classification.startsWith("sector:government") ||
    classification.startsWith("sector:public") ||
    classification.startsWith("community:civic")
  );
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
