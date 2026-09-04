import path from "path";
import { describe, expect, it } from "vitest";

import { changedFilesSince, hasCommit } from "./support/ownership-boundary";

/**
 * This wave's carve-outs, as an executable check.
 *
 * Four branches were in flight when this one was cut, and the routing
 * authority named exactly what each of them owns:
 *
 *   PR #83 — the generic declarative content-bank registry, the development
 *            Content Browser, and deterministic content export.
 *   PR #84 — the development causal-trace and observer inspector, the trace
 *            export, and the multi-seed comparison harness.
 *   PR #85 — campaign, candidacy, committee, fundraising and election-result
 *            machinery.
 *   PR #86 — the graphics bank, asset intake, environment plates, the scene
 *            registry, the title tableau, surface binding, and the graphics
 *            runtime integration.
 *
 * A completion report saying "we did not rebuild those" is worth very little
 * on a branch this size, so the promise is a test. It measures what this
 * branch adds to the `main` it sits on and fails naming any path that belongs
 * to one of those four.
 *
 * If the base commit is not in this clone every assertion here fails rather
 * than passing quietly: a boundary check that silently no-ops is worse than
 * none. CI fetches full history for that reason.
 *
 * The head is deliberately open — this packet is in flight, so its head is the
 * working tree. When it lands, whoever lands it closes the range the way
 * `tests/authoring-ownership-boundary.test.ts` is closed, so the check keeps
 * describing this packet instead of constraining the next one.
 */

const REPOSITORY_ROOT = path.resolve(__dirname, "..");

/** Accepted `main` when this branch was cut: the merge of PR #82. */
export const NARRATIVE_WAVE_BASE = "6311dd688331985d5682b39910bf2b917d46d11b";

const MISSING_BASE = `Base commit ${NARRATIVE_WAVE_BASE} is not in this clone, so the carve-outs could not be checked. Fetch full history before trusting this suite.`;

interface OwnedSurface {
  readonly pattern: RegExp;
  readonly owner: string;
}

/** Paths this wave must not touch, and who they belong to. */
const CARVED_OUT: readonly OwnedSurface[] = [
  {
    pattern: /^src\/authoring\//,
    owner: "PR #86 — asset intake, authoring and the graphics bank",
  },
  {
    pattern: /^src\/environment\//,
    owner: "PR #86 — environment plates and scene specs",
  },
  { pattern: /^art\//, owner: "PR #86 — the art bank" },
  {
    pattern: /^scripts\/art-asset-factory\//,
    owner: "PR #86 — the art pipeline",
  },
  {
    pattern:
      /^src\/presentation\/(scene-|pose-|raster-|character-|component-|title-tableau|visual-integration|production-office)/,
    owner: "PR #86 — the graphics runtime",
  },
  {
    pattern:
      /^src\/player\/(OfficeScene|ModularCharacter|PersonPortrait|useRasterTier|useSceneTransform)/,
    owner: "PR #86 — the graphics runtime",
  },
  {
    pattern:
      /^src\/ui\/(CharacterProof|PoseContact|ProductionOffice|SceneAuthoring|ScenePresentation|SceneDebug)/,
    owner: "PR #86 — the graphics proof surfaces",
  },
  {
    pattern: /content-bank|content-browser|content-registry|content-export/i,
    owner: "PR #83 — the declarative content-bank registry and browser",
  },
  {
    pattern: /causal-trace|observer-inspector|trace-export|multi-seed/i,
    owner: "PR #84 — the causal-trace inspector and its harness",
  },
  {
    pattern: /^src\/simulation\/election-contests/,
    owner: "PR #85 — election machinery",
  },
  {
    pattern: /campaign|candidacy|committee-finance|fundraising/i,
    owner: "PR #85 — campaign and candidacy",
  },
];

/**
 * The surfaces this wave does own.
 *
 * Narrative, episodes, calibration, the life-flow presentation and the player
 * shell, plus the tests and documentation that describe them. Deliberately
 * narrower than "everything not carved out", so a stray edit into a system
 * nobody has claimed still shows up here.
 */
const OWNED =
  /^(src\/simulation\/(narrative-threads|life-episodes|episode-bank|setup-opening-bank|setup-questionnaire|setup-questionnaire-bank|setup-priors|player-model|situation-selection|situation-profiles|adult-situations|life-callbacks|life-choice-evidence|commitment-seam|relationship-leverage|sha256|life-places|character-history|world|types|index|boundary\.test|pennywise-adaptive-life\.test)\.ts|src\/presentation\/(life-|narrative-|adult-life|formative-play|ordinary-life|new-game|setup-questionnaire-flow|production-world|adaptive-life\.test|player-spine\.test)|src\/player\/PlayerGame\.tsx|src\/player\/player\.css|scripts\/life-report\.ts|tests\/|docs\/|ARCHITECTURE\.md|PATCH_NOTES\.md|AGENTS\.md|package\.json|package-lock\.json)/;

function measuredChanges(): readonly string[] {
  if (!hasCommit(REPOSITORY_ROOT, NARRATIVE_WAVE_BASE)) {
    throw new Error(MISSING_BASE);
  }
  const files = changedFilesSince(REPOSITORY_ROOT, NARRATIVE_WAVE_BASE);
  if (files === null) throw new Error(MISSING_BASE);
  return files;
}

describe("The narrative wave's carve-outs", () => {
  it("can see the base it is measuring against", () => {
    expect(() => measuredChanges()).not.toThrow();
  });

  it("rebuilds nothing owned by the content bank, the inspector, the campaign or the graphics branches", () => {
    const violations = measuredChanges().flatMap((file) => {
      const owner = CARVED_OUT.find((entry) => entry.pattern.test(file));
      return owner ? [`${file} — carved out: ${owner.owner}`] : [];
    });
    expect(violations).toEqual([]);
  });

  it("keeps its changes inside the surfaces it declares", () => {
    expect(measuredChanges().filter((file) => !OWNED.test(file))).toEqual([]);
  });

  it("adds no new inspector, browser or export surface of its own", () => {
    // The report this wave does ship is a set of pure functions returning data
    // and Markdown, deliberately not a screen and deliberately not a route.
    // A new `?view=` would be the beginning of the second inspector the
    // routing authority is trying to prevent.
    const added = measuredChanges().filter(
      (file) => file.startsWith("src/ui/") || file === "src/App.tsx",
    );
    expect(added).toEqual([]);
  });
});
