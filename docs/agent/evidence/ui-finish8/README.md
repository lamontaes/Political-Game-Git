# UI-FINISH8 — adoption map, causal accounts and evidence

Role A (UI-FINISH8) under CLAUDE-CLOSE8. Implementation, not independent
review. No main merge is performed from this role and no art is approved by it.

Published for C (LAND-CLOSE8) and D (ACCEPT-CLOSE8).

## Adoption map

| Item          | Adopted from                     | At                                         | Result                                                                                                                                                                  |
| ------------- | -------------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UI #144       | `codex/ui-core-release-transfer` | `0deebff6ee7ba2b51467873b4ca8287dd05b0377` | adopted whole, history preserved, worked on `claude/ui-finish8-takeover`                                                                                                |
| OPENING #150  | `codex/opening-life1`            | `39844fcd4ee31ed5d542fd97a309519f6b8fb900` | **not merged.** #144 already carries its own integration of the invitation refusal and the earned-pay repair; verified rather than re-implemented. See "OPENING" below. |
| EDU #153      | `codex/edu-path7`                | `b4a8c55d0c51e805a18201f4b1df95a04aeccba1` | bounded formatting correction published to the same PR branch as `5911d817` (fast-forward)                                                                              |
| Accepted main | `origin/main`                    | `ec437edacb3ff44e286f2a4adaa696880b356a74` | merged into the takeover branch; both control sets preserved                                                                                                            |

Working checkout `/Users/lamontae/Documents/Political-Game-UIFINISH8`, branch
`claude/ui-finish8-takeover`. The owner play folder
`Political-Game-Play-0deebff6` and its server on port 5188 were never touched;
all browser work used port 5391 with server identity verification.

## FIRST — the missing `election-lost` transcript claim

`scripts/prose-corpus/corpus.test.ts` asserted the seed matrix demonstrates
`election-lost`. It did not. The cause is not the replay strategy, not the
coverage collector and not a stale prose expectation.

**What was actually wrong.** `runCampaign` looped six times asking for a
campaign afternoon. A day holds two campaign slots, so the third ask returned
`The rest of today is already spoken for. Get on with the day and pick this up
tomorrow.` and the loop stopped. Every campaigning transcript ran a
two-afternoon campaign while its own comment described six.

**Why that mattered.** Measured on this matrix, each canvassed afternoon is
worth roughly three points of final margin:

| Afternoons worked              | `p85c-owner-clock` | `corpus-campaign-b` |
| ------------------------------ | ------------------ | ------------------- |
| 0                              | lost by 4.84       | lost by 5.72        |
| 1                              | lost by 1.22       | lost by 2.66        |
| 2 (what the loop actually did) | **won by 1.82**    | **won by 0.66**     |
| 3                              | won by 4.44        | won by 2.62         |
| 4                              | won by 7.16        | won by 5.00         |
| 6                              | won by 14.30       | won by 11.24        |

Two afternoons is the crossover. Both contests were being settled inside a
sub-two-point residual — on accepted main as much as here. The same sweep on
`ec437eda` gives lost-by-7.32 / lost-by-3.72 at zero afternoons and
won-by-10.16 / won-by-10.74 at six, so the behaviour is not branch-specific.

**What changed to expose it.** #144's OPENING integration advances ordinary
opening scenes by minutes (`advanceWorldMinutes`) rather than by whole days,
which is the accepted direction and does not invent elapsed time. It compresses
the six pre-campaign beats, so filing moves from 2026-10-24 to 2026-03-14 and
from 2026-08-08 to 2026-06-16 — a different month of the cycle against a
differently drawn opponent field. The borderline contest flipped. Nothing about
the loss had been robust; it was luck with a comment attached.

**Repair.** Two parts, neither of which writes an outcome.

1. The session loop passes the day through `passOrdinaryDays` — the same seam
   the player's own control calls in `PlayerGame.tsx` — and canvasses again
   tomorrow, exactly as the refusal instructs. It now gets the six afternoons
   it always documented.
2. A new lane, `campaign-without-the-work`, files a candidacy and never works
   it. It deliberately reuses `campaign-and-office`'s control seed, person and
   beats, so the only difference between the winning lane and the losing one is
   whether the work was done, and the defeat is attributable to the work rather
   than to a seed.

Both original control seeds are kept at their original values. No result is
forced, no seed is shopped, no tag is injected, no assertion is deleted and no
opaque baseline is recaptured. All three outcomes are still read off the
resolved contest and are still free to change.

Two guards pin what must not silently return: a worked campaign has to cross a
day boundary (`sessions.length > 2`), and the defeat has to stay attributable
(same seed, zero sessions lost, worked sessions won).

`docs/prose-inventory/transcripts.md` was regenerated by `npm run corpus:prose`
and records `campaign-and-office` won, `campaign-alternate` won,
`campaign-without-the-work` lost.

**For D:** this is the "written causal account and independent adjudication"
the contract asks for. The judgement worth checking is the second part — that a
lane which does no campaigning is a legitimate way to demonstrate a defeat,
rather than a way of arranging for one.

## SECOND — OPENING invitation refusal and earned money

Verified, not re-implemented. `#144` already carries this work: `5501b743`
("Track actual earned pay before normal study spending") is the same source as
the cited account repair `8082d477`, and `0deebff6` is "Connect explicit
invitation refusal to normal Day and Work".

Run on an identified server at port 5391, served checkout verified equal to the
branch head, tree clean:

- `tests/e2e/edu-path7-normal.spec.ts` — both journeys pass.
  - _normal dated education offer, attendance, interruption and repeated
    saving_: paid work attended → first study session (1 attended) → Interrupt
    → Keep/save → reload → Continue → return → second attempt refused with
    `Another calendar commitment must be resolved first.` → explicit
    `Decline invitation: Something on Saturday` → **second actual study session
    (2 attended sessions)** → Save → reload → still 2.
  - _normal invitation pointer refusal preserves time and survives saving_:
    `currentMoment` unchanged across the refusal, exactly one
    `life.social-invitation-declined` event, `scheduledActivities` unchanged,
    survives reload and a repeated Save byte-for-byte.
- The invitation's date is derived, not written: `nextSaturday(currentDate)` in
  `life-opportunities.ts`. On this journey the world date is 2026-01-05, so the
  declined occasion is **Saturday 10 January 2026** — the invitation the
  contract names.
- No money is granted at load. `ensureLifePathPersonalPosition` opens a
  position from recorded transfer outcomes only, records the carried outcome
  ids in its provenance, and states "no initial wealth inferred". Fees and the
  calendar are not bypassed anywhere in this path.
- Focused suites: `life-paths2-resources`, `social-invitation`,
  `opening-life-scenes` — 14 passed.

## THIRD — EDU donor formatting

**Cause.** `public/education/` holds three generated, content-addressed
catalogs; the postsecondary chunk alone is 60,623,526 bytes. #153 did not
exclude them from Prettier, so `prettier --check .` builds an AST over that
file. Reproduced directly:

```
Mark-Compact 4061.2 (4137.0) -> 4055.7 (4140.0) MB ... allocation failure
FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory
```

which is the `exit code 134` in run 34391945354 / job 102602127521.

**Remedy.** The one #144 already runs green with — a `.prettierignore` entry
naming `scripts/source/export-education.ts` as the producer. No heap inflation,
no blanket exclusion, no handwritten code excluded. With it the format gate
completes in 42s at 404 MB on #153 and 65s at 357 MB on the combined branch.

**Protection retained, and now actually checked.** The catalogs' integrity was
never Prettier's doing: they are content-addressed and `EducationOptionsPanel`
re-hashes every chunk it fetches and refuses one whose bytes do not match.
Nothing tested that. `tests/source/education-catalog-integrity.test.ts` now
states it — digest agrees with file name and manifest, payload carries the
version, the locked acquisition hashes and exactly the promised record count,
the producer's trailing-newline convention holds, and a single flipped or
truncated byte breaks the digest. Verified by corrupting a catalog by one byte
and watching two tests fail, then restoring.

A second, separate format failure was hidden behind the abort:
`edu-path7-proof.html` was unformatted. It is handwritten, so it stays checked
and is simply formatted — to content byte-identical with #144's copy.

Both source editions, the 2026 validity window and the noncredit-versus-degree
distinctions are untouched.

**Published:** `codex/edu-path7` `b4a8c55d` → `5911d817`, fast-forward, no
force. On that head: format, lint and typecheck clean; unit suite 3616 passed
with one heavy replay test timing out under host contention that passes in
14.7s in isolation.

## FOURTH — composition with accepted main

This is a real gap, not a formality. #144 diverged before the release tooling
landed and carried **no** `scripts/release/`, no `release:*` commands and no
`release.yml`, and its `validate` chain had no `release:check`. Landing it as
it stood would have removed main's release enforcement from the repository.

`package.json` is resolved to hold **both** control sets:

```
format && lint && typecheck && release:check && test && source:validate
  && source:replay && build && demo -- validation-seed && validate:art
  && admit:wave-a-candidates -- --check && derive:wave-a-wardrobe -- --check
```

main's five `release:*` commands are restored. `npm run release:check` passes
on the composed tree. `.claude/skills` and both `.github/workflows` now match
main exactly.

Two source conflicts were resolved on their merits, and both deserve D's eye:

- **`corpus.test.ts` count check.** main pinned three literal counts measured
  on its own tree (55350 / 1927 / 371). A composition cannot keep those, and
  refreshing them is the "fix the number" move that file exists to prevent.
  This branch's live comparison makes the same claim without a magic value: the
  committed report must agree with what the scanner measures now, so a stale
  report still fails. **main's absolute-scale assertion is not retained** — that
  is the one thing given up here and it is stated rather than hidden.
- **`life-paths2.spec.ts` status locator.** This branch scopes the assertion to
  the region's own status element; main's bare `getByRole("status")` matches
  the nested "Education and work" regions and is a strict-mode violation. Taken
  from this branch on that ground, not because it is this branch's.

Generated corpus reports were regenerated by their producer on the composed
tree, not resolved by hand or taken from a side.

## Named owner visual set

Captured from a normal start on an identified server, clean tree, served
checkout verified. **These are not an art approval and are not offered as one.**

| File                             | Surface                             |
| -------------------------------- | ----------------------------------- |
| `01-normal-scene.png`            | normal scene                        |
| `02-normal-dossier-wardrobe.png` | dossier with wardrobe controls open |
| `03-normal-creator.png`          | creator                             |
| `04-normal-work-study.png`       | work and study                      |
| `05-normal-news.png`             | newspaper                           |

Human review of the captures, not just their passing:

- Scene, dossier and creator render on the approved direction. Baked
  environment art carries no simulation-owned text; name, date, jurisdiction,
  people and prose are all in dynamic surfaces.
- **Work and study has real presentation defects** worth an owner's attention,
  and a passing suite does not override them: the panel title and the section
  heading both read "Education and work"; the institution rows are
  inconsistently wide with the Compare checkbox outside the row control; the
  last visible row is clipped by the panel edge; and the body is noticeably
  less finished than the scene, using default select controls and unstyled
  paragraphs. Not repaired here — this is #144/#153 presentation and reopening
  the accepted visual direction is not this role's to do.

## Consumers, and what is still not there

- **NEWS.** The supported path is proven by `tests/e2e/ui-core-news.spec.ts`: a
  member seat → a completed legislative action → a published public-information
  item → an eligible reporter → a press exchange (and a request is explicitly
  not acceptance). What an ordinary life does **not** generate is any published
  item before a legislative action, and any reporter with recorded knowledge of
  a story's basis event: `projectEligiblePressReporters` is keyed to
  `questionBasisEventIds`. Both surfaces refuse honestly — "No interviews are
  arranged in this life.", "No public-information items have been published in
  this save.", "No eligible reporter with knowledge of this story is recorded."
  No stock reporter is manufactured on screen-open, and none was added. This is
  a scope disclosure, not a claim of full functionality.
- **Staff versus member.** Preserved. Filing is driven by the shared filing
  projection, which disables the control and renders its reason
  (`drafting-filing-refusal`), recomputed at submission. A custom office start
  that creates legislative staff still cannot introduce a bill.
- **CIVIL** remains private preparation, not enacted personnel authority.
- **INCIDENT.** Root adoption was to be performed from C's accepted exact
  patch. **No patch was received from C during this session**, so no INCIDENT
  root change was made. Recorded as outstanding rather than improvised.

## Validation

Every stage of the composed `validate` chain passes on this branch:

| Stage                             | Result                                                                                                             |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `format`                          | All matched files use Prettier code style (65s, 357 MB peak)                                                       |
| `lint`                            | clean                                                                                                              |
| `typecheck`                       | clean                                                                                                              |
| `release:check`                   | `version 0.2.0, 6 pending declaration(s) ... OK.`                                                                  |
| `test`                            | **272 files, 4234 passed, 2 skipped, 0 failed**                                                                    |
| `source:validate`                 | 18 domains, 0 errors (published warnings preserved, not suppressed)                                                |
| `source:replay`                   | pass                                                                                                               |
| `build`                           | pass                                                                                                               |
| `demo -- validation-seed`         | pass                                                                                                               |
| `validate:art`                    | `Validation passed.`                                                                                               |
| `admit:wave-a-candidates --check` | up to date                                                                                                         |
| `derive:wave-a-wardrobe --check`  | up to date; 49 historical enlarged candidates checked against banked hashes only, **not** accepted or re-generated |

Nothing here is a claim of art approval, and no candidate art was promoted.

## Browser evidence

Run on an identified server, port 5391, at head `ad505682`, clean tree, served
checkout verified equal to the branch head (workspace, head, branch, dirty and
source digest all matching). The owner's play folder and its server on 5188
were never a target.

`edu-path7-normal`, `ui-save5-review`, `life-paths2`, `ui-core-news`,
`persistence-cross-tab` — **10 passed** in 58.3s. That covers the second paid
study session after an explicit invitation refusal, repeated Save and reload,
cross-tab safety, the News surface and the named visual set.

## Remaining defects and host notes

- **The unit suite is green, but only with bounded parallelism on this host.**
  This machine has 8 cores and was carrying a load average of 26 across many
  agent worktrees. At vitest's default worker count, individually fast tests
  exceed the 5s per-test budget, and which ones do so moves between runs — three
  in one run, one in the next, twelve in a third, across
  `substrate.test.ts`, `people-visual4-review.test.ts` and
  `legislative-bargaining-world.test.ts`. Each passes in isolation well inside
  the budget. Run with `--maxWorkers=3` the whole suite is 4234 passed, 0
  failed, and the hosted run at `0deebff6` did not hit these either. This is
  host oversubscription, not a branch defect; no test was weakened to get past
  it. Anyone re-running here should bound the workers.
- One real cost increase was found rather than assumed and is fixed at the
  cause: `substrate.test.ts`'s corpus-digest replay walks every source domain,
  and the composition takes that from 15 domains / 85 MB to 18 / 184 MB —
  0.74s to 2.07s. Its budget is stated explicitly; every domain is still
  digested and compared. This touches the shared source substrate by one
  argument and no assertion, declared for B and C.
- `corpus.test.ts` now plays its seven lives once at module scope. The file
  takes 5.2s where accepted main took 17.8s, and no individual test is near the
  timeout.

## Acceptance state

Engineering work by this role only. **Not independently reviewed, not owner
visually approved, and not merged.** C holds merge authority; D holds
independent acceptance, and the transcript repair in FIRST and the two
composition resolutions in FOURTH are the items specifically referred for it.
