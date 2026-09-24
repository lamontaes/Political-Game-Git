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
  /** Whether the ring leaves room to print the name without overlapping. */
  readonly labeled: boolean;
}

export interface RelationshipWebLayout {
  readonly width: number;
  readonly height: number;
  readonly nodes: readonly LaidOutNode[];
  readonly edges: readonly RelationshipEdge[];
  /** People in view who did not fit in the drawing; the list shows them. */
  readonly hiddenCount: number;
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
  /*
   * Public positions are policy stances, not employment or office records.
   * The current-work query already applies the canonical date and active-status
   * rules; the directory has already limited this projection to people the
   * player is allowed to know about.
   */
  const roles = [
    ...new Set(
      activeWorkRelationshipsAt(world, personId).map(
        (entry) => entry.role.title,
      ),
    ),
  ];
  return roles.length > 0 ? roles.join("; ") : null;
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
 * `focusId` is who the layout should treat as the center: the selected person
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
          : `On the record together, most recently ${readableDate(summary.lastInteractionAt)}`,
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

export interface RecordedConnection {
  /** The player and the selected person, when a record joins them; else empty. */
  readonly personIds: ReadonlySet<EntityId>;
  /** The web's own record-backed edges between the two, best first. */
  readonly edges: readonly RelationshipEdge[];
}

/**
 * How the player knows the selected person, from records only.
 *
 * This replaces an "introduction" highlight that lit the two people named in
 * their first shared interaction. Interactions are always a pair, so it could
 * never show an introducer, and no record in the World says that anybody
 * introduced anybody. What the records do establish is the direct edge the web
 * already draws — family, household, work, politics, or a written exchange —
 * so that is the answer, with that edge's own label. When no record joins them
 * directly the answer is empty; no chain through third people is inferred.
 */
export function recordedConnection(
  web: RelationshipWeb,
  playerId: EntityId,
  focusId: EntityId,
): RecordedConnection {
  if (playerId === focusId) return { personIds: new Set(), edges: [] };
  const edges = web.edges
    .filter(
      (edge) =>
        (edge.fromId === playerId && edge.toId === focusId) ||
        (edge.fromId === focusId && edge.toId === playerId),
    )
    .sort((left, right) => EDGE_RANK[left.kind] - EDGE_RANK[right.kind]);
  return {
    personIds: edges.length > 0 ? new Set([playerId, focusId]) : new Set(),
    edges,
  };
}

export function relationshipEdgeKey(edge: RelationshipEdge): string {
  return `${edge.fromId}:${edge.toId}:${edge.kind}`;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** A stored IsoDate as a reader writes it. Storage keeps the ISO value. */
export function readableDate(date: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const month = match ? MONTH_NAMES[Number(match[2]) - 1] : undefined;
  return match && month ? `${month} ${Number(match[3])}, ${match[1]}` : date;
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
 *
 * `alsoAround` keeps a second person's neighbors on the drawing. The People
 * surface passes the player, so choosing somebody at the edge of the web
 * centers them without collapsing everyone else the player knows to a pair.
 */
export function neighborhoodIds(
  web: RelationshipWeb,
  expanded: boolean,
  alsoAround: EntityId | null = null,
): ReadonlySet<EntityId> {
  if (expanded) return new Set(web.nodes.map((node) => node.personId));
  const ids = new Set<EntityId>([web.focusId]);
  for (const center of alsoAround ? [web.focusId, alsoAround] : [web.focusId]) {
    if (!web.nodes.some((node) => node.personId === center)) continue;
    ids.add(center);
    for (const edge of neighborsOf(web, center)) {
      ids.add(otherPersonId(edge, center));
    }
  }
  return ids;
}

/** How far apart two faces must sit on a ring to be told apart. */
const WEB_FACE_SPACING = 58;
/** How far apart they must sit for their names to print without touching. */
const WEB_LABEL_SPACING = 120;
/** Room kept between the outermost ring and the drawing's edge, for a name. */
const WEB_EDGE_MARGIN = 44;
/**
 * The rings, as shares of the room between the center and that margin. Named
 * faces need a name's height between rings, so they get two rings; faces
 * alone fit three.
 */
const WEB_NAMED_RING_SCALES: readonly number[] = [0.5, 1];
const WEB_FACE_RING_SCALES: readonly number[] = [0.45, 0.72, 1];

export function layoutRelationshipWeb(
  web: RelationshipWeb,
  expanded: boolean,
  width = 640,
  height = 420,
  alsoAround: EntityId | null = null,
): RelationshipWebLayout {
  const visible = neighborhoodIds(web, expanded, alsoAround);
  const cx = width / 2;
  const cy = height / 2;

  const edgeToFocus = new Map<EntityId, RelationshipEdgeKind>();
  for (const edge of web.edges) {
    const other =
      edge.fromId === web.focusId
        ? edge.toId
        : edge.toId === web.focusId
          ? edge.fromId
          : null;
    if (other === null) continue;
    const known = edgeToFocus.get(other);
    if (known === undefined || EDGE_RANK[edge.kind] < EDGE_RANK[known]) {
      edgeToFocus.set(other, edge.kind);
    }
  }

  // Closest first: the people joined to the center, by how they are joined,
  // then everybody else. Names break ties so the drawing is the same each time.
  const byName = new Map(web.nodes.map((node) => [node.personId, node.name]));
  const ranked = web.nodes
    .filter(
      (node) => visible.has(node.personId) && node.personId !== web.focusId,
    )
    .map((node) => node.personId)
    .sort((left, right) => {
      const leftRank =
        EDGE_RANK[edgeToFocus.get(left) ?? "acquaintance"] +
        (edgeToFocus.has(left) ? 0 : 10);
      const rightRank =
        EDGE_RANK[edgeToFocus.get(right) ?? "acquaintance"] +
        (edgeToFocus.has(right) ? 0 : 10);
      if (leftRank !== rightRank) return leftRank - rightRank;
      return (byName.get(left) ?? "").localeCompare(byName.get(right) ?? "");
    });

  /*
   * Rings sized to what fits. Each ring is an ellipse that uses the drawing's
   * width, holds as many faces as its length allows at WEB_FACE_SPACING, and
   * prints names only when its faces are at least WEB_LABEL_SPACING apart.
   * Whoever does not fit is counted rather than squeezed in: a ring of two
   * hundred overlapping faces told the player nothing (Texas House playtest,
   * 2026-09-23).
   */
  const shorter = Math.min(width, height);
  const ringsAt = (scales: readonly number[]) =>
    scales
      .map((scale) => ({
        rx: (width / 2 - WEB_EDGE_MARGIN) * scale,
        ry: (height / 2 - WEB_EDGE_MARGIN) * scale,
      }))
      .filter((ring) => ring.ry > shorter * 0.1);
  const perimeter = (rx: number, ry: number) =>
    Math.PI * (3 * (rx + ry) - Math.sqrt((3 * rx + ry) * (rx + 3 * ry)));

  const positions = new Map<EntityId, LaidOutNode>();
  const focus = web.nodes.find((node) => node.personId === web.focusId);
  if (focus) {
    positions.set(focus.personId, {
      ...focus,
      x: cx,
      y: cy,
      depth: 0,
      labeled: true,
    });
  }

  // Names for everybody when everybody fits at name spacing; faces only, and
  // more of them, when they do not.
  const namedRings = ringsAt(WEB_NAMED_RING_SCALES);
  const labeledRoom = namedRings.reduce(
    (sum, ring) =>
      sum + Math.floor(perimeter(ring.rx, ring.ry) / WEB_LABEL_SPACING),
    0,
  );
  const labeled = ranked.length <= labeledRoom;
  const rings = labeled ? namedRings : ringsAt(WEB_FACE_RING_SCALES);
  const lengths = rings.map((ring) => perimeter(ring.rx, ring.ry));
  const spacing = labeled ? WEB_LABEL_SPACING : WEB_FACE_SPACING;

  let next = 0;
  rings.forEach((ring, ringIndex) => {
    const capacity = Math.floor(lengths[ringIndex]! / spacing);
    const ids = ranked.slice(next, next + capacity);
    next += ids.length;
    if (ids.length === 0) return;
    ids.forEach((personId, index) => {
      const node = web.nodes.find((entry) => entry.personId === personId);
      if (!node) return;
      const angle =
        ((index + (ids.length < 4 ? hashAngle(personId) : 0.5)) / ids.length) *
          Math.PI *
          2 +
        ringIndex * 0.35;
      positions.set(personId, {
        ...node,
        x: cx + Math.cos(angle) * ring.rx,
        y: cy + Math.sin(angle) * ring.ry,
        depth: ringIndex === 0 ? 1 : 2,
        labeled,
      });
    });
  });

  const laid = [...positions.values()];
  const visibleEdges = web.edges.filter(
    (edge) => positions.has(edge.fromId) && positions.has(edge.toId),
  );

  return {
    width,
    height,
    nodes: laid,
    edges: visibleEdges,
    hiddenCount: ranked.length - next,
  };
}

export const EDGE_KIND_LABELS: Readonly<Record<RelationshipEdgeKind, string>> =
  {
    family: "Family",
    household: "Household",
    work: "Work",
    politics: "Politics",
    acquaintance: "On the record",
  };
