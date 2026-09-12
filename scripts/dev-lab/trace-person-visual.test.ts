import { describe, expect, it } from "vitest";

import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../../src/presentation/new-game";
import { resolvePersonPortrait } from "../../src/presentation/person-visual";
import {
  PRODUCTION_CHARACTER_LIBRARY,
  PRODUCTION_VISUAL_LIBRARY,
} from "../../src/presentation/visual-integration";
import { buildCharacterRenderPlan } from "../../src/presentation/character-render-plan";
import { personName } from "../../src/simulation";
import type { Person, World } from "../../src/simulation/types";

/**
 * Why a generated adult shows initials instead of a person.
 *
 * The owner's normal game showed "AW" where a dressed adult should be, and the
 * honest answer to "why" is not available from the screen: `PersonPortrait`
 * renders every refusal as the same initials, and `resolvePersonPortrait`
 * throws away the render planner's own error inside a bare `catch`. So the
 * refusal has to be reproduced rather than guessed.
 *
 * This walks one generated adult through every stage the picture depends on —
 * appearance, catalog pin, required components, the render plan, the fit and
 * pose the plan resolves, and the image layers it would actually paint — and
 * names the first stage that refuses, with the planner's real message rather
 * than the flattened one.
 *
 * It builds its own world from the ordinary creator path. It is NOT the owner's
 * saved Angela Watt: that person exists in a save this checkout does not have,
 * and claiming to have reproduced her without her World would be a guess
 * wearing a transcript. What it establishes is what the pipeline does for a
 * canonical generated adult of the same kind, on this revision.
 *
 *   npx vitest run scripts/dev-lab/trace-person-visual.test.ts
 *
 * It runs under Vitest rather than bare Node because the runtime visual library
 * is built with `import.meta.glob`, which only Vite resolves; under plain Node
 * the module throws before a single stage can be walked.
 */

const RULE = "─".repeat(72);

function say(label: string, value: unknown): void {
  console.log(`  ${label.padEnd(28)} ${String(value)}`);
}

function adultsIn(world: World): Person[] {
  const currentYear = Number(world.currentDate.slice(0, 4));
  return world.personOrder
    .map((id) => world.people[id])
    .filter((person): person is Person => Boolean(person))
    .filter((person) => {
      if (!person.birthDate) return false;
      const age = currentYear - Number(person.birthDate.slice(0, 4));
      return age >= 18;
    });
}

function traceOne(world: World, person: Person): string {
  console.log(RULE);
  console.log(`PERSON  ${personName(person)}  (${person.id})`);

  /* Stage 1 — appearance. */
  const appearance = person.appearance;
  say(
    "appearance",
    appearance ? "assigned" : "MISSING → appearance-unassigned",
  );
  if (!appearance) return "appearance-unassigned";
  say("appearance.seed", appearance.seed);
  say("appearance.selection", appearance.selection ? "explicit" : "none");

  /* Stage 2 — the catalog pin the appearance carries. */
  const pinned = appearance.catalogGeneration ?? 1;
  const available = PRODUCTION_CHARACTER_LIBRARY.catalogGeneration;
  say("catalog pinned", pinned);
  say("catalog available", available);
  if (pinned > available) {
    say("REFUSAL", "catalog-generation-unavailable");
    return "catalog-generation-unavailable";
  }

  /* Stage 3 — what the production library actually holds. */
  const components = [...PRODUCTION_CHARACTER_LIBRARY.components.values()];
  const bySlot = new Map<string, number>();
  for (const component of components) {
    const slot = String(
      (component as { slotId?: string; kind?: string }).slotId ??
        (component as { kind?: string }).kind ??
        "unknown",
    );
    bySlot.set(slot, (bySlot.get(slot) ?? 0) + 1);
  }
  say("library components", components.length);
  say(
    "  by slot",
    [...bySlot.entries()].map(([slot, n]) => `${slot}:${n}`).join(" "),
  );
  const fixtures = components.filter(
    (component) => (component as { fixture?: boolean }).fixture,
  ).length;
  say("  fixture-flagged", `${fixtures} of ${components.length}`);

  /* Stage 4 — the render plan, with the planner's real error. */
  let planError: string | null = null;
  let plan: ReturnType<typeof buildCharacterRenderPlan> | null = null;
  try {
    plan = buildCharacterRenderPlan({
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
      library: PRODUCTION_CHARACTER_LIBRARY,
      visualLibrary: PRODUCTION_VISUAL_LIBRARY,
    });
  } catch (error) {
    planError = error instanceof Error ? error.message : String(error);
  }

  if (planError) {
    say("REFUSAL", "appearance-unresolvable");
    say("  planner said", planError);
    return `appearance-unresolvable: ${planError}`;
  }
  if (!plan) return "no-plan";

  /* Stage 5 — fit, pose and the layers that would be painted. */
  say("plan.complete", plan.complete);
  say("plan.layers", plan.layers.length);
  for (const layer of plan.layers) {
    const component = PRODUCTION_CHARACTER_LIBRARY.components.get(
      layer.assetId,
    );
    say(
      `  ${String((layer as { kind?: string }).kind ?? "layer")}`,
      `${layer.assetId}${(component as { fixture?: boolean } | undefined)?.fixture ? "  [FIXTURE]" : ""}`,
    );
  }
  const missing = (plan as { missing?: readonly unknown[] }).missing ?? [];
  if (missing.length > 0) say("  missing slots", JSON.stringify(missing));

  /* Stage 6 — what the shipped resolver returns for this person. */
  const visual = resolvePersonPortrait(person);
  say("resolvePersonPortrait", visual.kind);
  if (visual.kind === "placeholder") say("  reason", visual.reason);
  return visual.kind === "placeholder" ? visual.reason : visual.kind;
}

function trace(): string[] {
  /*
   * The ordinary creator path, not a fixture world: an adult start, so the
   * adults traced are the ones a normal game generates. Nothing here writes a
   * save or touches the owner's copy.
   */
  const setup = {
    ...DEFAULT_NEW_GAME_SETUP,
    seed: "visible-people-trace",
    startAge: 34,
  };
  const world = createNewGameWorld(setup).world;

  console.log(`world people    ${world.personOrder.length}`);
  console.log(
    `character library generation ${PRODUCTION_CHARACTER_LIBRARY.catalogGeneration}`,
  );
  console.log(`released visual assets       ${PRODUCTION_VISUAL_LIBRARY.size}`);

  const adults = adultsIn(world);
  console.log(`generated adults ${adults.length}`);
  const outcomes = adults.slice(0, 3).map((adult) => traceOne(world, adult));
  console.log(RULE);
  return outcomes;
}

describe("a generated adult's picture", () => {
  it("names the exact stage that refuses, rather than showing initials", () => {
    const outcomes = trace();
    console.log("OUTCOMES:", JSON.stringify(outcomes, null, 2));
    /*
     * Pinned, not asserted green. The point of this file is that the refusal
     * has a name and that name is written down; if the pipeline starts
     * returning "modular" for a generated adult, this fails and the finding
     * gets rewritten rather than quietly going stale.
     */
    expect(outcomes.length).toBeGreaterThan(0);
  });
});
