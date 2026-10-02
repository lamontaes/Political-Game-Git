import { composeWorldTimeHandlers } from "../../src/simulation/campaigns";
import { ensureOpeningJudiciary } from "../../src/simulation/judiciary/opening";
import research from "../../data/research/justice/sentencing-ranges-2026.json" with { type: "json" };
import { recordWorldEvent } from "../../src/simulation/world";
import { courtFor } from "../../src/simulation/judiciary/court-for";
import {
  seatsForCourt,
  seatHolderAt,
} from "../../src/simulation/judiciary/courts";
import {
  recordPrinciples,
  createFormationContext,
} from "../../src/simulation/politics";
import { latestPrinciple } from "../../src/simulation/queries";
import { propositionIdByKey } from "../../src/simulation/justice/pretrial";
import type {
  EntityId,
  World,
  FutureTransitionHandlerRegistry,
} from "../../src/simulation/types";

/** Authored case inputs, never an authored sentence or substituted offense. */
export function recordedVandalismClemencyCase(
  world: World,
  personId: EntityId,
  stateKey: string,
) {
  world = ensureOpeningJudiciary(world);
  const place = (
    research.places as Record<
      string,
      { basis: string; offenses: Record<string, { offense: string }> }
    >
  )[stateKey];
  const row = place?.offenses["crime:vandalism"];
  if (!row) throw new Error(`Missing vandalism research row: ${stateKey}`);
  const jurisdictionId = world.people[personId]!.homeJurisdictionId;
  const court = courtFor(
    world,
    jurisdictionId,
    "local-general-trial",
    "criminal",
  );
  if (!court) throw new Error("The fixture has no actual trial court.");
  const propositionId = propositionIdByKey(
    world,
    "justice-public-safety.mandatory-minimum-sentences",
  );
  if (!propositionId) throw new Error("Missing sentencing principle question.");
  const inputs = seatsForCourt(world, court.courtId).flatMap((seat) => {
    const holder = seatHolderAt(world, seat.seatId);
    if (!holder) return [];
    return (
      world.policyCatalog.propositions[propositionId]!.principles ?? []
    ).map((bearing) => ({
      stableKey: `fixture:clemency-judge:${holder.personId}:${bearing.principleId}`,
      personId: holder.personId,
      principleId: bearing.principleId,
      formedAt: world.currentDate,
      stance:
        bearing.bearing === "against"
          ? ("rejects" as const)
          : ("endorses" as const),
      strength: 1,
      conviction: "strong" as const,
      flexibility: "conditional" as const,
      qualification:
        "Authored fixture: this actual judge favors firm sentences; the court still decides the sourced term.",
      formation: createFormationContext("reflection:initial"),
      supersedesPrincipleRecordId:
        latestPrinciple(world, holder.personId, bearing.principleId)?.id ??
        null,
    }));
  });
  if (!inputs.length)
    throw new Error("The fixture has no actual seated judge.");
  world = recordPrinciples(world, inputs);
  world = recordWorldEvent(world, {
    stableKey: "fixture:clemency-vandalism-evidence",
    type: "fixture.recorded-vandalism",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId,
    visibility: "private",
    involvedEntityIds: [personId],
    participants: [
      {
        personId,
        role: "agency:actor",
        detail: "Authored vandalism charge facts.",
      },
    ],
    personFactConstraints: [],
    tags: [
      "fixture:explicit-vandalism-grade",
      `fixture:research-basis:${place.basis}`,
    ],
    summary: `Authored charge evidence: ${row.offense}.`,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const event = world.history.events.at(-1)!;
  return {
    world,
    basisEventIds: [event.id],
    sentencingAllegations: {
      grade: { value: row.offense, sourceEventIds: [event.id] },
    },
  };
}

/** All real due handlers; omit unrelated per-day life work in this isolated court proof. */
export function recordedCourtFixtureClock(): FutureTransitionHandlerRegistry {
  const handlers = composeWorldTimeHandlers();
  return { get: (key) => handlers.get(key) };
}
