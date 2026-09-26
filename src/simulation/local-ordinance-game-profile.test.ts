import { describe, expect, it } from "vitest";
import { createScenarioWorld } from "./demo";
import { governmentUnit } from "./government-units";
import { rulePackById } from "./legislature-rule-packs";
import { requireLifePlace } from "./life-places";
import {
  LOCAL_ORDINANCE_GAME_PROFILE_VERSION,
  localGovernmentGameProfile,
  localOrdinanceGameRulePackById,
} from "./local-ordinance-game-profile";
import { LOCAL_ORDINANCE_SOURCE_ANCHORS } from "./local-ordinance-source-anchors.generated";
import { MUNICIPAL_RULE_PACKS_JSON } from "./municipal-rule-registry.generated";
import { measureEnactment, measurePosition } from "./legislation";
import {
  municipalGovernmentByKey,
  municipalGovernmentForLifePlace,
  municipalGovernments,
  municipalProcedureReading,
  municipalRulePackFor,
  municipalRuleSourceRef,
  primaryReading,
} from "./municipal-government";
import {
  installMunicipalGovernment,
  introduceMunicipalOrdinance,
  municipalSeats,
  seatMunicipalMember,
} from "./municipal-public-work";
import {
  passMunicipalOrdinance,
  placeMunicipalOrdinanceOnAgenda,
} from "./municipal-ordinance-procedure";
import { deserializeWorld, serializeWorld } from "./serialization";
import type { LegislativeVoteDisposition } from "./types";
import { advanceWorld } from "./world";
import { municipalWorkspaceFor } from "../presentation/municipal-workspace";
import { projectMunicipalGoverning } from "../presentation/municipal-governing";

describe("local ordinance game profile", () => {
  it("keeps the compact cold-lookup source anchors aligned with the full corpus", () => {
    expect(
      (JSON.parse(MUNICIPAL_RULE_PACKS_JSON) as { packId: string }[]).map(
        (pack) => pack.packId,
      ),
    ).toEqual([
      "us-dc-washington-council-v1",
      "us-va-charlottesville-council-v1",
    ]);
    const entries = Object.entries(LOCAL_ORDINANCE_SOURCE_ANCHORS);
    expect(entries).toHaveLength(65);
    expect(municipalGovernments()).toHaveLength(144);
    for (const [unitId, anchor] of entries) {
      const government = municipalGovernmentByKey(anchor.governmentKey)!;
      const reading = primaryReading(government);
      expect(anchor.sourceEvidence).toBe(reading.evidence);
      expect(anchor.bodyName).toBe(reading.bodyName);
      expect(anchor.bodySize).toBe(reading.bodySize);
      expect(anchor.bodySizeSource).toEqual(
        reading.bodySize === null
          ? null
          : municipalRuleSourceRef(reading, "body size"),
      );
      const procedure = reading.procedure;
      expect(anchor.safeGameProcedure).toBe(
        procedure.publicHearing === null &&
          procedure.readings === null &&
          procedure.mayoralActionState !== "KNOWN" &&
          procedure.committeeReferralState !== "KNOWN" &&
          procedure.introductionToPassage == null &&
          procedure.betweenReadings == null,
      );
      const pack = localOrdinanceGameRulePackById(
        `${unitId}:${LOCAL_ORDINANCE_GAME_PROFILE_VERSION}`,
      );
      expect(pack !== null).toBe(anchor.safeGameProcedure);
      if (pack && anchor.bodySize !== null) {
        expect(pack.chambers[0]!.seats).toEqual({
          kind: "known",
          value: anchor.bodySize,
          source: anchor.bodySizeSource,
        });
      }
    }
  });
  it.each([
    ["gus2025:100019", "municipality", 5],
    ["gus2025:100001", "county", 5],
    ["gus2025:101703", "township", 3],
  ] as const)(
    "gives %s a stable disclosed %s procedure",
    (key, type, seats) => {
      const unit = governmentUnit(key)!;
      expect(unit.unitType).toBe(type);
      const government = localGovernmentGameProfile(unit)!;
      expect(government.key).toBe(unit.id);
      expect(primaryReading(government).evidence).toBe("game-profile");
      const result = municipalRulePackFor(government);
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error(JSON.stringify(result.missing));
      expect(result.pack.basis).toBe("game-profile");
      expect(result.pack.packId).toContain(
        LOCAL_ORDINANCE_GAME_PROFILE_VERSION,
      );
      expect(result.pack.chambers[0]!.seats).toMatchObject({
        kind: "known",
        value: seats,
        source: { authority: "game-profile", verification: "game-profile" },
      });
      expect(rulePackById(result.pack.packId)).toEqual(result.pack);
      expect(municipalGovernmentByKey(key)?.key).toBe(key);
    },
  );

  it("preserves a sourced place government ahead of a catalog game profile", () => {
    const government = municipalGovernmentForLifePlace(
      requireLifePlace("5114968"),
    )!;
    expect(government.key).toBe("us-va-charlottesville");
    expect(primaryReading(government).evidence).toBe("enacted-text");
    expect(municipalGovernmentByKey("gus2025:211254")?.key).toBe(
      "us-or-portland",
    );
  });

  it("keeps a partial sourced charter separate from its executable game procedure", () => {
    const government = municipalGovernmentByKey("us-or-portland")!;
    expect(primaryReading(government).evidence).toBe("enacted-text");
    expect(primaryReading(government).procedure.passageText).toBeNull();
    const procedure = municipalProcedureReading(government);
    expect(procedure.evidence).toBe("game-profile");
    expect(procedure.procedure.passageText).toContain("game profile");
    const pack = municipalRulePackFor(government);
    expect(pack.ok).toBe(true);
    if (!pack.ok) throw new Error(JSON.stringify(pack.missing));
    expect(pack.evidence).toBe("game-profile");
    expect(rulePackById(pack.pack.packId)).toEqual(pack.pack);
  });

  it("projects each catalog government type by stable key without writing world history", () => {
    const place = requireLifePlace("0162328");
    const created = createScenarioWorld(
      "local-profile-inspection",
      place.context,
      {
        peopleCount: 8,
      },
    );
    const world = {
      ...created,
      control: { kind: "person" as const, personId: created.personOrder[0]! },
    };
    const before = world.history.nextSequence;
    for (const key of ["gus2025:100019", "gus2025:100001", "gus2025:101703"]) {
      const view = municipalWorkspaceFor(world, key);
      expect(view?.government.key).toBe(key);
      expect(view?.reading.evidence).toBe("game-profile");
    }
    expect(world.history.nextSequence).toBe(before);
  });

  it("carries a member's ordinary ordinance through save, agenda, vote and enactment", () => {
    const place = requireLifePlace("0162328");
    const government = municipalGovernmentForLifePlace(place)!;
    expect(primaryReading(government).evidence).toBe("game-profile");
    let world = createScenarioWorld("local-profile-prattville", place.context, {
      peopleCount: 8,
    });
    world = installMunicipalGovernment(world, {
      governmentKey: government.key,
      jurisdictionId: place.context.jurisdiction.id,
      formedAt: world.currentDate,
    });
    for (let index = 0; index < 5; index += 1) {
      world = seatMunicipalMember(world, {
        governmentKey: government.key,
        personId: world.personOrder[index + 1]!,
        startedAt: world.currentDate,
        role: index === 0 ? "presiding-member" : "member",
        seatLabel: `Profile seat ${index + 1}`,
      });
    }
    world = {
      ...world,
      control: { kind: "person", personId: world.personOrder[1]! },
    };
    const view = projectMunicipalGoverning(world, government.key);
    expect(view?.evidence).toBe("game-profile");
    expect(view?.ordinanceIntroduction.ok).toBe(true);
    const filed = introduceMunicipalOrdinance(world, {
      governmentKey: government.key,
      designation: "Ord. 26-1",
      shortTitle: "Street access",
      summary: "A councilor proposes a street access rule.",
    });
    expect(filed.ok).toBe(true);
    if (!filed.ok) throw new Error(filed.reason);
    const measure = filed.world.history.legislativeMeasures!.at(-1)!;
    const placed = placeMunicipalOrdinanceOnAgenda(filed.world, {
      governmentKey: government.key,
      measureId: measure.id,
    });
    expect(placed.ok).toBe(true);
    if (!placed.ok) throw new Error(placed.reason);
    const restored = deserializeWorld(serializeWorld(placed.world));
    const nextDay = advanceWorld(restored, 1);
    const voters = municipalSeats(nextDay, government.key);
    const dispositions: LegislativeVoteDisposition[] = voters.map(
      (seat, i) => ({
        memberKey: `council:${i + 1}`,
        personId: seat.personId,
        disposition: i < 3 ? "yea" : "nay",
      }),
    );
    const passed = passMunicipalOrdinance(nextDay, {
      governmentKey: government.key,
      measureId: measure.id,
      dispositions,
      provenance: {
        method: "authored-fixture",
        note: "Recorded council test vote.",
        sourceEntityIds: [],
      },
    });
    expect(passed.ok).toBe(true);
    if (!passed.ok) throw new Error(passed.reason);
    expect(measurePosition(passed.world, measure.id).phase).toBe("enacted");
    expect(measureEnactment(passed.world, measure.id)?.effectiveAt).toBe(
      passed.world.currentDate,
    );
    expect(
      passed.world.history.events.find(
        (event) => event.stableKey === `municipal-recognized:${government.key}`,
      )?.summary,
    ).toContain("fictional game profile");
  });
});
