# The merge train of 2026-09-22, and why some of it landed without a CI verdict

Written 2026-09-22 06:45Z, measured on `origin/main` between `445441a5` and
`7f2717a2`.

This document exists so the morning report does not have to infer why work
merged on local evidence. It is not a defence of the practice. It is the
arithmetic that made the alternative unavailable, stated plainly enough to
disagree with.

## The list to click through

Refreshed against `origin/main` at `7fc33c85`, 07:42Z. The sections below give
the evidence behind each entry; this is the index.

**The headline, which you can check yourself before you finish your coffee.**
Three things are wrong in the first two minutes of play, and all three are
sentences rather than systems. Four lanes reached that same conclusion tonight
from different directions — a playtest walk, the capacity arithmetic below, the
research audit and the citation sweep. It is the cheapest good news in the
report: the first things you will notice are also the fastest to fix.

**Click these in this order.**

1. **#304 — say what is behind the Politics entry.** The menu reads
   "Politics — Jobs and study" while behind it are your office, campaigns, the
   government where you live, parties and the budget. Most visible thing in the
   game's first two minutes, and the cheapest click here.
2. **#325 — prove the refusal a player reads arrives at the screen clean.** It
   carries no sentence fixes of its own; it is the gate. It needed #320 first,
   and **#320 is now merged**, so nothing blocks it. Its checks read red until
   it lands, which its own body explains.
3. **The documents — #330, #331, #294 — in any order, and safe to clear
   first.** #330 is the report updates, #331 the playtest walk at 324 lines
   under `docs/playtest/`, #294 the artbench-exchange write-up at 131 lines.
   None touches source or a shipped path. This is the part of the list you can
   clear without thinking about it.
4. **#292 — a life that has always lived somewhere has always lived in its
   district too**, and **#283 — every state has a legislature, the District
   governs itself, and read law beats the draw.** Both the nationwide lane's,
   both with their dependencies and their unattributed failures named in their
   own bodies.

Then **#277**, the 0.4.0 release, this lane's, whenever the freeze lifts. Its
full unit suite passed at `9d7ec442`: 6411 tests, 52 skipped, one failure —
a directory we make unwritable stays writable for root in a container, which is
red on main too and is not the release's.

**#320 → #325 is the only ordered pair on the whole list, and #320 is done.**
The numbering above is priority, not dependency: it is the order that gets the
most visible thing fixed first.

**One thing to know before you start clicking.** GitHub will not let you merge
a pull request that is still a draft, and several of the above are. Ready to
merge right now: **#292**, **#305**, **#311**. Still draft at this refresh:
**#304**, **#325**, **#277**, **#283**. Each of those needs its "Ready for
review" button pressed first — one extra click, not a problem, but worth
knowing rather than discovering.

**Already in main — nothing to do.** Thirty-four pull requests merged between
22:00Z and this refresh, read from `git log` on `origin/main` at `7fc33c85`:
#275, #279, #280, #281, #282, #284, #285, #286, #287, #290, #297, #299, #300,
#301, #302, #303, #306, #308, #309, #312, #315, #316, #317, #318, #319, #320,
#321, #322, #323, #324, #326, #327, #328, #329. The ones that change what a
player gets or what the project can do: a refusal now tells you the rule
instead of where we read it (#320), the retired Visual4 cast permanently
deleted (#290), a trait system in place of five hardwired traits (#280),
multi-subject legislation inside the existing compiler (#282), the CI
concurrency group (#303) and the prose gate repaired (#301).

**Still moving.** #293, #294, #295, #305, #307 and #311 are their lanes' to
finish.

**Not for tonight.** #278, the client line, is assembled at `70fa13a7` with
#276 inside it and has never had a verdict. #296 sits on top of it. Everything
numbered below #262 predates this night and is not part of this train.

**Not in any pull request, and it should be.** The playtest walk found a
world-event line pinned to the top of six different screens. Nobody had
reported it and nothing fixes it tonight. It is a real bug and it belongs in
the report rather than on this list.

## Why main could not get a verdict, which is not what we thought

This is the night's most reusable finding and it is not about capacity.

`validate.yml` sets `cancel-in-progress` to false when the ref is `main`, and
the comment above it explains why: main's run is the base verdict every lane
reads to tell an inherited failure from a caused one. That reasoning is sound
and the setting does what it says.

**It protects nothing, because main's runs never start.** `cancel-in-progress`
governs whether a run that is _already executing_ survives a newer one entering
its concurrency group. A run still waiting for a slot is not executing, and it
is cancelled outright. Every merge to main therefore destroyed its
predecessor's pending run before that run had allocated a single job.

Measured directly, three in a row, 2026-09-22:

| Main commit | Run created | Jobs allocated | Cancelled          |
| ----------- | ----------- | -------------- | ------------------ |
| `fececf25`  | 07:26:57Z   | 0              | 07:30:21Z, by #329 |
| `02913aa9`  | 07:30:19Z   | 0              | 07:30:32Z, by #320 |
| `7fc33c85`  | 07:30:31Z   | 0 at 07:35Z    | still alive        |

So main has not lacked a verdict because its runs were slow. It has lacked one
because each merge killed the run before it. The protection was written for a
repository whose runs start promptly, and this one's do not — which means the
freeze is not a nicety. It is the only condition under which main can ever
report at all.

## `started_at` is not a start

A field that reads like progress and is not. It is the sixth reading trap this
night produced and the likeliest to catch the next person, because it is the
one you fall for at a glance rather than by reasoning badly.

At 07:38:08Z main's run allocated all fifteen jobs. Reading them back five
minutes later, every job carried:

```
"status": "queued",
"created_at": "2026-09-22T07:38:08Z",
"started_at": "2026-09-22T07:38:08Z"
```

`started_at` is set, identical to `created_at`, on a job whose own `status` is
`queued`. It records when the job was **allocated**, not when it began
executing. The run's own `status` read `queued` at the same moment. Nothing had
run a step.

So "fifteen jobs, all with a `started_at`" and "fifteen jobs running" look the
same and are not, and a glance at a job list will tell you work is under way
when none is. **Read `status` — `queued`, `in_progress`, `completed`. Never
infer execution from a timestamp.**

This mattered immediately rather than academically. The question on the table
was whether the freeze could be lifted, and the argument for lifting it was
that a run which is already executing is protected from the next merge by
`cancel-in-progress: false`. The jobs were not executing, so the run was not in
the protected state, and the premise was false at the moment it was about to be
relied on.

**And the protection itself is an inference, not an observation.** What was
measured is why three _pending_ main runs died. No main run tonight ever
reached the executing state, so nothing tested whether a merge would spare one.
That is the difference between a fact and a plan, and the two should not be
written down in the same words. See the section above on why main could not get
a verdict for the half that is measured.

## What one verdict on main cost, exactly

At 07:34Z the decision was taken to cancel every queued run standing ahead of
main's, and at 07:38Z main's run allocated all fifteen of its jobs for the
first time tonight. It had been created at 07:30:31Z and had sat at zero.

**Seventy-two runs were cancelled to buy it**, across thirty-two branches. Two
had already completed. The branches are named here rather than counted, because
a lane that finds a missing verdict and diagnoses it from scratch is the exact
waste this document exists to remove:

`art-bench-requests-sbi892`, `art-requests-non-background-cg1u98`,
`bill-names-its-proposition`, `candidacy-refusal-screen-sweep`,
`character-rendering-triage-19kvvz`, `ci-concurrency-on-main`,
`compliance-prose-citations`, `congress-factions-cg1u98`, `current-art-source`,
`delete-retired-visual4`, `district-residence-clock`,
`findings-event-bank-correction`, `findings-writeup-hf3e0n`, `fix-main-w9xyzd`,
`hardcoded-content-audit-hf3e0n`, `modular-legislation-f1m37h`,
`nationwide-government-mqcw7p`, `news-headline-voice-hf3e0n`,
`no-citations-on-player-surfaces`, `people-and-life-4qpuwb`, `playtest-cwpd3o`,
`playtest-party-screen-says-so`, `playtest-politics-label`,
`player-facing-text-client`, `policy-catalogue-as-packs`,
`priority-audit-report-cg1u98`, `project-thread-4y594d`, `project-thread-56hmrw`,
`project-thread-cg1u98`, `project-thread-tnj1os`, `project-thread-w3zsrg`,
`prose-gate-reanchor-hf3e0n`, `release-0-3-0`, `research-admission-hf3e0n`,
`veto-assertion-hardening-hf3e0n`, `veto-override-readings-hf3e0n`,
`codex/build-6146df3-source`, `codex/client-content-delivery`.

**This is the capacity argument, not an illustration of it.** At two concurrent
jobs a verdict on main and verdicts on the branches were not competing
priorities, they were mutually exclusive. One run is fifteen jobs; the queue
held seventy-two. There was never an arrangement in which both happened, and
choosing was the only available act.

It was affordable only because of something decided hours earlier: tonight's
standard is gates run and named on an exact head, so nothing on the click list
was waiting on a branch verdict to become mergeable. A branch verdict arriving
at half past eight would have described a frozen branch that a human was going
to merge anyway. The verdict on main's head was the one thing asked for that we
did not have, and the only one whose value expired at nine.

Two runs were deliberately not cancelled: main's own `release.yml` run created
at 07:10Z, and main's superseded `validate.yml` run from 05:41Z, both left
alone under "do not cancel main's". The second of those is superseded and the
standing sweep rule would ordinarily take it; it was kept because the
instruction was about main and the cost of being wrong ran the wrong way.

## The sweep read only half the problem

A second procedure error, measured the same hour, and the one piece of
tonight's capacity story that is our mistake rather than a constraint.

The sweep grouped runs with `status: queued` and cancelled the superseded ones.
That is correct as far as it goes and it cannot free a slot, because a slot is
by definition held by something that is **not** queued. At 07:30Z both of the
repository's two slots were held by `in_progress` runs, and both were
superseded: `claude/release-0-3-0` at `a900c987` with the branch on `9d7ec442`,
and `claude/fix-main-w9xyzd` at `29b67bf1` with the branch on `3213895f`.
Neither appeared in any queued listing.

A superseded run that is already executing is strictly worse than a superseded
one waiting, because it is consuming the capacity rather than queuing for it.
**The sweep must group `queued` and `in_progress` together**, keep the newest
per `(ref, workflow)` across both, and cancel the rest. The test is unchanged:
compare each run's `head_sha` against the branch's current head, by fetch
rather than from memory. A run on its branch's current head is live work and is
left alone.

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
