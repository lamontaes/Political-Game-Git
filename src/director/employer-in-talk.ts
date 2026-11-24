// How a public employer is said in talk (Words lead ruling, Nov 15, 2026,
// /mnt/project-files/words-lead/public-employer-said-in-talk.md): the
// government of the talk's own place by its class ("the state", "the
// county"), any other by its full name. Read from the organization's record
// and the two people's places; no place is named here. The Journal keeps its
// own forms (employerSaid).
import { corePlaceStateIdentities } from "../core2/place-lookup";
import { placeStateKey } from "../core2/place-map";
import { lawChain } from "../core2/modules/laws";
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import { ownGovernmentSaid } from "../english/said-as";

interface GovernmentRecord {
  readonly kind: string;
  readonly name: string;
  readonly classification?: string;
  readonly governmentFacts?: Readonly<Record<string, unknown>>;
}

/** The town this world is played in, which is every county and municipal government's own place. */
function playedTown(core: Readonly<CoreState>): string | null {
  try {
    return lawChain(coreAPI(core as CoreState)).townPlaceId ?? null;
  } catch {
    return null;
  }
}

/**
 * A government employer as said in talk between two people, or null where the
 * employer is not a government this reader says by class (a department, an
 * office or any other keeps its name).
 */
export function employerInTalk(
  core: Readonly<CoreState>,
  org: GovernmentRecord,
  speakerId: PersonId,
  listenerId: PersonId,
): string | null {
  const speaker = core.people.get(speakerId);
  const listener = core.people.get(listenerId);
  if (!speaker || !listener) return null;
  const key = org.governmentFacts?.governmentKey;
  const town = playedTown(core);
  const bothHere =
    !!town && speaker.placeId === town && listener.placeId === town;
  if (org.kind === "government-treasury" && typeof key === "string") {
    const state = corePlaceStateIdentities().find(
      (identity) => identity.jurisdictionKey === key,
    );
    if (state) {
      const own =
        placeStateKey(speaker.placeId) === key &&
        placeStateKey(listener.placeId) === key;
      // Another state's government keeps the name its record carries: nobody
      // who lives in the played town works for one, so no talk says it.
      return own
        ? ownGovernmentSaid({
            kind: "state",
            level: state.levelWord,
            key: state.jurisdictionKey,
          })
        : null;
    }
    // A town's or county's treasury: its government is the one whose record
    // names it ("Village of X treasury").
    return bothHere
      ? ownGovernmentSaid({
          kind: "local",
          name: org.name.replace(/\s+treasury$/i, ""),
        })
      : null;
  }
  if (!bothHere) return null;
  if (
    org.classification === "service:municipal-government" ||
    org.classification === "service:county-government"
  )
    return ownGovernmentSaid({ kind: "local", name: org.name });
  return null;
}
