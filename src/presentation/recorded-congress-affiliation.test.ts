import { beforeAll, describe, expect, it } from "vitest";
import { createDemoWorld } from "../simulation/demo";
import {
  createOrganizationParticipation,
  recordOrganizationParticipationState,
} from "../simulation/life";
import { recordWorldEvent } from "../simulation/world";
import { serializeWorld, deserializeWorld } from "../simulation/serialization";
import { appendWorldConditions } from "../simulation/world-setup/conditions";
import { referenceReconstruction } from "../simulation/world-setup/political-start";
import {
  projectCongress,
  nationalParties,
  publicPartyAffiliation,
} from "../simulation/living-world/congress";
import {
  ensureLivingWorldOpening,
  PARTY_AFFILIATION_KIND,
  SEAT_TENURE_EVENT,
} from "../simulation/living-world/opening";
import { LIVING_WORLD_CONTRACT_VERSION } from "../simulation/living-world/contract";
import type { PublicHolderView } from "../simulation/living-world/contract";
import type { World } from "../simulation/types";
import { projectOrientationView } from "./world-orientation";

let opened: World;
let seatKeys: string[];
const labels = [
  "democratic",
  "republican",
  "independent",
  "Civic Alliance",
  "unknown",
];
const memberAt = (world: World, index: number): PublicHolderView => {
  const chamber = projectCongress(world)!.senate;
  const occupant = chamber.seats.find(
    (seat) => seat.seatKey === seatKeys[index],
  )!.occupant;
  if (occupant.kind !== "member")
    throw new Error("Expected actual saved member");
  return occupant.member;
};
function legacy(world: World): World {
  return {
    ...world,
    history: {
      ...world.history,
      events: world.history.events.map((event) => ({
        ...event,
        tags: event.tags.filter((tag) => !tag.startsWith("affiliation:")),
      })),
    },
  };
}
function intro(world: World) {
  const congress = projectCongress(world)!;
  const ids = [...congress.house.seats, ...congress.senate.seats].flatMap(
    (seat) =>
      seat.occupant.kind === "member" ? [seat.occupant.member.personId] : [],
  );
  return projectOrientationView(
    {
      version: LIVING_WORLD_CONTRACT_VERSION,
      asOf: world.currentDate,
      worldRevision: world.history.nextSequence,
      executive: [],
      congress,
      homeState: null,
      locality: null,
      parties: nationalParties(world, ids),
      publicMatters: [],
    },
    () => null,
  ).steps.find((step) => step.key === "congress")!;
}
beforeAll(() => {
  const base = createDemoWorld("recorded-public-affiliation-20261004");
  const draft = referenceReconstruction(base);
  seatKeys = draft.seats
    .filter((seat) => seat.seatKey.startsWith("us-senate:"))
    .slice(0, labels.length)
    .map((seat) => seat.seatKey);
  const seats = draft.seats.map((seat) => {
    const index = seatKeys.indexOf(seat.seatKey);
    return index < 0
      ? seat
      : { ...seat, affiliation: labels[index]!, caucus: "democratic" };
  });
  const conditioned = appendWorldConditions(base, [{ ...draft, seats }]);
  opened = ensureLivingWorldOpening(conditioned, base.personOrder[0]!);
}, 60000);

describe("recorded public affiliation survives the opening and intro", () => {
  it("preserves major membership, Independent, other and unknown without an Independent organization", () => {
    expect(labels.map((_, i) => memberAt(opened, i).affiliation?.kind)).toEqual(
      ["party", "party", "independent", "other", "unknown"],
    );
    expect(memberAt(opened, 2).partyOrganizationId).toBeNull();
    expect(memberAt(opened, 3).affiliation).toEqual({
      kind: "other",
      label: "Civic Alliance",
    });
    expect(memberAt(opened, 2).caucusOrganizationId).not.toBeNull();
    expect(
      opened.history.organizations.some((organization) =>
        organization.stableKey.endsWith(":party:independent"),
      ),
    ).toBe(false);
    for (let i = 0; i < labels.length; i++) {
      const holder = memberAt(opened, i);
      const tenure = opened.history.events.find(
        (event) => event.id === holder.termId,
      )!;
      expect(tenure.tags).toContain(`affiliation:${labels[i]}`);
    }
  });
  it("assembles distinct intro labels and unchanged House/Senate denominators", () => {
    const before = serializeWorld(opened);
    const view = intro(opened);
    const senate = view.chambers.find(
      (chamber) => chamber.chamberKey === "us-senate",
    )!;
    for (const label of [
      "Democratic Party",
      "Republican Party",
      "Independent",
      "Civic Alliance",
      "Affiliation unknown",
    ])
      expect(senate.parties.map((party) => party.label)).toContain(label);
    expect(
      senate.roster.find((row) => row.seatKey === seatKeys[2])!.person!.party,
    ).toBe("Independent");
    for (const chamber of view.chambers) {
      expect(chamber.members + chamber.vacancies + chamber.unrecorded).toBe(
        chamber.seats,
      );
      expect(
        chamber.parties.reduce((sum, group) => sum + group.members, 0),
      ).toBe(chamber.members);
    }
    expect(view.chambers.map((chamber) => chamber.seats)).toEqual([100, 435]);
    expect(new Set(senate.parties.map((group) => group.displayKey)).size).toBe(
      senate.parties.length,
    );
    expect(serializeWorld(opened)).toBe(before);
  });
  it("recovers an older save only from same-person initial-tenure evidence, including reload", () => {
    const old = legacy(opened);
    expect(memberAt(old, 2).affiliation).toEqual({ kind: "independent" });
    expect(
      memberAt(deserializeWorld(serializeWorld(old)), 3).affiliation,
    ).toEqual({ kind: "other", label: "Civic Alliance" });
    expect(ensureLivingWorldOpening(old, old.personOrder[0]!)).toBe(old);
  });
  it("keeps an unbound old save unknown rather than converting null membership", () => {
    const old = legacy(opened);
    const holder = memberAt(old, 2);
    const unbound: World = {
      ...old,
      people: {
        ...old.people,
        [holder.personId]: {
          ...old.people[holder.personId]!,
          generationKey: "a-different-recorded-person",
        },
      },
    };
    expect(memberAt(unbound, 2).affiliation).toEqual({ kind: "unknown" });
    const withoutConditions: World = {
      ...old,
      history: { ...old.history, worldConditions: [] },
    };
    expect(memberAt(withoutConditions, 2).affiliation).toEqual({
      kind: "unknown",
    });
  });
  it("later party membership and its ended state remain authoritative, independently of caucus", () => {
    const holder = memberAt(opened, 2);
    const party = memberAt(opened, 0).partyOrganizationId!;
    const joined = createOrganizationParticipation(legacy(opened), {
      stableKey: "affiliation-proof:later-membership",
      personId: holder.personId,
      organizationId: party,
      startedAt: opened.currentDate,
      kind: PARTY_AFFILIATION_KIND,
      roleKind: "member:public-affiliation",
      context: null,
      provenance: {
        kind: "authored",
        note: "Focused later-affiliation fixture",
      },
    });
    expect(memberAt(joined, 2).affiliation).toEqual({
      kind: "party",
      partyOrganizationId: party,
    });
    expect(publicPartyAffiliation(joined, holder.personId)).toBe(party);
    const participation = joined.history.organizationParticipations.at(-1)!;
    const ended = recordOrganizationParticipationState(joined, {
      stableKey: "affiliation-proof:ended",
      participationId: participation.id,
      effectiveAt: joined.currentDate,
      status: "ended",
      roleKind: null,
      context: null,
      supersedesStateId:
        joined.history.organizationParticipationStates.at(-1)!.id,
      provenance: {
        kind: "authored",
        note: "Focused ended-affiliation fixture",
      },
    });
    expect(memberAt(ended, 2).affiliation).toEqual({ kind: "ended" });
    expect(publicPartyAffiliation(ended, holder.personId)).toBeNull();
    expect(memberAt(ended, 2).caucusOrganizationId).toBe(
      holder.caucusOrganizationId,
    );
    expect(intro(ended).summary).toContain("Affiliation ended");
  });
  it("a later tenure and replacement person cannot recover the initial occupant's affiliation", () => {
    const old = legacy(opened);
    const holder = memberAt(old, 2);
    const original = old.history.events.find(
      (event) => event.id === holder.termId,
    )!;
    const replacementId = old.personOrder[0]!;
    const replaced = recordWorldEvent(old, {
      stableKey: "affiliation-proof:replacement-tenure",
      type: SEAT_TENURE_EVENT,
      occurredAt: old.currentDate,
      recordedAt: old.currentDate,
      jurisdictionId: original.jurisdictionId,
      involvedEntityIds: [
        replacementId,
        ...original.involvedEntityIds.filter((id) => id !== holder.personId),
      ],
      participants: [
        {
          personId: replacementId,
          role: "focus:subject",
          detail: holder.title,
        },
      ],
      personFactConstraints: [],
      visibility: "public",
      tags: original.tags.filter(
        (tag) => tag !== "provenance:fictional-initial-tenure",
      ),
      summary: "A replacement begins the recorded tenure.",
      context: original.context,
    });
    expect(memberAt(replaced, 2).personId).toBe(replacementId);
    expect(memberAt(replaced, 2).affiliation).toEqual({ kind: "unknown" });
  });
});
