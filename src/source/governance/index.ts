/**
 * Governance / jurisdiction-profile source domain.
 *
 * Runtime barrel. The synthetic jurisdiction fixtures under `__fixtures__/`
 * are deliberately NOT exported here.
 *
 * PR #41 exported them from `src/simulation/index.ts`, which put four invented
 * jurisdictions ("Synthetic Testing Framework Authority", example.gov
 * citations) one import away from any consumer of the simulation barrel. A
 * fixture that ships through a runtime export eventually gets read as data.
 * Tests import them by their explicit path; production code cannot reach them.
 */
export * from "./types.js";
export * from "./validator.js";
export * from "./census-crosswalk.js";
