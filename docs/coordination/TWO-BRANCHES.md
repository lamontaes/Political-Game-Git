# Two branches: the work branch and main

Written Nov 15, 2026, for the acting CTO and the owner. Nothing here has been
cut over. This page is the plan, the map and the way back.

## In plain words

Today there is one branch, `main`. It holds the game and about 1,900 test files.
The owner does not want test files on `main`.

The plan has two branches:

- **`dev` is where work happens.** Every pull request goes to `dev`. Every test
  and every check runs there. Everything that is on `main` today is on `dev`
  too, tests included.
- **`main` is only the game.** Each time `dev` passes its checks, one script
  copies `dev`'s files to `main` with every test file taken out, as one new
  commit. Nobody works on `main`. Builds and releases for players come from
  `main`.

Nothing is lost. `dev` keeps every file and all of history. `main` is a
filtered copy that moves forward one commit at a time.

The prepared parts are on the pull request "Two branches, prepared (draft)":

- `scripts/promote/test-files.mjs` says which files are test files.
- `scripts/promote/promote.mjs` makes the one commit for `main`.
- `.github/workflows/promote.yml` runs it by hand only (`workflow_dispatch`).
- The branch `preview/main-without-tests` shows what `main` would hold.

## a. The owner's ruling and the shape he chose

Nov 15, 2026, typed to the acting CTO:

> "don't merge tests into the main. If there are test files in main, start a
> Sonnet session to remove them all. I hate that. Literally, main should only
> be, well, I don't know. I just don't think test files should be on main. If
> it's on main, then it's already been tested."

Asked how, he chose this shape:

> "Two branches. All work and all tests go to a work branch, where every check
> runs. Main gets only the game: each time the work branch passes, its files are
> copied to main with every test file stripped. Builds come from main. Nothing is
> lost and the guards keep working."

## b. The name of the work branch: `dev`

The name is **`dev`** (owner, Nov 16: "Yes, dev is fine").

- It is short, and it is the name most people expect for "where work happens."
- It does not clash with the branch families already in use (`claude/*`,
  `play-first/*`, `governing/*`, `preview/*`).
- The game already has a "dev mode" for the owner's testing. The name `dev`
  fits that: this is the branch you play and test from.
- The name is one word in each file below, so choosing another name before
  cutover is a find-and-replace on this page's table, not a redesign.

## c. Everything that names or assumes `main`

"Machine" means a session edits it and a pull request carries it. "Person"
means the owner or the acting CTO does it in GitHub or by hand.
The word "work branch" means `dev`.

### Workflows (`.github/workflows/`)

| File                                                | What it does with main today                                                                                                                                                                   | After cutover                                                                                                                                                                                                                                                                                                                                                                                  | Who                                 |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| `release.yml`                                       | Runs on every push to `main` and builds and validates the candidate (publish false). Its `paths-ignore` list names pool and coordination files.                                                | Trigger on the work branch (`branches: [dev]`). Keeps the same `paths-ignore`. A second, light trigger on `main` is optional (see d).                                                                                                                                                                                                                                                          | Machine                             |
| `release-candidate.yml`                             | Builds and validates a candidate from the checked-out branch. Its publish job fetches `origin main`, lays the version commit on it and pushes `refs/heads/main`.                               | Publish job reads and pushes the work branch, not `main` (lines 438 to 493). The release commit lands on `dev`; the promote step carries it to `main`. Uses the same `RELEASE_PUSH_TOKEN` (see d).                                                                                                                                                                                             | Machine                             |
| `release-package.yml`                               | Every two hours (schedule) and by hand: validates and publishes the newest `main`, then packages the Mac and Windows apps from the published commit. Line 99 lists runs `?branch=main`.        | Validates and publishes on the work branch. The packaging jobs check out the promoted `main` commit that names the published commit and build from it (see d). Line 99 reads the work branch's runs.                                                                                                                                                                                           | Machine                             |
| `desktop-package.yml`                               | Builds the desktop app on pull requests that touch `desktop/**` and by hand. `cancel-in-progress` is off only for `refs/heads/main`.                                                           | Pull requests are against the work branch, so the cancel rule names `dev` (done in the cutover-edits pull request). It has no `ref` input: a manual run builds the branch it is started on. It is a pull request check, not the release build: its step "Prove the shell and update decisions" runs `desktop/tests`, which are test files and are not on `main`, so do not start it on `main`. | Machine (done)                      |
| `validate.yml`                                      | On every pull request and every hour: format, lint, typecheck, release check, zero-dice, tests (sharded), build. Line 89 uses `git merge-base HEAD origin/main` to find the declaration range. | Line 89 reads `origin/dev`. The hourly schedule runs on the default branch, so it runs on `dev` once `dev` is the default. All tests stay here.                                                                                                                                                                                                                                                | Machine                             |
| `m0-guard.yml`                                      | Golden-path run on pull requests and every hour "so main gets a verdict".                                                                                                                      | Same, on the work branch. The golden-path tests exist only there. The comment names `dev`.                                                                                                                                                                                                                                                                                                     | Machine                             |
| `new-game.yml`                                      | On pull requests and by hand: opens a new game and plays four weeks. Names no branch.                                                                                                          | No edit needed. Recommended: also run it on every push to `main` (the promoted tree), as the "the stripped game still opens" check.                                                                                                                                                                                                                                                            | Machine (optional)                  |
| `pool-done-on-merge.yml`                            | When a pull request into `main` merges with `Pool item:` on line 1, checks out `main` and pushes the status flip to `main` (line 19, 25).                                                      | `base.ref == 'dev'`; checks out and pushes `dev`.                                                                                                                                                                                                                                                                                                                                              | Machine                             |
| `pool-index.yml`                                    | On a push to `main` that touches `docs/pool/items/**`, regenerates `docs/pool/INDEX.md` and pushes to `main`.                                                                                  | Trigger, checkout and push use the work branch.                                                                                                                                                                                                                                                                                                                                                | Machine                             |
| `all-places-nightly.yml`, `twenty-year-nightly.yml` | Scheduled; GitHub runs a schedule from the **default** branch's copy of the file. Name no branch.                                                                                              | No edit if the default branch becomes `dev` (step 5 of the cutover). If the default stayed `main` they would run on a tree with no tests and fail.                                                                                                                                                                                                                                             | Person (the default-branch setting) |
| `audit-scan.yml`                                    | On pull requests. Names no branch.                                                                                                                                                             | No edit.                                                                                                                                                                                                                                                                                                                                                                                       | None                                |
| `promote.yml` (new, this pull request)              | Does not exist yet.                                                                                                                                                                            | Runs `promote.mjs` on `workflow_dispatch` now. After cutover, chained to "work branch passed" (see the cutover, step 9).                                                                                                                                                                                                                                                                       | Machine, then person for the chain  |

### Scripts

| File                                                                                                                                                                    | What it does with main today                                                                                                                                                                                              | After cutover                                                                                                                                                                                                                                                                        | Who                             |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------- |
| `scripts/pool/index.ts` (47 mentions)                                                                                                                                   | `claim`, `next`, `status`, `seen`, `add` each make a branch at `origin/main` and push to `main`, retry a lost race (lines 656 to 675), write `docs/pool/INDEX.md` on `main` only, read `origin/main:docs/pool/items/...`. | Every `origin/main` and `HEAD:main` becomes the work branch. `INDEX.md` is written on the work branch only.                                                                                                                                                                          | Machine                         |
| `scripts/pool/done-on-merge.ts`, `order.ts`, `draft-pr.ts`                                                                                                              | Comments and the "merged" test say "on main"; `done-on-merge` flips an item when its pull request merges into `main`.                                                                                                     | Say and test the work branch.                                                                                                                                                                                                                                                        | Machine                         |
| `scripts/release/check-push.ts`, `cli.ts`, `transition.ts`, `declarations.ts`                                                                                           | The declaration range base is `origin/main` (merge-base and fallback). `transition.ts` lists the shared lane files "written straight to main".                                                                            | Base is `origin/dev`. The lane files are written to `dev`.                                                                                                                                                                                                                           | Machine                         |
| `scripts/local-gate.mjs`                                                                                                                                                | The speed baseline must be three exclusive years on current `origin/main`; diffs against `origin/main`.                                                                                                                   | `origin/dev`.                                                                                                                                                                                                                                                                        | Machine                         |
| `scripts/speed-years/run.ts`                                                                                                                                            | Diffs `src` and `data` against `origin/main` to decide whether the base is the same.                                                                                                                                      | `origin/dev`.                                                                                                                                                                                                                                                                        | Machine                         |
| `scripts/client-provenance.mjs`, `desktop/scripts/stage.mjs`                                                                                                            | The composition `accepted-main` is refused unless HEAD is `origin/main`.                                                                                                                                                  | **No edit.** This is the rule "builds come from main", and it already holds: a build of the promoted commit has HEAD equal to `origin/main`.                                                                                                                                         | None                            |
| `scripts/storage/helper-checkout.sh`                                                                                                                                    | A new helper branch starts from `origin/main`; "run it from the main checkout" (that phrase means the primary checkout, not the branch).                                                                                  | Starts from `origin/dev`. Leave the phrase about the primary checkout.                                                                                                                                                                                                               | Machine                         |
| `scripts/stopgaps-move-old.ts`, `scripts/new-game-check.ts`, `scripts/zero-dice-guard.mjs` (`scripts/merger/cancel-stale-runs.sh` names no branch, so it needs no edit) | Comments or messages that name `main` (merge origin/main, replay against main, main's allowlist).                                                                                                                         | Say the work branch. The zero-dice allowlist is read from the working tree, so it needs no branch.                                                                                                                                                                                   | Machine                         |
| `scripts/promote/*` (new)                                                                                                                                               | Does not exist yet.                                                                                                                                                                                                       | `test-files.mjs` and `promote.mjs` run on the work branch checkout; they push `main`.                                                                                                                                                                                                | Machine                         |
| `.claude/settings.json`                                                                                                                                                 | Allows `Bash(git merge origin/main)` without a prompt.                                                                                                                                                                    | **Replaced** by `Bash(git merge origin/dev)`; the old line is removed, not kept. After the first promote `main`'s tip has no test files, so `git merge origin/main` on a work branch would delete every test the branch did not touch, and the allow list would let it run silently. | Machine (done)                  |
| `package.json` scripts                                                                                                                                                  | Names no branch. Test scripts (`test`, `test:*`, `zero-real-data`, `guards`, `validate`) name removed paths.                                                                                                              | On `main` only, `promote.mjs` drops the scripts that run a test runner or name a removed path (`MAIN_SIDE`), in `package.json` and in `desktop/package.json` (its `test` script runs `desktop/tests`, which are removed). `dev` keeps them all.                                      | Machine (done in `promote.mjs`) |
| `vite.config.ts`, `tsconfig.*.json`                                                                                                                                     | Name test folders (`tests/support/deep-transition-guard.ts`, test globs). They match nothing on `main`; `build` and `typecheck` pass without edits (Part 2).                                                              | No edit on either branch.                                                                                                                                                                                                                                                            | None                            |

### Instruction files, skills and rules

"Work branch" is the rewrite for a line that means the branch where work lands.
Lines that use "main" as an adjective ("the main checkout", "main character")
stay.

| File                                                                                                                                                                                                                                                                                                                                                                                                                                       | What it does with main today                                                                                                                                           | After cutover                                                                                                                                                                                                                                     | Who                         |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| `AGENTS.md` (16 mentions)                                                                                                                                                                                                                                                                                                                                                                                                                  | "pushes the claim to main", "a merge into main", "Red main comes first", "a second session replays its finish line on main", "local gate"; one line for every session. | Add a section "Two branches" at the top (what `dev` and `main` are). Rewrite each line that means the work branch. Done means seen in the game on `dev` (same game; the tests are on `dev` only).                                                 | Machine, then the CTO reads |
| `CLAUDE.md`                                                                                                                                                                                                                                                                                                                                                                                                                                | Imports `AGENTS.md`; names no branch.                                                                                                                                  | No edit.                                                                                                                                                                                                                                          | None                        |
| `ARCHITECTURE.md` (1)                                                                                                                                                                                                                                                                                                                                                                                                                      | One mention.                                                                                                                                                           | Work branch.                                                                                                                                                                                                                                      | Machine                     |
| `docs/pool/README.md` (27), `START-A-BUILDER.md` (11), `START-A-MERGER.md` (30)                                                                                                                                                                                                                                                                                                                                                            | The paste prompts: claim pushes to `main`; branch from `origin/main`; open the PR against `main`; the merge command merges into `main`.                                | Everything that is a branch name becomes `dev`. The merge command merges into `dev`. The merger paragraph also says: never merge into `main`.                                                                                                     | Machine, then the CTO reads |
| `docs/release/README.md` (22)                                                                                                                                                                                                                                                                                                                                                                                                              | "A push to `main` runs release.yml", the version commit and publish record land on `main`.                                                                             | Rewritten with section d below.                                                                                                                                                                                                                   | Machine                     |
| `docs/coordination/CREW.md`, `MERGE-FIRST.md`, `LEADS-2026-10-24.md`, `docs/play-first/*.md`                                                                                                                                                                                                                                                                                                                                               | The channel and handoff files are "edit only yours, commit to main".                                                                                                   | Commit to the work branch. (Records of what was said keep their words; they are not rewritten.)                                                                                                                                                   | Machine                     |
| `.agents/rules/how-we-talk.md` (5), `repository-reference.md` (3), `cadence-and-summaries.md` (2)                                                                                                                                                                                                                                                                                                                                          | The three shared files "on main"; the command list; "the entries main held on Nov 11".                                                                                 | Work branch (the last one is a date-pinned fact and stays).                                                                                                                                                                                       | Machine                     |
| `.agents/rules/standing-skills/local-gate`, `law-trace`, `feature-walkthrough`                                                                                                                                                                                                                                                                                                                                                             | "A failure that also fails on a clean main", "pin main and any candidate", "code on current main".                                                                     | Work branch.                                                                                                                                                                                                                                      | Machine                     |
| Skill `merger` (62)                                                                                                                                                                                                                                                                                                                                                                                                                        | Merges are head-pinned into `main`; "merge main in"; stale-run clearing; base-branch rules.                                                                            | Merges go into `dev`. Add: a merger never touches `main`; only `promote` does. This is the biggest rewrite.                                                                                                                                       | Machine                     |
| Skill `checker` (42)                                                                                                                                                                                                                                                                                                                                                                                                                       | Merges `main` in, runs the gate on the result, hands a pass to the mergers.                                                                                            | Merges `dev` in.                                                                                                                                                                                                                                  | Machine                     |
| Skills `red-main` (20), `merge-trains` (20), `session-start` (13), `pool-notes` (14), `cto` (12), `speed-work` (13), `play-first` (16), `words-engine` (18), `helper-checkout` (11), `generated-file-merges` (9), `seen-in-game` (8), `lead-session` (7), `pr-fixer` (6), `train-gate` (5), `wiring-audit` (5), `governing-measurement` (5)                                                                                                | Each says "red on main", "claim pushes to main", "merge main in", "run on the latest main", "commit to main".                                                          | "Red main" becomes "red `dev`" (the release run on `dev`). Skill `red-main` also gains: a red on `main` itself means a promote or a stripped-tree failure, read `docs/coordination/TWO-BRANCHES.md`. Every other mention becomes the work branch. | Machine                     |
| Skills with 1 to 4 mentions (about 30: `crew-messages`, `dev-tester`, `drawn-place-tests`, `file-a-pool-item`, `gap-trace`, `heavy-runs`, `labor-market-proof`, `lives`, `merge-audit`, `money-economy`, `nation`, `people-pack`, `play-walks`, `played-world-proof`, `player-screen-text`, `promises`, `room-spots`, `scene-*`, `screen-to-mock`, `skill-lessons`, `slim-down`, `term-read`, `current-pointers`, `cadence-and-summaries`) | Mostly "a red on main", "git fetch origin main", "tests on clean main".                                                                                                | Work branch where it names a branch. Several are prose ("main character", "main topic") and stay. Each skill is edited in `.agents/skills/` and mirrored byte for byte in `.claude/skills/`; run `npm run test:skill-ops`.                        | Machine                     |
| `.agents/skills/*` mirror `.claude/skills/*`                                                                                                                                                                                                                                                                                                                                                                                               | Byte-for-byte copies.                                                                                                                                                  | Same edit in both places or the skill test fails.                                                                                                                                                                                                 | Machine                     |
| `.github/PULL_REQUEST_TEMPLATE.md`, `.github/CODEOWNERS`                                                                                                                                                                                                                                                                                                                                                                                   | Name no branch.                                                                                                                                                        | No edit.                                                                                                                                                                                                                                          | None                        |
| `docs/current.json`                                                                                                                                                                                                                                                                                                                                                                                                                        | The master file of what is current.                                                                                                                                    | Gains the row for this page (done in this pull request).                                                                                                                                                                                          | Machine                     |

### GitHub settings (not in the repository)

| Setting                                          | Today                                                                                                        | After cutover                                                                                                                               | Who           |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| Default branch                                   | `main`                                                                                                       | `dev` (so pull requests default to `dev`, schedules run on `dev`, clones open on `dev`).                                                    | Owner         |
| Branch protection / ruleset                      | On `main`: required checks `validate` and `golden-path` on every push (the release workflow's note says so). | Copy the same rule to `dev`. On `main`, require nothing but let only the promote token push (no pull requests, no force push, no deletion). | Owner         |
| Secret `RELEASE_PUSH_TOKEN` (fine-grained token) | Pushes the version commit to `main` past protection.                                                         | Must be allowed to push to both `dev` (version commit) and `main` (promote).                                                                | Owner         |
| Repository variable `RELEASE_AUTOMATION`         | `enabled` gates the publish job.                                                                             | Unchanged.                                                                                                                                  | None          |
| Open pull requests                               | Based on `main`.                                                                                             | Retargeted to `dev` (see e).                                                                                                                | Session / CTO |

### What the machine-edits pull request changed, and the `main` it left

The pull request `claude/two-branches-cutover-edits` makes every machine row
above. It is based on `main` and is retargeted to `dev` at step 6; none of it
takes effect before then.

- **One name for the work branch.** `scripts/branches.mjs` exports
  `WORK_BRANCH` (`dev`), `GAME_BRANCH` (`main`) and `WORK_REF` (`origin/dev`),
  with `scripts/branches.d.mts` for TypeScript. The pool, release and
  speed-years scripts import it. `scripts/local-gate.mjs` stays free of
  imports and repeats `origin/dev` at the top with a comment that points there.
- **Workflows.** The work-branch rows in the table are done. The concurrency
  groups `release-main-validate` and `release-main-publish` are now
  `release-dev-validate` and `release-dev-publish`.
- **Instruction files.** Every sentence that tells a session which branch to
  branch from, push to, merge into, compare with or read the shared files on
  now says `dev`. `AGENTS.md` has one new standing rule. Both skill folders are
  edited the same way.
- **`main` left on purpose, by reason:**
  - The game branch itself: `scripts/promote/*`, `tests/promote/*`,
    `promote.yml`, `release-package.yml`'s packaging (next pull request), and
    the new standing rule.
  - Builds come from `main`: `scripts/client-provenance.mjs`,
    `desktop/scripts/stage.mjs`, `desktop/README.md` and
    `desktop/tests/stage-provenance.test.mjs` (the composition
    `accepted-main`).
  - Owner quotes and dated records: rulings, handoff logs, the channel,
    "turned main red on #N" lessons in skills, and the owner's words in
    `AGENTS.md`, `docs/pool/README.md` and the `seen-in-game` skill.
  - Names that are not branch references: item ids (`release-main-red`,
    `release-main-red-standing`, `tooling-ci-main-validation-hourly`), the
    skill `red-main`, the `--main <commit>` flag of `npm run pool -- seen`, the
    receipt key `sourceMain` in speed receipts, and "the main checkout"
    (the primary checkout, not a branch).

### The settings, step by step

The owner said on Nov 16 that these are done from his other account, the one
with access to the repository's settings, after it resets at 5 a.m. his time.
They are in two sittings. The acting CTO says in the channel when each is due.

**First sitting (cutover step 5), right after the branch `dev` exists:**

1. If `dev` does not exist yet (the acting CTO's push was refused): on the
   repository's front page open the branch menu, type `dev`, and choose
   "Create branch `dev` from `main`".
2. Settings, General, "Default branch": switch it to `dev`.
3. Settings, Rules, Rulesets (or Settings, Branches, if the rule for `main` is
   a classic protection rule): open the rule that covers `main`. Make the same
   rule cover `dev`: either add `dev` to its target branches or copy the rule
   and target `dev`. It must require the status checks `validate` and
   `golden-path`, and it must keep the same bypass list as today, so the
   release step can push its version commit to `dev` as it does to `main`.
4. Change nothing on `main` yet.

**Second sitting (cutover step 10), after the first promote is on `main` and
its build is seen working:**

5. Give `main` its own rule: nobody merges a pull request into it, nobody
   pushes to it except the actor on the bypass list (the release token, which
   the promote step uses), no force push, no deletion. Take the required
   status checks off `main`: a promote commit is pushed, not merged, and its
   checks ran on `dev`.

The secret `RELEASE_PUSH_TOKEN` needs no change if it is a token for this
repository with write access to its contents: such a token is not tied to one
branch. What lets it past protection is the bypass list, which steps 3 and 5
keep.

## d. Where the release steps live after cutover

The owner's words: "Builds come from main."

Today one workflow (`release-candidate.yml`, called by `release.yml` and
`release-package.yml`) does four things in a row: it builds a candidate, it
makes the **version commit** (it bumps `package.json` and the lockfile, writes
the new section of `PATCH_NOTES.md`, deletes the consumed
`docs/release/changes/*.md` files and updates `docs/release/consumed-changes.json`)
and pushes it to `main`, it writes the **publish record** (a workflow artifact
with version, candidate sha, bundle hash, source sha and the published commit),
and the package workflow builds the desktop apps from that published commit and
makes the GitHub release.

### Recommendation

**Make the version commit and the patch notes on `dev`. Build the apps from `main`.**

1. `release.yml` validates every push to `dev` (as it does for `main` today).
2. The two-hourly `release-package.yml` runs on `dev`. Its `candidate` job
   builds, validates and pushes the **version commit to `dev`**, so `dev`
   always carries `package.json`'s accepted version, `PATCH_NOTES.md` and
   `docs/release/consumed-changes.json`, and the declarations in
   `docs/release/changes/` are consumed there.
3. Right after that push, the workflow calls `promote.yml` for that version
   commit. `main` gains one commit whose tree is the same version, the same
   patch notes and the same declarations state, with test files stripped.
4. The packaging jobs check out **that promoted `main` commit** and build the
   Mac and Windows apps from it, so the build is from `main`, as the owner
   said. They write the publish record, and the GitHub release the installed
   app reads points to the promoted commit, with the work-branch version
   commit in the record as `sourceSha`.

Why this and not the others:

| Choice                                                                    | What it does                                                                                                                                                                    | The one risk                                                                                                                                                                                                                 |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A. Version commit and notes on `dev`, build from `main` (recommended)** | Keeps the release machinery almost as it is: it already pushes one validated commit and reads declarations; only the branch name moves. Players' builds still come from `main`. | The published version commit exists twice (the `dev` version commit and the promoted `main` commit). The publish record and the GitHub release must say both shas, and the update checker must compare versions, never shas. |
| B. Version commit made by the promote step on `main`                      | `dev` never carries a version bump; `promote.mjs` bumps the version while stripping.                                                                                            | `dev` and `main` carry different `package.json` versions, so `release:check` on `dev` compares against the wrong version and declarations are consumed from a branch that has no copy of the result. Needs a new back-merge. |
| C. Everything on `dev`, builds from `dev`                                 | Smallest change. Contradicts "builds come from main."                                                                                                                           | The shipped app is built from a tree with 1,900 test files in it, and the owner's ruling is not met. Not recommended.                                                                                                        |

The release check `npm run release:check` and the declaration range work on
`dev` as they do on `main` today. On `main` there is no declaration range to
check (no pull requests land there); the Part 2 run of `release:check` on the
stripped tree passes.

## e. The cutover, in order

Main is never broken and no open pull request loses work. Each step says who.
Steps 1 to 4 can be done at any time and change nothing for anyone.

1. **Merge this pull request into `main`.** It only adds files, a manual
   workflow and this page. (The acting CTO.)
2. **Run the promote script as a dry run** from a clean checkout of `main`'s
   current tip: `node scripts/promote/promote.mjs --work HEAD`. It prints the
   counts and leaves the commit under `refs/promote/candidate`; it pushes
   nothing. Compare its tree with the branch `preview/main-without-tests`.
   (A session.)
3. **Pick the quiet hour.** Stop new pool claims by posting in the channel, and
   check the newest release run is green on `main` (a red `main` is fixed
   first). (The acting CTO.)
4. **Create `dev` from `main`'s tip** at that moment (`git branch dev origin/main`
   and push). `dev` and `main` are the same commit now. (The acting CTO.)
5. **Set the default branch to `dev`** and **copy branch protection to `dev`**
   (required checks `validate` and `golden-path`). Check that
   `RELEASE_PUSH_TOKEN` can push to `dev`. Leave `main`'s protection as it is
   for now. (The owner, in GitHub settings.)
6. **Merge the machine edits as one pull request into `dev`** (the table in
   section c: workflow triggers, `pool`, `release`, `local-gate`,
   `speed-years`, `helper-checkout`, `.claude/settings.json`, `AGENTS.md`, the
   pool paste prompts, the skills and rules, in both skill folders). This is
   the only large pull request. Until it merges, claims and merges still push
   to `main`; keep step 6 short and do it in one sitting. (One Sonnet session,
   checked by a second, merged by the CTO.)
7. **Retarget every open pull request to `dev`.** Each author (or the checker
   that holds the pull request) changes the base branch of the pull request to
   `dev` in GitHub (the "Edit" button next to the title) or with
   `gh pr edit <n> --base dev`. Nothing needs rebasing: `dev` is the same commit
   as `main` was, so each pull request's diff does not change. A pull request
   merged into `main` after step 4 is carried over by hand: the CTO merges
   `main` into `dev` once (it is a fast-forward until the first promote).
   Pull requests for the pool use the hour's one bundle as before, now into `dev`.
   (Each author; the CTO for any that are left at the end of the hour.)
8. **First real promote.** Run `promote.yml` by hand with the branch `dev`. It
   makes the first "Promote <sha>: the game without test files" commit on
   `main`, which removes the test files from `main` for the first time.
   Check that `main` builds: `npm run build`, `npm run new-game-check`.
   (The acting CTO.)
9. **Chain the promote to the work branch's checks.** Add the `workflow_run`
   trigger to `promote.yml` (after `validate` and `golden-path` succeed on a push to `dev`),
   and move the release package workflow to build from `main`
   (section d). One small pull request into `dev`. (A session; the CTO merges.)
10. **Tighten `main`.** Allow only the promote token to push; no pull requests,
    no force push, no deletion. (The owner, in GitHub settings.)
11. **Say it in the channel**: `dev` is the work branch, `main` is the game,
    never merge into `main`. (The acting CTO.)

### What each open pull request's author must do

Change the base branch of the pull request from `main` to `dev`. That is all.
If GitHub shows a conflict afterwards, merge `origin/dev` into the branch as
before (skill `pr-fixer`). Pull requests stay open; their checks run again on
the new base.

## f. How to undo the cutover

Each step above can be undone, in reverse, and no history is rewritten.

1. Pause `promote.yml` (disable the workflow). `main` stays at the last
   promoted commit and is still a working game.
2. To get tests back on `main`: merge `dev` into `main` (a normal merge; the
   test files come back with it). Nothing is lost, because `dev` held them
   all the time.
3. In GitHub settings: default branch back to `main`; protection back on
   `main` (the owner).
4. Revert the machine-edits pull request from step 6 on `dev` (one revert),
   or merge `dev` into `main` and use `main` again; every script then reads
   `main` as before.
5. Retarget open pull requests back to `main` (same button).
6. Delete nothing: leave `dev` as a spare branch until the owner says.
7. If `main` becomes the work branch again, take the step
   "Refuse a branch that has main merged into it" out of `validate.yml` and the
   matching line out of `scripts/local-gate.mjs` (reverting the step 6 pull
   request does both). Once `main` carries promote commits, every branch cut
   from it would fail that guard.

## Known limits (read before cutting over)

- **Never merge `main` into a work branch.** After the first promote, `main`'s
  tip is a commit with no test files whose parent is the old `main` tip.
  `git merge origin/main` on a branch applies "delete about 1,900 test files"
  to it, silently for every test the branch did not touch. Merge `dev`. Three
  things hold this: `.claude/settings.json` allows `git merge origin/dev` and
  no longer `origin/main`; the rule is in `AGENTS.md`, the skills `checker`,
  `pr-fixer`, `merger` and `generated-file-merges`, and the two pool paste
  pages; and `scripts/promote/no-promote-in-history.mjs` fails a pull request
  whose history holds a commit titled "Promote <sha>: the game without test
  files". It runs as the first step of the `repository` job in `validate.yml`
  (that checkout has `fetch-depth: 0`, so `origin/dev..HEAD` is complete) and
  in `scripts/local-gate.mjs`. It is not run on `main`.

- The tools that run the guards (`npm run guards`, `npm test`, the golden-path
  suite) work only on `dev`. A session that checks out `main` will not find them.
- The rule for "a test file" is `scripts/promote/test-files.mjs`; its edge
  cases are listed in the pull request. Adding a new test helper that only
  tests read needs no change: the rule finds it. A game module that imports a
  file named like a test keeps that file on `main`.
- **Release checks belong on the work branch only.** A promote commit changes
  hundreds of paths with no declaration in `docs/release/changes/` (the
  declarations were consumed on `dev`). So `npm run release:check` run on
  `main` against `main`'s previous tip fails by design ("adds or changes no
  declaration"). The same check on the stripped tree with an empty range passes.
  After cutover `release.yml` must not run on pushes to `main`; the table in
  section c moves its trigger to `dev` for this reason.
- **Packaging needs one test-named file.** `desktop/scripts/smoke-test.mjs`
  plays the packaged app inside `release-package.yml`, so the rule keeps it on
  `main` (the `KEEP` list in `scripts/promote/test-files.mjs`). The rule also
  keeps other test-named files that a script imports or reads (`--kept` lists
  them).
- **The first promote needs `dev` to be ahead of `main`.** Right after `dev`
  is cut, the two are the same commit and the promote script answers "Nothing
  to promote". The machine edits (step 6) are the first commit that `dev` has
  and `main` lacks, so step 8 comes after step 6, as written.
- **Dry run, Nov 16.** On `main` at 5cf42fc4236f00f16867fc444e6a6bf825be4c3a
  with this pull request merged in, the script removed 1,944 test files (1,776
  under `src`, 81 under `tests`, 64 under `scripts`, 22 under `desktop`, 1
  under `data`), edited `package.json`, made one commit on top of `main` and
  pushed nothing. Its tree differs from `preview/main-without-tests` only by
  what `main` gained since the preview was made.
- `docs/` is never stripped, even a file named like a test (a reproduction
  file quoting a browser check). Those are prose for the owner and sessions.

## Step 9 as built (the promote-chain pull request)

- `release-package.yml` has a `promote` job between `find_candidate` and the
  desktop jobs. It calls `promote.yml` (now also `workflow_call`) with the
  version commit's sha. The desktop jobs check out the returned `main_sha`; the
  GitHub release targets it and names both commits; a `release-record` artifact
  holds both.
- `promote.yml` keeps its manual run. `promote.mjs --find <work-sha>` prints
  the `main` commit that carries a work commit, so a rerun never promotes twice.
- The app's update check compares versions, so two shas for one release do
  no harm. The failure table is in `docs/release/README.md`.
- **Ruling (the acting CTO, Nov 16): `main` is updated once per passing
  release run**, at most every two hours and only when a change is pending,
  because the release run is the one place where the whole candidate is built
  and validated. A promote on every merge into `dev` is not built.
