import { expect, it } from "vitest";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import {
  setupForArtPreview,
  prepareCandidateOpeningWorld,
} from "./art-preview";
import { searchLifePlaces } from "../simulation/life-places";
import { serializeWorld, deserializeWorld } from "../simulation/serialization";
import { ENGINE_PEOPLE29_CHARACTER_LIBRARY as library } from "./engine-people29-review";
import { preparedFamily, selectPreparedBody } from "./engine-people29-data";
import {
  initializeFreshCandidateOutfits,
  findCompleteOutfit,
  resolveCompleteOutfit,
  commitCompleteOutfit,
} from "./complete-outfit";
import { computeCharacterGenerationSignature } from "./character-components";
import {
  encodeReplayDescriptor,
  decodeReplayDescriptor,
} from "./new-game-identity";
import {
  PRIVATE_CANDIDATE_ART_AVAILABLE,
  candidateGenerations,
} from "./private-candidate-manifests";
// Prepared candidate art is owner-private and absent from a public checkout.
const needsPrivateArt = !PRIVATE_CANDIDATE_ART_AVAILABLE;
const [oldGeneration] = candidateGenerations("engine29");

it.skipIf(needsPrivateArt)(
  "ordinary lives in Lexington and Louisville draw recorded defaults, varied complete outfits, and actual female parents",
  () => {
    let femaleParents = 0,
      oldMismatches = 0;
    const tones = new Set<string>(),
      bodies = new Set<string>(),
      shirts = new Set<string>();
    for (const town of ["Lexington", "Louisville"]) {
      const place = searchLifePlaces(town, 20, {
        stateJurisdictionKey: "US-KY",
        scope: "locality",
      }).find((p) => p.displayName.startsWith(town))!;
      expect(place, town).toBeDefined();
      for (const gender of ["female", "male"] as const)
        for (let n = 0; n < 3; n++) {
          const setup = setupForArtPreview(
            {
              ...DEFAULT_NEW_GAME_SETUP,
              seed: `p34-ordinary-${town}-${gender}-${n}`,
              startKind: "normal",
              startAge: n === 0 ? 34 : 10,
              placeKey: place.key,
              gender,
              pronouns: gender === "female" ? "she-her" : "he-him",
            },
            "candidate-review",
          );
          const raw = createNewGameWorld(setup).world;
          const world = prepareCandidateOpeningWorld(
            raw,
            setup,
            "candidate-review",
          );
          const replay = decodeReplayDescriptor(encodeReplayDescriptor(setup))!;
          expect(
            prepareCandidateOpeningWorld(
              createNewGameWorld(replay).world,
              replay,
              "candidate-review",
            ),
          ).toEqual(world);
          const legacy = initializeFreshCandidateOutfits(
            raw,
            library,
            "complete-outfit-v1",
          );
          for (const id of world.personOrder) {
            const person = world.people[id]!,
              appearance = person.appearance!;
            const family = preparedFamily(appearance.selection?.bodyFamily)!;
            expect(family, id).toBeDefined();
            expect(appearance.catalogGeneration).toBe(
              library.catalogGeneration,
            );
            expect(appearance.selection!.bodyFamily).toMatch(/^ep41-/);
            expect(
              resolveCompleteOutfit({
                appearance,
                library,
                poseFamily: "standing-neutral",
              }).ok,
              id,
            ).toBe(true);
            if (
              person.identity?.gender === "female" ||
              person.identity?.gender === "male"
            ) {
              const presentation =
                person.identity.gender === "female" ? "feminine" : "masculine";
              expect(family.geometry.presentation, id).toBe(presentation);
              if (
                preparedFamily(
                  legacy.people[id]!.appearance!.selection!.bodyFamily,
                )!.geometry.presentation !== presentation
              )
                oldMismatches++;
            }
            if (
              person.identity?.gender === "female" &&
              world.history.kinshipRelationships.some(
                (k) =>
                  k.kind === "lineal:parent-child" && k.personIds.includes(id),
              ) &&
              world.control.kind === "person" &&
              id !== world.control.personId
            )
              femaleParents++;
            expect(person.identity).toEqual(raw.people[id]!.identity);
            tones.add(appearance.material!.palettes.skin);
            bodies.add(family.bodyType);
            shirts.add(appearance.outfit!.families.top!);
          }
          expect(world.history).toEqual(raw.history);
          expect(deserializeWorld(serializeWorld(world))).toEqual(world);
          expect(
            initializeFreshCandidateOutfits(
              world,
              library,
              "complete-outfit-v2",
            ),
          ).toEqual(world);
          const renamed = {
            ...raw,
            people: Object.fromEntries(
              Object.entries(raw.people).map(([id, p]) => [
                id,
                { ...p, givenName: "Same", familyName: "Unrelated" },
              ]),
            ),
          };
          const result = initializeFreshCandidateOutfits(
            renamed,
            library,
            "complete-outfit-v2",
          );
          for (const id of world.personOrder)
            expect(result.people[id]!.appearance).toEqual(
              world.people[id]!.appearance,
            );
        }
    }
    expect(femaleParents).toBeGreaterThan(0);
    expect(oldMismatches).toBeGreaterThan(0);
    // Current-bank painted rasters carry their tone in the source pixels; the
    // material token is deliberately singular rather than pretending those
    // colours are runtime tints.
    expect(tones).toEqual(new Set(["source-colour"]));
    expect(bodies.size).toBeGreaterThan(2);
    expect(shirts.size).toBeGreaterThan(2);
  },
);

it.skipIf(needsPrivateArt)(
  "generation5 and v1 replay stay frozen; explicit body override never rewrites identity",
  () => {
    const members = [...library.components.values()].filter(
      (c) => c.definition.catalog_generation === 5,
    );
    expect(computeCharacterGenerationSignature(members)).toBe(
      oldGeneration.signature,
    );
    const setup = {
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "p34-old-save",
      startAge: 34,
      gender: "female" as const,
      appearanceCatalogGeneration: 5,
      appearanceOutfitVersion: "complete-outfit-v1" as const,
    };
    const old = prepareCandidateOpeningWorld(
      createNewGameWorld(setup).world,
      setup,
      "candidate-review",
    );
    const bytes = serializeWorld(old);
    expect(
      prepareCandidateOpeningWorld(
        deserializeWorld(bytes),
        setup,
        "candidate-review",
      ),
    ).toEqual(old);
    if (old.control.kind !== "person") throw Error("Expected person");
    const id = old.control.personId,
      appearance = selectPreparedBody(
        old.people[id]!.appearance!,
        "ep29-masc-lean-body",
      )!;
    const matching = findCompleteOutfit({
      appearance,
      library,
      poseFamily: "standing-neutral",
    });
    expect(matching.ok).toBe(true);
    if (!matching.ok) return;
    const changed = commitCompleteOutfit(old, id, appearance, {
      library,
      poseFamily: "standing-neutral",
      families: matching.families,
    });
    expect(changed.people[id]!.identity).toEqual(old.people[id]!.identity);
    expect(changed.people[id]!.appearance!.selection!.bodyFamily).toBe(
      "ep29-masc-lean-body",
    );
    expect(serializeWorld(old)).toBe(bytes);
  },
);
