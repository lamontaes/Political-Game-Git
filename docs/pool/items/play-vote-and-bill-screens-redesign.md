---
id: play-vote-and-bill-screens-redesign
title: "The vote, the meeting and the bill screens are redesigned to the mocks and tied to the place"
area: play
lead: play-first
kind: bug
priority: 1
size: M
status: done
claimed-by: play-first/play-vote-and-bill-screens-redesign
pr: #6830
blocked-on:
milestone: play-first
source: owner, Oct 29 voice note on the governing brief
claimed-at: 2026-10-29T21:34:13.429Z
---

**What.** The owner, Oct 29, on the governing brief's screenshots: "We'll have to work on the voting screen. I mean, still the UI is terrible", "I still haven't seen what the bill interface looks like. And it's all about how this stuff is communicated through the English engine", and "The layout of all those bill screens needs to be adjusted, and... they need to be tied to places." Today the council meeting is a text panel over an empty chamber with no tally or result, and the draft line is one dropdown with no current amount, so neither matches his Oct 26 ruling of an illustrated bill paper you click part by part with the cost estimate beside it.

**Rules.** Screen to mock: each screen follows the owner's approved mocks and the shared controls, never a new one-off renderer. No hand-written player text: every label and line comes from the English engine's banks. One rule, all 56 places: the bill's form, numbering and enacting words come from the place's data.

**Done when.** A browser check at 1440 by 900 in a drawn place, named with its seed, opens the drafting screen, the bill paper and a council meeting through a vote, and fails if the meeting lacks the members drawn in the chamber, the tally or the result, or the bill lacks today's amount beside the new one; before and after screenshots land in docs/play-first/shots and the owner plays it.

**Time box.** 4 hours for the meeting and vote screen, Sonnet; the bill screens follow as their own item if the box runs out.

**You will see.** A council meeting where the members sit in the chamber, you see the tally and the result, and a bill paper that shows today's amount beside the new one and reads like the place's own ordinance.

**Screenshot.** The meeting and the bill paper at 1440 by 900 from a drawn place, before and after, in the PR body.

**Files.** src/bench/play.mjs, src/bench/ui/bill-paper.mjs, src/bench/legislature.ts, src/bench/office.ts

**Notes.** Filed by the CTO, Oct 29, from the owner's voice note on the governing brief (OWNER-DECISIONS, Oct 29 21:40 UTC). Read: OWNER-DECISIONS, DECISION-REGISTER, the governing brief's four research notes; searched the pool for twins.
