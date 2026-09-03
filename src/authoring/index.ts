/**
 * THE SCENE AUTHORING PIPELINE.
 *
 * Everything between "an approved picture of a room exists" and "the runtime
 * can put a person in it", expressed as pure, testable contracts.
 *
 * The modules, in the order a plate travels through them:
 *
 * 1. `asset-lineage`     — what a candidate master must declare about where it
 *                          came from before it counts as production cargo.
 * 2. `tier-plan`         — which rasters of the responsive ladder may honestly
 *                          be derived from it, and which may not.
 * 3. `scene-scaffold`    — a structured, exhaustively-incomplete place to
 *                          author the scene's geometry.
 * 4. `measured-geometry` — provenance-backed measurements of real rooms, as an
 *                          authoring aid rather than a runtime requirement.
 * 5. `semantic-context`  — the split between what the art depicts and what the
 *                          World currently calls it.
 * 6. `dynamic-surfaces`  — the line between baked decor and information the
 *                          simulation owns.
 * 7. `asset-bank`        — the batch QA schema an external reviewer fills in.
 * 8. `dynamic-components` — which runtime components a dynamic surface may host,
 *                          and what it draws when the simulation has nothing.
 * 9. `civic-symbols`     — flags, seals and arms as identities with citations,
 *                          where they mount, and what they may never be used for.
 * 10. `generation-queue`  — which modular-person parts are missing, and which
 *                          only look it.
 * 11. `external-packs`    — what a downloaded third-party pack is, legally and
 *                          technically, and whether either answer lets us use it.
 *
 * Nothing here reads a file, touches the DOM, or reaches the network. The
 * filesystem half lives under `scripts/art-asset-factory/`, and the developer
 * surface under `src/ui/SceneAuthoringProofView.tsx`.
 */

export * from "./asset-lineage";
export * from "./tier-plan";
export * from "./scene-scaffold";
export * from "./measured-geometry";
export * from "./semantic-context";
export * from "./dynamic-surfaces";
export * from "./asset-bank";
export * from "./civic-symbols";
export * from "./dynamic-components";
export * from "./external-packs";
export * from "./generation-queue";
export { toCanonicalJson } from "./canonical-json";
export * from "./fixtures/scene-families";
export * from "./fixtures/measured-geometry";
export * from "./fixtures/external-packs";
export * from "./fixtures/production-scene-families";
export * from "./fixtures/production-scenes";
export * from "./fixtures/dynamic-surface-authoring";
export * from "./fixtures/production-asset-bank";
export * from "./fixtures/generation-queue";
