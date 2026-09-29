import { ageOnDate } from "./dates";
import { describe, expect, it } from "vitest";
import { openWatchedWorld } from "../../scripts/dev-lab/world-aging";
import { prepareLawPair } from "../../scripts/laws-proof/enact";
import { advanceObservedWorld } from "../presentation/observer-world";
import { stateJurisdictionForKey } from "./life-places";
import { legislatureForState } from "./legislature-game-profile";
import {
  educationEnrollmentStateAt,
  householdMembershipsAt,
  peopleInHouseholdAt,
} from "./life-queries";
import { homeLocalGovernmentUnits } from "./nationwide-world/local-governments";
import { sittingLocalOfficers } from "./living-world/local-government-seats";
import { createFormationContext, recordPrinciples } from "./politics";
import { serializeWorld, deserializeWorld } from "./serialization";
import { contentDecisionAuthority } from "./governing/question-authority";
import { assertWorldIntegrity } from "./world";
import {
  LIBRARY_QUESTION,
  resolveLibraryChallenges,
  libraryChallengeExpenseDollars,
} from "./library-materials-law";

describe("library appeals reach collection records and costs", () => {
  it("uses an actual parent's recorded concern, the enacted authority, and a recorded local roll call", () => {
    const opened = openWatchedWorld("library-authority-records", "1700113");
    const children = new Set(
      opened.world.history.educationEnrollments
        .filter(
          (e) =>
            e.programKind.startsWith("schooling:") &&
            ageOnDate(
              opened.world.people[e.personId]!.birthDate,
              opened.world.currentDate,
            ) < 18 &&
            educationEnrollmentStateAt(opened.world, e.id)?.status === "active",
        )
        .map((e) => e.personId),
    );
    const child = [...children].find(
      (id) =>
        opened.world.people[id]!.homeJurisdictionId ===
        opened.world.people[opened.anchorPersonId]!.homeJurisdictionId,
    )!;
    expect(child).toBeDefined();
    const household = householdMembershipsAt(opened.world, child)[0]!.household
      .id;
    const parent = peopleInHouseholdAt(opened.world, household).find(
      (id) =>
        ageOnDate(
          opened.world.people[id]!.birthDate,
          opened.world.currentDate,
        ) >= 18,
    )!;
    const town = opened.world.people[parent]!.homeJurisdictionId;
    const unit = homeLocalGovernmentUnits(opened.world, parent).municipal[0]!;
    const members = sittingLocalOfficers(opened.world, unit)
      .filter((m) => !m.mayor)
      .map((m) => m.personId);
    expect(members.length).toBeGreaterThan(0);
    const tradition = Object.values(opened.world.policyCatalog.principles).find(
      (p) => p.stableKey.endsWith(":tradition"),
    )!;
    const base = recordPrinciples(
      opened.world,
      [...new Set([parent, ...members])].map((personId) => ({
        stableKey: `library-test-tradition:${personId}`,
        personId,
        principleId: tradition.id,
        formedAt: opened.world.currentDate,
        stance: "endorses" as const,
        conviction: "settled" as const,
        flexibility: "firm" as const,
        qualification: null,
        formation: createFormationContext("other:controlled-fixture", {
          note: "Explicit fictional tradition concern for the library appeal test.",
        }),
        supersedesPrincipleRecordId: null,
      })),
    );
    const proposition = Object.values(base.policyCatalog.propositions).find(
      (p) => p.stableKey === LIBRARY_QUESTION,
    )!;
    const input = {
      jurisdictionId: stateJurisdictionForKey("US-IL")!.id,
      rulePackId: legislatureForState("US-IL")!.packId,
      propositionId: proposition.id,
      sponsorPersonId: opened.anchorPersonId,
      advance: advanceObservedWorld,
    };
    const standard = prepareLawPair(base, { ...input, answer: "no" }).treated;
    const pair = prepareLawPair(standard, {
      ...input,
      policyTerms: [
        {
          questionKey: LIBRARY_QUESTION,
          values: {
            staffReviewHours: 13,
            staffHourlyCents: 3356,
            legalReviewHours: 2,
          },
          reason: "Controlled actual collection appeal terms.",
          principleRecordIds: [],
        },
      ],
    });
    expect(contentDecisionAuthority(pair.control, town, "library").level).toBe(
      "state",
    );
    expect(contentDecisionAuthority(pair.treated, town, "library").level).toBe(
      "local",
    );
    const control = resolveLibraryChallenges(
      pair.control,
      town,
      members,
      "controlled-held-meeting",
    );
    const treated = resolveLibraryChallenges(
      pair.treated,
      town,
      members,
      "controlled-held-meeting",
    );
    expect(
      treated.libraryMaterials!.challenges.some(
        (c) => c.personId === parent && c.schoolChildIds.includes(child),
      ),
    ).toBe(true);
    expect(
      control.libraryMaterials!.decisions.every(
        (d) => d.authority === "state" && !d.removed,
      ),
    ).toBe(true);
    expect(
      treated.libraryMaterials!.decisions.some(
        (d) => d.removed && d.ballots.length === members.length,
      ),
    ).toBe(true);
    expect(
      libraryChallengeExpenseDollars(treated, town, treated.currentDate),
    ).toBeGreaterThan(
      libraryChallengeExpenseDollars(control, town, control.currentDate),
    );
    const restored = deserializeWorld(serializeWorld(treated));
    expect(
      resolveLibraryChallenges(
        restored,
        town,
        members,
        "controlled-held-meeting",
      ),
    ).toBe(restored);
    assertWorldIntegrity(restored);
  }, 180000);
});
