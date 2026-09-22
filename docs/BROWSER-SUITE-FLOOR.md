# The browser suite's floor

What the browser suite cannot pass, why, and what it costs to change. Written
because a floor nobody wrote down is rediscovered as a failure by the next
person who runs the suite, and then spent on again.

Everything here is measured. Where a number is local rather than from CI, it
says so, and it names the browser it ran on, because two containers do not
necessarily run the same one.

## 1. Cases that need artwork that cannot be on a runner

Twenty-two spec files open the game with `?art-preview=candidate`:

    tests/e2e/a-fresh-candidate-lineage.spec.ts
    tests/e2e/a39-composed.spec.ts
    tests/e2e/a41-pose-composed.spec.ts
    tests/e2e/g-location-compositions.spec.ts
    tests/e2e/modular41-combined.spec.ts
    tests/e2e/morning23-b.spec.ts
    tests/e2e/p29-g-apartment.spec.ts
    tests/e2e/people-coherence-b.spec.ts
    tests/e2e/people-fresh-candidate.spec.ts
    tests/e2e/playable29-material.spec.ts
    tests/e2e/playable29-outfit.spec.ts
    tests/e2e/playtest34-j-public.spec.ts
    tests/e2e/playtest34-ordinary-people.spec.ts
    tests/e2e/playtest34-reception.spec.ts
    tests/e2e/ui-decision-controls.spec.ts
    tests/e2e/ui-decision-politics.spec.ts
    tests/e2e/ui-decision-readers.spec.ts
    tests/e2e/ui-finish-journey.spec.ts
    tests/e2e/ui36-successor.spec.ts
    tests/e2e/ui46-party-initiatives.spec.ts
    tests/e2e/ui46-phone-frame.spec.ts
    tests/e2e/ui46-political-map.spec.ts

The preview mode itself is live in the suite. Playwright serves the app through
`scripts/dev-identified.mjs`, a development server, so the `import.meta.env.DEV`
gate that keeps candidate art out of a shipped build is open here. What is
absent is the artwork.

`PRIVATE_CANDIDATE_ART_AVAILABLE` in
`src/presentation/private-candidate-manifests.ts` is a glob over

    art/manifest/character_candidate_{engine29,engine34,engine35,engine36,engine40,engine41,kit41}_{registry,generation}.json
    art/manifest/character_candidate_modular41_heads.json

and none of those files is in git. They are owner-private. So the flag is false
in every checkout a runner can make, and it will stay false: putting the private
bank in the repository is the only thing that changes it, and that is a decision
about the artwork, not about the tests.

**This is a floor, not a backlog.** No amount of test repair moves it.

### The defect behind it

When the manifests are absent the game says nothing. `setupForArtPreview` in
`src/presentation/art-preview.ts` returns the setup unchanged and
`prepareCandidateOpeningWorld` returns the world unchanged, so the player is
quietly put back on the ordinary appearance path with no message, no marker and
no test id. The preview banner still shows, which makes it worse: the screen
claims to be showing unreleased candidate art while showing production art.

That is the one place found so far where the game fails hard instead of failing
soft with a stated reason, against the standing rule that unknown content is
skipped with a reason and never silently. It is why these cases read as
ordinary assertion failures rather than as a recognisable refusal.

Fixing it is a small change on an art surface — say, on screen, that the private
bank is not in this checkout and the ordinary appearance is what is drawn — and
it belongs to whoever owns that surface. The unit suite already handles the same
condition honestly, with `describe.skipIf(!PRIVATE_CANDIDATE_ART_AVAILABLE)`.

## 2. Cases that cannot pass in a cloud container

Eight cases depend on the environment rather than on the game and can never pass
here. They are counted in the floor and not in the defect total.

## 3. The suite cannot even launch in a fresh container

Two separate environment faults, both of which present as hundreds of game
failures and are neither. Both must be applied again after every container
recycle; neither belongs in the repository, because the pin and the channel are
correct for CI, where the matching browser is installed.

**Without `CI=1`, nothing launches.** `playwright.config.ts` selects
`channel: "chrome"` when `process.env.CI` is unset, and no Google Chrome is
installed in the container. Every case dies with `Chromium distribution 'chrome'
is not found at /opt/google/chrome/chrome`. Run the suite as
`CI=1 npx playwright test`.

**The preinstalled Chromium is older than the pinned Playwright.**
`@playwright/test` is pinned to 1.62.1, which wants chromium build 1234
(Chrome 151); the container carries build 1194 (Chromium 141).
`npx playwright install` cannot close the gap: the egress proxy returns 403 for
`cdn.playwright.dev`. Aliasing the build that exists does work:

    B=/opt/pw-browsers
    mkdir -p $B/chromium-1234 $B/chromium_headless_shell-1234/chrome-headless-shell-linux64
    ln -sfn $B/chromium-1194/chrome-linux $B/chromium-1234/chrome-linux
    touch $B/chromium-1234/INSTALLATION_COMPLETE $B/chromium-1234/DEPENDENCIES_VALIDATED
    for f in $B/chromium_headless_shell-1194/chrome-linux/*; do
      ln -sfn "$f" "$B/chromium_headless_shell-1234/chrome-headless-shell-linux64/$(basename $f)"
    done
    ln -sfn $B/chromium_headless_shell-1194/chrome-linux/headless_shell \
      $B/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell
    touch $B/chromium_headless_shell-1234/INSTALLATION_COMPLETE \
      $B/chromium_headless_shell-1234/DEPENDENCIES_VALIDATED

**Do not edit the checkout while a run is in flight, including files git does
not track.** `scripts/dev-lab/identity.ts` hashes `git status --porcelain
--untracked-files=all` along with the HEAD tree, and the suite's teardown
asserts that the served checkout is the one it started against. So writing a
new document into `docs/`, or saving any scratch file inside the working
directory, invalidates a run that may already be an hour old. Put scratch work
outside the repository and commit new files after the run reports.

It is a ten-Chrome-version skew, so any local count measured this way runs on
Chromium 141 rather than the version CI uses, and must be labelled that way. A
local browser count from one container is not comparable with one from another
without checking which build ran.

## 4. Counts

### Before

588 cases, measured locally at 2 workers before the timeout budget changed:
**132 failed, 12 flaky, 434 passed**, 144 distinct cases not passing.

Split at that head: 79 timeouts, of which 60 were at Playwright's 30-second
default and 19 at budgets that had already been raised; at least 13 cases
needing the private artwork above; and roughly 47 real assertion failures.

The 30-second cluster was measured as slow rather than hung: **40 of 44 passed
at a 150-second budget**, and two of the four that still failed were genuine
assertions the timeout had been masking. That is why the honest failure count
was expected to rise before it fell — raising a budget uncovers assertions
rather than hiding them.

### The timeout budget

`playwright.config.ts` now carries `timeout: 120_000`, derived from measured
walks rather than picked: the slowest passing cases measured 42.9s, 43.6s and
55.7s, with two at 60s in `legislation-docket`. Merged as PR #285.

### After

_To be filled from the re-measure in flight. It will name the head it ran
against, the browser build, and the count broken out by family: product defect,
harness defect, stale expectation, and cannot-run-in-a-cloud-container._

## 5. What CI itself said

Run 35672925596, on `0db96f08`:

    repository=success
    unit=success
    browser=failure

All six unit shards passed and all eight browser shards failed. Everything red
in this repository's validation is the browser suite; nothing else is.

## 6. Two things the suite says that are not quite what it proves

### A green tick that proves a fixture

`tests/e2e/district-seat-filing.spec.ts` walks the Alaska House filing route
end to end and passes. It reaches that route by injecting
`settledDistrictLife("US-AK", "Sitka", 700)` straight into the save store:
seven hundred days of recorded residence, present before the test starts.

So the case proves the fixture path, while its title reads as a claim about the
district filing screen. Anyone reading the suite concludes that filing in
Alaska works for an ordinary player, which is a different sentence and is not
established by this test. That is very likely where one half of a claim made
and retracted twice in one night came from.

The fix is not to delete the case — the fixture path is worth testing — but to
have a second case walk an ordinary creator start with no injection, and to let
each title say which of the two it covers. That case is being written.

Until it reports, the honest state of Alaska is: two independent measurements
at the engine say the rule admits a candidacy, and zero measurements say what
the filing screen renders.

### Two refusals that mean the same thing and do not say so

A town split across several districts refuses, correctly, from two different
producers, in two different sentences:

> This character's town lies across more than one district, so the world cannot
> say which district they live in.

> This office requires 1 year of residence for the district. This character's
> town lies across more than one district, so the game cannot say which one
> they live in, and it will not pick one to answer for them.

The first is Anchorage, through `candidate-qualification.ts`; the second is
Columbus, through `office-qualification-rules.ts`. One says "the world", the
other "the game"; one says "which district", the other "which one". A player
meeting both would reasonably conclude they were being told two different
things about two different problems.

This is a voice question rather than a defect and belongs to whoever owns
player-facing prose. It is written down here so it does not evaporate. Note
that the two are deliberately asserted separately in
`tests/e2e/support/jurisdictions.ts` rather than reduced to a shared fragment:
collapsing them would let one path silently adopt the other's sentence without
a test noticing.

## 7. The browser failures on main were already on main

Measured 2026-09-22. CI's `browser (6, 8)` shard on main at `7fc33c85`, the
head the merge train produced, reported 9 failed and 54 passed in fourteen
minutes:

    pt3-scene-conversation.spec.ts   the age-22 bounded box
                                     turning to a second classmate
                                     1280 x 720
                                     1200 x 720
    pt3-school-scene.spec.ts:149     child corridor route
                                     teen corridor route
    pt3-microfix-version.spec.ts:81  version stamp at desktop
                                     version stamp at narrow
    raster-readiness.spec.ts:340     decoded title A held while B resizes

Every one of those nine fails in a local run of the whole suite against
`445441a5` — main plus the measured timeout budget, from before the merge
train began. Matched by spec file and test title rather than by shard number,
which is not stable enough to carry the claim.

So nothing merged on the night of the 21st into the 22nd caused them. They were
inherited and carried across unchanged.

Two limits, stated because they are the difference between this and the three
claims that outran their measurement that night. The local run is on Chromium
141 while CI runs its own version, so this is two different browsers naming the
same nine titles — stronger evidence than one browser, not weaker. And
"pre-existing" here means present at `445441a5`; it does not date them further
back than that.

The six PT3 cases are very likely one cause rather than six. They are all
conversation or scene rendering on the same PT3 surface, reached across two
spec files and four viewport sizes, which is the signature of one broken thing
met from six directions.
