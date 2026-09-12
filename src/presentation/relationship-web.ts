import {
  activeOrganizationParticipationsAt,
  activeWorkRelationshipsAt,
  campaigns,
  currentLifeCutoff,
  deriveRelationshipSummary,
  describePersonContext,
  electionContestById,
  isPersonAliveAt,
  kinshipRelationshipsAt,
  organizationProfileAt,
  peopleInHouseholdAt,
  personName,
  relationshipHistory,
  type EntityId,
  type World,
} from "../simulation";
import { householdIdFor } from "./person-dossier";
import { projectPeopleDirectory } from "./people-directory";

/**
 * A read-only projection of relationships the player may actually see.
 *
 * This is not a social engine. Nodes are the player plus people the existing
 * directory already has a legitimate reason to list. Edges name the record that
 * supports them — kinship, shared housing, shared work, a political connection,
 * or a written interaction — and they never promote one of those into another.
 * Sharing an organization is not friendship. Sharing a house is not kinship.
 * Raw World kinship between two people the player has no knowledge of is not
 * drawn. There is no score and no store.
 */

export type RelationshipEdgeKind =
  "family" | "household" | "work" | "politics" | "acquaintance";

export type RelationshipVisibility = "known" | "record" | "reported";

export interface RelationshipNode {
  readonly personId: EntityId;
  readonly name: string;
  readonly isPlayer: boolean;
  readonly alive: boolean;
  /** "your mother", when a record establishes one. Never inferred. */
  readonly relationship: string | null;
  /** A current public or personally known role, or null when none is known. */
  readonly role: string | null;
}

export interface RelationshipEdge {
  readonly fromId: EntityId;
  readonly toId: EntityId;
  readonly kind: RelationshipEdgeKind;
  readonly visibility: RelationshipVisibility;
  readonly label: string;
}

export interface RelationshipWeb {
  readonly focusId: EntityId;
  readonly nodes: readonly RelationshipNode[];
  readonly edges: readonly RelationshipEdge[];
}

export interface LaidOutNode extends RelationshipNode {
  readonly x: number;
  readonly y: number;
  readonly depth: 0 | 1 | 2;
}

export interface RelationshipWebLayout {
  readonly width: number;
  readonly height: number;
  readonly nodes: readonly LaidOutNode[];
  readonly edges: readonly RelationshipEdge[];
}

const EDGE_RANK: Readonly<Record<RelationshipEdgeKind, number>> = {
  family: 0,
  household: 1,
  work: 2,
  politics: 3,
  acquaintance: 4,
};

function personAlive(world: World, personId: EntityId): boolean {
  if (!world.people[personId]) return false;
  return isPersonAliveAt(world, personId, currentLifeCutoff(world));
}

function pairKey(left: EntityId, right: EntityId): string {
  return left < right ? `${left}|${right}` : `${right}|${left}`;
}

function orderedPair(
  left: EntityId,
  right: EntityId,
): readonly [EntityId, EntityId] {
  return left < right ? [left, right] : [right, left];
}

function hashAngle(id: string): number {
  let hash = 2166136261;
  for (let index = 0; index < id.length; index += 1) {
    hash ^= id.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 0xffffffff;
}

function knownRole(world: World, personId: EntityId): string | null {
  const position = [...world.history.publicPositions]
    .reverse()
    .find(
      (record) => record.personId === personId && record.audience === "public",
    );
  return position?.statement ?? null;
}

function describeWorkOrg(
  world: World,
  organizationId: EntityId,
): string | null {
  return organizationProfileAt(world, organizationId)?.name ?? null;
}

/**
 * Builds the visible web, or an empty player-only web when this life knows
 * nobody else.
 *
 * `focusId` is who the layout should treat as the centre: the selected person
 * when the player has chosen one, otherwise the player. A focus the projection
 * cannot show falls back to the player rather than inventing a node.
 */
export function projectRelationshipWeb(
  world: World,
  playerId: EntityId,
  focusId: EntityId = playerId,
): RelationshipWeb {
  const directory = projectPeopleDirectory(world, playerId);
  const knownIds = new Set<EntityId>([playerId]);
  for (const row of directory.people) knownIds.add(row.personId);

  const nodes: RelationshipNode[] = [];
  for (const personId of knownIds) {
    const person = world.people[personId];
    if (!person) continue;
    const context =
      personId === playerId
        ? null
        : describePersonContext(world, playerId, personId);
    nodes.push({
      personId,
      name: personName(person),
      isPlayer: personId === playerId,
      alive: personAlive(world, personId),
      relationship: context?.relationship ?? null,
      role: knownRole(world, personId),
    });
  }
  nodes.sort((left, right) => {
    if (left.isPlayer !== right.isPlayer) return left.isPlayer ? -1 : 1;
    return left.name.localeCompare(right.name);
  });

  const best = new Map<string, RelationshipEdge>();
  const remember = (edge: RelationshipEdge) => {
    if (edge.fromId === edge.toId) return;
    if (!knownIds.has(edge.fromId) || !knownIds.has(edge.toId)) return;
    const [fromId, toId] = orderedPair(edge.fromId, edge.toId);
    const key = pairKey(fromId, toId);
    const next: RelationshipEdge = { ...edge, fromId, toId };
    const existing = best.get(key);
    if (!existing || EDGE_RANK[next.kind] < EDGE_RANK[existing.kind]) {
      best.set(key, next);
    }
  };

  const playerHouseholdId = householdIdFor(world, playerId);
  const householdMembers =
    playerHouseholdId === null
      ? []
      : peopleInHouseholdAt(world, playerHouseholdId);

  for (const kinship of kinshipRelationshipsAt(world, playerId)) {
    for (const otherId of kinship.personIds) {
      if (otherId === playerId) continue;
      const context = describePersonContext(world, playerId, otherId);
      remember({
        fromId: playerId,
        toId: otherId,
        kind: "family",
        visibility: "known",
        label: context?.relationship ?? "Family",
      });
    }
  }

  for (let index = 0; index < householdMembers.length; index += 1) {
    const left = householdMembers[index];
    if (!left) continue;
    for (let other = index + 1; other < householdMembers.length; other += 1) {
      const right = householdMembers[other];
      if (!right) continue;
      remember({
        fromId: left,
        toId: right,
        kind: "household",
        visibility: "known",
        label: "Same household",
      });
    }
  }

  const workOrganizations = new Set(
    activeWorkRelationshipsAt(world, playerId)
      .map((entry) => entry.relationship.organizationId)
      .filter((id): id is EntityId => id !== null),
  );
  const civicOrganizations = new Set(
    activeOrganizationParticipationsAt(world, playerId).map(
      (participation) => participation.participation.organizationId,
    ),
  );

  for (const organizationId of workOrganizations) {
    const colleagues: EntityId[] = [playerId];
    for (const otherId of knownIds) {
      if (otherId === playerId) continue;
      const shares = activeWorkRelationshipsAt(world, otherId).some(
        (entry) => entry.relationship.organizationId === organizationId,
      );
      if (shares) colleagues.push(otherId);
    }
    const orgName = describeWorkOrg(world, organizationId);
    for (let index = 0; index < colleagues.length; index += 1) {
      const left = colleagues[index];
      if (!left) continue;
      for (let other = index + 1; other < colleagues.length; other += 1) {
        const right = colleagues[other];
        if (!right) continue;
        remember({
          fromId: left,
          toId: right,
          kind: "work",
          visibility: "known",
          label: orgName ? `Work at ${orgName}` : "Work",
        });
      }
    }
  }

  for (const organizationId of civicOrganizations) {
    const members: EntityId[] = [playerId];
    for (const otherId of knownIds) {
      if (otherId === playerId) continue;
      const shares = activeOrganizationParticipationsAt(world, otherId).some(
        (participation) =>
          participation.participation.organizationId === organizationId,
      );
      if (shares) members.push(otherId);
    }
    const orgName = describeWorkOrg(world, organizationId);
    for (let index = 0; index < members.length; index += 1) {
      const left = members[index];
      if (!left) continue;
      for (let other = index + 1; other < members.length; other += 1) {
        const right = members[other];
        if (!right) continue;
        remember({
          fromId: left,
          toId: right,
          kind: "politics",
          visibility: "known",
          label: orgName ? `In ${orgName}` : "Political connection",
        });
      }
    }
  }

  for (const campaign of campaigns(world)) {
    if (campaign.candidatePersonId !== playerId) continue;
    const contest = electionContestById(world, campaign.contestId);
    if (!contest) continue;
    for (const candidateId of contest.candidatePersonIds) {
      if (candidateId === playerId || !knownIds.has(candidateId)) continue;
      remember({
        fromId: playerId,
        toId: candidateId,
        kind: "politics",
        visibility: "record",
        label: `Ran against you for ${contest.office.title}`,
      });
    }
  }

  for (const otherId of knownIds) {
    if (otherId === playerId) continue;
    const summary = deriveRelationshipSummary(world, playerId, otherId);
    if (summary.interactionCount === 0) continue;
    remember({
      fromId: playerId,
      toId: otherId,
      kind: "acquaintance",
      visibility: "known",
      label:
        summary.lastInteractionAt === null
          ? "On the record together"
          : `Last on the record: ${summary.lastInteractionAt}`,
    });
  }

  for (const interaction of relationshipHistory(world, playerId)) {
    const others = interaction.personIds.filter(
      (personId) => personId !== playerId && knownIds.has(personId),
    );
    if (others.length < 2) continue;
    for (let index = 0; index < others.length; index += 1) {
      const left = others[index];
      if (!left) continue;
      for (let other = index + 1; other < others.length; other += 1) {
        const right = others[other];
        if (!right) continue;
        remember({
          fromId: left,
          toId: right,
          kind: "acquaintance",
          visibility: "reported",
          label: "Named together in a recorded exchange",
        });
      }
    }
  }

  const resolvedFocus = nodes.some((node) => node.personId === focusId)
    ? focusId
    : playerId;

  return {
    focusId: resolvedFocus,
    nodes,
    edges: [...best.values()],
  };
}

export function neighborsOf(
  web: RelationshipWeb,
  personId: EntityId,
): readonly RelationshipEdge[] {
  return web.edges.filter(
    (edge) => edge.fromId === personId || edge.toId === personId,
  );
}

export function otherPersonId(
  edge: RelationshipEdge,
  personId: EntityId,
): EntityId {
  return edge.fromId === personId ? edge.toId : edge.fromId;
}

/**
 * Who belongs in the first drawing of the web.
 *
 * Depth 0 is the focus. Depth 1 is everyone with a visible edge to them.
 * Expansion adds every remaining known person rather than capping the life
 * into a permanent small world. Search highlighting does not change membership.
 */
export function neighborhoodIds(
  web: RelationshipWeb,
  expanded: boolean,
): ReadonlySet<EntityId> {
  if (expanded) return new Set(web.nodes.map((node) => node.personId));
  const ids = new Set<EntityId>([web.focusId]);
  for (const edge of neighborsOf(web, web.focusId)) {
    ids.add(otherPersonId(edge, web.focusId));
  }
  return ids;
}

export function layoutRelationshipWeb(
  web: RelationshipWeb,
  expanded: boolean,
  width = 640,
  height = 420,
): RelationshipWebLayout {
  const visible = neighborhoodIds(web, expanded);
  const cx = width / 2;
  const cy = height / 2;
  const inner = Math.min(width, height) * 0.32;
  const outer = Math.min(width, height) * 0.44;

  const innerIds: EntityId[] = [];
  const outerIds: EntityId[] = [];
  for (const node of web.nodes) {
    if (!visible.has(node.personId) || node.personId === web.focusId) continue;
    const adjacent = web.edges.some(
      (edge) =>
        (edge.fromId === web.focusId && edge.toId === node.personId) ||
        (edge.toId === web.focusId && edge.fromId === node.personId),
    );
    if (adjacent) innerIds.push(node.personId);
    else outerIds.push(node.personId);
  }
  innerIds.sort();
  outerIds.sort();

  const positions = new Map<EntityId, LaidOutNode>();
  const focus = web.nodes.find((node) => node.personId === web.focusId);
  if (focus) {
    positions.set(focus.personId, { ...focus, x: cx, y: cy, depth: 0 });
  }

  const placeRing = (
    ids: readonly EntityId[],
    radius: number,
    depth: 1 | 2,
  ) => {
    ids.forEach((personId, index) => {
      const node = web.nodes.find((entry) => entry.personId === personId);
      if (!node) return;
      const angle =
        ((index + hashAngle(personId)) / Math.max(ids.length, 1)) * Math.PI * 2;
      positions.set(personId, {
        ...node,
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
        depth,
      });
    });
  };

  placeRing(innerIds, inner, 1);
  placeRing(outerIds, outer, 2);

  const laid = [...positions.values()];
  const visibleEdges = web.edges.filter(
    (edge) => positions.has(edge.fromId) && positions.has(edge.toId),
  );

  return { width, height, nodes: laid, edges: visibleEdges };
}

export const EDGE_KIND_LABELS: Readonly<Record<RelationshipEdgeKind, string>> =
  {
    family: "Family",
    household: "Household",
    work: "Work",
    politics: "Politics",
    acquaintance: "On the record",
  };
