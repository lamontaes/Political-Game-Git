import type { EntityId, World } from "../simulation";
import { canPersonAccess, scheduledActivityState } from "../simulation";
import type { SceneSurfaceContentClass } from "../environment/environment-scene-spec";
import {
  projectNewsArticle,
  projectNewsFrontPage,
  type NewsStory,
} from "./news-front-page";
import { projectLivingSceneOpening } from "./living-scene-facts";
import { openingLifeLocation } from "./life-scene-flow";
import { completedActivityHere } from "./scene-venues";
import { projectPublicInformationPanel } from "./public-information-adapters";
import { projectCampaign } from "./campaign-projection";
import { proseDate } from "./prose-dates";
import {
  accessClears,
  type DynamicSurfaceProjection,
  type DisclosureChannel,
  type SurfaceFact,
} from "./surface-projection";
import type { SurfacePayloadProvider } from "./surface-binding";
import type { ShellRef } from "./shell-navigation";

export type LivingSurfaceSelection =
  | { readonly kind: "news"; readonly publicationId?: EntityId | null }
  | {
      readonly kind: "agenda" | "community-poster";
      readonly activityId: EntityId;
    }
  | { readonly kind: "venue-sign"; readonly arrivalEventId: EntityId }
  | {
      readonly kind: "office-nameplate";
      readonly personId: EntityId;
      readonly institutionId: EntityId;
    }
  | { readonly kind: "campaign-poster"; readonly campaignId: EntityId };
export interface LivingSurfaceRecord {
  readonly kind: LivingSurfaceSelection["kind"];
  readonly status: "bound" | "empty" | "withheld";
  readonly revision: string;
  readonly heading: string;
  readonly masthead: string | null;
  readonly lines: readonly string[];
  readonly dateLabel: string | null;
  readonly recordIds: readonly EntityId[];
  readonly detail:
    | { readonly kind: "article"; readonly article: NewsStory }
    | { readonly kind: "entity"; readonly ref: ShellRef }
    | {
        readonly kind: "record";
        readonly eventId: EntityId;
        readonly title: string;
        readonly body: string;
      }
    | null;
  readonly projection: DynamicSurfaceProjection;
  /** Publisher/office/venue facts do not admit a seal, flag or portrait raster. */
  readonly symbolAssetId: null;
}

/** The caller selects a real record. These reads neither acquire information
 * for the character nor advance the world or manufacture a publication.
 */
export function projectLivingSceneSurface(
  world: World,
  viewerPersonId: EntityId,
  selection: LivingSurfaceSelection,
): LivingSurfaceRecord {
  const facts = new Map<SceneSurfaceContentClass, SurfaceFact>();
  const empty = new Set<SceneSurfaceContentClass>();
  const base: LivingSurfaceRecord = {
    kind: selection.kind,
    status: "empty",
    revision: `${world.id}:${world.currentMoment.date}:${world.currentMoment.minuteOfDay}:${world.history.nextSequence}:${JSON.stringify(selection)}`,
    heading: "",
    masthead: null,
    lines: [],
    dateLabel: null,
    recordIds: [],
    detail: null,
    projection: { facts, empty },
    symbolAssetId: null,
  };
  const put = (
    key: SceneSurfaceContentClass,
    text: string,
    channel: DisclosureChannel,
    ids: readonly EntityId[],
  ) => facts.set(key, { text, channel, provenance: ids.join(",") });
  if (!world.people[viewerPersonId]) return { ...base, status: "withheld" };
  if (selection.kind === "news") {
    const editions = projectPublicInformationPanel(world).items;
    const selected = selection.publicationId
      ? editions.find(
          (item) =>
            item.publicationId === selection.publicationId ||
            item.corrections.some(
              (correction) =>
                correction.publicationId === selection.publicationId,
            ),
        )
      : null;
    const article =
      selection.publicationId === undefined
        ? projectNewsFrontPage(world, "front", null).lead
        : selected
          ? projectNewsArticle(world, selected.publicationId)
          : null;
    if (!article) {
      empty.add("headline");
      return { ...base, heading: "No current bulletin." };
    }
    const ids = [
      article.id,
      article.sourceEventId,
      ...article.sourceRecordIds,
      ...(editions
        .find((item) => item.publicationId === article.id)
        ?.corrections.map((correction) => correction.publicationId) ?? []),
    ];
    put("headline", article.headline, "published", ids);
    put("calendar-date", proseDate(article.publishedAt), "published", [
      article.id,
    ]);
    put(
      "document-body",
      `${article.outletName}\n${article.headline}\n${proseDate(article.publishedAt)}\n${article.body}`,
      "published",
      ids,
    );
    return {
      ...base,
      status: "bound",
      heading: article.headline,
      masthead: article.outletName,
      lines: [article.body],
      dateLabel: proseDate(article.publishedAt),
      recordIds: ids,
      detail: { kind: "article", article },
    };
  }
  if (selection.kind === "agenda" || selection.kind === "community-poster") {
    const activity = world.history.scheduledActivities.find(
      (entry) => entry.id === selection.activityId,
    );
    if (!activity) {
      empty.add("agenda");
      return base;
    }
    if (!canPersonAccess(activity.access, viewerPersonId))
      return { ...base, status: "withheld" };
    const state = scheduledActivityState(world, activity.id);
    if (state.status === "cancelled") {
      empty.add("agenda");
      return base;
    }
    if (selection.kind === "community-poster") {
      const notice = world.history.events.find(
        (event) =>
          activity.sourceEntityIds.includes(event.id) &&
          event.type === "civic.meeting-notice" &&
          event.visibility === "public" &&
          event.occurredAt <= world.currentDate &&
          event.recordedAt <= world.currentDate,
      );
      if (!notice) {
        empty.add("agenda");
        return base;
      }
      const heading = "Public meeting notice";
      const lines = [
        notice.summary,
        ...(notice.context.location ? [notice.context.location.label] : []),
      ];
      put("agenda", [heading, ...lines].join("\n"), "public-record", [
        notice.id,
      ]);
      put("calendar-date", proseDate(notice.occurredAt), "public-record", [
        notice.id,
      ]);
      return {
        ...base,
        status: "bound",
        heading,
        lines,
        dateLabel: proseDate(notice.occurredAt),
        recordIds: [notice.id],
        detail: {
          kind: "record",
          eventId: notice.id,
          title: heading,
          body: lines.join("\n"),
        },
      };
    }
    const ids = [activity.id, state.id, ...activity.sourceEntityIds];
    const channel = "institutional-working" as const;
    const lines = [
      activity.summary,
      activity.location.label,
      proseDate(state.start.date),
    ];
    put("agenda", [activity.title, ...lines].join("\n"), channel, ids);
    put("calendar-date", proseDate(state.start.date), channel, ids);
    return {
      ...base,
      status: "bound",
      heading: activity.title,
      lines,
      dateLabel: proseDate(state.start.date),
      recordIds: ids,
      detail: { kind: "entity", ref: { kind: "commitment", id: activity.id } },
    };
  }
  if (selection.kind === "venue-sign") {
    const event = world.history.events.find(
      (entry) => entry.id === selection.arrivalEventId,
    );
    const latest = world.history.events
      .filter(
        (entry) =>
          ["life.scene.opened", "life.scene.arrived"].includes(entry.type) &&
          entry.participants.some(
            (person) => person.personId === viewerPersonId,
          ),
      )
      .at(-1);
    if (
      !event ||
      event.id !== latest?.id ||
      !event.context.location ||
      event.occurredAt > world.currentDate
    )
      return { ...base, status: "withheld" };
    const current = openingLifeLocation(world, viewerPersonId);
    const activity = completedActivityHere(world, viewerPersonId);
    const unresolvedTravel = world.history.scheduledActivities.some(
      (entry) =>
        entry.kind === "travel" &&
        entry.participantPersonIds.includes(viewerPersonId) &&
        scheduledActivityState(world, entry.id).status === "completed" &&
        scheduledActivityState(world, entry.id).sequence > event.sequence,
    );
    if (
      JSON.stringify(current) !== JSON.stringify(event.context.location) ||
      unresolvedTravel ||
      (activity &&
        scheduledActivityState(world, activity.id).sequence > event.sequence)
    )
      return { ...base, status: "withheld" };
    // document-body is the existing generic readable sign/document content class.
    const label = event.context.location.label;
    put("document-body", label, "public-record", [event.id]);
    return {
      ...base,
      status: "bound",
      heading: label,
      recordIds: [event.id],
      detail: {
        kind: "record",
        eventId: event.id,
        title: label,
        body: event.summary,
      },
    };
  }
  if (selection.kind === "office-nameplate") {
    const actor = projectLivingSceneOpening(world, viewerPersonId)
      .chapters.flatMap((chapter) => chapter.actors)
      .find(
        (entry) =>
          entry.person.personId === selection.personId &&
          entry.provenance.institutionId === selection.institutionId &&
          entry.presenceBasis === "illustrative-public-role",
      );
    if (!actor) {
      empty.add("officeholder-name");
      return base;
    }
    put(
      "officeholder-name",
      `${actor.person.name}\n${actor.person.title}`,
      "public-record",
      actor.recordIds,
    );
    return {
      ...base,
      status: "bound",
      heading: actor.person.name,
      lines: [actor.person.title],
      recordIds: actor.recordIds,
      detail: {
        kind: "entity",
        ref: { kind: "person", id: actor.person.personId },
      },
    };
  }
  if (selection.kind !== "campaign-poster") return base;
  const campaign = world.history.campaigns?.find(
    (entry) => entry.id === selection.campaignId,
  );
  if (!campaign || campaign.filedAt > world.currentDate) return base;
  const filing = world.history.events.find(
    (entry) => entry.id === campaign.filingEventId,
  );
  if (!filing || filing.visibility !== "public")
    return { ...base, status: "withheld" };
  const projection = projectCampaign(world, campaign.candidatePersonId);
  if (projection.campaignId !== campaign.id || !projection.officeTitle)
    return base;
  const ids = [
    campaign.id,
    filing.id,
    campaign.organizationId,
    campaign.contestId,
  ];
  const heading = `${projection.candidateName} — ${projection.officeTitle}`;
  put("candidate-name", projection.candidateName, "public-record", ids);
  if (projection.committeeName)
    put("campaign-name", projection.committeeName, "public-record", ids);
  put("document-body", heading, "public-record", ids);
  return {
    ...base,
    status: "bound",
    heading,
    masthead: projection.committeeName,
    lines: projection.electionDate
      ? [`Election: ${proseDate(projection.electionDate)}`]
      : [],
    dateLabel: projection.electionDate
      ? proseDate(projection.electionDate)
      : null,
    recordIds: ids,
    detail: {
      kind: "entity",
      ref: { kind: "organization", id: campaign.organizationId },
    },
  };
}

/** Reuses the existing slot access boundary. Layout never changes disclosure. */
export function livingSceneSurfacePayload(
  record: LivingSurfaceRecord,
): SurfacePayloadProvider {
  return (contentClass, slot) => {
    if (record.status === "withheld")
      return {
        withheld:
          "The selected record is not available to this viewer/context.",
      };
    const fact = record.projection.facts.get(
      contentClass as SceneSurfaceContentClass,
    );
    if (!fact)
      return record.projection.empty.has(
        contentClass as SceneSurfaceContentClass,
      )
        ? null
        : undefined;
    return accessClears(slot.information_access, fact.channel)
      ? fact.text
      : {
          withheld:
            "The surface access does not clear this record's disclosure channel.",
        };
  };
}
