import { describe, expect, it } from "vitest";

import {
  assertWorldIntegrity,
  recordRelationshipInteraction,
  serializeWorld,
  type EntityId,
  type RelationshipInteractionKind,
  type World,
} from "../simulation";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { openOrdinaryLife, passOrdinaryDays } from "./ordinary-life";
import { projectCampaign, spendAnAfternoon } from "./campaign-projection";
import { fileForOffice } from "../../tests/fixtures/campaign-fixture";
import {
  applyLegislativeCommand,
  openLegislativeWork,
} from "./legislation-world";
import { openLegislativeBargaining } from "./legislative-bargaining-world";
import { resolvePlayerCapabilities } from "./player-capabilities";
import { priorWorkEvidence } from "./prior-work-evidence";
import { characterHistoryContextPersonId } from "../simulation";

/**
 * 79R2 — social acquaintance is not shared work.
 *
 * At 6d4e7f4 the read asked only whether ANY interaction named both people.
 * A `contact:met-socially` record whose own summary said no work had been
 * shared came back as "You have worked together before". These tests pin the
 * three evidence classes apart, at the classifier and at the rendered line.
 */

/** The accepted first-win route, on the canonical winning seed. */
function seatedMemberAtTheSitting() {
  const built = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    seed: "p85c-owner-0",
    startAge: 34,
    placeKey: "lexington-fayette",
    gender: "male",
    pronouns: "he-him",
    questionnaire: "skipped",
  });
  let world = openOrdinaryLife(built.world, built.playerPersonId);
  const personId = built.playerPersonId;
  world = fileForOffice(world, personId);
  world = spendAnAfternoon(world, personId, "fundraising");
  for (let index = 0; index < 3; index += 1) {
    world = passOrdinaryDays(world);
    world = spendAnAfternoon(world, personId, "outreach");
  }
  for (
    let day = 0;
    day < 60 && projectCampaign(world, personId).phase === "active";
    day += 1
  ) {
    world = passOrdinaryDays(world);
  }
  expect(projectCampaign(world, personId).phase).toBe("won");

  const capabilities = resolvePlayerCapabilities(world);
  const scenarioKey = capabilities.legislativeScenarioKey!;
  const opened = openLegislativeWork(world, {
    playerPersonId: personId,
    scenarioKey,
    jurisdictionId: capabilities.legislativeJurisdictionId!,
  });
  world = opened.world;
  for (const step of [
    "request-referral",
    "request-committee-hearing",
    "move-committee-report",
    "request-calendar-placement",
  ] as const) {
    world = applyLegislativeCommand(world, opened.assignment, {
      kind: "take-step",
      step,
    }).world;
  }
  // Entry once, so the advocate exists as a canonical context person and can
  // be written about before the read is taken.
  const first = openLegislativeBargaining(world, {
    playerPersonId: personId,
  });
  expect(first.kind).toBe("available");
  if (first.kind !== "available") throw new Error("entry unavailable");
  return {
    world: first.world,
    personId,
    scenarioKey,
    advocatePersonId: characterHistoryContextPersonId(
      first.world,
      `legislative-work:${scenarioKey}:advocate`,
    ),
  };
}

function withInteraction(
  world: World,
  first: EntityId,
  second: EntityId,
  kind: RelationshipInteractionKind,
  summary: string,
): World {
  const next = recordRelationshipInteraction(world, {
    stableKey: `79r2:interaction:${kind}`,
    personIds: [first, second],
    eventId: null,
    occurredAt: world.currentDate,
    kind,
    change: "maintained",
    significance: "minor",
    summary,
    tags: [],
  });
  assertWorldIntegrity(next);
  return next;
}

/** The rendered read for the advocate at a fresh entry into the sitting. */
function advocateRead(world: World, personId: EntityId): string {
  const entry = openLegislativeBargaining(world, {
    playerPersonId: personId,
  });
  expect(entry.kind).toBe("available");
  if (entry.kind !== "available") throw new Error("entry unavailable");
  return entry.seat.scenePeople[0].qualitativeRead;
}

describe("79R2 finding B — the read claims only the history the record holds", () => {
  it("claims no work, and no acquaintance, when nothing puts them together", () => {
    const staged = seatedMemberAtTheSitting();
    expect(
      priorWorkEvidence(staged.world, staged.personId, staged.advocatePersonId),
    ).toBe("none");
    const read = advocateRead(staged.world, staged.personId);
    expect(read).not.toMatch(/worked together/i);
    expect(read).toBe("A colleague you do not know");
  });

  it("reads a purely social contact as having met, never as having worked together", () => {
    const staged = seatedMemberAtTheSitting();
    const social = withInteraction(
      staged.world,
      staged.personId,
      staged.advocatePersonId,
      "contact:met-socially",
      "They were introduced at a reception and have shared no work.",
    );
    // This is the exact 79A2 control that came back as "worked together".
    expect(
      priorWorkEvidence(social, staged.personId, staged.advocatePersonId),
    ).toBe("acquaintance");
    const read = advocateRead(social, staged.personId);
    expect(read).not.toMatch(/worked together/i);
    expect(read).toBe("Someone you have met before");
  });

  it("reads a work collaboration as shared work", () => {
    const staged = seatedMemberAtTheSitting();
    const collaborated = withInteraction(
      staged.world,
      staged.personId,
      staged.advocatePersonId,
      "work:collaboration",
      "They worked the same bill through committee.",
    );
    expect(
      priorWorkEvidence(collaborated, staged.personId, staged.advocatePersonId),
    ).toBe("shared-work");
    expect(advocateRead(collaborated, staged.personId)).toBe(
      "You have worked together before",
    );
  });

  it("uses the work evidence when both social and work records exist", () => {
    const staged = seatedMemberAtTheSitting();
    let world = withInteraction(
      staged.world,
      staged.personId,
      staged.advocatePersonId,
      "contact:met-socially",
      "They were introduced at a reception.",
    );
    world = withInteraction(
      world,
      staged.personId,
      staged.advocatePersonId,
      "work:collaboration",
      "They worked the same bill through committee.",
    );
    expect(
      priorWorkEvidence(world, staged.personId, staged.advocatePersonId),
    ).toBe("shared-work");
    expect(advocateRead(world, staged.personId)).toBe(
      "You have worked together before",
    );
  });

  it("does not let a missing interaction record erase shared work another canonical record holds", () => {
    const staged = seatedMemberAtTheSitting();
    // A recorded legislative negotiation is, by its own contract, the two of
    // them dealing with each other over a measure. No relationship interaction
    // exists here at all.
    expect(
      staged.world.history.relationshipInteractions.filter(
        (record) =>
          record.personIds.includes(staged.personId) &&
          record.personIds.includes(staged.advocatePersonId),
      ),
    ).toHaveLength(0);
    const negotiated = {
      ...staged.world,
      history: {
        ...staged.world.history,
        legislativeNegotiations: [
          ...(staged.world.history.legislativeNegotiations ?? []),
          {
            ...requireOneNegotiationShape(),
            initiatorPersonId: staged.personId,
            counterpartyPersonId: staged.advocatePersonId,
          },
        ],
      },
    } as World;
    expect(
      priorWorkEvidence(negotiated, staged.personId, staged.advocatePersonId),
    ).toBe("shared-work");
  });

  it("writes no relationship history on entry, re-entry, or reload", () => {
    const staged = seatedMemberAtTheSitting();
    const before = serializeWorld(staged.world);
    const beforeCount = staged.world.history.relationshipInteractions.length;

    const again = openLegislativeBargaining(staged.world, {
      playerPersonId: staged.personId,
    });
    expect(again.kind).toBe("available");
    if (again.kind !== "available") return;
    expect(again.world.history.relationshipInteractions).toHaveLength(
      beforeCount,
    );
    expect(serializeWorld(again.world)).toBe(before);
    expect(again.seat.scenePeople[0].qualitativeRead).toBe(
      "A colleague you do not know",
    );
  });
});

/**
 * A minimal, structurally valid negotiation record. The two person ids are
 * supplied by the caller; everything else is inert filler whose only job is to
 * satisfy the record's shape for a read-only classification test.
 */
function requireOneNegotiationShape() {
  return {
    id: "legislative-negotiation_79r2probe" as EntityId,
    stableKey: "79r2:negotiation-probe",
    sequence: 0,
    measureId: "legislative-measure_79r2probe" as EntityId,
    provisionKey: null,
    initiatorPersonId: "" as EntityId,
    counterpartyPersonId: "" as EntityId,
    character: "policy-request" as const,
    request: "A section for the district.",
    disposition: "declined" as const,
    audience: "private" as const,
    occurredAt: "2026-01-01",
    eventId: "event_79r2probe" as EntityId,
    decisionTraceId: null,
  };
}
