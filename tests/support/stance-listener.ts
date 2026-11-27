import { registerModule } from "../../src/core2/state";
import type { CoreModule, CoreState } from "../../src/core2/types";

let installed = 0;

/** Hears every stance move in a world the way an engine's `stanceListener` field does, from the day it is installed. */
export function listenToStances(
  core: CoreState,
  listener: NonNullable<CoreModule["stanceListener"]>,
): void {
  installed += 1;
  registerModule(core, {
    id: `test-stance-listener-${installed}`,
    stanceListener: listener,
  });
}
