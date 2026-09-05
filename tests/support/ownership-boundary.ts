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
 * That second edit is now argued for, because this check arrived in `main`
 * with #86 and measures whichever branch runs it. Packet 65 adds one section
 * to `PlayingScreen` — the campaign workspace, or the sentence saying why it
 * is withheld — under the ordinary day rather than in place of it. It is one
 * import and about twenty lines, and it is deliberately that small because the
 * player shell is a separate active lane: standing for office is one more
 * thing in a life, so it appends to the screen instead of restructuring it.
 * Nothing else in the file moves, and `TitleScreen.tsx`, `TitleTableau.tsx`
 * and persistence are untouched by this branch.
 *
 * `life-places.ts` is the other argued exception. FORBIDDEN keeps the graphics
 * lane out of it; Packet 65 is the lane that has to say which places have an
 * elected office at all. It adds one declared capability field and builds the
 * registry on first use instead of at module load — the eager build closed an
 * import cycle once integrity had a reason to ask a place what it supports.
 * All four places keep their existing key, name, context and legislative
 * capability, and Lexington-Fayette declares `null` because no accepted source
 * establishes its council.
 */
export const PERMITTED_EXCEPTIONS: ReadonlyMap<string, string> = new Map([
  [
    "src/player/PlayerGame.tsx",
    "Packet 68 gives the graphics lane the title-screen seam. The change is the import of ./TitleScreen and the removal of the component that moved there. Packet 65 adds one further section, argued for above: the campaign workspace under the ordinary day, one import and about twenty lines.",
  ],
  [
    "src/simulation/life-places.ts",
    "Packet 65 adds the declared candidacyPackId capability and builds the place registry on first use rather than at module load. No place's key, name, context or legislative capability changes.",
  ],
  [
    "src/simulation/types.ts",
    "Packet 65 adds the campaign record family and gives ResourcePositionOwner an organization case. Additive; no shared declaration is redefined.",
  ],
  [
    "src/simulation/world.ts",
    "The campaign records join the one canonical World, in the same shape every other record family uses. No second World is introduced.",
  ],
  [
    "src/simulation/index.ts",
    "The campaign exports, named one by one rather than re-exported wholesale, so canonicalSupportBasisPoints stays unreachable from the presentation and player layers.",
  ],
  [
    "src/simulation/resources.ts",
    "An organization can own a resource position, so the endpoint-to-owner mapping is now total. This TIGHTENS the overdraw rule rather than relaxing it: organization-sourced transfers used to be exempt because the lookup returned null, and are now checked, which is what stops a committee spending money it has not raised.",
  ],
  [
    "src/simulation/resource-queries.ts",
    "The same total mapping, read back: the owner switch gains its organization case.",
  ],
  [
    "src/simulation/resource-integrity.ts",
    "The same total mapping, enforced: organization-owned positions are no longer skipped by the integrity pass.",
  ],
  [
    "src/simulation/production-catalog.ts",
    "One named allow-list of metric definition keys the simulation establishes for its own quantities, currently containing exactly one. A fixture corpus describing somewhere real without having read anything is still refused.",
  ],
  [
    "playwright.config.ts",
    "PLAYWRIGHT_PORT makes the e2e port overridable so concurrent worktrees do not silently share one dev server. The default is unchanged, so CI and a single checkout behave exactly as before.",
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
 * `src/simulation/campaign*`, `src/simulation/candidacy*` and
 * `CampaignWorkspace.tsx` are here because Packet 65's campaign and first
 * election own them outright: they did not exist before. The workspace is
 * named as a path rather than by widening `src/player/`, because the player
 * shell is a separate active lane and this branch must stay out of the rest
 * of it.
 */
export const ALLOWED =
  /^(\.claude\/launch\.json|\.github\/workflows\/|src\/authoring\/|src\/environment\/|src\/simulation\/campaign|src\/simulation\/candidacy|src\/presentation\/|src\/ui\/|src\/player\/player\.css|src\/player\/OfficeScene\.tsx|src\/player\/ModularCharacter\.tsx|src\/player\/CampaignWorkspace\.tsx|src\/player\/TitleScreen\.tsx|src\/player\/TitleTableau\.tsx|src\/player\/useRasterTier\.ts|src\/player\/useSceneTransform\.ts|src\/App\.tsx|scripts\/art-asset-factory\/|tests\/|art\/|docs\/|package\.json|package-lock\.json|AGENTS\.md|PATCH_NOTES\.md)/;

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
