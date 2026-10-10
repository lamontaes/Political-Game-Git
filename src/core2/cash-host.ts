/** One immutable numeric snapshot and one actual-state cash host per world. */
import { parameterValues } from "./parameters";
import type { CashJournalHost } from "./journal-state";
import type { CoreState } from "./types";

const hosts = new WeakMap<CoreState, CashJournalHost>();

export function cashJournalHost(core: CoreState): CashJournalHost {
  let host = hosts.get(core);
  if (!host) {
    host = {
      state: core,
      parameters: Object.freeze(parameterValues(core.data.parameters)),
    };
    hosts.set(core, host);
  }
  return host;
}

export function cashJournalParameters(
  core: CoreState,
): Readonly<Record<string, number>> {
  return cashJournalHost(core).parameters;
}
