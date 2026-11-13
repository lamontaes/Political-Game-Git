---
name: merge-trains
description: >
  How Our Civic Duty's desks merge game pull requests in trains by area
  (owner, Nov 11: "start like bundling them up, like related stuff ... sorting
  them by pool area"): light checks per pull request, the heavy checks once on
  a train branch that holds one area's passed pull requests, halving a red
  train to find the one that broke it, and one comment that lists the train in
  merge order for whoever holds the merge step. Use when you are a gate desk
  or a merge desk and the CTO or the lead has called trains, and when you
  hold the merge step and a train is posted. Not for reds on main, rules,
  checks and skills, which merge one at a time at once (merger, checker), and
  not for pool notes (pool-notes).
---

# Merge trains

Owner, Nov 11, 2026: "maybe for the next few hours, you can stop merging and start like bundling them up, like related stuff, and then doing big bug fixes or stuff, or maybe sorting them by pool area ... and then maybe at 7 a.m. or something, you merge them all, or maybe you merge them at different points in the night ... just be a problem solver. Remember, the visible stuff first."

A train is one area's gated pull requests, checked together once and merged in a row. It saves the heavy checks: one typecheck and one played game for ten pull requests, not ten.

## What never rides a train

These merge one at a time, at once, by the usual gate (`checker`, `merger`):

- a fix for a red on main;
- a rule, a check or a skill;
- the hourly pool notes bundle (`pool-notes`).

## The areas, in order

Visible first (owner, Nov 11):

1. **Screens and UI:** anything under `src/bench/ui`, `src/bench/*.html`, `src/bench/*.css`, the browser checks, and every `play` item.
2. **Words and scenes:** `src/director`, `src/english`, `data/english`.
3. **Engines and the world:** `src/core2` and its data.
4. **Tests and tools:** `tests`, `scripts`, CI.

A pull request that crosses areas rides the train of the first area on this list that it touches.

## Between trains: the light gate, per pull request

For each open, ready pull request in your share, on its own head with main merged in, in your own tree:

1. `git fetch origin main pull/<N>/head`, check out the head, `git merge --no-edit origin/main`. A conflict in a generated file is merged by `generated-file-merges`; any other conflict is a send-back.
2. eslint and prettier on the changed files; `npm run release:check -- --mode pr`; `npm run pool -- --check`; `npm run zero-dice` when `src/core2` or `src/director` changed.
3. Read the body and the diff: line 1, evidence for each Done-when line, before and after pictures for a screen, `Review: words` when anything under `data/english/parts` changed, no unregistered placeholder.
4. Passed: comment on the pull request `<desk>: light gate passed on head <full sha>`. It is now a rider. Failed: send it back the usual way.

Do not run typecheck or the tests here. The train does.

## Building a train

About 40 minutes before a train's time:

1. **Pick the riders:** the area's pull requests with a light gate on their current head, oldest first. Where one pull request holds another (its body says so), the held one goes first. Stop at 12 riders; the rest take the next train.
2. **Make the branch in your own tree, and never push it:** `git checkout -B train origin/main`, then `git merge --no-edit <full sha>` for each rider in order. A rider that conflicts with an earlier rider leaves the train and is sent back with the other rider's number.
3. **Run the heavy checks once,** one at a time:
   - `NODE_OPTIONS=--max-old-space-size=8192 node --import tsx scripts/dev-lab/typecheck.ts`
   - the tests `npm run agent:test-cadence` names for the train's changed files, and the changed test files themselves
   - `npm run old-imports`
   - `npm run guards` (on Nov 11 two reds reached main that a guard on the train's own tree would have shown: a pull request written before the pointer guard deleted files that documents still named)
   - `npm run release:check -- --mode push` (a train that leaves the release check red holds the next build; on Nov 10 a packaging run failed on a reused release-note id)
   - the golden path: `node --import tsx tests/golden-path/runner.mjs`
   - for a screens or words train, a new game in the bench on a place and seed nobody chose: the browser checks the riders changed, with `BENCH_BROWSER=/opt/pw-browsers/chromium`
4. **A failure that is also red on clean main does not stop a train.** Name it in the comment.

## A red train

Split the riders in halves, in order, and run the failing check on each half. Keep halving the red half until one rider is left. That rider goes back with the failing lines; the rest make the train again and the failing check runs once more on them. Two rounds of halving is the limit before the train's time: after that, post the half that is green and carry the rest to the next train.

## Posting a train

One comment on the crew's issue:

```
Train <area> <HH:MM UTC>: ready (main <full sha>)
#<N> <full sha>
#<N> <full sha>
Checks on the whole: typecheck, <n> test files, old-imports, golden path, <browser checks> in <place>, seed <seed>.
Red on main too: <test names, or none>.
Left behind: #<N> (<why in six words>).
```

The lines are in merge order. The sha is each pull request's own head as GitHub shows it.

## Merging a train

Whoever holds the merge step (on Nov 11: the CTO's account; a desk may merge only where the owner has allowed it in that desk's own account) merges the lines top to bottom, each with the head pinned (`--match-head-commit <sha>`, or `expectedHeadSha`). A pull request whose head moved since the train was posted is skipped and named; it never merges unpinned. After the last line, post `Train <area> <HH:MM>: merged <n> of <m>` with the ones skipped.

After a train lands, the desk that built it runs the golden path once on main. If it is red, say so on the crew's issue at once and name the train: finding which rider did it comes before the next train.

## A build window

When the CTO posts a build window (on Nov 11: the last train lands by 12:45 UTC, the Mac build is dispatched at 12:50 UTC):

- **Nothing merges from the window's start until the CTO posts `CTO: build published`,** reds included. The packaging run publishes only if main has not moved between its check and its publish. Gating goes on.
- **Nothing that touches `.github/workflows` or `scripts/release` rides a train after the time the CTO names** (Nov 11: 10:00 UTC) unless it fixes a red.
- **The last train before a window is the shortest sure one.** Post it early and green.
- **A pool command moves main too.** `npm run pool -- claim`, `status`, `seen` and `release` each push a commit to main, and the index is regenerated after it. During a window nobody runs one: a builder builds on its branch without the claim and the lead records it after `CTO: build published` (Nov 11: a claim the lead ordered landed on main two minutes before a build was published).

## Traps

- **A train branch is never pushed and never merged.** Each pull request merges by itself, so its item flips and its history stays its own.
- **Later riders are checked on top of earlier ones only in the posted order.** Merging out of order voids the check.
- **A rider that changed after its light gate** (a new head) leaves the train unless the light gate is run again on the new head first.
- **Do not hold a ready red-main fix for a train.** It merges alone.

## Lessons of the first night of trains (Nov 11)

- **A train post is final once posted.** The merger merges the list as written. To pull a rider, post the corrected train before the first post, or post `Train <area> <time>: hold` and then the corrected one. The merger waits two minutes after any train post so a correction can land (CTO, Nov 11, after a rider was merged while its send-back was still being read).
- **A rider sent back by any desk is off every train until its new head is posted.** Before you post a train, read each rider's newest comments, not only your own gate line: the other desk may have sent it back on a check you did not run.
- **Walk the combined train in the bench once, as a player would.** The lead merged the six screen riders in its own tree and opened every menu at 1440x900. The checks were green and the walk still found the Journal note covering a face in the new strip, and a bill's page saying one sentence three times. Ten minutes; do it for every screens train.
- **A rider that holds another rider** conflicts with nothing only in the posted order. When the held one merges first and main moves, the holder needs main merged in again before it can merge; the desk does that merge, it is mechanical.

## Lessons of the second night of trains (Nov 11, the morning)

- **A rider that changes words the player reads carries its pictures, or it does not ride.** The CTO held five of the ten riders of a words train: each changed words on screen and none showed its scene before and after in three drawn places, or named the owner's complaint it answers (owner, Nov 11: "No lines should not be verified and touched"). "No rider changed a screen" is not the test; what the player reads is. In the light gate, a pull request that changes a bank, a rules file or the director's or the English engine's code needs six pictures under `docs/seen/` (three drawn places, the same seeds before and after), the line as played, the complaint named with its date, and the lead's review. Without them the desk sends it back and says so.
- **Lines that nothing plays yet ride with the pull request that plays them.** A bank change with no reader cannot be shown on screen, so it cannot meet the line above alone.
- **Count the finished work by area every hour.** `gh api -X GET search/issues -f q='repo:OWNER/REPO is:pr is:open draft:false' --paginate --jq '.items[] | "\(.number)\t\(.comments)\t\(.title)"'` lists every ready pull request with its comment count. On Nov 11 it showed 47 screen fixes and 12 scenes built and never gated, some for six hours: the crew was short of desks, not builders. The lead starts more gate-only desks, each with a short list in one area; they run the light gate, look at the screen in a drawn place and post `passed #N <sha> (<area>)`; one desk builds the train from those lines and runs the heavy checks once.
- **A rider's own item file can conflict with main.** When the hour's notes carried an item to main and a builder then built it, the branch's copy of the item and main's differ. The builder merges main in and keeps both sides before posting ready; a desk that meets it does that merge, it is mechanical.
- **A golden-path red on a train is compared with clean main on the same seed before anyone halves.** The runner draws a new place each run unless the seed is set, so a clean-main run on a fresh draw says nothing about the train's red. Take the failing row's seed and run that spec's own command on clean main: `GOLDEN_PATH_SEED=<the row's seed>` and the `command` of that spec in `docs/roadmap/features.json`. On Nov 11 a screens train lost three of its four riders to M0-09; the same seed was red on clean main (a voter group's weight below one, already in the pool), and none of the three riders touched a file that spec loads. Read which files a spec loads before you suspect a rider that changes none of them.
- **The words bar is for words.** A pull request that changes what is recorded and no line a player reads (a reply that now settles a case, a row that gains an id) has nothing to show before and after; it needs its test and its chain, not pictures. Say so in the gate comment and do not hold it for them.
- **More passed riders than the cap is two trains, and the lead names who goes first.** Number order puts the oldest pull requests first, which on Nov 11 would have left the morning's play stops (the skipped day, the visit that did not last) off the last train before a build. When the passed lines outnumber the cap, the lead posts the first train's riders by name in the order a player meets them, the desk builds that train at once instead of waiting for the cut-off, and the rest ride a second train. A rider that edits a function an earlier rider edits goes after it and gets main merged in on the train.
- **The lead's pass is on the words; the desk still runs the tests.** A words lead reads the lines as played. A desk then found that a passed address failed its own ten-world test on half of fresh draws. Neither replaces the other, and a pass comment names the head it read.

## Lessons of the first day desks merged (Nov 11)

- **A desk merges only when merging is in its own brief.** The owner said the second account's desks may merge. The gate desks, whose briefs say they never merge, rightly refused a relayed message. The lead started one small merge desk whose own brief is to merge what a gate desk posted, pinned to the posted head, and nothing else. Gating and merging stay two sessions.
- **A words pull request merges from a words train, never a single ready line.** Single ready lines are for reds on main, rules, checks, skills, the hour's notes and docs. A merge desk took a gate desk's light-gate line for a words rider and merged it before its train's heavy checks; say on the line which it is ("light gate, for the train").
- **The words light gate runs `tests/english-parts-banks.test.ts`.** Two words riders merged on a light gate that ran each one's own tests and `tests/guards/english`. Main went red three ways in the bank test: 58 lines held by two pieces each, a word on the developer-words list, five lines over their register's length. A failure in a bank file the pull request changes is a send-back.
- **Whether a pull request is merged is read from the pull request, not from main's log.** The pool's claim and status commits read "pool: <item> in-pr (#N)". A desk that searched the log for the number took thirteen open pull requests as merged and left them off a train.
- **A full typecheck needs its memory, and a pipe hides its death.** `npx tsc --noEmit | grep <file>` prints nothing both when the file is clean and when the compiler ran out of memory. Run `NODE_OPTIONS=--max-old-space-size=8192 node --import tsx scripts/dev-lab/typecheck.ts` and read its exit code (a "clean" grep let a duplicate export through, and a desk caught it).
- **A check that fails the package is fixed by teaching it what it met, with a second check for what it must still catch.** The packaged app's title check counted two holders of pictures as caption lines. The fix names their class in the check, says why, and adds a check that such a holder has no words. The owner's rule the check stands for is not loosened.
- **The sha in a train line is the pull request's own head, read from GitHub.** A train posted the sha of a merge commit the desk had made locally. The merge desk found no pull request at that head and merged nothing. Read `head.sha` from the pull request after your last push and post that.
- **A merger on any tool reads train lines the same way.** `docs/pool/START-A-MERGER.md` tells it to merge a posted train top to bottom, each rider pinned to the sha in the line, and to skip and name a rider whose head moved.
