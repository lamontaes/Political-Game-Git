# The merge train of 2026-09-22, and why some of it landed without a CI verdict

Begun 2026-09-22 06:45Z between `445441a5` and `7f2717a2`; **brought to its
final state at 08:40Z against `origin/main` at `af6b379b`**, after the train
ran.

This document exists so the morning report does not have to infer why work
merged on local evidence. It is not a defence of the practice. It is the
arithmetic that made the alternative unavailable, stated plainly enough to
disagree with.

**It also carries its own corrections.** Four claims in here were wrong when
first written and are struck through or retracted in place rather than edited
out — the repository's job-slot count, what a merge does to main's run, and,
twice, a sentence about main's unit suite that outran what had been measured.
Each retraction says whose claim it was. A reader who wants to know how far to
trust the rest should read those first: they are the evidence that the
standard in **D-086** was applied to this document too, and not only
recommended in it.

## The list to click through

> **The do-not-merge on #283 is LIFTED, as of 10:30Z.** An earlier version of
> this banner said not to click it. That warning was about `eb80bbc1`, which
> is no longer the head. The branch pushed at last and the break is gone:
> merging **`54f9cbfe`** with `main` at `c659f256` typechecks clean, verified
> here rather than taken on report. Its entry below says what it needs now.

**Final state, refreshed against `origin/main` at `af6b379b`, 08:40Z.** The
train has run. This section is what is left, not what was planned — where the
two differ, the difference is stated rather than tidied away.

**The headline, which you can check yourself before you finish your coffee.**
Three things are wrong in the first two minutes of play, and all three are
sentences rather than systems. Four lanes reached that conclusion from
different directions — a playtest walk, the capacity arithmetic below, the
research audit and the citation sweep. It is the cheapest good news in the
report: the first things you will notice are also the fastest to fix.

### Already merged — nothing to do

**#333** the seat-count test, **#331** the playtest walk, **#330** the audit
report findings, **#294** how a batch reaches the Art Bench, **#325** the
refusal-screen control, plus #320, #334, #335 and #337 from other lanes.

Each was merged on evidence named at an exact head rather than on a CI
verdict, which is the standard recorded as **D-086** in the decision log. Every
merge commit says which commands were run, on which commit, and what was not
run.

### Still a click, and why

- **#277 — the 0.4.0 release.** This lane's, out of draft, current with main,
  and **the only branch tonight with a real CI run going** rather than a
  cancelled one. Everything else about it is local evidence: its full unit
  suite passed at `9d7ec442` with 6411 tests and one failure, a directory we
  make unwritable staying writable for root in a container, which is red on
  main too and is not the release's.
- **#304 — say what is behind the Politics entry.** The most visible thing in
  the game's first two minutes, and it is **still a draft** its lane last
  touched at 06:51Z, on a base main has moved a long way past. It also adds a
  Playwright spec to a browser suite that is already red. Worth doing; not
  worth another lane undrafting and merging on their behalf.
- **#292 — a life that has always lived somewhere has always lived in its
  district too.** **Do not merge this yet, and the reason is specific.** Its
  wording changes are measured and change no jurisdiction's answer. But
  `tests/e2e/support/jurisdictions.ts` line 174 on current main still asserts
  the exact sentence this branch removes — "The game has not recorded when this
  character came to live here, so it will not guess whether they qualify" —
  because that fixture asserts the _sentence_, not the verdict. Checked on
  `af6b379b` rather than taken from the hold note. It needs the fix-main lane's
  fixture patch first.
- **#283 — the do-not-merge is lifted; it is a draft until its checks
  report.** Every state has a legislature and the District governs itself.
  The branch is now on GitHub at **`54f9cbfe`**, and the typecheck break that
  made an earlier version of this entry say "do not click it" is fixed in
  that head.

  **Verified rather than relayed, at 10:30Z**, to the same standard the
  warning was: merge `origin/main` at `c659f256` into `54f9cbfe` and
  `npm run typecheck` is clean. Only `docs/prose-inventory/README.md` and
  `coverage-report.md` conflict, both generated; there is no source conflict
  at all now, where the earlier head also conflicted in
  `office-qualification-rules.ts`.

  **How the push gate opened is not established.** The nationwide lane does
  not know, this lane did not open it, and the coordinator session states it
  did not either. lamontae has sent nothing since 05:35Z. So the record says
  it is unknown, rather than letting "a session approved it" become the story
  by default.

  **The near miss is worth keeping.** For roughly an hour the commit reachable
  from this pull request's merge button would have broken `main`'s typecheck,
  under standing authority to merge, and nothing stood between it and a merge
  except a reproduction and a banner. It was caught by merging the two heads
  and running the gate — not by reading the diff, which shows no conflict, and
  not by reading the lane's own report, which was green on a commit nobody
  else could see. That is D-087 earning its place the same night it was
  written.

- **#292 — ready, but NOT clickable yet: it conflicts with main.** The
  district-residence clock. Head `c7c19744`, out of draft. GitHub reports
  `mergeable_state: dirty` at 10:27Z, so the merge button is not available
  until someone merges `main` into it. Stated because it reached this document
  described as clickable as soon as its checks report, and a base merge is
  needed first.

- **#305 — the Congress faction view, held by its own lane on purpose.** Head
  `e1020cd6`, out of draft. Its lane declined to merge it and was right to:
  the repository's own guidance puts consequential code with LAND, and there
  is no CI run on the head that would actually be merged. Its one-line
  justification, in its lane's words: the unit suite is green on its tree, and
  every browser failure is attributed by name against the case list. So it is
  a click for a human, not an omission.

- **#305** and **#311** were reported ready earlier on heads that have since
  moved. Their evidence is older than the head each now carries, so they are
  clicks rather than merges.

### What did not land, and why, in one line each

- The browser suite is red on main and was before tonight — nine cases, all
  reproduced at `445441a5`.
- Main's unit suite finally reported: five of six shards, four green and one
  red, which is the failure #333 already fixed. The sixth was still running
  at 09:00Z. This replaces the earlier line that said four shards never ran.
- Two lanes are deliberately not merging: the player-facing-text lane reads
  `AGENTS.md` as putting merge authority with LAND, which is a defensible
  reading and was not overridden.

**A draft cannot be merged.** #304 and #283 are drafts; each needs its "Ready
for review" button pressed before the merge button appears. For #283 that is
a guardrail rather than an obstacle — read its entry above before touching it.

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

## An instrument that fails by doing nothing is indistinguishable from a pass

**If this report carries one line, make it this one.** Recorded as D-087's
companion, **D-088**, in `docs/decisions/DECISION-LOG.md`.

> A measurement that can fail by measuring nothing will report that as a pass.
> Every instrument needs a check that it engaged at all.

It appeared **six times tonight, across four lanes**, in tools that have
nothing to do with each other, and each time it produced a confident report of
agreement where nothing had been observed. It is also the common root of most
of tonight's retractions, which is the reason it leads rather than sits sixth
in a list.

1. **A Playwright helper skipped a missing control.** `openPoliticsHub` does a
   bare `continue` when a sub-control is not on the page, so a walk visiting
   three destinations sat on one page three times and read the same text three
   times. It was written down as three menu entries opening the same screen —
   a defect that did not exist.
2. **A sweep's fixture reached no citation.** The first check written for the
   statute-citation defect passed against an unfixed file, because its Kentucky
   fixture never reached a rule that had a citation in it.
3. **A vitest path did not exist.** Three test files were named on a command
   line; two existed. Vitest ran the two and said nothing about the third, and
   the passing count read as though it covered all three.
4. **A grep-driven sweep updated only what it could spell.** It rewrote a
   sentence and updated every consumer that spelled it the same way, silently
   missing one that lived elsewhere.
5. **An invariant test called one producer down one branch.**
   `src/simulation/no-citations-on-player-surfaces.test.ts:211` carries its own
   account: the first version called `resolveCapability` with `officeKey: null`
   only, and the resolver takes a whole branch, with its own sentences, only
   when it **is** given an office key. "So the producer was missed once by not
   being called at all, and missed again by being called down one path."
   Widening a net is not the same as widening it in the right dimension.
6. **A walk pressed a control that was not on the surface it had reached.**
   `tests/e2e/civil-authority-normal-route.spec.ts:33` records it: a loop
   pressed `pass-day` sixty times on the Calendar, which does not draw that
   control — the Calendar's own time controls are `shell-pass-day` and
   `shell-pass-week`. The arithmetic was wrong underneath it as well, and
   would have bitten the moment the control was fixed: the life starts
   2026-01-05 and the observation is 2026-09-06, two hundred and forty-four
   days, so sixty single days could never have arrived however reliably they
   were pressed. **A walk that measures zero weeks should fail loudly, not
   agree quietly.**

**A seventh instance, and it is the sharpest one, because the diagnosis is
what failed.** Three lanes in ninety minutes looked at the same time control,
and each wrote down a different confident reason a locator could not find it.
None of the three was checked against the file until the fourth reading.

- "Its `Skip to Monday…` text is screen-reader-only." Vague, and it points at
  the wrong fix.
- "The string does not exist." **Mine, and false.** I ran
  `git grep "Skip to Monday"`, got nothing, and believed it. The string is
  _composed_ — `skipToLabel` at `src/presentation/time-target-label.ts:18`
  returns `` `Skip to ${describeTimeTarget(moment)}` `` — so a literal search
  for it finds nothing however many times it reaches the screen. **That is
  instance 4 of this very list, committed while writing the list.**
- The measured reason: on `main` at `b8f8702f` the string is on that button
  three ways — the `title` attribute at `src/player/ShellNav.tsx:515`, an
  `sr-only` span at `:542`, and the `aria-describedby` at `:514` that points
  at it. The button's text content is `Week` with an `aria-hidden` chevron, so
  its accessible **name** is "Week". **`aria-describedby` contributes to an
  element's accessible _description_, not its accessible _name_**, and neither
  does `title` when a name is already present. So
  `getByRole("button", { name: /Skip to/ })` cannot match it however visible
  the string is. The fix is the `data-testid` or the real accessible name.

  (On `claude/player-facing-text-client` at `f010bff7` the same string reaches
  the screen through a `pg-nav-days-target` hint with the prefix stripped
  rather than through the `sr-only` span. Different tree, same conclusion.)

**The clause that earns its place:** _an instrument that reports nothing
invites a guessed explanation, and the guess inherits the same false
confidence._ The two wrong diagnoses pointed at opposite fixes — one says add
a string that is already there twice, the other says reveal something that is
already a tooltip — and neither leads to the locator. A rule about instruments
that measure nothing is best served by an instance where the **diagnosis**
failed the same way.

**Why this family is worth a name.** A tool that fails loudly costs one cycle.
A tool that fails by doing nothing costs a wrong belief, and the wrong belief
is _indistinguishable from the true one_ at the point of reading. Every one of
these produced a green result, a matching string, or a plausible finding.

**The defence is asserting the reach before asserting the result.** The sweep
that was fixed now checks a non-empty block count before it checks any wording.
That is the general shape: make the instrument prove it arrived somewhere
before you believe what it says about the place.

**An assertion that cannot fail is worse than no assertion**, because it
manufactures confidence rather than merely withholding it. Every one of these
six produced a claim, and every one of those claims then travelled.

**The mirror image, from the research-audit lane, and it is the same root.**
Checking whether a browser failure was new, its first attempt printed
**`1 failed` — and the browser had never started.** A harness that never ran a
test body printed the line a genuine assertion failure prints. So beside "an
instrument that fails by measuring nothing reports it as a pass" there is:
**an instrument that fails to start can report it as a failure.** That one
manufactures a defect rather than hiding one, and between them the two explain
why one night produced both phantom findings and phantom clean results. The
defence is identical either way: the instrument must show it engaged before
its verdict means anything.

**And a substantive finding that qualifies several of tonight's claims,
including this lane's own.** The failure that lane was chasing **passes when
run on its own, on current `main` and on the branch alike, and fails only when
the whole shard runs together.** That is the third independent sighting of
test interdependence, after the nationwide lane's two tests that answer
differently depending on what runs alongside them. Three sightings is enough
to state plainly rather than as a caveat: **some of this suite's results
depend on what else is running.**

It weakens every same-tree attribution made tonight **in both directions** —
this lane's nine-for-nine match between the release's `browser (6, 8)` and
main's, and the seventy-one-of-seventy-two match another lane reported. Those
matches are still the best available evidence and they are no longer clean
proof, and it is the likeliest single explanation for the timeout family in
the case list. It also makes "run it again on its own" a **real diagnostic
here rather than a flake excuse**: the difference is that it produces a
specific reportable fact — passes alone, fails in company — instead of a
second opinion.

## The release is parked, on purpose, and here is the trade

A branch that re-merges `main` and regenerates `docs/prose-inventory/coverage-report.md`
on every move of the base **can never hold still long enough to be verified**.
Each push supersedes its own pending run, so the release had a run and lost it
three times without one ever starting. Keeping the branch perpetually current
had become the thing preventing the verdict we made an exception to obtain.

**So it is parked at its current head and left to run.** It will be re-merged
only if GitHub reports it un-mergeable.

**The trade, stated so nobody has to infer it:** a verdict that ran on a head
one or two `main` commits behind is a better artefact than a perpetually
current branch with no verdict at all. When the verdict arrives, the head it
ran on is named beside it, and that head is the claim — not `main` as it
stands when someone reads the report.

**The trade paid off, and the verdict is partial.** Run
[35706104688](https://github.com/lamontaes/Political-Game-Git/actions/runs/35706104688)
on **`eb0abea1`** was created 08:40Z, allocated its fifteen jobs at 09:01Z and
started executing at 09:37Z — **fifty-seven minutes queued.** It survived
because nothing pushed to the branch in that hour. Every earlier attempt died
pending because something did.

Shard by shard, read at 10:20Z, on `eb0abea1`:

| Job              | Result                      | When                     |
| ---------------- | --------------------------- | ------------------------ |
| `unit (5, 6)`    | **green**                   | 09:38:32–09:43:48, 5m16s |
| `browser (6, 8)` | **red**, 9 failed 54 passed | 09:46:55–10:04:29, 17.6m |
| `browser (4, 8)` | running                     | since 10:06:06           |
| `browser (2, 8)` | running                     | since 10:15:32           |
| the other eleven | **still queued**            | —                        |

**Two of fifteen have reported.** `repository`, five of the six unit shards and
five browser shards had not started at 10:20Z.

**The one red is main's, established by title rather than by shard number.**
`browser (6, 8)` failed with exactly the nine spec-and-title pairs main's own
`browser (6, 8)` failed at `7fc33c85`, and with the same 9-failed / 54-passed
split. The fix-main lane independently reproduced all nine at `445441a5` the
same way. The release adds nothing to them. It was not re-run: an identical
match against the base branch is stronger than a second run of the same shard,
and a re-run would cost 17.6 minutes out of the queue the other eleven shards
are still sitting in. Recorded on the pull request as
[a comment](https://github.com/lamontaes/Political-Game-Git/pull/277#issuecomment-5774630845).

**Two of those nine were this lane's and are now fixed on `main` as #351** —
and they were not what they were filed as. `pt3-microfix-version.spec.ts:81`
was timing out on `play-screen` two steps before its first assertion about the
version stamp, because `questionnaire-finish` reads **"Review appearance"** and
returns the player to the creator's appearance step with Begin still to press.
The test id had outlived the button's meaning. Reproduced first, then fixed:
both cases failed and the file's third case passed, which is precisely the
split CI reported here; after the change all three pass in 56.2s. The fix went
to `main` rather than to this branch, because pushing here would have killed
the run above.

**What this means for the morning report.** At the rate the queue is moving —
eight browser shards at 18 to 40 minutes each against roughly three slots — the
release will not have a complete verdict by nine o'clock. **The honest sentence
is that the 0.4.0 release has one green unit shard and one inherited red
browser shard on `eb0abea1`, and thirteen jobs outstanding.** Not "the release
is verified", and not "the release is failing" either.

## Withdrawn: the three-menu-destinations claim, which is in a merge commit

**If you came here from git history, read this before believing a commit
message you passed on the way.**

A claim circulated last night that Budget, Tax and Transit were three shell
menu destinations all opening the same page. **It is withdrawn.** It is not in
this document's own text, but it _is_ in **#335's merge commit message**, which
is on `main` and cannot be edited without rewriting published history. So the
retraction lives here, where a reader following the train is likely to land.

**What was actually happening.** Settled in the browser on `main` at
`0e0cebe8`: the shell holds one Politics entry, and `nav-politics-budget`,
`nav-politics-tax` and `nav-politics-transit` appear **zero times** on the
rendered page. They are keys in `POLITICS_HUB` in
`tests/e2e/support/creator.ts`, and `openPoliticsHub` does a bare `continue`
when the sub-control does not exist. Three helper destinations therefore left
the walk sitting on the same page three times, and the identical text was one
screen read three times rather than three screens reading alike.

**The corrected sentence belongs in the good column.** Transit and tax are
their own surfaces with their own frames, and a life that cannot use them is
told so in words, at `transit-withheld` and `tax-withheld`, because
`politicsIssueAccess` holds that the budget is for everyone while transit and
tax are an office's tools. That is the fail-soft rule working exactly as it was
asked to: not refused, not silent, told why.

**The rule, which belongs beside D-086.** _A test helper route is not a player
route._ Confirm a destination exists on the rendered page before writing down a
navigation defect. A helper that skips silently when a control is missing will
report agreement between screens that were never visited, and the failure looks
like a finding rather than like an error.

Retracted in the tree as #338 at `d6090983`.

## A proposal: the unit suite and the browser suite should not be one run

**Named here so it can be decided rather than rediscovered.** This is not
tonight's work and nothing below was done.

Tonight's sharpest operational finding is not that the repository has three
job slots instead of two. It is what happened to the unit shards: four of
them, each about four minutes of work, sat queued for over forty minutes
behind browser shards that run 21 to 59 minutes each — in the _same run_,
competing for the same slots, with no way to prioritise between them. Main
ended the night with two of six unit shards reported.

**The shape is the problem.** `validate.yml` is one run of fifteen jobs mixing
two suites with completely different time constants. A run cannot report until
all of it reports, so the fast, cheap, high-signal half is held hostage by the
slow half every single time.

**The proposal: split them into two workflows.**

- A unit workflow — `repository` plus the six unit shards, roughly 38
  job-minutes. At three slots that is a verdict in well under fifteen minutes,
  on every push, every time.
- A browser workflow — the eight browser shards, roughly 326 job-minutes,
  taking as long as it takes.

**What it would have bought tonight.** Every branch on the click list, and
main itself, would have had a real unit verdict hours ago. The entire argument
in this document about merging on local evidence exists because no verdict was
obtainable; a unit-only verdict was obtainable the whole time and was simply
bundled with one that was not.

**What it costs.** The required-check configuration changes, and someone must
decide whether the browser workflow gates merging or only reports. That is a
product decision about how much the browser suite is trusted, which is exactly
why it is written down here rather than done.

## When a wrong claim travels through memory instead of a message

Four claims tonight outran their measurement. Two of those four travelled
through project memory rather than through a conversation, and that difference
is worth naming on its own.

The most recent: "main is merged and its unit suite is clean" was written into
memory at 08:17Z as the sentence for the morning report, when two of six unit
shards had reported. Any lane reading memory afterwards would have repeated it
in good faith, with no way to see that it stood on a third of the evidence it
implied.

**Memory carries further than a thread and corrects slower.** A wrong sentence
in a conversation reaches the people in that conversation and dies when the
conversation does. A wrong sentence in memory reaches every lane that starts
afterwards, arrives stripped of the context that would let a reader judge it,
and stays until someone notices and goes back for it.

**So the rule is about what may be written there, not about being careful.** A
claim goes into memory with what was measured and when, or it goes in as the
measurement rather than as the conclusion. "Two of six unit shards reported
green at 08:09Z" survives being wrong later. "The unit suite is clean" does
not, because there is nothing in it to check.

## The correction to our own finding: pending dies, executing does not

This document said earlier that every merge to main destroys its predecessor's
run. That is true of a run that has not started, and false of one that has, and
the difference decided whether tonight's train could move at all.

`cancel-in-progress: false` on main means a newer run **queues behind** an
executing run rather than replacing it. What GitHub does not keep is more than
one _pending_ run per concurrency group: a newer pending run supersedes the
older pending one. Every cancellation measured earlier tonight was of that
second kind — `fececf25` and `02913aa9` each died with **zero jobs allocated**,
never having started.

**Tested rather than reasoned.** Main's run on `7fc33c85` had jobs executing
when #333 was merged at 08:12Z. Immediately afterwards the run was still alive:
`browser (3, 8)` and `browser (7, 8)` in progress, `unit (4, 6)` and
`unit (5, 6)` still queued and intact. The merge queued behind it, exactly as
the corrected reading predicts.

**Confirmed again at 09:00Z, four merges later.** Main's run on `7fc33c85`
has now survived the merges of #304, #336, #341 and #342, and is still
running its browser shards. Each of those four merges created a main run that
died with zero jobs allocated — `4595878e`, `a08d2eef`, `d9753c87` cancelled,
`0f1db2d3` pending as this was written. So the practical shape on a busy
morning is that main gets one executing run and every merge after it inherits
a run that never starts. The verdict a lane reads for main is the one from
`7fc33c85`, and no later commit on main has been tested by CI at all.

**Three lanes reached the same instrument independently.** The playtest lane
measured run `35699947412` reading `queued` at run level while browser shards
3, 5 and 7 were all `in_progress` at that same moment. A lane deciding whether
a merge was safe by reading the run's status field would have concluded main's
run had not started when it had, and held the freeze for nothing. This is the
third finding tonight whose answer is the same sentence: **read the jobs, never
the run.** The pending-versus-executing distinction that made tonight's merge
safe is only visible at job level, and so is the slot count.

**Why this was worth getting right.** Under the original reading, no merge
could happen until main's run finished, which would have been well past nine
o'clock. Under the corrected one, merging is safe the moment main's run has
actually started — and the freeze only ever needed to last until then. The
run-level `status` field is no help in telling those apart, since it reads
`queued` while jobs execute; the job list is the only honest instrument.

## What to say about main, and what not to say

**The sentence for the report, as of 09:00Z: main is merged, and of its unit
suite four shards of six are green, one is red with the failure #333 already
fixed, and the sixth is still running. Not "main is green," and not "its unit
suite is clean" either.**

That second phrasing was mine, written at 08:09Z, and it was an overclaim. I
am correcting it here rather than quietly, because it is the same mistake this
very section exists to prevent, and catching it in my own sentence is the only
evidence that the rule is doing any work.

What is actually on the record, all on `7fc33c85`:

- `repository` — green.
- `unit (1, 6)` — green.
- `unit (2, 6)` — **red**, one test of 1197. That is the failure #333 fixed.
- `unit (3, 6)` — green, 08:28:17Z.
- `unit (4, 6)` — green, 08:32:47Z.
- `unit (5, 6)` — still running at 09:00Z, started 08:58:01Z.
- `unit (6, 6)` — green, 08:56:53Z.
- `browser (6, 8)` — nine failures, all pre-existing (see below).
- `browser (3, 8)`, `browser (7, 8)`, `browser (2, 8)` — red, completed
  08:35:59Z, 08:45:09Z and 08:52:17Z.
- `browser (1, 8)` and `browser (5, 8)` — still running. `browser (4, 8)` and
  `browser (8, 8)` — still queued after eighty minutes.

**Corrected at 09:00Z.** An earlier version of this section said shards 3
through 6 never started. They did start — between 08:25Z and 08:58Z, an hour
after the run was created, once the browser shards ahead of them finished.
The claim was true when written and stopped being true, which is a different
failure from an overclaim and needs the same correction. Read the run again
before repeating any line of this section.

So **no CI run has ever reported a green `unit (2, 6)` on main.** #333's fix
rests on local evidence: the failure reproduced first, then the same test
passing, with the neighbouring suites green. That is good evidence and it is
not a CI verdict, and the report should not let the two blur together.

The difference is not pedantry and it is not modesty. It is the difference
between a claim that survives being checked and one that does not, and anyone
can check this one by opening the Actions tab.

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

**These are main's, not any pull request's, and that is now measured rather
than assumed.** Six of the nine cluster in the PT3 scene and conversation
specs, which suggests one cause rather than six. The fix-main lane ran the
whole suite locally against `445441a5` — main plus the timeout budget, from
before this train started — and **all nine fail there too, matched by spec file
and test title, nine for nine.**

That matching is the part that matters. Comparing by shard number would have
proved nothing, because shards are assigned per run and shard 6 tonight is not
shard 6 an hour ago. Matching by spec and title also happened to cross Chromium
versions, since the local run is not CI's, so two different browsers agree on
the same nine titles.

**So: the browser failures on main are the ones main already had, present at
`445441a5`, and no merge tonight added to them.** That is the whole claim. It
does not date them further back than `445441a5`, and nobody should say it
does.

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

**This is the capacity argument, not an illustration of it.** At the two
concurrent jobs we believed we had — see the correction under "The capacity,
measured"; the real figure is at least three — a verdict on main and verdicts
on the branches were not competing priorities, they were mutually exclusive.
At three or four slots that is overstated: they compete rather than exclude.
The choice made tonight would have been the same, because browser shard
duration rather than slot count is what stops a run finishing, but the reason
given for it was stronger than the facts supported. One run is fifteen jobs; the queue
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

## The capacity, measured — and the number that was wrong

> **Correction, 08:15Z.** This section said the repository runs two concurrent
> jobs. It does not. Three of main's own jobs were observed executing together
> at 07:59Z, and three browser shards again at 08:05Z after `repository` and
> two unit shards had finished — so the limit is **at least three, probably
> four**. The original figure is left visible below rather than edited out,
> because the arithmetic further down was built on it and so were decisions
> made tonight. What follows the strikethrough is the corrected reading.

~~The repository runs two concurrent jobs, for the whole repository.~~ One
`validate.yml` run is **fifteen jobs**: one `repository` job, six `unit`
shards and eight `browser` shards.

Job durations, read from run `35674001475` (branch `claude/campaign-model`),
the only run tonight that was observed end to end:

| Job           | Observed duration             |
| ------------- | ----------------------------- |
| `repository`  | ~2 min                        |
| `unit` × 6    | 4 to 10 min each, ~36 total   |
| `browser` × 8 | 21 to 59 min each, ~326 total |

That is roughly **364 job-minutes for one run**. The wall-clock figure this
section originally derived — about three hours with the entire repository to
itself — assumed two slots and is therefore too pessimistic; at three or four
it is shorter.

**But the conclusion does not move, because the binding constraint was never
the slot count.** It is browser shard duration. A single shard runs 21 to 59
minutes, they cannot be subdivided, and one was still going unfinished after
twenty-four minutes tonight. Eight of those in one run means a run takes most
of an hour at best no matter how many slots exist. Adding a fourth slot makes
a run somewhat faster; it does not make a sixteen-job run complete quickly.
**That is a different problem with a different fix** — shorter or better
parallelised browser specs, not more runners.

The observed history is unchanged either way: the run created at 00:57:48Z had
its last job still going at 05:50Z, just under five hours later.

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
