---
id: play-menus-no-continue-back
title: "No Continue or Back on any menu, News included (third time asked)"
area: play
lead: play-first
kind: bug
priority: 1
size: S
status: claimed
claimed-by: play-first/play-menus-no-continue-back
pr:
after:
blocked-on:
milestone: play-first
source: owner, Oct 29 playtest of v0.64.0 (to the CTO)
claimed-at: 2026-10-29T16:25:57.277Z
---

**What.** The owner played v0.64.0 on Oct 29 and found Continue and Back still on the menus, News first among them: "the continue and back button, I said continue and back, needs to be removed from every single menu." He ruled it on Oct 28 (sitting point 22, "Remove every Continue and Back from every menu. They serve no purpose") and `play-screens-sitting-oct28` was set done, so the removal either missed sheets or a later merge brought them back. Every sheet, tab, story page and panel that a player opens from the rail must open and close without a Continue or Back control; a menu closes with its own close control or Esc, and a story opens in place on the paper, not as a page you step through.

**Time box.** 3 hours, Sonnet.

**You will see.** Every menu opens and closes with no Continue or Back on it; a news story opens in place on the paper.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Rules.** Player screen text: no control that does nothing a player needs. Replace, never layer: the Continue and Back controls, their handlers, their labels in `src/bench/data/controls.json` and their styles are deleted, not hidden. Screen to mock: every sheet stays on the UI kit's parts. Talks and scenes keep their own Continue (the narrator's beat), which is not a menu.

**Done when.** A browser check (new, `src/bench/no-continue-back.browser.mjs`) opens every rail sheet and every Politics tab in the bench at 1440×900 in a drawn place (place and seed named) and fails if any control reads Continue or Back outside the talk box; it passes, and the screenshots of News, Politics and Travel land in `docs/play-first/shots` with the place and seed under them. The owner plays it: no menu shows Continue or Back.

**Files.** src/bench/play.mjs, src/bench/play.html, src/bench/play.css, src/bench/ui, src/bench/data/controls.json, src/bench/no-continue-back.browser.mjs

**Notes.** Filed by the CTO, Oct 29, from the owner's playtest. Prior: OWNER-DECISIONS Oct 26 ("Continue becomes Skip scene"), Oct 28 sitting point 22, `play-screens-sitting-oct28` (done, regressed or missed). Read: OWNER-DECISIONS (Oct 29), LAW section 1; searched: continue, back button, menus.
