// Tests keep the full proof that no scheduled handler mutates its input.
// A global rather than an import: a setup file that imported the simulation
// would load it before a test's vi.mock could replace one of its modules.
(
  globalThis as { __civicDeepTransitionGuard?: boolean }
).__civicDeepTransitionGuard = true;
