import { describe, expect, it } from "vitest";

import {
  createWorkRelationship,
  deserializeWorld,
  serializeWorld,
} from "../simulation";
import { createNewGameWorld } from "./new-game";
import {
  projectMyLifeJournalView,
  publicOfficeRolePhrase,
} from "./my-life-journal";
import { projectJournalView } from "./journal-views";

function start(
  seed: string,
  startingLife: "ordinary-life" | "legislative-office",
) {
  const game = createNewGameWorld({
    placeKey: "kentucky",
    startAge: 34,
    depth: "summarize-earlier-life",
    startingLife,
    household: "shares-a-home",
    seed,
    givenName: null,
    familyName: null,
  });
  return {
    world: deserializeWorld(serializeWorld(game.world)),
    personId: game.playerPersonId,
  };
}

describe("My life from recorded milestones", () => {
  it("renders first-person birth and paid work without changing the dated record", () => {
    const { world, personId } = start(
      "grounded-english-proof-2026-09-24",
      "ordinary-life",
    );
    const before = JSON.stringify(world);
    const shown = projectMyLifeJournalView(world, personId, "chapters", null);
    const lines = shown.sections.flatMap((section) =>
      section.entries.map((entry) => entry.text),
    );
    expect(lines).toContain(
      "I started work at Neighborhood Market as a store assistant.",
    );
    expect(lines.some((line) => line.startsWith("I was born on "))).toBe(true);
    expect(
      lines.every((line) => /^I\b|^That [A-Z][a-z]+, I\b/.test(line)),
    ).toBe(true);
    expect(JSON.stringify(world)).toBe(before);
    expect(
      projectJournalView(world, personId, "years", null).entryCount,
    ).toBeGreaterThan(shown.entryCount);
    expect(
      projectMyLifeJournalView(
        deserializeWorld(serializeWorld(world)),
        personId,
        "chapters",
        null,
      ),
    ).toEqual(shown);
  });

  it("uses a real active office record and leaves unrecognized titles in Record", () => {
    const { world, personId } = start(
      "my-life-office-kentucky",
      "legislative-office",
    );
    const staff = world.history.workRelationships.find(
      (row) =>
        row.personId === personId &&
        row.kind === "employment:legislative-staff",
    )!;
    const staffRole = world.history.workRoles.find(
      (row) => row.workRelationshipId === staff.id,
    )!;
    const seated = createWorkRelationship(world, {
      stableKey: "my-life-fixture:district-98-office",
      personId,
      organizationId: staff.organizationId,
      startedAt: world.currentDate,
      kind: "employment:legislative-member",
      compensation: "paid",
      authority: "shared",
      dependency: "partly-dependent",
      economicRisk: "organization-borne",
      provenance: {
        kind: "authored",
        note: "First-person office projection fixture.",
      },
      initialRole: {
        title: "Member of the Kentucky House of Representatives, District 98",
        occupationClassification: "service:elected-legislator",
        locationJurisdictionId: staffRole.locationJurisdictionId,
        timeDemand: staffRole.timeDemand,
      },
    });
    const shown = projectMyLifeJournalView(seated, personId, "chapters", null);
    const lines = shown.sections.flatMap((section) =>
      section.entries.map((entry) => entry.text),
    );
    expect(lines).toContain(
      "I started work at the Kentucky legislative office as a legislative staffer.",
    );
    expect(lines).toContain(
      "I took office as a member of the Kentucky House of Representatives for District 98.",
    );
    expect(lines.every((line) => !/^You\b/.test(line))).toBe(true);
    expect(
      publicOfficeRolePhrase(
        "Member of the Kentucky House of Representatives, District 98",
      ),
    ).toBe("a member of the Kentucky House of Representatives for District 98");
    expect(publicOfficeRolePhrase("Chief of Staff")).toBeNull();
    expect(publicOfficeRolePhrase("Senator for District 12")).toBe(
      "a senator for District 12",
    );
  });

  it("can use a month variant when the Years heading establishes the saved year", () => {
    const { world, personId } = start(
      "grounded-english-proof-2026-09-24",
      "ordinary-life",
    );
    const status = world.history.workStatuses.find((row) => {
      const relationship = world.history.workRelationships.find(
        (candidate) => candidate.id === row.workRelationshipId,
      );
      return relationship?.personId === personId && row.status === "active";
    })!;
    const year = status.effectiveAt.slice(0, 4);
    const shown = projectMyLifeJournalView(world, personId, "years", year);
    const workLine = shown.sections
      .flatMap((section) => section.chronicle)
      .find((line) => line.entry.sourceId === status.id);
    expect(workLine).toBeDefined();
    expect(workLine!.entry.text).toMatch(
      /^(?:That March, )?I started work at Neighborhood Market as a store assistant\.$/,
    );
    expect(workLine!.lead === null || workLine!.lead === "In March").toBe(true);
  });
});
