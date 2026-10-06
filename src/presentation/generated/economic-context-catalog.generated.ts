// Catalog of locked authored economic-context inputs. Rebuild from accepted source exports.
import context from "./economic-context-lexington.json" with { type: "json" };
export const GENERATED_ECONOMIC_CONTEXTS = [context] as const;
