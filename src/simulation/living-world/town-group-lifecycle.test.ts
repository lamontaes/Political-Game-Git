import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { lifePlaceStateIdentities } from "../life-places";
import { createOrganization, createOrganizationParticipation } from "../life";
import { organizationProfileAt } from "../life-queries";
import { deserializeWorld, serializeWorld } from "../serialization";
import { SeededRng } from "../rng";
import { reviewTownGroups, TOWN_GROUP_PROFILES } from "./town-businesses";

const seed = "team4-a59-recorded-group-lifecycle";
const place = new SeededRng(seed).pick(lifePlaceStateIdentities());

describe(`recorded group closure (${place.jurisdictionKey}, ${seed})`, () => {
  for (const profile of TOWN_GROUP_PROFILES) {
    for (const hasMember of [false, true]) {
      it(`${profile.key}: ${hasMember ? "retains a group with an active member" : "closes an empty group on its next pass and replays once"}`, () => {
        const fixture = smallWorld({
          place: place.jurisdictionKey,
          people: 3,
          seed: `${seed}:${profile.key}:${hasMember}`,
        });
        let world = createOrganization(fixture.world, {
          stableKey: `test:recorded-group:${profile.key}`,
          formedAt: fixture.world.currentDate,
          provenance: {
            kind: "authored",
            note: "Recorded lifecycle test group.",
          },
          initialProfile: {
            name: `${fixture.place.displayName} ${profile.key}`,
            classification: profile.classification,
            locationJurisdictionId: fixture.jurisdictionId,
          },
        });
        const groupId = world.history.organizations.at(-1)!.id;
        if (hasMember)
          world = createOrganizationParticipation(world, {
            stableKey: `test:recorded-member:${groupId}`,
            personId: fixture.personId,
            organizationId: groupId,
            startedAt: world.currentDate,
            kind: profile.participationKind,
            roleKind: profile.roleKind,
            context: null,
            provenance: { kind: "authored", note: "Recorded active member." },
          });
        const reviewed = reviewTownGroups(
          world,
          fixture.jurisdictionId,
          fixture.personId,
          "recorded-closure",
        );
        expect(
          organizationProfileAt(reviewed, groupId)?.closed?.reason ?? null,
        ).toBe(hasMember ? null : profile.closingReason);
        const saved = serializeWorld(reviewed);
        expect(
          serializeWorld(
            reviewTownGroups(
              deserializeWorld(saved),
              fixture.jurisdictionId,
              fixture.personId,
              "recorded-closure",
            ),
          ),
        ).toBe(saved);
      });
    }
  }
});
