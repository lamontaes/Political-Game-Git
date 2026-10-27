---
id: tests-filing-browser-go-times-out-on-main
title: "The filing browser check's Go button times out on clean main"
area: play
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: "Merger 7, Oct 27 12:00 UTC, while rechecking lane PRs"
lead: play-first
milestone: play-first
claimed-at:
---

**What.** On clean main at 11:00 UTC Oct 27, `src/bench/filing.browser.mjs` times out waiting for the filing panel's Go button, so every lane PR that touches filing inherits a red check that is not its own. Merger 7 saw it while rechecking #6208 and #6248. The cause is unknown: either the Go button moved into a shared `src/bench/ui/` part and the check's selector is stale, or the filing panel no longer renders Go until a race is chosen in the new menu (#6187). Find which and fix the one that is wrong; the check must pass on main in three drawn places.

**Rules.** Replace, never layer: the filing panel's Go control is one shared part from src/bench/ui and the check reads that part, never a second renderer or a stale selector kept beside it. Wire to the world: the check files a real candidate in a drawn place and reads the filing record it writes.

**Done when.** `filing.browser.mjs` passes on main's head in three drawn places (named with seeds) with the bench restarted on that head, and the PR body names the commit that broke it and what was stale.

**Time box.** 2 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** Nothing new; the filing panel keeps working and the mergers stop seeing a red check that is not the PR's.

**Screenshot.** The filing panel after Go, from a drawn place, in the PR body.

**Files.** src/bench/filing.browser.mjs, src/bench/filing.ts, src/bench/ui/

**Notes.** Merger 7, Oct 27 12:00 UTC: "Main's filing.browser.mjs times out on the Go button on main itself." Lead: play-first.
