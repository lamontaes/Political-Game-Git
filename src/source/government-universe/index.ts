/**
 * U.S. government-universe source layer.
 *
 * Answers one question from U.S. Census Bureau sources — the Census of
 * Governments, the Government Units Survey, and the Individual State
 * Descriptions: which governmental entities exist, of what class, organized
 * around what function.
 *
 * It deliberately answers no others. What offices an entity has, how they are
 * filled, and what powers they hold are legal facts belonging to the
 * jurisdiction-profile layer — see `existence-boundary.ts`.
 */

export * from "./types.js";
export * from "./census_id.js";
export * from "./authority_data.js";
export * from "./authority_index.js";
export * from "./normalizer.js";
export * from "./universe_data.js";
export * from "./sample_corpus.js";
export * from "./manifest_generator.js";
export * from "./query.js";
export * from "./existence-boundary.js";
