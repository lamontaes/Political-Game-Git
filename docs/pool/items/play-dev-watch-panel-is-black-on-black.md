---
id: play-dev-watch-panel-is-black-on-black
title: "Dev mode's Watch panel on the Calendar is squeezed into a sliver, so its tables cannot be read (first reported as black on black)"
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
lead: play-first
source: Fable audit, Nov 9, 2026 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 2, Dev mode on the screen)
model: fable
effort: low
root: rc10-screens-keep-own-facts
checked: fable 2026-11-11
claimed-at:
branch: claude/pool-play-dev-watch-panel-is-black-on-black
---

**What.** With Dev mode on, the Calendar carries a Watch panel: the town's pay by month since the first dev change, its metrics, the nation's figures, each budget, the price rules and the recent news, then the Golden path steps. The Nov 9 audit saw it as black text on a black sheet in Ten Broeck, Kentucky. Two builders have since measured it on main: the text is light on the dark sheet and reads, but the whole Watch section is squeezed into a sliver at the foot of the Calendar sheet, one table header line and then record lines cut off. Watch is where a tester sees whether a law moved pay, prices or a budget month by month, so today that proof still cannot be read from the screen. Fix the class: every dev table and record tree (Watch, Golden path, small-dollar loans, the person card's Records tree) is drawn with one shared look for a table on a sheet and has room to be read. Seen: dev mode's Watch panel on the Calendar, which the owner and every second session use to check that a law reached pay, prices and budgets.

**Cause.** Found in code: `devWatchSections` in src/bench/ui/dev-watch.mjs (line 36) builds bare `table` elements inside `div.scroll` boxes, all inside a `div.dev-only.dev-watch` that `calendar()` in src/bench/play.mjs appends to the Calendar sheet. src/bench/play.css has no rule for `.dev-watch`, `.scroll`, or a `th` or `td` inside them, so nothing gives the section a height or lets it scroll inside itself, and a sheet that never scrolls as a page cuts it off. Measured in Addington, Oklahoma (seed fa7af0ac-cba5-4b41-8f2e-7390a263e968, 1440x900): the cells compute to rgb(242, 237, 228), light on dark, and the section shows as a sliver. The audit's black-on-black does not reproduce on main.

**Fix.** Give Watch room and one table look. Open Watch as its own tab of the Calendar sheet when Dev mode is on, so it has the sheet's full height, with each section a strip (`stripSection`) whose table scrolls inside its own box. Add one shared style for a dev table (header row, cell padding, tabular figures, the menu's colors) and build every dev table and record tree from it; delete the bare tables. Add a browser check that every Watch table has a visible height of at least three rows at 1440x900 and that each `th` and `td` passes the 4.5 to 1 contrast the panels check already holds (src/bench/panels.browser.mjs). Add no caption line under a table or heading.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Replace, never layer: the bare tables are rebuilt from the shared parts in the same change and no second table style is left beside the first. Owner, Nov 8, 1:35 a.m.: "take the principles you learned from everything today, apply that to, you know, dev mode screens and all that." Owner, Nov 8, about 2:15 a.m.: "remove all those subtexts", so no caption line is added under a table or a heading. The Speed rule also binds what Watch reads: it reads what the game already keeps and spends no game time.

**Done when.** A second session starts the bench (`npm run bench`, `/play`), leaves the Place field empty so the place is drawn, writes down the place and seed the title shows, and turns Dev mode on in Options. It introduces and passes one bill from Government's Bills panel, runs 60 days from the Calendar's Run panel so Watch holds at least two months, and opens the Calendar at 1440 by 900. Every table in Watch (pay by month, the town's metrics, the nation, the news) and in Golden path (the steps and the world's pieces) can be read: light text on the dark sheet, each header and each cell. It clicks one record id in the news table and the Trace under the panel can be read too. It saves a screenshot with the place and seed under it. It then does the same in Ten Broeck, Kentucky (the audit's place; no seed was given, so the seed drawn is written down) and sets its screenshot beside the audit's screenshot 07. A browser check on the pattern of `src/bench/panels.browser.mjs` (which already holds the game's panels to a text contrast of 4.5 to 1) measures every `th`, `td` and tree row inside `.dev-watch` against its background and fails below that bar; undoing the fix makes that test fail. The owner plays it: with Dev mode on he opens the Calendar and reads the town's pay, metrics and news by month in the Watch panel.

**Waits on.** Nothing.

**Files.** src/bench/ui/dev-watch.mjs, src/bench/ui/dev-view.mjs, src/bench/ui/strips.mjs, src/bench/play.css, src/bench/play.mjs, src/bench/panels.browser.mjs, src/bench/calendar.browser.mjs

**Notes.** From the Fable audit of Nov 9, 2026, Pillar 2, "Dev mode on the screen": a helper drove dev mode through the game's own screens in Ten Broeck, Kentucky, for five months of game time; the lead checked the screenshots cited. The screenshot is `docs/audits/fable-vision-2026-11-09-screens/07-dev-watch-unreadable.jpg` on branch `audit/fable-vision`. The audit's words: "The Watch panel is black text on a black sheet. Its tables cannot be read." The audit named no cause and did not say whether the Golden path tables or the loans table under Watch were unreadable too; the code builds them the same way, so the fix covers them. The cause lines above were read on Nov 10 by the session that filed this. Related items found: `play-dev-person-record-list-prints-object-object` (the Records tree on the person card uses the same parts), `play-golden-path-panel-in-dev-mode` (done; it put the Golden path tables here), `dev-mode-move-dev-page-controls-into-game` (done; it moved Watch from the old dev page onto the Calendar). No open item covered this defect.

Released (2026-11-10): Cause differs from main 94969ad22a: in Addington, Oklahoma (seed fa7af0ac-cba5-4b41-8f2e-7390a263e968, 1440x900, Dev mode on) .dev-watch th/td/.scroll compute color rgb(242,237,228), light on the dark sheet, and the Watch text reads; no black-on-black. What does show is the Watch section squeezed into a sliver at the bottom of the Calendar sheet (one table header line then record-tree lines such as 'fiscalYear 2024' and 'adoptedOn 2024-10-01' cut off), so the item needs re-writing around that before it is built. Continue on branch claude/pool-play-dev-watch-panel-is-black-on-black.

Claimed by next for sonnet-a266 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 00:10 UTC) on branch claude/pool-play-dev-watch-panel-is-black-on-black.

**Notes (Nov 11, 2026, cause rewritten).** Two builders (the Nov 10 release and #8371) found the text readable and the panel squeezed. Fable B rewrote the cause and fix around the layout. Screens are Fable B's since the owner's Nov 10 order, so Fable B builds this one; a builder that draws it with `next` leaves it.

Claimed by next for opus-5234 (Claude Opus 5.5 in Claude Code (cloud session), tier top) (2026-11-11 03:45 UTC) on branch claude/pool-play-dev-watch-panel-is-black-on-black.

Released (2026-11-11): Left for Fable B, as the item's Nov 11 note says (screens are Fable B's since the owner's Nov 10 order); nothing built. Continue on branch claude/pool-play-dev-watch-panel-is-black-on-black.

Claimed by next for opus-5234 (Claude Opus 5.5 in Claude Code (cloud session), tier top) (2026-11-11 03:46 UTC) on branch claude/pool-play-dev-watch-panel-is-black-on-black.

Released (2026-11-11): Re-offered; set model: fable so next keeps it for Fable B, as its Nov 11 note says. Continue on branch claude/pool-play-dev-watch-panel-is-black-on-black.

**Notes (Nov 11, 2026, first part built).** #8574 gives Watch its own tab on the Calendar's sheet in dev mode, with one table style and a browser check (src/bench/dev-watch.browser.mjs); Watch, the Golden path and the loans table can be read. Left: the person card's Records tree is drawn elsewhere and still has its own look, and nobody has yet opened Watch after a passed bill and 60 days, or in Ten Broeck, Kentucky.
