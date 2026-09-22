# The merge train of 2026-09-22, and why some of it landed without a CI verdict

Written 2026-09-22 06:45Z, measured on `origin/main` between `445441a5` and
`7f2717a2`.

This document exists so the morning report does not have to infer why work
merged on local evidence. It is not a defence of the practice. It is the
arithmetic that made the alternative unavailable, stated plainly enough to
disagree with.

## The list to click through

Kept current as things land, so it can be read in thirty seconds rather than
assembled at the end. Last refreshed against `origin/main` at `e5cc5501`,
07:20Z. The sections below give the evidence behind each entry; this is the
index.

**Order matters in exactly one place.** Everything unnumbered below can be
clicked in any order. Where two entries are numbered, click them in that order.

1. **#320** — a refusal tells you the rule, not where we read it.
2. **#325** — proves the refusal arrives at the screen clean.

   #325 carries **no sentence fixes of its own**. It is the screen-path check,
   red on main and green on #320's head. Clicked first it would land a gate
   against code that is not there yet.

**Already in main — nothing to do.** Twenty-eight pull requests merged between
22:00Z and this refresh, read from `git log --merges` on `origin/main` at
`e5cc5501`: #275, #279, #280, #281, #284, #285, #286, #287, #290, #297, #299,
#300, #301, #302, #303, #306, #308, #309, #312, #315, #316, #317, #318, #319,
#321, #322, #323, #324. The ones that change what a player gets or what the project
can do: the retired Visual4 cast permanently deleted (#290), a trait system in
place of five hardwired traits (#280), the CI concurrency group (#303), the
prose gate repaired (#301), and the Alaska candidacy note retitled to what the
change actually did (#275).

**Waiting on a click.** #305, #311 and #320 from other lanes, all out of draft
against recent main — see "Ready to click, not merged" below for what each
rests on. #277, the 0.4.0 release, this lane's, at `9d7ec442` with main merged
in: format, lint, typecheck and `release:check` clean at that head, still draft
until its unit run reports.

**Still draft, wanted on the list.** #325, which follows #320 above.

**Still moving.** #282, #283, #292, #294, #295, #304 and #307 are drafts their
lanes are working.

**Not for tonight.** #278, the client line, is assembled at `70fa13a7` with
#276 inside it and has never had a verdict: its run has had zero jobs allocated
for over an hour. #296 sits on top of it. Everything numbered below #262
predates this night and is not part of this train.

## The sweep, and why it does not end on its own

The rounds shrink sharply as branches take main. Round one: **87 of 94**
cancelled runs were on commits that did not carry the concurrency group. Round
two, ninety minutes later: **9 of 19**. The group is doing most of the work.

But 6 of the 10 group-carrying superseded runs in round two were untouched —
`updated_at` never moved — so a residual remains, and an earlier claim that the
rounds are self-liquidating was stronger than the measurement supported.

**Hypothesis, not proved.** Two of those six were on this lane's branch at
`dbff3ad1` and `1a526f2b`, and both now report `prs=None` because the pull
requests they belonged to have merged. For a `pull_request` event the
concurrency key is that PR's own ref, and nothing will ever push to a closed
PR's ref again, so nothing supersedes its queued runs. If that holds, the sweep
is permanently needed for closed-PR orphans at small volume rather than being
something that ends. **What would confirm it:** check whether every untouched
group-carrying run belongs to a PR that has since closed. That has not been
done.

## The capacity, measured

The repository runs **two concurrent jobs, for the whole repository**. One
`validate.yml` run is **fifteen jobs**: one `repository` job, six `unit`
shards and eight `browser` shards.

Job durations, read from run `35674001475` (branch `claude/campaign-model`),
the only run tonight that was observed end to end:

| Job           | Observed duration             |
| ------------- | ----------------------------- |
| `repository`  | ~2 min                        |
| `unit` × 6    | 4 to 10 min each, ~36 total   |
| `browser` × 8 | 21 to 59 min each, ~326 total |

That is roughly **364 job-minutes for one run**. At two concurrent slots, one
validate run needs about **three hours of wall clock with the entire
repository to itself**. It never had the repository to itself: that run was
created at 00:57:48Z and its last job was still going at 05:50Z, just under
five hours later.

## The merge rate, measured

`git log --merges` on `origin/main`: **23 merges between 05:30Z and 06:41Z**.
That is one merge to the base branch every **3.1 minutes**.

## The consequence

A branch's base changes roughly **sixty times** during a single run of its own
validation. Every base merge conflicts any branch that touched `src/`, because
`docs/prose-inventory/` is generated output that is committed, so every such
branch regenerates it and collides there. Resolving means pushing, and since
the concurrency group landed on `main` at 05:41Z (PR #303), a push **cancels
the run in flight** and sends the branch back to the end of a queue it will
not reach the front of before the next base merge.

So the state "green on CI and current with main" is not reachable tonight. Not
difficult — unreachable. Waiting for it is not a more careful strategy than not
waiting for it; it is the same strategy with the work left undone.

**This is a capacity problem, not a discipline problem.** No lane can solve it
by being more careful, and every lane merging tonight is making this same call
whether or not it says so. The fix is more concurrent jobs, a smaller required
gate, or a merge queue — none of which is a thing to decide at six in the
morning without the owner.

The concurrency group is still right. It stopped the queue growing without
bound — 105 runs stood queued at 05:42Z, 74 of them superseded, and a further
~94 by 06:38Z. But it makes this particular problem sharper, because a
superseding push now actively kills the run that was about to report.

## A cancelled run leaves a red check behind

Worth knowing before reading any red on this repository tonight. A
`validate.yml` run is fifteen matrix jobs plus a sixteenth aggregation job,
`validate`, whose step "Require every mandatory job" fails if any matrix job
did not succeed. **Cancelling a run therefore produces a `validate` job whose
conclusion is `failure`**, on a run where nothing was actually tested.

Sampled at 06:45Z on run `35689053251` (`claude/project-thread-cg1u98`): all
fifteen matrix jobs `cancelled`, and the `validate` gate `failure`.

So across the ~130 runs cancelled tonight there is a corresponding crop of red
`validate` checks that assert nothing. Read the matrix jobs, not the gate: if
they are `cancelled` rather than `failure`, the run was superseded and tested
nothing. A cancelled job is not a failure, and neither is the gate that
aggregates it.

## Where the line was drawn

**Documents merged on local evidence. Code did not.**

A documents-only change has no runtime surface for CI to have an opinion about
that `prettier`, `release:check` and the queue's own validator do not already
cover. A code change does. When it is unclear which side something is on, it
is code.

That line held. It is also where a permission guardrail independently stopped
this session: an attempt to proceed toward merging a code change was refused
and named as merging without review. The owner's go-ahead, given in chat before
going to bed, reaches the session but not the permission classifier — those are
different things, and the second one is the one that governs the action.

## Merged without a CI verdict

- **#297 — the priority audit's questions and findings.** Documents only: ten
  research request records, the rendered open-questions document, the findings
  file and its index entry. Verified at `e153b361` on main `7b2dbced`:
  `prettier` clean over the whole tree, `release:check` OK against the
  committed range, and `research:request check` reporting every question
  complete enough to act on. Merged as `4be30238`.

## Ready to click, not merged

Out of draft against recent main. Each says what it rests on. Heads below are
read from the pull request listing at 07:20Z; the gate evidence under each is
what its own lane reported at the head named in its entry, which for #305 and
#311 is **older than the head the pull request now carries**.

- **#305 — the Congress faction view.** Branch
  `claude/congress-factions-cg1u98`, head `615c552f`, synced to main
  `4be30238`. **Contains code.** Verified locally at that head: `typecheck`,
  `lint`, `format` over the whole tree, `corpus:prose` with no further diff,
  and `release:check` all clean. Earlier on the branch: 41 vitest tests across
  four files, fourteen of them new, and the Playwright case
  `Politics hub, government and person card` passing at 1440x900 and 1024x768
  with both captures reviewed by eye. The unit tests were **not** re-run at
  `615c552f` — the guardrail refused that command — so the newest evidence on
  this head is static analysis plus the merge itself, which touched only
  generated prose inventory. The pull request now reads `ba980755`; the
  evidence above is at `615c552f`.
- **#311 — art requests for newspaper, chart and interface surfaces.** Branch
  `claude/art-requests-non-background-cg1u98`, head `9907f11b`. **Contains
  code**: it widens `AssetTargetClass` and scopes an intake width floor.
  Reported clean on `typecheck`, `lint`, `format`, `release:check`,
  `validate:art` and `corpus:prose`, with 114 tests passing across six
  asset-related files. Its base is main `7da3d6c5` and main has moved since, so
  it will need a base merge before it can go in. The pull request now reads
  `edde21c9`; the evidence above is at `9907f11b`.

- **#320 — a refusal tells you the rule, not where we read it.** Branch
  `claude/no-citations-on-player-surfaces`, head `ec62a2e7`, base main
  `93ed2fa5`. Removes source and provenance references from the text a player
  reads on a refusal, which is lamontae's standing rule for player-facing
  surfaces. Its lane owns the evidence. **Click this before #325.**
- **#325 — prove the refusal arrives at the screen clean.** Branch
  `claude/candidacy-refusal-screen-sweep`, head `a8fe8671`, base main
  `0cf12d00`, **still draft at 07:20Z**. It is a screen-path check and changes
  no sentences: red on main, green on #320's head. **Click it after #320, not
  before.**

## What a reader should take from this

The three hours of arithmetic above is the most portable thing measured
tonight. It is not about these three pull requests. Until the capacity changes,
every branch in this repository is in the same position, and a report that
shows work landing "without CI" is describing the repository's throughput, not
a lane's carelessness.
