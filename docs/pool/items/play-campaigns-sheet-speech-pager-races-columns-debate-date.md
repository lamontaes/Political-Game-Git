---
id: play-campaigns-sheet-speech-pager-races-columns-debate-date
title: "The Campaigns screen keeps a speech's replies on the page you are on, draws local races in readable rows, and words the debate date"
area: play
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Found while moving the speech and debate panels onto shared parts (PR 6357), all three on main before it. (1) The later speech stages are taller than the Campaigns sheet, so the four replies sit behind the sheet's Continue pager and the page returns to the first after every pick. (2) The local races block at the bottom of Campaigns draws as four narrow columns with one word a line. (3) The debate invitation's date shows as an ISO string. A player cannot build a speech without paging back and forth, and the screen shows developer text.

**Rules.** player-screen-text (dates read in words); screen-to-mock (one shared part per control, panels fit the window); a fix lands where the failure reproduces: a bench restarted on main in a drawn place, named with its seed.

**Done when.** In a drawn place named with its seed, on a restarted bench, a player picks four speech parts without pressing Continue on the sheet pager, the local races list reads one race per row, and the debate date reads like a spoken date; src/bench/four-screens.browser.mjs passes without its pager click.

**Files.** src/bench/play.mjs,src/bench/ui/campaign-acts.mjs,src/bench/play.css

**Notes.** Filed by the play-first lane Oct 27 from PR 6357. lead: play-first. milestone: play-first. Read: OWNER-DECISIONS, DECISION-REGISTER, prior-rulings, LAW; searched docs/pool/items for campaigns pager and local races: play-local-races-on-screen is the older done item for the block's content.
