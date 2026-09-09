# Releases: versions and player-readable patch notes

Two files are canonical and stay canonical:

- **`package.json.version`** is the accepted release version. Nothing else
  decides it, and no React file carries a second copy of it.
- **`PATCH_NOTES.md`** is the player-readable release history. It is not
  generated from commits, it is never rewritten backwards, and it is the only
  changelog.

Everything below exists so those two files stay true without any agent being
told about them in a prompt. `package-lock.json.version` and
`package-lock.json packages[""].version` are required mirrors; validation fails
if either is missing, malformed, or different from `package.json.version`.

## What you do when you change something

Every eligible change created after rollout carries one file in
`docs/release/changes/`, named for a change id you pick:

```bash
npm run release:declare -- my-change-id
```

That writes `docs/release/changes/my-change-id.md`:

```markdown
---
id: my-change-id
impact: minor
section: Added
title: A short headline, the way a public update would put it.
---

Prose a player would read. What they can now do, or what stopped going wrong.
```

`impact` is one of:

| impact  | means                                                   | version effect  |
| ------- | ------------------------------------------------------- | --------------- |
| `minor` | a player-visible feature or system                      | `0.2.0 → 0.3.0` |
| `patch` | a player-visible bugfix or polish change                | `0.2.0 → 0.2.1` |
| `none`  | source, tooling, tests, docs — nothing to tell a player | none            |

`impact: none` takes no `section` and no `title`, and its body is a one-line
internal reason. Writing a fake player note for a parser change is worse than
writing none, so the convention has a way to say "none" out loud. Omitting the
declaration altogether is not the same decision and fails on a fresh branch.

`section` is `Added`, `Improved`, `Fixed` or `Changed`.

The prose is checked for things that do not belong in a public update: commit
hashes, pull-request numbers, branch names, packet and corpus identifiers, CI
bookkeeping. Those belong in `docs/release/consumed-changes.json`, which the
release writes for you.

Declarations are inputs. The release folds them into `PATCH_NOTES.md` and
deletes them, so they never become a second permanent changelog. One file per
change means two branches never edit the same paragraph.

## What happens on merge

A push to `main` runs `.github/workflows/release.yml`, which:

1. uses a read-only job to enforce the exact incoming base/head range and read
   every pending declaration on that source revision;
2. decides the outcome — `no-op`, `release`, or `blocked`;
3. on `release`, transactionally moves `package.json` and both root lockfile
   version fields, inserts one new
   section at the top of the accepted history in `PATCH_NOTES.md`, records the
   consumed change ids in `docs/release/consumed-changes.json`, and deletes the
   consumed declaration files;
4. creates the local candidate commit, then **runs the full `npm run validate`
   against that exact clean commit**, so its build identity is the same commit
   that may be published;
5. packages the validated commit as a Git bundle plus a digest-bound manifest;
6. when enabled, gives a separate minimal publisher job write authority. That
   job checks out no repository tree, installs no dependencies, and runs no
   repository code. It verifies the bundle, exact parent/commit/tree identity,
   exact three-file artifact shape, allowed metadata-only path set,
   regular-file modes, and all three version fields before attempting one
   fast-forward push of the unchanged commit;
7. when release automation is not enabled, uploads the exact candidate bundle
   and review patch and stops without publishing.

You can run every step of that locally:

```bash
npm run release:preview
npm run release:apply -- --dry-run
npm run release:recover
```

`npm run release:check` is part of `npm run validate`.

## What it refuses to do

- **It never bumps on an unmerged branch.** Only a push to `main` releases.
- **It never invents a note.** A batch of `impact: none` declarations moves
  nothing; they wait and are recorded when the next player-facing release
  consumes them.
- **It never promotes a candidate.** `PATCH_NOTES.md` reserves the version in
  any `CANDIDATE, NOT YET ACCEPTED` heading. If the arithmetic lands on a
  reserved number the release is `blocked` and says so; accepting or renumbering
  a candidate is an owner decision, and one constituent change merging is not
  that decision. The pending declarations stay pending.
- **It never reaches 1.0 by addition.** Major versions and public release are
  owner decisions.
- **It never rewrites accepted history.** A new section is inserted; existing
  bytes are not touched. A revert is described by a new declaration, truthfully,
  rather than by deleting the note that described what was reverted.
- **It never merges anything, approves anything, or publishes anywhere.**

## Duplicate events, races, and loops

- **Replaying an event is a no-op.** The declarations it would consume are
  already gone from the tree, so the plan is empty.
- **A reused change id is an error, not a second release.** The ledger holds
  every consumed id, and `release:check` fails on a collision.
- **Two merges cannot allocate the same number.** The version is read from the
  revision being released, not remembered, and the release lands as one push
  that must fast-forward. If `main` moved underneath, the push is refused, the
  declarations stay unconsumed, and the next push event picks them up. Nothing
  is half-published, because publication is that single push.
- **Order does not matter.** A run consumes everything pending at its revision,
  so a run that lost the race recovers whatever an earlier one left behind.
  Actions does not guarantee queue order, and this design does not need it.
- **It cannot trigger itself.** The release commit is pushed with the default
  `GITHUB_TOKEN`, and GitHub does not start workflow runs from events that token
  creates. The workflow also skips its own commit subject as a second guard.

## Build identity

The accepted version answers "which release is this?". It cannot answer "which
build is this?", because every checkout between two releases carries the same
number. `src/release/build-identity.ts` answers that: the bundler fixes the
package version and the actual source revision into the build, and running code
reads both from there. It is not a save-schema version and must never be used
as one.

## Local apply recovery

`release:apply` computes every resulting byte and preflights every target before
mutation. It then writes a durable transaction journal outside the tracked
tree, replaces files one at a time, verifies the complete desired state, marks
the transaction committed, and removes the journal. An ordinary error rolls
all paths back. If the process is interrupted, the next apply recovers first;
`npm run release:recover` performs the same recovery explicitly. A prepared
journal rolls back, while a fully verified committed journal only finishes
cleanup. Validation refuses to continue while a journal remains.

## Branches cut before this existed

The rollout marker records the last pre-convention main commit. Validation
requires an explicit comparison base, head, and PR/push mode in CI and proves
their Git relationship. A branch whose actual merge-base is at or before that
cutoff remains exempt, so frozen legacy work is not retroactively broken. A
fresh branch whose merge-base is after the cutoff must add or change a valid
`patch`, `minor`, or `none` declaration when it changes any eligible path.
An eligible path is any changed tracked path outside the declaration directory;
declaration-only changes therefore cannot create a recursive requirement. Once
the marker exists in the comparison base, its exact bytes are immutable and
the base copy is authoritative, so a branch cannot move its own cutoff.
Missing or unresolvable history never earns an exemption.

The `UNRELEASED` sections already in `PATCH_NOTES.md` are hand-written under the
older convention. The automation leaves them alone; it only ever inserts new
accepted sections below them.
