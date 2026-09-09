import { describe, it, expect } from "vitest";
import { serializeWorld, deserializeWorld } from "./index";
import { civilPersonnelFixture as fixture } from "../../tests/e2e/support/civil-personnel-world";
import { workPendingEntriesFor } from "./time-work";
import {
  assessPersonnelAction,
  personnelEmploymentContexts,
  personnelKnownEmployers,
  personnelWorkItems,
  preparePersonnelWork,
  publicEmploymentPermissionProvider,
  queryPersonnelProtections,
} from "./civil-personnel";
import { evaluateLifeEligibility } from "./life-eligibility";
import type { PersonnelClassContext } from "./civil-personnel-contract";
import type { World } from "./types";

const context: PersonnelClassContext = {
  jurisdictionKey: "US-MN",
  employerLevel: "state",
  civilClass: "classified",
  tenure: "permanent",
  bargainingCoverage: "unknown",
  collectiveAgreement: "not-covered",
};

describe("CIVIL-WORK7 consumer boundaries", () => {
  it("does not require an employer jurisdiction for private preparation", () => {
    const { world, organizationId, workRelationshipId } = fixture(true);
    const result = preparePersonnelWork(world, {
      action: "prepare-personnel-review",
      organizationId,
      workRelationshipId,
      note: "Ask which jurisdiction and employment class apply.",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.reason);
    expect(result.world.history.workItems.at(-1)!.jurisdictionId).toBeNull();
  });
  it("keeps bargaining distinct from permanent civil-service protection", () => {
    const query = queryPersonnelProtections(context, "2026-09-06");
    const removal = query.civilService.find(
      (r) => r.field === "removalProtection",
    )!;
    expect(removal.observation.state).toBe("known");
    expect(removal.missing.join(" ")).not.toContain("bargaining coverage");
    expect(
      query.laborBargaining
        .find((r) => r.field === "bargainingCoverage")!
        .missing.join(" "),
    ).toContain("bargaining coverage");
    const probationary = queryPersonnelProtections(
      { ...context, tenure: "probationary" },
      "2026-09-06",
    );
    expect(
      probationary.civilService
        .find((r) => r.field === "removalProtection")!
        .missing.join(" "),
    ).toContain("permanent classified");
  });
  it("refuses wrong employer level, class, date and CBA review route without turning absence into prohibition", () => {
    const query = queryPersonnelProtections(
      {
        ...context,
        employerLevel: "local",
        civilClass: "unclassified",
        collectiveAgreement: "covered",
      },
      "1990-01-01",
    );
    const appeal = query.civilService.find((r) => r.field === "appealBody")!;
    expect(appeal.observation.state).toBe("known");
    expect(appeal.missing.join(" ")).toContain("employer level");
    expect(appeal.missing.join(" ")).toContain("unclassified");
    expect(appeal.missing.join(" ")).toContain("1990-01-01");
    expect(appeal.missing.join(" ")).toContain(
      "not covered by a collective bargaining agreement",
    );
    expect(() => queryPersonnelProtections(context, "2026-02-30")).toThrow();
  });
  it("allows private preparation despite unknown final hiring fields, with no fake authority", () => {
    expect(
      assessPersonnelAction(context, "2026-09-09", "prepare-recruitment")
        .status,
    ).toBe("available");
    expect(assessPersonnelAction(context, "2026-09-09", "appoint").status).toBe(
      "blocked",
    );
    expect(
      assessPersonnelAction(context, "2026-09-06", "remove").missing.join(" "),
    ).toContain("decision-maker");
    expect(
      assessPersonnelAction(context, "2026-09-06", "complete-probation").status,
    ).toBe("blocked");
  });
  it("creates one real private Work record and history, idempotently, preserving employment, money and time through reload", () => {
    const { world, actor, organizationId, workRelationshipId } = fixture();
    const before = serializeWorld(world);
    const input = {
      action: "prepare-personnel-review" as const,
      organizationId,
      workRelationshipId,
      note: "Ask which review procedure applies to this employment.",
    };
    const result = preparePersonnelWork(world, input);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.reason);
    expect(serializeWorld(world)).toBe(before);
    expect(result.world.currentMoment).toEqual(world.currentMoment);
    expect(result.world.history.workRelationships).toEqual(
      world.history.workRelationships,
    );
    expect(result.world.history.workStatuses).toEqual(
      world.history.workStatuses,
    );
    expect(result.world.history.resourceFlows).toEqual(
      world.history.resourceFlows,
    );
    expect(
      workPendingEntriesFor(result.world, actor).some(
        (e) => e.item.id === result.workItemId,
      ),
    ).toBe(true);
    const restored = deserializeWorld(serializeWorld(result.world));
    expect(personnelWorkItems(restored)).toHaveLength(1);
    expect(preparePersonnelWork(restored, input).world).toBe(restored);
    const other: World = {
      ...restored,
      control: { kind: "person", personId: world.personOrder[1]! },
    };
    expect(personnelWorkItems(other)).toHaveLength(0);
    expect(preparePersonnelWork(other, input).ok).toBe(false);
  });
  it("does not let a title, another person's employment or a decision-shaped action bypass the writer", () => {
    const { world, organizationId, workRelationshipId } = fixture();
    expect(
      personnelEmploymentContexts(world).some(
        (c) => c.workRelationshipId === workRelationshipId,
      ),
    ).toBe(true);
    expect(
      personnelKnownEmployers(world).some((c) => c.id === organizationId),
    ).toBe(true);
    expect(
      preparePersonnelWork(world, {
        action: "remove" as "prepare-personnel-review",
        organizationId,
        workRelationshipId,
        note: "Dismiss employee",
      }).ok,
    ).toBe(false);
    expect(
      preparePersonnelWork(
        { ...world, control: { kind: "observer" } },
        {
          action: "prepare-personnel-review",
          organizationId,
          workRelationshipId,
          note: "Questions",
        },
      ).ok,
    ).toBe(false);
  });
  it("implements the LIFE provider seam with explicit public refusals and no default permission", () => {
    const { world, actor, organizationId } = fixture();
    const request = {
      actorPersonId: actor,
      actionKey: "work:public-appoint" as const,
      asOfDate: world.currentDate,
      jurisdictionId: world.jurisdictionOrder[0]!,
      contextEntityIds: [organizationId],
    };
    expect(
      evaluateLifeEligibility(
        world,
        request,
        publicEmploymentPermissionProvider(() => null),
      ).status,
    ).toBe("blocked");
    expect(
      evaluateLifeEligibility(
        world,
        request,
        publicEmploymentPermissionProvider(() => context),
      ).status,
    ).toBe("blocked");
  });
});
