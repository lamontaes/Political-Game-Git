/** Explicit fictional Custom Start premise, using canonical life writers. */
import {
  applyCharacterHistoryPlan,
  characterHistoryContextPersonId,
} from "./character-history";
import { ageOnDate, makeIsoDate } from "./dates";
import { isPersonAliveAt } from "./vitality-integrity";
import { createOrganization, createWorkRelationship } from "./life";
import { drawCanonicalName } from "./people";
import { SeededRng } from "./rng";
import { assertWorldIntegrity, recordWorldEvent } from "./world";
import {
  judicialOccupation,
  JUDICIAL_OFFICE_CLASSIFICATION,
  judicialOfficeContexts,
  type JudicialOfficeResult,
} from "./judicial-office-work";
import { JUDICIAL_OFFICE_CONTENT } from "./judicial-office-content";
import { JUDICIAL_GAMEPLAY_KERNEL_DEFINITIONS } from "./judicial-gameplay-kernel-bank";
import type { EntityId, World } from "./types";

export const JUDICIAL_CUSTOM_START_NOTICE =
  "Fictional judicial office practice. This start establishes a workplace and working relationships, not an election, appointment, legal term, or authority to decide cases.";

/** Called only at explicit Custom Begin; never from opening Work or loading a save. */
export function initializeJudicialOfficePractice(
  world: World,
  input: { readonly mode: "custom"; readonly jurisdictionId: EntityId },
): JudicialOfficeResult {
  if (input.mode !== "custom" || world.control.kind !== "person")
    return {
      ok: false,
      world,
      reason: "Judicial office practice requires an explicit Custom Start.",
    };
  const principalId = world.control.personId;
  const principal = world.people[principalId];
  // Authored content adult boundary, expressly not a legal qualification rule.
  if (
    !principal ||
    !isPersonAliveAt(world, principalId, {
      asOfDate: world.currentDate,
      historySequenceExclusive: world.history.nextSequence,
    }) ||
    ageOnDate(principal.birthDate, world.currentDate) < 25 ||
    !world.jurisdictions[input.jurisdictionId]
  )
    return {
      ok: false,
      world,
      reason:
        "This authored office start requires a character aged 25 or older and an available place.",
    };
  const key = `judicial-office:custom:${principalId}`;
  if (world.history.events.some((e) => e.stableKey === `${key}:established`))
    return { ok: true, world };
  if (judicialOfficeContexts(world).length)
    return {
      ok: false,
      world,
      reason: "This person already has a judicial office context.",
    };
  try {
    const provenance = {
      kind: "authored" as const,
      note: JUDICIAL_CUSTOM_START_NOTICE,
    };
    let next = createOrganization(world, {
      stableKey: `${key}:court`,
      formedAt: world.currentDate,
      detailLevel: "lightweight",
      provenance,
      initialProfile: {
        name: "Judicial office — fictional workplace",
        classification: JUDICIAL_OFFICE_CLASSIFICATION,
        locationJurisdictionId: input.jurisdictionId,
      },
    });
    const courtId = next.history.organizations.at(-1)!.id;
    const requirements = [
      ...new Map(
        JUDICIAL_GAMEPLAY_KERNEL_DEFINITIONS.filter((d) =>
          JUDICIAL_OFFICE_CONTENT.some((c) => c.kernelId === d.row.id),
        )
          .flatMap((d) => d.roleRequirements)
          .map((r) => [r.roleKey, r]),
      ).values(),
    ];
    for (const requirement of requirements) {
      // Existing spouse/household truth is preserved; a roommate is not a spouse.
      if (requirement.kind === "shared-household") continue;
      let personId = principalId;
      if (requirement.roleKey !== "principal") {
        const personKey = `${key}:${requirement.roleKey}`;
        const name = drawCanonicalName(
          new SeededRng(world.seed).fork(personKey),
        );
        next = applyCharacterHistoryPlan(next, {
          stableKey: personKey,
          mode: "authored",
          personId: principalId,
          transitions: [
            {
              kind: "context-person",
              input: {
                stableKey: personKey,
                givenName: name.givenName,
                familyName: name.familyName,
                birthDate: makeIsoDate(
                  `${Number(world.currentDate.slice(0, 4)) - 40}-01-01`,
                ),
                homeJurisdictionId: input.jurisdictionId,
              },
            },
          ],
        }).world;
        personId = characterHistoryContextPersonId(next, personKey);
      }
      const insider = requirement.kind === "court-insider";
      next = createWorkRelationship(next, {
        stableKey: `${key}:work:${requirement.roleKey}`,
        personId,
        organizationId: insider ? courtId : null,
        startedAt: world.currentDate,
        kind: "employment:judicial-office-practice",
        compensation: "paid",
        authority:
          requirement.roleKey === "principal"
            ? "directs-others"
            : "self-directed",
        dependency: "dependent",
        economicRisk: "organization-borne",
        provenance,
        initialRole: {
          title:
            requirement.roleKey === "principal"
              ? "Judicial office principal"
              : requirement.roleKey.replaceAll("-", " "),
          occupationClassification: judicialOccupation(requirement.roleKey),
          locationJurisdictionId: input.jurisdictionId,
          timeDemand: {
            expectedWeekly: { minimumHours: 30, maximumHours: 40 },
            attention: "high",
            concurrency: "mostly-exclusive",
            scheduleRigidity: "mixed",
            interruptibility: "limited",
            locationJurisdictionId: input.jurisdictionId,
          },
        },
      });
    }
    next = recordWorldEvent(next, {
      stableKey: `${key}:established`,
      type: "judicial.office-practice-started",
      occurredAt: next.currentDate,
      recordedAt: next.currentDate,
      jurisdictionId: input.jurisdictionId,
      involvedEntityIds: [principalId, courtId],
      participants: [
        {
          personId: principalId,
          role: "agency:custom-start",
          detail: "Explicit fictional judicial office practice premise",
        },
      ],
      personFactConstraints: [],
      visibility: "private",
      tags: ["judicial.office-practice", "authored-fiction", "custom-start"],
      summary: JUDICIAL_CUSTOM_START_NOTICE,
      context: {
        location: {
          jurisdictionId: input.jurisdictionId,
          label: "Judicial office",
          setting: "Custom Start",
        },
        socialContext: JUDICIAL_CUSTOM_START_NOTICE,
        pressure: null,
        choice: "Start with fictional judicial office practice",
        motivation: null,
        immediateReaction: null,
      },
    });
    assertWorldIntegrity(next);
    return { ok: true, world: next };
  } catch (error) {
    return {
      ok: false,
      world,
      reason:
        error instanceof Error ? error.message : "Custom office start failed.",
    };
  }
}
