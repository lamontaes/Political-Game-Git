---
id: director-new-adult-skip-finding
title: "Record what a new adult's eight-month skip shows about director moments"
area: director
kind: research
priority: 2
size: S
status: in-pr
claimed-by:
pr: #5644
blocked-on:
source: added with npm run pool -- add
---

**What.** A finding only, delivered without a test: the bench's default character (the resident nearest 18) skipped 245 days on the calendar from the game start, in a two-level buildBenchWorld with other engines' stops passed over. In some drawn places a story-director moment stops the skip; in one drawn place no director moment stops it in eight months, so the bug in director-moments-for-a-new-adult still reproduces; and where one did stop it, resolveSavedTraceV1 on the stop's record id returned record-not-found. This item records that finding in director-moments-for-a-new-adult's Notes, where the director fix (Words area) will read it, and leaves that item open.

**Rules.** Research before building: the finding names the places, the skip and the record ids; no code or test lands with it. The fix stays in director-moments-for-a-new-adult, whose test must assert a stop with no redraw and that the trace resolves.

**Done when.** docs/pool/items/director-moments-for-a-new-adult.md carries the finding in its Notes (the 245-day skip, the drawn place where no director moment stopped it, and the record-not-found trace on a stop's record id), that item stays open, and the PR that delivers this is docs only.

**Files.** docs/pool/items/director-moments-for-a-new-adult.md

**Notes.** Split Oct 25, 2026 by the fixer from PR 5644 (branch claude/political-game-pool-yucp92-ak), after the merger asked for the finding to be tracked under a bounded item.
