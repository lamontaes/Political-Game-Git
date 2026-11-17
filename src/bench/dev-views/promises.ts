/**
 * Dev mode's promises on a person's card: every promise the promises engine
 * (src/core2/modules/promises.ts) holds that the person gave or is owed,
 * newest first, as the engine's own rows (made, last day, what would settle
 * it, how it ended and the record that ended it). Read only, never worked out
 * here; each id opens in the card's Trace box, which follows a promise to the
 * reply that made it and the record that ended it (dev-trace.ts).
 */
import type { DevView } from "../dev-views";
import { coreAPI, personOrFillIn } from "../../core2/state";
import { PROMISES_MODULE_ID, promisesOf } from "../../core2/modules/promises";
import type { CoreState } from "../../core2/types";

/** The promises one person gave or is owed, from the engine's rows. */
export function promisesOfPerson(core: CoreState, personId: string) {
  const person = personOrFillIn(core, personId);
  if (!person) throw new Error("No such person.");
  return {
    personId: person.id,
    date: core.date,
    promises: core.modules.has(PROMISES_MODULE_ID)
      ? promisesOf(coreAPI(core), person.id)
      : [],
  };
}

const view: DevView = {
  name: "promises",
  client: "dev-promises.mjs",
  labels: { title: "Promises", trace: "Trace" },
  routes: {
    "GET promises": ({ mode, q }) => promisesOfPerson(mode.core, q("id")),
  },
};
export default view;
