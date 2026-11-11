---
id: play-campaigns-sheet-speech-pager-races-columns-debate-date
title: "The Campaigns screen keeps a speech's replies on the page you are on, draws local races in readable rows, and words the debate date"
area: play
kind: bug
priority: 2
size: S
status: claimed
standard: 2
claimed-by: claude/pool-play-campaigns-sheet-speech-pager-races-columns-debate-date
pr:
blocked-on:
source: added with npm run pool -- add
after:
lead: play-first
model: sonnet
effort: low
root: rc10-screens-keep-own-facts
checked: fable 2026-11-10
claimed-at: 2026-11-11T03:30:53.505Z
---

**What.** Found while moving the speech and debate panels onto shared parts, all three on main before that change. First, the later speech stages are taller than the Campaigns sheet, so the four replies sit behind the sheet's Continue pager and the page returns to the first after every pick. Second, the local races block at the bottom of Campaigns draws as four narrow columns with one word a line. Third, the debate invitation's date shows as an ISO string. A player cannot build a speech without paging back and forth, and the screen shows developer text.

**Cause.** Found in code: `debates` rows in src/bench/campaign.ts (line ~164) send the debate's ISO `date`, and `debateCard` in src/bench/ui/campaign-acts.mjs (line 52) prints it raw; the speech-stage height and the four-column local races come from `campaigns()` in src/bench/play.mjs (line 4217) and src/bench/play.css (not re-measured on current main).

**Fix.** Send the debate date through the spoken-date words (as `spokenDate` does for the poll in src/bench/campaign.ts), make the speech stages fit the sheet so no pager click is needed, and draw local races one per row.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No hand-written player text: the debate date reads in words from the controls or the English engine, never as an ISO string. Also player-screen-text (dates read in words); screen-to-mock (one shared part per control, panels fit the window); a fix lands where the failure reproduces: a bench restarted on main in a drawn place, named with its seed.

**Done when.** A second session, in a drawn place named with its seed, on a restarted bench, picks four speech parts without pressing Continue on the sheet pager, sees the local races list one race per row, and reads the debate date like a spoken date; src/bench/four-screens.browser.mjs passes without its pager click.

**Waits on.** Nothing.

**Files.** src/bench/play.mjs, src/bench/campaign.ts, src/bench/ui/campaign-acts.mjs, src/bench/play.css, src/bench/four-screens.browser.mjs

**Notes.** Filed by the play-first lane Oct 27 from PR 6357. lead: play-first. milestone: play-first. Read: OWNER-DECISIONS, DECISION-REGISTER, prior-rulings, LAW; searched docs/pool/items for campaigns pager and local races: play-local-races-on-screen is the older done item for the block's content.
