import {
  characterHistoryContextPersonId,
  createCharacterHistoryContextPeople,
} from "../character-history";
import { makeIsoDate } from "../dates";
import { drawCanonicalNamedIdentity, personName } from "../people";
import { generatePersonIdentity } from "../person-identity";
import { electedExecutiveTermForRelationship } from "../executive-work-context";
import { SeededRng } from "../rng";
import type { EntityId, IsoDate, World } from "../types";
import { recordWorldEvent } from "../world";
import {
  STATE_EXECUTIVE_WRITER_VERSION,
  stateExecutiveTenureKeyPrefix,
  stateExecutiveTermWindow,
} from "./state-executives";
import type { StateExecutiveOffice } from "./state-executives";

/**
 * A GOVERNOR DIES IN OFFICE, AND SOMEONE STEPS IN.
 *
 * Every state constitution names who becomes or acts as governor when the
 * office falls vacant: most often a lieutenant governor, elsewhere the
 * president of the state senate or the secretary of state. Some states then
 * hold a special election for the rest of the term. The game has compiled no
 * state's rule.
 *
 * PLACEHOLDER (filed as `gubernatorial-succession-in-every-state`). Blanket
 * rule meanwhile: the state's next officer in line, a person the game draws,
 * takes the office on the day the governor dies and serves the rest of the
 * term. The successor's former title is not named, and no special election is
 * held. The successor's tenure is written under the same key prefix as the
 * opening tenure, so the one holder reader finds whichever tenure is latest.
 */
export const GOVERNOR_SUCCESSION_PROFILE = {
  id: "ocd-governor-succession-game-profile/v1",
} as const;

export function governorSuccessionKey(
  office: StateExecutiveOffice,
  vacancyDate: IsoDate,
  formerHolderId: EntityId,
): string {
  return `${stateExecutiveTenureKeyPrefix(office)}succession-${vacancyDate}:${formerHolderId}`;
}

/**
 * Seats the successor, once per vacancy. Returns the successor's id, or null
 * when the state's jurisdiction or office body is not in this World.
 */
export function seatGovernorSuccessor(
  world: World,
  office: StateExecutiveOffice,
  input: {
    readonly vacancyDate: IsoDate;
    readonly formerHolderId: EntityId;
    /** The dead holder's tenure event or elected work relationship. */
    readonly formerTermEvidenceId: EntityId | null;
  },
): { readonly world: World; readonly successorId: EntityId | null } {
  const stableKey = governorSuccessionKey(
    office,
    input.vacancyDate,
    input.formerHolderId,
  );
  const holderKey = `${stableKey}:holder`;
  const existing = world.history.events.find(
    (event) => event.stableKey === stableKey,
  );
  if (existing)
    return {
      world,
      successorId:
        existing.participants.find((row) => row.role === "focus:subject")
          ?.personId ?? null,
    };
  const organization = world.history.organizations.find(
    (candidate) => candidate.stableKey === office.organizationStableKey,
  );
  if (!organization) return { world, successorId: null };
  // The rest of the dead holder's own term where it is recorded (an elected
  // term, or a dated tenure), so the successor meets the next elected term;
  // otherwise the office's calendar.
  const window = stateExecutiveTermWindow(office, input.vacancyDate);
  const endExclusive =
    formerTermEnd(world, input.formerTermEvidenceId) ?? window.endExclusive;
  const rng = new SeededRng(world.seed).fork(holderKey);
  const year = Number(input.vacancyDate.slice(0, 4));
  const age = rng.integer(40, 71);
  let next = createCharacterHistoryContextPeople(world, [
    {
      stableKey: holderKey,
      ...drawCanonicalNamedIdentity(
        rng.fork("name"),
        generatePersonIdentity(rng.fork("identity")),
      ),
      birthDate: makeIsoDate(
        `${year - age}-${String(rng.integer(1, 13)).padStart(2, "0")}-${String(rng.integer(1, 29)).padStart(2, "0")}`,
      ),
      homeJurisdictionId: office.jurisdictionId,
    },
  ]);
  const successorId = characterHistoryContextPersonId(next, holderKey);
  const former = next.people[input.formerHolderId];
  next = recordWorldEvent(next, {
    stableKey,
    type: "world.office-tenure",
    occurredAt: input.vacancyDate,
    recordedAt: world.currentDate,
    jurisdictionId: office.jurisdictionId,
    involvedEntityIds: [successorId, organization.id, input.formerHolderId],
    participants: [
      {
        personId: successorId,
        role: "focus:subject",
        detail: office.displayName,
      },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      STATE_EXECUTIVE_WRITER_VERSION,
      `office:${office.officeKey}`,
      `state:${office.stateUsps}`,
      "provenance:succession",
      `provenance:${GOVERNOR_SUCCESSION_PROFILE.id}`,
      ...(window.ruleVersion ? [`term-rule:${window.ruleVersion}`] : []),
      endExclusive === null ? "term-end:unknown" : `term-end:${endExclusive}`,
    ],
    summary: `${personName(next.people[successorId]!)} became ${office.displayName}${former ? ` on the death of ${personName(former)}` : ""}, and serves the rest of the term.`,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  return { world: next, successorId };
}

function formerTermEnd(
  world: World,
  evidenceId: EntityId | null,
): IsoDate | null {
  if (!evidenceId) return null;
  const tenure = world.history.events.find((event) => event.id === evidenceId);
  const tag = tenure?.tags.find(
    (candidate) =>
      candidate.startsWith("term-end:") && candidate !== "term-end:unknown",
  );
  if (tag) return makeIsoDate(tag.slice("term-end:".length));
  const elected = electedExecutiveTermForRelationship(world, evidenceId);
  return elected ? makeIsoDate(elected.endsAt) : null;
}
