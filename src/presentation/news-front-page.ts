import type { EntityId, IsoDate, World } from "../simulation";
import type { NewsMode } from "./shell-navigation";
import { projectPublicInformationPanel } from "./public-information-adapters";

/**
 * News as a reading experience (OCD-UI-005, UI DECISION FOLLOW-THROUGH).
 *
 * Two front pages over the same saved publications: a mixed front page that
 * leads with the latest stories, and one publication's own front page. Every
 * headline, date, place and name is the saved record's; nothing is added to
 * fill a column, and an empty paper says so. Choosing a front page or an
 * outlet is a reading preference and never touches the World.
 */

export interface NewsStory {
  readonly id: EntityId;
  readonly headline: string;
  /** The short headline a reader sees above the saved copy. */
  readonly readerHeadline: string;
  readonly sourceEventId: EntityId;
  readonly sourceRecordIds: readonly EntityId[];
  readonly body: string;
  readonly outletKey: string;
  readonly outletName: string;
  readonly publishedAt: IsoDate;
  readonly place: string | null;
  readonly national: boolean;
  readonly people: readonly {
    readonly personId: EntityId;
    readonly label: string;
  }[];
  /** The laws the story reports on, each opening its own page. */
  readonly laws: readonly {
    readonly measureId: EntityId;
    readonly label: string;
  }[];
}

export interface NewsMasthead {
  readonly outletKey: string;
  readonly outletName: string;
  readonly storyCount: number;
  /** A stable typographic treatment, so each outlet looks like itself. */
  readonly style: number;
}

export interface NewsFrontPageModel {
  readonly mode: NewsMode;
  readonly mastheads: readonly NewsMasthead[];
  /** The outlet shown in publication mode; null on the mixed front page. */
  readonly outlet: NewsMasthead | null;
  readonly lead: NewsStory | null;
  readonly stories: readonly NewsStory[];
  readonly empty: string | null;
}

const MASTHEAD_STYLES = 4;

function styleFor(outletKey: string): number {
  let hash = 0;
  for (let index = 0; index < outletKey.length; index += 1) {
    hash = (hash * 31 + outletKey.charCodeAt(index)) >>> 0;
  }
  return hash % MASTHEAD_STYLES;
}

/**
 * The laws each story reports on: the legislative steps and enactments among
 * the event it was published about and the events its lead was built from. A story about a bill links to the bill,
 * where what it did, once law, is written.
 */
export function storyLawReader(
  world: World,
): (
  publicationId: EntityId,
  sourceEventId?: EntityId | null,
) => NewsStory["laws"] {
  const measureOfEvent = new Map<EntityId, EntityId>();
  for (const action of world.history.legislativeActions ?? [])
    measureOfEvent.set(action.eventId, action.measureId);
  for (const enactment of world.history.legislativeEnactments ?? [])
    measureOfEvent.set(enactment.outcomeEventId, enactment.measureId);
  const leads = new Map<EntityId, readonly EntityId[]>();
  const leadOfPublication = new Map<EntityId, EntityId>();
  for (const record of world.history.pressRecords ?? []) {
    if (record.kind === "story-lead")
      leads.set(record.id, record.basisEventIds);
    else if (record.kind === "story-disposition" && record.publicationId)
      leadOfPublication.set(record.publicationId, record.leadId);
  }
  const measures = new Map(
    (world.history.legislativeMeasures ?? []).map((row) => [row.id, row]),
  );
  return (publicationId, sourceEventId) => {
    const lead = leadOfPublication.get(publicationId);
    const found = new Set<EntityId>();
    for (const eventId of [
      ...(sourceEventId ? [sourceEventId] : []),
      ...(lead ? (leads.get(lead) ?? []) : []),
    ]) {
      const measureId = measureOfEvent.get(eventId);
      if (measureId) found.add(measureId);
    }
    return [...found].flatMap((measureId) => {
      const measure = measures.get(measureId);
      return measure
        ? [
            {
              measureId,
              label: `${measure.shortTitle} (${measure.designation})`,
            },
          ]
        : [];
    });
  };
}

export function projectNewsFrontPage(
  world: World,
  mode: NewsMode,
  outletKey: string | null,
): NewsFrontPageModel {
  const panel = projectPublicInformationPanel(world);
  const mastheads: NewsMasthead[] = panel.outlets.map((outlet) => ({
    outletKey: outlet.outletKey,
    outletName: outlet.outletName,
    storyCount: outlet.storyCount,
    style: styleFor(outlet.outletKey),
  }));
  const lawsOf = storyLawReader(world);
  const stories: NewsStory[] = panel.items.map((item) => ({
    id: item.publicationId,
    sourceEventId: item.sourceEventId,
    sourceRecordIds: item.sourceRecordIds,
    headline: item.headline,
    readerHeadline: item.readerHeadline,
    body: item.body,
    outletKey: item.outletKey,
    outletName: item.outletName,
    publishedAt: item.publicationTime,
    place: item.jurisdictionName,
    national:
      item.jurisdictionId === null ||
      world.jurisdictions[item.jurisdictionId]?.kind === "federal",
    people: item.people.map((person) => ({
      personId: person.personId,
      label: person.label,
    })),
    laws: lawsOf(item.publicationId, item.sourceEventId),
  }));
  const byRecency = (left: NewsStory, right: NewsStory) =>
    right.publishedAt.localeCompare(left.publishedAt);

  const outlet =
    mode === "publication"
      ? (mastheads.find((candidate) => candidate.outletKey === outletKey) ??
        mastheads[0] ??
        null)
      : null;
  const selected = (
    mode === "publication"
      ? stories.filter((story) => story.outletKey === outlet?.outletKey)
      : stories
  ).sort(byRecency);
  const [lead = null, ...rest] = selected;
  return {
    mode,
    mastheads,
    outlet,
    lead,
    stories: rest,
    empty:
      lead !== null
        ? null
        : mode === "publication" && outlet
          ? `${outlet.outletName} has published nothing yet.`
          : "Nothing has been published yet.",
  };
}

/** Article detail uses the same publication and access-filtered entity links as its headline. */
export function projectNewsArticle(
  world: World,
  publicationId: EntityId,
): NewsStory | null {
  const page = projectNewsFrontPage(world, "front", null);
  return (
    [page.lead, ...page.stories].find((item) => item?.id === publicationId) ??
    null
  );
}
