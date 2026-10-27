---
id: roadmap-m0-12-next-feature-command
title: "M0-12 has no command: a script names the top unfinished roadmap spec and the pool item that carries it"
area: play
kind: feature
priority: 2
size: S
status: done
claimed-by: claude/quirky-ride-vrwwz4-m0-12
pr: #5872
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-24T04:24:37.875Z
---

**What.** Roadmap M0-12 says a fresh session can read the feature list and the progress file, pick the top unfinished feature and start without asking. It has no command, so it cannot pass. Since the owner's Oct 15 ruling the pool's INDEX is the progress file, so the command reads docs/roadmap/features.json and docs/pool/items, prints the first unfinished spec in milestone order with the open item that carries it, and fails when that spec has no item.

**Rules.** Wire to the world: the command reads the real feature list and the real pool items, never a copy. Look before you ask: a session reads the decision it needs from the files instead of asking anyone.

**Done when.** A command in docs/roadmap/features.json for M0-12 prints the top unfinished spec and its carrying pool item and exits 0 on main; its test fails when that spec has no open item; a fresh helper session given only the command's output names the same item to start, quoted in the PR body.

**Files.** scripts/roadmap/next-feature.ts, scripts/roadmap/next-feature.node-test.ts, docs/roadmap/features.json

**Notes.** TODO

Sent back 2026-10-23 from PR #5872 (branch claude/quirky-ride-vrwwz4-m0-12): next-feature.ts:75-80 recommends an open item despite its unfinished after prerequisite; the real pool claim command rejects that recommendation, so share eligibility and add gated/claimable regression coverage; finish on that branch, merge main into it first.
