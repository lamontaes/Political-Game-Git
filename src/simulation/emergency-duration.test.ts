import { describe, expect, it } from "vitest";
import { addDays } from "./dates";
import { activeExecutiveEmergency } from "./executive-emergencies";
import {
  declareHazardEpisode,
  decideStateDisasterRequest,
  disasterResponses,
} from "./crisis/disaster";
import { searchLifePlaces } from "./life-places";
import { SeededRng } from "./rng";
import { STATES } from "./state-reference";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../presentation/new-game";
import {
  currentStateExecutiveHolders,
  ensureStateExecutiveIncumbent,
} from "./nationwide-world/state-executives";
import {
  decideGoverningMatter,
  governingMatters,
  governorOfficeForJurisdiction,
  openEmergencyMatter,
} from "./governing/state-governing";
import { executiveRulePackForJurisdiction } from "./executive-authority-rule-packs";
import { crisisRecords } from "./crisis/records";
import type { EntityId } from "./types";

describe("emergency declaration lifecycle", () => {
  it("records an emergency's rule duration and lets disaster response read it", () => {
    const seed = "session38-emergency-new-game-20261006";
    const rng = new SeededRng(seed);
    const stateUsps = rng.pick(Object.keys(STATES));
    const jurisdictionKey = `US-${stateUsps}`;
    const place = rng.pick(
      searchLifePlaces("", 100, {
        scope: "locality",
        stateJurisdictionKey: jurisdictionKey,
      }),
    );
    const game = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      startKind: "normal",
      placeKey: place.key,
      startAge: 30,
      depth: "summarize-earlier-life",
      startingLife: "ordinary-life",
      seed,
      questionnaire: "skipped",
      priors: [],
    });
    const playerId = Object.keys(game.world.people)[0] as EntityId;
    const prepared = ensureStateExecutiveIncumbent(
      game.world,
      playerId,
      stateUsps,
    );
    const governor = currentStateExecutiveHolders(prepared).find(
      (holder) => holder.stateUsps === stateUsps,
    )!;
    const office = governorOfficeForJurisdiction(prepared, jurisdictionKey)!;
    const controlled = {
      ...prepared,
      control: { kind: "person" as const, personId: governor.personId },
    };
    expect(
      openEmergencyMatter(controlled, office.officeKey, {
        instance: "synthetic-condition",
        episodeId: "missing-hazard-episode" as EntityId,
      }),
    ).toBe(controlled);
    const hazard = declareHazardEpisode(controlled, {
      stableKey: "session38-emergency-response-input",
      family: "severe-storm",
      magnitude: "major",
      stateUsps,
      jurisdictionIds: [office.jurisdictionId],
      durationDays: 3,
      basis: "A recorded scenario hazard for emergency response integration.",
      sourceReference: null,
    });
    const episode = crisisRecords(hazard).find(
      (record) =>
        record.kind === "hazard-episode" &&
        record.stableKey.endsWith("session38-emergency-response-input"),
    );
    if (!episode || episode.kind !== "hazard-episode")
      throw new Error("The new game did not record its hazard.");
    const matter = governingMatters(hazard, office.officeKey).find(
      (item) =>
        item.family === "emergency" &&
        item.openedEvent.tags.includes(`source-event:${episode.eventId}`),
    );
    expect(matter).toBeDefined();
    const declared = decideGoverningMatter(
      hazard,
      matter!.id,
      "emergency:declare",
    );
    expect(declared.ok).toBe(true);
    const declaration = activeExecutiveEmergency(
      declared.world,
      office.jurisdictionId,
    );
    const duration =
      executiveRulePackForJurisdiction(jurisdictionKey).emergencyDeclaration
        .initialDurationDays;
    expect(duration.kind).toBe("known");
    if (!declaration || !declaration.activeUntil || duration.kind !== "known")
      throw new Error("The emergency declaration did not become active.");
    const executiveOrder = declared.world.history.legislativeMeasures?.find(
      (measure) => measure.id === declaration.executiveOrderMeasureId,
    );
    expect(executiveOrder?.executiveAuthorityJurisdictionKey).toBe(
      jurisdictionKey,
    );
    expect(executiveOrder?.executiveAuthorityChecks).toEqual([
      {
        clause: {
          kind: "emergency-declaration",
          topicKey: "severe-storm:major",
        },
      },
    ]);
    expect(declaration.activeUntil).toBe(
      addDays(declared.world.currentDate, duration.value - 1),
    );
    expect(
      activeExecutiveEmergency(
        declared.world,
        office.jurisdictionId,
        addDays(declaration.activeUntil, 1),
      ),
    ).toBeNull();

    expect(
      governingMatters(hazard, office.officeKey).some(
        (item) =>
          item.family === "emergency" &&
          item.openedEvent.tags.includes(`source-event:${episode.eventId}`),
      ),
    ).toBe(true);
    const requested = decideStateDisasterRequest(
      declared.world,
      episode.id,
      "request",
    );
    expect(disasterResponses(requested, episode.id)).toContainEqual(
      expect.objectContaining({
        stage: "state-request",
        emergencyDeclarationId: declaration.declarationId,
      }),
    );
    console.info("Session 38 emergency random new-game proof", {
      seed,
      place: place.displayName,
      jurisdictionKey,
      declarationId: declaration.declarationId,
      orderMeasureId: declaration.executiveOrderMeasureId,
      activeUntil: declaration.activeUntil,
      hazardId: episode.id,
    });
  });
});
