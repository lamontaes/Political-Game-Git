import { describe, expect, it } from "vitest";

import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import { passOrdinaryDays } from "../presentation/ordinary-life";
import {
  introduceProjectedOrdinance,
  placeProjectedOrdinanceOnAgenda,
  takeProjectedOrdinanceVote,
  takeProjectedOverrideVote,
} from "../presentation/municipal-governing";
import { addDays } from "./dates";
import { dcCouncilActTitle } from "./dc-council-sittings";
import { lifePlaceSearch } from "./life-places";
import { recordOrganizationParticipationState } from "./life";
import { organizationParticipationStateAt } from "./life-queries";
import {
  measureActions,
  measureEnactment,
  measurePosition,
  recordExecutiveAction,
  replayMeasure,
} from "./legislation";
import {
  municipalGovernmentByKey,
  municipalRulePackFor,
  primaryReading,
} from "./municipal-government";
import {
  COUNCIL_ACT_OVERRIDE_DEADLINE,
  actOnCouncilMeasure,
  congressionalReviewEffectiveOn,
  councilActOverrideDeadlineHandler,
  municipalOrdinanceStatus,
  overrideCouncilVeto,
} from "./municipal-ordinance-procedure";
import { municipalMeasures, municipalSeats } from "./municipal-public-work";
import {
  DC_GOVERNMENT_KEY,
  dcCouncilSeatAWinnerTakes,
} from "./nationwide-world/district-of-columbia-council-opening";
import { seatMunicipalMember } from "./municipal-public-work";
import { deserializeWorld, serializeWorld } from "./serialization";
import type { FutureDueItem, World } from "./types";

/**
 * The Council of the District of Columbia passes acts under the Home Rule Act:
 * two readings with at least 13 days intervening, a majority of those present
 * and voting, presentment to the Mayor for 10 days excluding weekends, a
 * two-thirds reenactment within 30 days of a return, and congressional review.
 */

function openWashington(seed: string): World {
  const place = lifePlaceSearch("Washington", 40).find(
    (candidate) => candidate.displayName === "Washington, District of Columbia",
  )!;
  return generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      placeKey: place.key,
      seed,
    }),
  ).game!.world;
}

/** Put the player in an opening member's seat, as a won race would. */
function seatPlayer(world: World): World {
  const player =
    world.control.kind === "person" ? world.control.personId : null;
  const displaced = dcCouncilSeatAWinnerTakes(world)!;
  const state = organizationParticipationStateAt(
    world,
    displaced.participationId,
  )!;
  const next = recordOrganizationParticipationState(world, {
    stableKey: `test:${displaced.participationId}:ended`,
    participationId: displaced.participationId,
    effectiveAt: world.currentDate,
    status: "ended",
    roleKind: state.roleKind,
    context: "Succeeded",
    provenance: { kind: "authored", note: "test" },
    supersedesStateId: state.id,
  });
  return seatMunicipalMember(next, {
    governmentKey: DC_GOVERNMENT_KEY,
    personId: player!,
    startedAt: next.currentDate,
    role: "member",
    seatLabel: displaced.seatLabel ?? "Ward 1",
  });
}

describe("the D.C. Council's procedure, compiled from the Home Rule Act", () => {
  const government = municipalGovernmentByKey(DC_GOVERNMENT_KEY)!;
  const pack = municipalRulePackFor(government);

  it("admits a complete rule pack", () => {
    expect(pack.ok).toBe(true);
    if (!pack.ok) return;
    const council = pack.pack.chambers[0]!;
    expect(council.name).toBe("Council of the District of Columbia");
    expect(council.floorStages.map((stage) => stage.stageKey)).toEqual([
      "reading-1",
      "final-passage",
    ]);
    for (const stage of council.floorStages) {
      expect(stage.vote.kind).toBe("known");
    }
    expect(pack.pack.executive.presentmentRequired).toMatchObject({
      kind: "known",
      value: true,
    });
    expect(pack.pack.executive.override).toMatchObject({
      kind: "each-chamber",
      threshold: { numerator: 2, denominatorParts: 3 },
    });
    // The placeholder is carried beside the pack, never as a sourced fact.
    expect(pack.carriedOutsideThePack.join(" ")).toContain(
      "dc-council-rules-of-organization-and-procedure",
    );
  });

  it("reads 13 intervening days and a 10-weekday executive window", () => {
    const procedure = primaryReading(government).procedure;
    expect(procedure.readings).toBe(2);
    expect(procedure.betweenReadings).toMatchObject({
      minimumInterveningDays: 13,
    });
    expect(procedure.mayoralActionWindow).toEqual({
      daysToAct: 10,
      dayBasis: "BUSINESS",
      inactionOutcome: "BECOMES_LAW_WITHOUT_SIGNATURE",
    });
    expect(procedure.introductionSponsorship).toBeNull();
  });

  it("counts the 30-day review in weekdays from the day of transmittal", () => {
    // Tuesday, March 31, 2026 is day 1; Monday, May 11 is day 30.
    expect(congressionalReviewEffectiveOn("2026-03-31", 30)).toBe("2026-05-12");
    // Transmitted on a Saturday: counting starts Monday.
    expect(congressionalReviewEffectiveOn("2026-03-28", 1)).toBe("2026-03-31");
  });

  it("titles an act from its question", () => {
    expect(dcCouncilActTitle("Consumer data privacy law", "2026")).toBe(
      "Consumer Data Privacy Act of 2026",
    );
  });
});

describe("a life that starts in Washington, D.C.", () => {
  const opened = openWashington("dc-council-acts");

  it("seats all thirteen members, one of them the presiding Chairman", () => {
    const seats = municipalSeats(opened, DC_GOVERNMENT_KEY);
    expect(seats).toHaveLength(13);
    expect(seats.filter((seat) => seat.role === "presiding-member")).toEqual([
      expect.objectContaining({ seatLabel: "Chairman (at large)" }),
    ]);
    expect(
      seats.filter((seat) => seat.seatLabel?.startsWith("Ward ")),
    ).toHaveLength(8);
    // A winner never displaces the Chairman.
    expect(dcCouncilSeatAWinnerTakes(opened)!.seatLabel).not.toContain(
      "Chairman",
    );
  });

  it("passes acts on its own, each under the Home Rule Act's clock", () => {
    let world = opened;
    for (let step = 0; step < 4; step += 1) world = passOrdinaryDays(world, 30);
    const measures = municipalMeasures(world, DC_GOVERNMENT_KEY);
    expect(measures.length).toBeGreaterThan(3);
    const enacted = measures.filter(
      (measure) => measurePosition(world, measure.id).phase === "enacted",
    );
    expect(enacted.length).toBeGreaterThan(0);
    for (const measure of measures) {
      expect(replayMeasure(world, measure.id).violations).toEqual([]);
      const readings = measureActions(world, measure.id).filter(
        (action) => action.kind === "floor-stage-passed",
      );
      if (readings.length === 2) {
        expect(
          readings[1]!.occurredAt >= addDays(readings[0]!.occurredAt, 14),
        ).toBe(true);
      }
    }
    for (const measure of enacted) {
      const actions = measureActions(world, measure.id).map((a) => a.kind);
      expect(actions).toContain("presented-to-executive");
      const enactment = measureEnactment(world, measure.id)!;
      expect(enactment.effectiveAt).toBe(
        congressionalReviewEffectiveOn(enactment.resolvedAt, 30),
      );
    }
    // A save keeps the Council's pending work.
    const reloaded = deserializeWorld(serializeWorld(world));
    expect(municipalMeasures(reloaded, DC_GOVERNMENT_KEY)).toHaveLength(
      measures.length,
    );
  }, 180_000);

  it("carries a councilmember's own act through both readings to the Mayor", () => {
    let world = seatPlayer(opened);
    const introduced = introduceProjectedOrdinance(
      world,
      DC_GOVERNMENT_KEY,
      "Act 26-900",
      "Neighborhood Library Hours Act of 2026",
    );
    expect(introduced.ok).toBe(true);
    world = introduced.world;
    const measure = municipalMeasures(world, DC_GOVERNMENT_KEY).find(
      (candidate) => candidate.designation === "Act 26-900",
    )!;
    const agenda = placeProjectedOrdinanceOnAgenda(
      world,
      DC_GOVERNMENT_KEY,
      measure.id,
    );
    expect(agenda.ok).toBe(true);
    world = agenda.world;
    expect(
      municipalOrdinanceStatus(world, DC_GOVERNMENT_KEY, measure.id)!
        .stageLabel,
    ).toBe("Reading 1");

    // Record readings until the first passes (authored colleague ballots).
    const first = takeProjectedOrdinanceVote(
      world,
      DC_GOVERNMENT_KEY,
      measure.id,
      "yea",
    );
    expect(first.ok).toBe(true);
    world = first.world;
    expect(measurePosition(world, measure.id).phase).toBe("on-floor");

    // The second reading waits 13 whole days.
    const early = takeProjectedOrdinanceVote(
      { ...world, currentDate: addDays(world.currentDate, 13) },
      DC_GOVERNMENT_KEY,
      measure.id,
      "yea",
    );
    expect(early.ok).toBe(false);
    if (!early.ok) expect(early.reason).toContain("13 whole intervening days");

    world = passOrdinaryDays(world, 14);
    const second = takeProjectedOrdinanceVote(
      world,
      DC_GOVERNMENT_KEY,
      measure.id,
      "yea",
    );
    expect(second.ok).toBe(true);
    world = second.world;
    expect(measurePosition(world, measure.id).phase).toBe("awaiting-executive");
    const status = municipalOrdinanceStatus(
      world,
      DC_GOVERNMENT_KEY,
      measure.id,
    )!;
    expect(status.executiveActsBy).not.toBeNull();
    // A councilmember is not the Mayor.
    expect(
      actOnCouncilMeasure(world, {
        governmentKey: DC_GOVERNMENT_KEY,
        measureId: measure.id,
        decision: "sign",
      }).ok,
    ).toBe(false);
  });

  it("reenacts a returned act by two-thirds, or lets the return stand", () => {
    let world = seatPlayer(opened);
    world = introduceProjectedOrdinance(
      world,
      DC_GOVERNMENT_KEY,
      "Act 26-901",
      "Street Tree Act of 2026",
    ).world;
    const measure = municipalMeasures(world, DC_GOVERNMENT_KEY).find(
      (candidate) => candidate.designation === "Act 26-901",
    )!;
    world = placeProjectedOrdinanceOnAgenda(
      world,
      DC_GOVERNMENT_KEY,
      measure.id,
    ).world;
    world = takeProjectedOrdinanceVote(
      world,
      DC_GOVERNMENT_KEY,
      measure.id,
      "yea",
    ).world;
    expect(measurePosition(world, measure.id).phase).toBe("on-floor");
    world = passOrdinaryDays(world, 14);
    world = takeProjectedOrdinanceVote(
      world,
      DC_GOVERNMENT_KEY,
      measure.id,
      "yea",
    ).world;
    expect(measurePosition(world, measure.id).phase).toBe("awaiting-executive");
    const returned = recordExecutiveAction(world, {
      stableKey: `${measure.stableKey}:executive`,
      measureId: measure.id,
      action: "vetoed",
      rationale: "Returned.",
    });
    expect(measurePosition(returned, measure.id).phase).toBe(
      "awaiting-override",
    );

    // Nobody reenacts it: when the 30 days are up the return stands.
    const due = {
      entityIds: [measure.id],
      transitionKey: COUNCIL_ACT_OVERRIDE_DEADLINE,
    } as unknown as FutureDueItem;
    const lapsed = councilActOverrideDeadlineHandler(returned, due).world;
    expect(measurePosition(lapsed, measure.id)).toMatchObject({
      phase: "failed",
      outcome: "vetoed-and-sustained",
    });

    // The vote to reenact counts two-thirds of those present and voting.
    // With these authored colleague ballots, short of two-thirds.
    const short = takeProjectedOverrideVote(
      returned,
      DC_GOVERNMENT_KEY,
      measure.id,
      "yea",
    );
    expect(short.ok).toBe(true);
    expect(measurePosition(short.world, measure.id).phase).toBe("failed");

    // Nine of thirteen present and voting yea is two-thirds; it becomes law
    // after congressional review.
    const seats = municipalSeats(returned, DC_GOVERNMENT_KEY);
    const dispositions = seats.map((seat, index) => ({
      memberKey: `council:${index + 1}`,
      personId: seat.personId,
      disposition: index < 9 ? ("yea" as const) : ("nay" as const),
    }));
    const carried = overrideCouncilVeto(returned, {
      governmentKey: DC_GOVERNMENT_KEY,
      measureId: measure.id,
      dispositions,
      provenance: {
        method: "authored-fixture",
        note: "test",
        sourceEntityIds: [],
      },
    });
    expect(carried.ok).toBe(true);
    expect(measurePosition(carried.world, measure.id).phase).toBe("enacted");
    expect(measureEnactment(carried.world, measure.id)!.effectiveAt).toBe(
      congressionalReviewEffectiveOn(carried.world.currentDate, 30),
    );
    // Eight of thirteen is not two-thirds.
    const eight = overrideCouncilVeto(returned, {
      governmentKey: DC_GOVERNMENT_KEY,
      measureId: measure.id,
      dispositions: dispositions.map((entry, index) => ({
        ...entry,
        disposition: index < 8 ? ("yea" as const) : ("nay" as const),
      })),
      provenance: {
        method: "authored-fixture",
        note: "test",
        sourceEntityIds: [],
      },
    });
    expect(measurePosition(eight.world, measure.id).phase).toBe("failed");
  });
});
