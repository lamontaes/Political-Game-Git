import {
  layoutRelationshipWeb,
  projectRelationshipWeb,
  recordedIntroductionHighlight,
  type LaidOutNode,
} from "../presentation/relationship-web";
import {
  filterDirectory,
  projectPeopleDirectory,
} from "../presentation/people-directory";
import type { PersonCategory } from "../presentation/people-directory";
import type { EntityId, World } from "../simulation";
import { PersonPortrait } from "./PersonPortrait";
import "./people-web.css";

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
  const introduction = recordedIntroductionHighlight(world, playerId, focusId);
  const categoryIds = new Set(
    filterDirectory(directory, category, "").map((row) => row.personId),
  );

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
        const introEdge =
          introduction.has(edge.fromId) && introduction.has(edge.toId);
        return (
          <line
            key={`${edge.fromId}:${edge.toId}:${edge.kind}`}
            className="pg-relationship-web-edge"
            data-kind={edge.kind}
            data-introduction={introEdge ? "true" : "false"}
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
          focused={node.personId === focusId}
          inCategory={category === "all" || categoryIds.has(node.personId)}
          introduction={introduction.has(node.personId)}
          onSelect={onSelect}
        />
      ))}
    </svg>
  );
}

function WebNode({
  world,
  node,
  matched,
  focused,
  inCategory,
  introduction,
  onSelect,
}: {
  readonly world: World;
  readonly node: LaidOutNode;
  readonly matched: boolean;
  readonly focused: boolean;
  readonly inCategory: boolean;
  readonly introduction: boolean;
  readonly onSelect: (personId: EntityId) => void;
}) {
  const label = node.isPlayer ? "You" : node.name;
  const size = focused ? 36 : 28;
  return (
    <g
      className="pg-relationship-web-node"
      transform={`translate(${node.x} ${node.y})`}
      data-focus={focused ? "true" : "false"}
      data-match={matched ? "true" : "false"}
      data-category={inCategory ? "true" : "false"}
      data-introduction={introduction ? "true" : "false"}
      data-testid={`people-web-node-${node.personId}`}
    >
      <title>
        {node.isPlayer
          ? "You"
          : `${node.name}${node.relationship ? ` — ${node.relationship}` : ""}`}
      </title>
      <circle
        r={size / 2 + 2}
        className="pg-relationship-web-ring"
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
      <foreignObject x={-size / 2} y={-size / 2} width={size} height={size}>
        <div
          xmlns="http://www.w3.org/1999/xhtml"
          className="pg-relationship-web-portrait"
        >
          <PersonPortrait world={world} personId={node.personId} size="small" />
        </div>
      </foreignObject>
      <text x={0} y={size / 2 + 14} textAnchor="middle">
        {label.length > 18 ? `${label.slice(0, 16)}…` : label}
      </text>
    </g>
  );
}
