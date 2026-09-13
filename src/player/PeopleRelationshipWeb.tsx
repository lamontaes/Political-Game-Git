import {
  layoutRelationshipWeb,
  projectRelationshipWeb,
  type LaidOutNode,
} from "../presentation/relationship-web";
import {
  filterDirectory,
  projectPeopleDirectory,
} from "../presentation/people-directory";
import type { PersonCategory } from "../presentation/people-directory";
import type { EntityId, World } from "../simulation";
import "./people-web.css";

/**
 * The default People drawing: known connections around the selected person.
 *
 * Positions come from a deterministic layout, not a physics engine. Search dims
 * unmatched nodes instead of rearranging them. The rest of the known people
 * remain available through expansion and through the list alternative.
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
  const layout = layoutRelationshipWeb(web, expanded);
  const directory = projectPeopleDirectory(world, playerId);
  const matches = new Set(
    filterDirectory(directory, category, query).map((row) => row.personId),
  );
  matches.add(playerId);
  const nodeById = new Map(layout.nodes.map((node) => [node.personId, node]));

  return (
    <svg
      className="pg-relationship-web"
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      role="img"
      aria-label="Relationship web"
      data-testid="people-relationship-web"
    >
      {layout.edges.map((edge) => {
        const from = nodeById.get(edge.fromId);
        const to = nodeById.get(edge.toId);
        if (!from || !to) return null;
        return (
          <line
            key={`${edge.fromId}:${edge.toId}:${edge.kind}`}
            className="pg-relationship-web-edge"
            data-kind={edge.kind}
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
          node={node}
          matched={query.trim().length === 0 || matches.has(node.personId)}
          focused={node.personId === focusId}
          onSelect={onSelect}
        />
      ))}
    </svg>
  );
}

function WebNode({
  node,
  matched,
  focused,
  onSelect,
}: {
  readonly node: LaidOutNode;
  readonly matched: boolean;
  readonly focused: boolean;
  readonly onSelect: (personId: EntityId) => void;
}) {
  const label = node.isPlayer ? "You" : node.name;
  return (
    <g
      className="pg-relationship-web-node"
      transform={`translate(${node.x} ${node.y})`}
      data-focus={focused ? "true" : "false"}
      data-match={matched ? "true" : "false"}
      data-testid={`people-web-node-${node.personId}`}
    >
      <title>
        {node.isPlayer
          ? "You"
          : `${node.name}${node.relationship ? ` — ${node.relationship}` : ""}`}
      </title>
      <circle
        r={focused ? 16 : 12}
        role="button"
        tabIndex={0}
        aria-label={label}
        onClick={() => onSelect(node.personId)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onSelect(node.personId);
          }
        }}
      />
      <text x={0} y={28} textAnchor="middle">
        {label.length > 18 ? `${label.slice(0, 16)}…` : label}
      </text>
    </g>
  );
}
