import {
  cloneIncidentDefinition,
  createSyntheticIncidentCatalog,
} from "./incident-catalog";
import type { IncidentCatalog } from "./types";

/**
 * The retired drawn mode, as an old save wrote it. A definition saved in that
 * mode is read as the current catalog's definition with the same id, or else
 * as a condition with its own rules, so the save opens; nothing is drawn.
 * Returns the same World when nothing needs it.
 */
export function retireDrawnIncidentModes<
  T extends { incidentCatalog: IncidentCatalog },
>(world: T): T {
  const definitions = world.incidentCatalog.definitions;
  const retired = Object.keys(definitions).filter(
    (id) => (definitions[id]!.occurrenceMode as string) === "probabilistic",
  );
  if (retired.length === 0) return world;
  const current = createSyntheticIncidentCatalog().definitions;
  return {
    ...world,
    incidentCatalog: {
      ...world.incidentCatalog,
      definitions: Object.fromEntries(
        Object.entries(definitions).map(([id, definition]) => [
          id,
          retired.includes(id)
            ? cloneIncidentDefinition(
                current[id] ?? { ...definition, occurrenceMode: "condition" },
              )
            : definition,
        ]),
      ),
    },
  };
}
