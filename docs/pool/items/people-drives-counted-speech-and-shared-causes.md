---
id: people-drives-counted-speech-and-shared-causes
title: "Counted adults hear speeches and are told causes, so they form causes the way named people mostly do"
area: people
kind: wiring
priority: 2
size: L
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Named adults form causes mostly from speech.heard and cause.shared: in Port Wentworth, Georgia (1362328, place seed 70b86923dd770297780580cb566840349af399702bdfb610c2994126dbe91442, drawn with seed sh2, purpose counted-share), one played year gives 11,142 speech.heard and 963 cause.shared formations against 10 job-lost, 4 serious-illness and 4 death ones, and 215 of 547 named adults in town hold a cause (39 percent) against 11 of 7,265 counted adults (0.15 percent). A speech's audience (campaigns.ts whoComes, meetings.ts, press.ts) and a shared cause's listener (drives.ts share act, a known person) are full people only, so the counted tier never perceives either event. Give a speech's counted audience (the town's counted adults who come, by the same rule whoComes applies, times their count) and a holder's counted contacts the same perception by the speech-heard and cause-shared rules, through the counted actor and fill-in hook built in #5816.

**Rules.** One model, two tiers: a counted adult perceives a speech or a shared cause by the same rule as a named one, times its count; who comes reads records, never a roll. No dice. Speed: no per-member work for counted people who do not come; the year stays within 20 percent of its base.

**Done when.** In a one-year buildBenchWorld run in a drawn place (seed named), counted adults hold causes formed from speech.heard and cause.shared events by record id, the share of town adults holding a cause is within 10 points between named and counted adults, a counted adult filled in carries the cause, and the year is no more than 20 percent slower than its base on the same machine.

**Files.** src/core2/modules/drives.ts, src/core2/modules/speech.ts, src/core2/modules/campaigns.ts, src/core2/modules/meetings.ts

**Notes.** TODO
