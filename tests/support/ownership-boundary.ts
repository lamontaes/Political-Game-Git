import { execFileSync } from "child_process";

/**
 * The Packet 26 ownership boundary, as reusable machinery.
 *
 * The rules live here rather than inside the test that applies them so a second
 * suite can drive the same code against synthetic, CI-shaped histories. A
 * boundary check whose failure path is never exercised is a boundary check
 * nobody should trust.
 */

/**
 * `main` at the point this branch was cut.
 *
 * It used to be PR #63's head, because the graphics work began as the third
 * commit of a stack. The convergence branches replaced that stack with one
 * branch off `main`, and leaving the old value here measured the boundary
 * against a commit that is not an ancestor of this branch at all: the check
 * either errored or reported a diff nobody should trust. Measuring from `main`
 * covers the whole graphics change rather than the top slice of it — a strictly
 * wider measurement, over an unchanged FORBIDDEN list.
 *
 * It moves again when `main` moves under this branch. PR #60 merged and this
 * branch took its work in, so measuring from the old `main` counted #60's
 * accepted files — `PlayerGame.tsx`, the conversation and legislation
 * surfaces — as changes made here. They are not: they arrived from `main`
 * whole and unedited. The boundary asks what THIS branch adds to the `main`
 * it sits on, so the base is the `main` it sits on.
 *
 * It moved again for the same reason when PR #82 merged. This branch is cut
 * from that merge, so the base is that merge; leaving the older value in place
 * would have counted #82's own accepted files as changes made here.
 *
 * It moves again now that PR #86 has merged and `main` is the merge commit
 * below. The graphics packet this file was written for is accepted and in
 * `main`, so measuring from the older base would count #86's own accepted
 * files — the scenes, the title screen, the authoring pipeline — as changes
 * made by whatever branch is running the check. The rule has not changed: the
 * base is the `main` the branch sits on.
 */
export const BASE_COMMIT = "5f735da209c59647e4b877717a40fe6cc045fc24";

export interface OwnedSurface {
  /** Matched against a repository-relative path. */
  readonly pattern: RegExp;
  /** The system that owns it, so a failure explains itself. */
  readonly owner: string;
}

/**
 * Paths this packet must not modify, and the single named exception.
 *
 * `PlayerGame.tsx` is another lane's file and stays on this list. Packet 68
 * makes one exception to it, and only one: the title screen was the surface
 * that was supposed to consume the tableau architecture and never did, so the
 * graphics lane now owns that seam. The seam is a one-line import — the screen
 * itself moved out to `src/player/TitleScreen.tsx`, which this lane owns
 * outright — so the shared file carries an import and nothing else.
 *
 * The exception is a path, not a pattern, and it is recorded here rather than
 * relaxed away: every other file the FORBIDDEN list guards is still guarded,
 * and a second edit to `PlayerGame.tsx` would have to be argued for in this
 * comment before it could pass.
 *
 * The conversation and shared-simulation entries below are here for the same
 * reason, from the other side. This check arrived in `main` with #86 and now
 * measures whichever branch runs it, and FORBIDDEN's `conversations` entry was
 * written to keep the GRAPHICS lane out of a file the bargaining lane owns.
 * On this branch that lane is the one running, so each file it genuinely owns
 * is named with what it does to it, one path at a time. The patterns are left
 * exactly as they are, so every other conversation and simulation file is
 * still guarded, and `PlayerGame.tsx`, persistence, life-places, the place
 * provider, the legislation state machine, the rule packs and name generation
 * are untouched by this branch and still caught if they ever move.
 */
export const PERMITTED_EXCEPTIONS: ReadonlyMap<string, string> = new Map([
  [
    "src/player/PlayerGame.tsx",
    "Packet 68 gives the graphics lane the title-screen seam. The change is the import of ./TitleScreen and the removal of the component that moved there.",
  ],
  [
    "src/presentation/run-b-conversation.ts",
    "Packet 49 owns the bargaining conversation subject. Rather than special-case the engine, it registers through the subject registry main introduced; the engine gains the room's audibility and the turn's progress as arguments so a subject can say true things about itself. No existing subject changes behaviour.",
  ],
  [
    "src/presentation/run-b-conversation-progress.ts",
    "The same seam: progress carries the bargaining subject's own turn state so the engine does not have to know what a bill is.",
  ],
  [
    "src/simulation/types.ts",
    "Packet 49 adds the legislative-politics record types, the question identity and the commitment subject. Additive only; no shared declaration is redefined.",
  ],
  [
    "src/simulation/world.ts",
    "The legislative-politics records join the one canonical World: history collection, sequence ordering, stable-key uniqueness and the integrity assertion. No second World is introduced.",
  ],
  [
    "src/simulation/index.ts",
    "Two barrel exports for the legislative-politics modules.",
  ],
  [
    "src/simulation/decisions.ts",
    "One additional entity-existence source, so a decision may reference a legislative-politics entity. The existing sources are unchanged.",
  ],
  [
    "src/simulation/mind-integrity.ts",
    "The same one additional entity-existence source, so a mind record may cite a legislative-politics entity.",
  ],
]);

export const FORBIDDEN: readonly OwnedSurface[] = [
  {
    pattern: /^src\/player\/PlayerGame/,
    owner: "PlayerGame / New Game",
  },
  {
    pattern: /^src\/persistence\//,
    owner: "saves, persistence and replay",
  },
  {
    pattern: /^src\/simulation\/life-places/,
    owner: "life-places",
  },
  {
    pattern: /^src\/simulation\/.*place-provider/,
    owner: "the national place provider",
  },
  {
    pattern: /^src\/presentation\/run-b-conversation/,
    owner: "conversations",
  },
  {
    pattern: /^src\/simulation\/legislation/,
    owner: "legislation",
  },
  {
    pattern: /^src\/simulation\/legislature-rule/,
    owner: "legislative rule packs",
  },
  {
    pattern: /^src\/simulation\/names/,
    owner: "name generation",
  },
  {
    pattern: /name-generation/,
    owner: "name generation",
  },
];

/**
 * The surfaces this packet does own.
 *
 * `.claude/launch.json` is here because the visual evidence this packet owes
 * is taken by driving the real app, and that needs a way to start it. It
 * configures a dev server and nothing else.
 *
 * `.github/workflows/` is here because Packet 28 directs this branch to repair
 * the deterministic-validation checkout. `PATCH_NOTES.md` is here because
 * Packet 50 asks this branch to describe what it changed for a player. No other
 * in-flight branch owns CI configuration or the player-facing changelog, so
 * widening this allowlist does not relax FORBIDDEN, which is what actually
 * guards other people's systems.
 *
 * `ARCHITECTURE.md`, `src/simulation/legislative-*` and the two measure views
 * are here because Packet 49's legislative bargaining owns them outright: a new
 * simulation namespace and two new player surfaces that did not exist before.
 * The two views are named as paths rather than by widening `src/player/`,
 * because the player shell is a separate active lane and this branch must stay
 * out of the rest of it — `PlayerGame.tsx` in particular is still guarded by
 * FORBIDDEN and is not touched here.
 */
export const ALLOWED =
  /^(\.claude\/launch\.json|\.github\/workflows\/|src\/authoring\/|src\/environment\/|src\/simulation\/legislative-|src\/presentation\/|src\/ui\/|src\/player\/player\.css|src\/player\/OfficeScene\.tsx|src\/player\/ModularCharacter\.tsx|src\/player\/MeasureFloorView\.tsx|src\/player\/MeasurePaperWorkspace\.tsx|src\/player\/TitleScreen\.tsx|src\/player\/TitleTableau\.tsx|src\/player\/useRasterTier\.ts|src\/player\/useSceneTransform\.ts|src\/App\.tsx|scripts\/art-asset-factory\/|tests\/|art\/|docs\/|package\.json|package-lock\.json|AGENTS\.md|ARCHITECTURE\.md|PATCH_NOTES\.md)/;

function git(repositoryRoot: string, args: readonly string[]): string {
  return execFileSync("git", [...args], {
    cwd: repositoryRoot,
    encoding: "utf8",
  });
}

/** Whether `commit` is present as a commit object in this clone. */
export function hasCommit(repositoryRoot: string, commit: string): boolean {
  try {
    execFileSync("git", ["cat-file", "-e", `${commit}^{commit}`], {
      cwd: repositoryRoot,
      stdio: "ignore",
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Paths that differ between `baseCommit` and the current working tree.
 *
 * Returns null — rather than an empty list — when the base commit is missing,
 * so a shallow clone reports that it could not measure instead of reporting
 * that nothing moved.
 */
export function changedFilesSince(
  repositoryRoot: string,
  baseCommit: string = BASE_COMMIT,
): readonly string[] | null {
  if (!hasCommit(repositoryRoot, baseCommit)) return null;
  return git(repositoryRoot, ["diff", "--name-only", baseCommit, "--"])
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

/** Changed paths owned by another branch, each labelled with its owner. */
export function ownershipViolations(
  files: readonly string[],
): readonly string[] {
  return files.flatMap((file) => {
    if (PERMITTED_EXCEPTIONS.has(file)) return [];
    const owner = FORBIDDEN.find((entry) => entry.pattern.test(file));
    return owner ? [`${file} — owned by ${owner.owner}`] : [];
  });
}

/** Changed paths outside the surfaces this packet owns. */
export function straySurfaces(files: readonly string[]): readonly string[] {
  return files.filter(
    (file) => !ALLOWED.test(file) && !PERMITTED_EXCEPTIONS.has(file),
  );
}
