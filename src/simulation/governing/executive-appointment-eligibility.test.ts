import { describe, expect, it } from "vitest";
import { createPortabilityFixture } from "../portability-fixture";
import {
  characterHistoryContextPersonId,
  createCharacterHistoryContextPeople,
} from "../character-history";
import { makeIsoDate } from "../dates";
import { createOrganization, createOrganizationParticipation } from "../life";
import { settingPartyStableKey } from "../living-world/party-registry";
import {
  currentStateExecutiveHolders,
  ensureStateExecutiveIncumbent,
} from "../nationwide-world/state-executives";
import { serializeWorld, deserializeWorld } from "../serialization";
import type { EntityId, World } from "../types";
import { recordWorldEvent } from "../world";
import { ensureExecutiveAppointmentOpening } from "./executive-appointment-opening";
import { executiveAppointmentEligibility } from "./executive-appointment-eligibility";
import {
  latestExecutiveAppointmentSeat,
  recordExecutiveAppointmentVacancy,
} from "./executive-appointments";
import { governingOfficeForPerson } from "./state-governing";

const POST = "us-ak-personnel-board";
const provenance = {
  kind: "generated" as const,
  generatorKey: "session23-controlled-party-cap",
};

function board() {
  const initial = createPortabilityFixture("session23-party-cap");
  let world = ensureStateExecutiveIncumbent(
    initial,
    initial.personOrder[0]!,
    "AK",
  );
  const governor = currentStateExecutiveHolders(world).find(
    (holder) => holder.stateUsps === "AK",
  )!;
  const office = governingOfficeForPerson(world, governor.personId)!;
  world = ensureExecutiveAppointmentOpening(world, office);
  const terms = [1, 2, 3].map((seat) =>
    latestExecutiveAppointmentSeat(world, POST, seat)!,
  );
  const term = terms[2]!;
  const former = term.participants[0]!.personId;
  world = recordWorldEvent(world, {
    stableKey: "fixture:party-cap:resignation",
    type: "world.office-resignation",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: office.jurisdictionId,
    involvedEntityIds: [former],
    participants: [{ personId: former, role: "focus:actor", detail: null }],
    personFactConstraints: [],
    visibility: "public",
    tags: [`appointment-term:${term.id}`],
    summary: "The controlled fixture's recorded board incumbent resigns.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  world = recordExecutiveAppointmentVacancy(world, {
    incumbentTermEventId: term.id,
    cause: "resignation",
    causeEventId: world.history.events.at(-1)!.id,
  });
  world = createCharacterHistoryContextPeople(world, [
    {
      stableKey: "fixture:party-cap:candidate",
      givenName: "Taylor",
      familyName: "Morgan",
      birthDate: makeIsoDate("1980-01-01"),
      homeJurisdictionId: office.jurisdictionId,
      birthplaceJurisdictionId: office.jurisdictionId,
    },
  ]);
  return {
    world,
    jurisdictionId: office.jurisdictionId,
    candidateId: characterHistoryContextPersonId(
      world,
      "fixture:party-cap:candidate",
    ),
    incumbents: terms
      .slice(0, 2)
      .map((entry) => entry.participants[0]!.personId),
  };
}

/** Explicit controlled affiliation records, not generated-world party evidence. */
function affiliated(world: World, personId: EntityId, partyKey: string): World {
  const key = settingPartyStableKey(partyKey);
  let next = world;
  let organization = next.history.organizations.find(
    (row) => row.stableKey === key,
  );
  if (!organization) {
    next = createOrganization(next, {
      stableKey: key,
      formedAt: next.currentDate,
      provenance,
      initialProfile: {
        name: `Controlled ${partyKey} party`,
        classification: "membership:political-party",
        locationJurisdictionId: null,
      },
    });
    organization = next.history.organizations.find(
      (row) => row.stableKey === key,
    )!;
  }
  return createOrganizationParticipation(next, {
    stableKey: `fixture:party-cap:${personId}:${partyKey}`,
    personId,
    organizationId: organization.id,
    startedAt: next.currentDate,
    kind: "affiliation:political-party",
    roleKind: "member:public-affiliation",
    context:
      "Explicit public affiliation in this controlled eligibility fixture.",
    provenance,
  });
}

describe("executive board party eligibility", () => {
  it("enforces the two-member cap for an actual minor party and permits a different recorded party after reload", () => {
    const g = board();
    let world = affiliated(g.world, g.incumbents[0]!, "minor-example");
    world = affiliated(world, g.incumbents[1]!, "minor-example");
    const same = affiliated(world, g.candidateId, "minor-example");
    expect(
      executiveAppointmentEligibility(
        same,
        POST,
        g.candidateId,
        g.jurisdictionId,
      ),
    ).toBe("fails");
    const different = deserializeWorld(
      serializeWorld(affiliated(world, g.candidateId, "other-example")),
    );
    const history = different.history;
    expect(
      executiveAppointmentEligibility(
        different,
        POST,
        g.candidateId,
        g.jurisdictionId,
      ),
    ).toBe("meets");
    expect(different.history).toBe(history);
  });

  it("keeps an unknown affiliation unverified whenever it could change the statutory cap", () => {
    const g = board();
    let world = affiliated(g.world, g.incumbents[0]!, "minor-example");
    const same = affiliated(world, g.candidateId, "minor-example");
    expect(
      executiveAppointmentEligibility(
        same,
        POST,
        g.candidateId,
        g.jurisdictionId,
      ),
    ).toBe("unverified");
    expect(
      executiveAppointmentEligibility(
        world,
        POST,
        g.candidateId,
        g.jurisdictionId,
      ),
    ).toBe("unverified");
    world = affiliated(world, g.candidateId, "other-example");
    // Only one incumbent could match this different known party: adding this
    // candidate cannot exceed two, even without the other incumbent's party.
    expect(
      executiveAppointmentEligibility(
        world,
        POST,
        g.candidateId,
        g.jurisdictionId,
      ),
    ).toBe("meets");
  });
});
