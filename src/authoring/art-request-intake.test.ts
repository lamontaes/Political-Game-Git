import { describe, expect, it } from "vitest";

import {
  ART_REQUEST_INTAKE_VERSION,
  IntakePromotionError,
  NO_DECLARED_CONSUMER,
  SERVES_MANY_CONSUMERS,
  unfilledPromotionFields,
  intakeRecordPath,
  openIntakeRecords,
  promoteToAssetRequest,
  summarizeArtRequestIntake,
  validateArtRequestIntake,
  type ArtRequestIntakeRecord,
} from "./art-request-intake";
import { validateAssetRequests } from "./asset-request";
import { ASSET_TARGET_CLASSES } from "./asset-lineage";

function record(
  overrides: Partial<ArtRequestIntakeRecord> = {},
): ArtRequestIntakeRecord {
  return {
    intakeVersion: ART_REQUEST_INTAKE_VERSION,
    requestId: "community-room-interior",
    title: "A community meeting room a resident would recognize",
    missing: "No plate exists for the community room the meeting happens in.",
    consumerSite: {
      consumerId: "ordinary-public-meeting",
      runtimeComponent: "src/player/PlayerGame.tsx",
      playerVisibleUse:
        "Attending a neighborhood meeting on a weekday evening.",
    },
    jurisdiction: {
      scope: "specific",
      jurisdictionId: "jurisdiction-lexington",
      displayName: "Lexington",
      stateCode: "KY",
    },
    whyNeeded:
      "The meeting is reachable in ordinary play and currently opens on a named room with nothing behind it.",
    origin: "playtest",
    requestedBy: "playtest thread",
    filedAt: "2026-09-21T23:00:00.000Z",
    priority: "P1",
    ...overrides,
  };
}

const PROMOTION = {
  repositoryPathsSearched: ["art/families/", "art/generated/approved/"],
  driveLocationsSearched: ["00_OUR_CIVIC_DUTY_ASSET_FACTORY_ACTIVE/10_SCENES"],
  found: "Nothing. The closest plate is a committee hearing room.",
  shortfall: "A hearing room is a different room with different furniture.",
  generationRecipe: ["A plain municipal meeting room with stacking chairs."],
  acceptanceCriteria: ["Reads as a community room, not a courtroom."],
  target: {
    targetClass: "environment-plate" as const,
    minimumWidth: 2048,
    aspectRatio: "16:9",
    alphaRequired: false,
    container: "png" as const,
    styleAuthority: "Illustrated civic-life environment.",
  },
};

describe("validateArtRequestIntake", () => {
  it("accepts a record a playtest could realistically file", () => {
    expect(validateArtRequestIntake([record()]).valid).toBe(true);
  });

  it("refuses a record with no place in the game", () => {
    const result = validateArtRequestIntake([
      record({
        consumerSite: { runtimeComponent: "", playerVisibleUse: "Somewhere." },
      }),
    ]);
    expect(result.valid).toBe(false);
    expect(result.findings.map((finding) => finding.code)).toContain(
      "missing-consumer-site",
    );
  });

  it("refuses a jurisdiction-independent claim with no reason", () => {
    const result = validateArtRequestIntake([
      record({
        jurisdiction: { scope: "jurisdiction-independent", reason: "  " },
      }),
    ]);
    expect(result.valid).toBe(false);
    expect(result.findings.map((finding) => finding.code)).toContain(
      "missing-jurisdiction-reason",
    );
  });

  it("accepts jurisdiction-independent when it says why", () => {
    expect(
      validateArtRequestIntake([
        record({
          jurisdiction: {
            scope: "jurisdiction-independent",
            reason: "A DMV waiting room looks the same in every state.",
          },
        }),
      ]).valid,
    ).toBe(true);
  });

  it("refuses a seed or a digest as an identity", () => {
    for (const requestId of ["seed-448291", "a".repeat(32)]) {
      const result = validateArtRequestIntake([record({ requestId })]);
      expect(result.valid).toBe(false);
      expect(result.findings.map((finding) => finding.code)).toContain(
        "seed-shaped-request-id",
      );
    }
  });

  it("refuses two records claiming the same id", () => {
    const result = validateArtRequestIntake([record(), record()]);
    expect(result.valid).toBe(false);
    expect(result.findings.map((finding) => finding.code)).toContain(
      "duplicate-request-id",
    );
  });

  it("rejects a state code that is not a real one", () => {
    const result = validateArtRequestIntake([
      record({
        jurisdiction: {
          scope: "specific",
          displayName: "Nowhere",
          stateCode: "ZZ",
        },
      }),
    ]);
    expect(result.valid).toBe(false);
    expect(result.findings.map((finding) => finding.code)).toContain(
      "unknown-state-code",
    );
  });

  it("warns when why-needed only repeats what is missing", () => {
    const result = validateArtRequestIntake([
      record({
        missing: "No community room plate.",
        whyNeeded: "no community room plate",
      }),
    ]);
    expect(result.valid).toBe(true);
    expect(result.findings.map((finding) => finding.code)).toContain(
      "why-needed-restates-missing",
    );
  });
});

describe("what an outdoor plate has to declare", () => {
  const outdoor = (
    visualContext?: ArtRequestIntakeRecord["visualContext"],
  ): ArtRequestIntakeRecord =>
    record({
      targetClass: "environment-plate",
      environmentClass: "park-exterior",
      visualContext,
    });

  const codes = (records: ArtRequestIntakeRecord[]) =>
    validateArtRequestIntake(records).findings.map((finding) => finding.code);

  it("refuses an outdoor plate whose season lives only in the prose", () => {
    const found = codes([outdoor()]);
    expect(found).toContain("outdoor-plate-without-seasons");
    expect(found).toContain("outdoor-plate-without-landform");
    expect(found).toContain("outdoor-plate-without-scene-kind");
    expect(validateArtRequestIntake([outdoor()]).valid).toBe(false);
  });

  it("accepts one that declares them", () => {
    const result = validateArtRequestIntake([
      outdoor({
        seasons: ["winter"],
        landform: "montane-slope",
        vegetation: ["tawny-meadow", "pine-fir"],
        sceneKind: "open-landscape",
      }),
    ]);
    expect(result.valid).toBe(true);
  });

  it("asks an interior none of it", () => {
    // The case that has to stay easy: a playtesting thread reporting that a
    // community room has no art does not classify vegetation to be heard.
    const result = validateArtRequestIntake([
      record({
        targetClass: "environment-plate",
        environmentClass: "civic-interior",
      }),
    ]);
    expect(result.valid).toBe(true);
    expect(result.findings.map((finding) => finding.code)).not.toContain(
      "outdoor-plate-without-seasons",
    );
  });

  it("makes an environment plate say which kind of environment it is", () => {
    expect(codes([record({ targetClass: "environment-plate" })])).toContain(
      "environment-plate-without-environment-class",
    );
  });

  it("rejects a season or a landform outside the shared vocabulary", () => {
    const found = codes([
      outdoor({
        seasons: ["monsoon" as never],
        landform: "tundra" as never,
        sceneKind: "aerial" as never,
      }),
    ]);
    expect(found).toContain("unknown-season");
    expect(found).toContain("unknown-landform");
    expect(found).toContain("unknown-scene-kind");
  });
});

describe("what a figure request has to declare", () => {
  const codes = (records: ArtRequestIntakeRecord[]) =>
    validateArtRequestIntake(records).findings.map((finding) => finding.code);

  it("refuses a seated request that does not say what makes it seated", () => {
    const found = codes([
      record({ figureContext: { postureClass: "seated" } }),
    ]);
    expect(found).toContain("non-standing-posture-without-cues");
    expect(
      validateArtRequestIntake([
        record({ figureContext: { postureClass: "seated" } }),
      ]).valid,
    ).toBe(false);
  });

  it("accepts a seated request that names the cues", () => {
    const result = validateArtRequestIntake([
      record({
        figureContext: {
          postureClass: "seated",
          postureCues: ["bent-knees", "thighs-forward"],
        },
      }),
    ]);
    expect(result.valid).toBe(true);
  });

  it("asks a standing figure for no cues", () => {
    const result = validateArtRequestIntake([
      record({ figureContext: { postureClass: "standing" } }),
    ]);
    expect(result.valid).toBe(true);
  });

  it("rejects a posture outside the pose families' vocabulary", () => {
    expect(
      codes([record({ figureContext: { postureClass: "crouched" as never } })]),
    ).toContain("unknown-posture-class");
  });

  it("will not let one record be both a figure and a plate", () => {
    expect(
      codes([
        record({
          figureContext: { postureClass: "standing" },
          visualContext: { seasons: ["summer"] },
        }),
      ]),
    ).toContain("figure-and-environment-context-together");
  });
});

describe("promoteToAssetRequest", () => {
  it("makes a seated pose a criterion a short upright figure fails", () => {
    const request = promoteToAssetRequest(
      record({
        figureContext: {
          postureClass: "seated",
          postureCues: ["bent-knees", "thighs-forward"],
        },
      }),
      PROMOTION,
    );
    const first = request.acceptanceCriteria[0]!;
    expect(first).toContain("seated");
    expect(first).toContain("bent-knees");
    expect(first).toContain("shorter legs");
    expect(validateAssetRequests([request]).valid).toBe(true);
  });

  it("carries the declared look into criteria a delivery can fail", () => {
    const request = promoteToAssetRequest(
      record({
        targetClass: "environment-plate",
        environmentClass: "park-exterior",
        visualContext: {
          seasons: ["winter"],
          landform: "montane-slope",
          vegetation: ["tawny-meadow"],
          sceneKind: "open-landscape",
        },
      }),
      PROMOTION,
    );
    expect(request.acceptanceCriteria[0]).toContain("Shows winter");
    expect(request.acceptanceCriteria[0]).toContain("wrong");
    expect(request.acceptanceCriteria.join(" ")).toContain("montane-slope");
    expect(request.acceptanceCriteria.join(" ")).toContain("tawny-meadow");
    // The author's own criteria survive, after the ones anyone can check.
    expect(request.acceptanceCriteria).toContain(
      "Reads as a community room, not a courtroom.",
    );
    expect(validateAssetRequests([request]).valid).toBe(true);
  });

  it("produces a request the bench's own validator accepts", () => {
    const request = promoteToAssetRequest(record(), PROMOTION);
    expect(validateAssetRequests([request]).valid).toBe(true);
    expect(request.status).toBe("queued");
  });

  it("carries the place and the person who noticed into the bench record", () => {
    const request = promoteToAssetRequest(record(), PROMOTION);
    expect(request.whyNeeded).toContain("Lexington, KY");
    expect(request.whyNeeded).toContain("playtest thread");
  });

  it("refuses to promote without an inventory search", () => {
    expect(() =>
      promoteToAssetRequest(record(), {
        ...PROMOTION,
        repositoryPathsSearched: [],
        driveLocationsSearched: [],
      }),
    ).toThrow(IntakePromotionError);
  });

  it("refuses to promote without a recipe or criteria", () => {
    expect(() =>
      promoteToAssetRequest(record(), { ...PROMOTION, generationRecipe: [] }),
    ).toThrow(IntakePromotionError);
    expect(() =>
      promoteToAssetRequest(record(), { ...PROMOTION, acceptanceCriteria: [] }),
    ).toThrow(IntakePromotionError);
  });
});

describe("the queue", () => {
  it("treats a promoted record as history", () => {
    const records = [
      record(),
      record({
        requestId: "already-promoted",
        promotedToRequestId: "env-community-room",
      }),
    ];
    expect(openIntakeRecords(records)).toHaveLength(1);
    expect(summarizeArtRequestIntake(records)).toMatchObject({
      total: 2,
      open: 1,
      jurisdictionSpecific: 1,
    });
  });

  it("gives every record its own file, so two threads never collide", () => {
    expect(intakeRecordPath("community-room-interior")).toBe(
      "art/requests/incoming/community-room-interior.json",
    );
  });
});

describe("unfilledPromotionFields", () => {
  /**
   * The test that stops somebody later "finishing" the command.
   *
   * `inventoryCheck` records which paths and Drive locations were actually
   * searched. A plausible one is a search nobody ran, written into the one file
   * the Art Desk trusts, and he would then be deciding against a fabricated
   * provenance. The same is true of a geometry floor nobody measured. So the
   * only correct output for a record that carries neither is to emit nothing
   * and say so.
   */
  it("emits no inventory check and no target geometry for a record carrying neither", () => {
    const unfilled = unfilledPromotionFields(record(), {});
    const joined = unfilled.join("\n");
    expect(joined).toContain("inventoryCheck.repositoryPathsSearched");
    expect(joined).toContain("inventoryCheck.found");
    expect(joined).toContain("inventoryCheck.shortfall");
    expect(joined).toContain("target.minimumWidth");
    expect(joined).toContain("target.aspectRatio");
    expect(joined).toContain("target.alphaRequired");
    expect(joined).toContain("target.container");
    expect(joined).toContain("target.styleAuthority");
    expect(joined).toContain("generationRecipe");
    expect(joined).toContain("acceptanceCriteria");
  });

  it("does not treat the record's own prose search as the registry's path list", () => {
    const withProse = record({
      alreadySearched: [
        "art/generated/candidates/wave-a-chairless — the automatic pass already ran",
      ],
    });
    const unfilled = unfilledPromotionFields(withProse, {});
    expect(unfilled.join("\n")).toContain("alreadySearched");
    expect(
      unfilled.some((field) =>
        field.startsWith("inventoryCheck.repositoryPathsSearched"),
      ),
    ).toBe(true);
  });

  it("takes the target class from the record when the record carries one", () => {
    const unfilled = unfilledPromotionFields(
      record({
        targetClass: "environment-plate",
        environmentClass: "civic-interior",
      }),
      {},
    );
    expect(
      unfilled.some((field) => field.startsWith("target.targetClass")),
    ).toBe(false);
  });

  it("reports nothing unfilled once every answer is supplied", () => {
    expect(unfilledPromotionFields(record(), PROMOTION)).toEqual([]);
  });
});

describe("consumerId is a required answer", () => {
  it("refuses a record with no consumer named", () => {
    const codes = validateArtRequestIntake([
      record({
        consumerSite: {
          consumerId: "",
          runtimeComponent: "src/player/PlayerGame.tsx",
          playerVisibleUse: "Attending a neighborhood meeting.",
        },
      }),
    ]).findings.map((finding) => finding.code);
    expect(codes).toContain("missing-consumer-id");
  });

  it("refuses a consumer id nobody declares, so a typo fails here and not at integration", () => {
    const codes = validateArtRequestIntake([
      record({
        consumerSite: {
          consumerId: "ordinary-public-meetings",
          runtimeComponent: "src/player/PlayerGame.tsx",
          playerVisibleUse: "Attending a neighborhood meeting.",
        },
      }),
    ]).findings.map((finding) => finding.code);
    expect(codes).toContain("unknown-consumer-id");
  });

  it("accepts the two answers that are true without naming one consumer", () => {
    for (const answer of [SERVES_MANY_CONSUMERS, NO_DECLARED_CONSUMER]) {
      expect(
        validateArtRequestIntake([
          record({
            consumerSite: {
              consumerId: answer,
              runtimeComponent: "ModularCharacter",
              playerVisibleUse: "Wherever a pose anchor asks for it.",
            },
          }),
        ]).valid,
      ).toBe(true);
    }
  });

  it("no longer invents 'unassigned' on the way into the bench", () => {
    const request = promoteToAssetRequest(
      record({
        consumerSite: {
          consumerId: SERVES_MANY_CONSUMERS,
          runtimeComponent: "ModularCharacter",
          playerVisibleUse: "Wherever a pose anchor asks for it.",
        },
      }),
      PROMOTION,
    );
    expect(request.consumer.consumerId).toBe(SERVES_MANY_CONSUMERS);
    expect(request.consumer.consumerId).not.toBe("unassigned");
  });
});

describe("a promotion declares whether it is a generation job", () => {
  /**
   * The Art Desk offers every request without a hold for generation. A hand
   * pass over plates that already exist must therefore say so on the way in,
   * or the Desk asks somebody to draw a picture that is already drawn.
   */
  it("carries a declared hold and invents none when the promotion is silent", () => {
    expect(
      promoteToAssetRequest(record(), {
        ...PROMOTION,
        generationHold: "already-covered-candidate",
      }).generationHold,
    ).toBe("already-covered-candidate");
    expect(promoteToAssetRequest(record(), PROMOTION).generationHold).toBe(
      undefined,
    );
  });
});

describe("the registry checks its own target vocabulary", () => {
  /**
   * The drift this exists to stop already happened. "character-component"
   * shipped in six entries of art/requests/asset-requests.json while
   * `AssetTargetClass` did not list it, and nothing failed, so a figure could
   * be filed and could not be promoted — the only class left for it said never
   * shipped. The type and the data had diverged with no check between them.
   */
  it("rejects a target class the lineage vocabulary does not define", () => {
    const promoted = promoteToAssetRequest(record(), PROMOTION);
    const bent = {
      ...promoted,
      target: {
        ...promoted.target,
        targetClass: "charcter-component" as never,
      },
    };
    const validation = validateAssetRequests([bent]);
    expect(validation.valid).toBe(false);
    expect(validation.findings.map((finding) => finding.code)).toContain(
      "unknown-target-class",
    );
  });

  it("accepts every class the vocabulary does define", () => {
    for (const targetClass of ASSET_TARGET_CLASSES) {
      const request = promoteToAssetRequest(record(), {
        ...PROMOTION,
        target: { ...PROMOTION.target, targetClass },
      });
      expect(validateAssetRequests([request]).valid).toBe(true);
    }
  });
});
