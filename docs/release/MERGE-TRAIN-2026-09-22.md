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

1. **#333 — main is red on a test, and this is the fix.** New, and first
   because nothing else on this list can make main green. One test file. The
   full reasoning is under "The one real red, and who it belonged to" below;
   the short version is that two commits from the same sweep merged together
   and disagree with each other about a sentence. This is the only entry here
   that has no CI verdict of its own **on purpose** — starting its sixteen-job
   run would have taken the two slots main's own run is using.
2. **#304 — say what is behind the Politics entry.** The menu reads
   "Politics — Jobs and study" while behind it are your office, campaigns, the
   government where you live, parties and the budget. Most visible thing in the
   game's first two minutes, and the cheapest click here.
3. **#325 — prove the refusal a player reads arrives at the screen clean.** It
   carries no sentence fixes of its own; it is the gate. It needed #320 first,
   and **#320 is now merged**, so nothing blocks it. Its checks read red until
   it lands, which its own body explains.
4. **The documents — #330, #331, #294 — in any order, and safe to clear
   first.** #330 is the report updates, #331 the playtest walk at 324 lines
   under `docs/playtest/`, #294 the artbench-exchange write-up at 131 lines.
   None touches source or a shipped path. This is the part of the list you can
   clear without thinking about it.
5. **#292 — a life that has always lived somewhere has always lived in its
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
**#304**, **#325**, **#277**, **#283**, **#333**. Each of those needs its "Ready for
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

## What to say about main, and what not to say

**The sentence for the report is: main is merged and its unit suite is clean.
Not "main is green."** The difference is not pedantry and it is not modesty.
It is the difference between a claim that survives being checked and one that
does not, and anyone can check this one by opening the Actions tab.

Main's own browser suite is failing. Measured on `7fc33c85`, `browser (6, 8)`
returned **9 failed, 54 passed** in fourteen minutes:

- `pt3-scene-conversation.spec.ts` — four cases: the age-22 conversation as one
  bounded box, turning to a second classmate, and the same box at 1280x720 and
  at 1200x720.
- `pt3-school-scene.spec.ts:149` — two, the child and the teen corridor routes.
- `pt3-microfix-version.spec.ts:81` — two, the canonical version stamp at
  desktop and at narrow.
- `raster-readiness.spec.ts:340` — one, a decoded title staying visible while a
  resized response is held. It failed its retry as well.

Seven of the eight browser shards had not run when this was written, so the
real count is higher than nine.

**These are main's, not any pull request's.** Six of the nine cluster in the
PT3 scene and conversation specs, which suggests one cause rather than six.
Main's browser shards were already red earlier tonight at `273fd2b8`, so these
are very probably pre-existing — **but that is not proved here.** Proving it
means comparing against that earlier run by spec file and test title, never by
shard number, because the shards are assigned per run and shard 6 tonight is
not shard 6 an hour ago. The fix-main lane holds the `273fd2b8` measurement and
has the nine names.

**This is not a reason to hold the merge train.** A browser failure that
predates tonight is not evidence against a pull request whose own evidence is
good. It is a reason to say so plainly next to the claim rather than to leave
the claim unqualified. A merge held on someone else's old red buys nothing and
costs the morning.

## The one real red, and who it belonged to

Main's first genuine verdict of the night, on `7fc33c85` at 07:52Z, came back
with exactly one real failure. It is worth reading because of how ordinary it
is, and because of what made it hard to see coming.

`unit (2, 6)` failed on one test out of 1197 in that shard:
`src/presentation/campaign-projection.test.ts` line 125. The other shard that
had reported, and the `repository` job, were both green.

**Two commits from the same piece of work disagree, and they merged together.**
Both are inside #320, the change that stops a refusal telling a player where we
read the rule.

- `0c00146f` pinned the Kentucky rule pack's seat-count note to an exact
  sentence — "...no instrument fixing it was separately read". The reasoning
  was sound: the note stays in the pack even once the campaign screen stops
  reciting it, so something should still assert it is there.
- `71623c23`, a later pass in the same lane, rewrote that very note. Its own
  commit message says it found producers "by grep rather than by reading the
  call graph", and it updated the test suites under `src/simulation/` that the
  grep reached. The failing assertion lives under `src/presentation/`.

So the producer now says "The game does not know how many seats Kentucky's
chamber formally has, and it will not guess a number", and a test three
directories away was still demanding the retired sentence.

**The producer is right.** The fix is not to restore the old wording — that
would undo the thing #320 was for. #333 asserts the refusal rather than its
phrasing, and adds the check the sweep actually cares about: that the note
carries no "compiled research" or "numeric fallback" vocabulary. A comment
above it says why, so the next reader does not re-pin a sentence.

**What this cost, and what it would have cost.** It was caught at 07:52Z
because main finally had two job slots to itself and could run a unit shard
end to end. Every earlier attempt tonight was cancelled before a test body
executed. Had the freeze not happened, this would have reached nine o'clock
undetected, and the first thing anyone saw would have been a red main with no
obvious owner — a single assertion inside a merged, reviewed, deliberate
change.

**The transferable part is about the grep.** A sweep that finds its targets by
searching for a string will update every consumer that spells the string the
same way, and miss every consumer that spells it differently or lives where
the search did not run. That is not carelessness; it is the known limit of the
method. When a sweep rewrites a sentence that something else asserts, the
thing to run afterwards is the test suite, not another grep.

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

## A count in a pull request body has a shelf life

Three separate corrections tonight were the same mistake, which makes it a
pattern rather than three slips.

- #305 and #311 carried gate evidence measured at a head the pull request had
  since moved past.
- The Alaska release note's title described an outcome the measurement did not
  support.
- #277's body said `release:check` reported **zero** pending declarations. True
  when written. After merging main at `7fc33c85` it is **74**, because other
  lanes landed declarations overnight.

None of these was careless at the time. Each was measured, written down
accurately, and then went stale underneath its author, because **a branch that
merges its base is a moving tree and every number taken from it is a
measurement of one moment.**

The rule: **state the tree a count was measured on.** "6411 tests passed at
`9d7ec442`" survives contact with a base merge; "6411 tests pass" does not. The
same goes for a conflict status, a pending count, a file count, or a green
check.

And when one does move, **correct it visibly rather than overwriting it.** A
reader takes these sentences as claims about the world, so they should be able
to see which ones moved under us and why. Silently replacing seventy-four for
zero hides exactly the thing worth knowing.

## Twelve reds, none of them real, and why you still open the log

In one batch at 07:45Z this lane received fifteen GitHub notifications. Twelve
were failing `validate` checks across four pull requests. None was a defect.

Every one was the **cancelled-supersede**: `validate` is an aggregate job that
exits 1 unless every required job reports `success`, so a cancelled run
produces a failing gate on a commit where **nothing was tested**. All twelve
sat on heads whose runs this lane had itself cancelled minutes earlier during
the sweep. Our own action came back as twelve failures.

Eleven were on plainly stale heads. One was not: #278's was on `70fa13a7`,
that pull request's **current** head, where staleness explains nothing. So the
log was opened rather than the pattern assumed, and it read:

```
repository=cancelled
unit=cancelled
browser=cancelled
Aggregate validate succeeds only when every mandatory job succeeded.
```

**That is the whole argument for the rule.** Twelve notifications, each
indistinguishable from a real failure by its conclusion alone, and the only
thing that separates them from a genuine red is four lines of log. A webhook
delivers a conclusion, never a cause. Read the log before acting on any red —
and note that the shortcut of checking whether the head is stale would have
misfiled the one case that was not.

## A freeze on merges is not a freeze on capacity

The night's most general lesson, and the last one it taught, by catching us
all out after we thought we had understood it.

Main was frozen so that one run could report. The freeze stopped the thing
that **kills** a pending run — a merge entering its concurrency group. It said
nothing about the thing that **starves** one, which is any other run taking a
slot. And a push is not a merge: every lane, this one included, went on
pushing documents to its held pull requests, and each push started a fresh
fifteen-job run.

So at 07:41:54Z a run on this lane's own documents branch was executing
alongside main's, and **for about eight minutes main had one of the two slots
instead of both**, while everyone involved believed the freeze was protecting
it. The lane that had just spent seventy-two cancellations clearing main's path
was competing with it.

The rule that follows: **during a freeze, no pushes to any branch either.** A
documents push is not free. It buys a fifteen-job run nobody wants, out of a
budget of two.

This is the same shape as everything else recorded here — **a control that
addresses the mechanism you noticed and leaves alone the one you did not.**
`cancel-in-progress: false` addressed cancellation and not starvation. The
sweep addressed the queue and not the slots. The freeze addressed merges and
not pushes. Each was correct about its own mechanism and each left the
outcome exactly where it was.

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

**The contrast, once one job genuinely started.** At 07:41:00Z the `repository`
job began, and reading the same list then shows both shapes side by side:

|              | Allocated only      | Actually executing           |
| ------------ | ------------------- | ---------------------------- |
| `status`     | `queued`            | `in_progress`                |
| `started_at` | equals `created_at` | later than `created_at`      |
| `steps`      | absent              | present, with per-step times |

Two further tells beyond `status`, then: a genuinely started job has a
`started_at` that **differs** from its `created_at`, and it carries a `steps`
array. A job that has only been allocated has neither. The fourteen jobs still
waiting at that moment had `started_at` of 07:38:08Z and no `steps`; the one
running had 07:41:00Z and nine of them.

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
