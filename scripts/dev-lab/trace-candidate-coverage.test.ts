import { writeFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../../src/presentation/new-game";
import { resolvePersonPortrait } from "../../src/presentation/person-visual";
import {
  CANDIDATE_REVIEW_CHARACTER_LIBRARY,
  CANDIDATE_REVIEW_VISUAL_LIBRARY,
  PRODUCTION_CHARACTER_LIBRARY,
} from "../../src/presentation/visual-integration";
import { buildCharacterRenderPlan } from "../../src/presentation/character-render-plan";
import {
  CANDIDATE_REVIEW_POSE_ART,
  PRODUCTION_POSE_ART,
  PRODUCTION_POSE_REGISTRY,
  PRODUCTION_VISUAL_LIBRARY,
} from "../../src/presentation/visual-integration";
import { composeSceneCharacter } from "../../src/presentation/scene-composition";
import { resolveLifeScene } from "../../src/presentation/life-scene";
import { SCENE_REGISTRY } from "../../src/presentation/scene-registry";
import { derivePersonAppearance, personName } from "../../src/simulation";
import type { EntityId, Person, World } from "../../src/simulation/types";

/**
 * Can the banked candidate library dress a canonical person at all?
 *
 * The production libraries refuse every generated adult for one reason —
 * `development-fixture-only`: the plan completes, but every component it names
 * is regression fixture art rather than a released likeness. That is the
 * refusal the owner sees as initials, and it is a RELEASE-eligibility refusal,
 * not a missing-art refusal.
 *
 * A local development preview would answer it by composing against the banked
 * candidate review library instead. Whether that actually produces a person is
 * a question about the art bank, not about the UI, so it is measured here
 * before any preview surface is built on the assumption.
 *
 * This asserts nothing about quality. It reports coverage and the exact first
 * refusal per person, for both libraries, so the preview is designed against
 * what the bank contains rather than against what it would be convenient for
 * the bank to contain.
 *
 *   npx vitest run scripts/dev-lab/trace-candidate-coverage.test.ts
 */

const RULE = "─".repeat(72);

/*
 * Vitest 4 intercepts console output and drops it from a passing run, so the
 * report is written where it can actually be read afterwards rather than
 * printed into a stream that swallows it.
 */
const REPORT = "test-results/candidate-coverage.txt";
const lines: string[] = [];
function say(text: string): void {
  lines.push(text);
}

function ageOf(person: Person, world: World): number | null {
  if (!person.birthDate) return null;
  return (
    Number(world.currentDate.slice(0, 4)) - Number(person.birthDate.slice(0, 4))
  );
}

function probe(
  person: Person,
  library: typeof PRODUCTION_CHARACTER_LIBRARY,
  visuals: typeof CANDIDATE_REVIEW_VISUAL_LIBRARY,
): string {
  const appearance = person.appearance ?? derivePersonAppearance(person.id);
  let planned;
  try {
    planned = buildCharacterRenderPlan({
      personId: person.id,
      appearance,
      anchor: {
        id: "person-portrait",
        xPercent: 50,
        yPercent: 55,
        scale: 1,
        poseFamily: "standing-neutral",
        depth: 1,
        bodyWidthPercent: 35,
      },
      plate: { width: 100, height: 100 },
      library,
      visualLibrary: visuals,
    });
  } catch (error) {
    // The planner's OWN message. `resolvePersonPortrait` flattens every throw
    // to `appearance-unresolvable`, which is what made this undiagnosable from
    // the screen in the first place.
    return `threw: ${error instanceof Error ? error.message : String(error)}`;
  }
  const fixtures = planned.layers.filter(
    (layer) => library.components.get(layer.assetId)?.fixture,
  ).length;
  return `complete=${planned.complete} layers=${planned.layers.length} fixture-layers=${fixtures}`;
}

/**
 * The room, not the portrait.
 *
 * A portrait needs no pose art; a person standing in a scene does, and the
 * production index is built from released records only. This walks the same
 * path `planLifeScenePeople` walks — the registry's own scene, its own
 * placeable anchor, the accepted scene compositor — and reports whether the
 * layers that come back are drawable art or nothing.
 */
function sceneProbe(
  person: Person,
  world: World,
  playerId: EntityId,
  library: typeof PRODUCTION_CHARACTER_LIBRARY,
  visuals: typeof CANDIDATE_REVIEW_VISUAL_LIBRARY,
  poseArt: typeof PRODUCTION_POSE_ART,
): readonly string[] {
  const sceneId = resolveLifeScene(world, playerId).sceneId;
  if (!sceneId) return ["no scene resolved for this life"];
  const scene = SCENE_REGISTRY.scenes.get(sceneId);
  if (!scene) return [`scene '${sceneId}' is not registered`];
  if (!scene.raster) return [`scene '${sceneId}' has no plate`];
  const anchors = [...scene.anchors.values()].filter(
    (candidate) =>
      candidate.kind === "seat" || candidate.kind === "floor-standing",
  );
  if (anchors.length === 0) return [`scene '${sceneId}' has nowhere to stand`];
  return anchors.map((anchor) => {
    try {
      const presentation = composeSceneCharacter({
        personId: person.id,
        displayName: `${person.givenName} ${person.familyName}`,
        appearance: person.appearance ?? derivePersonAppearance(person.id),
        scene,
        anchor,
        library,
        visualLibrary: visuals,
        poseRegistry: PRODUCTION_POSE_REGISTRY,
        poseArt,
      });
      const drawable = presentation.layers.filter((layer) => layer.url).length;
      const fixtures = presentation.layers.filter(
        (layer) => library.components.get(layer.assetId)?.fixture,
      ).length;
      // `poseGaps` and `diagnostics` are the compositor's own account of why a
      // person is not drawable. They are what the shell throws away today.
      const gaps = presentation.poseGaps.map((gap) => gap.code).join(",");
      const notes = presentation.diagnostics
        .map((entry) => entry.code)
        .join(",");
      return `${anchor.id} (${anchor.kind}) pose=${presentation.poseFamily?.pose_family_id ?? "NONE"} complete=${presentation.complete} layers=${presentation.layers.length} drawable=${drawable} fixture=${fixtures}${gaps ? ` gaps=[${gaps}]` : ""}${notes ? ` notes=[${notes}]` : ""}`;
    } catch (error) {
      return `${anchor.id} threw: ${error instanceof Error ? error.message : String(error)}`;
    }
  });
}

describe("candidate art coverage for canonical people", () => {
  it("reports what each library can and cannot dress", () => {
    const created = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "candidate-coverage-trace",
      startAge: 34,
    });
    const world = created.world;
    const playerId = created.playerPersonId;
    const people = world.personOrder
      .map((id) => world.people[id])
      .filter((person): person is Person => Boolean(person));

    say(RULE);
    say(
      `catalog generation  production=${PRODUCTION_CHARACTER_LIBRARY.catalogGeneration} candidate=${CANDIDATE_REVIEW_CHARACTER_LIBRARY.catalogGeneration}`,
    );
    say(
      `components          production=${PRODUCTION_CHARACTER_LIBRARY.components.size} candidate=${CANDIDATE_REVIEW_CHARACTER_LIBRARY.components.size}`,
    );
    for (const [pose, families] of [
      ["production", PRODUCTION_POSE_ART],
      ["candidate", CANDIDATE_REVIEW_POSE_ART],
    ] as const) {
      const entries = [...families.bodyFamiliesByPose.entries()].map(
        ([id, set]) => `${id}:${[...set].join("|")}`,
      );
      say(`pose art ${pose.padEnd(11)} ${entries.join("  ") || "(none)"}`);
    }
    say(RULE);

    for (const person of people) {
      const age = ageOf(person, world);
      say(
        `${personName(person)}  age=${age ?? "unknown"}  appearance=${person.appearance ? "assigned" : "MISSING"}`,
      );
      say(
        `  production  ${probe(person, PRODUCTION_CHARACTER_LIBRARY, CANDIDATE_REVIEW_VISUAL_LIBRARY)}`,
      );
      say(
        `  candidate   ${probe(person, CANDIDATE_REVIEW_CHARACTER_LIBRARY, CANDIDATE_REVIEW_VISUAL_LIBRARY)}`,
      );
      const portrait = resolvePersonPortrait(person, {
        libraries: {
          characters: CANDIDATE_REVIEW_CHARACTER_LIBRARY,
          visuals: CANDIDATE_REVIEW_VISUAL_LIBRARY,
        },
      });
      say(
        `  portrait    ${portrait.kind}${portrait.kind === "placeholder" ? ` / ${portrait.reason}` : ""}`,
      );
      for (const line of sceneProbe(
        person,
        world,
        playerId,
        PRODUCTION_CHARACTER_LIBRARY,
        PRODUCTION_VISUAL_LIBRARY,
        PRODUCTION_POSE_ART,
      )) {
        say(`  room prod   ${line}`);
      }
      for (const line of sceneProbe(
        person,
        world,
        playerId,
        CANDIDATE_REVIEW_CHARACTER_LIBRARY,
        CANDIDATE_REVIEW_VISUAL_LIBRARY,
        CANDIDATE_REVIEW_POSE_ART,
      )) {
        say(`  room cand   ${line}`);
      }
    }
    say(RULE);

    writeFileSync(REPORT, `${lines.join("\n")}\n`);

    // A trace, not a gate: it must run, and its report is the deliverable.
    expect(people.length).toBeGreaterThan(0);
  });
});
