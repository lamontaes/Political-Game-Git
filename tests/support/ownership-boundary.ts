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

/**
 * Where Packet 26 stopped: its merge into `main` as PR #82.
 *
 * The boundary above was written while Packet 26 was in flight, and it measured
 * the working tree. That was right then and wrong the moment the packet landed:
 * on `main` the check outlives the packet it guards and starts asserting that
 * every LATER branch stays inside Packet 26's surfaces, which no later branch
 * agreed to and which the routing authority frequently forbids. This narrative
 * wave owns `src/simulation/` and `src/player/PlayerGame.tsx` outright.
 *
 * Pinning the head freezes the check to the range Packet 26 actually shipped,
 * so it stays an executable claim about that packet — the reason it was written
 * — instead of a standing constraint on work it knows nothing about. A later
 * packet that wants a boundary of its own declares its own range; see
 * `tests/narrative-wave-ownership-boundary.test.ts`.
 */
export const PACKET_26_HEAD = "6311dd688331985d5682b39910bf2b917d46d11b";

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
 */
export const PERMITTED_EXCEPTIONS: ReadonlyMap<string, string> = new Map([
  [
    "src/player/PlayerGame.tsx",
    "Packet 68 gives the graphics lane the title-screen seam. The change is the import of ./TitleScreen and the removal of the component that moved there.",
  ],
  [
    "src/simulation/index.ts",
    "Packet 66 exports ./canonical-json from the simulation barrel so the causal-trace export can reach the world's own emitter instead of writing a second serializer. The barrel gains one export line; no simulation module is modified.",
  ],
  [
    "src/simulation/character-history.ts",
    "Packet 67 adds one accessor, lifeSituationCatalog(), so the content index can read the formative bank without constructing a world. No situation, key or behaviour is changed.",
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
 * `src/devtools/`, `src/content/`, `src/cli/`, `tsconfig.node.json` and
 * `.gitignore` are here because the graphics packet merged into `main` and this
 * check came with it, so it now measures whichever branch is running rather
 * than only that lane. Packet 66's development causal-trace inspector and
 * Packet 67's declarative content bank and development Content Browser own
 * those surfaces outright: two new namespaces, three command-line entry points,
 * the ignore rule for the content export directory, and the project file that
 * has to list them because the project is composite. Naming them is what keeps
 * the rest of the list meaningful — the alternative was to stop asserting the
 * boundary at all on any branch that is not the graphics lane. FORBIDDEN is
 * untouched, so player, save, legislation, place and name systems are guarded
 * exactly as before.
 */
export const ALLOWED =
  /^(\.claude\/launch\.json|\.github\/workflows\/|src\/authoring\/|src\/cli\/|src\/content\/|src\/devtools\/|src\/environment\/|src\/presentation\/|src\/ui\/|src\/player\/player\.css|src\/player\/OfficeScene\.tsx|src\/player\/ModularCharacter\.tsx|src\/player\/TitleScreen\.tsx|src\/player\/TitleTableau\.tsx|src\/player\/useRasterTier\.ts|src\/player\/useSceneTransform\.ts|src\/App\.tsx|scripts\/art-asset-factory\/|tests\/|art\/|docs\/|package\.json|package-lock\.json|tsconfig\.node\.json|\.gitignore|AGENTS\.md|PATCH_NOTES\.md)/;

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
 * Returns null — rather than an empty list — when either commit is missing, so
 * a shallow clone reports that it could not measure instead of reporting that
 * nothing moved.
 *
 * With no `headCommit` the comparison runs against the working tree, which is
 * what an in-flight packet wants. Passing one freezes the comparison to a
 * finished range, which is what a landed packet wants.
 */
export function changedFilesSince(
  repositoryRoot: string,
  baseCommit: string = BASE_COMMIT,
  headCommit?: string,
): readonly string[] | null {
  if (!hasCommit(repositoryRoot, baseCommit)) return null;
  if (headCommit !== undefined && !hasCommit(repositoryRoot, headCommit)) {
    return null;
  }
  const range =
    headCommit === undefined ? [baseCommit] : [baseCommit, headCommit];
  return git(repositoryRoot, ["diff", "--name-only", ...range, "--"])
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
