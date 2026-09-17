import {
  assignedReporter,
  dispositionsForLead,
  personName,
  storyLeads,
  type EntityId,
  type IsoDate,
  type World,
} from "../simulation";

/**
 * Published stories about the person the player controls, for the press desk.
 *
 * PRESS owns the records; this only gathers what it already wrote. A story is
 * shown with the byline the disposition recorded, and each publication keeps
 * its own hierarchy: the first edition, then the corrections appended to it in
 * the order they were published. A story with no recorded reporter has no
 * byline rather than an invented one.
 */

export interface PressStoryEditionInput {
  readonly publicationId: EntityId;
  readonly sequence: number;
  readonly outletName: string;
  readonly headline: string;
  readonly publishedAt: IsoDate;
  readonly correctsPublicationId: EntityId | null;
  readonly correctionNote: string | null;
  readonly bylineName: string | null;
}

export interface PressStoryCorrection {
  readonly publicationId: EntityId;
  readonly publishedAt: IsoDate;
  readonly headline: string;
  readonly note: string | null;
}

export interface PressStoryLine {
  readonly publicationId: EntityId;
  readonly outletName: string;
  readonly headline: string;
  readonly publishedAt: IsoDate;
  readonly bylineName: string | null;
  /** A note carried by this edition itself when its earlier edition is absent. */
  readonly correctionNote: string | null;
  readonly corrections: readonly PressStoryCorrection[];
}

/**
 * Groups editions into one line per first edition, newest first, with the
 * corrections of each edition oldest first.
 */
export function buildPressStoryLines(
  editions: readonly PressStoryEditionInput[],
): readonly PressStoryLine[] {
  const byId = new Map(
    editions.map((edition) => [edition.publicationId, edition]),
  );
  // Walks back to the first edition. A chain that points back at itself is not
  // something the desk writes; resolving it by sequence keeps grouping stable
  // rather than dependent on which edition was walked first.
  const rootOf = (edition: PressStoryEditionInput): PressStoryEditionInput => {
    const seen = new Set<EntityId>([edition.publicationId]);
    let earliest = edition;
    let current = edition;
    for (;;) {
      const parentId = current.correctsPublicationId;
      if (parentId === null || seen.has(parentId)) return earliest;
      const parent = byId.get(parentId);
      if (!parent) return earliest;
      seen.add(parentId);
      current = parent;
      if (parent.sequence < earliest.sequence) earliest = parent;
    }
  };
  const chains = new Map<EntityId, PressStoryEditionInput[]>();
  for (const edition of editions) {
    const root = rootOf(edition);
    const chain = chains.get(root.publicationId) ?? [];
    chain.push(edition);
    chains.set(root.publicationId, chain);
  }
  return [...chains.entries()]
    .map(([rootId, chain]) => {
      const ordered = [...chain].sort((a, b) => a.sequence - b.sequence);
      const root = byId.get(rootId)!;
      return {
        publicationId: root.publicationId,
        outletName: root.outletName,
        headline: root.headline,
        publishedAt: root.publishedAt,
        bylineName: root.bylineName,
        correctionNote: root.correctionNote,
        corrections: ordered
          .filter((edition) => edition.publicationId !== rootId)
          .map((edition) => ({
            publicationId: edition.publicationId,
            publishedAt: edition.publishedAt,
            headline: edition.headline,
            note: edition.correctionNote,
          })),
      };
    })
    .sort(
      (a, b) =>
        byId.get(b.publicationId)!.sequence -
        byId.get(a.publicationId)!.sequence,
    );
}

/** Stories the press published about this person, newest first. */
export function projectPressStoriesAbout(
  world: World,
  personId: EntityId,
): readonly PressStoryLine[] {
  const publications = world.history.publications ?? [];
  const bylines = new Map<EntityId, EntityId | null>();
  for (const lead of storyLeads(world)) {
    if (!lead.subjectPersonIds.includes(personId)) continue;
    for (const disposition of dispositionsForLead(world, lead.id)) {
      if (disposition.publicationId === null) continue;
      bylines.set(
        disposition.publicationId,
        disposition.reporterPersonId ?? assignedReporter(world, lead.id),
      );
    }
  }
  const editions = publications
    .filter((publication) => bylines.has(publication.id))
    .map((publication) => {
      const reporterPersonId = bylines.get(publication.id) ?? null;
      const reporter = reporterPersonId
        ? world.people[reporterPersonId]
        : undefined;
      return {
        publicationId: publication.id,
        sequence: publication.sequence,
        outletName: publication.outletName,
        headline: publication.headline,
        publishedAt: publication.publishedAt,
        correctsPublicationId: publication.correctsPublicationId,
        correctionNote: publication.correctionNote,
        bylineName: reporter ? personName(reporter) : null,
      };
    });
  return buildPressStoryLines(editions);
}
