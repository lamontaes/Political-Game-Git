import {
  projectPublicInformationDigest,
  type PublicInformationDigest,
  type PublicInformationDigestItem,
} from "../simulation/public-information";
import type { EntityId, World } from "../simulation/types";
import type { CivicGlossaryEntry } from "./civic-glossary";
import { civicGlossaryEntry } from "./civic-glossary";

export interface PublicInformationPanelItem extends PublicInformationDigestItem {
  readonly civicReferences: readonly CivicGlossaryEntry[];
}

/** Exact props payload UI-core can register in its chosen global placement. */
export interface PublicInformationPanelModel {
  readonly digest: PublicInformationDigest;
  readonly items: readonly PublicInformationPanelItem[];
}

export function projectPublicInformationPanel(
  world: World,
  jurisdictionId?: EntityId | null,
): PublicInformationPanelModel {
  const digest = projectPublicInformationDigest(world, jurisdictionId);
  return {
    digest,
    items: digest.items.map((item) => ({
      ...item,
      civicReferences: conceptIdsFor(item, world)
        .map(civicGlossaryEntry)
        .filter((entry): entry is CivicGlossaryEntry => entry !== null),
    })),
  };
}

/**
 * ENV adapter: one canonical lead item becomes the `headline` surface fact.
 * Geometry remains wholly owned by the scene slot and its access declaration.
 */
export function projectPublicInformationHeadline(
  world: World,
  jurisdictionId?: EntityId | null,
): {
  readonly text: string;
  readonly publicationId: EntityId;
  readonly sourceEventId: EntityId;
} | null {
  const lead = projectPublicInformationDigest(world, jurisdictionId).items[0];
  return lead
    ? {
        text: lead.headline,
        publicationId: lead.publicationId,
        sourceEventId: lead.sourceEventId,
      }
    : null;
}

function conceptIdsFor(
  item: PublicInformationDigestItem,
  world: World,
): readonly string[] {
  if (item.kind === "recorded-vote") {
    return ["recorded-vote", "published-information"];
  }
  if (item.kind === "legislative-development") {
    const action = (world.history.legislativeActions ?? []).find(
      (candidate) => candidate.eventId === item.sourceEventId,
    );
    return action?.kind === "referred"
      ? ["committee-referral", "published-information"]
      : ["published-information"];
  }
  const sourceEvent = world.history.events.find(
    (event) => event.id === item.sourceEventId,
  );
  if (sourceEvent?.type === "press.story-published") {
    const terms = ["on-record", "on-background", "off-record"].find((term) =>
      sourceEvent.tags.includes(`press.terms:${term}`),
    );
    return terms ? [terms, "published-information"] : ["published-information"];
  }
  return ["published-information"];
}
