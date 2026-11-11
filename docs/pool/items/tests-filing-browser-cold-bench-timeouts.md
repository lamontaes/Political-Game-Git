---
id: tests-filing-browser-cold-bench-timeouts
title: "filing.browser.mjs times out on a cold bench (the Go button, then the talk choices)"
area: play
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: Merger 0 and Checker 2, Nov 1, while merging #6962
after:
lead: play-first
model: sonnet
effort: medium
root: none
checked: fable 2026-11-10
---

**What.** On the first runs after a cold bench start, src/bench/filing.browser.mjs timed out in Checker 2's runs: "locator.click: Timeout 60000ms ... [data-testid=place-go]" (Lennon, Michigan, seed 58b1a1ec-f8ba-4702-bad0-622b321a6fc6) and "waiting for #talk-choices button" (Loma, Montana, seed dd9136c6-a0fe-4dce-a35e-aff97406a381); the next two runs passed. Merger 0's three warm runs all passed (Danvers MA, South Fork NV, Bison KS). The check should not depend on bench warmth, and nobody knows what was slow on the first request. Guards: the filing counter's Go button and talk choices on a fresh start.

**Cause.** Needs cause. Looked at src/bench/filing.browser.mjs and src/bench/handler.ts, the first-request path of the bench: the timeouts were not reproduced and what the first request does that takes over 60 seconds was not found.

**Fix.** None until the cause is found.

**Time box.** 3 hours.

**Rules.** Replace, never layer: the check is fixed in place, never a second copy of it kept beside the first or a weaker assertion; a longer wait is allowed only where the first request is the cause and the wait is named. One rule, all 56 places: the places are drawn and named with seeds. Ask why: the PR names what was slow on the first request.

**Done when.** A second session runs src/bench/filing.browser.mjs four times in a row, each on a bench started cold from main's head, in four drawn places named with seeds, and sees every run pass. The PR names what was slow on the first request, by file and line in the bench's handler.

**Waits on.** Nothing.

**Files.** src/bench/filing.browser.mjs, src/bench/handler.ts

**Notes.** Follow-up to tests-filing-browser-go-times-out-on-main (#6962), which merged on warm-bench evidence. Lead: play-first.

**Notes (re-run, 2026-11-10, main b4422d346c).** `node src/bench/filing.browser.mjs` with BENCH_BROWSER=/opt/pw-browsers/chromium-1243/chrome-linux64/chrome against `npm run bench` started a minute earlier. The check draws its own place and does not read BENCH_SEED, so the item's seeds cannot be replayed. One run, Edinburg, Missouri, check seed 8628ebb1-abd1-4ecb-bcd5-154e3fabb90a: PASS ("PASS the counter with no panels"). That bench had only served /play before the run, so it was not a true cold first request. No drop proposed: the item is about cold starts, which this run did not test.
