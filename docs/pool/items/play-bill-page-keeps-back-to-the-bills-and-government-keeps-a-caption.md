---
id: play-bill-page-keeps-back-to-the-bills-and-government-keeps-a-caption
title: "A bill's page still has a Back to the bills button, and Government still prints a caption line under the body's name (seen in Ten Broeck, Kentucky)"
area: play
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: claude/pool-play-bill-page-keeps-back-to-the-bills-and-government-keeps-a-caption
pr: #8494
after:
blocked-on:
lead: screens
source: Fable audit, Nov 9, 2026 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 6, "Against your newest rulings (measured)")
model: sonnet
effort: low
root: rc10-screens-keep-own-facts
checked: fable 2026-11-10
claimed-at: 2026-11-11T02:45:09.799Z
---

**What.** Measured by the Nov 9 audit in Ten Broeck, Kentucky (no seed given): a bill's page still has a 'Back to the bills' button, and Government prints a caption line under the body's name ("Meets the 1st Tuesday of the month · 5 seats" under "Ten Broeck City Council"). Both go against the owner's rulings that Back is removed from every menu and that no caption sits under a heading. Fix both for every body and every bill: a bill's page closes the way every menu closes, and the body's header is its name over its picture, with the facts from the caption placed where the approved Government screen shows them or not shown.

**Cause.** Found in code: `openBillPaper` in src/bench/play.mjs (line 2689) builds the back button from the label its caller passes; `bills()` passes `billFollow.back`, "Back to the bills" (src/bench/data/controls.json, line 1174), and Government's recent votes pass `politics.backToGovernment`; `chamberHeader` in src/bench/ui/chamber.mjs (line 7) draws a `line` caption under the body's name, styled by `.chamber-line` in src/bench/play.css (line 3318) and called from `government()` in src/bench/play.mjs (lines 4603 and 4722).

**Fix.** Delete the back button, both back labels, `chamberHeader`'s `line` argument and the `chamber-line` style; a bill page closes like every menu, and the seat count stays readable in the Seats section.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Replace, never layer: the back button, both back labels, the `line` argument of `chamberHeader` and the `chamber-line` style are deleted, not hidden, and the PR body counts them. Owner, Oct 29 (OWNER-DECISIONS, the second account's first sitting): "I said continue and back, needs to be removed from every single menu." Owner, Nov 7, about 2:45 p.m. (docs/mocks/2026-11-07-approved/RULINGS-nov5.md, item 36): "NONE OF THESE SUBTITLES ON MENUS LIKE IT GOES INTO THE CAMPAIGN. COPIAH BANK. CAMPAIGN MONEY SPENDS... ETC". The menu-look rules: "No caption or explaining line under a heading, a control row, a quote or an item... Data and quotes stay; the line that explains them goes."

**Done when.** A second session starts the bench (`npm run bench`), starts a new game in a drawn place (place and seed named in the proof) and takes four screenshots at 1440×900. Politics, Government, on the Local, State and Federal tabs: no line of small text may sit under a body's name on its picture, for the legislative or the executive side, and the seat count must still be readable in the Seats section. Politics, Bills, then one bill opened: the page must show no button whose words begin with Back, and the session must get from the bill to the list of bills and to Government using only the tabs and the close control (the proof says which). The same bill page opened from Government's recent votes must also have no Back button. The same screenshots are then taken in Ten Broeck, Kentucky, the audit's place (the audit gives no seed), as the named repro, and Government is set beside the approved examples `gov-local`, `gov-state` and `gov-federal` in `docs/mocks/2026-11-07-approved/menu-examples.html`. The owner plays it: he opens a bill and Government and sees no Back button and no small explaining line under a council's name.

**Waits on.** Nothing.

**Files.** src/bench/play.mjs, src/bench/ui/chamber.mjs, src/bench/ui/bill-paper.mjs, src/bench/data/controls.json, src/bench/play.css

**Notes.** From the audit's Pillar 6. The Back button is playtest point C25 of docs/coordination/playtest/2026-11-08-1.md ("The 'Back to the bills' button (no Back buttons, ruled Nov 5)"); the rest of C25 looks fixed on main (a failed bill now carries its date, `decidedOn` in `src/bench/legislature.ts`, line 499, and the vote by party is drawn). Marked done, still shows: play-menus-no-continue-back (done Oct 29) removed Continue and Back from the menus of that day; the bill page's button came with the later bill screens. The same screenshot shows "Since January 2015" under the mayor's name and title on Government; whether that is a caption or data is the CTO's call (the menu-look rule keeps data), so it is named here and not changed by this item. The legislation mock for following a bill is `docs/mocks/2026-11-08-legislation/renders/leg-track.jpg`; read `.agents/skills/legislation-screens/SKILL.md` before touching the bill page. A law's page in Issues passes its own back route (`() => openSheet("issues")`, about line 5087): check it shows no Back button either. Not verified by the audit: the State and Federal tabs and the executive header (read in code here).
