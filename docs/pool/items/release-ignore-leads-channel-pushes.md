---
id: release-ignore-leads-channel-pushes
title: "A status push to the leads' channel file starts no release run on main"
area: release
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: "CTO weekend leads, Oct 24 (PR cto/leads-2026-10-24)"
---

**What.** The leads write their status to `docs/coordination/LEADS-2026-10-24.md` on main every two hours, which is about thirty one-file pushes a day. The release workflow ignores pool-only pushes but not this file, so each status push starts a release run that the next push queues behind. Add the channel files to the release workflow's `paths-ignore` the way `docs/pool/**` is.

**Rules.** Speed: the release queue is not slowed by pushes that change no code or declaration, so builders' merges publish without waiting behind status notes. Replace, never layer: one ignore pattern beside the pool's, no second workflow.

**Done when.** `.github/workflows/release.yml` lists `docs/coordination/LEADS-*.md` under `paths-ignore`, `tests/release/validate-workflow.test.ts` (or the workflow test that pins the ignore list) checks it, and a test push to the channel file starts no release run, shown by the Actions list screenshot.

**Files.** .github/workflows/release.yml, tests/release/validate-workflow.test.ts

**Notes.** Filed Oct 24 by the CTO with the leads' channel (rule `.agents/rules/leads-channel.md`).
