---
id: pool-add-formats-the-item-it-writes
title: "The pool tool pushes a new item to main without formatting it, and the repository check turns red"
area: docs
kind: bug
priority: 1
size: S
status: merged
standard: 2
claimed-by: R1 (Fable A's builder)
pr: #8887
after:
blocked-on:
lead: cto
model: sonnet
effort: low
root: none
source: the lead (Fable A), Nov 12, 2026, on the CTO's line on #7365 (comment 6822754199)
merged-at: 2026-11-12T14:08:03.820Z
---

**What.** Guards: main's repository check, which runs Prettier on changed files. On Nov 12, 2026 three new items written by `npm run pool -- add` reached main unformatted and the check failed on them (Deterministic validation 43204347616 on `core-long-run-jobs-over-adults-in-a-regional-hub.md`; the other two are fixed in #8880). The CTO fixed the first by hand in e298200245.

**Cause.** Found in code: the `add` command in `scripts/pool/index.ts` (the branch that starts `cmd === "add"`, near line 1486) builds the item's text with `TEMPLATE(f, id)`, validates it against the standard, writes it and pushes it to main. It never runs the repository's Prettier on the file. The template's own output differs from Prettier's in two ways seen on Nov 12: an empty `after:` field is written with a space after the colon, and a title that holds a double quote is written in double quotes with the inner quotes escaped, where Prettier writes single quotes. Any other command of the tool that writes an item's text and pushes it has the same gap.

**Fix.**

1. In `scripts/pool/index.ts`, after `add` builds the item's text and before it writes and pushes, format the text with the repository's own Prettier (the version and configuration the repository check uses, through Prettier's API with the file's path so the Markdown rules apply). Write the formatted text.
2. Do the same in every other command of the tool that writes an item file and pushes it (claim, release, status and the merged flip write through the same writer if there is one: put the formatting in that one writer, not in each command).
3. A test in `scripts/pool/index.test.ts`: `add` an item whose title holds a double quote and whose `after` is empty, in the test's own throwaway repository, and assert that `prettier --check` passes on the file it wrote.

**Time box.** 1 hour for one session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** Rules, checks and skills merge first (owner, Nov 10). Replace, never layer: one writer formats, no second path. The test builds its own repository and never touches main.

**Done when.** A second session runs `npx vitest run scripts/pool/index.test.ts` and sees the new case pass, then, in a throwaway clone, runs `npm run pool -- add` with a title that holds a double quote and sees `npx prettier --check` pass on the item it wrote. No place is drawn: the tool builds no world.

**Waits on.** Nothing

**Files.** scripts/pool/index.ts, scripts/pool/index.test.ts

**Notes.**

Added by the lead (Fable A) on Nov 12, 2026. Until it merges, a new item is written on the hour's notes branch, formatted and checked by hand (skill `pool-notes`).

**Notes (Nov 12, R1).** Built on branch claude/pool-pool-add-formats-the-item-it-writes. `writeItem` in scripts/pool/index.ts is the one writer of an item file: it runs the repository's Prettier (resolved from the tool's own folder, given the item's path) on the text, then writes it. Every item write goes through it: add, claim, release, status, seen, next's claims and releases, the draft's pull request number, and the merged flip (done-on-merge calls the status command).
