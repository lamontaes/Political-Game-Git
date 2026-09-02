/**
 * External event source domain.
 *
 * PR #37's contract architecture is the survivor. It keeps the distinction
 * between a physical hazard, an administrative declaration or response, a
 * utility grid report and a public-health surveillance record — four things
 * that a naive "disaster event" model conflates.
 *
 * No occurrence rates live here. PR #38's invented `annualOccurrenceRate`
 * constants were discarded and not replaced; a source whose frequency has not
 * been derived from a committed artifact stays `unresolved_requires_research`.
 */
export * from "./types.js";
export * from "./registry.js";
export * from "./validation.js";
export * from "./routing.js";
