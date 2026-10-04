import { describe, expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { fileForOffice } from "../../tests/fixtures/campaign-fixture";
import { createWorkRelationship, recordWorkStatus } from "../simulation/life";
import { createExplicitGeographyLife } from "../presentation/new-game-geography";
import { hasCurrentOffice } from "./current-office-access";

const provenance = {
  kind: "authored" as const,
  note: "Controlled current-tenure UI fixture.",
};
function ordinary() {
  return smallWorld({ place: "OH", seed: "office-tab-current-tenure" });
}
function held(
  kind:
    | "employment:legislative-member"
    | "employment:executive-office"
    | "employment:judicial-office",
) {
  const { world: initial, personId } = ordinary();
  const world = createWorkRelationship(initial, {
    stableKey: `controlled-office:${kind}`,
    personId,
    organizationId: null,
    startedAt: initial.currentDate,
    kind,
    compensation: "paid",
    authority: "self-directed",
    dependency: "independent",
    economicRisk: "person-borne",
    provenance,
    initialRole: {
      title: "Controlled held office",
      occupationClassification: null,
      locationJurisdictionId: null,
      timeDemand: {
        expectedWeekly: { minimumHours: 40, maximumHours: 40 },
        attention: "high",
        concurrency: "mostly-exclusive",
        scheduleRigidity: "mixed",
        interruptibility: "limited",
        locationJurisdictionId: null,
      },
    },
  });
  return { world, personId };
}
describe("office UI reads current saved tenure", () => {
  it("does not admit an ordinary adult", () => {
    const { world, personId } = ordinary();
    expect(hasCurrentOffice(world, personId)).toBe(false);
  });
  it("does not treat a recorded candidacy as office", () => {
    const opened = createExplicitGeographyLife({
      placeKey: "lexington-fayette",
      seed: "office-tab-candidate",
      startAge: 45,
      startKind: "normal",
      depth: "summarize-earlier-life",
    });
    const world = opened.game.world;
    const personId = opened.game.playerPersonId;
    const candidate = fileForOffice(world, personId);
    expect((candidate.history.campaigns ?? []).length).toBeGreaterThan(
      (world.history.campaigns ?? []).length,
    );
    expect(hasCurrentOffice(candidate, personId)).toBe(false);
  });
  it.each([
    "employment:legislative-member",
    "employment:executive-office",
    "employment:judicial-office",
  ] as const)("admits a saved active %s tenure", (kind) => {
    const { world, personId } = held(kind);
    expect(hasCurrentOffice(world, personId)).toBe(true);
  });
  it("removes access when the recorded tenure ends", () => {
    const { world, personId } = held("employment:judicial-office");
    const work = world.history.workRelationships.at(-1)!;
    const status = world.history.workStatuses.find(
      (entry) => entry.workRelationshipId === work.id,
    )!;
    const ended = recordWorkStatus(world, {
      stableKey: "controlled-office-ended",
      workRelationshipId: work.id,
      effectiveAt: world.currentDate,
      status: "ended",
      reason: "Recorded term ended",
      provenance,
      supersedesStatusId: status.id,
    });
    expect(hasCurrentOffice(ended, personId)).toBe(false);
  });
});
