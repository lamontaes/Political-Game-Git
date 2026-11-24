---
id: tests-plain-text-no-travel-filing-place
title: "plain-text.browser.mjs finds no place in Travel that takes filings (Junction City, Georgia)"
area: play
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr: #8795
blocked-on:
source: added with npm run pool -- add
after:
lead: play-first
model: sonnet
effort: low
root: none
checked: fable 2026-11-10
claimed-at:
branch: claude/pool-tests-plain-text-no-travel-filing-place
---

**What.** On a fresh bench on Nov 3, src/bench/plain-text.browser.mjs failed with "no place in Travel takes filings" in Junction City, Georgia (seed a3b686cb-ba71-4137-957b-a2e414912b99), after playing the President's address. Either Travel no longer marks the filing office of that place, or the check reads a label the Travel card changed on Nov 3. Three more fresh benches (Farmers Loop, Alaska, 44e7fea7-bb6a-4a5a-ac12-035acf9dd386; Burleson, Texas, ca2cfbd3-5a83-4b11-a04d-7992102b5f32) failed the same way, and Condon, Oregon (8899fc75-7fbd-4cfc-b121-6a6b90fc5747) got past Travel and timed out in a later talk. The cause is not yet found.

**Cause.** Found in code: the check's drive through the filing counter assumes one shape of talk, and the game now shows others. src/bench/plain-text.browser.mjs `counter` (lines 131 to 167) opens the first Travel tile that takes filings, presses Continue until `#talk-choices` has a button, clicks the first one as the race, and then (line 173) clicks `#talk-leave`. Measured on main (Nov 11) on a fresh bench, the unchanged check and three runs of a copy that screenshots the talk after the pick (deleted after): Bogus Hill, Connecticut (check seed 13b9e546-0d57-4e62-996e-3eeff8a488b7) timed out at line 173 with Leave hidden. In Mount Olive, Mississippi the clerk answered the 17-year-old player 'You have to be at least 18.' and the only button was the reply 'Thank you.', with no Leave. In Sherrelwood, Colorado the talk at the counter was another scene ('Do you know much about Lori Rodriguez?', replies Good, Bad, 'Let them run.'), so the check's first choice answered that scene instead of picking a race. In West Ishpeming, Michigan and Summers, Arkansas Leave was shown and the step passed. The Nov 3 'no place in Travel takes filings' did not show in five runs.

**Fix.** Change the check only. 1. After the race pick, end the talk the way a player can: click `#talk-leave` if shown, else the one remaining reply (the clerk's 'Thank you.'), until `#talk` is hidden. 2. In `counter`, before clicking a choice as the race, confirm the talk is the clerk's: its choices name an office (the race lines the counter offers); if another scene opened instead, leave it as `leaveScenes` in src/bench/office-hours.browser.mjs does and open the tile again. Keep every text check the file makes.

**Time box.** 2 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: the filing office must be reachable from Travel in every place, and the check must find it the way a player does. Ask why: the fix names the record or label that changed, by file and line.

**Done when.** A second session runs src/bench/plain-text.browser.mjs in Junction City, Georgia on its seed and in two more drawn places named with seeds and sees every run pass, finding the filing office from Travel the way a player does. The PR names whether Travel or the check was wrong, by file and line.

**Waits on.** Nothing.

**Files.** src/bench/plain-text.browser.mjs, src/bench/ui/travel-screen.mjs

**Notes.** TODO

Sent back 2026-11-12 from PR #8795 (branch claude/pool-tests-plain-text-no-travel-filing-place): done-when not met — the plain-text runs end on developer text owned by two still-open items (play-metrics-percent-change-has-no-points, laws-contribution-limit-names-carry-office-keys); finish on that branch, merge main into it first, and re-run the Junction City seed plus two fresh draws to PASS after those two merge.

Lane 5, Nov 3: three more fresh benches with the shared opening helper (#7155): Farmers Loop, Alaska (44e7fea7-bb6a-4a5a-ac12-035acf9dd386) and Burleson, Texas (ca2cfbd3-5a83-4b11-a04d-7992102b5f32) failed the same way; Condon, Oregon (8899fc75-7fbd-4cfc-b121-6a6b90fc5747) got past Travel and timed out waiting for a choice in a later talk (`#talk-choices button`).

**Notes (re-run, 2026-11-10, main b4422d346c).** `node src/bench/plain-text.browser.mjs` (BENCH_BROWSER as above) on a fresh bench. The check draws its own place; BENCH_SEED is not read, so Junction City, Georgia was not replayed. Run in Sinapalo, Rota, Northern Mariana Islands, check seed 1a4fa9bd-8bbe-4e61-81e7-3e9ac2f3f1c7: red, at a different step from the item's. First failure as printed: `locator.click: Timeout 60000ms exceeded. Call log: waiting for locator('#talk-leave') ... locator resolved to <button type="button" class="action" id="talk-leave">Leave</button> ... attempting click action` at src/bench/plain-text.browser.mjs:173.

Cause found (Nov 11, 2026, cause finder for Fable B): one failing run and three probe runs on a fresh bench showed two talk shapes the check does not expect after the race pick: the clerk's age refusal ending in 'Thank you.' and an unrelated scene opening at the counter.

Claimed by next for opus-5234 (Claude Opus 5.5 in Claude Code (cloud session), tier top) (2026-11-11 10:13 UTC) on branch claude/pool-tests-plain-text-no-travel-filing-place.
