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
 * If either end of the range is not in this clone every assertion here fails
 * rather than passing quietly: a boundary check that silently no-ops is worse
 * than none. CI fetches full history for that reason.
 *
 * The range is now closed at both ends, which is the step this file asked for
 * while it was in flight: "when it lands, whoever lands it closes the range the
 * way `tests/authoring-ownership-boundary.test.ts` is closed, so the check keeps
 * describing this packet instead of constraining the next one."
 *
 * This wave landed as PR #87 and the range was left open, so the head stayed
 * the working tree. On `main` that reads as a claim about this packet only
 * because `main` is this packet; on every OTHER branch cut from the same base
 * it silently became a claim about that branch, which had never agreed to it.
 * This branch is PR #84 — the causal-trace inspector — and an open head failed
 * it the moment its merge with `main` was measured: the carve-out list below
 * hands `causal-trace`, `observer-inspector`, `trace-export` and `multi-seed`
 * to PR #84, so an open head flagged this branch for building exactly the
 * surfaces it is the owner of. It surfaced on the synthetic merge into `main`,
 * which is the first place this file and this branch's files coexist.
 *
 * Closing the range is what preserves the check rather than what relaxes it.
 * Over `5f735da..68d7d48` the assertions below are evaluated against exactly
 * the files this wave shipped and would still fail on any one of them that
 * reached into another lane. What they no longer do is constrain work this
 * packet knows nothing about — including this branch's own inspector.
 */

const REPOSITORY_ROOT = path.resolve(__dirname, "..");

/**
 * Accepted `main` this branch sits on: the merge of PR #86.
 *
 * It was the merge of PR #82 (`6311dd6`) while #86 was still in flight. #86
 * merged and this branch took that main in, so measuring from the old value
 * counted #86's own accepted files — the art bank, `src/environment/`,
 * `src/authoring/`, the scene and title-tableau runtime — as changes made
 * here. They are not: they arrived from `main` whole and unedited, and the
 * check exists to ask what THIS branch adds to the `main` it sits on.
 *
 * Moving the base is what keeps the carve-out honest rather than what relaxes
 * it. Against the older base the check would have failed on hundreds of #86
 * files and told nobody anything; against this one it still fails the moment
 * this branch edits a plate, a pose, a scene or an inspector.
 */
export const NARRATIVE_WAVE_BASE = "5f735da209c59647e4b877717a40fe6cc045fc24";

/**
 * Where this wave stopped: its merge into `main` as PR #87.
 *
 * The same value `main` carried the moment the packet landed, so the closed
 * range holds every commit the wave shipped and not one commit more. A later
 * packet that wants a boundary of its own declares its own range rather than
 * reopening this one.
 */
export const NARRATIVE_WAVE_HEAD = "68d7d48ee09aa7ea1a13a2d152f4f1129669ade5";

const MISSING_RANGE = `This wave shipped as ${NARRATIVE_WAVE_BASE}..${NARRATIVE_WAVE_HEAD}, and one of those commits is not in this clone, so the carve-outs could not be checked. Fetch full history before trusting this suite.`;

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
 *
 * Packet 70 extended this list to the conversation system. It is a deliberate
 * widening rather than a drift: the omnibus audit found a dialogue engine whose
 * audibility, addressee and decision machinery normal play could not reach, and
 * the packet that answers it gives this wave the engine, its subjects, its
 * progress records and its production surface. Nothing carved out moved — the
 * legislative conversation may exist as a subject here, but its causal
 * integration with bills stays with the legislation lane, and the carve-out
 * list below still fails this branch if it reaches for one.
 *
 * Packet 72 extends it again, to who a character is and who the people around
 * them are: `person-identity` (gender and pronouns as canonical fields),
 * `person-context` (the relationship label read off the record),
 * `voice-bands` (the age-band copy contract), `setup-young-life-bank` (the
 * calibration for a life that begins in childhood), and `people.ts`, which
 * writes the player's own identity at creation. All of it is character and
 * copy, which is this wave's, and none of it is a body family, a plate, a
 * pose or a scene — the graphics carve-out below is untouched and still fails
 * this branch if it reaches for one.
 *
 * Packet 77 adds five, and each one is a seam the packet named rather than a
 * surface this wave decided to take:
 *
 *   `src/simulation/setup-generation-inputs.ts` — the one declared route from
 *     a setup answer to world generation. The packet asks for it explicitly;
 *     keeping it here rather than inside the generator is what makes "two
 *     bounded leans and nothing else" a checkable claim.
 *   `src/presentation/title-ambient.ts` — which released rooms the front door
 *     drifts through, and which one is showing. It decides nothing about what
 *     a scene is or how it is painted; it reads #86's registry and #86's
 *     library and returns an index.
 *   `src/player/TitleTableau.tsx` — three props: the room being replaced, the
 *     viewer's motion preference, and a key that makes the arriving room
 *     animate. #86 owns the component and keeps owning it; the caller decides
 *     all three and nothing here learns what a cycle is.
 *   `src/player/SceneBackdrop.tsx` — the component #86 itself asked for, in
 *     `scene-consumers.ts`: "the seam is one <SceneBackdrop sceneId={...}>
 *     around the existing section". It consumes the cover transform, the tier
 *     ladder and the registry rather than reimplementing any of them.
 *   `src/presentation/life-scene.ts` and `life-introduction.ts` are already
 *     inside the `life-` prefix this wave owns, and are named here only so the
 *     list of what Packet 77 added is in one place.
 *
 * None of it is a plate, a pose, a body family, an anchor or a camera. The
 * carve-out list below is unchanged and still fails this branch the moment it
 * reaches for one.
 *
 * The #86 reconciliation adds one path: `src/player/TitleScreen.tsx`. #86
 * moved the title screen out of `PlayerGame.tsx` so the graphics lane could
 * give it a backdrop, and this branch had repaired the same screen's copy and
 * controls in the file it used to live in. Both changes are real and neither
 * can be dropped, so the merge keeps #86's component — its tableau, its
 * resolver, its scene description, untouched — and re-homes this branch's
 * three semantic repairs into it: the canonical product name the routing
 * authority requires, the removal of the tagline, and the Options and
 * disabled-Quit controls the shell already routes. Nothing about which room
 * appears is decided here, which is the line that matters: the graphics
 * decision stays #86's and the copy stays this wave's.
 */
const OWNED =
  /^(src\/simulation\/(narrative-threads|life-episodes|episode-bank|setup-opening-bank|setup-questionnaire|setup-questionnaire-bank|setup-priors|player-model|situation-selection|situation-profiles|adult-situations|life-callbacks|life-choice-evidence|commitment-seam|relationship-leverage|sha256|life-places|character-history|person-identity|person-context|voice-bands|setup-young-life-bank|setup-generation-inputs|people|world|types|index|boundary\.test|pennywise-adaptive-life\.test)\.ts|src\/presentation\/(life-|narrative-|title-ambient|adult-life|formative-play|ordinary-life|new-game|setup-questionnaire-flow|production-world|adaptive-life\.test|player-spine\.test|conversation-subjects|conversation-continuity|conversation-consequences|run-b-conversation|player-conversation)|src\/player\/PlayerGame\.tsx|src\/player\/PlayerConversation\.tsx|src\/player\/TitleScreen\.tsx|src\/player\/TitleTableau\.tsx|src\/player\/SceneBackdrop\.tsx|src\/player\/player\.css|scripts\/life-report\.ts|tests\/|docs\/|ARCHITECTURE\.md|PATCH_NOTES\.md|AGENTS\.md|package\.json|package-lock\.json)/;

function measuredChanges(): readonly string[] {
  for (const commit of [NARRATIVE_WAVE_BASE, NARRATIVE_WAVE_HEAD]) {
    if (!hasCommit(REPOSITORY_ROOT, commit)) throw new Error(MISSING_RANGE);
  }
  const files = changedFilesSince(
    REPOSITORY_ROOT,
    NARRATIVE_WAVE_BASE,
    NARRATIVE_WAVE_HEAD,
  );
  if (files === null) throw new Error(MISSING_RANGE);
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
