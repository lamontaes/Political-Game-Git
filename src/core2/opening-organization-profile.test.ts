import { expect, it } from "vitest";
import { organizationProfileAt } from "../simulation/life-queries";
import type { OrganizationProfileRecord, World } from "../simulation/types";
import { openingOrganizationProfiles } from "./opening-organization-profile";

// The opening reads each organization's latest profile the way the old
// life-queries read did (core-old-imports-population-org-profile): the same
// record for every organization, across edits on one day, future-dated and
// out-of-history records.
const record = (
  organizationId: string,
  sequence: number,
  effectiveAt: string,
  name: string,
): OrganizationProfileRecord =>
  ({
    id: `profile:${organizationId}:${sequence}`,
    stableKey: `profile:${organizationId}:${sequence}`,
    sequence,
    organizationId,
    effectiveAt,
    name,
    classification: "enterprise:retail",
    locationJurisdictionId: null,
  }) as unknown as OrganizationProfileRecord;

const world = {
  id: "world:test",
  currentDate: "2025-01-20",
  history: {
    nextSequence: 10,
    organizationProfiles: [
      record("org:a", 1, "2010-05-01", "Old Name"),
      record("org:a", 2, "2018-01-01", "Renamed"),
      record("org:a", 3, "2018-01-01", "Renamed Again Same Day"),
      record("org:a", 4, "2030-01-01", "Future Name"),
      record("org:b", 5, "2020-06-01", "B Store"),
      record("org:b", 12, "2021-01-01", "Beyond History"),
      record("org:c", 6, "2030-02-02", "Not Yet Formed"),
    ],
  },
} as unknown as World;

it("reads the same latest profile as the old life-queries read for every organization", () => {
  const profiles = openingOrganizationProfiles(world);
  for (const id of ["org:a", "org:b", "org:c"])
    expect(profiles.get(id), id).toEqual(organizationProfileAt(world, id));
  expect(profiles.get("org:a")?.name).toBe("Renamed Again Same Day");
  expect(profiles.get("org:b")?.name).toBe("B Store");
  expect(profiles.has("org:c")).toBe(false);
});
