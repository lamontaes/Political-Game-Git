import { componentsAtGeneration } from "./character-components";
import {
  MODULAR41_HEADS_REGISTRY as repair,
  PRIVATE_CANDIDATE_ART_AVAILABLE,
} from "./private-candidate-manifests";
import type { Pose41Variant } from "./pose41-adapter";
import { describe, it, expect } from "vitest";
import { createNewGameWorld } from "./new-game";
import { resolveOpeningPlaySceneContext } from "./play-scene-context";
import { currentLifeTalkScene } from "./life-talk-presence";
import {
  projectLifeConversation,
  commitLifeConversation,
} from "./life-conversation";
import { openConversationWith } from "./person-conversation-entry";
import { creatorAppearanceDraft } from "./creator-appearance-preview";
import { ENGINE_PEOPLE29_CHARACTER_LIBRARY as library } from "./engine-people29-review";
const setup = {
  startKind: "custom",
  seed: "talk-pair",
  placeKey: "lexington-fayette",
  startAge: 6,
  depth: "play-formative-years",
  startingLife: "ordinary-life",
  household: "shares-a-home",
  givenName: "Audience",
  familyName: "Review",
  gender: "male",
  pronouns: "he-him",
  questionnaire: "skipped",
  appearanceCatalogGeneration: 10,
  appearanceRecipeVersion: "appearance-recipe-v2",
  appearanceOutfitVersion: "complete-outfit-v2",
} as const;
// Head-repair and pose art are owner-private and absent from a public checkout.
type RepairedVariant = Pose41Variant & {
  readonly source: { readonly previousVariantId: string };
};
const packs = import.meta.glob<{
  readonly variants: readonly RepairedVariant[];
}>(
  [
    "../../art/authoring/pose41/pack.json",
    "../../art/authoring/modular41-head-v2/pose-pack.json",
  ],
  { eager: true, import: "default" },
);
const poses = packs["../../art/authoring/pose41/pack.json"] ?? { variants: [] };
const repairedPoses = packs[
  "../../art/authoring/modular41-head-v2/pose-pack.json"
] ?? { variants: [] };
describe("MODULAR41 combined repair", () => {
  it.skipIf(!PRIVATE_CANDIDATE_ART_AVAILABLE)(
    "preserves old raster generations and exact delivered pose contacts while selecting revised heads only in generation 12",
    () => {
      const old = componentsAtGeneration(library, 10).map((c) => c.assetId);
      const fresh = componentsAtGeneration(library, 12).map((c) => c.assetId);
      for (const asset of repair.assets) {
        expect(old).toContain(asset.candidate_component.supersedes_asset_id);
        expect(old).not.toContain(asset.asset_id);
        expect(fresh).toContain(asset.asset_id);
        expect(fresh).not.toContain(
          asset.candidate_component.supersedes_asset_id,
        );
      }
      for (const revised of repairedPoses.variants) {
        const original = poses.variants.find(
          (v) => v.id === revised.source.previousVariantId,
        )!;
        expect(revised.contacts.leftFoot).toEqual(original.contacts.leftFoot);
        expect(revised.contacts.rightFoot).toEqual(original.contacts.rightFoot);
        expect(revised.standingReference).toEqual(original.standingReference);
        expect(revised.layers.filter((l) => l.kind !== "head")).toEqual(
          original.layers.filter((l) => l.kind !== "head"),
        );
      }
    },
  );
  it("quiet home parent is eligible for time-free age-appropriate talk using the actual room roster", () => {
    const { world, playerPersonId: id } = createNewGameWorld(setup);
    const scene = resolveOpeningPlaySceneContext(world, id);
    const parent = scene.presentPeople.find(
      (p) => p.relationship === "your mom",
    )!;
    expect(parent).toBeDefined();
    const view = projectLifeConversation(world, id, parent.personId)!;
    expect(view).not.toBeNull();
    expect(view.intents.map((i) => i.key)).not.toContain("date");
    expect(openConversationWith(world, id, parent.personId)).toMatchObject({
      kind: "available",
    });
    expect(currentLifeTalkScene(world, id)!.presentPersonIds).toEqual([
      id,
      ...scene.presentPeople.map((p) => p.personId),
    ]);
    const next = commitLifeConversation(world, {
      playerPersonId: id,
      personId: parent.personId,
      intent: "greet",
      revision: view.revision,
    });
    expect(next.currentMoment).toEqual(world.currentMoment);
    expect(next.people).toEqual(world.people);
    expect(next.history.events.slice(0, world.history.events.length)).toEqual(
      world.history.events,
    );
    expect(
      projectLifeConversation(next, id, parent.personId)!.transcript,
    ).toHaveLength(1);
    const absent = world.personOrder.find(
      (p) => p !== id && !scene.presentPeople.some((x) => x.personId === p),
    )!;
    if (absent) expect(projectLifeConversation(world, id, absent)).toBeNull();
    expect(projectLifeConversation(world, id, id)).toBeNull();
  });
  it.skipIf(!PRIVATE_CANDIDATE_ART_AVAILABLE)(
    "fresh stated Male/Female defaults stay in the matching structural families across seeds",
    () => {
      for (const gender of ["male", "female"] as const)
        for (let n = 0; n < 12; n++) {
          const draft = creatorAppearanceDraft(
            { ...setup, startAge: 42, gender, seed: `modular41-default-${n}` },
            library,
          )!;
          expect(
            draft.people[draft.personOrder[0]!]!.appearance!.selection!
              .bodyFamily,
          ).toMatch(gender === "male" ? /^ep41-masc-/ : /^ep41-fem-/);
        }
    },
  );
});
