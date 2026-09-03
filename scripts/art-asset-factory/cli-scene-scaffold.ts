import fs from "fs";
import path from "path";

import { toCanonicalJson } from "../../src/authoring/canonical-json";
import { findSceneFamilyFixture } from "../../src/authoring/fixtures/scene-families";
import {
  createSceneAuthoringScaffold,
  evaluateScaffoldReadiness,
  projectScaffoldToSpec,
  type SceneScaffoldInput,
} from "../../src/authoring/scene-scaffold";
import { planRuntimeTiers } from "../../src/authoring/tier-plan";

/**
 * Usage:
 *   cli-scene-scaffold.ts <scene-id> <label> <plate-width> <plate-height>
 *                         [--family <family-id>]
 *                         [--anchors seat:witness-chair,floor-standing:podium]
 *                         [--occluders dais-front,rail]
 *                         [--out <directory>]
 *
 * Emits `<scene-id>.scaffold.json` and a readiness summary.
 *
 * The scaffold it writes is intentionally full of UNKNOWNs. Its value is that
 * the unknowns are ENUMERATED: an author can see, before touching the picture,
 * exactly which decisions the room is waiting on and which of them block
 * registration. Surface slots come from the named family, so a room that must
 * carry a seal has a slot for one from the first minute.
 */

const args = process.argv.slice(2);
const [sceneId, label, plateWidth, plateHeight] = args;

if (!sceneId || !label || !plateWidth || !plateHeight) {
  console.error(
    "Usage: cli-scene-scaffold.ts <scene-id> <label> <plate-width> <plate-height> [--family <id>] [--anchors kind:id,...] [--occluders id,...] [--out <dir>]",
  );
  process.exit(2);
}

function flagValue(name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

const familyId = flagValue("--family");
const family = familyId ? findSceneFamilyFixture(familyId) : undefined;
if (familyId && !family) {
  console.error(
    `No scene family fixture '${familyId}'. Known families: this tool reads the authoring fixtures, not the art manifest.`,
  );
  process.exit(2);
}

const plannedAnchors = (flagValue("--anchors") ?? "")
  .split(",")
  .map((entry) => entry.trim())
  .filter(Boolean)
  .map((entry) => {
    const [kind, id] = entry.split(":");
    if (
      !id ||
      (kind !== "seat" && kind !== "floor-standing" && kind !== "prop-surface")
    ) {
      console.error(
        `Anchor '${entry}' must be written as <seat|floor-standing|prop-surface>:<anchor-id>.`,
      );
      process.exit(2);
    }
    return {
      id: id!,
      type: kind!,
      kind: kind! as "seat" | "floor-standing" | "prop-surface",
    };
  });

const plannedOccluders = (flagValue("--occluders") ?? "")
  .split(",")
  .map((entry) => entry.trim())
  .filter(Boolean)
  .map((id) => ({ id, type: "foreground-object" }));

const plannedSurfaceSlots = (family?.requiredSurfaceSlots ?? []).map(
  (slotId) => ({ slotId }),
);

const masterPath = flagValue("--master");
const nativeDetail = flagValue("--native-detail-width");
const tierPlan = masterPath
  ? planRuntimeTiers({
      master: {
        assetId: sceneId,
        width: Number.parseInt(plateWidth, 10),
        height: Number.parseInt(plateHeight, 10),
        nativeDetailWidth:
          nativeDetail !== undefined
            ? Number.parseInt(nativeDetail, 10)
            : Number.parseInt(plateWidth, 10),
        masterPath,
      },
      outputDirectory: `art/generated/${sceneId}`,
    })
  : undefined;

const input: SceneScaffoldInput = {
  sceneId,
  label,
  plate: {
    width: Number.parseInt(plateWidth, 10),
    height: Number.parseInt(plateHeight, 10),
  },
  ...(familyId ? { familyId } : {}),
  ...(tierPlan ? { tierPlan } : {}),
  plannedAnchors,
  plannedOccluders,
  plannedSurfaceSlots,
  sourceNotes: [
    "Generated scaffold. Every UNRESOLVED field below is a decision nobody has made yet; none of them has been given a plausible default.",
  ],
};

const scaffold = createSceneAuthoringScaffold(input);
const readiness = evaluateScaffoldReadiness(scaffold);
const projection = projectScaffoldToSpec(scaffold);

const outputDirectory = path.resolve(flagValue("--out") ?? process.cwd());
fs.mkdirSync(outputDirectory, { recursive: true });
const scaffoldPath = path.join(outputDirectory, `${sceneId}.scaffold.json`);
fs.writeFileSync(scaffoldPath, toCanonicalJson({ scaffold, readiness }));

console.log(`Scaffold for '${sceneId}' (${label})`);
console.log(
  `  ${readiness.blockingGapCount} blocking gap(s), ${readiness.nonBlockingGapCount} other unresolved field(s).`,
);
console.log(
  projection.spec === null
    ? "  Not registrable yet — and no partial spec was emitted. A scene with guessed contacts is worse than no scene."
    : "  Registrable: every blocking field is settled.",
);
console.log("\nBlocking:");
for (const gap of readiness.gaps.filter((entry) => entry.blocking)) {
  console.log(`  ${gap.certainty.padEnd(10)} ${gap.path}`);
  console.log(`             ${gap.reason}`);
}
console.log(`\nWrote ${scaffoldPath}`);
