import { afterAll, beforeAll } from "vitest";

import { setWorldIntegrityCheckMode } from "../../src/simulation/world-integrity-changed";
import type { WorldIntegrityCheckMode } from "../../src/simulation/world-integrity-changed";

/**
 * Test fixture: run this file under the full World check.
 *
 * Play and the default test run check what a write changed
 * (`world-integrity-changed.ts`), and a writer checks its own inputs. A test
 * that proves the engine refuses a corrupted or rule-breaking World needs the
 * full check, the authority that walks every record. Calling this at the top
 * of such a file opts the whole file in and restores the mode afterwards.
 */
export function useFullWorldIntegrity(): void {
  let previous: WorldIntegrityCheckMode = "changed";
  beforeAll(() => {
    previous = setWorldIntegrityCheckMode("full");
  });
  afterAll(() => {
    setWorldIntegrityCheckMode(previous);
  });
}
