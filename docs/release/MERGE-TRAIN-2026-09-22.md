# The merge train to main, night of 2026-09-22

Written by the art/client/release lane for the 9am ET report. Every number here
came from a command or a live GitHub read, not from a report. Where evidence is
local rather than a CI verdict, it says so — those two are never blurred.

The goal lamontae set, in his own words: everything merged onto main and
hopefully fully green by 9am ET (13:00Z), or failing that a train he can clear
by clicking merge a few times.

## 1. What CI can actually deliver in a night

This is the number that governs everything else, and it was not known until it
was measured.

From run `35680954056`, per job, start to completion:

| job              | duration           |
| ---------------- | ------------------ |
| repository       | 6.3 min            |
| unit, six shards | 4.0 – 5.9 min each |
| browser shard 1  | 31.4 min           |
| browser shard 2  | 15.0 min           |

A full fifteen-job run is roughly **236 job-minutes**. The repository runs about
**two jobs concurrently**, so one verdict costs about **118 minutes of exclusive
queue**. Between 05:16Z and 13:00Z that is **about four full verdicts**, and only
if nothing is wasted.

The same run is the check on the estimate rather than a model of it: created
02:50:43, and at 05:16 — two and a half hours later — six of its fifteen jobs had
still never started.

**Consequence.** With roughly a dozen pull requests in flight and four verdicts
available, no arrangement gets them all green. This is why the answer to "merge
train or one combined branch" is separate pull requests: one combined branch
spends the whole budget on a single verdict, and a single red at noon leaves
nothing. Separate pull requests spend it on four independent chances, and the
ones that come back green are genuinely green. What has to change under a
deadline is not the shape but the ruthlessness — three or four get the machine,
the rest land on stated local evidence.

## 2. The queue was the bottleneck, and why

`.github/workflows/validate.yml` on `main` had **no `concurrency:` group** and
never had one. Without it every push leaves its predecessor's full fifteen jobs
in the queue permanently; they do not expire.

Swept at 05:19Z, matching every queued run against its branch's current head:
**100 queued runs, 79 of them on superseded commits.** Nine stale runs on one
branch, eight on another, six each on two more. At up to fifteen jobs apiece,
on the order of a thousand jobs of pure waste sitting in front of every branch
waiting for a verdict.

The fix existed and was correct — commit `64f09e33`, authored 03:58Z — but it had
been committed to `codex/client-content-delivery`, a branch that does not reach
main. **This is the third time in one night that a correct fix sat on a branch
that was not the one failing**, and the first two are already written into
`AGENTS.md`. It was cherry-picked verbatim as **PR #303** and merged at 05:41Z.

### The group does work on queued runs

This was doubted, so it was tested rather than assumed. After #303 landed, three
pushes to the client line:

- push run `35691847508` at `77ada723` — **cancelled**, `updated_at` 05:46:06,
  the moment `70fa13a7` was pushed at 05:46:05. It was queued and had started no
  job.
- both runs at `8138261c` — **cancelled** at 05:43:52 and 05:43:57, when
  `77ada723` was pushed at 05:43:49.

The second pair matters: `8138261c` predates the block. The group is evaluated
from the workflow file at the **new** run's commit, and that run then cancels
every earlier run in its group. So a branch starts self-managing the moment it
takes main, retroactively.

### Sweeping rules, for whoever does it next

- The rule is **newest per ref per workflow**, not newest per ref. `main` carries
  both `validate.yml` and `release.yml`; a head-only rule kills a Release run for
  being older than an unrelated validate run.
- Superseded `main` runs are cancelled too. `cancel-in-progress` is deliberately
  false on main so a commit is not killed by the next push — that intent is
  served by protecting the current head, not by holding runs for commits nobody
  will compare against.
- **A cancel returns 202 and the run can still read `queued` for minutes.**
  GitHub reaps a fully-queued run lazily, so a moved `updated_at` is the
  confirmation, not `status`. Do not re-cancel on a stale `status`; in one round
  51 of 68 apparent stale runs were already cancelled and merely unreaped.
- A run that has already finished returns 409, which is harmless.

## 3. Failures fixed, and how each was attributed

Every one of these was checked against the base branch before being called
caused-here or inherited.

### The prose gate failed on clean main

`npm run corpus:prose -- check` exited non-zero on `main` at `445441a5` with an
orphaned anchor `describeBriefing-0005` and an unmapped site in
`src/presentation/conversation-subjects.ts`. Verified independently rather than
relayed. Fixed by PR #301.

Refinement worth keeping: **`validate:ci-sharded` does not run `corpus:prose`**.
It bites in a unit shard, through `scripts/prose-corpus/corpus.test.ts` (1 failed,
41 passed on main), and in the browser shard that builds the prose review packet.
So it was not failing everything everywhere, but it was enough to deny any branch
a green `validate` aggregate.

### The retired Visual4 cast was the entire review art bank

Measured with the same probe on both trees: `main` assembles **669 components at
catalog generation 4**; `claude/delete-retired-visual4` assembles **0 at
generation 0**. So deleting the retired cast — which lamontae explicitly ordered
— leaves a public checkout with no candidate-review material at all.

Two things broke on that, and neither is a player-facing regression:

1. `tests/art-preview.test.ts` asked the wardrobe adapter for a garment at
   `describe` body level, so it threw during collection and took all thirty-nine
   of its assertions down before one ran. Now the file states the condition once,
   the eight suites needing material run only where there is material, and a new
   invariant runs either way asserting the two states cannot disagree — a catalog
   reporting a generation must have components, and one reporting none must have
   none — so a half-loaded or genuinely broken bank cannot hide behind the skip.
   Verified both directions: bank absent, 9 passed and 31 skipped and the file
   loads; main with the identical file, bank present, **40 passed and 0 skipped**.
   No assertion was removed or weakened.
2. `scripts/dev-lab/figure-framing.test.ts` compares a committed report with a
   live measurement. Captured to a scratch directory rather than read off a diff,
   because which library moved is what decides the response:
   **production `{"production-fixture":140,"refused":8}` is byte-identical to the
   committed report**, and only the development-only candidate review moved, from
   `{"candidate-review":96,"refused":52}` to `{"refused":148}`. Stale evidence,
   not a regression, refreshed through the report's own `PG_CAPTURE_EVIDENCE=1`
   workflow.

The refreshed report's "Exact remaining asset needs" section is now the useful
part: in the compositor's own words, no body resolves for `seated-at-desk` or
`seated-guest-neutral`, so `top`, `bottom`, `head` and `footwear` cannot fill at
the seated anchors. That is registrar L12 — seated bodies drawn free of furniture
— stated by the pipeline rather than by inspection.

### The packaged client's art-review proof

Two failures, one behind the other.

The loud one: the `mac-arm64-art-review` packaging job required a drawn candidate
body on a runner that is forbidden to carry the private pack. Fixed by requiring
it only where a pack is declared present, via `OCD_EXPECT_CANDIDATE_FIGURE=1`,
which public CI deliberately does not set and the owner's Mac does. Without it
the proof accepts either the drawn figure or the surface's own stated reason for
not drawing one, and prints which it found, so it cannot pass silently.

The quiet one behind it: with that fixed, the job reached the private controller
and timed out thirty seconds on
`getByRole("combobox", { name: "Game build" })`. The chooser was rendering
correctly the whole time — `index.html` ships
`<label for="track">Game version</label>`, renamed in `c14cb9d3` without the proof
being renamed with it. `origin/main` still says "Game build", which is why it
only failed on the client line. An accessible name is part of the interface: when
it changes, everything addressing the control by it has to change too.

### 87 unformatted files on a build branch

Not that lane's files and not theirs to reformat. Measured on `b357b7b5`:
**52** under `public/data/state-voting/v1/` (generated), **30** under
`docs/reference/regional-opening/raw/` (verbatim publisher captures), and **6**
ordinary markdown documents that genuinely were unformatted.

The 82 must not be reformatted: `retrieval-receipt.json` records each capture's
exact byte length and SHA-256, so reformatting breaks every recorded hash against
the file it attests, and several cannot be parsed by Prettier at all — which is
what a faithful capture of somebody else's page looks like.

`origin/main` has neither the exclusions nor the files (0 under both paths), so
main is internally consistent and passes. Any branch built from the client line's
_content_ without the client line's `.prettierignore` fails on all 82. Fix
prepared and verified on `claude/format-exclusions-for-build-branch`,
commit `c57283d8`.

Worth stating plainly because it changes how a red branch is read: **`format` is
the first link in `validate:ci-sharded`'s `&&` chain**, so its failure stops every
later check in the repository job from running at all. Such a branch is not
failing one check; it is failing the first and never reaching the rest.

## 4. Reading a red check honestly

Two traps cost several lanes a round each tonight.

**A cancelled run reads as red.** The aggregate `validate` job exits 1 when its
required jobs are `cancelled`, logging `repository=cancelled unit=cancelled
browser=cancelled` with nothing having been tested. Since superseded runs are
being cancelled deliberately, this fires often. It only ever appears on a commit
that is no longer a branch's head, so: **on any red check, read the job log, and
check whether the event's `head_sha` is still the head.** A stale sha plus
`cancelled` upstream needs no fix, no comment and no re-run.

**`get_status` reports nothing here.** This repository reports through check
runs, not the legacy commit-status API, so `pull_request_read` with
`method: get_status` returns `{"state":"pending","total_count":0,"statuses":[]}`
whatever the truth. One lane read that as "no runs are being created" and
concluded webhooks were broken. Use `method: get_check_runs`, and read at job
level — run-level `status` and `updated_at` under-report badly.

## 5. Conflicts on generated files

Three of the merges into main this night conflicted, all on generated artifacts,
and none was resolved by picking a side:

- `docs/dehardwire/census.json` records a module count. Regenerated with
  `node scripts/dehardwire-census.mjs`; the merged tree's true counts were 690 on
  the client line and 654 on the deletion branch, matching neither parent.
  `src/presentation/dehardwire-census.test.ts` passes on both.
- `docs/prose-inventory/*` regenerated with `npm run corpus:prose`, and
  `corpus:prose -- check` run afterwards to confirm the anchor ledger is sound —
  0 hard errors on every merged tree.

The rule this encodes: regenerate with the repository's own tooling, never hand
merge, and re-run the gate that owns the artifact afterwards.

## 6. Release-note accuracy

A declaration titled "You can stand for the Alaska legislature on an ordinary
start date again" promised something the measurement contradicts. Its own body is
accurate and narrower: a **lifelong resident** of Sitka filing in January can be
assessed on the actual requirements — twenty-five for the senate, twenty-one for
the house, three years in the state and one in the district. A lifelong resident
being assessable is not an ordinary start being standable, and the body's own
numbers are the reason: an ordinary start has no three years in state on record.
Alaska still refuses on an ordinary start; what changed is the reason it gives.

Retitled to "Alaska now judges a legislative candidacy on its real requirements
instead of refusing every date". The body is untouched. The `id` is left alone
deliberately: it is the declaration's identity in a range already committed to
main, and no player reads it.

The standing rule: **title an entry after the failure observed, not the cause
suspected or the fix intended, until the cause is measured.**

One detail from that check is worth keeping on its own, because it is the kind
of thing that misleads the next reader rather than this one:
`QualificationSourceRef.researchLineage` reads like provenance and is never
consulted as any. It is a string naming the research row a verification came
from, and no code path in `candidate-qualification.ts` looks a row up by it. A
field that looks like a pointer and is only a label will eventually be believed
by somebody tracing a fact back, so it is worth saying plainly that the trail
stops there.

### The mechanism the body describes was checked too, not only the title

A wrong title is the obvious failure; a body that describes the wrong machinery
is the quieter one, and it was raised against this entry because the playtesting
lane measured that **none of the 69 sourced qualification rows are Alaska**. If
the note were describing a row's commencement date it would be describing a path
Alaska does not travel.

Read at the source rather than inferred: the change is `AK_CONSTITUTION` in
`src/simulation/candidate-qualification.ts`, whose `provisionEffectiveOn` went
from `null` to `1959-01-03` in commit `b53f137d`. The two rule sets that carry it
key on `candidacyPackId: "us-ak-legislature-v1:candidacy"` — Alaska's legislature
pack, which is exactly the path the measurement says Alaska uses. Its
`researchLineage` field _names_ a research row but is not read as one; nothing in
this file consults the ledger. So the body's framing — that the game held the day
we read the rule but not the day the rule began — is true of the path actually
taken. `src/simulation/candidate-qualification.test.ts` passes 9 of 9 at this
head.

The body's scope is also narrower than the title ever was, and deliberately: it
claims a **lifelong resident** of Sitka can be assessed. An ordinary browser
start still cannot stand, because it records no proved residence interval — a
real gap between unit fixtures and an ordinary start, fixed for its _reason_
rather than its _answer_ by PR #298. The body says nothing broader than that, so
it is left untouched. Only the title changed.

## 7. Open, and not fixed

Stated so the morning report does not have to infer it.

- No branch in this lane has a **CI verdict**. Everything above is local
  evidence, run in this container and named as such.
- **Fixed.** `liftCandidatesForReview` in
  `src/presentation/character-components.ts` stamped every lifted candidate with
  a `catalog_generation` of `-Infinity` when handed `frozenGenerations: []`. An
  empty array is truthy, so the published branch was taken, and `Math.max()` of
  nothing is `-Infinity`. It was carried as latent because every current caller
  passes a non-empty list — which is exactly how something becomes a bug report
  months later. An empty publication means nothing has been published, so the
  first unclaimed candidate now joins `CANDIDATE_REVIEW_GENERATION`, the same
  answer the unpublished path already gives. The regression case in
  `tests/pg-modular-intake.test.ts` fails against the unfixed source with
  `expected -Infinity to be 1`, and the file passes 9 of 9 with the fix;
  `morning23-catalog-continuity` and `production-release-boundary` pass 25 of 25
  beside it.
- `desktop/tests/hub-broker.test.mjs` fails in this container and needs
  `npm ci --prefix private-controller`, which CI does run. 151 of 152 desktop
  tests pass here.
- The controller locator fix is **not runtime-verified**: a cloud container has
  no Electron and cannot launch the packaged controller. It is a read of the
  shipped markup. Mac verification is registrar L13.
- **Corrected.** An earlier version of this list said seated bodies do not
  exist. They do, in quantity, and this is the second time the project has paid
  for that claim. Counted here: **63 distinct seated files under `art/`, of
  which 8 are garment tops cut for the pose and 55 are body or pose plates**,
  spanning men and women across average, fat, skinny and older builds. What is
  missing is registration, not art — `art/manifest/character_candidate_registry.json`
  holds 12 entries and **2 of them are seated**, both `approved` with QA still
  `pending` and `unreleased`, which is why nobody sits. The rendering lane has
  since admitted more of them and derived chairless bodies from four chair
  plates without adding a pixel. The figure-framing report's "no body resolves
  for `seated-at-desk` or `seated-guest-neutral`" is a statement about that
  registry, not about the bank. One genuine art gap does show up on inventory:
  **exactly one seated plate in the tree is three-quarter or turned**
  (`ocd_body_adult_fem_seated_guest_three_quarter_v1`), and every seated request
  is square to the camera while the club chair is turned. Registrar L12.
