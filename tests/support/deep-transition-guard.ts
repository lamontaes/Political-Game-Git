// Tests keep the full proof that no scheduled handler mutates its input.
// A global rather than an import: a setup file that imported the simulation
// would load it before a test's vi.mock could replace one of its modules.
(
  globalThis as { __civicDeepTransitionGuard?: boolean }
).__civicDeepTransitionGuard = true;

// Tests also keep the full record-by-record check that a long history list
// only grew before its lookup index follows it (history-index.ts).
(
  globalThis as { __civicFullHistoryPrefixCheck?: boolean }
).__civicFullHistoryPrefixCheck = true;
