---
id: tests-filing-browser-cold-bench-timeouts
title: "filing.browser.mjs times out on a cold bench (the Go button, then the talk choices)"
area: play
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: Merger 0 and Checker 2, Nov 1, while merging #6962
---

**What.** On the first runs after a cold bench start, src/bench/filing.browser.mjs timed out in Checker 2's runs: 'locator.click: Timeout 60000ms ... [data-testid=place-go]' (Lennon, Michigan, seed 58b1a1ec-f8ba-4702-bad0-622b321a6fc6) and 'waiting for #talk-choices button' (Loma, Montana, seed dd9136c6-a0fe-4dce-a35e-aff97406a381); the next two runs passed. Merger 0's three warm runs all passed (Danvers MA, South Fork NV, Bison KS). The check should not depend on bench warmth.

**Rules.** Fix the check or the first-request cost, never loosen what it asserts; a longer wait is allowed only where the first request is the cause and the wait is named.

**Done when.** filing.browser.mjs passes on four runs in a row, each on a bench started cold from main's head, in four drawn places named with seeds, and the PR names what was slow on the first request.

**Files.** src/bench/filing.browser.mjs, src/bench/handler.ts

**Notes.** Follow-up to tests-filing-browser-go-times-out-on-main (#6962), which merged on warm-bench evidence. Lead: play-first.
