---
id: pool-merge-does-not-flip-an-item-whose-pr-field-has-no-hash
title: "A merged pull request does not mark its item merged when the item's pr field has no # sign"
area: docs
kind: bug
priority: 1
size: S
status: in-pr
standard: 2
claimed-by: claude/pool-pool-merge-does-not-flip-an-item-whose-pr-field-has-no-hash
pr: #8595
after:
blocked-on:
lead: cto
model: sonnet
effort: low
root: none
source: Fable B, Nov 10, 2026, after four critical-path items sat in review for hours with their pull requests merged
checked: fable 2026-11-10
claimed-at: 2026-11-11T10:11:34.438Z
branch: claude/pool-pool-merge-does-not-flip-an-item-whose-pr-field-has-no-hash
---

**What.** When a pull request merges, the pool marks its item merged, and every item that waits on it becomes available to builders. On Nov 10 that did not happen for five items whose pull requests had merged (8168, 8171, 8172, 8175 and 8243). They stayed "in review", so the fast clock's parts 4, 5 and 7 and other work that waits on them were never offered by `npm run pool -- next`. The merge must find the item whether its `pr:` field says `#8171` or `8171`, and the pool check must refuse a `pr:` field in any other form.

**Cause.** Found in code: scripts/pool/done-on-merge.ts, `readPool` (line 35) reads an item's pull request with `/^#(\d+)/.exec(fm.pr ?? "")`, which matches only a field that starts with `#`. `itemForMergedPr` in the same file uses that match whenever the pull request's body names no item on its first line. The pool command itself writes `#N` (`pool status <id> in-pr --pr N` in scripts/pool/index.ts adds the `#`), but a field edited by hand held the bare number in ten items on main, and `validate` in scripts/pool/index.ts does not check the field's form. So a pull request whose first line names no item, for an item whose field is a bare number, flips nothing and says "names no pool item; nothing to flip."

**Fix.** In `readPool`, accept the number with or without the `#` (`/^#?(\d+)/`). In `validate` (scripts/pool/index.ts), refuse a `pr:` field that is not empty and not `#` followed by digits, naming the file, so `npm run pool -- --check` catches a hand edit. Add two cases to scripts/pool/index-merge.test.ts: an item with `pr: 8171` and status in-pr is flipped by `mergeFlip("8171", <a body whose first line names no item>, true)`; and `validate` returns an error for `pr: 8171`. Then run `npm run pool -- --check` on main and add the `#` to any item it names.

**Time box.** 1 hour for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** Keep it simple: one pattern and one check, with no new field and no new command. Replace, never layer: the pattern is changed where it is, not wrapped. Never weaken a test: the existing cases of scripts/pool/index-merge.test.ts still pass unchanged.

**Done when.** A second session, on main, runs `npx vitest run scripts/pool/index-merge.test.ts` and reads the two new cases passing. It then sets one item's field to a bare number on a scratch branch, runs `npm run pool -- --check`, and reads an error that names that item's file. This is a check on the pool's own files, so there is no drawn place to play.

**Waits on.** Nothing.

**Files.** scripts/pool/done-on-merge.ts, scripts/pool/index.ts, scripts/pool/index-merge.test.ts

**Notes (Fable B, Nov 10).** The five items were marked merged by hand, and the other bare numbers were given their `#`, in the pool-only pull request that filed this item. Six older items are also in review though their pull requests merged on Nov 3 to 9 (health-medical-debt-record and world-medical-spending-categories on 7036, play-travel-place-card-says-what-you-do on 7087, words-archive-parent-death-body-by-seed on 7131, people-press-out-of-town-staff-paid on 7135, world-opening-treasury-not-finite-crash on 7222, words-voice-note-reader on 8053). Their fields have the `#`, so this cause does not explain them; the CTO decides whether each is merged or open.

**Notes.** Claimed by next for sonnet-2698 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 05:01 UTC) on branch claude/pool-pool-merge-does-not-flip-an-item-whose-pr-field-has-no-hash.

Released by next (2026-11-11): no push to claude/pool-pool-merge-does-not-flip-an-item-whose-pr-field-has-no-hash since 2026-11-11 08:07 UTC, more than twice its 1-hour time box. Continue on branch claude/pool-pool-merge-does-not-flip-an-item-whose-pr-field-has-no-hash.

Claimed by next for opus-5234 (Claude Opus 5.5 in Claude Code (cloud session), tier top) (2026-11-11 10:11 UTC) on branch claude/pool-pool-merge-does-not-flip-an-item-whose-pr-field-has-no-hash.
