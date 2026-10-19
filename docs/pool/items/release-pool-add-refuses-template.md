---
id: release-pool-add-refuses-template
title: "npm run pool -- add refuses to push an item whose body is still the template"
area: release
kind: cleanup
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: "found repairing eleven empty item bodies, Oct 19"
claimed-at:
---

**What.** `npm run pool -- add` creates an item from the template and pushes it to main at once, so the item sits on main with TODO bodies until someone writes them, and the pool check fails on every priority 1 or 2 item left that way. Make `add` take the What, Rules, Done when and Files as options (or a file) and refuse to push while any is still TODO.

**Rules.** Replace, never layer: the template-only push is removed, not kept beside the new one. Light by default: the check is the existing pool check, run before the push.

**Done when.** `npm run pool -- add` with no body fails with a message naming the missing sections and pushes nothing; with all four sections it pushes an item that passes `npm run pool -- --check`; a test in scripts/pool/index.test.ts states both.

**Files.** scripts/pool/index.ts, scripts/pool/index.test.ts

**Notes.** Eleven items were on main with TODO bodies on Oct 19 (see PR #5111).
