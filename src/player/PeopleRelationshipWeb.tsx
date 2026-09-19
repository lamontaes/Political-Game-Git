import {
  EDGE_KIND_LABELS,
  layoutRelationshipWeb,
  neighborsOf,
  otherPersonId,
  projectRelationshipWeb,
  recordedConnection,
  relationshipEdgeKey,
  type LaidOutNode,
  type RelationshipEdgeKind,
} from "../presentation/relationship-web";
import {
  CATEGORY_LABELS,
  filterDirectory,
  projectPeopleDirectory,
} from "../presentation/people-directory";
import type { PersonCategory } from "../presentation/people-directory";
import type { EntityId, World } from "../simulation";
import { PersonPortrait } from "./PersonPortrait";
import "./people-web.css";

const EDGE_KIND_ORDER: readonly RelationshipEdgeKind[] = [
  "family",
  "household",
  "work",
  "politics",
  "acquaintance",
];

/**
 * The People web (UI FINISH).
 *
 * A face is the control: the whole node — portrait, ring and name — selects
 * the person, and the ring is the one keyboard stop. Selecting somebody lights
 * their own lines and the people at the other end, and says in words how the
 * player knows them, using only the record-backed edge between the two. A
 * category keeps its people in full color and dims the rest instead of
 * removing them. Nothing here adds a person, an edge or an introduction.
 */
export function PeopleRelationshipWeb({
  world,
  playerId,
  focusId,
  category,
  query,
  expanded,
  onSelect,
}: {
  readonly world: World;
  readonly playerId: EntityId;
  readonly focusId: EntityId;
  readonly category: PersonCategory | "all";
  readonly query: string;
  readonly expanded: boolean;
  readonly onSelect: (personId: EntityId) => void;
}) {
  const web = projectRelationshipWeb(world, playerId, focusId);
  const layout = layoutRelationshipWeb(web, expanded, 640, 460, playerId);
  const directory = projectPeopleDirectory(world, playerId);
  const matches = new Set(
    filterDirectory(directory, category, query).map((row) => row.personId),
  );
  matches.add(playerId);
  const nodeById = new Map(layout.nodes.map((node) => [node.personId, node]));
  const categoryIds = new Set(
    filterDirectory(directory, category, "").map((row) => row.personId),
  );
  const inCategory = (personId: EntityId) =>
    category === "all" || personId === playerId || categoryIds.has(personId);

  const selectedId = web.focusId !== playerId ? web.focusId : null;
  const selectedNode = selectedId ? nodeById.get(selectedId) : undefined;
  const connection = selectedId
    ? recordedConnection(web, playerId, selectedId)
    : null;
  const pathEdges = new Set(connection?.edges.map(relationshipEdgeKey) ?? []);
  const selectedEdges = selectedId ? neighborsOf(web, selectedId) : [];
  const selectedEdgeKeys = new Set(selectedEdges.map(relationshipEdgeKey));
  const connectedIds = new Set(
    selectedEdges.map((edge) => otherPersonId(edge, selectedId!)),
  );
  const kindsShown = EDGE_KIND_ORDER.filter((kind) =>
    layout.edges.some((edge) => edge.kind === kind),
  );

  let caption: string;
  if (selectedNode && connection) {
    caption =
      connection.edges.length > 0
        ? `How you know ${selectedNode.name} — ${connection.edges
            .map((edge) => edge.label)
            .join("; ")}.`
        : `No record connects you directly to ${selectedNode.name}. Their lines show the people you know who are connected to them.`;
  } else if (category !== "all") {
    caption = `${CATEGORY_LABELS[category]} are shown in full color; everyone else is dimmed.`;
  } else {
    caption = "Choose a face to see how you know them.";
  }

  return (
    <div className="pg-relationship-web-frame">
      <svg
        className="pg-relationship-web"
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        role="group"
        aria-label="Relationship web"
        aria-describedby="people-web-connection"
        data-testid="people-relationship-web"
        data-selected={selectedId ?? ""}
      >
        {layout.edges.map((edge) => {
          const from = nodeById.get(edge.fromId);
          const to = nodeById.get(edge.toId);
          if (!from || !to) return null;
          const key = relationshipEdgeKey(edge);
          return (
            <line
              key={key}
              className="pg-relationship-web-edge"
              data-kind={edge.kind}
              data-path={pathEdges.has(key) ? "true" : "false"}
              data-state={
                selectedId === null
                  ? "none"
                  : selectedEdgeKeys.has(key)
                    ? "selected"
                    : "other"
              }
              data-category={
                inCategory(edge.fromId) && inCategory(edge.toId)
                  ? "true"
                  : "false"
              }
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
            >
              <title>{edge.label}</title>
            </line>
          );
        })}
        {layout.nodes.map((node) => (
          <WebNode
            key={node.personId}
            world={world}
            node={node}
            matched={query.trim().length === 0 || matches.has(node.personId)}
            focused={node.personId === web.focusId}
            selected={node.personId === selectedId}
            connected={connectedIds.has(node.personId)}
            dimmedBySelection={
              selectedId !== null &&
              node.personId !== selectedId &&
              !connectedIds.has(node.personId)
            }
            inCategory={inCategory(node.personId)}
            onPath={connection?.personIds.has(node.personId) ?? false}
            onSelect={onSelect}
          />
        ))}
      </svg>
      <p
        className="pg-relationship-web-caption"
        id="people-web-connection"
        data-testid="people-web-connection"
        aria-live="polite"
      >
        {caption}
      </p>
      {kindsShown.length > 0 ? (
        <ul
          className="pg-relationship-web-legend"
          aria-label="What the lines mean"
          data-testid="people-web-legend"
        >
          {kindsShown.map((kind) => (
            <li key={kind} data-kind={kind}>
              <span className="pg-relationship-web-swatch" aria-hidden="true" />
              {EDGE_KIND_LABELS[kind]}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function WebNode({
  world,
  node,
  matched,
  focused,
  selected,
  connected,
  dimmedBySelection,
  inCategory,
  onPath,
  onSelect,
}: {
  readonly world: World;
  readonly node: LaidOutNode;
  readonly matched: boolean;
  readonly focused: boolean;
  readonly selected: boolean;
  readonly connected: boolean;
  readonly dimmedBySelection: boolean;
  readonly inCategory: boolean;
  readonly onPath: boolean;
  readonly onSelect: (personId: EntityId) => void;
}) {
  const label = node.isPlayer ? "You" : node.name;
  const size = focused ? 52 : 40;
  const described = node.isPlayer
    ? "You"
    : `${node.name}${node.relationship ? `, ${node.relationship}` : ""}`;
  const shownLabel = label.length > 20 ? `${label.slice(0, 18)}…` : label;
  // An estimate of the rendered label, generous enough to cover it.
  const labelWidth = Math.max(size, shownLabel.length * 7.5 + 12);
  return (
    <g
      className="pg-relationship-web-node"
      transform={`translate(${node.x} ${node.y})`}
      data-focus={focused ? "true" : "false"}
      data-selected={selected ? "true" : "false"}
      data-connected={connected ? "true" : "false"}
      data-dimmed={dimmedBySelection ? "true" : "false"}
      data-match={matched ? "true" : "false"}
      data-category={inCategory ? "true" : "false"}
      data-path={onPath ? "true" : "false"}
      data-testid={`people-web-node-${node.personId}`}
      onClick={() => onSelect(node.personId)}
    >
      <title>{described}</title>
      <circle
        r={size / 2 + 4}
        className="pg-relationship-web-ring"
        role="button"
        tabIndex={0}
        aria-label={described}
        aria-pressed={selected}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onSelect(node.personId);
          }
        }}
      />
      <foreignObject
        pointerEvents="none"
        x={-size / 2}
        y={-size / 2}
        width={size}
        height={size}
      >
        <div className="pg-relationship-web-portrait">
          <PersonPortrait world={world} personId={node.personId} size="small" />
        </div>
      </foreignObject>
      {/*
        The whole name is a target. Safari hit-tests SVG text by glyph, so a
        click between letters would fall through; this box catches it.
      */}
      <rect
        className="pg-relationship-web-label-hit"
        data-testid={`people-web-label-${node.personId}`}
        x={-labelWidth / 2}
        y={size / 2 + 5}
        width={labelWidth}
        height={17}
      />
      <text x={0} y={size / 2 + 17} textAnchor="middle">
        {shownLabel}
      </text>
    </g>
  );
}
