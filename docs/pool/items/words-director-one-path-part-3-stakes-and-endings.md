---
id: words-director-one-path-part-3-stakes-and-endings
title: "Scene stakes read from the engines, endings written back"
area: director
kind: wiring
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: opus
effort: medium
root: design-story-director
source: split from words-director-one-path in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** Part of words-director-one-path. A scene's stakes should come from the engine that owns the facts, and how the scene ended should change that engine's record; today the ending stays in the director. Start with three scene kinds and show each by record id. Seen: how a scene ends changes the record the next screen or scene reads (three scene kinds first).

**Cause.** Design: docs/reports/words-director-plan-2026-10-28.md (owner approved Oct 28), section 3: a scene's stakes name facts that live in the engine that owns them (src/director/family-stake.ts reads the household's savings and children), but a scene's ending is not written back to that engine.

**Fix.** Read each scene kind's stakes from the engine that owns them and write its ending back to that engine, for three scene kinds first.

**Time box.** 8 hours for one Opus session.

**Rules.** Replace, never layer: the duplicate is deleted in the same change and the PR body counts it. A scene is staged from the record that causes it (scene-producers). No hand-written player text: words come from the English banks. One rule, all 56 places. An effect is a read, not a record.

**Done when.** A second session plays a drawn place (named with seed) and sees, for three scene kinds, the stakes shown in the scene read from the owning engine's record and the scene's ending written back to it, by record id.

**Waits on.** Nothing.

**Files.** src/director/family-stake.ts, src/director/purpose-scene.ts, src/director/ledger.ts
