import { describe, expect, it } from "vitest";

import {
  createRunAFixture,
  parseRunAFixtureState,
  RUN_A_FIXTURE_STATE_NAMES,
  RUN_A_HIDDEN_CANONICAL_TEXT,
} from "./run-a-fixture";
import {
  loadLearnedConcepts,
  persistLearnedConcepts,
  RUN_A_CIVIC_CONCEPT_ID,
} from "./run-a-learning";
import { RUN_A_SCENE_LAYOUT, validateRunASceneLayout } from "./run-a-layout";
import {
  projectRunADossier,
  projectRunAFixtureDossier,
} from "./run-a-projection";
import {
  createRunAUiState,
  resolveRunAPinSize,
  RUN_A_PIN_IDS,
  runAUiReducer,
  type RunAUiAction,
  type RunAUiState,
} from "./run-a-state";

class MemoryStorage {
  readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

function createState(
  fixtureState: Parameters<typeof parseRunAFixtureState>[0] = "normal",
) {
  const fixture = createRunAFixture();
  return {
    fixture,
    state: createRunAUiState({
      simulationDate: fixture.world.currentDate,
      simulationActionSequence: fixture.world.actionSequence,
      scenePersonId: fixture.scenePerson.personId,
      fixtureState: parseRunAFixtureState(fixtureState),
    }),
  };
}

describe("Stage 6.5 Run A presentation", () => {
  it("builds the same bounded office fixture for the same seed", () => {
    expect(createRunAFixture()).toEqual(createRunAFixture());
  });

  it("maps every required deterministic browser state", () => {
    for (const fixtureState of RUN_A_FIXTURE_STATE_NAMES) {
      expect(parseRunAFixtureState(fixtureState)).toBe(fixtureState);
    }
    expect(parseRunAFixtureState("not-a-fixture")).toBe("normal");
  });

  it("projects known, unknown, and uncertain information without numeric meters", () => {
    const dossier = projectRunAFixtureDossier(createRunAFixture());
    const serialized = JSON.stringify(dossier);

    expect(dossier.name).toBe("Andre Collins");
    expect(dossier.age.access).toBe("institutionally-accessible");
    expect(dossier.relationship.access).toBe("personally-known");
    expect(dossier.read.access).toBe("inferred-uncertain");
    expect(dossier.unresolved.access).toBe("unknown");
    expect(dossier.knownFacts).toHaveLength(3);
    expect(serialized).not.toMatch(/probability|relationshipScore|meter/i);
  });

  it("does not reveal the deliberately hidden canonical private belief", () => {
    const fixture = createRunAFixture();
    const hiddenBelief = fixture.world.history.privateBeliefs.find(
      (belief) => belief.personId === fixture.scenePerson.personId,
    );
    const dossier = projectRunAFixtureDossier(fixture);

    expect(hiddenBelief?.rationale).toBe(RUN_A_HIDDEN_CANONICAL_TEXT);
    expect(JSON.stringify(dossier)).not.toContain(RUN_A_HIDDEN_CANONICAL_TEXT);
    expect(JSON.stringify(dossier)).not.toContain(hiddenBelief?.propositionId);
  });

  it("uses natural player-facing Lexington labels without rewriting canonical identity", () => {
    const fixture = createRunAFixture();
    const dossier = projectRunAFixtureDossier(fixture);
    const jurisdictionId = fixture.world.jurisdictionOrder[0];
    const jurisdiction = jurisdictionId
      ? fixture.world.jurisdictions[jurisdictionId]
      : undefined;
    const scenePerson = fixture.world.people[fixture.scenePerson.personId];
    const birthplace = scenePerson?.establishedFacts.find(
      (fact) => fact.kind === "birthplace",
    );

    expect(jurisdiction?.name).toBe("Lexington-Fayette, Kentucky");
    expect(birthplace?.jurisdictionId).toBe(jurisdictionId);
    expect(dossier.homePlace.value).toBe("Lexington, Kentucky");
    expect(fixture.locationDisplayName).toBe("Lexington, Kentucky");
    expect(fixture.locationLabel).toBe("Lexington, KY · Legislative Office");
  });

  it("does not silently present home jurisdiction as hometown", () => {
    const fixture = createRunAFixture();
    const personId = fixture.scenePerson.personId;
    const person = fixture.world.people[personId];
    if (!person) throw new Error("Run A test fixture lost its scene person.");

    const withoutKinds = (kinds: readonly string[]) => {
      const establishedFacts = person.establishedFacts.filter(
        (fact) => !kinds.includes(fact.kind),
      );
      const projectedPerson =
        person.detailLevel === "materialized"
          ? {
              ...person,
              establishedFacts,
              details: {
                ...person.details,
                generatedFacts: person.details.generatedFacts.filter(
                  (fact) => !kinds.includes(fact.kind),
                ),
              },
            }
          : { ...person, establishedFacts };

      return projectRunADossier(
        {
          ...fixture.world,
          people: {
            ...fixture.world.people,
            [personId]: projectedPerson,
          },
        },
        fixture.playerPersonId,
        fixture.scenePerson,
      );
    };

    const residenceFallback = withoutKinds(["birthplace"]);
    expect(residenceFallback.homePlace.label).toBe("Residence");
    expect(residenceFallback.homePlace.access).toBe(
      "institutionally-accessible",
    );

    const unknownHometown = withoutKinds(["birthplace", "residence"]);
    expect(unknownHometown.homePlace).toMatchObject({
      label: "Hometown",
      value: "Not known",
      access: "unknown",
    });
    expect(person.homeJurisdictionId).toBeTruthy();
  });

  it("replaces the person action menu with the dossier", () => {
    const { fixture, state } = createState();
    const menuState = runAUiReducer(state, {
      type: "select-person",
      personId: fixture.scenePerson.personId,
    });
    const dossierState = runAUiReducer(menuState, { type: "inspect-person" });

    expect(menuState.overlay).toBe("person-actions");
    expect(dossierState.overlay).toBe("dossier");
    expect(dossierState.selectedPersonId).toBe(fixture.scenePerson.personId);
  });

  it("preserves simulation time and sequence across ordinary UI actions", () => {
    const { fixture, state: initialState } = createState();
    const actions: readonly RunAUiAction[] = [
      { type: "select-person", personId: fixture.scenePerson.personId },
      { type: "inspect-person" },
      { type: "dismiss-overlay" },
      { type: "toggle-navigation" },
      { type: "open-submenu" },
      { type: "close-navigation" },
      { type: "open-civic-learning" },
      {
        type: "mark-concept-learned",
        conceptId: RUN_A_CIVIC_CONCEPT_ID,
      },
      { type: "set-pin-size", pinId: "person", size: "expanded" },
    ];
    let state: RunAUiState = initialState;

    for (const action of actions) {
      state = runAUiReducer(state, action);
      expect(state.simulationDate).toBe(fixture.world.currentDate);
      expect(state.simulationActionSequence).toBe(fixture.world.actionSequence);
    }
    expect(fixture.world.currentDate).toBe("2026-01-05");
    expect(fixture.world.actionSequence).toBe(0);
  });

  it("marks civic learning only after an explicit state transition", () => {
    const { state } = createState();
    const navigationOpen = runAUiReducer(state, {
      type: "toggle-navigation",
    });
    const opened = runAUiReducer(navigationOpen, {
      type: "open-civic-learning",
    });
    const learned = runAUiReducer(opened, {
      type: "mark-concept-learned",
      conceptId: RUN_A_CIVIC_CONCEPT_ID,
    });

    expect(opened.learnedConceptIds).toEqual([]);
    expect(opened.navigation).toBe("closed");
    expect(learned.learnedConceptIds).toEqual([RUN_A_CIVIC_CONCEPT_ID]);
    expect(learned.overlay).toBe("none");
  });

  it("round-trips bounded learned-concept persistence", () => {
    const storage = new MemoryStorage();
    persistLearnedConcepts(storage, [
      RUN_A_CIVIC_CONCEPT_ID,
      RUN_A_CIVIC_CONCEPT_ID,
      "unsupported-concept",
    ]);

    expect(loadLearnedConcepts(storage)).toEqual([RUN_A_CIVIC_CONCEPT_ID]);
    storage.setItem("political-game:run-a:learned-concepts:v1", "not-json");
    expect(loadLearnedConcepts(storage)).toEqual([]);
  });

  it("keeps a manual pin size authoritative over later automatic sizing", () => {
    const { state } = createState();
    const manual = runAUiReducer(state, {
      type: "set-pin-size",
      pinId: "person",
      size: "expanded",
    });
    const automatic = runAUiReducer(manual, {
      type: "set-automatic-pin-size",
      pinId: "person",
      size: "tiny",
    });

    expect(resolveRunAPinSize(automatic, "person")).toBe("expanded");
  });

  it("keeps Pinned user-controlled and closes sizing controls in one action", () => {
    const { state } = createState();
    expect(RUN_A_PIN_IDS).toStrictEqual(["person", "person-b"]);
    const opened = runAUiReducer(state, {
      type: "toggle-pin-controls",
      pinId: "person",
    });
    expect(opened.activePinMenuId).toBe("person");
    const sized = runAUiReducer(opened, {
      type: "set-pin-size",
      pinId: "person",
      size: "expanded",
    });
    expect(sized.activePinMenuId).toBeNull();
    expect(sized.manualPinSizes.person).toBe("expanded");
    const automaticallyResized = runAUiReducer(sized, {
      type: "set-automatic-pin-size",
      pinId: "person",
      size: "tiny",
    });
    expect(resolveRunAPinSize(automaticallyResized, "person")).toBe("expanded");
  });

  it("supports semantic keyboard-equivalent transitions through the reducer", () => {
    const { fixture, state } = createState();
    const activated = runAUiReducer(state, {
      type: "select-person",
      personId: fixture.scenePerson.personId,
    });
    const inspected = runAUiReducer(activated, { type: "inspect-person" });
    const dismissed = runAUiReducer(inspected, { type: "dismiss-overlay" });

    expect(activated.overlay).toBe("person-actions");
    expect(inspected.overlay).toBe("dossier");
    expect(dismissed.overlay).toBe("none");
  });

  it("accepts the seated anchor and rejects obvious furniture failures", () => {
    expect(validateRunASceneLayout(RUN_A_SCENE_LAYOUT)).toEqual([]);

    expect(
      validateRunASceneLayout({
        ...RUN_A_SCENE_LAYOUT,
        personFootprint: { x: 63, y: 68, width: 12, height: 8 },
        scenePlacementAnchor: {
          ...RUN_A_SCENE_LAYOUT.scenePlacementAnchor,
          y: 20,
          scale: 1.45,
        },
      }),
    ).toEqual(
      expect.arrayContaining([
        "The person anchor does not rest on the office floor plane.",
        "The person scale is inconsistent with the office fixture.",
        "The person's physical footprint intersects the desk.",
      ]),
    );
  });

  it("does not inspect without an explicitly selected person", () => {
    const { state } = createState();
    expect(runAUiReducer(state, { type: "inspect-person" })).toBe(state);
    expect(state.selectedPersonId).toBeNull();
  });

  it("keeps opaque stable IDs out of player-facing copy", () => {
    const dossier = projectRunAFixtureDossier(createRunAFixture());
    expect(typeof dossier.personId).toBe("string");
    expect(
      dossier.knownFacts.every((fact) => !fact.value.includes("person_")),
    ).toBe(true);
  });
});
