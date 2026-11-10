---
id: pool-open-items-with-nothing-to-build-are-handed-to-builders
title: "An open item with nothing to build is handed to builder after builder, who cannot close it"
area: docs
kind: bug
priority: 1
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: cto
model: sonnet
effort: low
root: none
source: Fable B, Nov 10, 2026, after three replay-only items were claimed and released by builders ten times in half an hour
checked: fable 2026-11-10
---

**What.** Some items have nothing left to build: their work is on main, and what they wait for is a second session's check in the running game. Nine such items were open or claimed on Nov 10 (the play-stop items 01, 02, 05, 06, 07, 08, 11 and 19 among them). The pool command offered them to builders like any other item. A builder replayed the item, found that `pool seen` refuses anything that is not merged, released it, and the next builder was handed the same item. Three of them went round ten times in half an hour. An item with nothing to build must never be offered to a builder, and the pool check must refuse it in the open state.

**Cause.** Found in code: `claimable` in scripts/pool/order.ts (line 137) offers every open item that is checked, has a known cause and waits on nothing; it does not read the item's Fix. The seen command in scripts/pool/index.ts (the `seen` branch of `command`, near line 1283: "only work on main can be seen in the game") refuses an item whose status is not merged or done. So an item whose Fix says "Nothing is built here" can be claimed by a builder and cannot be closed by one. `standardProblems` (scripts/pool/standard.ts, read by `run` in scripts/pool/index.ts) does not check for it.

**Fix.** Two small changes, no new command. (1) In `standardProblems`, an item whose status is open, claimed or blocked and whose Fix section begins "Nothing is built here", "Nothing to build" or "Nothing is left to build" is a problem: "nothing to build: set it merged, with the pull request that built it, so a second session checks it". `npm run pool -- --check` then names every such item. (2) In `claimable`, such an item is never offered, so a hand edit that slips past the check still reaches no builder. Then run the check on main and set each item it names to merged with the pull request that built it (three were set by hand in the pull request that filed this item; the rest are held by builders whose replay pull requests will merge). Add cases to scripts/pool/standard.test.ts and scripts/pool/next.test.ts for both.

**Time box.** 2 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** Replace, never layer: the offer rule and the check change where they are, and no second list of items is kept beside the pool. Keep it simple: one check and one line in the offer rule. Done means a second session saw it in the game (owner, Nov 3): the check sends replay-only work to the sessions that can record it. Never weaken a test: the existing pool tests pass unchanged.

**Done when.** A second session, on main, runs `npx vitest run scripts/pool/standard.test.ts scripts/pool/next.test.ts` and reads the new cases passing. On a scratch branch it sets one merged item whose Fix begins "Nothing is built here" back to open, runs `npm run pool -- --check`, and reads a problem that names that item; `npm run pool -- next --dry-run` does not offer it. This is a check on the pool's own files, so there is no drawn place to play.

**Waits on.** Nothing.

**Files.** scripts/pool/order.ts, scripts/pool/standard.ts, scripts/pool/index.ts, scripts/pool/standard.test.ts, scripts/pool/next.test.ts

**Notes (Fable B, Nov 10).** Seen on main between 23:00 and 23:30 UTC: `pool: release play-stop-06-texas-shows-local-income-tax` four times, play-stop-02 three times and play-stop-08 twice, each with a note such as "pool seen refuses a claimed item (only merged work), so a builder cannot close it".
