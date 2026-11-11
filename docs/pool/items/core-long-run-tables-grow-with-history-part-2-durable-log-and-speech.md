---
id: core-long-run-tables-grow-with-history-part-2-durable-log-and-speech
title: "Fold the durable log and speech retellings"
area: core
kind: bug
priority: 1
size: M
status: in-pr
claimed-by: claude/pool-core-long-run-tables-grow-with-history-part-2-durable-log-and-speech
pr: #8292
after:
blocked-on:
lead: speed
source: split from core-long-run-tables-grow-with-history in the pool redo, Nov 10, 2026
standard: 2
model: opus
effort: medium
root: rc5-full-detail-every-day
checked: fable 2026-11-10
claimed-at: 2026-11-10T23:32:33.817Z
---

**What.** Two tables keep a row per event forever: the durable log (10,438 to 149,782 rows between years 1 and 6 in Ringgold, Louisiana) and speech retellings (1,088 to 95,783). Fold what still grows into a summary once play no longer reads the detail; the speech half was folded after this was measured. Keep what the person card, the director, the journal and the trace read, and keep the player's own and the people they deal with whole.

**Cause.** Measured: `npm run speed:year -- --seed long-1 --years 100` (Ringgold, Louisiana) table counts at years 1 and 6; the durable log is in src/core2/state.ts and speech retellings are in src/core2/modules/speech.ts.

**Fix.** Speech retellings are already folded on main (`forgetOldRetellings`, src/core2/modules/speech.ts line 309; item core-long-run-speech-retellings-fold is done), so do not build that half. For the durable log, re-measure first on current main: `npm run speed:year -- --seed long-1 --years 6 --out <file>` and read core.durableLog per year. Then read the retention that already exists (src/core2/decision-detail.ts drops condensed circle decisions after `circleActRetentionMonths`) before proposing anything. If the log still grows year over year, name every reader of the rows that grow, agree each reader's window with its owner, and fold rows older than it into a summary those readers read instead. If it does not grow, write the per-year counts in this item's Notes and close it with no code change.

**Time box.** 5 hours for an Opus session.

**Rules.** Speed and the Oct 29 22:45 ruling (a country's year, for hundreds of years). Replace, never layer: a fold replaces the rows it summarizes. Whatever play reads (a screen, a decision, the director, the journal, the trace) still reads the same answer from the summary. Ask why: the player's own records and the people they deal with keep their reasons.

**Done when.** A second session runs `npm run speed:year -- --seed long-1 --years 6` in Ringgold, Louisiana (a drawn place) and sees the durable log and speech retellings flat across years, the card, journal and trace answering the same as before for the first year, and dev mode's records proof identical outside the folded tables.

**Waits on.** Nothing.

**Files.** src/core2/state.ts, src/core2/modules/speech.ts, src/core2/speech-retellings-fold.test.ts, scripts/speed-years/run.ts
