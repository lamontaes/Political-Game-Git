---
id: play-opening-inaugural-lost-to-warm-up
title: "A played life's opening is a State of the Union, never the Jan 20 inaugural"
area: play
kind: bug
priority: 1
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: play
model: opus
effort: medium
root: design-director-on-core2
source: found while staging the inaugural (Nov 23, owner "Keep the inaugural on Jan 20")
checked: sonnet 2026-11-23
---

**What.** Every game starts on Inauguration Day, January 20, 2025, and the owner ruled on Nov 23 that the opening stays the inaugural. In the played game the opening address is the State of the Union, so the inaugural staging never shows. A world built with no warm-up gets the inaugural. The owner sees the House floor in play instead. Seen: at the first Continue of a new life's opening address.

**Cause.** Found in code: `recordInauguration` in `src/core2/modules/offices.ts` emits the `inauguration` event only when a serving term starts on the date the world is built on, and the New game route builds `OPENING_WARMUP_DAYS` (31) days before the start date. The event is never dated Jan 20, so `composeOpeningStory` in `src/director/opening-story.ts` finds no `inauguration:<today>` and picks the State of the Union.

**Fix.** Record the inauguration on the day the terms begin as the world's clock reaches it (or have `composeOpeningStory` ask whether a serving President's term starts today), so the opening on Jan 20 is the inaugural. The kind decides which bank pieces play, so Words reads the change.

**Time box.** 3 hours, one Opus session at medium.

**Rules.** Replace, never layer: one place records the inauguration, not a second event. One rule, all 56 places: the date is the national start date, with no place named, and the check draws its place from all 56.

**Done when.** A second session sees, in the running game, in a drawn place from all 56, a new life's opening address as the inaugural with the Chief Justice greeting, and a played-world test that builds the world as New game does and asserts the `speechKind` is inaugural.

**Waits on.** Nothing.

**Files.** src/core2/modules/offices.ts, src/director/opening-story.ts
