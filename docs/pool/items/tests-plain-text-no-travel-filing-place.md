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
pr:
blocked-on:
source: added with npm run pool -- add
after:
lead: play-first
model: sonnet
effort: medium
root: none
checked: fable 2026-11-10
---

**What.** On a fresh bench on Nov 3, src/bench/plain-text.browser.mjs failed with "no place in Travel takes filings" in Junction City, Georgia (seed a3b686cb-ba71-4137-957b-a2e414912b99), after playing the President's address. Either Travel no longer marks the filing office of that place, or the check reads a label the Travel card changed on Nov 3. Three more fresh benches (Farmers Loop, Alaska, 44e7fea7-bb6a-4a5a-ac12-035acf9dd386; Burleson, Texas, ca2cfbd3-5a83-4b11-a04d-7992102b5f32) failed the same way, and Condon, Oregon (8899fc75-7fbd-4cfc-b121-6a6b90fc5747) got past Travel and timed out in a later talk. The cause is not yet found. Guards: Travel's marking of the place that takes filings, as the player reads it.

**Cause.** Needs cause. Looked at src/bench/plain-text.browser.mjs lines 130 to 153, which click each .travel-tile[data-filing] and wait for a talk, and at Travel's screen in src/bench/ui/travel-screen.mjs (the item's src/bench/travel.ts is gone): whether the tile or the check's label changed was not read. Measured: Junction City, Georgia, seed a3b686cb-ba71-4137-957b-a2e414912b99.

**Fix.** None until the cause is found.

**Time box.** 3 hours.

**Rules.** One rule, all 56 places: the filing office must be reachable from Travel in every place, and the check must find it the way a player does. Ask why: the fix names the record or label that changed, by file and line.

**Done when.** A second session runs src/bench/plain-text.browser.mjs in Junction City, Georgia on its seed and in two more drawn places named with seeds and sees every run pass, finding the filing office from Travel the way a player does. The PR names whether Travel or the check was wrong, by file and line.

**Waits on.** Nothing.

**Files.** src/bench/plain-text.browser.mjs, src/bench/ui/travel-screen.mjs

**Notes.** TODO

Lane 5, Nov 3: three more fresh benches with the shared opening helper (#7155): Farmers Loop, Alaska (44e7fea7-bb6a-4a5a-ac12-035acf9dd386) and Burleson, Texas (ca2cfbd3-5a83-4b11-a04d-7992102b5f32) failed the same way; Condon, Oregon (8899fc75-7fbd-4cfc-b121-6a6b90fc5747) got past Travel and timed out waiting for a choice in a later talk (`#talk-choices button`).

**Notes (re-run, 2026-11-10, main b4422d346c).** `node src/bench/plain-text.browser.mjs` (BENCH_BROWSER as above) on a fresh bench. The check draws its own place; BENCH_SEED is not read, so Junction City, Georgia was not replayed. Run in Sinapalo, Rota, Northern Mariana Islands, check seed 1a4fa9bd-8bbe-4e61-81e7-3e9ac2f3f1c7: red, at a different step from the item's. First failure as printed: `locator.click: Timeout 60000ms exceeded. Call log: waiting for locator('#talk-leave') ... locator resolved to <button type="button" class="action" id="talk-leave">Leave</button> ... attempting click action` at src/bench/plain-text.browser.mjs:173.
