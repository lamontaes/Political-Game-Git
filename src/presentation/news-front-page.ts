import type { EntityId, IsoDate, World } from "../simulation";
import type { NewsMode } from "./shell-navigation";
import { projectPublicInformationPanel } from "./public-information-adapters";

/**
 * News as a reading experience (OCD-UI-005, UI DECISION FOLLOW-THROUGH).
 *
 * Two front pages over the same saved publications: a mixed front page that
 * leads with national stories, and one publication's own front page. Every
 * headline, date, place and name is the saved record's; nothing is added to
 * fill a column, and an empty paper says so. Choosing a front page or an
 * outlet is a reading preference and never touches the World.
 */

export interface NewsStory {
  readonly id: EntityId;
  readonly headline: string;
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
  const stories: NewsStory[] = panel.items.map((item) => ({
    id: item.publicationId,
    headline: item.headline,
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
  }));
  const byRecency = (left: NewsStory, right: NewsStory) =>
    right.publishedAt.localeCompare(left.publishedAt);

  const outlet =
    mode === "publication"
      ? (mastheads.find((candidate) => candidate.outletKey === outletKey) ??
        mastheads[0] ??
        null)
      : null;
  const selected =
    mode === "publication"
      ? stories
          .filter((story) => story.outletKey === outlet?.outletKey)
          .sort(byRecency)
      : [
          ...stories.filter((story) => story.national).sort(byRecency),
          ...stories.filter((story) => !story.national).sort(byRecency),
        ];
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
