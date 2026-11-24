---
id: play-six-list-and-detail-screens-build-their-own-part-5-one-tab-strip-guard
title: "One tab strip and a guard against a second list part"
area: play
kind: cleanup
priority: 2
size: S
status: merged
standard: 2
claimed-by: claude/pool-play-six-list-and-detail-screens-build-their-own-part-5-one-tab-strip-guard
pr: #8821
after: play-six-list-and-detail-screens-build-their-own-part-3-travel-guide
blocked-on:
lead: screens
model: sonnet
effort: medium
root: rc10-screens-keep-own-facts
source: split from play-six-list-and-detail-screens-build-their-own in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
claimed-at: 2026-11-11T15:30:09.554Z
merged-at: 2026-11-11T16:33:56.066Z
---

**What.** Campaign's debate card builds its own tab nav by hand beside the shared `tabBar`, and the sheet's tabs are built with `makeTab` straight into the sheet. Put them on `tabBar`, and add a guard that fails when a second list-and-detail part or a hand-built tab nav is added, so the duplicates cannot come back. The tabs look and work as they do today. The guard sits beside the existing kit-only-ui guard.

**Cause.** Found in code: `debateCard` in src/bench/ui/campaign-acts.mjs (line 15) builds `el("nav", { className: "tabs tab-rail" })` by hand, `openSheet` in src/bench/play.mjs builds the sheet's tabs with `makeTab`, and `tabBar` is in src/bench/ui/tab.mjs (line 40). The existing guard tests/guards/kit-only-ui.test.ts checks markup outside the kit, not a second part inside it.

**Fix.** Move the debate card and the sheet tabs onto `tabBar`, then add tests/guards/one-list-and-detail-part.test.ts (new): it fails when a screen file under src/bench/ui builds a list-beside-detail layout other than `rosterScreen`, or a tab nav outside src/bench/ui/tab.mjs.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Replace, never layer: each screen moved onto the shared part loses its own builder, styles and browser-check selectors in the same change, and the PR body counts the functions and style rules removed. One engine per mechanic: one screen renderer per menu type (owner, Oct 27, AGENTS.md). The player's screens keep every control and every word they have today (slim-down: no change to what the game does).

**Done when.** A second session (not the builder) starts the bench (`npm run bench`), starts a new game in a drawn place (place and seed named) and takes a screenshot at 1440x900 of Campaign's debate card and the character sheet's tabs, each set beside a screenshot on the commit before. The tabs look and work as before, a search finds no hand-built tab nav outside src/bench/ui/tab.mjs, and the new guard fails when a second list-and-detail part is added in a test copy.

**Waits on.** play-six-list-and-detail-screens-build-their-own-part-3-travel-guide

**Files.** src/bench/ui/campaign-acts.mjs, src/bench/ui/tab.mjs, src/bench/play.mjs, tests/guards/one-list-and-detail-part.test.ts (new)
